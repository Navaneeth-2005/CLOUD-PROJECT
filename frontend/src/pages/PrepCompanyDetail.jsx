import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../api/axios';

const PrepCompanyDetail = () => {
  const { companyName } = useParams();
  const navigate = useNavigate();

  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredBack, setHoveredBack] = useState(false);

  useEffect(() => {
    fetchContributions();
  }, [companyName]);

  const fetchContributions = async () => {
    try {
      setLoading(true);
      const decodedName = decodeURIComponent(companyName);
      const res = await API.get(`/prep/company/${encodeURIComponent(decodedName)}`);
      setContributions(res.data);
    } catch (err) {
      toast.error('Failed to load company insights');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div style={s.container}>
      {/* Background accents */}
      <div style={s.glowPurp}></div>
      <div style={s.glowCyan}></div>

      {/* Back Button */}
      <button
        onClick={() => navigate('/prep/dashboard')}
        onMouseEnter={() => setHoveredBack(true)}
        onMouseLeave={() => setHoveredBack(false)}
        style={{
          ...s.backBtn,
          background: hoveredBack ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
          transform: hoveredBack ? 'translateX(-4px)' : 'translateX(0)'
        }}
      >
        ← Back to Prep Hub
      </button>

      {/* Header Info */}
      <header style={s.header}>
        <div style={s.companyMeta}>
          <div style={s.companyIcon}>{decodeURIComponent(companyName).charAt(0)}</div>
          <div>
            <h1 style={s.title}>{decodeURIComponent(companyName)}</h1>
            <p style={s.subtitle}>
              Explore <strong>{contributions.length}</strong> verified preparation strategy {contributions.length === 1 ? 'card' : 'cards'} shared by successful candidates.
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid of Blogs */}
      {loading ? (
        <div style={s.loadingBox}>
          <div style={s.spinner}></div>
          <p style={s.loadingText}>Compiling SDE experiences...</p>
        </div>
      ) : contributions.length === 0 ? (
        <div style={s.emptyState}>
          <span style={s.emptyIcon}>📭</span>
          <h3 style={s.emptyTitle}>No experiences yet</h3>
          <p style={s.emptySubtitle}>Be the trailblazer for {decodeURIComponent(companyName)}!</p>
          <button style={s.emptyBtn} onClick={() => navigate('/prep/dashboard')}>Contribute now</button>
        </div>
      ) : (
        <div style={s.grid}>
          {contributions.map((item, i) => {
            const isHovered = hoveredCard === i;
            // Shorten tips description snippet
            const snippet = item.tips.length > 220 
              ? item.tips.slice(0, 220) + '...' 
              : item.tips;

            // Shorten resources
            const resourcesSnippet = item.resources.length > 100
              ? item.resources.slice(0, 100) + '...'
              : item.resources;

            return (
              <div
                key={item.id}
                onClick={() => navigate(`/prep/read/${item.id}`)}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  ...s.card,
                  transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
                  boxShadow: isHovered ? '0 20px 40px rgba(6,182,212,0.15)' : '0 4px 20px rgba(0,0,0,0.3)',
                  border: isHovered ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(139,92,246,0.15)',
                }}
              >
                {/* Contributor Metadata header */}
                <div style={s.cardUserHeader}>
                  <div style={s.avatar}>{getInitials(item.contributor?.name)}</div>
                  <div>
                    <div style={s.userName}>{item.contributor?.name || 'Anonymous Contributor'}</div>
                    <div style={s.dateText}>Shared on {formatDate(item.createdAt)}</div>
                  </div>
                </div>

                {/* Body Content */}
                <div style={s.cardBody}>
                  <h4 style={s.sectionHeader}>💡 Strategy & Tips</h4>
                  <p style={s.bodyText}>{snippet}</p>

                  <h4 style={s.sectionHeader}>📚 Resources Followed</h4>
                  <p style={s.resourcesText}>{resourcesSnippet}</p>
                </div>

                {/* Footer Action */}
                <div style={{
                  ...s.cardFooter,
                  color: isHovered ? '#06b6d4' : '#a855f7'
                }}>
                  Read full strategy & Ask doubts →
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const s = {
  container: {
    maxWidth: 1280,
    margin: '0 auto',
    padding: '40px 24px 80px 24px',
    minHeight: 'calc(100vh - 66px)',
    fontFamily: "'Outfit', sans-serif",
    color: '#f1f5f9',
    position: 'relative',
  },
  glowPurp: {
    position: 'absolute', top: '-10%', right: '-10%', width: '45%', height: '45%',
    background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)',
    pointerEvents: 'none', zIndex: -1
  },
  glowCyan: {
    position: 'absolute', bottom: '-10%', left: '-10%', width: '45%', height: '45%',
    background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
    pointerEvents: 'none', zIndex: -1
  },
  backBtn: {
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '8px 16px',
    borderRadius: 10,
    fontSize: '13px',
    fontWeight: 600,
    color: '#94a3b8',
    cursor: 'pointer',
    marginBottom: 32,
    transition: 'all 0.25s ease',
    fontFamily: "'Outfit', sans-serif",
  },
  header: {
    marginBottom: 44,
    borderBottom: '1px solid rgba(139,92,246,0.15)',
    paddingBottom: 32,
  },
  companyMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  companyIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: 800,
    color: '#fff',
    boxShadow: '0 8px 24px rgba(124,58,237,0.4)',
  },
  title: {
    fontSize: '34px',
    fontWeight: 800,
    letterSpacing: '-0.8px',
    margin: '0 0 6px 0',
  },
  subtitle: {
    fontSize: '15px',
    color: '#94a3b8',
    margin: 0,
    lineHeight: 1.4,
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 0',
  },
  spinner: {
    width: 44,
    height: 44,
    border: '4px solid rgba(139,92,246,0.1)',
    borderTop: '4px solid #a855f7',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  emptyState: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px dashed rgba(139,92,246,0.2)',
    borderRadius: 20,
    padding: '60px 40px',
    textAlign: 'center',
    maxWidth: 440,
    margin: '40px auto 0 auto',
  },
  emptyIcon: {
    fontSize: '44px',
    display: 'block',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 700,
    margin: '0 0 8px 0',
  },
  emptySubtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '0 0 20px 0',
  },
  emptyBtn: {
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    border: 'none',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: 10,
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: 28,
  },
  card: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 20,
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    display: 'flex',
    flexDirection: 'column',
    backdropFilter: 'blur(12px)',
  },
  cardUserHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: 16,
    marginBottom: 18,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 800,
    color: '#fff',
    boxShadow: '0 4px 12px rgba(6,182,212,0.3)',
  },
  userName: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#fff',
  },
  dateText: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: 2,
  },
  cardBody: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '1px',
    color: '#06b6d4',
    textTransform: 'uppercase',
    margin: 0,
  },
  bodyText: {
    fontSize: '14px',
    color: '#e2e8f0',
    margin: 0,
    lineHeight: 1.6,
  },
  resourcesText: {
    fontSize: '13.5px',
    color: '#94a3b8',
    margin: 0,
    lineHeight: 1.5,
  },
  cardFooter: {
    fontSize: '13px',
    fontWeight: 700,
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: 16,
    transition: 'color 0.2s ease',
  },
};

export default PrepCompanyDetail;
