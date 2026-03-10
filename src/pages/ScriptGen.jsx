import { useState } from 'react'

const NICHES = [
  { label: 'Facts Science', emoji: '[Science]', prompt: 'faits scientifiques incroyables et contre-intuitifs' },
  { label: 'Histoire', emoji: '[Histoire]', prompt: 'evenements historiques mysterieux ou peu connus' },
  { label: 'Faits Insolites', emoji: '[Insolite]', prompt: 'faits insolites sur la vie quotidienne et le monde' },
  { label: 'Psychologie', emoji: '[Psycho]', prompt: 'phenomenes psychologiques fascinants' },
  { label: 'Space & Cosmos', emoji: '[Space]', prompt: "faits stupefiants sur l'univers et l'espace" },
  { label: 'Animaux', emoji: '[Animaux]', prompt: 'comportements animaux incroyables et surprenants' },
]

export default function ScriptGen({ ctx }) {
  const [niche, setNiche] = useState(null)
  const [custom, setCustom] = useState('')
  const [duration, setDuration] = useState('60')
  const [script, setScript] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const apiKey = ctx.config.claudeKey

  const generate = async () => {
    if (!apiKey) { setError('Cle API Claude manquante - va dans Reglages'); return }
    if (!niche && !custom) { setError('Choisis une niche ou entre un sujet'); return }
    setLoading(true); setError(''); setScript('')
    const topic = custom || niche.prompt
    const secs = parseInt(duration)
    const facts = secs <= 60 ? 5 : secs <= 90 ? 7 : 10
    const factsLines = Array.from({ length: facts }, (_, i) => 'FACT ' + (i + 1) + ' : Un fait precis et surprenant.').join('\n')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1500,
          messages: [{ role: 'user', content: 'Tu es un expert YouTube viral. Genere un script de ' + secs + 's sur : "' + topic + '".\n\nFORMAT STRICT :\nHOOK (5s) : Phrase ultra-choc.\n' + factsLines + '\nCTA (5s) : Appel a action.\n\nRegles : phrases courtes, chiffres precis, ton dynamique. Genere UNIQUEMENT le script.' }]
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      setScript(data.content[0].text)
      ctx.saveConfig({ lastScript: data.content[0].text, lastNiche: niche ? niche.label : custom })
    } catch (e) { setError('Erreur API : ' + e.message) }
    setLoading(false)
  }

  const copyScript = () => { navigator.clipboard.writeText(script); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const wordCount = script.split(/\s+/).filter(Boolean).length
  const estimatedSecs = Math.round(wordCount / 2.5)

  return (
    <div style={{ padding: '40px 48px', maxWidth: 860 }}>
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, marginBottom: 6 }}>Script IA</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Genere un script optimise pour la retention YouTube</p>
      </div>
      {!apiKey && <div style={{ background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--orange)' }}>Cle Claude API non configuree. <a href="/settings" style={{ color: 'var(--red)', fontWeight: 700 }}>Reglages</a></div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 10 }}>NICHE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            {NICHES.map(n => (
              <button key={n.label} onClick={() => { setNiche(n); setCustom('') }} style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', background: niche && niche.label === n.label ? 'rgba(255,59,59,0.12)' : 'var(--bg)', border: '1px solid ' + (niche && niche.label === n.label ? 'var(--red)' : 'var(--border)'), color: niche && niche.label === n.label ? 'var(--red)' : 'var(--text)', fontSize: 13, fontWeight: niche && niche.label === n.label ? 700 : 400 }}>{n.emoji} {n.label}</button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>SUJET PERSONNALISE</div>
          <input value={custom} onChange={e => { setCustom(e.target.value); setNiche(null) }} placeholder="Ex: les pieuvres sont incroyables..." style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', padding: '10px 14px', fontSize: 14, marginBottom: 20 }} />
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 10 }}>DUREE</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {['30', '60', '90', '120'].map(d => (
              <button key={d} onClick={() => setDuration(d)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, cursor: 'pointer', background: duration === d ? 'var(--red)' : 'var(--bg)', border: '1px solid ' + (duration === d ? 'var(--red)' : 'var(--border)'), color: duration === d ? '#fff' : 'var(--muted)', fontSize: 13, fontWeight: duration === d ? 700 : 400 }}>{d}s</button>
            ))}
          </div>
          {error && <div style={{ padding: 12, background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</div>}
          <button onClick={generate} disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? 'var(--bg3)' : 'linear-gradient(135deg, var(--red), var(--orange))', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Generation en cours...' : 'Generer le script'}
          </button>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>RESULTAT</span>
            {script && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>~{estimatedSecs}s - {wordCount} mots</span>
              <button onClick={copyScript} style={{ padding: '4px 12px', background: copied ? 'var(--green)' : 'var(--bg3)', color: copied ? '#000' : 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>{copied ? 'Copie !' : 'Copier'}</button>
            </div>}
          </div>
          <div style={{ minHeight: 480, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, position: 'relative', overflow: 'hidden' }}>
            {!script && !loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted2)' }}><div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>AI</div><div style={{ fontSize: 14 }}>Le script apparaitra ici</div></div>}
            {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}><div style={{ width: 36, height: 36, border: '3px solid var(--red)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /><div style={{ fontSize: 13, color: 'var(--muted)' }}>Claude genere ton script...</div></div>}
            {script && <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.9, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{script}</pre>}
          </div>
          {script && <a href="/video" style={{ display: 'block', textAlign: 'center', marginTop: 12, padding: '12px', background: 'rgba(155,77,255,0.12)', border: '1px solid rgba(155,77,255,0.25)', borderRadius: 10, color: 'var(--purple)', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>Creer la video avec ce script</a>}
        </div>
      </div>
    </div>
  )
}
