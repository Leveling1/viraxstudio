import { useState } from 'react'

const FIELDS = [
  { key: 'claudeKey',      label: 'Claude API Key',        icon: 'AI',  placeholder: 'sk-ant-api03-...', desc: 'Generation scripts et SEO', free: "Gratuit jusqu'a $5 de credit", link: 'https://console.anthropic.com',                     linkLabel: 'Obtenir une cle', color: '#FF8C00' },
  { key: 'googleClientId', label: 'Google OAuth Client ID', icon: 'G',   placeholder: '123456789.apps.googleusercontent.com', desc: 'Connexion chaine YouTube', free: '100% Gratuit', link: 'https://console.cloud.google.com/apis/credentials', linkLabel: 'Creer les credentials', color: '#4285F4' },
  { key: 'elevenKey',      label: 'ElevenLabs API Key',     icon: 'EL',  placeholder: 'xi_...', desc: 'Generation voix off', free: '10 000 chars/mois gratuits', link: 'https://elevenlabs.io/app/profile',                   linkLabel: 'Obtenir une cle', color: '#9B4DFF' },
]

export default function Settings({ ctx }) {
  const [values, setValues] = useState({ claudeKey: ctx.config.claudeKey || '', googleClientId: ctx.config.googleClientId || '', elevenKey: ctx.config.elevenKey || '' })
  const [show, setShow] = useState({})
  const [saved, setSaved] = useState(false)
  const save = () => { ctx.saveConfig({ ...values }); setSaved(true); setTimeout(() => setSaved(false), 2500) }
  const reset = () => { if (window.confirm('Effacer toute la configuration ?')) { localStorage.removeItem('virax_config'); window.location.reload() } }

  return (
    <div style={{ padding: '40px 48px', maxWidth: 680 }}>
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, marginBottom: 6 }}>Reglages</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Configure tes cles API - tout reste en local sur ton navigateur</p>
      </div>
      <div style={{ background: 'rgba(0,196,140,0.06)', border: '1px solid rgba(0,196,140,0.15)', borderRadius: 10, padding: '12px 16px', marginBottom: 28, fontSize: 13, color: 'var(--green)', lineHeight: 1.6 }}>
        Securite : Tes cles sont stockees uniquement dans localStorage. Elles ne transitent jamais par un serveur ViraxStudio.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {FIELDS.map(f => (
          <div key={f.key} style={{ background: 'var(--bg2)', border: '1px solid ' + (values[f.key] ? f.color + '33' : 'var(--border)'), borderRadius: 14, padding: 20, transition: 'border-color .2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: f.color + '22', color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{f.icon}</div>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{f.label}</span>
                  {values[f.key] && <span style={{ fontSize: 10, background: f.color + '22', color: f.color, padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>CONFIGURE</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{f.desc}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>{f.free}</div>
                <a href={f.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: f.color, textDecoration: 'none' }}>{f.linkLabel}</a>
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <input type={show[f.key] ? 'text' : 'password'} value={values[f.key]} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} placeholder={f.placeholder}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid ' + (values[f.key] ? f.color + '55' : 'var(--border2)'), borderRadius: 8, color: 'var(--text)', padding: '10px 40px 10px 14px', fontSize: 13, fontFamily: 'var(--font-mono)' }} />
              <button onClick={() => setShow(s => ({ ...s, [f.key]: !s[f.key] }))} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>{show[f.key] ? 'HIDE' : 'SHOW'}</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button onClick={save} style={{ flex: 1, padding: 14, background: saved ? 'var(--green)' : 'linear-gradient(135deg, var(--red), var(--orange))', color: saved ? '#000' : '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer', transition: 'all .3s' }}>{saved ? 'Sauvegarde !' : 'Sauvegarder'}</button>
        <button onClick={reset} style={{ padding: '14px 20px', background: 'var(--bg2)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 14, cursor: 'pointer' }}>Reset</button>
      </div>
    </div>
  )
}
