import { useState } from 'react'

const FIELDS = [
  { key: 'claudeKey', label: 'Claude API Key', icon: 'AI', placeholder: 'sk-ant-api03-...', desc: 'Generation scripts et SEO', free: "Gratuit jusqu'a $5 de credit", link: 'https://console.anthropic.com', linkLabel: 'Obtenir une cle', color: '#FF8C00' },
  { key: 'googleClientId', label: 'Google OAuth Client ID', icon: 'G', placeholder: '123456789.apps.googleusercontent.com', desc: 'Connexion chaine YouTube', free: '100% Gratuit', link: 'https://console.cloud.google.com/apis/credentials', linkLabel: 'Creer les credentials', color: '#4285F4' },
  { key: 'elevenKey', label: 'ElevenLabs API Key', icon: 'EL', placeholder: 'xi_...', desc: 'Generation voix off', free: '10 000 chars/mois gratuits', link: 'https://elevenlabs.io/app/profile', linkLabel: 'Obtenir une cle', color: '#9B4DFF' },
]

export default function Settings({ ctx }) {
  const [values, setValues] = useState({ claudeKey: ctx.config.claudeKey || '', googleClientId: ctx.config.googleClientId || '', elevenKey: ctx.config.elevenKey || '' })
  const [show, setShow] = useState({})
  const [saved, setSaved] = useState(false)

  const save = () => {
    ctx.saveConfig({ ...values })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const reset = () => {
    if (window.confirm('Effacer toute la configuration ?')) {
      localStorage.removeItem('virax_config')
      window.location.reload()
    }
  }

  return (
    <div className="page-shell page-shell--sm">
      <div className="page-header fade-up">
        <h1 className="page-title page-title--section">Reglages</h1>
        <p className="page-subtitle">Configure tes cles API - tout reste en local sur ton navigateur</p>
      </div>

      <div className="banner banner--soft-success" style={{ marginBottom: 28 }}>
        Securite : Tes cles sont stockees uniquement dans localStorage. Elles ne transitent jamais par un serveur ViraxStudio.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {FIELDS.map(field => (
          <div key={field.key} className="card" style={{ borderColor: values[field.key] ? field.color + '33' : 'var(--border)', borderRadius: 14, padding: 20, transition: 'border-color .2s' }}>
            <div className="split-row" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: field.color + '22', color: field.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{field.icon}</div>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{field.label}</span>
                  {values[field.key] && <span className="status-chip" style={{ background: field.color + '22', color: field.color, borderRadius: 6 }}>CONFIGURE</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{field.desc}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>{field.free}</div>
                <a href={field.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: field.color, textDecoration: 'none' }}>{field.linkLabel}</a>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={show[field.key] ? 'text' : 'password'}
                value={values[field.key]}
                onChange={event => setValues(prev => ({ ...prev, [field.key]: event.target.value }))}
                placeholder={field.placeholder}
                className="input-control input-control--mono"
                style={{ borderColor: values[field.key] ? field.color + '55' : 'var(--border2)', paddingRight: 56, fontSize: 13 }}
              />
              <button type="button" onClick={() => setShow(prev => ({ ...prev, [field.key]: !prev[field.key] }))} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>
                {show[field.key] ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="action-row" style={{ marginTop: 24 }}>
        <button type="button" onClick={save} className="button button--mobile-full" style={{ flex: '1 1 220px', padding: 14, background: saved ? 'var(--green)' : 'linear-gradient(135deg, var(--red), var(--orange))', color: saved ? '#000' : '#fff', fontSize: 15, fontWeight: 800, transition: 'all .3s' }}>
          {saved ? 'Sauvegarde !' : 'Sauvegarder'}
        </button>
        <button type="button" onClick={reset} className="button button--ghost button--mobile-full" style={{ padding: '14px 20px' }}>Reset</button>
      </div>
    </div>
  )
}
