import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const PrepDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'product', 'service', 'startup'
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    companyType: 'product',
    tips: '',
    resources: ''
  });

  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredBtn, setHoveredBtn] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await API.get('/prep/companies');
      setCompanies(res.data);
    } catch (err) {
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleContributeSubmit = async (e) => {
    e.preventDefault();
    const { companyName, companyType, tips, resources } = formData;

    if (!companyName.trim() || !tips.trim() || !resources.trim()) {
      toast.error('All fields are required!');
      return;
    }

    try {
      setSubmitting(true);
      await API.post('/prep/contribute', formData);
      toast.success('Successfully shared your experience! Thank you for contributing 🎓');
      setShowModal(false);
      setFormData({
        companyName: '',
        companyType: 'product',
        tips: '',
        resources: ''
      });
      fetchCompanies(); // Refresh company list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit contribution');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter companies based on search and selected tab
  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeTab === 'all' || c.companyType === activeTab;
    return matchesSearch && matchesCategory;
  });

  // Unique company count helper
  const getCategoryCount = (type) => {
    if (type === 'all') return companies.length;
    return companies.filter(c => c.companyType === type).length;
  };

  return (
    <div style={s.container}>
      {/* Background visual accents */}
      <div style={s.glowPurp}></div>
      <div style={s.glowCyan}></div>

      {/* Header Panel */}
      <header style={s.header}>
        <div>
          <h1 style={s.title}>Interview Preparation <span style={s.titleAccent}>Hub</span></h1>
          <p style={s.subtitle}>Accelerate your career. Read premium strategies from peers or contribute your own path to success.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            ...s.contributeBtn,
            transform: hoveredBtn ? 'translateY(-2px) scale(1.02)' : 'translateY(0)',
            boxShadow: hoveredBtn ? '0 12px 30px rgba(124,58,237,0.5)' : '0 4px 16px rgba(124,58,237,0.3)',
          }}
          onMouseEnter={() => setHoveredBtn(true)}
          onMouseLeave={() => setHoveredBtn(false)}
        >
          📢 Share Your Strategy
        </button>
      </header>

      {/* Subnav & Filters */}
      <div style={s.filterRow}>
        {/* Search */}
        <div style={s.searchContainer}>
          <span style={s.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search companies by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={s.searchInput}
          />
        </div>

        {/* Categorized Tabs */}
        <div style={s.tabContainer}>
          {['all', 'product', 'service', 'startup'].map((tab) => {
            const isActive = activeTab === tab;
            const isHovered = hoveredTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                onMouseEnter={() => setHoveredTab(tab)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  ...s.tabButton,
                  background: isActive 
                    ? 'linear-gradient(135deg, #7c3aed, #06b6d4)' 
                    : isHovered 
                    ? 'rgba(255,255,255,0.06)' 
                    : 'rgba(255,255,255,0.02)',
                  color: isActive ? '#fff' : '#94a3b8',
                  border: isActive ? '1px solid transparent' : '1px solid rgba(139,92,246,0.15)',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span style={{
                  ...s.tabBadge,
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(124,58,237,0.15)',
                  color: isActive ? '#fff' : '#a855f7'
                }}>
                  {getCategoryCount(tab)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Companies Grid */}
      {loading ? (
        <div style={s.loadingBox}>
          <div style={s.spinner}></div>
          <p style={s.loadingText}>Structuring preparation matrices...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div style={s.emptyState}>
          <span style={s.emptyIcon}>🏢</span>
          <h3 style={s.emptyTitle}>No Companies Found</h3>
          <p style={s.emptySubtitle}>Be the first to contribute or try a different search filter!</p>
          <button style={s.emptyBtn} onClick={() => setShowModal(true)}>Contribute Experience Now</button>
        </div>
      ) : (
        <div style={s.grid}>
          {filteredCompanies.map((c, i) => {
            const isHovered = hoveredCard === i;
            return (
              <div
                key={`${c.companyName}-${c.companyType}`}
                onClick={() => navigate(`/prep/company/${encodeURIComponent(c.companyName)}`)}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  ...s.card,
                  transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
                  boxShadow: isHovered ? '0 16px 36px rgba(124,58,237,0.25)' : '0 4px 20px rgba(0,0,0,0.3)',
                  border: isHovered ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(139,92,246,0.2)',
                }}
              >
                <div style={s.cardHeader}>
                  <h3 style={s.cardName}>{c.companyName}</h3>
                  <span style={{
                    ...s.categoryBadge,
                    background: c.companyType === 'product'
                      ? 'rgba(168,85,247,0.15)'
                      : c.companyType === 'service'
                      ? 'rgba(59,130,246,0.15)'
                      : 'rgba(16,185,129,0.15)',
                    color: c.companyType === 'product'
                      ? '#c084fc'
                      : c.companyType === 'service'
                      ? '#60a5fa'
                      : '#34d399',
                    border: c.companyType === 'product'
                      ? '1px solid rgba(168,85,247,0.3)'
                      : c.companyType === 'service'
                      ? '1px solid rgba(59,130,246,0.3)'
                      : '1px solid rgba(16,185,129,0.3)',
                  }}>
                    {c.companyType.toUpperCase()}
                  </span>
                </div>
                <div style={s.cardBody}>
                  <div style={s.statRow}>
                    <span style={s.statIcon}>📝</span>
                    <span style={s.statText}>
                      <strong>{c.contributionCount}</strong> {c.contributionCount === 1 ? 'experience' : 'experiences'} shared
                    </span>
                  </div>
                </div>
                <div style={{
                  ...s.cardFooter,
                  color: isHovered ? '#06b6d4' : '#a855f7'
                }}>
                  Explore preparation roadmap →
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contribution Modal */}
      {showModal && (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>📢 Share Prep Strategy</h2>
              <button style={s.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleContributeSubmit} style={s.modalForm}>
              <div style={s.formGroup}>
                <label style={s.label}>Company Name *</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="e.g. Google, Amazon, Infosys..."
                  required
                  style={s.input}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Company Classification *</label>
                <select
                  name="companyType"
                  value={formData.companyType}
                  onChange={handleInputChange}
                  style={s.select}
                >
                  <option value="product">Product-Based (e.g. Microsoft, Uber)</option>
                  <option value="service">Service-Based (e.g. TCS, Wipro)</option>
                  <option value="startup">Startup (e.g. Razorpay, Swiggy)</option>
                </select>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Interview Strategy & Tips *</label>
                <p style={s.fieldDescription}>Explain the interview structure, key questions asked, core topics, and tips to crack each round.</p>
                <textarea
                  name="tips"
                  value={formData.tips}
                  onChange={handleInputChange}
                  placeholder="Describe your interview rounds, question patterns, and helpful guidelines..."
                  required
                  rows={5}
                  style={s.textarea}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Preparation Resources *</label>
                <p style={s.fieldDescription}>List websites, books, courses, code problems, or sheets you followed for preparation.</p>
                <textarea
                  name="resources"
                  value={formData.resources}
                  onChange={handleInputChange}
                  placeholder="e.g. Striver's SDE Sheet, LeetCode top interview questions, GeeksforGeeks, etc."
                  required
                  rows={3}
                  style={s.textarea}
                />
              </div>

              <div style={s.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={s.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={s.submitBtn}
                >
                  {submitting ? 'Publishing...' : '⚡ Share Strategy'}
                </button>
              </div>
            </form>
          </div>
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
    overflow: 'hidden',
  },
  glowPurp: {
    position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%',
    background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
    pointerEvents: 'none', zIndex: -1
  },
  glowCyan: {
    position: 'absolute', bottom: '10%', right: '-10%', width: '50%', height: '50%',
    background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
    pointerEvents: 'none', zIndex: -1
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
    marginBottom: 44,
    borderBottom: '1px solid rgba(139,92,246,0.15)',
    paddingBottom: 32,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '38px',
    fontWeight: 800,
    letterSpacing: '-1px',
    margin: '0 0 10px 0',
    background: '#fff',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  titleAccent: {
    background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '16px',
    color: '#94a3b8',
    margin: 0,
    maxWidth: 600,
    lineHeight: 1.5,
  },
  contributeBtn: {
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    color: '#fff',
    border: 'none',
    padding: '14px 28px',
    borderRadius: 14,
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
    fontFamily: "'Outfit', sans-serif",
  },
  filterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 24,
    marginBottom: 36,
    flexWrap: 'wrap',
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 14,
    padding: '10px 18px',
    width: '100%',
    maxWidth: 420,
    backdropFilter: 'blur(10px)',
  },
  searchIcon: {
    marginRight: 10,
    fontSize: '16px',
    color: '#94a3b8',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: '15px',
    width: '100%',
    fontFamily: "'Outfit', sans-serif",
  },
  tabContainer: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  tabButton: {
    border: '1px solid rgba(139,92,246,0.15)',
    padding: '10px 20px',
    borderRadius: 12,
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'all 0.25s ease',
    fontFamily: "'Outfit', sans-serif",
  },
  tabBadge: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 6,
    transition: 'all 0.25s ease',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 0',
  },
  spinner: {
    width: 48,
    height: 48,
    border: '4px solid rgba(139,92,246,0.1)',
    borderTop: '4px solid #06b6d4',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: '15px',
    color: '#94a3b8',
    letterSpacing: '0.5px',
  },
  emptyState: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px dashed rgba(139,92,246,0.2)',
    borderRadius: 20,
    padding: '60px 40px',
    textAlign: 'center',
    maxWidth: 500,
    margin: '40px auto 0 auto',
    backdropFilter: 'blur(10px)',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: 700,
    margin: '0 0 8px 0',
    color: '#fff',
  },
  emptySubtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '0 0 24px 0',
    lineHeight: 1.5,
  },
  emptyBtn: {
    background: 'rgba(124,58,237,0.1)',
    border: '1px solid rgba(124,58,237,0.4)',
    color: '#c084fc',
    padding: '10px 22px',
    borderRadius: 10,
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: "'Outfit', sans-serif",
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 24,
  },
  card: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 18,
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.25,0.8,0.25,1)',
    display: 'flex',
    flexDirection: 'column',
    backdropFilter: 'blur(16px)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  cardName: {
    fontSize: '21px',
    fontWeight: 700,
    margin: 0,
    color: '#fff',
    letterSpacing: '-0.3px',
  },
  categoryBadge: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 6,
    letterSpacing: '0.5px',
  },
  cardBody: {
    flexGrow: 1,
    marginBottom: 20,
  },
  statRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  statIcon: {
    fontSize: '16px',
  },
  statText: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  cardFooter: {
    fontSize: '13px',
    fontWeight: 700,
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: 16,
    transition: 'color 0.2s ease',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(8,8,16,0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'rgba(15,15,28,0.95)',
    border: '1px solid rgba(139,92,246,0.3)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
    borderRadius: 24,
    width: '90%',
    maxWidth: 640,
    padding: 32,
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
    fontFamily: "'Outfit', sans-serif",
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 800,
    margin: 0,
    background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'color 0.2s ease',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  fieldDescription: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: '0 0 4px 0',
    lineHeight: 1.4,
  },
  input: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(139,92,246,0.25)',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    fontFamily: "'Outfit', sans-serif",
  },
  select: {
    background: 'rgba(15,15,28,0.95)',
    border: '1px solid rgba(139,92,246,0.25)',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
  textarea: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(139,92,246,0.25)',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: "'Outfit', sans-serif",
    lineHeight: 1.5,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#94a3b8',
    padding: '12px 24px',
    borderRadius: 12,
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: "'Outfit', sans-serif",
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: 12,
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
    fontFamily: "'Outfit', sans-serif",
  },
};

// Add standard global animations
const styles = document.createElement('style');
styles.innerHTML = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styles);

export default PrepDashboard;
