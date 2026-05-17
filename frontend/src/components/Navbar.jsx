import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      {/* Backdrop blur line */}
      <div style={styles.borderLine} />

      <div style={styles.left}>
        <Link to="/" style={styles.logoLink}>
          <div style={styles.logoIcon}>⚡</div>
          <span style={styles.logoText}>
            Code<span style={styles.logoAccent}>Storm</span>
          </span>
          <span style={styles.logoBadge}>PRO</span>
        </Link>
      </div>

      <div style={styles.right}>
        {user ? (
          <>
            <div style={styles.userInfo}>
              <div style={styles.avatar}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={styles.userName}>{user.name}</p>
                <p style={styles.userRole}>{user.role}</p>
              </div>
            </div>

            <Link
              to={user.role === 'company' ? '/company/dashboard' : '/candidate/dashboard'}
              style={{
                ...styles.navLink,
                background: hovered === 'dash' ? 'rgba(0,229,255,0.1)' : 'transparent',
                color: hovered === 'dash' ? '#00e5ff' : 'rgba(255,255,255,0.8)'
              }}
              onMouseEnter={() => setHovered('dash')}
              onMouseLeave={() => setHovered('')}
            >
              Dashboard
            </Link>

            <button
              onClick={handleLogout}
              style={{
                ...styles.logoutBtn,
                background: hovered === 'logout' ? 'rgba(239,68,68,0.15)' : 'transparent',
                borderColor: hovered === 'logout' ? '#ef4444' : 'rgba(239,68,68,0.5)',
                color: '#ef4444'
              }}
              onMouseEnter={() => setHovered('logout')}
              onMouseLeave={() => setHovered('')}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              style={{
                ...styles.navLink,
                background: hovered === 'login' ? 'rgba(0,229,255,0.1)' : 'transparent',
                color: hovered === 'login' ? '#00e5ff' : 'rgba(255,255,255,0.8)'
              }}
              onMouseEnter={() => setHovered('login')}
              onMouseLeave={() => setHovered('')}
            >
              Login
            </Link>
            <Link
              to="/register"
              style={{
                ...styles.registerBtn,
                background: hovered === 'register'
                  ? 'linear-gradient(135deg, #00c4f0, #0055dd)'
                  : 'linear-gradient(135deg, #00e5ff, #0077ff)',
                transform: hovered === 'register' ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: hovered === 'register'
                  ? '0 8px 20px rgba(0,229,255,0.5)'
                  : '0 4px 12px rgba(0,229,255,0.3)'
              }}
              onMouseEnter={() => setHovered('register')}
              onMouseLeave={() => setHovered('')}
            >
              Register
            </Link>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </nav>
  );
};

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 32px',
    height: '65px',
    background: 'rgba(8, 12, 28, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(0,229,255,0.12)',
    boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
    animation: 'slideDown 0.4s ease-out',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    fontFamily: "'Outfit', 'Inter', sans-serif"
  },
  borderLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.4), transparent)'
  },
  left: { display: 'flex', alignItems: 'center' },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none'
  },
  logoIcon: {
    width: '38px',
    height: '38px',
    background: 'linear-gradient(135deg, #00e5ff, #0077ff)',
    borderRadius: '11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    boxShadow: '0 4px 16px rgba(0,229,255,0.4)'
  },
  logoText: {
    fontSize: '19px',
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: '-0.5px'
  },
  logoAccent: {
    color: '#00e5ff'
  },
  logoBadge: {
    fontSize: '10px',
    fontWeight: '800',
    color: '#00e5ff',
    background: 'rgba(0,229,255,0.1)',
    border: '1px solid rgba(0,229,255,0.3)',
    padding: '2px 6px',
    borderRadius: '6px',
    letterSpacing: '1px'
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 14px 6px 8px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px'
  },
  avatar: {
    width: '34px',
    height: '34px',
    background: 'linear-gradient(135deg, #00e5ff, #0077ff)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '800',
    color: 'white',
    boxShadow: '0 0 12px rgba(0,229,255,0.4)'
  },
  userName: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#f1f5f9',
    margin: 0,
    lineHeight: '1.2'
  },
  userRole: {
    fontSize: '11px',
    color: '#00e5ff',
    margin: 0,
    textTransform: 'capitalize',
    fontWeight: '500'
  },
  navLink: {
    color: 'rgba(255,255,255,0.8)',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    padding: '8px 16px',
    borderRadius: '10px',
    transition: 'all 0.2s ease'
  },
  registerBtn: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '700',
    padding: '8px 22px',
    borderRadius: '10px',
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
    display: 'inline-flex',
    alignItems: 'center'
  },
  logoutBtn: {
    border: '1px solid rgba(239,68,68,0.5)',
    padding: '8px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif"
  }
};

export default Navbar;