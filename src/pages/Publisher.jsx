import { Link } from 'react-router-dom'
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
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 600, messages: [{ role: 'user', content: 'Script: "' + script.substring(0, 400) + '"\n\nGenere UNIQUEMENT ce JSON valide:\n{"title":"titre court avec chiffre","description":"150 mots SEO","tags":["tag1","tag2","tag3","tag4","tag5"]}' }] }),
      })
      const data = await res.json()
      const parsed = JSON.parse(data.content[0].text.replace(/```json|```/g, '').trim())
      setTitle(parsed.title || '')
      setDescription(parsed.description || '')
      setTags(Array.isArray(parsed.tags) ? parsed.tags.join(', ') : '')
    } catch (e) {
      setError('Erreur SEO: ' + e.message)
    }
    setGenLoading(false)
  }

  const upload = async () => {
    if (!token) { setError('Connecte ton compte Google'); return }
    if (!videoFile) { setError('Selectionne une video'); return }
    if (!title) { setError('Le titre est obligatoire'); return }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      setStage('Upload de la video...')
      const body = { snippet: { title, description, tags: tags.split(',').map(tag => tag.trim()).filter(Boolean), categoryId: '28', defaultLanguage: 'fr' }, status: { privacyStatus: privacy } }
      const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'X-Upload-Content-Type': videoFile.type, 'X-Upload-Content-Length': videoFile.size }, body: JSON.stringify(body) })
      if (!initRes.ok) {
        const err = await initRes.json()
        throw new Error(err.error?.message || 'Erreur YouTube API')
      }
      const uploadUrl = initRes.headers.get('Location')
      if (!uploadUrl) throw new Error('URL upload non recue')
      const uploadRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': videoFile.type }, body: videoFile })
      if (!uploadRes.ok) throw new Error('Echec upload')
      const videoData = await uploadRes.json()
      if (thumbFile && videoData.id) {
        setStage('Upload miniature...')
        await fetch('https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=' + videoData.id, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': thumbFile.type }, body: thumbFile })
      }
      setResult({ id: videoData.id, url: 'https://youtu.be/' + videoData.id })
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="page-shell page-shell--md">
      <div className="page-header fade-up">
        <h1 className="page-title page-title--section">Publier sur YouTube</h1>
        <p className="page-subtitle">Upload automatique avec SEO genere par IA</p>
      </div>

      {!token && <div className="banner banner--warning">Compte Google non connecte. <Link to="/channel" className="inline-link">Connecter</Link></div>}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div className="split-row" style={{ alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>SEO automatique</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Titre + description + tags par IA</div>
          </div>
          <button type="button" onClick={generateSEO} disabled={genLoading || !claudeKey || !script} className="button button--primary button--mobile-full" style={{ opacity: !claudeKey || !script ? 0.5 : 1 }}>
            {genLoading ? 'Generation...' : 'Generer le SEO'}
          </button>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="field-label">TITRE</div>
          <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Titre de la video" className="input-control" />
          <div style={{ fontSize: 11, color: title.length > 60 ? 'var(--red)' : 'var(--muted)', textAlign: 'right', marginTop: 4 }}>{title.length}/60</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="field-label">DESCRIPTION</div>
          <textarea value={description} onChange={event => setDescription(event.target.value)} rows={3} className="input-control" style={{ resize: 'vertical' }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="field-label">TAGS</div>
          <input value={tags} onChange={event => setTags(event.target.value)} placeholder="tag1, tag2, tag3..." className="input-control" />
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Fichiers</div>
        <div className="auto-grid" style={{ '--grid-min': '220px', gap: 12, marginBottom: 16 }}>
          {[['Video (.mp4)', 'video/*', videoFile, setVideoFile], ['Miniature', 'image/*', thumbFile, setThumbFile]].map(([label, accept, file, setter]) => (
            <label key={label} className={`upload-card${file ? ' is-ready' : ''}`}>
              <input type="file" accept={accept} onChange={event => setter(event.target.files[0])} style={{ display: 'none' }} />
              <div className="truncate-soft" style={{ fontSize: 12, color: file ? 'var(--green)' : 'var(--muted)', fontWeight: file ? 700 : 400 }}>{file ? file.name : label}</div>
            </label>
          ))}
        </div>
        <div className="pill-row">
          {['public', 'unlisted', 'private'].map(value => (
            <button
              type="button"
              key={value}
              onClick={() => setPrivacy(value)}
              style={{
                flex: '1 1 120px',
                padding: '8px',
                borderRadius: 8,
                cursor: 'pointer',
                background: privacy === value ? 'rgba(0,196,140,0.12)' : 'var(--bg)',
                border: '1px solid ' + (privacy === value ? 'var(--green)' : 'var(--border)'),
                color: privacy === value ? 'var(--green)' : 'var(--muted)',
                fontSize: 13,
                fontWeight: privacy === value ? 700 : 400,
              }}
            >
              {value === 'public' ? 'Public' : value === 'unlisted' ? 'Non liste' : 'Prive'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="banner banner--error">{error}</div>}

      {result ? (
        <div className="banner banner--success" style={{ borderRadius: 14, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)', marginBottom: 12 }}>Video publiee !</div>
          <a href={result.url} target="_blank" rel="noopener noreferrer" className="button button--primary">Voir sur YouTube</a>
        </div>
      ) : (
        <button type="button" onClick={upload} disabled={loading || !videoFile || !title || !token} className="button button--wide button--green" style={{ padding: 16, fontSize: 16, opacity: !videoFile || !title || !token ? 0.5 : 1 }}>
          {loading ? stage : 'Publier sur YouTube'}
        </button>
      )}
    </div>
  )
}
