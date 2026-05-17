import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleMouseMove = (e) => {
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * 12, y: x * -12 });
  };
  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post('/auth/login', form);
      login(res.data.user, res.data.token);
      toast.success('Login successful!');
      navigate(res.data.user.role === 'company' ? '/company/dashboard' : '/candidate/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      {/* Animated background orbs */}
      <div style={s.orb1} />
      <div style={s.orb2} />
      <div style={s.orb3} />
      {/* Grid overlay */}
      <div style={s.grid} />

      {/* 3D Tilt Card */}
      <div
        ref={cardRef}
        style={{
          ...s.card,
          transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(20px)`,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Card inner glow */}
        <div style={s.cardGlow} />

        <div style={s.logoWrap}>
          <div style={s.logoIcon}>
            <span style={{ fontSize: 28 }}>⚡</span>
          </div>
          <h1 style={s.brand}>
            Code<span style={s.brandAccent}>Storm</span>
          </h1>
          <p style={s.tagline}>Welcome back, champion.</p>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          {[
            { key: 'email', label: 'Email Address', type: 'email', icon: '✉️', placeholder: 'you@example.com' },
            { key: 'password', label: 'Password', type: 'password', icon: '🔑', placeholder: '••••••••' },
          ].map(({ key, label, type, icon, placeholder }) => (
            <div key={key} style={s.field}>
              <label style={s.label}>{label}</label>
              <div style={{
                ...s.inputBox,
                borderColor: focusedField === key ? '#7c3aed' : 'rgba(139,92,246,0.25)',
                boxShadow: focusedField === key ? '0 0 0 3px rgba(124,58,237,0.2), inset 0 0 20px rgba(124,58,237,0.05)' : 'none',
              }}>
                <span style={s.inputIcon}>{icon}</span>
                <input
                  type={type}
                  name={key}
                  value={form[key]}
                  onChange={handleChange}
                  onFocus={() => setFocusedField(key)}
                  onBlur={() => setFocusedField('')}
                  style={s.input}
                  placeholder={placeholder}
                  required
                />
              </div>
            </div>
          ))}

          <button
            type="submit"
            style={{ ...s.btn, opacity: loading ? 0.75 : 1 }}
            disabled={loading}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 20px 50px rgba(124,58,237,0.6), 0 0 0 1px rgba(139,92,246,0.8)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(124,58,237,0.4)';
            }}
          >
            {loading
              ? <><span style={s.spinner} /> Authenticating...</>
              : '🚀 Sign In'}
          </button>
        </form>

        <p style={s.footer}>
          No account yet?{' '}
          <Link to="/register" style={s.link}>Create one →</Link>
        </p>
      </div>

      <style>{`
        @keyframes orbFloat1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(50px,-70px) scale(1.1)} }
        @keyframes orbFloat2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-60px,40px) scale(0.9)} }
        @keyframes orbFloat3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,50px)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes cardIn { from{opacity:0;transform:perspective(900px) translateY(60px) scale(0.9)} to{opacity:1;transform:perspective(900px) translateY(0) scale(1)} }
        @keyframes pulseRing { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.4);opacity:0} }
      `}</style>
    </div>
  );
};

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#080810',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Outfit', sans-serif",
  },
  orb1: {
    position: 'absolute', width: 600, height: 600, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
    top: -200, left: -150, animation: 'orbFloat1 12s ease-in-out infinite', pointerEvents: 'none',
  },
  orb2: {
    position: 'absolute', width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%)',
    bottom: -150, right: -100, animation: 'orbFloat2 16s ease-in-out infinite', pointerEvents: 'none',
  },
  orb3: {
    position: 'absolute', width: 300, height: 300, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
    top: '50%', left: '60%', animation: 'orbFloat3 9s ease-in-out infinite', pointerEvents: 'none',
  },
  grid: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    backgroundImage: 'linear-gradient(rgba(139,92,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.04) 1px,transparent 1px)',
    backgroundSize: '44px 44px',
  },
  card: {
    position: 'relative', zIndex: 10,
    width: '100%', maxWidth: 460,
    background: 'rgba(15,15,28,0.85)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(139,92,246,0.35)',
    borderRadius: 28,
    padding: '52px 44px',
    boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.2)',
    animation: 'cardIn 0.7s cubic-bezier(0.16,1,0.3,1)',
    transition: 'transform 0.15s ease, box-shadow 0.3s ease',
    transformStyle: 'preserve-3d',
  },
  cardGlow: {
    position: 'absolute', inset: -1, borderRadius: 28, pointerEvents: 'none',
    background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.08))',
    zIndex: -1,
  },
  logoWrap: { textAlign: 'center', marginBottom: 40 },
  logoIcon: {
    width: 68, height: 68,
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
    boxShadow: '0 0 40px rgba(124,58,237,0.5), 0 8px 24px rgba(0,0,0,0.4)',
    transformStyle: 'preserve-3d', transform: 'translateZ(20px)',
  },
  brand: {
    fontSize: 28, fontWeight: 800, color: '#fff',
    letterSpacing: '-0.5px', margin: '0 0 8px',
  },
  brandAccent: {
    background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  },
  tagline: { fontSize: 14, color: '#94a3b8', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: {
    fontSize: 11, fontWeight: 700, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '1px',
  },
  inputBox: {
    display: 'flex', alignItems: 'center',
    background: 'rgba(255,255,255,0.04)',
    border: '1.5px solid rgba(139,92,246,0.25)',
    borderRadius: 14, overflow: 'hidden',
    transition: 'all 0.25s ease',
  },
  inputIcon: { padding: '0 14px', fontSize: 16 },
  input: {
    flex: 1, padding: '14px 14px 14px 0',
    border: 'none', background: 'transparent',
    fontSize: 15, outline: 'none', color: '#fff',
  },
  btn: {
    marginTop: 8, padding: '16px',
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    color: '#fff', border: 'none', borderRadius: 14,
    fontSize: 16, fontWeight: 700,
    boxShadow: '0 8px 30px rgba(124,58,237,0.4)',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: '0.3px',
  },
  spinner: {
    width: 16, height: 16,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #fff',
    borderRadius: '50%', display: 'inline-block',
    animation: 'spin 0.8s linear infinite',
  },
  footer: { textAlign: 'center', marginTop: 28, fontSize: 14, color: '#64748b' },
  link: { color: '#a855f7', textDecoration: 'none', fontWeight: 700 },
};

export default Login;