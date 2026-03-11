import { useEffect, useMemo, useState } from 'react'

const NICHES = [
  'Facts Science',
  'Histoire cachee',
  'Psychologie virale',
  'Space & Cosmos',
  'Business Stories',
  'Culture internet',
]

function formatStatus(status) {
  return (status || 'unknown').replace(/-/g, ' ')
}

export default function ScriptGen({ ctx }) {
  const [topic, setTopic] = useState(ctx.localConfig.draftTopic || '')
  const [niche, setNiche] = useState(ctx.defaultProfile?.defaults?.niche || 'Facts Science')
  const [durationSeconds, setDurationSeconds] = useState(String(ctx.localConfig.preferredDuration || ctx.defaultProfile?.defaults?.durationSeconds || 60))

  useEffect(() => {
    if (!ctx.defaultProfile) return
    setNiche(current => current || ctx.defaultProfile.defaults.niche || 'Facts Science')
    setDurationSeconds(current => current || String(ctx.defaultProfile.defaults.durationSeconds || 60))
  }, [ctx.defaultProfile])

  const selectedRun = ctx.selectedRun
  const canLaunch = ctx.session.authenticated && ctx.integrations.some(item => item.provider === 'anthropic' && item.configured)
  const recentRuns = useMemo(() => ctx.runs.slice(0, 8), [ctx.runs])

  const submit = event => {
    event.preventDefault()
    ctx.actions.createPipelineRun({
      topic: topic.trim(),
      niche: niche.trim() || undefined,
      durationSeconds: Number(durationSeconds) || 60,
      profileId: ctx.defaultProfile?.id,
      source: 'manual',
    })
  }

  return (
    <div className="page-shell page-shell--lg">
      <div className="page-header fade-up">
        <h1 className="page-title page-title--section">Runs pipeline</h1>
        <p className="page-subtitle">Cree un sujet, laisse le worker generer le script, les scenes, la voix, le render et l'upload prive YouTube.</p>
      </div>

      {!ctx.session.authenticated && (
        <div className="banner banner--warning">Connecte d'abord l'owner dans l'onglet Owner pour demarrer un run.</div>
      )}

      <div className="auto-grid" style={{ '--grid-min': '320px' }}>
        <section className="card section-card">
          <div className="section-title">Nouveau run</div>
          <div className="section-copy">Le sujet devient le prompt source du pipeline. Le profil par defaut alimente la niche et la duree.</div>
          <form onSubmit={submit} className="form-stack" style={{ marginTop: 18 }}>
            <div>
              <label className="field-label">SUJET</label>
              <input
                value={topic}
                onChange={event => {
                  setTopic(event.target.value)
                  ctx.actions.updateLocalConfig({ draftTopic: event.target.value })
                }}
                className="input-control"
                placeholder="Ex: Pourquoi les poulpes paraissent extraterrestres ?"
              />
            </div>
            <div>
              <label className="field-label">NICHE</label>
              <div className="pill-row">
                {NICHES.map(option => (
                  <button
                    key={option}
                    type="button"
                    className={`choice-pill${niche === option ? ' is-selected' : ''}`}
                    onClick={() => setNiche(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">DUREE</label>
              <div className="pill-row">
                {[30, 45, 60, 90, 120].map(value => (
                  <button
                    key={value}
                    type="button"
                    className={`choice-pill${Number(durationSeconds) === value ? ' is-selected' : ''}`}
                    onClick={() => setDurationSeconds(String(value))}
                  >
                    {value}s
                  </button>
                ))}
              </div>
            </div>
            <div className="banner banner--soft-success" style={{ marginBottom: 0 }}>
              Profil actif: <strong>{ctx.defaultProfile?.name || 'Virax Auto Pipeline'}</strong>
            </div>
            <button type="submit" className="button button--primary button--wide" disabled={!topic.trim() || !canLaunch}>
              {ctx.loading.workspace ? 'Preparation...' : 'Lancer le run'}
            </button>
          </form>
        </section>

        <section className="card section-card">
          <div className="section-title">File des runs</div>
          <div className="section-copy">Le detail se met a jour en direct via SSE quand un run est selectionne.</div>
          <div className="stack-list" style={{ marginTop: 18 }}>
            {recentRuns.length ? recentRuns.map(run => (
              <button key={run.id} type="button" className={`list-row list-row--button${ctx.selectedRunId === run.id ? ' is-selected' : ''}`} onClick={() => ctx.actions.selectRun(run.id)}>
                <div>
                  <div className="list-title truncate-soft">{run.topic}</div>
                  <div className="list-copy">{run.currentStep || 'termine'} • {new Date(run.updatedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</div>
                </div>
                <span className={`status-pill status-pill--${run.status === 'failed' ? 'danger' : run.status === 'published' || run.status === 'approved' ? 'success' : 'warning'}`}>
                  {formatStatus(run.status)}
                </span>
              </button>
            )) : (
              <div className="empty-state">Aucun run pour l'instant.</div>
            )}
          </div>
        </section>
      </div>

      <section className="card section-card" style={{ marginTop: 24 }}>
        <div className="section-heading-row">
          <div>
            <div className="section-title">Detail du run selectionne</div>
            <div className="section-copy">Script, SEO et progression etape par etape.</div>
          </div>
        </div>
        {selectedRun ? (
          <div className="auto-grid" style={{ '--grid-min': '320px', marginTop: 18 }}>
            <div className="content-panel">
              <div className="field-label">SCRIPT FINAL</div>
              <pre className="code-panel">{selectedRun.script || "Le script apparaitra ici des que l'etape script sera terminee."}</pre>
            </div>
            <div className="content-panel">
              <div className="field-label">SEO</div>
              <div className="stack-list compact-stack">
                <div className="metric-line"><span>Titre</span><strong className="truncate-soft">{selectedRun.seoTitle || '--'}</strong></div>
                <div className="metric-line"><span>Description</span><strong className="truncate-soft">{selectedRun.seoDescription || '--'}</strong></div>
                <div className="metric-line"><span>Tags</span><strong className="truncate-soft">{selectedRun.seoTags?.join(', ') || '--'}</strong></div>
              </div>
              <div className="field-label" style={{ marginTop: 18 }}>PROGRESSION</div>
              <div className="progress-steps">
                {selectedRun.steps.map(step => (
                  <div key={step.id} className={`progress-step progress-step--${step.status}`}>
                    <span>{step.step}</span>
                    <span>{formatStatus(step.status)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ marginTop: 18 }}>Selectionne un run pour voir son detail.</div>
        )}
      </section>
    </div>
  )
}
