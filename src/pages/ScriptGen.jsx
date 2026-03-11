import { Link } from 'react-router-dom'
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
    setLoading(true)
    setError('')
    setScript('')
    const topic = custom || niche.prompt
    const secs = parseInt(duration)
    const facts = secs <= 60 ? 5 : secs <= 90 ? 7 : 10
    const factsLines = Array.from({ length: facts }, (_, index) => 'FACT ' + (index + 1) + ' : Un fait precis et surprenant.').join('\n')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: 'Tu es un expert YouTube viral. Genere un script de ' + secs + 's sur : "' + topic + '".\n\nFORMAT STRICT :\nHOOK (5s) : Phrase ultra-choc.\n' + factsLines + '\nCTA (5s) : Appel a action.\n\nRegles : phrases courtes, chiffres precis, ton dynamique. Genere UNIQUEMENT le script.' }],
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      setScript(data.content[0].text)
      ctx.saveConfig({ lastScript: data.content[0].text, lastNiche: niche ? niche.label : custom })
    } catch (e) {
      setError('Erreur API : ' + e.message)
    }
    setLoading(false)
  }

  const copyScript = () => {
    navigator.clipboard.writeText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const wordCount = script.split(/\s+/).filter(Boolean).length
  const estimatedSecs = Math.round(wordCount / 2.5)

  return (
    <div className="page-shell page-shell--md">
      <div className="page-header fade-up">
        <h1 className="page-title page-title--section">Script IA</h1>
        <p className="page-subtitle">Genere un script optimise pour la retention YouTube</p>
      </div>

      {!apiKey && <div className="banner banner--warning">Cle Claude API non configuree. <Link to="/settings" className="inline-link">Reglages</Link></div>}

      <div className="auto-grid" style={{ '--grid-min': '300px' }}>
        <div>
          <div className="field-label" style={{ marginBottom: 10 }}>NICHE</div>
          <div className="auto-grid" style={{ '--grid-min': '160px', gap: 8, marginBottom: 20 }}>
            {NICHES.map(item => (
              <button
                type="button"
                key={item.label}
                onClick={() => { setNiche(item); setCustom('') }}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: niche && niche.label === item.label ? 'rgba(255,59,59,0.12)' : 'var(--bg)',
                  border: '1px solid ' + (niche && niche.label === item.label ? 'var(--red)' : 'var(--border)'),
                  color: niche && niche.label === item.label ? 'var(--red)' : 'var(--text)',
                  fontSize: 13,
                  fontWeight: niche && niche.label === item.label ? 700 : 400,
                }}
              >
                {item.emoji} {item.label}
              </button>
            ))}
          </div>

          <div className="field-label">SUJET PERSONNALISE</div>
          <input
            value={custom}
            onChange={event => { setCustom(event.target.value); setNiche(null) }}
            placeholder="Ex: les pieuvres sont incroyables..."
            className="input-control"
            style={{ marginBottom: 20 }}
          />

          <div className="field-label" style={{ marginBottom: 10 }}>DUREE</div>
          <div className="pill-row" style={{ marginBottom: 24 }}>
            {['30', '60', '90', '120'].map(value => (
              <button
                type="button"
                key={value}
                onClick={() => setDuration(value)}
                style={{
                  flex: '1 1 72px',
                  padding: '9px 0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: duration === value ? 'var(--red)' : 'var(--bg)',
                  border: '1px solid ' + (duration === value ? 'var(--red)' : 'var(--border)'),
                  color: duration === value ? '#fff' : 'var(--muted)',
                  fontSize: 13,
                  fontWeight: duration === value ? 700 : 400,
                }}
              >
                {value}s
              </button>
            ))}
          </div>

          {error && <div className="banner banner--error" style={{ marginBottom: 12 }}>{error}</div>}

          <button type="button" onClick={generate} disabled={loading} className="button button--wide button--primary" style={{ paddingBlock: 14 }}>
            {loading ? 'Generation en cours...' : 'Generer le script'}
          </button>
        </div>

        <div>
          <div className="split-row" style={{ alignItems: 'center', marginBottom: 10 }}>
            <span className="field-label" style={{ marginBottom: 0 }}>RESULTAT</span>
            {script && (
              <div className="action-row" style={{ gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>~{estimatedSecs}s - {wordCount} mots</span>
                <button type="button" onClick={copyScript} className="button button--tiny" style={{ background: copied ? 'var(--green)' : 'var(--bg3)', color: copied ? '#000' : 'var(--text)', border: '1px solid var(--border)' }}>
                  {copied ? 'Copie !' : 'Copier'}
                </button>
              </div>
            )}
          </div>

          <div className="card panel-fill" style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
            {!script && !loading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted2)' }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>AI</div>
                <div style={{ fontSize: 14 }}>Le script apparaitra ici</div>
              </div>
            )}
            {loading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{ width: 36, height: 36, border: '3px solid var(--red)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Claude genere ton script...</div>
              </div>
            )}
            {script && <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.9, color: 'var(--text)', fontFamily: 'var(--font-mono)', overflowWrap: 'anywhere' }}>{script}</pre>}
          </div>

          {script && <Link to="/video" className="button button--wide button--soft-purple" style={{ marginTop: 12 }}>Creer la video avec ce script</Link>}
        </div>
      </div>
    </div>
  )
}
