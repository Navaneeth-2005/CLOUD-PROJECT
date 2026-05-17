import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post('/auth/login', form);
      login(res.data.user, res.data.token);
      toast.success('Login successful!');
      if (res.data.user.role === 'company') {
        navigate('/company/dashboard');
      } else {
        navigate('/candidate/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Animated Orb Background */}
      <div style={styles.orb1} />
      <div style={styles.orb2} />
      <div style={styles.orb3} />
      <div style={styles.grid} />

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoSection}>
          <div style={styles.logoIconWrap}>
            <div style={styles.logoIcon}>⚡</div>
            <div style={styles.logoRing} />
          </div>
          <h1 style={styles.logoText}>CodeStorm</h1>
          <p style={styles.subtitle}>Welcome back, champion. Sign in to continue.</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <div style={{
              ...styles.inputWrapper,
              borderColor: focusedField === 'email' ? '#00e5ff' : 'rgba(255,255,255,0.1)',
              boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(0,229,255,0.15)' : 'none'
            }}>
              <span style={styles.inputIcon}>✉</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField('')}
                style={styles.input}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={{
              ...styles.inputWrapper,
              borderColor: focusedField === 'password' ? '#00e5ff' : 'rgba(255,255,255,0.1)',
              boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(0,229,255,0.15)' : 'none'
            }}>
              <span style={styles.inputIcon}>🔒</span>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField('')}
                style={styles.input}
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,229,255,0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,229,255,0.3)';
            }}
          >
            {loading ? (
              <span style={styles.loadingText}>
                <span style={styles.spinner} />
                Authenticating...
              </span>
            ) : '🚀 Sign In'}
          </button>
        </form>

        <p style={styles.bottom}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.linkText}>Create one here →</Link>
        </p>
      </div>

      <style>{`
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(40px,-60px) scale(1.1); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(-50px,40px) scale(0.9); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(0,0); }
          50% { transform: translate(30px,50px); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(50px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ringPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0a1a 0%, #0f172a 40%, #1a0533 100%)',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Outfit', 'Inter', sans-serif"
  },
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    pointerEvents: 'none'
  },
  orb1: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,229,255,0.12) 0%, transparent 70%)',
    top: '-150px',
    left: '-150px',
    animation: 'orbFloat1 10s ease-in-out infinite',
    pointerEvents: 'none'
  },
  orb2: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)',
    bottom: '-100px',
    right: '-100px',
    animation: 'orbFloat2 14s ease-in-out infinite',
    pointerEvents: 'none'
  },
  orb3: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
    top: '50%',
    left: '55%',
    animation: 'orbFloat3 8s ease-in-out infinite',
    pointerEvents: 'none'
  },
  card: {
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(0,229,255,0.15)',
    padding: '50px 44px',
    borderRadius: '28px',
    width: '100%',
    maxWidth: '460px',
    position: 'relative',
    zIndex: 1,
    animation: 'cardIn 0.6s cubic-bezier(0.16,1,0.3,1)',
    boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)'
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  logoIconWrap: {
    position: 'relative',
    display: 'inline-block',
    marginBottom: '16px'
  },
  logoIcon: {
    width: '64px',
    height: '64px',
    background: 'linear-gradient(135deg, #00e5ff, #0077ff)',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    margin: '0 auto',
    boxShadow: '0 8px 30px rgba(0,229,255,0.4)',
    position: 'relative',
    zIndex: 1
  },
  logoRing: {
    position: 'absolute',
    inset: '-6px',
    borderRadius: '26px',
    border: '2px solid rgba(0,229,255,0.4)',
    animation: 'ringPulse 3s ease-in-out infinite'
  },
  logoText: {
    fontSize: '26px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #ffffff, #00e5ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: '0 0 10px',
    letterSpacing: '-0.5px'
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(148,163,184,0.9)',
    margin: 0
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '22px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: '0.5px',
    textTransform: 'uppercase'
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: '14px',
    overflow: 'hidden',
    border: '1.5px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    transition: 'all 0.3s ease'
  },
  inputIcon: {
    padding: '0 14px',
    fontSize: '16px',
    color: '#64748b'
  },
  input: {
    flex: 1,
    padding: '14px 14px 14px 0',
    border: 'none',
    background: 'transparent',
    fontSize: '15px',
    outline: 'none',
    color: '#f1f5f9'
  },
  btn: {
    padding: '15px',
    background: 'linear-gradient(135deg, #00e5ff, #0077ff)',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    fontSize: '16px',
    fontWeight: '700',
    marginTop: '8px',
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
    boxShadow: '0 8px 25px rgba(0,229,255,0.3)',
    cursor: 'pointer',
    letterSpacing: '0.3px'
  },
  loadingText: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.8s linear infinite'
  },
  bottom: {
    textAlign: 'center',
    marginTop: '28px',
    fontSize: '14px',
    color: '#64748b'
  },
  linkText: {
    color: '#00e5ff',
    textDecoration: 'none',
    fontWeight: '700'
  }
};

export default Login;