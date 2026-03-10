import { useState } from 'react'

export default function Publisher({ ctx }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [videoFile, setVideoFile] = useState(null)
  const [thumbFile, setThumbFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [genLoading, setGenLoading] = useState(false)
  const token = ctx.config.googleToken
  const claudeKey = ctx.config.claudeKey
  const script = ctx.config.lastScript

  const generateSEO = async () => {
    if (!claudeKey) { setError('Cle Claude manquante'); return }
    if (!script) { setError('Aucun script disponible'); return }
    setGenLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': claudeKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 600, messages: [{ role: 'user', content: 'Script: "' + script.substring(0, 400) + '"\n\nGenere UNIQUEMENT ce JSON valide:\n{"title":"titre court avec chiffre","description":"150 mots SEO","tags":["tag1","tag2","tag3","tag4","tag5"]}' }] })
      })
      const data = await res.json()
      const parsed = JSON.parse(data.content[0].text.replace(/```json|```/g, '').trim())
      setTitle(parsed.title || ''); setDescription(parsed.description || ''); setTags(Array.isArray(parsed.tags) ? parsed.tags.join(', ') : '')
    } catch (e) { setError('Erreur SEO: ' + e.message) }
    setGenLoading(false)
  }

  const upload = async () => {
    if (!token) { setError('Connecte ton compte Google'); return }
    if (!videoFile) { setError('Selectionne une video'); return }
    if (!title) { setError('Le titre est obligatoire'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      setStage('Upload de la video...')
      const body = { snippet: { title, description, tags: tags.split(',').map(t => t.trim()).filter(Boolean), categoryId: '28', defaultLanguage: 'fr' }, status: { privacyStatus: privacy } }
      const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'X-Upload-Content-Type': videoFile.type, 'X-Upload-Content-Length': videoFile.size }, body: JSON.stringify(body) })
      if (!initRes.ok) { const err = await initRes.json(); throw new Error(err.error?.message || 'Erreur YouTube API') }
      const uploadUrl = initRes.headers.get('Location')
      if (!uploadUrl) throw new Error('URL upload non recue')
      const uploadRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': videoFile.type }, body: videoFile })
      if (!uploadRes.ok) throw new Error('Echec upload')
      const videoData = await uploadRes.json()
      if (thumbFile && videoData.id) { setStage('Upload miniature...'); await fetch('https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=' + videoData.id, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': thumbFile.type }, body: thumbFile }) }
      setResult({ id: videoData.id, url: 'https://youtu.be/' + videoData.id })
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const inputStyle = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', padding: '10px 14px', fontSize: 14 }

  return (
    <div style={{ padding: '40px 48px', maxWidth: 800 }}>
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, marginBottom: 6 }}>Publier sur YouTube</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Upload automatique avec SEO genere par IA</p>
      </div>
      {!token && <div style={{ background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--orange)' }}>Compte Google non connecte. <a href="/channel" style={{ color: 'var(--red)', fontWeight: 700 }}>Connecter</a></div>}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div><div style={{ fontSize: 15, fontWeight: 700 }}>SEO automatique</div><div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Titre + description + tags par IA</div></div>
          <button onClick={generateSEO} disabled={genLoading || !claudeKey || !script} style={{ padding: '9px 18px', background: 'linear-gradient(135deg, var(--red), var(--orange))', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !claudeKey || !script ? 0.5 : 1 }}>{genLoading ? 'Generation...' : 'Generer le SEO'}</button>
        </div>
        <div style={{ marginBottom: 14 }}><div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>TITRE</div><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de la video" style={inputStyle} /><div style={{ fontSize: 11, color: title.length > 60 ? 'var(--red)' : 'var(--muted)', textAlign: 'right', marginTop: 4 }}>{title.length}/60</div></div>
        <div style={{ marginBottom: 14 }}><div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>DESCRIPTION</div><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-head)' }} /></div>
        <div style={{ marginBottom: 14 }}><div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>TAGS</div><input value={tags} onChange={e => setTags(e.target.value)} placeholder="tag1, tag2, tag3..." style={inputStyle} /></div>
      </div>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Fichiers</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[['Video (.mp4)', 'video/*', videoFile, setVideoFile], ['Miniature', 'image/*', thumbFile, setThumbFile]].map(([label, accept, file, setter]) => (
            <label key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 100, background: 'var(--bg)', border: '2px dashed ' + (file ? 'var(--green)' : 'var(--border2)'), borderRadius: 10, cursor: 'pointer', gap: 6 }}>
              <input type="file" accept={accept} onChange={e => setter(e.target.files[0])} style={{ display: 'none' }} />
              <div style={{ fontSize: 12, color: file ? 'var(--green)' : 'var(--muted)', fontWeight: file ? 700 : 400 }}>{file ? file.name.substring(0, 20) + '...' : label}</div>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['public', 'unlisted', 'private'].map(p => (
            <button key={p} onClick={() => setPrivacy(p)} style={{ flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', background: privacy === p ? 'rgba(0,196,140,0.12)' : 'var(--bg)', border: '1px solid ' + (privacy === p ? 'var(--green)' : 'var(--border)'), color: privacy === p ? 'var(--green)' : 'var(--muted)', fontSize: 13, fontWeight: privacy === p ? 700 : 400 }}>
              {p === 'public' ? 'Public' : p === 'unlisted' ? 'Non liste' : 'Prive'}
            </button>
          ))}
        </div>
      </div>
      {error && <div style={{ background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>{error}</div>}
      {result ? (
        <div style={{ background: 'rgba(0,196,140,0.08)', border: '1px solid rgba(0,196,140,0.25)', borderRadius: 14, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)', marginBottom: 12 }}>Video publiee !</div>
          <a href={result.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'var(--red)', color: '#fff', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>Voir sur YouTube</a>
        </div>
      ) : (
        <button onClick={upload} disabled={loading || !videoFile || !title || !token} style={{ width: '100%', padding: 16, background: loading ? 'var(--bg3)' : 'linear-gradient(135deg, #00C48C, #00a876)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: loading || !videoFile || !title || !token ? 'not-allowed' : 'pointer', opacity: !videoFile || !title || !token ? 0.5 : 1 }}>
          {loading ? stage : 'Publier sur YouTube'}
        </button>
      )}
    </div>
  )
}
