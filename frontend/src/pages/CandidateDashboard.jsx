import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CandidateDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('contests');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [registeredContests, setRegisteredContests] = useState([]);
  const [registeringId, setRegisteringId] = useState(null);
  const [submittedContests, setSubmittedContests] = useState([]);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedContest, setSelectedContest] = useState(null);
  const [regForm, setRegForm] = useState({
    phone: '',
    college: '',
    experience: ''
  });

  useEffect(() => {
    fetchAll();
  }, []);

  // Format date in IST
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const fetchAll = async () => {
    try {
      const [contestRes, submissionRes, perfRes] = await Promise.all([
        API.get('/contests/all'),
        API.get('/submissions/my-submissions'),
        API.get('/analytics/my-performance')
      ]);
      setContests(contestRes.data.contests);
      setSubmissions(submissionRes.data.submissions);
      setPerformance(perfRes.data.summary);
      await checkRegistrations(contestRes.data.contests);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const checkRegistrations = async (contests) => {
    try {
      const results = await Promise.all(
        contests.map(c => API.get(`/registration/check/${c.id}`))
      );
      const registeredIds = contests
        .filter((_, i) => results[i].data.isRegistered)
        .map(c => c.id);
      setRegisteredContests(registeredIds);

      const submittedIds = contests
        .filter((_, i) => results[i].data.submittedAt)
        .map(c => c.id);
      setSubmittedContests(submittedIds);
    } catch (err) {
      console.error('Failed to check registrations');
    }
  };

  const handleRegister = (contest) => {
    setSelectedContest(contest);
    setRegForm({ phone: '', college: '', experience: '' });
    setShowRegisterModal(true);
  };

  const confirmRegister = async () => {
    if (!regForm.phone || !regForm.college) {
      toast.error('Please fill in all required fields!');
      return;
    }
    try {
      setRegisteringId(selectedContest.id);
      await API.post('/registration/register', {
        contestId: selectedContest.id,
        phone: regForm.phone,
        college: regForm.college,
        experience: regForm.experience
      });
      toast.success('Registered! Check your email for contest details 📧');
      setRegisteredContests([...registeredContests, selectedContest.id]);
      setShowRegisterModal(false);
      setRegForm({ phone: '', college: '', experience: '' });

      // Only navigate into contest if it's live
      const now = new Date();
      const startTime = new Date(selectedContest.startTime);
      if (now >= startTime && selectedContest.questions?.length > 0) {
        navigate(`/contest/${selectedContest.id}/question/${selectedContest.questions[0].id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setRegisteringId(null);
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

  const getSubmissionColor = (status) => {
    switch (status) {
      case 'accepted': return { color: '#10b981', bg: '#d1fae5' };
      case 'rejected': return { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
      case 'pending': return { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
      case 'running': return { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' };
      default: return { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
    }
  };

  const getButtonConfig = (status, isRegistered, isSubmitted) => {
    const isEnded = status.label === 'Ended';
    const isLive = status.label === 'Live';
    const isUpcoming = status.label === 'Upcoming';

    if (isSubmitted) {
      return { label: '✓ Submitted', bg: 'linear-gradient(135deg, #6b7280, #4b5563)', opacity: 0.7, cursor: 'not-allowed' };
    }
    if (isEnded) {
      return { label: '🏁 Ended', bg: 'rgba(100,116,139,0.3)', opacity: 0.5, cursor: 'not-allowed' };
    }
    if (!isRegistered) {
      return { label: '📋 Register', bg: 'linear-gradient(135deg, #00e5ff, #0077ff)', opacity: 1, cursor: 'pointer' };
    }
    if (isUpcoming) {
      return { label: '⏰ Registered', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', opacity: 1, cursor: 'pointer' };
    }
    if (isLive) {
      return { label: '▶ Enter Contest', bg: 'linear-gradient(135deg, #10b981, #059669)', opacity: 1, cursor: 'pointer' };
    }
    return { label: status.label, bg: 'rgba(100,116,139,0.3)', opacity: 0.5, cursor: 'not-allowed' };
  };

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes cardHover {
          from { transform: translateY(0); }
          to { transform: translateY(-6px); }
        }
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.headerLeft}>
            <div style={styles.avatarLarge}>
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={styles.headerTitle}>
                Hey, {user?.name.split(' ')[0]}! 👋
              </h1>
              <p style={styles.headerSub}>
                Ready to crack some code today?
              </p>
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        {performance && (
          <div style={styles.statsRow}>
            {[
              { label: 'Total Submissions', value: performance.totalSubmissions, icon: '📤', color: '#4fc3f7' },
              { label: 'Accepted', value: performance.accepted, icon: '✅', color: '#10b981' },
              { label: 'Rejected', value: performance.rejected, icon: '❌', color: '#ef4444' },
              { label: 'Acceptance Rate', value: performance.acceptanceRate, icon: '📊', color: '#f59e0b' },
              { label: 'Total Score', value: performance.totalScore, icon: '⭐', color: '#a78bfa' }
            ].map((stat, i) => (
              <div key={i} style={styles.statCard}>
                <div style={{
                  ...styles.statIconBox,
                  background: `${stat.color}22`
                }}>
                  <span style={styles.statIcon}>{stat.icon}</span>
                </div>
                <div>
                  <p style={{ ...styles.statValue, color: stat.color }}>{stat.value}</p>
                  <p style={styles.statLabel}>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={styles.content}>
        <div style={styles.tabs}>
          {['contests', 'submissions'].map(tab => (
            <button
              key={tab}
              style={{
                ...styles.tab,
                background: activeTab === tab
                  ? 'linear-gradient(135deg, #7c3aed, #06b6d4)'
                  : 'transparent',
                color: activeTab === tab ? '#ffffff' : '#94a3b8',
                boxShadow: activeTab === tab
                  ? '0 4px 20px rgba(124,58,237,0.5)'
                  : 'none',
                border: activeTab === tab ? 'none' : '1px solid rgba(139,92,246,0.2)'
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'contests' ? '🏆 Contests' : '📤 My Submissions'}
            </button>
          ))}
        </div>

        {/* Contests Tab */}
        {activeTab === 'contests' && (
          <div style={styles.tabContent}>
            {loading ? (
              <div style={styles.grid}>
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
                <h3 style={styles.emptyTitle}>No contests available</h3>
                <p style={styles.emptySub}>Check back later for new contests</p>
              </div>
            ) : (
              <div style={styles.grid}>
                {contests.map((contest, i) => {
                  const status = getStatus(contest);
                  const isLive = status.label === 'Live';
                  const isEnded = status.label === 'Ended';
                  const isRegistered = registeredContests.includes(contest.id);
                  const isSubmitted = submittedContests.includes(contest.id);
                  const btnConfig = getButtonConfig(status, isRegistered, isSubmitted);

                  return (
                    <div
                      key={contest.id}
                      style={{
                        ...styles.card,
                        transform: hoveredCard === contest.id
                          ? 'perspective(800px) translateY(-10px) rotateX(2deg) scale(1.02)'
                          : 'perspective(800px) translateY(0) rotateX(0deg) scale(1)',
                        boxShadow: hoveredCard === contest.id
                          ? '0 30px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.6), 0 0 40px rgba(124,58,237,0.2)'
                          : '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(139,92,246,0.2)',
                        animation: `staggerIn 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s both`
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
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {isRegistered && !isSubmitted && (
                            <span style={styles.registeredBadge}>✓ Registered</span>
                          )}
                          {isSubmitted && (
                            <span style={{ ...styles.registeredBadge, background: '#e5e7eb', color: '#6b7280' }}>✓ Submitted</span>
                          )}
                          <span style={styles.questionCount}>
                            {contest.questions?.length || 0} questions
                          </span>
                        </div>
                      </div>

                      <h3 style={styles.cardTitle}>{contest.title}</h3>
                      <p style={styles.cardDesc}>
                        {contest.description || 'No description provided'}
                      </p>

                      <div style={styles.cardDates}>
                        <div style={styles.dateItem}>
                          <span style={styles.dateLabel}>Start</span>
                          <span style={styles.dateValue}>
                            {formatDate(contest.startTime)}
                          </span>
                        </div>
                        <div style={styles.dateDivider} />
                        <div style={styles.dateItem}>
                          <span style={styles.dateLabel}>End</span>
                          <span style={styles.dateValue}>
                            {formatDate(contest.endTime)}
                          </span>
                        </div>
                      </div>

                      <div style={styles.cardActions}>
                        <button
                          style={styles.actionBtn}
                          onClick={() => navigate(`/leaderboard/${contest.id}`)}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(124,58,237,0.2)';
                            e.currentTarget.style.color = '#a855f7';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.color = '#94a3b8';
                          }}
                        >
                          Leaderboard
                        </button>
                        <button
                          style={{
                            ...styles.actionBtnPrimary,
                            background: btnConfig.bg,
                            opacity: btnConfig.opacity,
                            cursor: btnConfig.cursor
                          }}
                          onClick={() => {
                            if (isSubmitted) {
                              toast.info('You have already submitted this contest!');
                              return;
                            }
                            if (isEnded) {
                              toast.info('This contest has ended!');
                              return;
                            }
                            if (!isRegistered) {
                              handleRegister(contest);
                              return;
                            }
                            if (!isLive) {
                              toast.info(
                                `You are registered! Contest starts on ${formatDate(contest.startTime)}`
                              );
                              return;
                            }
                            if (contest.questions?.length > 0) {
                              navigate(`/contest/${contest.id}/question/${contest.questions[0].id}`);
                            } else {
                              toast.info('No questions added yet');
                            }
                          }}
                        >
                          {btnConfig.label}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div style={styles.tabContent}>
            {loading ? (
              <div style={styles.skeletonCard}>
                <div style={styles.skeletonTitle} />
                <div style={styles.skeletonText} />
              </div>
            ) : submissions.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>📤</div>
                <h3 style={styles.emptyTitle}>No submissions yet</h3>
                <p style={styles.emptySub}>Enter a contest and submit your first solution!</p>
              </div>
            ) : (
              <div style={styles.submissionList}>
                {submissions.map((sub, i) => {
                  const statusStyle = getSubmissionColor(sub.status);
                  return (
                    <div
                      key={sub.id}
                      style={{
                        ...styles.submissionCard,
                        animation: `staggerIn 0.4s ease-out ${i * 0.05}s both`
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(124,58,237,0.08)';
                        e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(26,26,46,0.7)';
                        e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)';
                      }}
                    >
                      <div style={styles.subLeft}>
                        <div style={{
                          ...styles.subStatusDot,
                          background: statusStyle.color
                        }} />
                        <div>
                          <p style={styles.subQuestion}>
                            {sub.question?.title || 'Unknown Question'}
                          </p>
                          <p style={styles.subContest}>
                            {sub.contest?.title || 'Unknown Contest'}
                          </p>
                        </div>
                      </div>
                      <div style={styles.subRight}>
                        <span style={styles.subLang}>{sub.language}</span>
                        <span style={{
                          ...styles.subStatus,
                          color: statusStyle.color,
                          background: statusStyle.bg
                        }}>
                          {sub.status}
                        </span>
                        <span style={styles.subScore}>{sub.score} pts</span>
                        <span style={styles.subDate}>
                          {formatDate(sub.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {showRegisterModal && selectedContest && (
        <div style={styles.overlay} onClick={() => setShowRegisterModal(false)}>
          <div style={{
            ...styles.modal,
            textAlign: 'left',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={styles.modalIcon}>📋</div>
              <h2 style={styles.modalTitle}>Register for Contest</h2>
              <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                Fill in your details to register for <strong>{selectedContest.title}</strong>
              </p>
            </div>

            {/* Contest Info */}
            <div style={styles.modalInfo}>
              <div style={styles.modalInfoItem}>
                <span style={styles.modalInfoLabel}>📅 Start</span>
                <span style={styles.modalInfoValue}>
                  {formatDate(selectedContest.startTime)}
                </span>
              </div>
              <div style={styles.modalInfoItem}>
                <span style={styles.modalInfoLabel}>🏁 End</span>
                <span style={styles.modalInfoValue}>
                  {formatDate(selectedContest.endTime)}
                </span>
              </div>
              <div style={styles.modalInfoItem}>
                <span style={styles.modalInfoLabel}>❓ Questions</span>
                <span style={styles.modalInfoValue}>
                  {selectedContest.questions?.length || 0}
                </span>
              </div>
              <div style={styles.modalInfoItem}>
                <span style={styles.modalInfoLabel}>📊 Status</span>
                <span style={{
                  ...styles.modalInfoValue,
                  color: getStatus(selectedContest).color
                }}>
                  {getStatus(selectedContest).label}
                </span>
              </div>
            </div>

            {/* Registration Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div style={styles.formField}>
                <label style={styles.formLabel}>📱 Phone Number *</label>
                <input
                  type="tel"
                  value={regForm.phone}
                  onChange={e => setRegForm({ ...regForm, phone: e.target.value })}
                  style={styles.formInput}
                  placeholder="Enter your phone number"
                  required
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>🏫 College / Company *</label>
                <input
                  type="text"
                  value={regForm.college}
                  onChange={e => setRegForm({ ...regForm, college: e.target.value })}
                  style={styles.formInput}
                  placeholder="Enter your college or company name"
                  required
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>💼 Experience Level</label>
                <select
                  value={regForm.experience}
                  onChange={e => setRegForm({ ...regForm, experience: e.target.value })}
                  style={styles.formInput}
                >
                  <option value="">Select experience level</option>
                  <option value="fresher">Fresher (0-1 years)</option>
                  <option value="junior">Junior (1-3 years)</option>
                  <option value="mid">Mid Level (3-5 years)</option>
                  <option value="senior">Senior (5+ years)</option>
                </select>
              </div>

              <div style={{
                background: 'rgba(6,182,212,0.08)',
                border: '1px solid rgba(6,182,212,0.25)',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '13px',
                color: '#22d3ee'
              }}>
                📧 Login credentials and contest link will be sent to{' '}
                <strong>{user?.email}</strong> after registration
              </div>

              {getStatus(selectedContest).label === 'Upcoming' && (
                <div style={{
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '13px',
                  color: '#fbbf24'
                }}>
                  ⏰ This is an upcoming contest. You can register now and enter when it goes live on{' '}
                  <strong>{formatDate(selectedContest.startTime)}</strong>
                </div>
              )}
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.cancelBtn}
                onClick={() => setShowRegisterModal(false)}
              >
                Cancel
              </button>
              <button
                style={{
                  ...styles.confirmBtn,
                  opacity: registeringId === selectedContest.id || !regForm.phone || !regForm.college
                    ? 0.6 : 1,
                  cursor: !regForm.phone || !regForm.college ? 'not-allowed' : 'pointer'
                }}
                onClick={confirmRegister}
                disabled={registeringId === selectedContest.id || !regForm.phone || !regForm.college}
              >
                {registeringId === selectedContest.id
                  ? 'Registering...'
                  : '✓ Register & Get Credentials'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: {
    minHeight: 'calc(100vh - 66px)',
    background: 'transparent',
    fontFamily: "'Outfit', sans-serif",
  },
  header: {
    padding: '40px 40px 32px',
    background: 'linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(6,182,212,0.06) 100%)',
    borderBottom: '1px solid rgba(139,92,246,0.18)',
    position: 'relative', overflow: 'hidden',
  },
  headerInner: {
    maxWidth: 1200, margin: '0 auto 28px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 20 },
  avatarLarge: {
    width: 68, height: 68, borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, fontWeight: 900, color: '#fff',
    boxShadow: '0 0 40px rgba(124,58,237,0.5), 0 4px 20px rgba(0,0,0,0.4)',
    border: '2px solid rgba(139,92,246,0.4)',
  },
  headerTitle: {
    fontSize: 30, fontWeight: 800, margin: '0 0 6px',
    background: 'linear-gradient(135deg, #ffffff 0%, #a855f7 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  },
  headerSub: { fontSize: 14, color: '#64748b', margin: 0 },
  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 14, maxWidth: 1200, margin: '0 auto',
  },
  statCard: {
    background: 'rgba(26,26,46,0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 16, padding: '16px 18px',
    display: 'flex', alignItems: 'center', gap: 12,
    transition: 'all 0.3s ease',
  },
  statIconBox: {
    width: 44, height: 44, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: 800, margin: 0 },
  statLabel: {
    fontSize: 11, color: '#64748b', margin: 0,
    textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600,
  },
  content: { maxWidth: 1200, margin: '0 auto', padding: '36px 40px' },
  tabs: {
    display: 'flex', gap: 8, marginBottom: 28,
    background: 'rgba(26,26,46,0.6)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 12, padding: '5px', width: 'fit-content',
  },
  tab: {
    padding: '9px 22px', borderRadius: 9,
    fontSize: 14, fontWeight: 700,
    cursor: 'pointer', transition: 'all 0.25s ease',
    fontFamily: "'Outfit', sans-serif",
  },
  tabContent: { animation: 'staggerIn 0.4s ease-out' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: 24,
  },
  card: {
    background: 'rgba(22,22,42,0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 22, padding: '26px',
    transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
    cursor: 'pointer',
    transformStyle: 'preserve-3d',
  },
  cardTop: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  statusBadge: {
    fontSize: 12, fontWeight: 700,
    padding: '4px 12px', borderRadius: 20,
    letterSpacing: '0.3px',
  },
  registeredBadge: {
    fontSize: 11, fontWeight: 700,
    padding: '3px 10px', borderRadius: 20,
    background: 'rgba(16,185,129,0.15)',
    color: '#10b981',
    border: '1px solid rgba(16,185,129,0.3)',
  },
  questionCount: {
    fontSize: 12, color: '#94a3b8',
    background: 'rgba(255,255,255,0.06)',
    padding: '4px 10px', borderRadius: 20,
  },
  cardTitle: {
    fontSize: 18, fontWeight: 800,
    color: '#ffffff',
    margin: '0 0 8px', lineHeight: '1.3',
  },
  cardDesc: {
    fontSize: 13, color: '#94a3b8',
    margin: '0 0 20px', lineHeight: '1.65',
  },
  cardDates: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '13px 16px',
    background: 'rgba(124,58,237,0.06)',
    border: '1px solid rgba(139,92,246,0.15)',
    borderRadius: 12, marginBottom: 20,
  },
  dateItem: { display: 'flex', flexDirection: 'column', gap: 3, flex: 1 },
  dateLabel: {
    fontSize: 10, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700,
  },
  dateValue: { fontSize: 12, fontWeight: 700, color: '#e2e8f0' },
  dateDivider: { width: 1, height: 30, background: 'rgba(139,92,246,0.2)' },
  cardActions: { display: 'flex', gap: 10 },
  actionBtn: {
    flex: 1, padding: '10px', border: '1px solid rgba(139,92,246,0.25)',
    borderRadius: 10, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', background: 'rgba(255,255,255,0.05)',
    color: '#94a3b8', transition: 'all 0.2s ease',
    fontFamily: "'Outfit', sans-serif",
  },
  actionBtnPrimary: {
    flex: 1, padding: '10px', border: 'none', borderRadius: 10,
    fontSize: 13, fontWeight: 700,
    transition: 'all 0.3s ease', color: '#fff',
    cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
  },
  submissionList: { display: 'flex', flexDirection: 'column', gap: 10 },
  submissionCard: {
    background: 'rgba(26,26,46,0.7)',
    backdropFilter: 'blur(12px)',
    borderRadius: 14, padding: '16px 20px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    border: '1px solid rgba(139,92,246,0.2)',
    transition: 'all 0.25s ease', cursor: 'pointer',
  },
  subLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  subStatusDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  subQuestion: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: '0 0 2px' },
  subContest: { fontSize: 12, color: '#64748b', margin: 0 },
  subRight: { display: 'flex', alignItems: 'center', gap: 10 },
  subLang: {
    fontSize: 12, background: 'rgba(124,58,237,0.12)',
    color: '#a855f7', padding: '4px 10px', borderRadius: 8,
    fontWeight: 700, border: '1px solid rgba(124,58,237,0.25)',
  },
  subStatus: { fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, textTransform: 'capitalize' },
  subScore: { fontSize: 13, fontWeight: 800, color: '#f1f5f9' },
  subDate: { fontSize: 12, color: '#475569' },
  skeletonCard: {
    background: 'rgba(26,26,46,0.5)',
    border: '1px solid rgba(139,92,246,0.1)',
    borderRadius: 20, padding: 24,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  skeletonTitle: {
    height: 20, background: 'rgba(139,92,246,0.1)',
    borderRadius: 8, marginBottom: 12, width: '60%',
  },
  skeletonText: {
    height: 14, background: 'rgba(139,92,246,0.07)',
    borderRadius: 8, marginBottom: 8, width: '80%',
  },
  empty: {
    textAlign: 'center', padding: '80px 20px',
    background: 'rgba(22,22,42,0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(139,92,246,0.18)',
    borderRadius: 22,
  },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 8px' },
  emptySub: { fontSize: 14, color: '#64748b', margin: 0 },
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, backdropFilter: 'blur(10px)',
  },
  modal: {
    background: 'rgba(16,16,30,0.97)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(139,92,246,0.35)',
    borderRadius: 24, padding: 40,
    width: '100%', maxWidth: 440, textAlign: 'center',
    animation: 'fadeInScale 0.4s cubic-bezier(0.16,1,0.3,1)',
    boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
  },
  modalIcon: { fontSize: 52, marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 12px' },
  modalInfo: {
    background: 'rgba(124,58,237,0.06)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 14, padding: 16, marginBottom: 20,
    display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left',
  },
  modalInfoItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalInfoLabel: { fontSize: 13, color: '#64748b', fontWeight: 500 },
  modalInfoValue: { fontSize: 13, fontWeight: 700, color: '#e2e8f0' },
  modalActions: { display: 'flex', gap: 12 },
  cancelBtn: {
    flex: 1, padding: 12,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12, fontSize: 14, fontWeight: 600,
    cursor: 'pointer', color: '#94a3b8',
    fontFamily: "'Outfit', sans-serif",
  },
  confirmBtn: {
    flex: 1, padding: 12,
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    border: 'none', borderRadius: 12,
    fontSize: 14, fontWeight: 700,
    cursor: 'pointer', color: '#fff',
    boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
    fontFamily: "'Outfit', sans-serif",
  },
  formField: { display: 'flex', flexDirection: 'column', gap: 6 },
  formLabel: {
    fontSize: 11, fontWeight: 700, color: '#94a3b8',
    textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.8px',
  },
  formInput: {
    padding: '12px 14px',
    border: '1.5px solid rgba(139,92,246,0.25)',
    borderRadius: 10, fontSize: 14, outline: 'none',
    color: '#f1f5f9',
    background: 'rgba(255,255,255,0.04)',
    fontFamily: "'Outfit', sans-serif",
    transition: 'border 0.25s ease',
  },
};

export default CandidateDashboard;
