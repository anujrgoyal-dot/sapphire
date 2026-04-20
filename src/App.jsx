import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import NewOrderPage from './pages/NewOrderPage'
import OrdersPage from './pages/OrdersPage'
import AdminPage from './pages/AdminPage'

function AppShell() {
  const { user, profile, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white' }}></div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Loading Sapphire...</div>
      </div>
    )
  }

  if (!user || !profile) return <LoginPage />

  const isAdmin = profile.role === 'admin'

  return (
    <div className="app-shell">
      {/* Top Bar */}
      <div className="topbar">
        <div className="topbar-logo">
          <span style={{ color: 'var(--accent-light)' }}>◆</span> Sapphire Sales Corporation Pvt Ltd
          <span>{profile.name} · {profile.role}</span>
        </div>
        <div className="topbar-actions">
          <button
            onClick={signOut}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/orders" replace />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/new-order" element={<NewOrderPage />} />
          <Route path="/edit-order/:orderId" element={<NewOrderPage />} />
          {isAdmin && <Route path="/admin" element={<AdminPage />} />}
          <Route path="*" element={<Navigate to="/orders" replace />} />
        </Routes>
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <NavLink to="/orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Orders
        </NavLink>
        <NavLink to="/new-order" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          New Order
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Admin
          </NavLink>
        )}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  )
}
