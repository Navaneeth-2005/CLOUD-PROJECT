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
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
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

  const fetchDiagnostics = async () => {
    setDiagnosticsLoading(true);
    try {
      const res = await API.get('/analytics/system-diagnostics');
      setDiagnosticsData(res.data);
    } catch (err) {
      toast.error('Failed to fetch EKS diagnostics');
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const handleOpenDiagnostics = () => {
    setShowDiagnostics(true);
    fetchDiagnostics();
  };

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

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Convert local IST time to ISO string (fixes timezone issue)
      const formData = {
        ...form,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString()
      };
      await API.post('/contests/create', formData);
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
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              style={styles.diagnosticsBtn}
              onClick={handleOpenDiagnostics}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              📊 EKS Diagnostics
            </button>
            <button
              style={styles.createBtn}
              onClick={() => setShowModal(true)}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              + Create Contest
            </button>
          </div>
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
                  <label style={styles.label}>Start Time (IST)</label>
                  <input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={e => setForm({ ...form, startTime: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>End Time (IST)</label>
                  <input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={e => setForm({ ...form, endTime: e.target.value })}
                    style={styles.input}
                    required
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
                🕐 All times are in IST (India Standard Time, UTC+5:30)
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

      {/* System Diagnostics Modal */}
      {showDiagnostics && (
        <div style={styles.overlay} onClick={() => setShowDiagnostics(false)}>
          <div style={{ ...styles.modal, maxWidth: '850px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>⚡ CloudWatch EKS Container Diagnostics</h2>
                <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0' }}>
                  Real-time cluster health, resource utilization, and live log stream
                </p>
              </div>
              <button
                style={styles.closeBtn}
                onClick={() => setShowDiagnostics(false)}
                onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                onMouseLeave={e => e.currentTarget.style.background = '#f5f5f5'}
              >
                ✕
              </button>
            </div>

            {diagnosticsLoading ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div style={{
                  width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #0288d1',
                  borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite'
                }} />
                <style>{`
                  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}</style>
                <p style={{ marginTop: '16px', color: '#666', fontSize: '14px', fontWeight: '500' }}>
                  Querying EKS cluster components and metrics...
                </p>
              </div>
            ) : diagnosticsData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  
                  {/* Database Card */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Amazon RDS MySQL</span>
                      <span style={{
                        fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px',
                        background: diagnosticsData.db.status === 'Connected' ? '#d1fae5' : '#fee2e2',
                        color: diagnosticsData.db.status === 'Connected' ? '#065f46' : '#991b1b'
                      }}>
                        {diagnosticsData.db.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748b', wordBreak: 'break-all', margin: '0 0 6px' }}>
                      Host: {diagnosticsData.db.host}
                    </p>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#0288d1', margin: 0 }}>
                      Latency Check: {diagnosticsData.db.latencyMs} ms
                    </p>
                  </div>

                  {/* SQS Card */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Amazon SQS Queue</span>
                      <span style={{
                        fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px',
                        background: '#bae6fd', color: '#0369a1'
                      }}>
                        {diagnosticsData.sqs.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 6px' }}>
                      Queue: codestorm-prod-queue
                    </p>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                      <div>
                        <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>QUEUED</span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>
                          {diagnosticsData.sqs.queueSize}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>PROCESSING</span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>
                          {diagnosticsData.sqs.inflightJobs}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Node Process Card */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>EKS Pod Vitals</span>
                      <span style={{
                        fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px',
                        background: '#e0f2fe', color: '#0369a1'
                      }}>
                        {diagnosticsData.system.isEks ? 'EKS Pod' : 'Local Dev'}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 6px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      ID: {diagnosticsData.system.hostName}
                    </p>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#059669', margin: 0 }}>
                      Memory Heap: {diagnosticsData.system.memory.heapUsedMb} / {diagnosticsData.system.memory.heapTotalMb} MB
                    </p>
                  </div>

                </div>

                {/* Second Row Vitals */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px 16px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                      <span style={{ color: '#64748b' }}>Amazon S3 Solution Bucket</span>
                      <span style={{ fontWeight: '600', color: '#334155' }}>{diagnosticsData.s3.bucket}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', padding: '6px 0' }}>
                      <span style={{ color: '#64748b' }}>Amazon SES Email Identity</span>
                      <span style={{ fontWeight: '600', color: '#334155' }}>Mumbai ({diagnosticsData.ses.region})</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px' }}>
                      <span style={{ color: '#64748b' }}>Uptime</span>
                      <span style={{ fontWeight: '600', color: '#334155' }}>{Math.floor(diagnosticsData.system.uptimeSec / 60)} minutes</span>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px 16px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                      <span style={{ color: '#64748b' }}>NodeJS Engine Version</span>
                      <span style={{ fontWeight: '600', color: '#334155' }}>{diagnosticsData.system.nodeVersion}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', padding: '6px 0' }}>
                      <span style={{ color: '#64748b' }}>OS Infrastructure</span>
                      <span style={{ fontWeight: '600', color: '#334155' }}>{diagnosticsData.system.platform} ({diagnosticsData.system.arch})</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px' }}>
                      <span style={{ color: '#64748b' }}>VPC LoadBalancer Host</span>
                      <span style={{ fontWeight: '600', color: '#334155' }}>codestorm-prod-alb-98231.ap-south-1.elb.amazonaws.com</span>
                    </div>
                  </div>
                </div>

                {/* CloudWatch Terminal Log Stream */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>💻</span> Live CloudWatch Container Log Stream
                  </h3>
                  <div style={{
                    background: '#0f172a', borderRadius: '16px', padding: '20px', height: '180px', overflowY: 'auto',
                    fontFamily: '"Fira Code", monospace, "Courier New"', fontSize: '11px', color: '#cbd5e1',
                    lineHeight: '1.6', border: '1px solid #334155', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
                  }}>
                    {diagnosticsData.logs.map((log, index) => {
                      let color = '#cbd5e1';
                      if (log.includes('INFO:')) color = '#38bdf8';
                      if (log.includes('SUCCESS:')) color = '#4ade80';
                      if (log.includes('HEALTHCHECK:')) color = '#fbbf24';
                      if (log.includes('DEBUG:')) color = '#c084fc';
                      return (
                        <div key={index} style={{ color, marginBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                          {log}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    onClick={fetchDiagnostics}
                    style={{
                      background: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '10px',
                      padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', gap: '6px'
                    }}
                  >
                    🔄 Refresh Metrics
                  </button>
                  <button
                    onClick={() => setShowDiagnostics(false)}
                    style={{
                      background: 'linear-gradient(135deg, #0f172a, #334155)', border: 'none', color: 'white',
                      borderRadius: '10px', padding: '8px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    Dismiss
                  </button>
                </div>

              </div>
            ) : null}

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
  diagnosticsBtn: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s'
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
    fontSize: '12px',
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