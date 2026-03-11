import { Link } from 'react-router-dom'

const STATUS_COLORS = {
  draft: 'var(--muted)',
  queued: 'var(--orange)',
  running: 'var(--orange)',
  'needs-review': 'var(--red)',
  approved: 'var(--green)',
  publishing: 'var(--orange)',
  published: 'var(--green)',
  failed: 'var(--red)',
  cancelled: 'var(--muted)',
}

function formatStatus(status) {
  return (status || 'unknown').replace(/-/g, ' ')
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '--'
}

export default function Dashboard({ ctx }) {
  const readyIntegrations = ctx.integrations.filter(item => item.status === 'connected' || item.configured).length
  const latestRuns = ctx.runs.slice(0, 4)
  const runningCount = ctx.runs.filter(item => ['queued', 'running', 'publishing'].includes(item.status)).length
  const reviewCount = ctx.reviews.filter(item => item.status === 'pending').length
  const latestRun = ctx.selectedRun || null

  return (
    <div className="page-shell page-shell--lg">
      <div className="page-header page-header--hero fade-up">
        <div className="eyebrow-badge">
          Backend securise + worker + orchestration YouTube
        </div>
        <h1 className="page-title">
          Automatise ta chaine YouTube de A a Z,
          <br />
          depuis une seule console.
        </h1>
        <p className="page-subtitle">
          ViraxStudio orchestre maintenant l'OAuth owner, les secrets chiffres, le pipeline contenu, la review et la publication privee YouTube sans exposer tes cles au navigateur.
        </p>
      </div>

      {!ctx.session.authenticated && (
        <div className="banner banner--warning fade-up-1">
          La session owner n'est pas ouverte. Commence par <Link to="/channel" className="inline-link">connecter le compte Google</Link> cote serveur pour activer le coffre-fort et le pipeline.
        </div>
      )}

      {ctx.hasLegacyData && (
        <div className="banner banner--soft-warning fade-up-1">
          Des donnees locales historiques ont ete detectees dans <code>virax_config</code>. Le wizard de migration est disponible dans <Link to="/settings" className="inline-link">Settings</Link>.
        </div>
      )}

      <div className="stats-grid fade-up-1">
        {[
          { label: 'Session owner', value: ctx.session.authenticated ? 'Active' : 'Bloquee', tone: ctx.session.authenticated ? 'success' : 'warning' },
          { label: 'Integrations prêtes', value: `${readyIntegrations}/${ctx.integrations.length || 4}`, tone: readyIntegrations >= 3 ? 'success' : 'warning' },
          { label: 'Runs en cours', value: String(runningCount), tone: runningCount ? 'warning' : 'neutral' },
          { label: 'Items a review', value: String(reviewCount), tone: reviewCount ? 'danger' : 'success' },
        ].map(stat => (
          <div key={stat.label} className={`stat-card stat-card--${stat.tone}`}>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="auto-grid fade-up-2" style={{ '--grid-min': '320px' }}>
        <section className="card section-card">
          <div className="section-heading-row">
            <div>
              <div className="section-title">Etat du coffre-fort</div>
              <div className="section-copy">Chaque provider est configure cote serveur et les secrets restent masques dans l'UI.</div>
            </div>
            <Link to="/settings" className="button button--secondary button--compact">Configurer</Link>
          </div>
          <div className="stack-list">
            {ctx.integrations.length ? ctx.integrations.map(item => (
              <div key={item.provider} className="list-row">
                <div>
                  <div className="list-title">{item.label}</div>
                  <div className="list-copy">{item.provider}</div>
                </div>
                <span className={`status-pill status-pill--${item.status === 'connected' || item.configured ? 'success' : 'warning'}`}>
                  {item.status === 'connected' || item.configured ? 'Pret' : 'A configurer'}
                </span>
              </div>
            )) : (
              <div className="empty-state">Les integrations apparaitront ici apres connexion owner.</div>
            )}
          </div>
        </section>

        <section className="card section-card">
          <div className="section-heading-row">
            <div>
              <div className="section-title">Runs recents</div>
              <div className="section-copy">La liste reste synchronisee avec l'API et le worker.</div>
            </div>
            <Link to="/script" className="button button--secondary button--compact">Lancer un run</Link>
          </div>
          <div className="stack-list">
            {latestRuns.length ? latestRuns.map(run => (
              <button key={run.id} type="button" className="list-row list-row--button" onClick={() => ctx.actions.selectRun(run.id)}>
                <div>
                  <div className="list-title truncate-soft">{run.topic}</div>
                  <div className="list-copy">{formatDate(run.updatedAt)} • step {run.currentStep || '--'}</div>
                </div>
                <span className="status-pill" style={{ color: STATUS_COLORS[run.status] || 'var(--text)' }}>
                  {formatStatus(run.status)}
                </span>
              </button>
            )) : (
              <div className="empty-state">Aucun run n'a encore ete cree.</div>
            )}
          </div>
        </section>
      </div>

      <section className="card section-card fade-up-3" style={{ marginTop: 24 }}>
        <div className="section-heading-row">
          <div>
            <div className="section-title">Focus run</div>
            <div className="section-copy">Selectionne un run pour suivre la progression, le rendu et la publication.</div>
          </div>
          <div className="action-row">
            <Link to="/video" className="button button--secondary button--compact">Production</Link>
            <Link to="/publish" className="button button--secondary button--compact">Review</Link>
          </div>
        </div>
        {latestRun ? (
          <div className="focus-grid">
            <div className="focus-panel">
              <div className="focus-title truncate-soft">{latestRun.topic}</div>
              <div className="focus-meta">Statut {formatStatus(latestRun.status)} • {latestRun.currentStep || 'termine'}</div>
              <div className="focus-copy">{latestRun.seoTitle || latestRun.seoDescription || latestRun.script?.slice(0, 220) || 'Le detail complet du run apparaitra ici.'}</div>
            </div>
            <div className="focus-panel">
              <div className="progress-steps">
                {latestRun.steps.map(step => (
                  <div key={step.id} className={`progress-step progress-step--${step.status}`}>
                    <span>{step.step}</span>
                    <span>{formatStatus(step.status)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">Aucun run selectionne. Cree-en un depuis l'onglet Runs.</div>
        )}
      </section>
    </div>
  )
}

