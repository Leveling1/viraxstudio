import { Link } from 'react-router-dom'
import { useState } from 'react'

const VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', lang: 'EN', desc: 'Voix feminine douce' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', lang: 'EN', desc: 'Dynamique & jeune' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', lang: 'EN', desc: 'Voix masculine naturelle' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', lang: 'EN', desc: 'Energique & claire' },
]

export default function VideoBuilder({ ctx }) {
  const [voiceId, setVoiceId] = useState(VOICES[1].id)
  const [loading, setLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [error, setError] = useState('')
  const script = ctx.config.lastScript
  const elKey = ctx.config.elevenKey

  const generateVoice = async () => {
    if (!elKey) { setError('Cle ElevenLabs manquante - Reglages'); return }
    if (!script) { setError("Genere d'abord un script"); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
        method: 'POST',
        headers: { 'xi-api-key': elKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: script.replace(/[^\x00-\x7F]/g, '').trim(), model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.8 } }),
      })
      if (!res.ok) throw new Error('Erreur ElevenLabs: ' + res.status)
      const blob = await res.blob()
      setAudioUrl(URL.createObjectURL(blob))
      ctx.saveConfig({ audioGenerated: true })
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="page-shell page-shell--md">
      <div className="page-header fade-up">
        <h1 className="page-title page-title--section">Createur Video</h1>
        <p className="page-subtitle">Genere la voix off et assemble ta video automatiquement</p>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <div className="field-label" style={{ marginBottom: 10 }}>SCRIPT ACTUEL</div>
        {script ? <pre style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 120, overflow: 'hidden', overflowWrap: 'anywhere' }}>{script.substring(0, 300)}...</pre>
          : <p style={{ color: 'var(--muted)', fontSize: 13 }}>Aucun script. <Link to="/script" className="inline-link">Generer un script</Link></p>}
      </div>

      <div className="auto-grid" style={{ '--grid-min': '300px' }}>
        <div>
          <div className="field-label" style={{ marginBottom: 12 }}>VOIX OFF - ELEVENLABS</div>
          <div className="banner banner--soft-success" style={{ marginBottom: 14 }}>Gratuit : 10 000 caracteres/mois</div>
          {!elKey && <div className="banner banner--warning" style={{ marginBottom: 14 }}>Cle ElevenLabs requise. <Link to="/settings" className="inline-link">Configurer</Link></div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {VOICES.map(voice => (
              <button
                type="button"
                key={voice.id}
                onClick={() => setVoiceId(voice.id)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: voiceId === voice.id ? 'rgba(255,59,59,0.12)' : 'var(--bg)',
                  border: '1px solid ' + (voiceId === voice.id ? 'var(--red)' : 'var(--border)'),
                }}
              >
                <div className="split-row" style={{ alignItems: 'center' }}>
                  <span style={{ color: voiceId === voice.id ? 'var(--red)' : 'var(--text)', fontWeight: voiceId === voice.id ? 700 : 400, fontSize: 14 }}>{voice.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4 }}>{voice.lang}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{voice.desc}</div>
              </button>
            ))}
          </div>

          <button type="button" onClick={generateVoice} disabled={loading || !script} className="button button--wide button--purple" style={{ opacity: !script ? 0.5 : 1 }}>
            {loading ? 'Generation...' : 'Generer la voix off'}
          </button>

          {audioUrl && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--green)', marginBottom: 8, fontWeight: 700 }}>Voix generee !</div>
              <audio controls src={audioUrl} style={{ width: '100%', borderRadius: 8 }} />
              <a href={audioUrl} download="virax-voiceover.mp3" className="button button--wide button--soft-green" style={{ marginTop: 8 }}>Telecharger le MP3</a>
            </div>
          )}

          {error && <div className="banner banner--error" style={{ marginTop: 12, marginBottom: 0 }}>{error}</div>}
        </div>

        <div>
          <div className="field-label" style={{ marginBottom: 12 }}>OUTILS VIDEO RECOMMANDES</div>
          <div className="card" style={{ padding: 16 }}>
            {[{ name: 'Pictory.ai', desc: 'Script vers video automatique', free: 'Gratuit 3 videos', url: 'https://pictory.ai' }, { name: 'InVideo AI', desc: 'IA + librairie stock', free: 'Gratuit 4 exports/semaine', url: 'https://invideo.io' }, { name: 'CapCut', desc: 'Montage + sous-titres auto', free: '100% gratuit', url: 'https://capcut.com' }].map(tool => (
              <a key={tool.name} href={tool.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'inherit' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{tool.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{tool.desc}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>{tool.free}</div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
