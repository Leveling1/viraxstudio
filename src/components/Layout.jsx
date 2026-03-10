import { Outlet, NavLink } from 'react-router-dom'
import { useState } from 'react'

const NAV = [
  { to: '/',         icon: '⚡', label: 'Dashboard' },
  { to: '/channel',  icon: '??', label: 'Ma Chaine' },
  { to: '/script',   icon: '✍', label: 'Script IA' },
  { to: '/video',    icon: '??', label: 'Video' },
  { to: '/publish',  icon: '??', label: 'Publier' },
  { to: '/settings', icon: '⚙', label: 'Reglages' },
]

export default function Layout({ ctx }) {
  const [collapsed, setCollapsed] = useState(false)
  const channelReady = !!ctx.config.channelName
  const apiReady = !!ctx.config.claudeKey
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <aside style={{ width: collapsed ? 64 : 220, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', transition: 'width .25s ease', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100, overflow: 'hidden' }}>
        <div style={{ padding: collapsed ? '20px 0' : '20px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, justifyContent: collapsed ? 'center' : 'flex-start', minHeight: 64 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'linear-gradient(135deg, var(--red), var(--orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, animation: 'glow 3s ease infinite' }}>▶</div>
          {!collapsed && <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.5, whiteSpace: 'nowrap' }}>Virax<span style={{ color: 'var(--red)' }}>Studio</span></span>}
        </div>
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '10px 0' : '10px 12px', justifyContent: collapsed ? 'center' : 'flex-start', borderRadius: 10, background: isActive ? 'rgba(255,59,59,0.12)' : 'transparent', color: isActive ? 'var(--red)' : 'var(--muted)', textDecoration: 'none', fontSize: 14, fontWeight: isActive ? 700 : 400, borderLeft: isActive ? '2px solid var(--red)' : '2px solid transparent', transition: 'all .15s' })}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        {!collapsed && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            {[{ label: 'Chaine', ok: channelReady }, { label: 'Claude API', ok: apiReady }].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.ok ? 'var(--green)' : 'var(--muted2)', boxShadow: s.ok ? '0 0 6px var(--green)' : 'none' }} />
                <span style={{ fontSize: 11, color: s.ok ? 'var(--green)' : 'var(--muted)', whiteSpace: 'nowrap' }}>{s.label} {s.ok ? '✓' : '—'}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setCollapsed(c => !c)} style={{ background: 'none', border: 'none', color: 'var(--muted)', padding: '12px', fontSize: 18, cursor: 'pointer', borderTop: '1px solid var(--border)' }}>
          {collapsed ? '›' : '‹'}
        </button>
      </aside>
      <main style={{ marginLeft: collapsed ? 64 : 220, flex: 1, transition: 'margin-left .25s ease', minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  )
}
