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
      case 'rejected': return { color: '#ef4444', bg: '#fee2e2' };
      case 'pending': return { color: '#f59e0b', bg: '#fef3c7' };
      case 'running': return { color: '#3b82f6', bg: '#dbeafe' };
      default: return { color: '#888', bg: '#f5f5f5' };
    }
  };

  const getButtonConfig = (status, isRegistered) => {
    const isEnded = status.label === 'Ended';
    const isLive = status.label === 'Live';
    const isUpcoming = status.label === 'Upcoming';

    if (isEnded) {
      return {
        label: '🏁 Ended',
        bg: '#e0e0e0',
        opacity: 0.5,
        cursor: 'not-allowed'
      };
    }
    if (!isRegistered) {
      return {
        label: '📋 Register',
        bg: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
        opacity: 1,
        cursor: 'pointer'
      };
    }
    if (isUpcoming) {
      return {
        label: '⏰ Registered',
        bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
        opacity: 1,
        cursor: 'pointer'
      };
    }
    if (isLive) {
      return {
        label: '▶ Enter Contest',
        bg: 'linear-gradient(135deg, #10b981, #059669)',
        opacity: 1,
        cursor: 'pointer'
      };
    }
    return {
      label: status.label,
      bg: '#e0e0e0',
      opacity: 0.5,
      cursor: 'not-allowed'
    };
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
                  <p style={{ ...styles.statValue, color: stat.color }}>
                    {stat.value}
                  </p>
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
                  ? 'linear-gradient(135deg, #4fc3f7, #0288d1)'
                  : 'white',
                color: activeTab === tab ? 'white' : '#666',
                boxShadow: activeTab === tab
                  ? '0 4px 15px rgba(79,195,247,0.4)'
                  : 'none',
                border: activeTab === tab ? 'none' : '1px solid #e0e0e0'
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
                  const btnConfig = getButtonConfig(status, isRegistered);

                  return (
                    <div
                      key={contest.id}
                      style={{
                        ...styles.card,
                        transform: hoveredCard === contest.id
                          ? 'translateY(-6px)'
                          : 'translateY(0)',
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
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {isRegistered && (
                            <span style={styles.registeredBadge}>✓ Registered</span>
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
                          style={{
                            ...styles.actionBtnPrimary,
                            background: btnConfig.bg,
                            opacity: btnConfig.opacity,
                            cursor: btnConfig.cursor
                          }}
                          onClick={() => {
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
                                `You are registered! Contest starts on ${new Date(contest.startTime).toLocaleString()}`
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
                        animation: `slideIn 0.3s ease-out ${i * 0.05}s both`
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8f9ff'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
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
                          {new Date(sub.createdAt).toLocaleDateString()}
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
                  {new Date(selectedContest.startTime).toLocaleString()}
                </span>
              </div>
              <div style={styles.modalInfoItem}>
                <span style={styles.modalInfoLabel}>🏁 End</span>
                <span style={styles.modalInfoValue}>
                  {new Date(selectedContest.endTime).toLocaleString()}
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

              {/* Email notice */}
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '13px',
                color: '#0369a1'
              }}>
                📧 Login credentials and contest link will be sent to{' '}
                <strong>{user?.email}</strong> after registration
              </div>

              {/* Upcoming notice */}
              {getStatus(selectedContest).label === 'Upcoming' && (
                <div style={{
                  background: '#fefce8',
                  border: '1px solid #fde047',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '13px',
                  color: '#854d0e'
                }}>
                  ⏰ This is an upcoming contest. You can register now and enter when it goes live on{' '}
                  <strong>{new Date(selectedContest.startTime).toLocaleString()}</strong>
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
                    ? 0.6
                    : 1,
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
    minHeight: 'calc(100vh - 65px)',
    background: '#f0f4f8'
  },
  header: {
    background: 'linear-gradient(135deg, #0f0c29, #302b63)',
    padding: '40px 40px 30px',
    color: 'white'
  },
  headerInner: {
    maxWidth: '1200px',
    margin: '0 auto 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  avatarLarge: {
    width: '60px',
    height: '60px',
    background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'white',
    boxShadow: '0 4px 15px rgba(79,195,247,0.4)'
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
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '16px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  statCard: {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '1px solid rgba(255,255,255,0.12)'
  },
  statIconBox: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statIcon: { fontSize: '20px' },
  statValue: {
    fontSize: '20px',
    fontWeight: '700',
    margin: 0
  },
  statLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.6)',
    margin: 0
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px'
  },
  tabs: {
    display: 'flex',
    gap: '12px',
    marginBottom: '30px'
  },
  tab: {
    padding: '10px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  tabContent: {
    animation: 'fadeIn 0.3s ease-out'
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
  registeredBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '3px 8px',
    borderRadius: '20px',
    background: '#d1fae5',
    color: '#10b981'
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
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s',
    color: 'white'
  },
  submissionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  submissionCard: {
    background: 'white',
    borderRadius: '14px',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #f0f0f0',
    transition: 'all 0.2s',
    cursor: 'pointer'
  },
  subLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  subStatusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0
  },
  subQuestion: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a2e',
    margin: '0 0 2px'
  },
  subContest: {
    fontSize: '12px',
    color: '#888',
    margin: 0
  },
  subRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  subLang: {
    fontSize: '12px',
    background: '#f0f4f8',
    color: '#555',
    padding: '4px 10px',
    borderRadius: '8px',
    fontWeight: '500'
  },
  subStatus: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 12px',
    borderRadius: '20px',
    textTransform: 'capitalize'
  },
  subScore: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1a1a2e'
  },
  subDate: {
    fontSize: '12px',
    color: '#aaa'
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
    margin: 0
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
    padding: '40px',
    width: '100%',
    maxWidth: '440px',
    textAlign: 'center',
    animation: 'modalIn 0.3s ease-out',
    boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
  },
  modalIcon: { fontSize: '52px', marginBottom: '16px' },
  modalTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 12px'
  },
  modalInfo: {
    background: '#f8f9fa',
    borderRadius: '14px',
    padding: '16px',
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    textAlign: 'left'
  },
  modalInfoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalInfoLabel: {
    fontSize: '13px',
    color: '#888',
    fontWeight: '500'
  },
  modalInfoValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#333'
  },
  modalActions: {
    display: 'flex',
    gap: '12px'
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
  confirmBtn: {
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
  },
  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  formLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#444'
  },
  formInput: {
    padding: '10px 14px',
    border: '2px solid #e0e0e0',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    color: '#333',
    transition: 'border 0.2s',
    background: 'white'
  }
};

export default CandidateDashboard;