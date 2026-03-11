import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

function authMessage(search) {
  const params = new URLSearchParams(search)
  if (params.get('auth') === 'success') {
    return { tone: 'success', message: 'Connexion Google terminee. Le refresh token YouTube est maintenant chiffre cote serveur.' }
  }
  if (params.get('auth') === 'error') {
    return { tone: 'error', message: "Le flux OAuth a echoue. Verifie l'email owner autorise et les credentials Google backend." }
  }
  return null
}

export default function ChannelSetup({ ctx }) {
  const location = useLocation()
  const message = useMemo(() => authMessage(location.search), [location.search])
  const youtube = ctx.integrations.find(item => item.provider === 'youtube')
  const connectedLabel = youtube?.metadata?.channelTitle || ctx.session.channelTitle || 'Chaine connectee'

  return (
    <div className="page-shell page-shell--md">
      <div className="page-header fade-up">
        <h1 className="page-title page-title--section">Owner & chaine YouTube</h1>
        <p className="page-subtitle">Authentification Google cote backend, session httpOnly et refresh token chiffre avec AES-256-GCM.</p>
      </div>

      {message && <div className={`banner banner--${message.tone}`}>{message.message}</div>}

      <div className="auto-grid" style={{ '--grid-min': '300px' }}>
        <section className="card section-card">
          <div className="section-title">Session owner</div>
          <div className="section-copy">Une seule adresse email est autorisee, definie par <code>OWNER_GOOGLE_EMAIL</code>.</div>
          <div className="stack-list" style={{ marginTop: 18 }}>
            <div className="metric-line">
              <span>Email owner</span>
              <strong>{ctx.session.ownerEmail || '--'}</strong>
            </div>
            <div className="metric-line">
              <span>Expire le</span>
              <strong>{ctx.session.expiresAt ? new Date(ctx.session.expiresAt).toLocaleString('fr-FR') : '--'}</strong>
            </div>
            <div className="metric-line">
              <span>API backend</span>
              <strong style={{ color: ctx.health.ok ? 'var(--green)' : 'var(--orange)' }}>{ctx.health.ok ? 'Disponible' : 'A verifier'}</strong>
            </div>
          </div>
          <div className="action-row" style={{ marginTop: 20 }}>
            {!ctx.session.authenticated ? (
              <button type="button" className="button button--primary button--mobile-full" onClick={() => ctx.actions.startGoogleLogin()}>
                Connecter Google & YouTube
              </button>
            ) : (
              <button type="button" className="button button--ghost button--mobile-full" onClick={() => ctx.actions.logoutOwner()}>
                Fermer la session owner
              </button>
            )}
          </div>
        </section>

        <section className="card section-card">
          <div className="section-title">Etat de la chaine</div>
          <div className="section-copy">Le backend garde la connexion YouTube et envoie les uploads prives sans passer par YouTube Studio.</div>
          {ctx.session.youtubeConnected ? (
            <div className="channel-card" style={{ marginTop: 18 }}>
              <div className="channel-avatar">YT</div>
              <div>
                <div className="channel-title truncate-soft">{connectedLabel}</div>
                <div className="channel-copy">Channel ID: {youtube?.metadata?.channelId || '--'}</div>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ marginTop: 18 }}>Aucune chaine connectee pour le moment.</div>
          )}
          <div className="stack-list" style={{ marginTop: 20 }}>
            {[
              'OAuth Authorization Code + refresh token hors navigateur',
              'Session owner via cookie httpOnly secure en production',
              'Upload video prive et publication programmee depuis ViraxStudio',
            ].map(item => (
              <div key={item} className="bullet-line">{item}</div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
