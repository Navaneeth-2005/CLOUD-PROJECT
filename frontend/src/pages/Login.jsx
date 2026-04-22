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
      <div style={styles.background}>
        <div style={styles.circle1} />
        <div style={styles.circle2} />
        <div style={styles.circle3} />
      </div>

      <div style={styles.card}>
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>CS</div>
          <h1 style={styles.logoText}>CodeStorm</h1>
          <p style={styles.subtitle}>Welcome back! Please login to continue.</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <div style={{
              ...styles.inputWrapper,
              border: focusedField === 'email'
                ? '2px solid #4fc3f7'
                : '2px solid #e0e0e0'
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
              border: focusedField === 'password'
                ? '2px solid #4fc3f7'
                : '2px solid #e0e0e0'
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
            style={{
              ...styles.btn,
              opacity: loading ? 0.7 : 1,
              transform: loading ? 'scale(0.98)' : 'scale(1)'
            }}
            disabled={loading}
            onMouseEnter={e => e.target.style.background = 'linear-gradient(135deg, #0288d1, #26c6da)'}
            onMouseLeave={e => e.target.style.background = 'linear-gradient(135deg, #4fc3f7, #0288d1)'}
          >
            {loading ? (
              <span style={styles.loadingText}>
                <span style={styles.spinner} />
                Logging in...
              </span>
            ) : 'Login'}
          </button>
        </form>

        <p style={styles.bottom}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.linkText}>Register here</Link>
        </p>
      </div>

      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(180deg); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(-180deg); }
        }
        @keyframes float3 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-40px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    minHeight: 'calc(100vh - 60px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
    position: 'relative',
    overflow: 'hidden'
  },
  background: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0
  },
  circle1: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'rgba(79, 195, 247, 0.08)',
    top: '-100px',
    left: '-100px',
    animation: 'float1 8s ease-in-out infinite'
  },
  circle2: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'rgba(79, 195, 247, 0.06)',
    bottom: '-80px',
    right: '-80px',
    animation: 'float2 10s ease-in-out infinite'
  },
  circle3: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.03)',
    top: '50%',
    left: '60%',
    animation: 'float3 6s ease-in-out infinite'
  },
  card: {
    background: 'rgba(255,255,255,0.97)',
    padding: '50px 40px',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '440px',
    position: 'relative',
    zIndex: 1,
    animation: 'slideUp 0.5s ease-out',
    boxShadow: '0 25px 60px rgba(0,0,0,0.4)'
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '35px'
  },
  logoIcon: {
    width: '60px',
    height: '60px',
    background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: 'bold',
    color: 'white',
    margin: '0 auto 14px',
    boxShadow: '0 8px 20px rgba(79,195,247,0.4)'
  },
  logoText: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 8px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    margin: 0
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#444',
    letterSpacing: '0.3px'
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'border 0.2s, box-shadow 0.2s',
    background: '#f8f9fa'
  },
  inputIcon: {
    padding: '0 12px',
    fontSize: '16px',
    color: '#aaa'
  },
  input: {
    flex: 1,
    padding: '12px 14px 12px 0',
    border: 'none',
    background: 'transparent',
    fontSize: '14px',
    outline: 'none',
    color: '#333'
  },
  btn: {
    padding: '14px',
    background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    marginTop: '10px',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(79,195,247,0.4)',
    cursor: 'pointer'
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
    marginTop: '24px',
    fontSize: '14px',
    color: '#888'
  },
  linkText: {
    color: '#0288d1',
    textDecoration: 'none',
    fontWeight: '600'
  }
};

export default Login;