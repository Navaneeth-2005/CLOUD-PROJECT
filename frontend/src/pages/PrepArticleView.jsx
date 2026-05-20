import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const PrepArticleView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [contribution, setContribution] = useState(null);
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);

  // New doubt content
  const [newDoubtContent, setNewDoubtContent] = useState('');
  const [submittingDoubt, setSubmittingDoubt] = useState(false);

  // Replies editing states: stores parentDoubtId as key, reply content as value
  const [replyInputs, setReplyInputs] = useState({});
  const [activeReplyId, setActiveReplyId] = useState(null); // Which doubt has the active reply input open
  const [submittingReply, setSubmittingReply] = useState({});

  const [hoveredBack, setHoveredBack] = useState(false);

  useEffect(() => {
    fetchArticleData();
  }, [id]);

  const fetchArticleData = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/prep/contribution/${id}`);
      setContribution(res.data.contribution);
      setDoubts(res.data.doubts);
    } catch (err) {
      toast.error('Failed to load strategy details');
    } finally {
      setLoading(false);
    }
  };

  const handlePostDoubt = async (e) => {
    e.preventDefault();
    if (!newDoubtContent.trim()) return;

    try {
      setSubmittingDoubt(true);
      const res = await API.post(`/prep/contribution/${id}/doubt`, {
        content: newDoubtContent
      });
      toast.success('Doubt posted! The contributor will be notified.');
      setNewDoubtContent('');
      
      // Update local state directly with newly added doubt
      // Since it's a new doubt, it won't have any replies yet
      const addedDoubt = {
        ...res.data.doubt,
        replies: []
      };
      setDoubts(prev => [...prev, addedDoubt]);
    } catch (err) {
      toast.error('Failed to post question');
    } finally {
      setSubmittingDoubt(false);
    }
  };

  const handlePostReply = async (parentDoubtId) => {
    const replyContent = replyInputs[parentDoubtId];
    if (!replyContent || !replyContent.trim()) return;

    try {
      setSubmittingReply(prev => ({ ...prev, [parentDoubtId]: true }));
      const res = await API.post(`/prep/contribution/${id}/doubt`, {
        content: replyContent,
        parentDoubtId: parentDoubtId
      });
      toast.success('Reply posted successfully!');
      
      // Clear reply content
      setReplyInputs(prev => ({ ...prev, [parentDoubtId]: '' }));
      setActiveReplyId(null);

      // Update state in UI directly to show reply instantly
      setDoubts(prevDoubts => {
        return prevDoubts.map(d => {
          if (d.id === parentDoubtId) {
            return {
              ...d,
              replies: [...d.replies, res.data.doubt]
            };
          }
          return d;
        });
      });
    } catch (err) {
      toast.error('Failed to post reply');
    } finally {
      setSubmittingReply(prev => ({ ...prev, [parentDoubtId]: false }));
    }
  };

  const handleReplyInputChange = (doubtId, value) => {
    setReplyInputs(prev => ({
      ...prev,
      [doubtId]: value
    }));
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div style={s.loaderContainer}>
        <div style={s.spinner}></div>
        <p style={s.loaderText}>Retrieving strategy matrix...</p>
      </div>
    );
  }

  if (!contribution) {
    return (
      <div style={s.errorContainer}>
        <h3>Contribution not found</h3>
        <button style={s.errorBtn} onClick={() => navigate('/prep/dashboard')}>Return to Hub</button>
      </div>
    );
  }

  const isContributor = user?.id === contribution.userId;

  return (
    <div style={s.container}>
      {/* Background accents */}
      <div style={s.glowPurp}></div>
      <div style={s.glowCyan}></div>

      {/* Back Button */}
      <button
        onClick={() => navigate(`/prep/company/${encodeURIComponent(contribution.companyName)}`)}
        onMouseEnter={() => setHoveredBack(true)}
        onMouseLeave={() => setHoveredBack(false)}
        style={{
          ...s.backBtn,
          background: hoveredBack ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
          transform: hoveredBack ? 'translateX(-4px)' : 'translateX(0)'
        }}
      >
        ← Back to {contribution.companyName} Experiences
      </button>

      {/* Core Article Layout */}
      <article style={s.articleCard}>
        {/* Header Metadata */}
        <div style={s.articleHeader}>
          <div style={s.metaRow}>
            <span style={s.companyName}>{contribution.companyName}</span>
            <span style={{
              ...s.categoryBadge,
              background: contribution.companyType === 'product'
                ? 'rgba(168,85,247,0.15)'
                : contribution.companyType === 'service'
                ? 'rgba(59,130,246,0.15)'
                : 'rgba(16,185,129,0.15)',
              color: contribution.companyType === 'product'
                ? '#c084fc'
                : contribution.companyType === 'service'
                ? '#60a5fa'
                : '#34d399',
              border: contribution.companyType === 'product'
                ? '1px solid rgba(168,85,247,0.3)'
                : contribution.companyType === 'service'
                ? '1px solid rgba(59,130,246,0.3)'
                : '1px solid rgba(16,185,129,0.3)',
            }}>
              {contribution.companyType.toUpperCase()}
            </span>
          </div>

          <div style={s.contributorProfile}>
            <div style={s.avatar}>{getInitials(contribution.contributor?.name)}</div>
            <div>
              <div style={s.contributorName}>
                {contribution.contributor?.name || 'Anonymous Contributor'}
                {isContributor && <span style={s.youBadge}>You</span>}
              </div>
              <div style={s.timestampText}>Published on {formatDate(contribution.createdAt)}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={s.articleBody}>
          <section style={s.contentSection}>
            <h3 style={s.sectionTitle}>💡 Preparation Strategy & Tips</h3>
            <div style={s.paraText}>
              {contribution.tips.split('\n').map((para, idx) => (
                <p key={idx} style={s.paragraph}>{para}</p>
              ))}
            </div>
          </section>

          <section style={s.contentSection}>
            <h3 style={s.sectionTitle}>📚 Resources Followed</h3>
            <div style={s.resourcesContainer}>
              {contribution.resources.split('\n').map((resLine, idx) => (
                <div key={idx} style={s.resourceLine}>
                  <span style={s.bullet}>⚡</span>
                  <span style={s.resourceText}>{resLine}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </article>

      {/* Q&A Doubt Forum Section */}
      <section style={s.qaSection}>
        <div style={s.qaHeader}>
          <h2 style={s.qaTitle}>🙋 Q&A Doubt Clearing</h2>
          <span style={s.qaCountBadge}>{doubts.length} {doubts.length === 1 ? 'doubt' : 'doubts'}</span>
        </div>

        {/* New Question Form */}
        <div style={s.postDoubtCard}>
          <h4 style={s.postDoubtTitle}>Have a doubt about this company or strategy?</h4>
          <p style={s.postDoubtDesc}>Ask the contributor directly. Your doubt will be listed here, and they can reply to clarify.</p>
          
          <form onSubmit={handlePostDoubt} style={s.doubtForm}>
            <textarea
              value={newDoubtContent}
              onChange={(e) => setNewDoubtContent(e.target.value)}
              placeholder="Type your question or query in detail here..."
              required
              rows={3}
              style={s.qaTextarea}
            />
            <div style={s.formActions}>
              <button
                type="submit"
                disabled={submittingDoubt || !newDoubtContent.trim()}
                style={{
                  ...s.submitDoubtBtn,
                  opacity: submittingDoubt || !newDoubtContent.trim() ? 0.6 : 1,
                  cursor: submittingDoubt || !newDoubtContent.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {submittingDoubt ? 'Posting...' : '❓ Ask Doubt'}
              </button>
            </div>
          </form>
        </div>

        {/* Doubts List & Nested Replies */}
        {doubts.length === 0 ? (
          <div style={s.noDoubtsBox}>
            <p style={s.noDoubtsText}>No doubts raised yet. Be the first to start a conversation!</p>
          </div>
        ) : (
          <div style={s.doubtsTimeline}>
            {doubts.map((doubt) => {
              const isDoubtOpen = activeReplyId === doubt.id;
              
              return (
                <div key={doubt.id} style={s.doubtBlock}>
                  {/* Top-Level Doubt Post */}
                  <div style={s.doubtCard}>
                    <div style={s.doubtHeader}>
                      <div style={s.userHeaderLeft}>
                        <div style={s.doubtAvatar}>{getInitials(doubt.sender?.name)}</div>
                        <div>
                          <div style={s.doubtSenderName}>
                            {doubt.sender?.name}
                            {doubt.senderId === contribution.userId && (
                              <span style={s.authorBadge}>Contributor</span>
                            )}
                          </div>
                          <div style={s.doubtTime}>{formatDate(doubt.createdAt)}</div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          setActiveReplyId(isDoubtOpen ? null : doubt.id);
                          if (!replyInputs[doubt.id]) {
                            handleReplyInputChange(doubt.id, '');
                          }
                        }}
                        style={s.replyToggleBtn}
                      >
                        💬 {isDoubtOpen ? 'Cancel Reply' : 'Reply'}
                      </button>
                    </div>
                    
                    <div style={s.doubtContent}>
                      {doubt.content}
                    </div>
                  </div>

                  {/* Inline Reply Editor */}
                  {isDoubtOpen && (
                    <div style={s.replyFormCard}>
                      <textarea
                        value={replyInputs[doubt.id] || ''}
                        onChange={(e) => handleReplyInputChange(doubt.id, e.target.value)}
                        placeholder={`Reply to ${doubt.sender?.name}...`}
                        rows={2}
                        style={s.replyTextarea}
                      />
                      <div style={s.replyFormActions}>
                        <button
                          onClick={() => handlePostReply(doubt.id)}
                          disabled={submittingReply[doubt.id] || !(replyInputs[doubt.id] || '').trim()}
                          style={{
                            ...s.submitReplyBtn,
                            opacity: submittingReply[doubt.id] || !(replyInputs[doubt.id] || '').trim() ? 0.6 : 1
                          }}
                        >
                          {submittingReply[doubt.id] ? 'Posting...' : '⚡ Post Reply'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Nested Replies Rendering */}
                  {doubt.replies && doubt.replies.length > 0 && (
                    <div style={s.repliesSublist}>
                      {doubt.replies.map((reply) => {
                        const isAuthor = reply.senderId === contribution.userId;
                        return (
                          <div key={reply.id} style={{
                            ...s.replyCard,
                            borderLeft: isAuthor ? '2px solid #06b6d4' : '2px solid rgba(255,255,255,0.08)'
                          }}>
                            <div style={s.replyHeader}>
                              <div style={s.replyAvatar}>{getInitials(reply.sender?.name)}</div>
                              <div>
                                <div style={s.replySenderName}>
                                  {reply.sender?.name}
                                  {isAuthor && (
                                    <span style={s.authorBadge}>Contributor</span>
                                  )}
                                  {reply.senderId === user?.id && !isAuthor && (
                                    <span style={s.youBadge}>You</span>
                                  )}
                                </div>
                                <div style={s.replyTime}>{formatDate(reply.createdAt)}</div>
                              </div>
                            </div>
                            <div style={s.replyContent}>
                              {reply.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

const s = {
  container: {
    maxWidth: 880,
    margin: '0 auto',
    padding: '40px 24px 80px 24px',
    minHeight: 'calc(100vh - 66px)',
    fontFamily: "'Outfit', sans-serif",
    color: '#f1f5f9',
    position: 'relative',
  },
  glowPurp: {
    position: 'absolute', top: '10%', left: '-15%', width: '45%', height: '45%',
    background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
    pointerEvents: 'none', zIndex: -1
  },
  glowCyan: {
    position: 'absolute', bottom: '15%', right: '-15%', width: '45%', height: '45%',
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
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 66px)',
  },
  spinner: {
    width: 44,
    height: 44,
    border: '4px solid rgba(139,92,246,0.1)',
    borderTop: '4px solid #06b6d4',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: 20,
  },
  loaderText: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '100px 20px',
  },
  errorBtn: {
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    border: 'none',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: 10,
    cursor: 'pointer',
  },
  articleCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(139,92,246,0.15)',
    borderRadius: 24,
    padding: '36px',
    marginBottom: 48,
    backdropFilter: 'blur(16px)',
  },
  articleHeader: {
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: 28,
    marginBottom: 28,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  companyName: {
    fontSize: '28px',
    fontWeight: 800,
    letterSpacing: '-0.5px',
    color: '#fff',
  },
  categoryBadge: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 6,
    letterSpacing: '0.5px',
  },
  contributorProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: 800,
    color: '#fff',
    boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
  },
  contributorName: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  timestampText: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: 2,
  },
  youBadge: {
    fontSize: '10px',
    background: 'rgba(124,58,237,0.15)',
    border: '1px solid rgba(124,58,237,0.3)',
    color: '#c084fc',
    padding: '1px 6px',
    borderRadius: 5,
    fontWeight: 600,
  },
  articleBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 36,
  },
  contentSection: {},
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#06b6d4',
    textTransform: 'uppercase',
    letterSpacing: '1.2px',
    margin: '0 0 16px 0',
  },
  paraText: {},
  paragraph: {
    fontSize: '15px',
    color: '#e2e8f0',
    lineHeight: 1.7,
    margin: '0 0 16px 0',
  },
  resourcesContainer: {
    background: 'rgba(255,255,255,0.01)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: '24px',
  },
  resourceLine: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  bullet: {
    fontSize: '13px',
    color: '#a855f7',
    marginTop: 2,
  },
  resourceText: {
    fontSize: '14.5px',
    color: '#cbd5e1',
    lineHeight: 1.5,
  },
  qaSection: {},
  qaHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
    borderBottom: '1px solid rgba(139,92,246,0.15)',
    paddingBottom: 16,
  },
  qaTitle: {
    fontSize: '22px',
    fontWeight: 800,
    margin: 0,
    color: '#fff',
  },
  qaCountBadge: {
    background: 'rgba(6,182,212,0.15)',
    border: '1px solid rgba(6,182,212,0.3)',
    color: '#06b6d4',
    fontSize: '12px',
    fontWeight: 700,
    padding: '3px 9px',
    borderRadius: 6,
  },
  postDoubtCard: {
    background: 'rgba(255,255,255,0.01)',
    border: '1px dashed rgba(139,92,246,0.25)',
    borderRadius: 20,
    padding: '28px',
    marginBottom: 36,
  },
  postDoubtTitle: {
    fontSize: '16px',
    fontWeight: 700,
    margin: '0 0 4px 0',
    color: '#fff',
  },
  postDoubtDesc: {
    fontSize: '12.5px',
    color: '#94a3b8',
    margin: '0 0 20px 0',
  },
  doubtForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  qaTextarea: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 12,
    padding: '14px 18px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: "'Outfit', sans-serif",
    lineHeight: 1.5,
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  submitDoubtBtn: {
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: 12,
    fontSize: '13.5px',
    fontWeight: 700,
    transition: 'all 0.2s ease',
    fontFamily: "'Outfit', sans-serif",
  },
  noDoubtsBox: {
    textAlign: 'center',
    padding: '40px 20px',
    background: 'rgba(255,255,255,0.01)',
    border: '1px solid rgba(255,255,255,0.03)',
    borderRadius: 16,
  },
  noDoubtsText: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  doubtsTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
  },
  doubtBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  doubtCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: '20px 24px',
  },
  doubtHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 12,
  },
  userHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  doubtAvatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 800,
  },
  doubtSenderName: {
    fontSize: '14.5px',
    fontWeight: 700,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  authorBadge: {
    fontSize: '9.5px',
    background: 'rgba(6,182,212,0.15)',
    border: '1px solid rgba(6,182,212,0.4)',
    color: '#06b6d4',
    padding: '1px 6px',
    borderRadius: 5,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  doubtTime: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: 2,
  },
  replyToggleBtn: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#94a3b8',
    padding: '6px 14px',
    borderRadius: 8,
    fontSize: '12.5px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: "'Outfit', sans-serif",
  },
  doubtContent: {
    fontSize: '14.5px',
    color: '#e2e8f0',
    lineHeight: 1.6,
  },
  replyFormCard: {
    marginLeft: 40,
    background: 'rgba(255,255,255,0.01)',
    border: '1px solid rgba(139,92,246,0.15)',
    borderRadius: 14,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  replyTextarea: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: '13.5px',
    resize: 'vertical',
    fontFamily: "'Outfit', sans-serif",
    lineHeight: 1.5,
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: 8,
  },
  replyFormActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  submitReplyBtn: {
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    color: '#fff',
    border: 'none',
    padding: '8px 18px',
    borderRadius: 8,
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
  repliesSublist: {
    marginLeft: 40,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    borderLeft: '1px dashed rgba(255,255,255,0.06)',
    paddingLeft: 16,
  },
  replyCard: {
    background: 'rgba(255,255,255,0.01)',
    border: '1px solid rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: '14px 18px',
  },
  replyHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 800,
  },
  replySenderName: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  replyTime: {
    fontSize: '10px',
    color: '#64748b',
  },
  replyContent: {
    fontSize: '13.5px',
    color: '#cbd5e1',
    lineHeight: 1.5,
    paddingLeft: 38,
  },
};

export default PrepArticleView;
