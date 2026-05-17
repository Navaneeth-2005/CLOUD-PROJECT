import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../api/axios';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'candidate' });
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleMouseMove = (e) => {
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * 10, y: x * -10 });
  };
  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/auth/register', form);
      toast.success('Registered! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputBox = (field) => ({
    ...s.inputBox,
    borderColor: focusedField === field ? '#7c3aed' : 'rgba(139,92,246,0.25)',
    boxShadow: focusedField === field ? '0 0 0 3px rgba(124,58,237,0.2)' : 'none',
  });

  return (
    <div style={s.page}>
      <div style={s.orb1} />
      <div style={s.orb2} />
      <div style={s.grid} />

      <div
        ref={cardRef}
        style={{
          ...s.card,
          transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(16px)`,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div style={s.header}>
          <div style={s.logoIcon}>⚡</div>
          <h1 style={s.title}>Create Account</h1>
          <p style={s.subtitle}>Join the CodeStorm arena</p>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          {[
            { key: 'name',     type: 'text',     icon: '👤', label: 'Full Name',      placeholder: 'Your full name' },
            { key: 'email',    type: 'email',    icon: '✉️',  label: 'Email Address',  placeholder: 'you@example.com' },
            { key: 'password', type: 'password', icon: '🔑', label: 'Password',        placeholder: '••••••••' },
          ].map(({ key, type, icon, label, placeholder }) => (
            <div key={key} style={s.field}>
              <label style={s.label}>{label}</label>
              <div style={inputBox(key)}>
                <span style={s.inputIcon}>{icon}</span>
                <input
                  type={type} name={key} value={form[key]}
                  onChange={handleChange}
                  onFocus={() => setFocusedField(key)}
                  onBlur={() => setFocusedField('')}
                  style={s.input} placeholder={placeholder} required
                />
              </div>
            </div>
          ))}

          {/* Role selector */}
          <div style={s.field}>
            <label style={s.label}>Register As</label>
            <div style={s.roleRow}>
              {[
                { id: 'candidate', icon: '👨‍💻', label: 'Candidate' },
                { id: 'company',   icon: '🏢',   label: 'Company' },
              ].map(({ id, icon, label }) => (
                <div
                  key={id}
                  onClick={() => setForm({ ...form, role: id })}
                  style={{
                    ...s.roleCard,
                    borderColor: form.role === id ? '#7c3aed' : 'rgba(139,92,246,0.2)',
                    background: form.role === id
                      ? 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.1))'
                      : 'rgba(255,255,255,0.03)',
                    boxShadow: form.role === id ? '0 0 20px rgba(124,58,237,0.3)' : 'none',
                    transform: form.role === id ? 'scale(1.04)' : 'scale(1)',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{icon}</span>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: form.role === id ? '#a855f7' : '#64748b',
                  }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            style={{ ...s.btn, opacity: loading ? 0.75 : 1 }}
            disabled={loading}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 20px 50px rgba(124,58,237,0.6)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(124,58,237,0.4)';
            }}
          >
            {loading ? <><span style={s.spinner} /> Creating...</> : '✨ Create Account'}
          </button>
        </form>

        <p style={s.footer}>
          Already have an account?{' '}
          <Link to="/login" style={s.link}>Sign in →</Link>
        </p>
      </div>

      <style>{`
        @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,-60px) scale(1.1)} }
        @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-50px,40px) scale(0.9)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes cardIn { from{opacity:0;transform:perspective(900px) translateY(50px) scale(0.94)} to{opacity:1;transform:perspective(900px) translateY(0) scale(1)} }
      `}</style>
    </div>
  );
};

const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#080810', position: 'relative', overflow: 'hidden',
    fontFamily: "'Outfit', sans-serif",
  },
  orb1: {
    position: 'absolute', width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
    top: -150, right: -100, animation: 'orb1 12s ease-in-out infinite', pointerEvents: 'none',
  },
  orb2: {
    position: 'absolute', width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%)',
    bottom: -120, left: -80, animation: 'orb2 16s ease-in-out infinite', pointerEvents: 'none',
  },
  grid: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    backgroundImage: 'linear-gradient(rgba(139,92,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.04) 1px,transparent 1px)',
    backgroundSize: '44px 44px',
  },
  card: {
    position: 'relative', zIndex: 10,
    width: '100%', maxWidth: 460,
    background: 'rgba(14,14,26,0.88)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(139,92,246,0.35)',
    borderRadius: 28, padding: '48px 44px',
    boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.15)',
    animation: 'cardIn 0.7s cubic-bezier(0.16,1,0.3,1)',
    transition: 'transform 0.15s ease, box-shadow 0.3s ease',
    transformStyle: 'preserve-3d',
  },
  header: { textAlign: 'center', marginBottom: 36 },
  logoIcon: {
    width: 64, height: 64,
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, margin: '0 auto 14px',
    boxShadow: '0 0 40px rgba(124,58,237,0.5)',
  },
  title: {
    fontSize: 26, fontWeight: 800, margin: '0 0 8px',
    background: 'linear-gradient(135deg, #fff, #a855f7)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  },
  subtitle: { fontSize: 14, color: '#64748b', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' },
  inputBox: {
    display: 'flex', alignItems: 'center',
    background: 'rgba(255,255,255,0.04)',
    border: '1.5px solid rgba(139,92,246,0.25)',
    borderRadius: 13, overflow: 'hidden', transition: 'all 0.25s ease',
  },
  inputIcon: { padding: '0 13px', fontSize: 16 },
  input: {
    flex: 1, padding: '13px 14px 13px 0',
    border: 'none', background: 'transparent',
    fontSize: 15, outline: 'none', color: '#fff',
  },
  roleRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  roleCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '18px 12px', borderRadius: 14,
    cursor: 'pointer', border: '1.5px solid rgba(139,92,246,0.2)',
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', gap: 8,
  },
  btn: {
    marginTop: 6, padding: '15px',
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    color: '#fff', border: 'none', borderRadius: 14,
    fontSize: 16, fontWeight: 700,
    boxShadow: '0 8px 30px rgba(124,58,237,0.4)', cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    fontFamily: "'Outfit', sans-serif", letterSpacing: '0.3px',
  },
  spinner: {
    width: 16, height: 16,
    border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff',
    borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite',
  },
  footer: { textAlign: 'center', marginTop: 26, fontSize: 14, color: '#64748b' },
  link: { color: '#a855f7', textDecoration: 'none', fontWeight: 700 },
};

export default Register;