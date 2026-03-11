import { useMemo, useState } from 'react'

export default function Publisher({ ctx }) {
  const currentReview = useMemo(() => {
    if (!ctx.selectedRunId) return ctx.reviews[0] || null
    return ctx.reviews.find(item => item.runId === ctx.selectedRunId) || ctx.reviews[0] || null
  }, [ctx.reviews, ctx.selectedRunId])
  const run = ctx.selectedRun
  const [notes, setNotes] = useState('')
  const [privacyStatus, setPrivacyStatus] = useState(ctx.localConfig.preferredPrivacy || 'private')
  const [scheduleAt, setScheduleAt] = useState('')

  const canApprove = run && run.reviewStatus === 'pending'
  const canPublish = run && (run.reviewStatus === 'approved' || run.status === 'approved' || run.publicationStatus === 'uploaded-private')

  return (
    <div className="page-shell page-shell--lg">
      <div className="page-header fade-up">
        <h1 className="page-title page-title--section">Review & publication</h1>
        <p className="page-subtitle">Approuve le draft, puis publie maintenant ou programme depuis ViraxStudio sans quitter l'application.</p>
      </div>

      <div className="auto-grid" style={{ '--grid-min': '320px' }}>
        <section className="card section-card">
          <div className="section-title">File de review</div>
          <div className="section-copy">Les runs uploade´s en prive arrivent ici pour validation editoriale.</div>
          <div className="stack-list" style={{ marginTop: 18 }}>
            {ctx.reviews.length ? ctx.reviews.map(item => (
              <button key={item.id} type="button" className={`list-row list-row--button${ctx.selectedRunId === item.runId ? ' is-selected' : ''}`} onClick={() => ctx.actions.selectRun(item.runId)}>
                <div>
                  <div className="list-title truncate-soft">{item.topic}</div>
                  <div className="list-copy">{item.seoTitle || 'SEO en attente'} • {new Date(item.updatedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</div>
                </div>
                <span className={`status-pill status-pill--${item.status === 'published' || item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'danger' : 'warning'}`}>
                  {item.status}
                </span>
              </button>
            )) : (
              <div className="empty-state">Aucun draft a review pour l'instant.</div>
            )}
          </div>
        </section>

        <section className="card section-card">
          <div className="section-title">Decision editoriale</div>
          <div className="section-copy">Le step review reste humain, puis le worker gere la publication ou la programmation.</div>
          {run ? (
            <>
              <div className="stack-list compact-stack" style={{ marginTop: 18 }}>
                <div className="metric-line"><span>Topic</span><strong className="truncate-soft">{run.topic}</strong></div>
                <div className="metric-line"><span>Review</span><strong>{run.reviewStatus || 'pending'}</strong></div>
                <div className="metric-line"><span>YouTube</span><strong>{run.youtubeUrl ? 'Upload prive termine' : 'En attente'}</strong></div>
              </div>
              <textarea
                value={notes}
                onChange={event => setNotes(event.target.value)}
                rows={4}
                className="input-control"
                placeholder="Notes editoriales ou raison du rejet"
                style={{ marginTop: 18, resize: 'vertical' }}
              />
              <div className="action-row" style={{ marginTop: 16 }}>
                <button type="button" className="button button--primary button--mobile-full" disabled={!canApprove} onClick={() => ctx.actions.reviewRun(run.id, { decision: 'approve', notes })}>
                  Approuver le draft
                </button>
                <button type="button" className="button button--ghost button--mobile-full" disabled={!canApprove} onClick={() => ctx.actions.reviewRun(run.id, { decision: 'reject', notes })}>
                  Rejeter pour correction
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ marginTop: 18 }}>Selectionne un draft dans la file de review.</div>
          )}
        </section>
      </div>

      <section className="card section-card" style={{ marginTop: 24 }}>
        <div className="section-title">Publication YouTube</div>
        <div className="section-copy">Une fois approuve, le backend met a jour la video deja uploadee en prive.</div>
        {run ? (
          <div className="auto-grid" style={{ '--grid-min': '260px', marginTop: 18 }}>
            <div className="content-panel">
              <div className="field-label">PRIVACY</div>
              <div className="pill-row">
                {['private', 'unlisted', 'public'].map(value => (
                  <button
                    key={value}
                    type="button"
                    className={`choice-pill${privacyStatus === value ? ' is-selected' : ''}`}
                    onClick={() => setPrivacyStatus(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div className="content-panel">
              <div className="field-label">PROGRAMMER</div>
              <input type="datetime-local" value={scheduleAt} onChange={event => setScheduleAt(event.target.value)} className="input-control" />
            </div>
            <div className="content-panel">
              <div className="field-label">ACTIONS</div>
              <div className="form-stack">
                <button type="button" className="button button--green button--wide" disabled={!canPublish} onClick={() => ctx.actions.requestPublication(run.id, { mode: 'publish-now', privacyStatus })}>
                  Publier maintenant
                </button>
                <button
                  type="button"
                  className="button button--secondary button--wide"
                  disabled={!canPublish || !scheduleAt}
                  onClick={() => ctx.actions.requestPublication(run.id, { mode: 'schedule', privacyStatus, publishAt: new Date(scheduleAt).toISOString() })}
                >
                  Programmer la publication
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ marginTop: 18 }}>Aucun run selectionne pour la publication.</div>
        )}
      </section>

      {currentReview?.youtubeUrl && (
        <div className="banner banner--soft-success" style={{ marginTop: 24 }}>
          Upload YouTube prive disponible: <a href={currentReview.youtubeUrl} target="_blank" rel="noopener noreferrer" className="inline-link">ouvrir la video</a>
        </div>
      )}
    </div>
  )
}

