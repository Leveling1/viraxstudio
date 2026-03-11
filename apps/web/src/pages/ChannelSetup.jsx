import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

const AUTH_ERRORS = {
  state_mismatch: 'La verification de securite OAuth a expire ou le cookie de session a ete perdu. Relance la connexion Google depuis cette page.',
  owner_email_mismatch: 'Ce compte Google ne correspond pas au compte owner autorise pour cette application.',
  youtube_channel_missing: "Google a bien authentifie le compte, mais aucune chaine YouTube exploitable n'a ete trouvee dessus.",
  refresh_token_missing: "Google n'a pas renvoye de refresh token. Supprime l'acces ViraxStudio dans ton compte Google puis reconnecte-toi.",
  google_profile_incomplete: 'Le profil Google retourne par OAuth est incomplet. Reessaie la connexion.',
  oauth_failed: 'Le flux OAuth a echoue. Verifie les credentials Google backend et la configuration de redirection.',
}

function authMessage(search) {
  const params = new URLSearchParams(search)
  if (params.get('auth') === 'success') {
    return { tone: 'success', message: 'Connexion Google terminee. Le compte YouTube est maintenant relie au backend et pourra servir aux publications.' }
  }
  if (params.get('auth') === 'error') {
    const reason = params.get('reason') || 'oauth_failed'
    return { tone: 'error', message: AUTH_ERRORS[reason] || AUTH_ERRORS.oauth_failed }
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
        <p className="page-subtitle">Connexion Google/YouTube cote backend avec cookies de session adaptes, y compris si le front et l'API vivent sur des domaines differents.</p>
      </div>

      {message && <div className={`banner banner--${message.tone}`}>{message.message}</div>}

      <div className="auto-grid" style={{ '--grid-min': '300px' }}>
        <section className="card section-card">
          <div className="section-title">Session owner</div>
          <div className="section-copy">Le demarrage OAuth passe maintenant par une redirection backend directe, ce qui evite les cookies perdus avant le retour Google.</div>
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
          <div className="section-copy">Une fois connecte, ViraxStudio garde le refresh token cote serveur et peut publier directement sur cette chaine.</div>
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
              'Redirection OAuth backend -> Google -> backend -> web',
              'Session cookie compatible meme si le web et l API sont sur des domaines differents',
              'Le premier compte connecte devient l owner si OWNER_GOOGLE_EMAIL n est pas defini',
            ].map(item => (
              <div key={item} className="bullet-line">{item}</div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}