import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>
        <Link to="/" style={styles.logoText}>CloudJudge Pro</Link>
      </div>
      <div style={styles.links}>
        {user && (
          <>
            <span style={styles.welcome}>Hi, {user.name}</span>
            <span style={styles.role}>{user.role}</span>
            {user.role === 'company' && (
              <Link to="/company/dashboard" style={styles.link}>Dashboard</Link>
            )}
            {user.role === 'candidate' && (
              <Link to="/candidate/dashboard" style={styles.link}>Dashboard</Link>
            )}
            <button onClick={handleLogout} style={styles.logoutBtn}>
              Logout
            </button>
          </>
        )}
        {!user && (
          <>
            <Link to="/login" style={styles.link}>Login</Link>
            <Link to="/register" style={styles.link}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 30px',
    height: '60px',
    backgroundColor: '#1a1a2e',
    color: 'white',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
  },
  logo: { fontSize: '20px', fontWeight: 'bold' },
  logoText: { color: '#4fc3f7', textDecoration: 'none' },
  links: { display: 'flex', alignItems: 'center', gap: '20px' },
  link: { color: 'white', textDecoration: 'none', fontSize: '14px' },
  welcome: { fontSize: '14px', color: '#ccc' },
  role: {
    fontSize: '12px',
    background: '#4fc3f7',
    color: '#1a1a2e',
    padding: '2px 10px',
    borderRadius: '20px',
    fontWeight: 'bold',
    textTransform: 'capitalize'
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #ff6b6b',
    color: '#ff6b6b',
    padding: '6px 16px',
    borderRadius: '6px',
    fontSize: '14px'
  }
};

export default Navbar;