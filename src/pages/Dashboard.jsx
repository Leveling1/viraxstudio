import { useNavigate } from 'react-router-dom'

const STEPS = [
  { to: '/channel', icon: '??', label: 'Creer ma chaine',   desc: 'OAuth Google + creation automatique',   color: '#FF3B3B', key: 'channelName' },
  { to: '/script',  icon: '✍',       label: 'Generer un script', desc: 'IA genere hook + facts + CTA',           color: '#FF8C00', key: 'claudeKey' },
  { to: '/video',   icon: '??', label: 'Creer la video',    desc: 'Visuels + voix off automatiques',        color: '#9B4DFF', key: null },
  { to: '/publish', icon: '??', label: 'Publier',            desc: 'Upload YouTube avec SEO genere par IA', color: '#00C48C', key: null },
]

export default function Dashboard({ ctx }) {
  const nav = useNavigate()
  const done = STEPS.filter(s => s.key && ctx.config[s.key]).length
  const pct = Math.round((done / 2) * 100)
  return (
    <div style={{ padding: '40px 48px', maxWidth: 900 }}>
      <div className="fade-up" style={{ marginBottom: 48 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 20, padding: '4px 14px', marginBottom: 16, fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>
          <span style={{ animation: 'pulse 1.5s infinite', display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--red)' }} />
          Pipeline YouTube automatise
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, marginBottom: 12 }}>
          Bienvenue sur<br />
          <span style={{ background: 'linear-gradient(90deg, var(--red), var(--orange))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ViraxStudio</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 16, maxWidth: 480 }}>Automatise ta chaine YouTube de A a Z sans jamais quitter l'app.</p>
      </div>
      <div className="fade-up-1" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', marginBottom: 36, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Configuration du pipeline</span>
            <span style={{ fontSize: 13, color: pct === 100 ? 'var(--green)' : 'var(--orange)', fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg, var(--red), var(--orange), var(--green))', borderRadius: 3, transition: 'width .6s ease' }} />
          </div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: pct === 100 ? 'var(--green)' : 'var(--muted2)' }}>{done}/2</div>
      </div>
      <div className="fade-up-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {STEPS.map((step, i) => {
          const isReady = step.key ? !!ctx.config[step.key] : true
          return (
            <div key={step.to} onClick={() => nav(step.to)}
              style={{ background: 'var(--bg2)', border: '1px solid ' + (isReady ? step.color + '44' : 'var(--border)'), borderRadius: 16, padding: '24px', cursor: 'pointer', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = step.color }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = isReady ? step.color + '44' : 'var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: step.color + '18', border: '1px solid ' + step.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{step.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', background: isReady ? step.color + '22' : 'var(--bg3)', color: isReady ? step.color : 'var(--muted)', borderRadius: 6, border: '1px solid ' + (isReady ? step.color + '44' : 'var(--border)') }}>{isReady ? (step.key ? 'PRET' : 'ACCES') : 'A FAIRE'}</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                <span style={{ color: 'var(--muted2)', marginRight: 6, fontSize: 12 }}>{String(i + 1).padStart(2, '0')}.</span>{step.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{step.desc}</div>
            </div>
          )
        })}
      </div>
      <div className="fade-up-3" style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        {[{ label: 'Cout / video', value: '~0.80EUR', color: 'var(--green)' }, { label: 'Temps / video', value: '~8 min', color: 'var(--orange)' }, { label: 'Videos / jour', value: 'illimite', color: 'var(--purple)' }, { label: 'APIs gratuites', value: '3/4', color: 'var(--red)' }].map(s => (
          <div key={s.label} style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
