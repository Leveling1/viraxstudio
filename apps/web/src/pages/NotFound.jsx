import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page-shell page-shell--md">
      <section className="card section-card not-found-card fade-up">
        <div className="not-found-code">404</div>
        <div className="not-found-badge">Page introuvable</div>
        <h1 className="page-title page-title--section not-found-title">
          Cette route n'existe pas dans ViraxStudio.
        </h1>
        <p className="page-subtitle not-found-copy">
          La page que tu cherches a peut-etre ete deplacee, supprimee ou l'URL est incorrecte.
          Reviens a l'accueil pour reprendre le pilotage de ta chaine YouTube.
        </p>
        <div className="action-row not-found-actions">
          <Link to="/" className="button button--primary button--mobile-full">
            Retourner a l'accueil
          </Link>
        </div>
      </section>
    </div>
  )
}