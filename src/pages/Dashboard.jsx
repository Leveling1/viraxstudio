import { useNavigate } from 'react-router-dom'

const STEPS = [
  { to: '/channel', icon: 'YT', label: 'Creer ma chaine', desc: 'OAuth Google + creation automatique', color: '#FF3B3B', key: 'channelName' },
  { to: '/script', icon: 'AI', label: 'Generer un script', desc: 'IA genere hook + facts + CTA', color: '#FF8C00', key: 'claudeKey' },
  { to: '/video', icon: 'VD', label: 'Creer la video', desc: 'Visuels + voix off automatiques', color: '#9B4DFF', key: null },
  { to: '/publish', icon: 'UP', label: 'Publier', desc: 'Upload YouTube avec SEO genere par IA', color: '#00C48C', key: null },
]

export default function Dashboard({ ctx }) {
  const nav = useNavigate()
  const done = STEPS.filter(step => step.key && ctx.config[step.key]).length
  const pct = Math.round((done / 2) * 100)

  return (
    <div className="page-shell page-shell--md">
      <div className="page-header page-header--hero fade-up">
        <div className="eyebrow-badge">
          <span style={{ animation: 'pulse 1.5s infinite', display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--red)' }} />
          Pipeline YouTube automatise
        </div>
        <h1 className="page-title" style={{ marginBottom: 12 }}>
          Bienvenue sur<br />
          <span style={{ background: 'linear-gradient(90deg, var(--red), var(--orange))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ViraxStudio</span>
        </h1>
        <p className="page-subtitle">Automatise ta chaine YouTube de A a Z sans jamais quitter l'app.</p>
      </div>

      <div className="card fade-up-1" style={{ marginBottom: 36 }}>
        <div className="split-row">
          <div style={{ flex: '1 1 280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Configuration du pipeline</span>
              <span style={{ fontSize: 13, color: pct === 100 ? 'var(--green)' : 'var(--orange)', fontWeight: 700 }}>{pct}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg, var(--red), var(--orange), var(--green))', borderRadius: 3, transition: 'width .6s ease' }} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: pct === 100 ? 'var(--green)' : 'var(--muted2)' }}>{done}/2</div>
        </div>
      </div>

      <div className="auto-grid fade-up-2" style={{ '--grid-min': '240px' }}>
        {STEPS.map((step, index) => {
          const isReady = step.key ? !!ctx.config[step.key] : true

          return (
            <div
              key={step.to}
              onClick={() => nav(step.to)}
              style={{
                background: 'var(--bg2)',
                border: '1px solid ' + (isReady ? step.color + '44' : 'var(--border)'),
                borderRadius: 16,
                padding: 24,
                cursor: 'pointer',
                transition: 'all .2s',
                minHeight: 186,
              }}
              onMouseEnter={event => {
                event.currentTarget.style.transform = 'translateY(-2px)'
                event.currentTarget.style.borderColor = step.color
              }}
              onMouseLeave={event => {
                event.currentTarget.style.transform = 'none'
                event.currentTarget.style.borderColor = isReady ? step.color + '44' : 'var(--border)'
              }}
            >
              <div className="split-row" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: step.color + '18', border: '1px solid ' + step.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>{step.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', background: isReady ? step.color + '22' : 'var(--bg3)', color: isReady ? step.color : 'var(--muted)', borderRadius: 6, border: '1px solid ' + (isReady ? step.color + '44' : 'var(--border)') }}>{isReady ? (step.key ? 'PRET' : 'ACCES') : 'A FAIRE'}</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                <span style={{ color: 'var(--muted2)', marginRight: 6, fontSize: 12 }}>{String(index + 1).padStart(2, '0')}.</span>{step.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{step.desc}</div>
            </div>
          )
        })}
      </div>

      <div className="kpi-grid fade-up-3" style={{ marginTop: 24 }}>
        {[{ label: 'Cout / video', value: '~0.80EUR', color: 'var(--green)' }, { label: 'Temps / video', value: '~8 min', color: 'var(--orange)' }, { label: 'Videos / jour', value: 'illimite', color: 'var(--purple)' }, { label: 'APIs gratuites', value: '3/4', color: 'var(--red)' }].map(stat => (
          <div key={stat.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
