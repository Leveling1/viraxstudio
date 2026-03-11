import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ChannelSetup from './pages/ChannelSetup.jsx'
import NotFound from './pages/NotFound.jsx'
import ScriptGen from './pages/ScriptGen.jsx'
import VideoBuilder from './pages/VideoBuilder.jsx'
import Publisher from './pages/Publisher.jsx'
import Settings from './pages/Settings.jsx'
import {
  createRun,
  buildGoogleAuthStartUrl,
  getHealth,
  getRunDetail,
  getSession,
  listIntegrations,
  listPipelineProfiles,
  listReviews,
  listRuns,
  logout,
  migrateLocalSecrets,
  openRunEvents,
  requestPublication as apiRequestPublication,
  saveIntegration,
  updateDefaultProfile,
  updateReview,
} from './lib/api.js'

const LOCAL_CONFIG_KEY = 'virax_config'
const LEGACY_SECRET_KEYS = ['claudeKey', 'elevenKey', 'googleClientId', 'googleToken', 'pexelsApiKey']
const LEGACY_TRANSIENT_KEYS = ['channelName', 'channelId', 'channelDesc', 'lastScript', 'lastNiche', 'audioGenerated']

function loadLocalConfig() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_CONFIG_KEY) || '{}')
  } catch {
    return {}
  }
}

function persistLocalConfig(config) {
  localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(config))
}

function toErrorMessage(error) {
  if (!error) return 'Une erreur inconnue est survenue.'
  return error instanceof Error ? error.message : String(error)
}

