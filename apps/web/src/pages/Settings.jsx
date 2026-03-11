import { useEffect, useMemo, useState } from 'react'

const PROVIDER_FIELDS = [
  { provider: 'anthropic', label: 'Anthropic Claude', placeholder: 'sk-ant-...', copy: 'Generation script + SEO' },
  { provider: 'elevenlabs', label: 'ElevenLabs', placeholder: 'xi_...', copy: 'Voix off et narration' },
  { provider: 'pexels', label: 'Pexels (optionnel)', placeholder: 'pexels-api-key', copy: 'Fallback visuel stock portrait' },
]

export default function Settings({ ctx }) {
  const [values, setValues] = useState({ anthropic: '', elevenlabs: '', pexels: '' })
  const [profileForm, setProfileForm] = useState({
    name: ctx.defaultProfile?.name || 'Virax Auto Pipeline',
    niche: ctx.defaultProfile?.defaults?.niche || 'Facts Science',
    durationSeconds: String(ctx.defaultProfile?.defaults?.durationSeconds || 60),
    scheduleCron: ctx.defaultProfile?.scheduleCron || '',
    autopublish: Boolean(ctx.defaultProfile?.defaults?.autopublish),
    autoAssets: ctx.defaultProfile?.defaults?.autoAssets !== false,
  })

  useEffect(() => {
    if (!ctx.defaultProfile) return
    setProfileForm({
      name: ctx.defaultProfile.name,
      niche: ctx.defaultProfile.defaults.niche || 'Facts Science',
      durationSeconds: String(ctx.defaultProfile.defaults.durationSeconds || 60),
      scheduleCron: ctx.defaultProfile.scheduleCron || '',
      autopublish: Boolean(ctx.defaultProfile.defaults.autopublish),
      autoAssets: ctx.defaultProfile.defaults.autoAssets !== false,
    })
  }, [ctx.defaultProfile])

  const integrationsByProvider = useMemo(() => Object.fromEntries(ctx.integrations.map(item => [item.provider, item])), [ctx.integrations])

  return (
    <div className="page-shell page-shell--lg">
      <div className="page-header fade-up">
        <h1 className="page-title page-title--section">Settings & coffre-fort</h1>
        <p className="page-subtitle">Configuration server-side des providers, migration de l'ancien localStorage et parametrage du pipeline automatique.</p>
      </div>

      {!ctx.session.authenticated && (
        <div className="banner banner--warning">
          Ouvre d'abord la session owner pour gerer les integrations backend.
        </div>
      )}

      {ctx.hasLegacyData && (
        <div className="card section-card" style={{ marginBottom: 24 }}>
          <div className="section-heading-row">
            <div>
              <div className="section-title">Migration legacy</div>
              <div className="section-copy">Importe les anciennes cles stockees dans <code>virax_config</code>, puis purge-les du navigateur.</div>
            </div>
            <button type="button" className="button button--primary button--compact" disabled={!ctx.session.authenticated || !ctx.hasLegacySecrets} onClick={() => ctx.actions.migrateLegacySecrets()}>
              Migrer les secrets
            </button>
          </div>
          <div className="stack-list compact-stack" style={{ marginTop: 18 }}>
            {['claudeKey', 'elevenKey', 'googleClientId', 'googleToken', 'pexelsApiKey'].map(key => (
              <div key={key} className="metric-line">
                <span>{key}</span>
                <strong>{ctx.localConfig[key] ? 'detecte' : 'absent'}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="auto-grid" style={{ '--grid-min': '320px' }}>
        <section className="card section-card">
          <div className="section-title">Integrations secretes</div>
          <div className="section-copy">Les secrets ne reviennent jamais en clair au front. L'UI affiche seulement leur etat et un masque.</div>
          <div className="form-stack" style={{ marginTop: 18 }}>
            {PROVIDER_FIELDS.map(field => {
              const integration = integrationsByProvider[field.provider]
              return (
                <div key={field.provider} className="integration-card">
                  <div className="integration-card-head">
                    <div>
                      <div className="list-title">{field.label}</div>
                      <div className="list-copy">{field.copy}</div>
                    </div>
                    <span className={`status-pill status-pill--${integration?.configured ? 'success' : 'warning'}`}>
                      {integration?.maskedSecret || 'non configure'}
                    </span>
                  </div>
                  <input
                    value={values[field.provider]}
                    onChange={event => setValues(current => ({ ...current, [field.provider]: event.target.value }))}
                    className="input-control input-control--mono"
                    placeholder={field.placeholder}
                  />
                  <button
                    type="button"
                    className="button button--secondary button--compact"
                    disabled={!ctx.session.authenticated || !values[field.provider]}
                    onClick={() => {
                      ctx.actions.saveIntegrationSecret(field.provider, { apiKey: values[field.provider] })
                      setValues(current => ({ ...current, [field.provider]: '' }))
                    }}
                  >
                    Enregistrer cote serveur
                  </button>
                </div>
              )
            })}
            <div className="integration-card">
              <div className="integration-card-head">
                <div>
                  <div className="list-title">YouTube OAuth</div>
                  <div className="list-copy">Connexion owner + chaine via Google backend.</div>
                </div>
                <span className={`status-pill status-pill--${ctx.session.youtubeConnected ? 'success' : 'warning'}`}>
                  {ctx.session.youtubeConnected ? ctx.session.channelTitle || 'connecte' : 'a connecter'}
                </span>
              </div>
              <button type="button" className="button button--primary button--compact" onClick={() => ctx.actions.startGoogleLogin()}>
                Reconnecter Google
              </button>
            </div>
          </div>
        </section>

        <section className="card section-card">
          <div className="section-title">Profil pipeline par defaut</div>
          <div className="section-copy">Ce profil sert aux runs manuels et a la cadence automatique du scheduler.</div>
          <div className="form-stack" style={{ marginTop: 18 }}>
            <div>
              <label className="field-label">NOM DU PROFIL</label>
              <input value={profileForm.name} onChange={event => setProfileForm(current => ({ ...current, name: event.target.value }))} className="input-control" />
            </div>
            <div>
              <label className="field-label">NICHE PAR DEFAUT</label>
              <input value={profileForm.niche} onChange={event => setProfileForm(current => ({ ...current, niche: event.target.value }))} className="input-control" />
            </div>
            <div>
              <label className="field-label">DUREE (s)</label>
              <input value={profileForm.durationSeconds} onChange={event => setProfileForm(current => ({ ...current, durationSeconds: event.target.value }))} className="input-control" />
            </div>
            <div>
              <label className="field-label">CRON SCHEDULER</label>
              <input value={profileForm.scheduleCron} onChange={event => setProfileForm(current => ({ ...current, scheduleCron: event.target.value }))} className="input-control input-control--mono" placeholder="0 9 * * 1,3,5" />
              <div className="helper-copy">Exemple: <code>0 9 * * 1,3,5</code> pour lundi, mercredi, vendredi a 09:00.</div>
            </div>
            <label className="checkbox-row">
              <input type="checkbox" checked={profileForm.autopublish} onChange={event => setProfileForm(current => ({ ...current, autopublish: event.target.checked }))} />
              <span>Conserver l'option autopublish dans le profil</span>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={profileForm.autoAssets} onChange={event => setProfileForm(current => ({ ...current, autoAssets: event.target.checked }))} />
              <span>Generer automatiquement les assets scenes</span>
            </label>
            <button
              type="button"
              className="button button--primary button--wide"
              disabled={!ctx.session.authenticated}
              onClick={() => ctx.actions.saveDefaultProfile({
                name: profileForm.name,
                scheduleCron: profileForm.scheduleCron || null,
                defaults: {
                  niche: profileForm.niche || null,
                  durationSeconds: Number(profileForm.durationSeconds) || 60,
                  autopublish: profileForm.autopublish,
                  autoAssets: profileForm.autoAssets,
                },
              })}
            >
              Sauvegarder le profil
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

