import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

const NAV = [
  { to: '/', icon: 'DB', label: 'Dashboard' },
  { to: '/channel', icon: 'YT', label: 'Ma Chaine' },
  { to: '/script', icon: 'AI', label: 'Script IA' },
  { to: '/video', icon: 'VD', label: 'Video' },
  { to: '/publish', icon: 'UP', label: 'Publier' },
  { to: '/settings', icon: 'ST', label: 'Reglages' },
]

export default function Layout({ ctx }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900)
  const location = useLocation()
  const channelReady = !!ctx.config.channelName
  const apiReady = !!ctx.config.claudeKey

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

  const sidebarWidth = collapsed ? 72 : 220
  const sidebarClassName = [
    'sidebar',
    collapsed ? 'is-collapsed' : '',
    mobileOpen ? 'is-open' : '',
  ].filter(Boolean).join(' ')

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
          <div className="sidebar-brand-mark">▶</div>
          <span className="sidebar-brand-text">
            Virax<span style={{ color: 'var(--red)' }}>Studio</span>
          </span>
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
          {[{ label: 'Chaine', ok: channelReady }, { label: 'Claude API', ok: apiReady }].map(status => (
            <div key={status.label} className="sidebar-status-row">
              <div
                className="sidebar-status-dot"
                style={{
                  background: status.ok ? 'var(--green)' : 'var(--muted2)',
                  boxShadow: status.ok ? '0 0 6px var(--green)' : 'none',
                }}
              />
              <span style={{ fontSize: 11, color: status.ok ? 'var(--green)' : 'var(--muted)', whiteSpace: 'nowrap' }}>
                {status.label} {status.ok ? 'OK' : '--'}
              </span>
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
            <div className="sidebar-brand-mark">▶</div>
            <span className="sidebar-brand-text" style={{ display: 'inline' }}>
              Virax<span style={{ color: 'var(--red)' }}>Studio</span>
            </span>
          </div>
          <div
            className="status-chip"
            style={{ background: channelReady ? 'rgba(0,196,140,0.15)' : 'var(--bg3)', color: channelReady ? 'var(--green)' : 'var(--muted)' }}
          >
            {channelReady ? 'Chaine OK' : 'Config'}
          </div>
        </header>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
