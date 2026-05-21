import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../api/axios';

const ResumeOptimizer = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState('Frontend Engineer');
  const [jobDescription, setJobDescription] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [checkedTasks, setCheckedTasks] = useState({});

  const [hoveredBack, setHoveredBack] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState(false);
  const [hoveredUpload, setHoveredUpload] = useState(false);

  const roles = [
    'Frontend Engineer',
    'Backend Engineer',
    'Fullstack Engineer',
    'DevOps Cloud Engineer',
    'Mobile iOS/Android Developer',
    'Data Scientist / AI Engineer',
    'Product Manager',
    'QA Automation Engineer'
  ];

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Only PDF resumes are supported.');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error('Please upload your Resume PDF!');
      return;
    }

    if (!jobDescription.trim()) {
      toast.error('Please paste the Target Job Description!');
      return;
    }

    try {
      setLoading(true);
      setResults(null);
      setCheckedTasks({});

      const formData = new FormData();
      formData.append('resume', file);
      formData.append('jobDescription', jobDescription);
      formData.append('targetRole', role);

      const res = await API.post('/prep/resume-scan', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setResults(res.data);
      toast.success('Resume match analysis completed! 📊');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to scan resume. Please check your network or try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (index) => {
    setCheckedTasks(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 50) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  return (
    <div style={s.container}>
      <div style={s.glowPurp}></div>
      <div style={s.glowCyan}></div>

      {/* Back to Prep */}
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

      <header style={s.header}>
        <h1 style={s.title}>Resume Scanner & <span style={s.titleAccent}>Job Matcher</span></h1>
        <p style={s.subtitle}>
          Upload your resume PDF and target job description to dynamically scan for ATS compatibility, keyword gaps, and get AI-optimized suggestions tailored for your target role.
        </p>
      </header>

      <div style={s.grid}>
        {/* Left Side: Inputs Form */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>🔍 Match Parameters</h2>
          <form onSubmit={handleScanSubmit} style={s.form}>
            {/* Input 1: Role Dropdown */}
            <div style={s.formGroup}>
              <label style={s.label}>Target Job Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={s.select}
              >
                {roles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Input 2: PDF File Upload */}
            <div style={s.formGroup}>
              <label style={s.label}>Upload Resume PDF</label>
              <label
                onMouseEnter={() => setHoveredUpload(true)}
                onMouseLeave={() => setHoveredUpload(false)}
                style={{
                  ...s.uploadZone,
                  borderColor: file ? '#10b981' : hoveredUpload ? '#06b6d4' : 'rgba(139,92,246,0.3)',
                  background: file ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.01)'
                }}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  style={s.hiddenInput}
                />
                <span style={s.uploadIcon}>{file ? '📄' : '📁'}</span>
                <span style={s.uploadTitle}>
                  {file ? file.name : 'Choose or Drag Resume PDF'}
                </span>
                <span style={s.uploadSub}>
                  {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB • Click to replace` : 'Only PDF formats supported'}
                </span>
              </label>
            </div>

            {/* Input 3: Job Description Textarea */}
            <div style={s.formGroup}>
              <label style={s.label}>Target Job Description</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description details, qualifications, and requirements here..."
                rows={7}
                style={s.textarea}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => setHoveredBtn(true)}
              onMouseLeave={() => setHoveredBtn(false)}
              style={{
                ...s.scanBtn,
                transform: hoveredBtn && !loading ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: hoveredBtn && !loading ? '0 12px 30px rgba(124,58,237,0.5)' : '0 4px 16px rgba(0,0,0,0.3)',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <div style={s.spinnerMini}></div>
                  <span>AI is Analyzing Document...</span>
                </div>
              ) : '⚡ Optimize & Scan Resume'}
            </button>
          </form>
        </div>

        {/* Right Side: Results Display */}
        <div style={s.card}>
          {!results && !loading && (
            <div style={s.emptyResults}>
              <span style={s.emptyIcon}>📊</span>
              <h3 style={s.emptyTitle}>Analysis Pending</h3>
              <p style={s.emptySubtitle}>Provide your target role, resume PDF, and target job description, and click scan to generate dynamic ATS optimizations.</p>
            </div>
          )}

          {loading && (
            <div style={s.emptyResults}>
              <div style={s.spinnerLarge}></div>
              <h3 style={{ ...s.emptyTitle, marginTop: 24 }}>Analyzing your Fit</h3>
              <p style={s.emptySubtitle}>Google Gemini 1.5 is scanning keywords, comparing skillsets, evaluating format strength, and generating tailored rephrase suggestions...</p>
            </div>
          )}

          {results && !loading && (
            <div style={s.resultsContainer}>
              {/* Circular Gauge Header */}
              <div style={s.gaugeRow}>
                <div style={s.gaugeWrapper}>
                  <div style={{ ...s.gaugeCircle, borderColor: getScoreColor(results.matchScore) }}>
                    <span style={s.gaugeScore}>{results.matchScore}%</span>
                    <span style={s.gaugeLabel}>Match</span>
                  </div>
                </div>
                <div>
                  <h2 style={s.matchTitle}>
                    {results.matchScore >= 80 ? 'Excellent Match! 🎉' : results.matchScore >= 50 ? 'Good Potential 👍' : 'Improvement Needed ⚠️'}
                  </h2>
                  <p style={s.matchDesc}>
                    Your resume matches {results.matchScore}% of critical requirements for a <strong>{role}</strong> position based on parsed requirements.
                  </p>
                </div>
              </div>

              {/* Found and Missing Skills */}
              <div style={s.section}>
                <h3 style={s.secTitle}>🛠 Skill Matching Analysis</h3>
                <div style={s.skillsGrid}>
                  <div>
                    <h4 style={{ ...s.subSecTitle, color: '#10b981' }}>✓ Matched Skills ({results.matchedSkills?.length || 0})</h4>
                    <div style={s.chipContainer}>
                      {results.matchedSkills?.map(skill => (
                        <span key={skill} style={{ ...s.chip, background: 'rgba(16,185,129,0.1)', color: '#a7f3d0', border: '1px solid rgba(16,185,129,0.3)' }}>{skill}</span>
                      ))}
                      {(!results.matchedSkills || results.matchedSkills.length === 0) && (
                        <div style={s.noneText}>No matching skills identified.</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ ...s.subSecTitle, color: '#f59e0b' }}>✗ Missing Keywords ({results.missingSkills?.length || 0})</h4>
                    <div style={s.chipContainer}>
                      {results.missingSkills?.map(skill => (
                        <span key={skill} style={{ ...s.chip, background: 'rgba(245,158,11,0.1)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.3)' }}>{skill}</span>
                      ))}
                      {(!results.missingSkills || results.missingSkills.length === 0) && (
                        <div style={s.noneText}>No missing high-priority skills found.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Strengths & Improvements */}
              <div style={s.section}>
                <h3 style={s.secTitle}>📝 Recruiter Feedback Matrix</h3>
                <div style={s.feedbackGrid}>
                  <div>
                    <h4 style={s.subSecTitle}>⭐ Key Strengths</h4>
                    <ul style={s.list}>
                      {results.strengths?.map((str, idx) => (
                        <li key={idx} style={s.listItem}><span style={{ color: '#10b981', marginRight: 8 }}>✓</span>{str}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 style={s.subSecTitle}>💡 Areas to Improve</h4>
                    <ul style={s.list}>
                      {results.improvements?.map((imp, idx) => (
                        <li key={idx} style={s.listItem}><span style={{ color: '#ef4444', marginRight: 8 }}>•</span>{imp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Custom Action Items */}
              <div style={s.section}>
                <h3 style={s.secTitle}>✅ ATS Optimization Action Items</h3>
                <div style={s.actionsList}>
                  {results.actionItems?.map((item, idx) => {
                    const isChecked = !!checkedTasks[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleTask(idx)}
                        style={{
                          ...s.actionCard,
                          background: isChecked ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                          borderColor: isChecked ? 'rgba(16,185,129,0.4)' : 'rgba(139,92,246,0.15)'
                        }}
                      >
                        <div style={{
                          ...s.checkbox,
                          background: isChecked ? '#10b981' : 'transparent',
                          borderColor: isChecked ? '#10b981' : '#94a3b8'
                        }}>
                          {isChecked && '✓'}
                        </div>
                        <span style={{
                          ...s.actionText,
                          textDecoration: isChecked ? 'line-through' : 'none',
                          color: isChecked ? '#94a3b8' : '#e2e8f0'
                        }}>{item}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Rephrase Suggestions */}
              {results.bulletPointSuggestions && results.bulletPointSuggestions.length > 0 && (
                <div style={s.section}>
                  <h3 style={s.secTitle}>✍️ High-Impact Bullet-Point Suggesters</h3>
                  <div style={s.bulletContainer}>
                    {results.bulletPointSuggestions.map((item, idx) => (
                      <div key={idx} style={s.bulletCard}>
                        <div style={s.bulletOriginal}>
                          <strong>Original Bullet Point:</strong>
                          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>"{item.original}"</p>
                        </div>
                        <div style={s.bulletSuggested}>
                          <strong>✨ AI-Optimized STAR Rewrite:</strong>
                          <p style={{ margin: '4px 0 0 0', color: '#06b6d4', fontWeight: 600, fontSize: 13.5 }}>"{item.suggested}"</p>
                        </div>
                        <div style={s.bulletReason}>
                          <strong>Recruiter insight:</strong> {item.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
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
    position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%',
    background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)',
    pointerEvents: 'none', zIndex: -1
  },
  glowCyan: {
    position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%',
    background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
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
    maxWidth: 800,
    lineHeight: 1.5,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
    gap: 32,
    alignItems: 'start'
  },
  card: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(139,92,246,0.2)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    borderRadius: 22,
    padding: '32px',
    backdropFilter: 'blur(16px)',
  },
  cardTitle: {
    fontSize: '22px',
    fontWeight: 800,
    marginBottom: 24,
    color: '#fff',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: 12
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  label: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  select: {
    background: 'rgba(15,15,28,0.95)',
    border: '1px solid rgba(139,92,246,0.25)',
    borderRadius: 12,
    padding: '14px 18px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
  uploadZone: {
    border: '2px dashed rgba(139,92,246,0.3)',
    borderRadius: 12,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
  },
  hiddenInput: {
    display: 'none'
  },
  uploadIcon: {
    fontSize: '28px',
    marginBottom: 10
  },
  uploadTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff'
  },
  uploadSub: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: 4
  },
  textarea: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(139,92,246,0.25)',
    borderRadius: 12,
    padding: '14px 18px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: "'Outfit', sans-serif",
    lineHeight: 1.5,
  },
  scanBtn: {
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    color: '#fff',
    border: 'none',
    padding: '16px 28px',
    borderRadius: 14,
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
    fontFamily: "'Outfit', sans-serif",
  },
  spinnerMini: {
    width: 18,
    height: 18,
    border: '2px solid rgba(255,255,255,0.2)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  spinnerLarge: {
    width: 52,
    height: 52,
    border: '4px solid rgba(139,92,246,0.1)',
    borderTop: '4px solid #06b6d4',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  emptyResults: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    minHeight: 450,
    padding: '0 20px'
  },
  emptyIcon: {
    fontSize: '56px',
    marginBottom: 20
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#fff',
    margin: '0 0 8px 0'
  },
  emptySubtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: 1.5,
    maxWidth: 380,
    margin: 0
  },
  resultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 32
  },
  gaugeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: 24
  },
  gaugeWrapper: {
    flexShrink: 0
  },
  gaugeCircle: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    border: '6px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.02)',
    boxShadow: '0 0 20px rgba(0,0,0,0.2)',
  },
  gaugeScore: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#fff'
  },
  gaugeLabel: {
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: 600,
    textTransform: 'uppercase',
    marginTop: 2
  },
  matchTitle: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#fff',
    margin: '0 0 6px 0'
  },
  matchDesc: {
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: 1.4,
    margin: 0
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  secTitle: {
    fontSize: '15px',
    fontWeight: 800,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    color: '#06b6d4',
    margin: 0,
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: 8
  },
  subSecTitle: {
    fontSize: '13px',
    fontWeight: 700,
    margin: '0 0 12px 0'
  },
  skillsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20
  },
  chipContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    fontSize: '11.5px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: 8,
  },
  noneText: {
    fontSize: '13px',
    color: '#64748b',
    fontStyle: 'italic'
  },
  feedbackGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  listItem: {
    fontSize: '13.5px',
    color: '#e2e8f0',
    lineHeight: 1.4,
    display: 'flex',
    alignItems: 'flex-start'
  },
  actionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  actionCard: {
    border: '1px solid',
    borderRadius: 12,
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 800,
    color: '#fff',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
  actionText: {
    fontSize: '13.5px',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  bulletContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18
  },
  bulletCard: {
    background: 'rgba(255,255,255,0.01)',
    border: '1px solid rgba(139,92,246,0.12)',
    borderRadius: 12,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  bulletOriginal: {
    fontSize: '12.5px',
    color: '#e2e8f0'
  },
  bulletSuggested: {
    fontSize: '12.5px',
    color: '#e2e8f0'
  },
  bulletReason: {
    fontSize: '12px',
    color: '#94a3b8',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    paddingTop: 8,
    marginTop: 2
  }
};

export default ResumeOptimizer;
