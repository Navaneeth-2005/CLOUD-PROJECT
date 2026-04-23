import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../api/axios';

const ContestManagement = () => {
  const { contestId } = useParams();
  const navigate = useNavigate();

  const [contest, setContest] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [cheatingLogs, setCheatingLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    title: '',
    description: '',
    inputFormat: '',
    outputFormat: '',
    sampleInput: '',
    sampleOutput: '',
    difficulty: 'medium',
    marks: 100
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [contestRes, submissionRes, cheatingRes, analyticsRes] = await Promise.all([
        API.get(`/contests/${contestId}`),
        API.get(`/submissions/contest/${contestId}`),
        API.get(`/cheating/contest/${contestId}`),
        API.get(`/analytics/contest/${contestId}`)
      ]);
      setContest(contestRes.data.contest);
      setSubmissions(submissionRes.data.submissions);
      setCheatingLogs(cheatingRes.data.logs);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      toast.error('Failed to load contest data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    try {
      await API.post(`/contests/${contestId}/questions`, questionForm);
      toast.success('Question added successfully!');
      setShowQuestionModal(false);
      setQuestionForm({
        title: '', description: '', inputFormat: '',
        outputFormat: '', sampleInput: '', sampleOutput: '',
        difficulty: 'medium', marks: 100
      });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add question');
    }
  };

  const getSubmissionColor = (status) => {
    switch (status) {
      case 'accepted': return { color: '#10b981', bg: '#d1fae5' };
      case 'rejected': return { color: '#ef4444', bg: '#fee2e2' };
      case 'pending': return { color: '#f59e0b', bg: '#fef3c7' };
      default: return { color: '#888', bg: '#f5f5f5' };
    }
  };

  const tabs = [
    { id: 'overview', label: '📊 Overview', },
    { id: 'questions', label: '❓ Questions' },
    { id: 'submissions', label: '📤 Submissions' },
    { id: 'cheating', label: '🚨 Cheating Logs' }
  ];

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
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
        <div style={styles.headerInner}>
          <div style={styles.headerLeft}>
            <button
              style={styles.backBtn}
              onClick={() => navigate('/company/dashboard')}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            >
              ← Back
            </button>
            <div>
              <h1 style={styles.headerTitle}>
                {contest?.title || 'Loading...'}
              </h1>
              <p style={styles.headerSub}>
                Contest Management Panel
              </p>
            </div>
          </div>

          <div style={styles.headerRight}>
            <button
              style={styles.addQuestionBtn}
              onClick={() => setShowQuestionModal(true)}
              onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, #0288d1, #26c6da)'}
              onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, #4fc3f7, #0288d1)'}
            >
              + Add Question
            </button>
            <button
              style={styles.leaderboardBtn}
              onClick={() => navigate(`/leaderboard/${contestId}`)}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            >
              🏆 Leaderboard
            </button>
          </div>
        </div>

        {/* Stats Row */}
        {analytics && (
          <div style={styles.statsRow}>
            {[
              { label: 'Total Submissions', value: analytics.summary?.totalSubmissions || 0, icon: '📤', color: '#4fc3f7' },
              { label: 'Accepted', value: analytics.summary?.accepted || 0, icon: '✅', color: '#10b981' },
              { label: 'Rejected', value: analytics.summary?.rejected || 0, icon: '❌', color: '#ef4444' },
              { label: 'Unique Candidates', value: analytics.summary?.uniqueCandidates || 0, icon: '👥', color: '#a78bfa' },
              { label: 'Acceptance Rate', value: analytics.summary?.acceptanceRate || '0%', icon: '📊', color: '#f59e0b' },
              { label: 'Questions', value: contest?.questions?.length || 0, icon: '❓', color: '#4fc3f7' }
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
          {tabs.map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.tab,
                background: activeTab === tab.id
                  ? 'linear-gradient(135deg, #4fc3f7, #0288d1)'
                  : 'white',
                color: activeTab === tab.id ? 'white' : '#666',
                boxShadow: activeTab === tab.id
                  ? '0 4px 15px rgba(79,195,247,0.4)'
                  : 'none',
                border: activeTab === tab.id
                  ? 'none'
                  : '1px solid #e0e0e0'
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && analytics && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div style={styles.overviewGrid}>
              {/* By Language */}
              <div style={styles.overviewCard}>
                <h3 style={styles.cardTitle}>Submissions by Language</h3>
                {analytics.byLanguage?.length === 0 ? (
                  <p style={styles.emptyText}>No submissions yet</p>
                ) : (
                  <div style={styles.langList}>
                    {analytics.byLanguage?.map((lang, i) => (
                      <div key={i} style={styles.langItem}>
                        <div style={styles.langLeft}>
                          <span style={styles.langIcon}>
                            {lang.language === 'python' ? '🐍'
                              : lang.language === 'java' ? '☕' : '⚡'}
                          </span>
                          <span style={styles.langName}>
                            {lang.language}
                          </span>
                        </div>
                        <div style={styles.langBar}>
                          <div style={{
                            ...styles.langBarFill,
                            width: `${(lang.count / analytics.summary.totalSubmissions) * 100}%`
                          }} />
                        </div>
                        <span style={styles.langCount}>{lang.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* By Question */}
              <div style={styles.overviewCard}>
                <h3 style={styles.cardTitle}>Performance by Question</h3>
                {analytics.byQuestion?.length === 0 ? (
                  <p style={styles.emptyText}>No data yet</p>
                ) : (
                  <div style={styles.questionList}>
                    {analytics.byQuestion?.map((q, i) => (
                      <div key={i} style={styles.questionItem}>
                        <div style={styles.questionLeft}>
                          <span style={{
                            ...styles.diffDot,
                            background: q.question?.difficulty === 'easy'
                              ? '#10b981'
                              : q.question?.difficulty === 'medium'
                              ? '#f59e0b' : '#ef4444'
                          }} />
                          <span style={styles.questionItemTitle}>
                            {q.question?.title}
                          </span>
                        </div>
                        <div style={styles.questionStats}>
                          <span style={styles.questionStat}>
                            {q.totalSubmissions} submissions
                          </span>
                          <span style={{
                            ...styles.questionAccepted,
                            color: '#10b981'
                          }}>
                            {q.acceptedCount} accepted
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {contest?.questions?.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>❓</div>
                <h3 style={styles.emptyTitle}>No questions yet</h3>
                <p style={styles.emptySub}>Add questions to your contest</p>
                <button
                  style={styles.addQuestionBtn}
                  onClick={() => setShowQuestionModal(true)}
                >
                  + Add Question
                </button>
              </div>
            ) : (
              <div style={styles.questionGrid}>
                {contest?.questions?.map((q, i) => (
                  <div
                    key={q.id}
                    style={{
                      ...styles.questionCard,
                      animation: `fadeIn 0.4s ease-out ${i * 0.1}s both`
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)';
                    }}
                  >
                    <div style={styles.questionCardTop}>
                      <span style={{
                        ...styles.diffBadge,
                        color: q.difficulty === 'easy' ? '#10b981'
                          : q.difficulty === 'medium' ? '#f59e0b' : '#ef4444',
                        background: q.difficulty === 'easy' ? '#d1fae5'
                          : q.difficulty === 'medium' ? '#fef3c7' : '#fee2e2'
                      }}>
                        {q.difficulty}
                      </span>
                      <span style={styles.marksBadge}>
                        ⭐ {q.marks} pts
                      </span>
                    </div>
                    <h3 style={styles.questionCardTitle}>{q.title}</h3>
                    <p style={styles.questionCardDesc}>{q.description}</p>
                    {q.sampleInput && (
                      <div style={styles.sampleBox}>
                        <p style={styles.sampleLabel}>Sample Input</p>
                        <pre style={styles.sampleCode}>{q.sampleInput}</pre>
                      </div>
                    )}
                    {q.sampleOutput && (
                      <div style={styles.sampleBox}>
                        <p style={styles.sampleLabel}>Sample Output</p>
                        <pre style={styles.sampleCode}>{q.sampleOutput}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {submissions.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>📤</div>
                <h3 style={styles.emptyTitle}>No submissions yet</h3>
                <p style={styles.emptySub}>Submissions will appear here once candidates submit code</p>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <div style={styles.tableHeader}>
                  <span style={{ flex: 1 }}>Candidate</span>
                  <span style={{ width: '150px' }}>Question</span>
                  <span style={{ width: '100px' }}>Language</span>
                  <span style={{ width: '100px', textAlign: 'center' }}>Status</span>
                  <span style={{ width: '80px', textAlign: 'center' }}>Score</span>
                  <span style={{ width: '120px', textAlign: 'center' }}>Submitted</span>
                </div>
                {submissions.map((sub, i) => {
                  const s = getSubmissionColor(sub.status);
                  return (
                    <div
                      key={sub.id}
                      style={{
                        ...styles.tableRow,
                        background: hoveredRow === i ? '#f8f9ff' : 'white',
                        animation: `slideIn 0.3s ease-out ${i * 0.03}s both`
                      }}
                      onMouseEnter={() => setHoveredRow(i)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={styles.avatar}>
                          {sub.candidate?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={styles.candidateName}>{sub.candidate?.name}</p>
                          <p style={styles.candidateEmail}>{sub.candidate?.email}</p>
                        </div>
                      </div>
                      <div style={{ width: '150px' }}>
                        <p style={styles.questionTitle}>{sub.question?.title}</p>
                      </div>
                      <div style={{ width: '100px' }}>
                        <span style={styles.langBadge}>{sub.language}</span>
                      </div>
                      <div style={{ width: '100px', textAlign: 'center' }}>
                        <span style={{
                          ...styles.statusBadge,
                          color: s.color,
                          background: s.bg
                        }}>
                          {sub.status}
                        </span>
                      </div>
                      <div style={{ width: '80px', textAlign: 'center' }}>
                        <span style={styles.scoreText}>{sub.score}</span>
                      </div>
                      <div style={{ width: '120px', textAlign: 'center' }}>
                        <span style={styles.dateText}>
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

        {/* Cheating Logs Tab */}
        {activeTab === 'cheating' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {cheatingLogs.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>✅</div>
                <h3 style={styles.emptyTitle}>No cheating detected</h3>
                <p style={styles.emptySub}>All candidates are playing fair!</p>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <div style={styles.tableHeader}>
                  <span style={{ flex: 1 }}>Candidate</span>
                  <span style={{ width: '150px' }}>Event Type</span>
                  <span style={{ width: '100px', textAlign: 'center' }}>Count</span>
                  <span style={{ width: '100px', textAlign: 'center' }}>Flagged</span>
                  <span style={{ width: '150px' }}>Details</span>
                </div>
                {cheatingLogs.map((log, i) => (
                  <div
                    key={log.id}
                    style={{
                      ...styles.tableRow,
                      background: log.flagged
                        ? '#fff5f5'
                        : hoveredRow === `c${i}` ? '#f8f9ff' : 'white',
                      border: log.flagged
                        ? '1px solid #fee2e2'
                        : '1px solid #f0f0f0',
                      animation: `slideIn 0.3s ease-out ${i * 0.03}s both`
                    }}
                    onMouseEnter={() => setHoveredRow(`c${i}`)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        ...styles.avatar,
                        background: log.flagged
                          ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                          : 'linear-gradient(135deg, #a78bfa, #7c3aed)'
                      }}>
                        {log.candidate?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={styles.candidateName}>{log.candidate?.name}</p>
                        <p style={styles.candidateEmail}>{log.candidate?.email}</p>
                      </div>
                    </div>
                    <div style={{ width: '150px' }}>
                      <span style={styles.eventBadge}>
                        {log.eventType?.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ width: '100px', textAlign: 'center' }}>
                      <span style={styles.countBadge}>{log.eventCount}</span>
                    </div>
                    <div style={{ width: '100px', textAlign: 'center' }}>
                      {log.flagged ? (
                        <span style={styles.flaggedBadge}>🚨 Flagged</span>
                      ) : (
                        <span style={styles.safeBadge}>✅ Safe</span>
                      )}
                    </div>
                    <div style={{ width: '150px' }}>
                      <p style={styles.detailsText}>{log.details || '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Question Modal */}
      {showQuestionModal && (
        <div style={styles.overlay} onClick={() => setShowQuestionModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add New Question</h2>
              <button
                style={styles.closeBtn}
                onClick={() => setShowQuestionModal(false)}
                onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                onMouseLeave={e => e.currentTarget.style.background = '#f5f5f5'}
              >✕</button>
            </div>

            <form onSubmit={handleAddQuestion} style={styles.modalForm}>
              <div style={styles.formRow}>
                <div style={styles.field}>
                  <label style={styles.label}>Question Title</label>
                  <input
                    type="text"
                    value={questionForm.title}
                    onChange={e => setQuestionForm({ ...questionForm, title: e.target.value })}
                    style={styles.input}
                    placeholder="e.g. Two Sum"
                    required
                  />
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={questionForm.description}
                  onChange={e => setQuestionForm({ ...questionForm, description: e.target.value })}
                  style={{ ...styles.input, height: '80px', resize: 'none' }}
                  placeholder="Describe the problem..."
                  required
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.field}>
                  <label style={styles.label}>Input Format</label>
                  <input
                    type="text"
                    value={questionForm.inputFormat}
                    onChange={e => setQuestionForm({ ...questionForm, inputFormat: e.target.value })}
                    style={styles.input}
                    placeholder="Describe input format"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Output Format</label>
                  <input
                    type="text"
                    value={questionForm.outputFormat}
                    onChange={e => setQuestionForm({ ...questionForm, outputFormat: e.target.value })}
                    style={styles.input}
                    placeholder="Describe output format"
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.field}>
                  <label style={styles.label}>Sample Input</label>
                  <textarea
                    value={questionForm.sampleInput}
                    onChange={e => setQuestionForm({ ...questionForm, sampleInput: e.target.value })}
                    style={{ ...styles.input, height: '70px', resize: 'none', fontFamily: 'monospace' }}
                    placeholder="e.g. [2,7,11,15], target=9"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Sample Output</label>
                  <textarea
                    value={questionForm.sampleOutput}
                    onChange={e => setQuestionForm({ ...questionForm, sampleOutput: e.target.value })}
                    style={{ ...styles.input, height: '70px', resize: 'none', fontFamily: 'monospace' }}
                    placeholder="e.g. [0,1]"
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.field}>
                  <label style={styles.label}>Difficulty</label>
                  <select
                    value={questionForm.difficulty}
                    onChange={e => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                    style={styles.input}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Marks</label>
                  <input
                    type="number"
                    value={questionForm.marks}
                    onChange={e => setQuestionForm({ ...questionForm, marks: parseInt(e.target.value) })}
                    style={styles.input}
                    min="1"
                    max="1000"
                  />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => setShowQuestionModal(false)}
                >Cancel</button>
                <button type="submit" style={styles.submitBtn}>
                  Add Question
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
    padding: '30px 40px',
    color: 'white'
  },
  headerInner: {
    maxWidth: '1200px',
    margin: '0 auto 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  backBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: '700',
    margin: '0 0 4px'
  },
  headerSub: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
    margin: 0
  },
  headerRight: {
    display: 'flex',
    gap: '12px'
  },
  addQuestionBtn: {
    background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
    border: 'none',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 15px rgba(79,195,247,0.3)'
  },
  leaderboardBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '14px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  statCard: {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
    borderRadius: '14px',
    padding: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    border: '1px solid rgba(255,255,255,0.12)'
  },
  statIconBox: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  statIcon: { fontSize: '18px' },
  statValue: {
    fontSize: '18px',
    fontWeight: '700',
    margin: 0
  },
  statLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.6)',
    margin: 0
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 40px'
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  tab: {
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px'
  },
  overviewCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 20px'
  },
  emptyText: {
    fontSize: '14px',
    color: '#aaa',
    textAlign: 'center',
    padding: '20px 0'
  },
  langList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  langItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  langLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '90px'
  },
  langIcon: { fontSize: '18px' },
  langName: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#444',
    textTransform: 'capitalize'
  },
  langBar: {
    flex: 1,
    height: '8px',
    background: '#f0f0f0',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  langBarFill: {
    height: '100%',
    background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
    borderRadius: '4px',
    transition: 'width 0.5s ease'
  },
  langCount: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#333',
    width: '30px',
    textAlign: 'right'
  },
  questionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  questionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#f8f9fa',
    borderRadius: '10px'
  },
  questionLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  diffDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0
  },
  questionItemTitle: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#333'
  },
  questionStats: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  questionStat: {
    fontSize: '12px',
    color: '#888'
  },
  questionAccepted: {
    fontSize: '12px',
    fontWeight: '600'
  },
  questionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '20px'
  },
  questionCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  questionCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px'
  },
  diffBadge: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 12px',
    borderRadius: '20px',
    textTransform: 'capitalize'
  },
  marksBadge: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#f59e0b',
    background: '#fef3c7',
    padding: '4px 10px',
    borderRadius: '20px'
  },
  questionCardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 8px'
  },
  questionCardDesc: {
    fontSize: '13px',
    color: '#888',
    margin: '0 0 14px',
    lineHeight: '1.5'
  },
  sampleBox: {
    background: '#f8f9fa',
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '8px'
  },
  sampleLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#4fc3f7',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 4px'
  },
  sampleCode: {
    fontSize: '12px',
    color: '#333',
    fontFamily: 'monospace',
    margin: 0,
    whiteSpace: 'pre-wrap'
  },
  tableWrapper: {
    background: 'white',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #0f0c29, #302b63)',
    gap: '12px',
    fontSize: '12px',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.8px'
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 24px',
    gap: '12px',
    borderBottom: '1px solid #f5f5f5',
    transition: 'all 0.2s',
    cursor: 'pointer'
  },
  avatar: {
    width: '36px',
    height: '36px',
    background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white',
    flexShrink: 0
  },
  candidateName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1a1a2e',
    margin: '0 0 2px'
  },
  candidateEmail: {
    fontSize: '11px',
    color: '#aaa',
    margin: 0
  },
  questionTitle: {
    fontSize: '13px',
    color: '#555',
    margin: 0,
    fontWeight: '500'
  },
  langBadge: {
    fontSize: '12px',
    background: '#f0f4f8',
    color: '#555',
    padding: '4px 10px',
    borderRadius: '8px',
    fontWeight: '500'
  },
  statusBadge: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 12px',
    borderRadius: '20px',
    textTransform: 'capitalize'
  },
  scoreText: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1a1a2e'
  },
  dateText: {
    fontSize: '12px',
    color: '#aaa'
  },
  eventBadge: {
    fontSize: '12px',
    background: '#fef3c7',
    color: '#f59e0b',
    padding: '4px 10px',
    borderRadius: '8px',
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  countBadge: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#ef4444'
  },
  flaggedBadge: {
    fontSize: '12px',
    background: '#fee2e2',
    color: '#ef4444',
    padding: '4px 10px',
    borderRadius: '8px',
    fontWeight: '600'
  },
  safeBadge: {
    fontSize: '12px',
    background: '#d1fae5',
    color: '#10b981',
    padding: '4px 10px',
    borderRadius: '8px',
    fontWeight: '600'
  },
  detailsText: {
    fontSize: '12px',
    color: '#888',
    margin: 0
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
    maxWidth: '640px',
    animation: 'modalIn 0.3s ease-out',
    boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
    maxHeight: '90vh',
    overflowY: 'auto'
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
    gap: '16px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#444'
  },
  input: {
    padding: '10px 14px',
    border: '2px solid #e0e0e0',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    color: '#333',
    transition: 'border 0.2s'
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

export default ContestManagement;