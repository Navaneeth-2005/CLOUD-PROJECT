import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState('');

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav style={s.nav}>
      <div style={s.navInner}>
        <Link to="/" style={s.logoLink}>
          <div style={s.logoBox}>
            <span style={{ fontSize: 18 }}>⚡</span>
          </div>
          <span style={s.logoText}>
            Code<span style={s.logoAccent}>Storm</span>
          </span>
          <span style={s.badge}>PRO</span>
        </Link>

        {/* Center: Navigation Links */}
        <div style={s.center}>
          {user && (
            <>
              <Link
                to={user.role === 'company' ? '/company/dashboard' : '/candidate/dashboard'}
                style={{
                  ...s.navLink,
                  background: hovered === 'dash' ? 'rgba(124,58,237,0.15)' : 'transparent',
                  color: hovered === 'dash' ? '#a855f7' : '#94a3b8',
                }}
                onMouseEnter={() => setHovered('dash')}
                onMouseLeave={() => setHovered('')}
              >Attend Contest</Link>

              <Link
                to="/prep/dashboard"
                style={{
                  ...s.navLink,
                  background: hovered === 'prep' ? 'rgba(6,182,212,0.15)' : 'transparent',
                  color: hovered === 'prep' ? '#06b6d4' : '#94a3b8',
                }}
                onMouseEnter={() => setHovered('prep')}
                onMouseLeave={() => setHovered('')}
              >Interview Prep</Link>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div style={s.right}>
          {user ? (
            <>
              <div style={s.userChip}>
                <div style={s.avatar}>{user.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div style={s.userName}>{user.name}</div>
                  <div style={s.userRole}>{user.role}</div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                style={{
                  ...s.logoutBtn,
                  background: hovered === 'logout' ? 'rgba(239,68,68,0.12)' : 'transparent',
                }}
                onMouseEnter={() => setHovered('logout')}
                onMouseLeave={() => setHovered('')}
              >↩ Logout</button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  ...s.navLink,
                  background: hovered === 'login' ? 'rgba(124,58,237,0.15)' : 'transparent',
                  color: hovered === 'login' ? '#a855f7' : '#94a3b8',
                }}
                onMouseEnter={() => setHovered('login')}
                onMouseLeave={() => setHovered('')}
              >Login</Link>

              <Link
                to="/register"
                style={{
                  ...s.registerBtn,
                  transform: hovered === 'reg' ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: hovered === 'reg' ? '0 10px 30px rgba(124,58,237,0.6)' : '0 4px 16px rgba(124,58,237,0.35)',
                }}
                onMouseEnter={() => setHovered('reg')}
                onMouseLeave={() => setHovered('')}
              >Register →</Link>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes navSlide { from{opacity:0;transform:translateY(-100%)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </nav>
  );
};

const s = {
  nav: {
    position: 'sticky', top: 0, zIndex: 200,
    background: 'rgba(8,8,16,0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(139,92,246,0.2)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    animation: 'navSlide 0.4s ease-out',
    fontFamily: "'Outfit', sans-serif",
  },
  navInner: {
    maxWidth: 1280, margin: '0 auto',
    padding: '0 32px', height: 66,
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    gap: 16,
  },
  logoLink: {
    display: 'flex', alignItems: 'center',
    gap: 10, textDecoration: 'none',
  },
  logoBox: {
    width: 38, height: 38, borderRadius: 11,
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 20px rgba(124,58,237,0.5)',
    flexShrink: 0,
  },
  logoText: {
    fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px',
  },
  logoAccent: {
    background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  },
  badge: {
    fontSize: 10, fontWeight: 800, color: '#a855f7',
    background: 'rgba(124,58,237,0.15)',
    border: '1px solid rgba(124,58,237,0.4)',
    padding: '2px 7px', borderRadius: 6, letterSpacing: '1.5px',
  },
  right: { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' },
  center: { display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' },
  userChip: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '6px 14px 6px 8px',
    background: 'rgba(139,92,246,0.08)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 12,
  },
  avatar: {
    width: 34, height: 34, borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 800, color: '#fff',
    boxShadow: '0 0 14px rgba(124,58,237,0.5)',
  },
  userName: { fontSize: 13, fontWeight: 700, color: '#f1f5f9', lineHeight: '1.2' },
  userRole: {
    fontSize: 10, color: '#a855f7', textTransform: 'capitalize',
    fontWeight: 600, letterSpacing: '0.5px',
  },
  navLink: {
    color: '#94a3b8', textDecoration: 'none',
    fontSize: 14, fontWeight: 600,
    padding: '8px 16px', borderRadius: 10,
    transition: 'all 0.2s ease',
  },
  registerBtn: {
    color: '#fff', textDecoration: 'none',
    fontSize: 14, fontWeight: 700,
    padding: '9px 22px', borderRadius: 10,
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
    display: 'inline-block',
  },
  logoutBtn: {
    border: '1px solid rgba(239,68,68,0.4)',
    padding: '8px 16px', borderRadius: 10,
    fontSize: 13, fontWeight: 600,
    color: '#ef4444', cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: "'Outfit', sans-serif",
  },
};

export default Navbar;