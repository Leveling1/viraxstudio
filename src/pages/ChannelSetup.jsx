import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

const SCOPES = 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.upload'

export default function ChannelSetup({ ctx }) {
  const [step, setStep] = useState(ctx.config.channelName ? 'done' : 'connect')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [brandName, setBrandName] = useState(ctx.config.channelName || 'ViraxFacts')
  const [description, setDescription] = useState(ctx.config.channelDesc || 'Des facts insolites chaque jour !')
  const clientId = ctx.config.googleClientId || ''

  const startOAuth = () => {
    if (!clientId) { setError('Client ID Google manquant - configure dans Reglages'); return }
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: window.location.origin + '/channel', response_type: 'token', scope: SCOPES })
    window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params
  }

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1))
      const token = params.get('access_token')
      if (token) {
        window.history.replaceState({}, '', '/channel')
        ctx.saveConfig({ googleToken: token })
        fetchChannel(token)
      }
    }
  }, [])

  const fetchChannel = async token => {
    setLoading(true)
    try {
      const res = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', { headers: { Authorization: 'Bearer ' + token } })
      const data = await res.json()
      if (data.items && data.items.length > 0) {
        const channel = data.items[0]
        ctx.saveConfig({ channelName: channel.snippet.title, channelId: channel.id })
        setStep('done')
      } else {
        setStep('create')
      }
    } catch {
      setError('Erreur recuperation chaine.')
    }
    setLoading(false)
  }

  const manualSave = () => {
    if (!brandName) return
    ctx.saveConfig({ channelName: brandName, channelDesc: description })
    setStep('done')
  }

  const card = (children, extra = {}) => <div className="card" style={{ marginBottom: 16, ...extra }}>{children}</div>

  return (
    <div className="page-shell page-shell--sm">
      <div className="page-header fade-up">
        <h1 className="page-title page-title--section">Ma Chaine YouTube</h1>
        <p className="page-subtitle">Connecte et configure ta chaine directement depuis ViraxStudio</p>
      </div>

      {error && <div className="banner banner--error">{error}</div>}

      {step === 'connect' && !loading && card(<>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Connecte ton compte Google</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>OAuth 2.0 Google (100% gratuit) - aucun mot de passe stocke.</p>
        {!clientId && (
          <div className="banner banner--warning" style={{ marginBottom: 16 }}>
            Configure d'abord ton Google Client ID dans <Link to="/settings" className="inline-link">Reglages</Link>
          </div>
        )}
        <button type="button" onClick={startOAuth} className="button button--white button--mobile-full">
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Connecter avec Google
        </button>
      </>)}

      {loading && card(
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 20, height: 20, border: '2px solid var(--red)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>Recuperation chaine...</span>
        </div>
      )}

      {step === 'create' && card(<>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Configurer la chaine</h3>
        <div style={{ marginBottom: 14 }}>
          <div className="field-label">NOM</div>
          <input value={brandName} onChange={event => setBrandName(event.target.value)} className="input-control" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="field-label">DESCRIPTION</div>
          <textarea value={description} onChange={event => setDescription(event.target.value)} rows={3} className="input-control" style={{ resize: 'vertical' }} />
        </div>
        <div className="action-row">
          <button type="button" onClick={manualSave} className="button button--primary button--mobile-full">Sauvegarder</button>
          <a href="https://studio.youtube.com" target="_blank" rel="noopener noreferrer" className="button button--secondary button--mobile-full">YouTube Studio</a>
        </div>
      </>)}

      {step === 'done' && <>
        {card(
          <div className="split-row" style={{ justifyContent: 'flex-start' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--red), var(--orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>▶</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="truncate-soft" style={{ fontSize: 18, fontWeight: 800 }}>{ctx.config.channelName}</span>
                <span className="status-chip" style={{ background: 'rgba(0,196,140,0.15)', color: 'var(--green)' }}>CONNECTEE</span>
              </div>
            </div>
          </div>,
          { borderColor: 'rgba(0,196,140,0.3)' }
        )}
        <button type="button" onClick={() => setStep('connect')} className="button button--ghost button--mobile-full">Reconnecter</button>
      </>}
    </div>
  )
}
