import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CompanyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', startTime: '', endTime: ''
  });

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    try {
      const res = await API.get('/contests/all');
      setContests(res.data.contests);
    } catch (err) {
      toast.error('Failed to fetch contests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post('/contests/create', form);
      toast.success('Contest created successfully!');
      setShowModal(false);
      setForm({ title: '', description: '', startTime: '', endTime: '' });
      fetchContests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create contest');
    }
  };

  const getStatus = (contest) => {
    const now = new Date();
    const start = new Date(contest.startTime);
    const end = new Date(contest.endTime);
    if (now < start) return { label: 'Upcoming', color: '#f59e0b', bg: '#fef3c7' };
    if (now > end) return { label: 'Ended', color: '#ef4444', bg: '#fee2e2' };
    return { label: 'Live', color: '#10b981', bg: '#d1fae5' };
  };

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.headerTitle}>Welcome back, {user?.name}!</h1>
            <p style={styles.headerSub}>Manage your coding assessments and track candidates</p>
          </div>
          <button
            style={styles.createBtn}
            onClick={() => setShowModal(true)}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            + Create Contest
          </button>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          {[
            { label: 'Total Contests', value: contests.length, icon: '🏆' },
            { label: 'Live Now', value: contests.filter(c => getStatus(c).label === 'Live').length, icon: '🟢' },
            { label: 'Upcoming', value: contests.filter(c => getStatus(c).label === 'Upcoming').length, icon: '📅' },
            { label: 'Ended', value: contests.filter(c => getStatus(c).label === 'Ended').length, icon: '✅' }
          ].map((stat, i) => (
            <div key={i} style={styles.statCard}>
              <span style={styles.statIcon}>{stat.icon}</span>
              <div>
                <p style={styles.statValue}>{stat.value}</p>
                <p style={styles.statLabel}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contests Grid */}
      <div style={styles.content}>
        <h2 style={styles.sectionTitle}>Your Contests</h2>

        {loading ? (
          <div style={styles.loadingGrid}>
            {[1, 2, 3].map(i => (
              <div key={i} style={styles.skeletonCard}>
                <div style={styles.skeletonTitle} />
                <div style={styles.skeletonText} />
                <div style={styles.skeletonText} />
              </div>
            ))}
          </div>
        ) : contests.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🏆</div>
            <h3 style={styles.emptyTitle}>No contests yet</h3>
            <p style={styles.emptySub}>Create your first contest to get started</p>
            <button
              style={styles.createBtn}
              onClick={() => setShowModal(true)}
            >
              + Create Contest
            </button>
          </div>
        ) : (
          <div style={styles.grid}>
            {contests.map((contest, i) => {
              const status = getStatus(contest);
              return (
                <div
                  key={contest.id}
                  style={{
                    ...styles.card,
                    transform: hoveredCard === contest.id ? 'translateY(-6px)' : 'translateY(0)',
                    boxShadow: hoveredCard === contest.id
                      ? '0 20px 40px rgba(0,0,0,0.12)'
                      : '0 4px 16px rgba(0,0,0,0.06)',
                    animation: `fadeIn 0.4s ease-out ${i * 0.1}s both`
                  }}
                  onMouseEnter={() => setHoveredCard(contest.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div style={styles.cardTop}>
                    <span style={{
                      ...styles.statusBadge,
                      color: status.color,
                      background: status.bg
                    }}>
                      {status.label === 'Live' && '● '}{status.label}
                    </span>
                    <span style={styles.questionCount}>
                      {contest.questions?.length || 0} questions
                    </span>
                  </div>

                  <h3 style={styles.cardTitle}>{contest.title}</h3>
                  <p style={styles.cardDesc}>
                    {contest.description || 'No description provided'}
                  </p>

                  <div style={styles.cardDates}>
                    <div style={styles.dateItem}>
                      <span style={styles.dateLabel}>Start</span>
                      <span style={styles.dateValue}>
                        {new Date(contest.startTime).toLocaleDateString('en-US', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div style={styles.dateDivider} />
                    <div style={styles.dateItem}>
                      <span style={styles.dateLabel}>End</span>
                      <span style={styles.dateValue}>
                        {new Date(contest.endTime).toLocaleDateString('en-US', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  <div style={styles.cardActions}>
                    <button
                      style={styles.actionBtn}
                      onClick={() => navigate(`/leaderboard/${contest.id}`)}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      Leaderboard
                    </button>
                    <button
                      style={styles.actionBtnPrimary}
                      onClick={() => navigate(`/company/contest/${contest.id}`)}
                      onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, #0288d1, #26c6da)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, #4fc3f7, #0288d1)'}
                    >
                      Manage
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Contest Modal */}
      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Create New Contest</h2>
              <button
                style={styles.closeBtn}
                onClick={() => setShowModal(false)}
                onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                onMouseLeave={e => e.currentTarget.style.background = '#f5f5f5'}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} style={styles.modalForm}>
              <div style={styles.field}>
                <label style={styles.label}>Contest Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  style={styles.input}
                  placeholder="e.g. CodeStorm Round 1"
                  required
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ ...styles.input, height: '80px', resize: 'none' }}
                  placeholder="Describe the contest..."
                />
              </div>

              <div style={styles.dateRow}>
                <div style={styles.field}>
                  <label style={styles.label}>Start Time</label>
                  <input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={e => setForm({ ...form, startTime: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>End Time</label>
                  <input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={e => setForm({ ...form, endTime: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  Create Contest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: {
    minHeight: 'calc(100vh - 65px)',
    background: '#f0f4f8'
  },
  header: {
    background: 'linear-gradient(135deg, #0f0c29, #302b63)',
    padding: '40px 40px 30px',
    color: 'white'
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    maxWidth: '1200px',
    margin: '0 auto 30px'
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 6px'
  },
  headerSub: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    margin: 0
  },
  createBtn: {
    background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 15px rgba(79,195,247,0.4)'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  statCard: {
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    border: '1px solid rgba(255,255,255,0.15)'
  },
  statIcon: { fontSize: '28px' },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'white',
    margin: 0
  },
  statLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.7)',
    margin: 0
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: '24px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '24px'
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '24px',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    border: '1px solid #f0f0f0'
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  statusBadge: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 12px',
    borderRadius: '20px'
  },
  questionCount: {
    fontSize: '12px',
    color: '#888',
    background: '#f5f5f5',
    padding: '4px 10px',
    borderRadius: '20px'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 8px'
  },
  cardDesc: {
    fontSize: '13px',
    color: '#888',
    margin: '0 0 20px',
    lineHeight: '1.5'
  },
  cardDates: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    background: '#f8f9fa',
    borderRadius: '12px',
    marginBottom: '20px'
  },
  dateItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1
  },
  dateLabel: {
    fontSize: '11px',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  dateValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#333'
  },
  dateDivider: {
    width: '1px',
    height: '30px',
    background: '#e0e0e0'
  },
  cardActions: {
    display: 'flex',
    gap: '10px'
  },
  actionBtn: {
    flex: 1,
    padding: '10px',
    background: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#333'
  },
  actionBtnPrimary: {
    flex: 1,
    padding: '10px',
    background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    color: 'white'
  },
  loadingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '24px'
  },
  skeletonCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '24px',
    animation: 'pulse 1.5s ease-in-out infinite'
  },
  skeletonTitle: {
    height: '20px',
    background: '#e0e0e0',
    borderRadius: '8px',
    marginBottom: '12px',
    width: '60%'
  },
  skeletonText: {
    height: '14px',
    background: '#e0e0e0',
    borderRadius: '8px',
    marginBottom: '8px',
    width: '80%'
  },
  empty: {
    textAlign: 'center',
    padding: '80px 20px',
    background: 'white',
    borderRadius: '20px'
  },
  emptyIcon: { fontSize: '60px', marginBottom: '16px' },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 8px'
  },
  emptySub: {
    fontSize: '14px',
    color: '#888',
    margin: '0 0 24px'
  },
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)'
  },
  modal: {
    background: 'white',
    borderRadius: '24px',
    padding: '36px',
    width: '100%',
    maxWidth: '560px',
    animation: 'modalIn 0.3s ease-out',
    boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: 0
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    border: 'none',
    background: '#f5f5f5',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  modalForm: {
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
    color: '#444'
  },
  input: {
    padding: '12px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border 0.2s',
    color: '#333'
  },
  dateRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px'
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    background: '#f5f5f5',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    color: '#666'
  },
  submitBtn: {
    flex: 1,
    padding: '12px',
    background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    color: 'white',
    boxShadow: '0 4px 15px rgba(79,195,247,0.4)'
  }
};

export default CompanyDashboard;