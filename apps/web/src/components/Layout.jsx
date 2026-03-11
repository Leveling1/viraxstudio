import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

const NAV = [
  { to: '/', icon: 'OV', label: 'Overview' },
  { to: '/channel', icon: 'ID', label: 'Owner' },
  { to: '/script', icon: 'RN', label: 'Runs' },
  { to: '/video', icon: 'PD', label: 'Production' },
  { to: '/publish', icon: 'RV', label: 'Review' },
  { to: '/settings', icon: 'ST', label: 'Settings' },
]

function countReadyIntegrations(items) {
  return items.filter(item => item.status === 'connected' || item.configured).length
}

export default function Layout({ ctx }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900)
  const location = useLocation()

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isMobile) {
      document.body.style.overflow = ''
      return
    }
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobile, mobileOpen])

  const sidebarWidth = collapsed ? 72 : 240
  const readyIntegrations = countReadyIntegrations(ctx.integrations)
  const sidebarClassName = ['sidebar', collapsed ? 'is-collapsed' : '', mobileOpen ? 'is-open' : ''].filter(Boolean).join(' ')

  return (
    <div className="app-shell">
      <button
        type="button"
        aria-label="Fermer le menu"
        className={`app-backdrop${mobileOpen ? ' is-visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={sidebarClassName}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">VS</div>
          <span className="sidebar-brand-text">
            Virax<span style={{ color: 'var(--orange)' }}>Studio</span>
          </span>
        </div>

        <div className="sidebar-owner-card">
          <div className="sidebar-owner-eyebrow">Owner Session</div>
          <div className="sidebar-owner-value truncate-soft">
            {ctx.session.authenticated ? (ctx.session.ownerEmail || 'Owner connecte') : 'Connexion requise'}
          </div>
          <div className="sidebar-owner-meta">
            {ctx.session.youtubeConnected ? `Chaine: ${ctx.session.channelTitle || 'connectee'}` : 'OAuth YouTube cote serveur'}
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span className="sidebar-link-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-status-panel">
          {[
            { label: 'API', value: ctx.health.ok ? 'UP' : 'DOWN', ok: ctx.health.ok },
            { label: 'Secrets', value: `${readyIntegrations}/${ctx.integrations.length || 4}`, ok: readyIntegrations > 0 },
            { label: 'Queue', value: `${ctx.reviews.length} review`, ok: ctx.reviews.length === 0 },
          ].map(status => (
            <div key={status.label} className="sidebar-status-row">
              <div className="sidebar-status-dot" style={{ background: status.ok ? 'var(--green)' : 'var(--orange)' }} />
              <span className="sidebar-status-label">{status.label}</span>
              <span className="sidebar-status-value">{status.value}</span>
            </div>
          ))}
        </div>

        {!isMobile && (
          <button
            type="button"
            onClick={() => setCollapsed(value => !value)}
            className="sidebar-toggle"
            aria-label={collapsed ? 'Elargir la barre laterale' : 'Reduire la barre laterale'}
          >
            {collapsed ? '>' : '<'}
          </button>
        )}
      </aside>

      <div className="app-main-shell" style={isMobile ? undefined : { marginLeft: sidebarWidth }}>
        <header className="mobile-topbar">
          <button
            type="button"
            className="mobile-menu-button"
            aria-label="Ouvrir le menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            MENU
          </button>
          <div className="mobile-topbar-brand">
            <div className="sidebar-brand-mark">VS</div>
            <span className="sidebar-brand-text" style={{ display: 'inline' }}>
              Virax<span style={{ color: 'var(--orange)' }}>Studio</span>
            </span>
          </div>
          <div className={`status-chip ${ctx.session.authenticated ? 'status-chip--success' : ''}`}>
            {ctx.session.authenticated ? 'Owner OK' : 'Login'}
          </div>
        </header>

        <main className="app-main">
          {ctx.notice && (
            <div className={`global-toast global-toast--${ctx.notice.tone || 'info'}`}>
              {ctx.notice.message}
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
