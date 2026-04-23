import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const Leaderboard = () => {
  const { contestId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredRow, setHoveredRow] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await API.get(`/leaderboard/${contestId}`);
      setLeaderboard(res.data.leaderboard);
      setContest(res.data.contest);
    } catch (err) {
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (rank) => {
    switch (rank) {
      case 1: return { bg: 'linear-gradient(135deg, #FFD700, #FFA500)', color: 'white', icon: '🥇' };
      case 2: return { bg: 'linear-gradient(135deg, #C0C0C0, #A0A0A0)', color: 'white', icon: '🥈' };
      case 3: return { bg: 'linear-gradient(135deg, #CD7F32, #A0522D)', color: 'white', icon: '🥉' };
      default: return { bg: '#f0f4f8', color: '#555', icon: null };
    }
  };

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
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes trophy {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <button
            style={styles.backBtn}
            onClick={() => navigate(-1)}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            ← Back
          </button>

          <div style={styles.headerCenter}>
            <div style={styles.trophyIcon}>🏆</div>
            <div>
              <h1 style={styles.headerTitle}>Leaderboard</h1>
              <p style={styles.headerSub}>{contest?.title}</p>
            </div>
          </div>

          <div style={styles.liveTag}>
            <span style={styles.liveDot} />
            Live Rankings
          </div>
        </div>

        {/* Top 3 Podium */}
        {!loading && leaderboard.length >= 3 && (
          <div style={styles.podium}>
            {/* 2nd Place */}
            <div style={styles.podiumItem}>
              <div style={styles.podiumAvatar2}>
                {leaderboard[1]?.candidate?.name?.charAt(0).toUpperCase()}
              </div>
              <p style={styles.podiumName}>
                {leaderboard[1]?.candidate?.name}
              </p>
              <p style={styles.podiumScore}>
                {leaderboard[1]?.totalScore} pts
              </p>
              <div style={{ ...styles.podiumBlock, height: '80px', background: 'linear-gradient(135deg, #C0C0C0, #A0A0A0)' }}>
                🥈 2nd
              </div>
            </div>

            {/* 1st Place */}
            <div style={{ ...styles.podiumItem, marginBottom: '20px' }}>
              <div style={styles.podiumCrown}>👑</div>
              <div style={styles.podiumAvatar1}>
                {leaderboard[0]?.candidate?.name?.charAt(0).toUpperCase()}
              </div>
              <p style={styles.podiumName}>
                {leaderboard[0]?.candidate?.name}
              </p>
              <p style={styles.podiumScore}>
                {leaderboard[0]?.totalScore} pts
              </p>
              <div style={{ ...styles.podiumBlock, height: '110px', background: 'linear-gradient(135deg, #FFD700, #FFA500)' }}>
                🥇 1st
              </div>
            </div>

            {/* 3rd Place */}
            <div style={styles.podiumItem}>
              <div style={styles.podiumAvatar3}>
                {leaderboard[2]?.candidate?.name?.charAt(0).toUpperCase()}
              </div>
              <p style={styles.podiumName}>
                {leaderboard[2]?.candidate?.name}
              </p>
              <p style={styles.podiumScore}>
                {leaderboard[2]?.totalScore} pts
              </p>
              <div style={{ ...styles.podiumBlock, height: '60px', background: 'linear-gradient(135deg, #CD7F32, #A0522D)' }}>
                🥉 3rd
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.skeletonWrapper}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={styles.skeletonRow}>
                <div style={styles.skeletonCell} />
                <div style={{ ...styles.skeletonCell, width: '40%' }} />
                <div style={{ ...styles.skeletonCell, width: '15%' }} />
                <div style={{ ...styles.skeletonCell, width: '15%' }} />
              </div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>📊</div>
            <h3 style={styles.emptyTitle}>No rankings yet</h3>
            <p style={styles.emptySub}>
              Rankings will appear once candidates submit accepted solutions
            </p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            {/* Table Header */}
            <div style={styles.tableHeader}>
              <span style={{ ...styles.tableHeaderCell, width: '80px' }}>Rank</span>
              <span style={{ ...styles.tableHeaderCell, flex: 1 }}>Candidate</span>
              <span style={{ ...styles.tableHeaderCell, width: '120px', textAlign: 'center' }}>Score</span>
              <span style={{ ...styles.tableHeaderCell, width: '120px', textAlign: 'center' }}>Test Cases</span>
              <span style={{ ...styles.tableHeaderCell, width: '120px', textAlign: 'center' }}>Best Time</span>
              <span style={{ ...styles.tableHeaderCell, width: '100px', textAlign: 'center' }}>Submissions</span>
            </div>

            {/* Table Rows */}
            {leaderboard.map((entry, i) => {
              const rankStyle = getRankStyle(entry.rank);
              const isCurrentUser = entry.candidate?.email === user?.email;
              return (
                <div
                  key={entry.candidate?.id}
                  style={{
                    ...styles.tableRow,
                    background: isCurrentUser
                      ? 'linear-gradient(135deg, #e3f7ff, #f0fbff)'
                      : hoveredRow === i ? '#f8f9ff' : 'white',
                    border: isCurrentUser
                      ? '2px solid #4fc3f7'
                      : '1px solid #f0f0f0',
                    animation: `slideIn 0.3s ease-out ${i * 0.05}s both`
                  }}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {/* Rank */}
                  <div style={{ width: '80px', display: 'flex', alignItems: 'center' }}>
                    {entry.rank <= 3 ? (
                      <div style={{
                        ...styles.rankBadge,
                        background: rankStyle.bg,
                        color: rankStyle.color
                      }}>
                        {rankStyle.icon}
                      </div>
                    ) : (
                      <div style={styles.rankNumber}>#{entry.rank}</div>
                    )}
                  </div>

                  {/* Candidate */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      ...styles.avatar,
                      background: isCurrentUser
                        ? 'linear-gradient(135deg, #4fc3f7, #0288d1)'
                        : 'linear-gradient(135deg, #a78bfa, #7c3aed)'
                    }}>
                      {entry.candidate?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={styles.candidateName}>
                        {entry.candidate?.name}
                        {isCurrentUser && (
                          <span style={styles.youBadge}>You</span>
                        )}
                      </p>
                      <p style={styles.candidateEmail}>
                        {entry.candidate?.email}
                      </p>
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{ width: '120px', textAlign: 'center' }}>
                    <span style={styles.scoreValue}>
                      {entry.totalScore}
                    </span>
                    <span style={styles.scoreLabel}> pts</span>
                  </div>

                  {/* Test Cases */}
                  <div style={{ width: '120px', textAlign: 'center' }}>
                    <span style={styles.testCaseValue}>
                      {entry.totalPassed}
                    </span>
                    <span style={styles.testCaseLabel}> passed</span>
                  </div>

                  {/* Best Time */}
                  <div style={{ width: '120px', textAlign: 'center' }}>
                    <span style={styles.timeValue}>
                      {entry.bestTime ? `${entry.bestTime}ms` : '-'}
                    </span>
                  </div>

                  {/* Submissions */}
                  <div style={{ width: '100px', textAlign: 'center' }}>
                    <span style={styles.subCount}>
                      {entry.totalSubmissions}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Company shortlist button */}
        {user?.role === 'company' && leaderboard.length > 0 && (
          <div style={styles.shortlistSection}>
            <div style={styles.shortlistCard}>
              <div>
                <h3 style={styles.shortlistTitle}>Shortlist Candidates</h3>
                <p style={styles.shortlistSub}>
                  Download top performers for further rounds
                </p>
              </div>
              <div style={styles.shortlistBtns}>
                {[5, 10, 20].map(n => (
                  <button
                    key={n}
                    style={styles.shortlistBtn}
                    onClick={async () => {
                      try {
                        const res = await API.get(`/leaderboard/${contestId}/shortlist/${n}`);
                        toast.success(`Top ${n} candidates shortlisted!`);
                        console.log('Shortlisted:', res.data.shortlisted);
                      } catch (err) {
                        toast.error('Failed to shortlist');
                      }
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, #0288d1, #26c6da)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, #4fc3f7, #0288d1)'}
                  >
                    Top {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
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
    padding: '30px 40px 0',
    color: 'white'
  },
  headerInner: {
    maxWidth: '1000px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
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
  headerCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  trophyIcon: {
    fontSize: '40px',
    animation: 'trophy 2s ease-in-out infinite'
  },
  headerTitle: {
    fontSize: '26px',
    fontWeight: '700',
    margin: '0 0 4px'
  },
  headerSub: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    margin: 0
  },
  liveTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(16,185,129,0.15)',
    border: '1px solid rgba(16,185,129,0.3)',
    color: '#10b981',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600'
  },
  liveDot: {
    width: '8px',
    height: '8px',
    background: '#10b981',
    borderRadius: '50%',
    animation: 'pulse 1.5s ease-in-out infinite'
  },
  podium: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: '8px',
    maxWidth: '600px',
    margin: '0 auto',
    paddingBottom: '0'
  },
  podiumItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    animation: 'fadeIn 0.6s ease-out'
  },
  podiumCrown: {
    fontSize: '24px',
    animation: 'trophy 2s ease-in-out infinite'
  },
  podiumAvatar1: {
    width: '56px',
    height: '56px',
    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: 'bold',
    color: 'white',
    boxShadow: '0 4px 15px rgba(255,215,0,0.5)',
    border: '3px solid rgba(255,255,255,0.3)'
  },
  podiumAvatar2: {
    width: '48px',
    height: '48px',
    background: 'linear-gradient(135deg, #C0C0C0, #A0A0A0)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'white',
    boxShadow: '0 4px 15px rgba(192,192,192,0.5)',
    border: '3px solid rgba(255,255,255,0.3)'
  },
  podiumAvatar3: {
    width: '44px',
    height: '44px',
    background: 'linear-gradient(135deg, #CD7F32, #A0522D)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    boxShadow: '0 4px 15px rgba(205,127,50,0.5)',
    border: '3px solid rgba(255,255,255,0.3)'
  },
  podiumName: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'white',
    margin: 0,
    textAlign: 'center',
    maxWidth: '100px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  podiumScore: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.7)',
    margin: 0
  },
  podiumBlock: {
    width: '100%',
    borderRadius: '12px 12px 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    color: 'white'
  },
  content: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '40px'
  },
  tableWrapper: {
    background: 'white',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    animation: 'fadeIn 0.4s ease-out'
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #0f0c29, #302b63)',
    gap: '12px'
  },
  tableHeaderCell: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.8px'
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 24px',
    gap: '12px',
    borderBottom: '1px solid #f5f5f5',
    transition: 'all 0.2s',
    cursor: 'pointer',
    margin: '4px 8px',
    borderRadius: '12px'
  },
  rankBadge: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px'
  },
  rankNumber: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#888',
    width: '36px',
    textAlign: 'center'
  },
  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    flexShrink: 0
  },
  candidateName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a2e',
    margin: '0 0 2px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  candidateEmail: {
    fontSize: '12px',
    color: '#aaa',
    margin: 0
  },
  youBadge: {
    fontSize: '11px',
    background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: '600'
  },
  scoreValue: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1a1a2e'
  },
  scoreLabel: {
    fontSize: '12px',
    color: '#aaa'
  },
  testCaseValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#10b981'
  },
  testCaseLabel: {
    fontSize: '12px',
    color: '#aaa'
  },
  timeValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4fc3f7'
  },
  subCount: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#888'
  },
  skeletonWrapper: {
    background: 'white',
    borderRadius: '20px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  skeletonRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    padding: '8px 0'
  },
  skeletonCell: {
    height: '16px',
    width: '10%',
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '8px'
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
  shortlistSection: {
    marginTop: '24px'
  },
  shortlistCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '24px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
  },
  shortlistTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 4px'
  },
  shortlistSub: {
    fontSize: '13px',
    color: '#888',
    margin: 0
  },
  shortlistBtns: {
    display: 'flex',
    gap: '10px'
  },
  shortlistBtn: {
    background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
    border: 'none',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(79,195,247,0.3)'
  }
};

export default Leaderboard;