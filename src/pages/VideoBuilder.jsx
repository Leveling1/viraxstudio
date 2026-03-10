import { useState } from 'react'

const VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', lang: 'EN', desc: 'Voix feminine douce' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi',   lang: 'EN', desc: 'Dynamique & jeune' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', lang: 'EN', desc: 'Voix masculine naturelle' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli',   lang: 'EN', desc: 'Energique & claire' },
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
    setLoading(true); setError('')
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
        method: 'POST',
        headers: { 'xi-api-key': elKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: script.replace(/[^\x00-\x7F]/g, '').trim(), model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.8 } })
      })
      if (!res.ok) throw new Error('Erreur ElevenLabs: ' + res.status)
      const blob = await res.blob()
      setAudioUrl(URL.createObjectURL(blob))
      ctx.saveConfig({ audioGenerated: true })
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div style={{ padding: '40px 48px', maxWidth: 860 }}>
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, marginBottom: 6 }}>Createur Video</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Genere la voix off et assemble ta video automatiquement</p>
      </div>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 1, marginBottom: 10 }}>SCRIPT ACTUEL</div>
        {script ? <pre style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 120, overflow: 'hidden' }}>{script.substring(0, 300)}...</pre>
          : <p style={{ color: 'var(--muted)', fontSize: 13 }}>Aucun script. <a href="/script" style={{ color: 'var(--red)' }}>Generer un script</a></p>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, letterSpacing: 1, marginBottom: 12 }}>VOIX OFF - ELEVENLABS</div>
          <div style={{ background: 'rgba(0,196,140,0.06)', border: '1px solid rgba(0,196,140,0.15)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: 'var(--green)' }}>Gratuit : 10 000 caracteres/mois</div>
          {!elKey && <div style={{ background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: 'var(--orange)' }}>Cle ElevenLabs requise. <a href="/settings" style={{ color: 'var(--red)', fontWeight: 700 }}>Configurer</a></div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {VOICES.map(v => (
              <button key={v.id} onClick={() => setVoiceId(v.id)} style={{ padding: '10px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', background: voiceId === v.id ? 'rgba(255,59,59,0.12)' : 'var(--bg)', border: '1px solid ' + (voiceId === v.id ? 'var(--red)' : 'var(--border)') }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: voiceId === v.id ? 'var(--red)' : 'var(--text)', fontWeight: voiceId === v.id ? 700 : 400, fontSize: 14 }}>{v.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4 }}>{v.lang}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{v.desc}</div>
              </button>
            ))}
          </div>
          <button onClick={generateVoice} disabled={loading || !script} style={{ width: '100%', padding: 12, background: loading ? 'var(--bg3)' : 'linear-gradient(135deg, #9B4DFF, #6B2FFF)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading || !script ? 'not-allowed' : 'pointer', opacity: !script ? 0.5 : 1 }}>
            {loading ? 'Generation...' : 'Generer la voix off'}
          </button>
          {audioUrl && <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--green)', marginBottom: 8, fontWeight: 700 }}>Voix generee !</div>
            <audio controls src={audioUrl} style={{ width: '100%', borderRadius: 8 }} />
            <a href={audioUrl} download="virax-voiceover.mp3" style={{ display: 'block', textAlign: 'center', marginTop: 8, padding: '8px', background: 'rgba(0,196,140,0.1)', border: '1px solid rgba(0,196,140,0.2)', borderRadius: 8, color: 'var(--green)', textDecoration: 'none', fontSize: 13 }}>Telecharger le MP3</a>
          </div>}
          {error && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--red)' }}>{error}</div>}
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, letterSpacing: 1, marginBottom: 12 }}>OUTILS VIDEO RECOMMANDES</div>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            {[{ name: 'Pictory.ai', desc: 'Script vers video automatique', free: 'Gratuit 3 videos', url: 'https://pictory.ai' }, { name: 'InVideo AI', desc: 'IA + librairie stock', free: 'Gratuit 4 exports/semaine', url: 'https://invideo.io' }, { name: 'CapCut', desc: 'Montage + sous-titres auto', free: '100% gratuit', url: 'https://capcut.com' }].map(tool => (
              <a key={tool.name} href={tool.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'inherit' }}>
                <div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{tool.name}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{tool.desc}</div></div>
                <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>{tool.free}</div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