export default function App() {
  const [localConfig, setLocalConfig] = useState(() => loadLocalConfig())
  const [session, setSession] = useState({
    authenticated: false,
    ownerEmail: null,
    youtubeConnected: false,
    channelTitle: null,
    expiresAt: null,
  })
  const [integrations, setIntegrations] = useState([])
  const [profiles, setProfiles] = useState([])
  const [runs, setRuns] = useState([])
  const [reviews, setReviews] = useState([])
  const [selectedRunId, setSelectedRunId] = useState(() => loadLocalConfig().selectedRunId || null)
  const [selectedRun, setSelectedRun] = useState(null)
  const [health, setHealth] = useState({ ok: false, checkedAt: null })
  const [loading, setLoading] = useState({ boot: true, workspace: false })
  const [notice, setNotice] = useState(null)

  const hasLegacySecrets = LEGACY_SECRET_KEYS.some(key => !!localConfig[key])
  const hasLegacyData = hasLegacySecrets || LEGACY_TRANSIENT_KEYS.some(key => !!localConfig[key])
  const defaultProfile = profiles.find(profile => profile.isDefault) || null

  const updateLocalConfig = updates => {
    setLocalConfig(current => {
      const next = { ...current, ...updates }
      persistLocalConfig(next)
      return next
    })
  }

  const removeLocalKeys = keys => {
    setLocalConfig(current => {
      const next = { ...current }
      keys.forEach(key => delete next[key])
      persistLocalConfig(next)
      return next
    })
  }

  const pushNotice = (tone, message) => {
    setNotice({ tone, message })
  }

  const handleRequestError = async error => {
    if (error?.status === 401) {
      setSession({ authenticated: false, ownerEmail: null, youtubeConnected: false, channelTitle: null, expiresAt: null })
      setIntegrations([])
      setProfiles([])
      setRuns([])
      setReviews([])
      setSelectedRun(null)
    }
    throw error
  }

  const refreshSession = async () => {
    try {
      const nextSession = await getSession()
      setSession(nextSession)
      return nextSession
    } catch {
      setSession({ authenticated: false, ownerEmail: null, youtubeConnected: false, channelTitle: null, expiresAt: null })
      return null
    }
  }

  const refreshWorkspace = async options => {
    const preserveSelection = options?.preserveSelection ?? true
    setLoading(current => ({ ...current, workspace: true }))
    try {
      const [integrationRes, profileRes, runRes, reviewRes] = await Promise.all([
        listIntegrations(),
        listPipelineProfiles(),
        listRuns(),
        listReviews(),
      ])
      setIntegrations(integrationRes.items)
      setProfiles(profileRes.items)
      setRuns(runRes.items)
      setReviews(reviewRes.items)

      setSelectedRunId(current => {
        const availableIds = new Set(runRes.items.map(item => item.id))
        const preferredId = preserveSelection ? current : null
        const fallbackId = runRes.items[0]?.id ?? null
        const nextId = preferredId && availableIds.has(preferredId) ? preferredId : fallbackId
        if (nextId) {
          updateLocalConfig({ selectedRunId: nextId })
        }
        return nextId
      })
    } catch (error) {
      try {
        await handleRequestError(error)
      } catch {
        pushNotice('error', toErrorMessage(error))
      }
    } finally {
      setLoading(current => ({ ...current, workspace: false }))
    }
  }

  useEffect(() => {
    let mounted = true

    const boot = async () => {
      try {
        const nextSession = await refreshSession()
        if (nextSession?.authenticated) {
          await refreshWorkspace({ preserveSelection: true })
        }
      } finally {
        if (mounted) {
          setLoading(current => ({ ...current, boot: false }))
        }
      }
    }

    boot()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      try {
        const payload = await getHealth()
        if (!cancelled) {
          setHealth({ ok: !!payload.ok, checkedAt: payload.timestamp || new Date().toISOString() })
        }
      } catch {
        if (!cancelled) {
          setHealth({ ok: false, checkedAt: new Date().toISOString() })
        }
      }
    }

    tick()
    const timer = setInterval(tick, 30000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!session.authenticated) return
    const timer = setInterval(() => {
      void refreshWorkspace({ preserveSelection: true })
    }, 15000)
    return () => clearInterval(timer)
  }, [session.authenticated])

  useEffect(() => {
    if (!selectedRunId || !session.authenticated) {
      setSelectedRun(null)
      return
    }

    let cancelled = false
    let source = null

    const loadDetail = async () => {
      try {
        const detail = await getRunDetail(selectedRunId)
        if (!cancelled) {
          setSelectedRun(detail)
        }
      } catch (error) {
        if (!cancelled && error?.status !== 401) {
          pushNotice('error', toErrorMessage(error))
        }
      }
    }

    void loadDetail()

    try {
      source = openRunEvents(selectedRunId, detail => {
        if (cancelled) return
        setSelectedRun(detail)
        setRuns(current => current.map(item => item.id === detail.id ? {
          ...item,
          status: detail.status,
          currentStep: detail.currentStep,
          reviewStatus: detail.reviewStatus,
          publicationStatus: detail.publicationStatus,
          updatedAt: detail.updatedAt,
        } : item))
      })
    } catch {
      source = null
    }

    return () => {
      cancelled = true
      source?.close?.()
    }
  }, [selectedRunId, session.authenticated])

  useEffect(() => {
    if (!selectedRunId) return
    updateLocalConfig({ selectedRunId })
  }, [selectedRunId])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  const actions = useMemo(() => ({
    updateLocalConfig,
    selectRun(runId) {
      setSelectedRunId(runId)
    },
    async refreshAll() {
      await refreshWorkspace({ preserveSelection: true })
    },
    async startGoogleLogin() {
      try {
        await getHealth()
        window.location.href = buildGoogleAuthStartUrl()
      } catch {
        pushNotice('error', "Connexion Google impossible: le backend API n'est pas joignable. Verifie VITE_API_BASE_URL et le deploiement backend.")
      }
    },
    async logoutOwner() {
      try {
        await logout()
        await refreshSession()
        setIntegrations([])
        setProfiles([])
        setRuns([])
        setReviews([])
        setSelectedRun(null)
        pushNotice('success', 'Session owner fermee.')
      } catch (error) {
        pushNotice('error', toErrorMessage(error))
      }
    },
    async saveIntegrationSecret(provider, payload) {
      try {
        const response = await saveIntegration(provider, payload)
        setIntegrations(response.items)
        pushNotice('success', `Secret ${provider} enregistre cote serveur.`)
      } catch (error) {
        try {
          await handleRequestError(error)
        } catch {
          pushNotice('error', toErrorMessage(error))
        }
      }
    },
    async migrateLegacySecrets() {
      if (!hasLegacySecrets) {
        pushNotice('warning', 'Aucune ancienne cle locale a migrer.')
        return
      }
      try {
        const response = await migrateLocalSecrets({
          anthropicKey: localConfig.claudeKey || undefined,
          elevenlabsKey: localConfig.elevenKey || undefined,
          pexelsApiKey: localConfig.pexelsApiKey || undefined,
          legacyGoogleClientId: localConfig.googleClientId || undefined,
        })
        setIntegrations(response.items)
        removeLocalKeys([...LEGACY_SECRET_KEYS, ...LEGACY_TRANSIENT_KEYS])
        pushNotice('success', 'Secrets migres et localStorage nettoye.')
      } catch (error) {
        try {
          await handleRequestError(error)
        } catch {
          pushNotice('error', toErrorMessage(error))
        }
      }
    },
    async saveDefaultProfile(payload) {
      try {
        const profile = await updateDefaultProfile(payload)
        setProfiles(current => {
          const others = current.filter(item => item.id !== profile.id)
          return [profile, ...others]
        })
        pushNotice('success', 'Profil pipeline mis a jour.')
      } catch (error) {
        try {
          await handleRequestError(error)
        } catch {
          pushNotice('error', toErrorMessage(error))
        }
      }
    },
    async createPipelineRun(payload) {
      try {
        const response = await createRun(payload)
        setSelectedRunId(response.runId)
        updateLocalConfig({ selectedRunId: response.runId, draftTopic: payload.topic, preferredDuration: payload.durationSeconds })
        await refreshWorkspace({ preserveSelection: false })
        pushNotice('success', 'Run pipeline lance. Le worker traite maintenant le contenu.')
      } catch (error) {
        try {
          await handleRequestError(error)
        } catch {
          pushNotice('error', toErrorMessage(error))
        }
      }
    },
    async reviewRun(runId, payload) {
      try {
        const response = await updateReview(runId, payload)
        setReviews(response.items)
        await refreshWorkspace({ preserveSelection: true })
        pushNotice('success', payload.decision === 'approve' ? 'Run approuve pour publication.' : 'Run renvoye en review.')
      } catch (error) {
        try {
          await handleRequestError(error)
        } catch {
          pushNotice('error', toErrorMessage(error))
        }
      }
    },
    async requestPublication(runId, payload) {
      try {
        await apiRequestPublication(runId, payload)
        updateLocalConfig({ preferredPrivacy: payload.privacyStatus })
        await refreshWorkspace({ preserveSelection: true })
        pushNotice('success', payload.mode === 'schedule' ? 'Publication programmee.' : 'Publication envoyee au worker.')
      } catch (error) {
        try {
          await handleRequestError(error)
        } catch {
          pushNotice('error', toErrorMessage(error))
        }
      }
    },
  }), [hasLegacySecrets, localConfig, session.authenticated])

  const ctx = {
    localConfig,
    session,
    integrations,
    profiles,
    defaultProfile,
    runs,
    reviews,
    selectedRunId,
    selectedRun,
    notice,
    loading,
    health,
    hasLegacyData,
    hasLegacySecrets,
    actions,
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout ctx={ctx} />}>
          <Route index element={<Dashboard ctx={ctx} />} />
          <Route path="channel" element={<ChannelSetup ctx={ctx} />} />
          <Route path="script" element={<ScriptGen ctx={ctx} />} />
          <Route path="video" element={<VideoBuilder ctx={ctx} />} />
          <Route path="publish" element={<Publisher ctx={ctx} />} />
          <Route path="settings" element={<Settings ctx={ctx} />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

