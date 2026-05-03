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
      <div style={styles.left}>
        <Link to="/" style={styles.logoText}>
         <span style={styles.logoIcon}>CS</span>
         CodeStorm
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
                background: hovered === 'dash' ? 'rgba(79,195,247,0.15)' : 'transparent'
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
                background: hovered === 'logout' ? '#ff6b6b' : 'transparent',
                color: hovered === 'logout' ? 'white' : '#ff6b6b'
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
                background: hovered === 'login' ? 'rgba(79,195,247,0.15)' : 'transparent'
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
                  ? 'linear-gradient(135deg, #0288d1, #26c6da)'
                  : 'linear-gradient(135deg, #4fc3f7, #0288d1)'
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
    padding: '0 30px',
    height: '65px',
    background: 'linear-gradient(135deg, #0f0c29, #302b63)',
    boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
    animation: 'slideDown 0.4s ease-out',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  left: { display: 'flex', alignItems: 'center' },
  logoText: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: 'white',
    textDecoration: 'none',
    fontSize: '18px',
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white',
    boxShadow: '0 4px 12px rgba(79,195,247,0.4)'
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '12px'
  },
  avatar: {
    width: '34px',
    height: '34px',
    background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white'
  },
  userName: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'white',
    margin: 0
  },
  userRole: {
    fontSize: '11px',
    color: '#4fc3f7',
    margin: 0,
    textTransform: 'capitalize'
  },
  navLink: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '14px',
    padding: '8px 16px',
    borderRadius: '8px',
    transition: 'all 0.2s'
  },
  registerBtn: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '14px',
    padding: '8px 20px',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(79,195,247,0.3)'
  },
  logoutBtn: {
    border: '1px solid #ff6b6b',
    padding: '7px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    cursor: 'pointer'
  }
};

export default Navbar;