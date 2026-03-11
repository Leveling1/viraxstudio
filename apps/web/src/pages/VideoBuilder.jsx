function formatStatus(status) {
  return (status || 'unknown').replace(/-/g, ' ')
}

export default function VideoBuilder({ ctx }) {
  const run = ctx.selectedRun

  return (
    <div className="page-shell page-shell--lg">
      <div className="page-header fade-up">
        <h1 className="page-title page-title--section">Production & rendus</h1>
        <p className="page-subtitle">Visualise les scenes, le render vertical, la miniature et l'etat de preparation avant la review.</p>
      </div>

      {!run ? (
        <div className="empty-state">Selectionne un run dans l'onglet Runs pour afficher la production.</div>
      ) : (
        <>
          <div className="banner banner--soft-success">
            Run courant: <strong>{run.topic}</strong> • statut <strong>{formatStatus(run.status)}</strong> • review <strong>{run.reviewStatus || 'pending'}</strong>
          </div>

          <div className="auto-grid" style={{ '--grid-min': '320px' }}>
            <section className="card section-card">
              <div className="section-title">Render final</div>
              <div className="section-copy">Le worker genere un rendu vertical MP4 et le stocke sur le bucket S3-compatible.</div>
              {run.renderUrl ? (
                <video className="preview-video" controls src={run.renderUrl} />
              ) : (
                <div className="empty-state" style={{ marginTop: 18 }}>Le render apparaitra ici apres l'etape video.</div>
              )}
            </section>

            <section className="card section-card">
              <div className="section-title">Miniature</div>
              <div className="section-copy">La miniature est preparee cote worker et reusee pour l'upload YouTube.</div>
              {run.thumbnailUrl ? (
                <img className="preview-thumb" src={run.thumbnailUrl} alt="Miniature du run" />
              ) : (
                <div className="empty-state" style={{ marginTop: 18 }}>Miniature en attente.</div>
              )}
            </section>
          </div>

          <section className="card section-card" style={{ marginTop: 24 }}>
            <div className="section-title">Scenes generees</div>
            <div className="section-copy">Chaque scene contient le prompt visuel, la narration et l'asset resolu par le backend.</div>
            <div className="scene-grid" style={{ marginTop: 18 }}>
              {run.scenes?.length ? run.scenes.map(scene => (
                <article key={scene.id} className="scene-card">
                  <div className="scene-card-index">Scene {scene.order + 1}</div>
                  {scene.assetUrl ? (
                    <img src={scene.assetUrl} alt={`Scene ${scene.order + 1}`} className="scene-card-media" />
                  ) : (
                    <div className="scene-card-placeholder">Asset en generation</div>
                  )}
                  <div className="scene-card-body">
                    <div className="scene-card-title truncate-soft">{scene.prompt}</div>
                    <div className="scene-card-copy">{scene.narrationText}</div>
                    <div className="scene-card-meta">{scene.durationSeconds}s</div>
                  </div>
                </article>
              )) : (
                <div className="empty-state">Les scenes apparaitront ici apres la generation.</div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

