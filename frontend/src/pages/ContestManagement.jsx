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
  const [showTestCaseModal, setShowTestCaseModal] = useState(false);
  const [showProctorModal, setShowProctorModal] = useState(false);
  const [proctorSnaps, setProctorSnaps] = useState([]);
  const [selectedCandidateName, setSelectedCandidateName] = useState('');
  const [proctorData, setProctorData] = useState([]);
  const [proctorLoading, setProctorLoading] = useState(false);
  const [proctorSearch, setProctorSearch] = useState('');
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [questionTestCases, setQuestionTestCases] = useState({});
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
  const [testCaseForm, setTestCaseForm] = useState({
    input: '',
    expectedOutput: '',
    isHidden: false,
    marks: 10
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchProctorData = async () => {
    setProctorLoading(true);
    try {
      const res = await API.get(`/proctor/contest/${contestId}`);
      setProctorData(res.data);
    } catch (err) {
      toast.error(`Failed to load proctoring data: ${err.response?.data?.message || err.message}`);
    } finally {
      setProctorLoading(false);
    }
  };

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

  const handleAddTestCase = async (e) => {
    e.preventDefault();
    try {
      await API.post(`/contests/questions/${selectedQuestion.id}/testcases`, testCaseForm);
      toast.success('Test case added successfully!');
      setShowTestCaseModal(false);
      setTestCaseForm({ input: '', expectedOutput: '', isHidden: false, marks: 10 });
      // Refresh test cases for this question
      fetchTestCases(selectedQuestion.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add test case');
    }
  };

  const fetchTestCases = async (questionId) => {
    try {
      const res = await API.get(`/contests/questions/${questionId}/testcases`);
      setQuestionTestCases(prev => ({
        ...prev,
        [questionId]: res.data.testCases
      }));
    } catch (err) {
      toast.error('Failed to fetch test cases');
    }
  };

  const handleDeleteTestCase = async (testCaseId, questionId) => {
    if (!window.confirm('Are you sure you want to delete this test case?')) return;
    try {
      await API.delete(`/contests/testcases/${testCaseId}`);
      toast.success('Test case deleted!');
      fetchTestCases(questionId);
    } catch (err) {
      toast.error('Failed to delete test case');
    }
  };

  const fetchProctorSnaps = async (userId, candidateName) => {
    try {
      const res = await API.get(`/proctor/contest/${contestId}/candidate/${userId}`);
      setProctorSnaps(res.data);
      setSelectedCandidateName(candidateName);
      setShowProctorModal(true);
    } catch (err) {
      toast.error('Failed to fetch proctor snapshots from AWS S3');
    }
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

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'questions', label: '❓ Questions' },
    { id: 'submissions', label: '📤 Submissions' },
    { id: 'cheating', label: '🚨 Cheating Logs' },
    { id: 'proctoring', label: '📷 Proctoring (Rekognition)' }
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
              <h1 style={styles.headerTitle}>{contest?.title || 'Loading...'}</h1>
              <p style={styles.headerSub}>Contest Management Panel</p>
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
                <div style={{ ...styles.statIconBox, background: `${stat.color}22` }}>
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
          {tabs.map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.tab,
                background: activeTab === tab.id ? 'linear-gradient(135deg, #4fc3f7, #0288d1)' : 'white',
                color: activeTab === tab.id ? 'white' : '#666',
                boxShadow: activeTab === tab.id ? '0 4px 15px rgba(79,195,247,0.4)' : 'none',
                border: activeTab === tab.id ? 'none' : '1px solid #e0e0e0'
              }}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'proctoring') fetchProctorData();
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && analytics && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div style={styles.overviewGrid}>
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
                            {lang.language === 'python' ? '🐍' : lang.language === 'java' ? '☕' : '⚡'}
                          </span>
                          <span style={styles.langName}>{lang.language}</span>
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
                            background: q.question?.difficulty === 'easy' ? '#10b981'
                              : q.question?.difficulty === 'medium' ? '#f59e0b' : '#ef4444'
                          }} />
                          <span style={styles.questionItemTitle}>{q.question?.title}</span>
                        </div>
                        <div style={styles.questionStats}>
                          <span style={styles.questionStat}>{q.totalSubmissions} submissions</span>
                          <span style={{ ...styles.questionAccepted, color: '#10b981' }}>{q.acceptedCount} accepted</span>
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
                <button style={styles.addQuestionBtn} onClick={() => setShowQuestionModal(true)}>
                  + Add Question
                </button>
              </div>
            ) : (
              <div style={styles.questionGrid}>
                {contest?.questions?.map((q, i) => (
                  <div
                    key={q.id}
                    style={{ ...styles.questionCard, animation: `fadeIn 0.4s ease-out ${i * 0.1}s both` }}
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
                        color: q.difficulty === 'easy' ? '#10b981' : q.difficulty === 'medium' ? '#f59e0b' : '#ef4444',
                        background: q.difficulty === 'easy' ? '#d1fae5' : q.difficulty === 'medium' ? '#fef3c7' : '#fee2e2'
                      }}>
                        {q.difficulty}
                      </span>
                      <span style={styles.marksBadge}>⭐ {q.marks} pts</span>
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

                    {/* Test Cases Section */}
                    <div style={styles.testCaseSection}>
                      <div style={styles.testCaseHeader}>
                        <span style={styles.testCaseTitle}>🧪 Test Cases</span>
                        <button
                          style={styles.loadBtn}
                          onClick={() => fetchTestCases(q.id)}
                        >
                          🔄 Load
                        </button>
                      </div>

                      {/* Test Cases List */}
                      {questionTestCases[q.id] && (
                        <div style={styles.testCaseList}>
                          {questionTestCases[q.id].length === 0 ? (
                            <p style={styles.noTestCaseText}>No test cases yet</p>
                          ) : (
                            questionTestCases[q.id].map((tc, idx) => (
                              <div key={tc.id} style={styles.testCaseItem}>
                                <div style={{ flex: 1 }}>
                                  <div style={styles.testCaseMeta}>
                                    <span style={styles.testCaseNum}>TC {idx + 1}</span>
                                    <span style={{
                                      ...styles.testCaseVisibility,
                                      color: tc.isHidden ? '#f59e0b' : '#10b981',
                                      background: tc.isHidden ? '#fef3c7' : '#d1fae5'
                                    }}>
                                      {tc.isHidden ? '🔒 Hidden' : '👁 Visible'}
                                    </span>
                                    <span style={styles.testCaseMarks}>{tc.marks} pts</span>
                                  </div>
                                  <p style={styles.testCaseInput}>
                                    <strong>In:</strong> {tc.input?.substring(0, 40)}{tc.input?.length > 40 ? '...' : ''}
                                  </p>
                                  <p style={styles.testCaseOutput}>
                                    <strong>Out:</strong> {tc.expectedOutput?.substring(0, 30)}{tc.expectedOutput?.length > 30 ? '...' : ''}
                                  </p>
                                </div>
                                <button
                                  style={styles.deleteBtn}
                                  onClick={() => handleDeleteTestCase(tc.id, q.id)}
                                  onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                                  onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
                                >
                                  🗑
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Add Test Case Button */}
                      <button
                        style={styles.addTestCaseBtn}
                        onClick={() => {
                          setSelectedQuestion(q);
                          setTestCaseForm({ input: '', expectedOutput: '', isHidden: false, marks: 10 });
                          setShowTestCaseModal(true);
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#e3f7ff'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f0f9ff'}
                      >
                        + Add Test Case
                      </button>
                    </div>
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
                  <span style={{ width: '140px', textAlign: 'center' }}>Submitted</span>
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
                        <span style={{ ...styles.statusBadge, color: s.color, background: s.bg }}>
                          {sub.status}
                        </span>
                      </div>
                      <div style={{ width: '80px', textAlign: 'center' }}>
                        <span style={styles.scoreText}>{sub.score}</span>
                      </div>
                      <div style={{ width: '140px', textAlign: 'center' }}>
                        <span style={styles.dateText}>{formatDate(sub.createdAt)}</span>
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
                  <span style={{ width: '150px', textAlign: 'center' }}>Actions</span>
                </div>
                {cheatingLogs.map((log, i) => (
                  <div
                    key={log.id}
                    style={{
                      ...styles.tableRow,
                      background: log.flagged ? '#fff5f5' : hoveredRow === `c${i}` ? '#f8f9ff' : 'white',
                      border: log.flagged ? '1px solid #fee2e2' : '1px solid #f0f0f0',
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
                      <span style={styles.eventBadge}>{log.eventType?.replace('_', ' ')}</span>
                    </div>
                    <div style={{ width: '100px', textAlign: 'center' }}>
                      <span style={styles.countBadge}>{log.eventCount}</span>
                    </div>
                    <div style={{ width: '100px', textAlign: 'center' }}>
                      {log.flagged
                        ? <span style={styles.flaggedBadge}>🚨 Flagged</span>
                        : <span style={styles.safeBadge}>✅ Safe</span>
                      }
                    </div>
                    <div style={{ width: '150px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        style={{ ...styles.addQuestionBtn, padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => fetchProctorSnaps(log.userId, log.candidate?.name)}
                      >
                        📷 S3 Proctor Snaps
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

        {/* Proctoring Tab — Amazon Rekognition */}
        {activeTab === 'proctoring' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out', padding: '0 40px 40px' }}>
            {/* Header section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>📷 Automated Proctoring Dashboard</h3>
                <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '13px' }}>
                  Webcam snapshots analyzed by <strong>Amazon Rekognition</strong>. Supports real-time filtering for multi-candidate testing.
                </p>
              </div>
              <button
                style={{
                  ...styles.addQuestionBtn,
                  background: 'linear-gradient(135deg, #0288d1, #01579b)',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontWeight: '600'
                }}
                onClick={fetchProctorData}
              >
                🔄 Sync Live Feed
              </button>
            </div>

            {/* Dynamic metrics badges */}
            {!proctorLoading && proctorData.length > 0 && (() => {
              const uniqueCandidates = [...new Set(proctorData.map(s => s.candidate?.id))].length;
              const totalAlerts = proctorData.filter(s => s.suspiciousActivity).length;
              const alertedCandidates = [...new Set(proctorData.filter(s => s.suspiciousActivity).map(s => s.candidate?.id))].length;

              return (
                <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                  <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '24px', background: '#e0f2fe', borderRadius: '10px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0288d1' }}>📷</div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>{proctorData.length}</h4>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Total Snaps Captured</p>
                    </div>
                  </div>
                  <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '24px', background: '#f3e8ff', borderRadius: '10px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>👤</div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>{uniqueCandidates}</h4>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Candidates Monitored</p>
                    </div>
                  </div>
                  <div style={{
                    flex: 1,
                    background: alertedCandidates > 0 ? '#fff5f5' : '#f8fafc',
                    border: alertedCandidates > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
                    borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px'
                  }}>
                    <div style={{ fontSize: '24px', background: alertedCandidates > 0 ? '#fee2e2' : '#f1f5f9', borderRadius: '10px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: alertedCandidates > 0 ? '#ef4444' : '#64748b' }}>🚨</div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: alertedCandidates > 0 ? '#ef4444' : '#0f172a' }}>
                        {alertedCandidates} <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b' }}>({totalAlerts} warning{totalAlerts !== 1 ? 's' : ''})</span>
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Suspicious Candidates</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Live Filter Controls */}
            {!proctorLoading && proctorData.length > 0 && (
              <div style={{ display: 'flex', gap: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '24px', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="🔍 Search candidate by name or email..."
                    value={proctorSearch}
                    onChange={(e) => setProctorSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      color: '#0f172a',
                      background: 'white',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  />
                </div>
                <button
                  onClick={() => setShowOnlyAlerts(!showOnlyAlerts)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: showOnlyAlerts ? '#f87171' : '#cbd5e1',
                    background: showOnlyAlerts ? '#ef4444' : 'white',
                    color: showOnlyAlerts ? 'white' : '#475569',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: showOnlyAlerts ? '0 4px 12px rgba(239,68,68,0.2)' : 'none'
                  }}
                >
                  ⚠️ {showOnlyAlerts ? 'Showing Suspicious Only' : 'Filter Suspicious'}
                </button>
              </div>
            )}

            {/* Proctor gallery list */}
            {proctorLoading ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
                <div style={{ fontSize: '36px', marginBottom: '16px', animation: 'spin 1.5s linear infinite' }}>⏳</div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#334155' }}>Analysing Live Submissions</h4>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Fetching image feeds from Amazon S3...</p>
              </div>
            ) : (() => {
              // Apply filtering
              const filteredData = proctorData.filter(snap => {
                const matchesSearch = !proctorSearch || 
                  snap.candidate?.name?.toLowerCase().includes(proctorSearch.toLowerCase()) ||
                  snap.candidate?.email?.toLowerCase().includes(proctorSearch.toLowerCase());
                const matchesAlert = !showOnlyAlerts || snap.suspiciousActivity;
                return matchesSearch && matchesAlert;
              });

              if (proctorData.length === 0) {
                return (
                  <div style={styles.empty}>
                    <div style={styles.emptyIcon}>📷</div>
                    <h3 style={styles.emptyTitle}>No snapshots yet</h3>
                    <p style={styles.emptySub}>
                      Once candidates enter the editor, snapshots are taken automatically every 3 minutes, sent to S3, and analysed via Amazon Rekognition face detection.
                    </p>
                  </div>
                );
              }

              if (filteredData.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '60px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#334155' }}>No matching snapshots found</h4>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Try relaxing your search query or toggling off the suspicious filter.</p>
                  </div>
                );
              }

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
                  {filteredData.map((snap) => (
                    <div key={snap.id} style={{
                      background: 'white', borderRadius: '14px', overflow: 'hidden',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                      border: snap.suspiciousActivity ? '2px solid #ef4444' : '1px solid #e2e8f0',
                      transition: 'all 0.2s',
                      transform: hoveredRow === `snap_${snap.id}` ? 'translateY(-4px)' : 'none'
                    }}
                    onMouseEnter={() => setHoveredRow(`snap_${snap.id}`)}
                    onMouseLeave={() => setHoveredRow(null)}
                    >
                      <div style={{ position: 'relative', overflow: 'hidden' }}>
                        <img
                          src={snap.url}
                          alt="Proctor Snapshot"
                          style={{ width: '100%', height: '170px', objectFit: 'cover', display: 'block' }}
                        />
                        {snap.suspiciousActivity ? (
                          <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#ef4444', color: 'white', borderRadius: '6px', padding: '4px 10px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}>
                            🚨 SUSPICIOUS
                          </div>
                        ) : (
                          <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#10b981', color: 'white', borderRadius: '6px', padding: '4px 10px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px' }}>
                            ✅ SAFE
                          </div>
                        )}
                        <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(15,23,42,0.75)', color: 'white', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: '600', backdropFilter: 'blur(4px)' }}>
                          👤 {snap.faceCount} face{snap.faceCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>
                            {snap.candidate?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{snap.candidate?.name}</p>
                            <p style={{ margin: 0, fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{snap.candidate?.email}</p>
                          </div>
                        </div>
                        {snap.rekognitionAlert && (
                          <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 10px', fontSize: '11px', color: '#b91c1c', marginBottom: '12px', fontWeight: '500', lineHeight: '1.4' }}>
                            ⚠️ {snap.rekognitionAlert}
                          </div>
                        )}
                        <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          🕐 {formatDate(snap.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

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
                    placeholder="e.g. [2,7,11,15] target=9"
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
                  <label style={styles.label}>Total Marks</label>
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

              <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '13px',
                color: '#0369a1'
              }}>
                💡 After adding the question, go to the Questions tab to add test cases for evaluation.
              </div>

              <div style={styles.modalActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowQuestionModal(false)}>Cancel</button>
                <button type="submit" style={styles.submitBtn}>Add Question</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proctoring Snaps Modal */}
      {showProctorModal && (
        <div style={styles.overlay} onClick={() => setShowProctorModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>S3 Proctor Snapshots</h2>
                <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
                  Candidate: <strong>{selectedCandidateName}</strong>
                </p>
              </div>
              <button
                style={styles.closeBtn}
                onClick={() => setShowProctorModal(false)}
                onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                onMouseLeave={e => e.currentTarget.style.background = '#f5f5f5'}
              >✕</button>
            </div>

            <div style={{ padding: '20px', maxHeight: '600px', overflowY: 'auto' }}>
              {proctorSnaps.length === 0 ? (
                <div style={styles.empty}>
                  <div style={styles.emptyIcon}>📷</div>
                  <h3 style={styles.emptyTitle}>No snapshots available</h3>
                  <p style={styles.emptySub}>The candidate's webcam snapshots have not been uploaded to AWS S3 yet.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                  {proctorSnaps.map((snap) => (
                    <div key={snap.id} style={{ background: '#f8f9fa', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      <img src={snap.url} alt="Proctor Snap" style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                      <div style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                        {formatDate(snap.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Test Case Modal */}
      {showTestCaseModal && selectedQuestion && (
        <div style={styles.overlay} onClick={() => setShowTestCaseModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>Add Test Case</h2>
                <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
                  For: <strong>{selectedQuestion.title}</strong>
                </p>
              </div>
              <button
                style={styles.closeBtn}
                onClick={() => setShowTestCaseModal(false)}
                onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                onMouseLeave={e => e.currentTarget.style.background = '#f5f5f5'}
              >✕</button>
            </div>

            <form onSubmit={handleAddTestCase} style={styles.modalForm}>
              <div style={styles.field}>
                <label style={styles.label}>Input</label>
                <textarea
                  value={testCaseForm.input}
                  onChange={e => setTestCaseForm({ ...testCaseForm, input: e.target.value })}
                  style={{ ...styles.input, height: '100px', resize: 'none', fontFamily: 'monospace', fontSize: '13px' }}
                  placeholder="Enter input exactly as program receives from stdin"
                  required
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Expected Output</label>
                <textarea
                  value={testCaseForm.expectedOutput}
                  onChange={e => setTestCaseForm({ ...testCaseForm, expectedOutput: e.target.value })}
                  style={{ ...styles.input, height: '80px', resize: 'none', fontFamily: 'monospace', fontSize: '13px' }}
                  placeholder="Enter exact expected output"
                  required
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.field}>
                  <label style={styles.label}>Marks</label>
                  <input
                    type="number"
                    value={testCaseForm.marks}
                    onChange={e => setTestCaseForm({ ...testCaseForm, marks: parseInt(e.target.value) })}
                    style={styles.input}
                    min="1"
                    max="100"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Visibility</label>
                  <select
                    value={testCaseForm.isHidden}
                    onChange={e => setTestCaseForm({ ...testCaseForm, isHidden: e.target.value === 'true' })}
                    style={styles.input}
                  >
                    <option value="false">Visible — shown as sample</option>
                    <option value="true">Hidden — evaluation only</option>
                  </select>
                </div>
              </div>

              <div style={{
                background: '#fefce8',
                border: '1px solid #fde047',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '13px',
                color: '#854d0e'
              }}>
                ⚠️ Input and output must match exactly what the program reads/writes. Extra spaces or newlines will cause failures.
              </div>

              <div style={styles.modalActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowTestCaseModal(false)}>Cancel</button>
                <button type="submit" style={styles.submitBtn}>Add Test Case</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { minHeight: 'calc(100vh - 65px)', background: '#f0f4f8' },
  header: { background: 'linear-gradient(135deg, #0f0c29, #302b63)', padding: '30px 40px', color: 'white' },
  headerInner: { maxWidth: '1200px', margin: '0 auto 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
  backBtn: { background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' },
  headerTitle: { fontSize: '24px', fontWeight: '700', margin: '0 0 4px' },
  headerSub: { fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0 },
  headerRight: { display: 'flex', gap: '12px' },
  addQuestionBtn: { background: 'linear-gradient(135deg, #4fc3f7, #0288d1)', border: 'none', color: 'white', padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 15px rgba(79,195,247,0.3)' },
  leaderboardBtn: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '14px', maxWidth: '1200px', margin: '0 auto' },
  statCard: { background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(255,255,255,0.12)' },
  statIconBox: { width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statIcon: { fontSize: '18px' },
  statValue: { fontSize: '18px', fontWeight: '700', margin: 0 },
  statLabel: { fontSize: '10px', color: 'rgba(255,255,255,0.6)', margin: 0 },
  content: { maxWidth: '1200px', margin: '0 auto', padding: '30px 40px' },
  tabs: { display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' },
  tab: { padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s' },
  overviewGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  overviewCard: { background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: '16px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 20px' },
  emptyText: { fontSize: '14px', color: '#aaa', textAlign: 'center', padding: '20px 0' },
  langList: { display: 'flex', flexDirection: 'column', gap: '14px' },
  langItem: { display: 'flex', alignItems: 'center', gap: '12px' },
  langLeft: { display: 'flex', alignItems: 'center', gap: '8px', width: '90px' },
  langIcon: { fontSize: '18px' },
  langName: { fontSize: '13px', fontWeight: '500', color: '#444', textTransform: 'capitalize' },
  langBar: { flex: 1, height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' },
  langBarFill: { height: '100%', background: 'linear-gradient(135deg, #4fc3f7, #0288d1)', borderRadius: '4px', transition: 'width 0.5s ease' },
  langCount: { fontSize: '13px', fontWeight: '600', color: '#333', width: '30px', textAlign: 'right' },
  questionList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  questionItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8f9fa', borderRadius: '10px' },
  questionLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  diffDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  questionItemTitle: { fontSize: '13px', fontWeight: '500', color: '#333' },
  questionStats: { display: 'flex', gap: '12px', alignItems: 'center' },
  questionStat: { fontSize: '12px', color: '#888' },
  questionAccepted: { fontSize: '12px', fontWeight: '600' },
  questionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' },
  questionCard: { background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', transition: 'all 0.3s ease', cursor: 'pointer' },
  questionCardTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  diffBadge: { fontSize: '12px', fontWeight: '600', padding: '4px 12px', borderRadius: '20px', textTransform: 'capitalize' },
  marksBadge: { fontSize: '12px', fontWeight: '600', color: '#f59e0b', background: '#fef3c7', padding: '4px 10px', borderRadius: '20px' },
  questionCardTitle: { fontSize: '16px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 8px' },
  questionCardDesc: { fontSize: '13px', color: '#888', margin: '0 0 14px', lineHeight: '1.5' },
  sampleBox: { background: '#f8f9fa', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' },
  sampleLabel: { fontSize: '11px', fontWeight: '600', color: '#4fc3f7', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' },
  sampleCode: { fontSize: '12px', color: '#333', fontFamily: 'monospace', margin: 0, whiteSpace: 'pre-wrap' },
  testCaseSection: { marginTop: '14px', borderTop: '1px solid #f0f0f0', paddingTop: '12px' },
  testCaseHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  testCaseTitle: { fontSize: '12px', fontWeight: '700', color: '#4fc3f7', textTransform: 'uppercase', letterSpacing: '0.5px' },
  loadBtn: { fontSize: '11px', color: '#0288d1', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer', fontWeight: '600' },
  testCaseList: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' },
  noTestCaseText: { fontSize: '12px', color: '#aaa', margin: '0 0 8px', textAlign: 'center' },
  testCaseItem: { display: 'flex', alignItems: 'center', gap: '8px', background: '#f8f9fa', borderRadius: '8px', padding: '8px 10px', border: '1px solid #e0e0e0' },
  testCaseMeta: { display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' },
  testCaseNum: { fontSize: '11px', fontWeight: '700', color: '#555', background: '#e0e0e0', padding: '1px 6px', borderRadius: '4px' },
  testCaseVisibility: { fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '4px' },
  testCaseMarks: { fontSize: '11px', color: '#f59e0b', fontWeight: '600' },
  testCaseInput: { fontSize: '11px', fontFamily: 'monospace', color: '#555', margin: '0 0 2px' },
  testCaseOutput: { fontSize: '11px', fontFamily: 'monospace', color: '#10b981', margin: 0 },
  deleteBtn: { background: '#ef4444', border: 'none', borderRadius: '6px', color: 'white', fontSize: '13px', padding: '5px 8px', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 },
  addTestCaseBtn: { width: '100%', padding: '10px', background: '#f0f9ff', border: '1px dashed #4fc3f7', borderRadius: '10px', color: '#0288d1', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', marginTop: '4px' },
  tableWrapper: { background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' },
  tableHeader: { display: 'flex', alignItems: 'center', padding: '16px 24px', background: 'linear-gradient(135deg, #0f0c29, #302b63)', gap: '12px', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.8px' },
  tableRow: { display: 'flex', alignItems: 'center', padding: '14px 24px', gap: '12px', borderBottom: '1px solid #f5f5f5', transition: 'all 0.2s', cursor: 'pointer' },
  avatar: { width: '36px', height: '36px', background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: 'white', flexShrink: 0 },
  candidateName: { fontSize: '13px', fontWeight: '600', color: '#1a1a2e', margin: '0 0 2px' },
  candidateEmail: { fontSize: '11px', color: '#aaa', margin: 0 },
  questionTitle: { fontSize: '13px', color: '#555', margin: 0, fontWeight: '500' },
  langBadge: { fontSize: '12px', background: '#f0f4f8', color: '#555', padding: '4px 10px', borderRadius: '8px', fontWeight: '500' },
  statusBadge: { fontSize: '12px', fontWeight: '600', padding: '4px 12px', borderRadius: '20px', textTransform: 'capitalize' },
  scoreText: { fontSize: '14px', fontWeight: '700', color: '#1a1a2e' },
  dateText: { fontSize: '11px', color: '#aaa' },
  eventBadge: { fontSize: '12px', background: '#fef3c7', color: '#f59e0b', padding: '4px 10px', borderRadius: '8px', fontWeight: '500', textTransform: 'capitalize' },
  countBadge: { fontSize: '14px', fontWeight: '700', color: '#ef4444' },
  flaggedBadge: { fontSize: '12px', background: '#fee2e2', color: '#ef4444', padding: '4px 10px', borderRadius: '8px', fontWeight: '600' },
  safeBadge: { fontSize: '12px', background: '#d1fae5', color: '#10b981', padding: '4px 10px', borderRadius: '8px', fontWeight: '600' },
  detailsText: { fontSize: '12px', color: '#888', margin: 0 },
  empty: { textAlign: 'center', padding: '80px 20px', background: 'white', borderRadius: '20px' },
  emptyIcon: { fontSize: '60px', marginBottom: '16px' },
  emptyTitle: { fontSize: '20px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 8px' },
  emptySub: { fontSize: '14px', color: '#888', margin: '0 0 24px' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { background: 'white', borderRadius: '24px', padding: '36px', width: '100%', maxWidth: '640px', animation: 'modalIn 0.3s ease-out', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' },
  modalTitle: { fontSize: '20px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  closeBtn: { width: '32px', height: '32px', border: 'none', background: '#f5f5f5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s', flexShrink: 0 },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '16px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#444' },
  input: { padding: '10px 14px', border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '14px', outline: 'none', color: '#333', transition: 'border 0.2s' },
  modalActions: { display: 'flex', gap: '12px', marginTop: '8px' },
  cancelBtn: { flex: 1, padding: '12px', background: '#f5f5f5', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', color: '#666' },
  submitBtn: { flex: 1, padding: '12px', background: 'linear-gradient(135deg, #4fc3f7, #0288d1)', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: 'white', boxShadow: '0 4px 15px rgba(79,195,247,0.4)' }
};

export default ContestManagement;