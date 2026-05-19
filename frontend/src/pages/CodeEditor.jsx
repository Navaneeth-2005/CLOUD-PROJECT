import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { toast } from 'react-toastify';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CodeEditor = () => {
  const { contestId, questionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(null);
  const [contest, setContest] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [activePanel, setActivePanel] = useState('problem');
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSubmitContestModal, setShowSubmitContestModal] = useState(false);
  const [submittingContest, setSubmittingContest] = useState(false);
  const [hintsData, setHintsData] = useState(null);
  const [loadingHints, setLoadingHints] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockingHint, setUnlockingHint] = useState(false);

  const timerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const proctorStreamRef = useRef(null);
  const proctorIntervalRef = useRef(null);
  const tabSwitchCount = useRef(0);

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

  // Generate default code template based on language and question
  const getDefaultCode = (lang, q) => {
    const title = q?.title || 'Solution';
    const difficulty = q?.difficulty || 'medium';
    const sampleInput = q?.sampleInput || '';
    const sampleOutput = q?.sampleOutput || '';

    const templates = {
      python:
`# Problem: ${title}
# Difficulty: ${difficulty}
#
# Sample Input:
${sampleInput ? sampleInput.split('\n').map(l => `#   ${l}`).join('\n') : '#   (see problem statement)'}
# Sample Output:
${sampleOutput ? sampleOutput.split('\n').map(l => `#   ${l}`).join('\n') : '#   (see problem statement)'}

import sys
input = sys.stdin.readline

def solve():
    # Read your input here
    # e.g: n = int(input())
    # e.g: arr = list(map(int, input().split()))

    # Write your solution here

    # Print your answer
    # e.g: print(answer)

solve()
`,
      java:
`// Problem: ${title}
// Difficulty: ${difficulty}
//
// Sample Input:
${sampleInput ? sampleInput.split('\n').map(l => `//   ${l}`).join('\n') : '//   (see problem statement)'}
// Sample Output:
${sampleOutput ? sampleOutput.split('\n').map(l => `//   ${l}`).join('\n') : '//   (see problem statement)'}

import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));

        // Read your input here
        // e.g: int n = Integer.parseInt(br.readLine().trim());
        // e.g: StringTokenizer st = new StringTokenizer(br.readLine());
        // e.g: int a = Integer.parseInt(st.nextToken());

        // Write your solution here

        // Print your answer
        // e.g: System.out.println(answer);
    }
}
`,
      'c++':
`// Problem: ${title}
// Difficulty: ${difficulty}
//
// Sample Input:
${sampleInput ? sampleInput.split('\n').map(l => `//   ${l}`).join('\n') : '//   (see problem statement)'}
// Sample Output:
${sampleOutput ? sampleOutput.split('\n').map(l => `//   ${l}`).join('\n') : '//   (see problem statement)'}

#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // Read your input here
    // e.g: int n; cin >> n;
    // e.g: vector<int> arr(n);
    // e.g: for(auto& x : arr) cin >> x;

    // Write your solution here

    // Print your answer
    // e.g: cout << answer << endl;

    return 0;
}
`
    };
    return templates[lang] || templates.python;
  };

  // Fetch data when question changes
  useEffect(() => {
    fetchData();
  }, [contestId, questionId]);

  // Setup anti-cheat ONLY once
  useEffect(() => {
    setupAntiCheat();
    setupProctoring();

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(proctorIntervalRef.current);
      if (proctorStreamRef.current) {
        proctorStreamRef.current.getTracks().forEach(track => track.stop());
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Update code when language OR question changes
  useEffect(() => {
    setCode(getDefaultCode(language, question));
  }, [language, question]);

  const fetchData = async () => {
    try {
      const contestRes = await API.get(`/contests/${contestId}`);
      setContest(contestRes.data.contest);
      const allQuestions = contestRes.data.contest.questions || [];
      setQuestions(allQuestions);

      const q = allQuestions.find(
        q => String(q.id) === String(questionId)
      );
      const foundQuestion = q || allQuestions[0];
      setQuestion(foundQuestion);
      setCode(getDefaultCode(language, foundQuestion));

      clearInterval(timerRef.current);
      const endTime = new Date(contestRes.data.contest.endTime);
      startTimer(endTime);
    } catch (err) {
      toast.error('Failed to load question');
    }
  };

  const startTimer = (endTime) => {
    timerRef.current = setInterval(() => {
      const now = new Date();
      const diff = endTime - now;
      if (diff <= 0) {
        clearInterval(timerRef.current);
        setTimeLeft('00:00:00');
        toast.error('Contest time is up!');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(
        `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    }, 1000);
  };

  const handleVisibilityChange = async () => {
    if (document.hidden) {
      tabSwitchCount.current += 1;
      try {
        await API.post('/cheating/log', {
          contestId: parseInt(contestId),
          eventType: 'tab_switch',
          details: `Tab switch #${tabSwitchCount.current}`
        });
        if (tabSwitchCount.current >= 3) {
          toast.error('Warning: You have been flagged for tab switching!', {
            autoClose: false
          });
        } else {
          toast.warning(`Warning: Tab switch detected! (${tabSwitchCount.current}/3)`);
        }
      } catch (err) {
        console.error('Failed to log cheating event');
      }
    }
  };

  const handleContextMenu = (e) => e.preventDefault();

  const setupAntiCheat = () => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
  };

  const setupProctoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      proctorStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Take snapshot every 3 minutes (180000ms)
      proctorIntervalRef.current = setInterval(captureProctorSnapshot, 180000);
      
      // Take an initial snapshot after 5 seconds to ensure video is ready
      setTimeout(captureProctorSnapshot, 5000);
    } catch (err) {
      console.error('Webcam access denied', err);
      toast.warning('Webcam access is required for proctoring. Please enable it.');
    }
  };

  const captureProctorSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current || !contestId) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const formData = new FormData();
        formData.append('contestId', contestId);
        formData.append('snapshot', blob, 'snapshot.jpeg');
        
        await API.post('/proctor/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        // Silently succeed
      } catch (err) {
        console.error('Proctor snapshot upload failed', err);
      }
    }, 'image/jpeg', 0.8);
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error('Please write some code before submitting!');
      return;
    }
    setSubmitting(true);
    setSubmissionResult(null);
    try {
      const res = await API.post('/submissions/submit', {
        contestId: parseInt(contestId),
        questionId: parseInt(questionId),
        language,
        code
      });
      toast.success('Code submitted successfully!');
      setSubmissionResult({
        id: res.data.submissionId,
        status: res.data.status
      });
      setActivePanel('result');
      pollStatus(res.data.submissionId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const pollStatus = (submissionId) => {
    const interval = setInterval(async () => {
      try {
        const res = await API.get(`/submissions/status/${submissionId}`);
        const status = res.data.submission.status;
        setSubmissionResult(res.data.submission);
        if (status !== 'pending' && status !== 'running') {
          clearInterval(interval);
        }
      } catch (err) {
        clearInterval(interval);
      }
    }, 2000);
  };

  const fetchQuestionHints = async () => {
    if (!questionId) return;
    setLoadingHints(true);
    try {
      const res = await API.get(`/contests/question/${questionId}/ai-hints`);
      setHintsData(res.data);
    } catch (err) {
      console.error('Failed to fetch hints:', err.message);
    } finally {
      setLoadingHints(false);
    }
  };

  const unlockAlgorithmHint = async () => {
    setUnlockingHint(true);
    try {
      const res = await API.post('/registration/unlock-hint', {
        contestId: parseInt(contestId),
        questionId: parseInt(questionId)
      });
      toast.success(res.data.message);
      setShowUnlockModal(false);
      setHintsData(prev => ({ ...prev, hasUnlockedAlgorithm: true }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unlock hint');
    } finally {
      setUnlockingHint(false);
    }
  };



  useEffect(() => {
    if (activePanel === 'hints') {
      fetchQuestionHints();
    } else {
      setHintsData(null);
    }
  }, [activePanel, questionId]);

  const handleSubmitContest = async () => {
    setSubmittingContest(true);
    try {
      const res = await API.post('/registration/submit-contest', {
        contestId: parseInt(contestId)
      });
      toast.success(`Contest submitted! Final Score: ${res.data.finalScore} pts 🎉`);
      setShowSubmitContestModal(false);
      navigate('/candidate/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit contest');
    } finally {
      setSubmittingContest(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'accepted': return { color: '#10b981', bg: '#d1fae5', icon: '✅' };
      case 'rejected': return { color: '#ef4444', bg: '#fee2e2', icon: '❌' };
      case 'pending': return { color: '#f59e0b', bg: '#fef3c7', icon: '⏳' };
      case 'running': return { color: '#3b82f6', bg: '#dbeafe', icon: '⚙️' };
      case 'error': return { color: '#ef4444', bg: '#fee2e2', icon: '🔥' };
      default: return { color: '#888', bg: '#f5f5f5', icon: '❓' };
    }
  };

  const getTimerColor = () => {
    if (!timeLeft) return '#4fc3f7';
    const parts = timeLeft.split(':');
    const totalSecs = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    if (totalSecs < 300) return '#ef4444';
    if (totalSecs < 900) return '#f59e0b';
    return '#4fc3f7';
  };

  return (
    <div style={styles.page}>
      {/* Hidden elements for proctoring */}
      <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <button
            style={styles.backBtn}
            onClick={() => setShowExitModal(true)}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,107,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            ← Back
          </button>
          <div style={styles.contestInfo}>
            <span style={styles.contestName}>{contest?.title}</span>
            <span style={styles.separator}>›</span>
            <span style={styles.questionName}>{question?.title}</span>
          </div>
        </div>

        <div style={styles.topCenter}>
          <div style={{
            ...styles.timer,
            color: getTimerColor(),
            borderColor: getTimerColor(),
            animation: getTimerColor() === '#ef4444' ? 'pulse 1s ease-in-out infinite' : 'none'
          }}>
            ⏱ {timeLeft || '--:--:--'}
          </div>
        </div>

        <div style={styles.topRight}>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            style={styles.langSelect}
          >
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="c++">C++</option>
          </select>
          <button
            style={{
              ...styles.submitBtn,
              opacity: submitting ? 0.7 : 1
            }}
            onClick={handleSubmit}
            disabled={submitting}
            onMouseEnter={e => !submitting && (e.currentTarget.style.background = 'linear-gradient(135deg, #0288d1, #26c6da)')}
            onMouseLeave={e => !submitting && (e.currentTarget.style.background = 'linear-gradient(135deg, #4fc3f7, #0288d1)')}
          >
            {submitting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={styles.spinner} /> Submitting...
              </span>
            ) : '▶ Submit Code'}
          </button>
          <button
            style={styles.submitContestBtn}
            onClick={() => setShowSubmitContestModal(true)}
            onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)'}
            onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'}
          >
            🏁 Submit Contest
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div style={styles.mainLayout}>

        {/* Left Panel */}
        <div style={styles.leftPanel}>

          {/* Question Navigation */}
          {questions.length > 1 && (
            <div style={styles.questionNav}>
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  style={{
                    ...styles.questionNavBtn,
                    background: String(q.id) === String(questionId)
                      ? 'linear-gradient(135deg, #4fc3f7, #0288d1)'
                      : 'rgba(255,255,255,0.08)',
                    color: String(q.id) === String(questionId) ? 'white' : '#aaa'
                  }}
                  onClick={() => navigate(`/contest/${contestId}/question/${q.id}`)}
                >
                  Q{i + 1}
                </button>
              ))}
            </div>
          )}

          {/* Panel Tabs */}
          <div style={styles.panelTabs}>
            {['problem', 'hints', 'result'].map(panel => (
              <button
                key={panel}
                style={{
                  ...styles.panelTab,
                  borderBottom: activePanel === panel
                    ? '2px solid #4fc3f7'
                    : '2px solid transparent',
                  color: activePanel === panel ? '#4fc3f7' : '#888'
                }}
                onClick={() => setActivePanel(panel)}
              >
                {panel === 'problem' ? '📋 Problem' : panel === 'hints' ? '✨ Ask AI Hint' : '📊 Result'}
              </button>
            ))}
          </div>

          {/* Problem Panel */}
          {activePanel === 'problem' && question && (
            <div style={styles.problemPanel}>
              <div style={styles.problemHeader}>
                <h2 style={styles.problemTitle}>{question.title}</h2>
                <span style={{
                  ...styles.diffBadge,
                  background: question.difficulty === 'easy'
                    ? '#d1fae5'
                    : question.difficulty === 'medium'
                    ? '#fef3c7'
                    : '#fee2e2',
                  color: question.difficulty === 'easy'
                    ? '#10b981'
                    : question.difficulty === 'medium'
                    ? '#f59e0b'
                    : '#ef4444'
                }}>
                  {question.difficulty}
                </span>
              </div>

              {/* Contest time info */}
              {contest && (
                <div style={styles.contestTimeBox}>
                  <div style={styles.contestTimeItem}>
                    <span style={styles.contestTimeLabel}>📅 Start</span>
                    <span style={styles.contestTimeValue}>{formatDate(contest.startTime)}</span>
                  </div>
                  <div style={styles.contestTimeItem}>
                    <span style={styles.contestTimeLabel}>🏁 End</span>
                    <span style={styles.contestTimeValue}>{formatDate(contest.endTime)}</span>
                  </div>
                </div>
              )}

              <div style={styles.problemSection}>
                <h4 style={styles.sectionLabel}>Description</h4>
                <p style={styles.problemDesc}>{question.description}</p>
              </div>

              {question.inputFormat && (
                <div style={styles.problemSection}>
                  <h4 style={styles.sectionLabel}>Input Format</h4>
                  <p style={styles.problemDesc}>{question.inputFormat}</p>
                </div>
              )}

              {question.outputFormat && (
                <div style={styles.problemSection}>
                  <h4 style={styles.sectionLabel}>Output Format</h4>
                  <p style={styles.problemDesc}>{question.outputFormat}</p>
                </div>
              )}

              {question.sampleInput && (
                <div style={styles.problemSection}>
                  <h4 style={styles.sectionLabel}>Sample Input</h4>
                  <div style={styles.codeBlock}>
                    <pre style={styles.codeText}>{question.sampleInput}</pre>
                  </div>
                </div>
              )}

              {question.sampleOutput && (
                <div style={styles.problemSection}>
                  <h4 style={styles.sectionLabel}>Sample Output</h4>
                  <div style={styles.codeBlock}>
                    <pre style={styles.codeText}>{question.sampleOutput}</pre>
                  </div>
                </div>
              )}

              <div style={styles.problemSection}>
                <h4 style={styles.sectionLabel}>Marks</h4>
                <span style={styles.marksBadge}>⭐ {question.marks} points</span>
              </div>

              {/* How to submit notice */}
              <div style={styles.submitNotice}>
                <h4 style={styles.sectionLabel}>📌 How to Submit</h4>
                <p style={styles.submitNoticeText}>
                  Read input from <code style={styles.code}>stdin</code> and
                  print output to <code style={styles.code}>stdout</code>.
                  Match the sample input/output format exactly.
                  No extra spaces or blank lines.
                </p>
              </div>
            </div>
          )}

          {/* Hints Panel */}
          {activePanel === 'hints' && (
            <div style={styles.hintsPanel}>
              {loadingHints ? (
                <div style={{ ...styles.noResult, animation: 'pulse 1.5s infinite' }}>
                  <div style={{ ...styles.noResultIcon, fontSize: 40 }}>🧠</div>
                  <p style={{ ...styles.noResultText, color: '#4fc3f7', fontWeight: 600 }}>
                    Consulting CodeStorm AI Tutor...
                  </p>
                </div>
              ) : !hintsData ? (
                <div style={styles.noResult}>
                  <div style={styles.noResultIcon}>💡</div>
                  <p style={styles.noResultText}>Unable to load hints for this question.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease-out' }}>
                  {/* Conceptual Hint */}
                  <div style={styles.hintCard}>
                    <h4 style={{ ...styles.sectionLabel, color: '#4fc3f7', marginBottom: 6 }}>
                      💡 Conceptual Hint
                    </h4>
                    <p style={{ ...styles.problemDesc, fontSize: 13.5 }}>
                      {hintsData.conceptHint}
                    </p>
                  </div>

                  {/* Edge Cases */}
                  <div style={styles.edgeCasesCard}>
                    <h4 style={{ ...styles.sectionLabel, color: '#f59e0b', marginBottom: 6 }}>
                      ⚠️ Edge Cases to Verify
                    </h4>
                    <p style={{ ...styles.problemDesc, fontSize: 13.5, whiteSpace: 'pre-wrap' }}>
                      {hintsData.edgeCases}
                    </p>
                  </div>

                  {/* Algorithm & Strategy */}
                  <div style={styles.algCard}>
                    <h4 style={{ ...styles.sectionLabel, color: '#8b5cf6', marginBottom: 6 }}>
                      🧩 Algorithm & Strategy
                    </h4>
                    {!hintsData.isAlgorithmUnlocked ? (
                      <div style={styles.lockOverlay}>
                        <div style={{ fontSize: 24 }}>🔒</div>
                        <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 4px', lineHeight: '1.6' }}>
                          Unlock the exact algorithm category and step-by-step strategy.
                        </p>
                        <p style={{ fontSize: 12, color: '#f87171', fontWeight: 700, margin: '0 0 8px' }}>
                          ⚠️ Warning: Unlocking will deduct 25% of the total marks for this question!
                        </p>
                        <button
                          style={styles.unlockBtn}
                          onClick={() => setShowUnlockModal(true)}
                        >
                          🔓 Reveal Strategy (-25% Marks)
                        </button>
                      </div>
                    ) : (
                      <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 800, color: '#ef4444',
                            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                            padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase'
                          }}>
                            ⚠️ 25% Penalty Applied
                          </span>
                          <span style={{
                            fontSize: 12, fontWeight: 700, color: '#8b5cf6',
                            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                            padding: '3px 10px', borderRadius: 20
                          }}>
                            {hintsData.algorithmTag}
                          </span>
                        </div>
                        <p style={{ ...styles.problemDesc, fontSize: 13.5 }}>
                          {hintsData.algorithmDetails}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}



          {/* Result Panel */}
          {activePanel === 'result' && (
            <div style={styles.resultPanel}>
              {!submissionResult ? (
                <div style={styles.noResult}>
                  <div style={styles.noResultIcon}>📊</div>
                  <p style={styles.noResultText}>Submit your code to see results</p>
                </div>
              ) : (
                <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                  {(() => {
                    const s = getStatusStyle(submissionResult.status);
                    return (
                      <>
                        <div style={{
                          ...styles.resultCard,
                          background: s.bg,
                          border: `2px solid ${s.color}22`
                        }}>
                          <span style={styles.resultIcon}>{s.icon}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ ...styles.resultStatus, color: s.color }}>
                              {submissionResult.status === 'pending' || submissionResult.status === 'running'
                                ? 'Evaluating your code...'
                                : submissionResult.status.charAt(0).toUpperCase() + submissionResult.status.slice(1)
                              }
                            </p>
                            {(submissionResult.status === 'pending' || submissionResult.status === 'running') && (
                              <p style={styles.resultSub}>
                                Running your code against test cases...
                              </p>
                            )}
                          </div>
                          {(submissionResult.status === 'pending' || submissionResult.status === 'running') && (
                            <span style={styles.spinner} />
                          )}
                        </div>

                        {submissionResult.status !== 'pending' && submissionResult.status !== 'running' && (
                          <div style={styles.resultDetails}>
                            {[
                              { label: 'Score', value: `${submissionResult.score} pts` },
                              { label: 'Test Cases', value: `${submissionResult.testCasesPassed}/${submissionResult.totalTestCases}` },
                              { label: 'Execution Time', value: `${submissionResult.executionTime}ms` },
                              { label: 'Language', value: submissionResult.language },
                              { label: 'Submitted At', value: formatDate(submissionResult.createdAt) }
                            ].map((item, i) => (
                              <div key={i} style={styles.resultItem}>
                                <span style={styles.resultLabel}>{item.label}</span>
                                <span style={styles.resultValue}>{item.value}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Tips on error */}
                        {submissionResult.errorMessage && (
                          <div style={styles.errorBox}>
                            <h4 style={styles.errorTitle}>Error Output</h4>
                            <pre style={styles.errorText}>{submissionResult.errorMessage}</pre>
                            {submissionResult.errorMessage.includes('Time Limit') && (
                              <div style={styles.errorTip}>
                                💡 <strong>Tip:</strong> Make sure your program reads from stdin and
                                prints to stdout. Do not leave the program waiting for input.
                              </div>
                            )}
                            {submissionResult.errorMessage.includes('No output') && (
                              <div style={styles.errorTip}>
                                💡 <strong>Tip:</strong> Your program ran but printed nothing.
                                Make sure you print your answer using print() / System.out.println() / cout.
                              </div>
                            )}
                          </div>
                        )}

                        {/* Rejected tips */}
                        {submissionResult.status === 'rejected' && !submissionResult.errorMessage && (
                          <div style={styles.rejectedTip}>
                            💡 <strong>Wrong Answer:</strong> Your output does not match the expected output.
                            Check your logic and make sure the output format matches exactly.
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel — Editor */}
        <div style={styles.rightPanel}>
          <div style={styles.editorHeader}>
            <div style={styles.editorLeft}>
              <span style={styles.editorLabel}>
                {language === 'python' ? '🐍' : language === 'java' ? '☕' : '⚡'} {language}
              </span>
              <span style={styles.editorHint}>
                stdin / stdout
              </span>
            </div>
            <button
              style={styles.clearBtn}
              onClick={() => setCode(getDefaultCode(language, question))}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Reset Code
            </button>
          </div>

          <Editor
            height="calc(100vh - 130px)"
            language={language === 'c++' ? 'cpp' : language}
            value={code}
            onChange={value => setCode(value)}
            theme="vs-dark"
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              lineNumbers: 'on',
              roundedSelection: true,
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              padding: { top: 16 }
            }}
          />
        </div>
      </div>

      {/* Exit Contest Modal */}
      {showExitModal && (
        <div style={styles.overlay} onClick={() => setShowExitModal(false)}>
          <div style={styles.exitModal} onClick={e => e.stopPropagation()}>
            <div style={styles.exitIcon}>⚠️</div>
            <h2 style={styles.exitTitle}>Leave Contest?</h2>
            <p style={styles.exitDesc}>
              Are you sure you want to leave? Your current code will not be saved
              and you may lose your progress.
            </p>
            <div style={styles.exitWarningBox}>
              <p style={styles.exitWarningText}>
                🚨 Leaving mid-contest may be flagged as suspicious activity.
              </p>
            </div>
            <div style={styles.exitActions}>
              <button
                style={styles.stayBtn}
                onClick={() => setShowExitModal(false)}
                onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, #0288d1, #26c6da)'}
                onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, #4fc3f7, #0288d1)'}
              >
                Stay in Contest
              </button>
              <button
                style={styles.leaveBtn}
                onClick={() => {
                  setShowExitModal(false);
                  navigate('/candidate/dashboard');
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
              >
                Leave Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Contest Modal */}
      {showSubmitContestModal && (
        <div style={styles.overlay} onClick={() => setShowSubmitContestModal(false)}>
          <div style={styles.exitModal} onClick={e => e.stopPropagation()}>
            <div style={styles.exitIcon}>🏁</div>
            <h2 style={styles.exitTitle}>Submit Contest?</h2>
            <p style={styles.exitDesc}>
              Are you sure you want to finalize and submit your contest?
              Your best scores for each question will be sent to the company.
            </p>
            <div style={styles.exitWarningBox}>
              <p style={styles.exitWarningText}>
                🚨 This action is permanent. You will NOT be able to re-enter
                this contest or make any more submissions after submitting.
              </p>
            </div>
            <div style={styles.exitActions}>
              <button
                style={styles.stayBtn}
                onClick={() => setShowSubmitContestModal(false)}
              >
                Continue Coding
              </button>
              <button
                style={{ ...styles.leaveBtn, opacity: submittingContest ? 0.6 : 1 }}
                onClick={handleSubmitContest}
                disabled={submittingContest}
              >
                {submittingContest ? 'Submitting...' : '✓ Submit Contest'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock AI Strategy Modal */}
      {showUnlockModal && (
        <div style={styles.overlay} onClick={() => setShowUnlockModal(false)}>
          <div style={styles.exitModal} onClick={e => e.stopPropagation()}>
            <div style={{ ...styles.exitIcon, color: '#f59e0b' }}>🔓</div>
            <h2 style={styles.exitTitle}>Unlock AI Strategy?</h2>
            <p style={styles.exitDesc}>
              Are you sure you want to reveal the primary algorithm strategy for this question?
            </p>
            <div style={styles.exitWarningBox}>
              <p style={{ ...styles.exitWarningText, color: '#ef4444', fontWeight: 700 }}>
                🚨 A permanent 25% score deduction will be applied to this question's total points upon submission!
              </p>
            </div>
            <div style={styles.exitActions}>
              <button
                style={{
                  ...styles.stayBtn,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: 'none'
                }}
                onClick={() => setShowUnlockModal(false)}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.leaveBtn, background: '#7c3aed', border: 'none', color: 'white', opacity: unlockingHint ? 0.6 : 1 }}
                onClick={unlockAlgorithmHint}
                disabled={unlockingHint}
              >
                {unlockingHint ? 'Unlocking...' : 'Reveal Strategy (-25%)'}
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
    height: '100vh', display: 'flex', flexDirection: 'column',
    background: '#080810', overflow: 'hidden',
    fontFamily: "'Outfit', sans-serif",
  },
  topBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0 20px', height: 58,
    background: 'rgba(8,8,16,0.95)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(139,92,246,0.25)',
    flexShrink: 0,
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  },
  topLeft: { display: 'flex', alignItems: 'center', gap: 14, flex: 1 },
  backBtn: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.35)',
    color: '#ef4444', padding: '7px 16px', borderRadius: 9,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s', fontFamily: "'Outfit', sans-serif",
  },
  contestInfo: { display: 'flex', alignItems: 'center', gap: 8 },
  contestName: { fontSize: 13, color: '#64748b', fontWeight: 500 },
  separator: { color: 'rgba(139,92,246,0.5)', fontSize: 16 },
  questionName: { fontSize: 13, color: '#e2e8f0', fontWeight: 700 },
  topCenter: { flex: 1, display: 'flex', justifyContent: 'center' },
  timer: {
    fontSize: 16, fontWeight: 800, padding: '6px 22px',
    borderRadius: 10, border: '1px solid',
    fontFamily: "'JetBrains Mono', monospace", letterSpacing: '2px',
  },
  topRight: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' },
  langSelect: {
    background: 'rgba(139,92,246,0.1)',
    border: '1px solid rgba(139,92,246,0.3)',
    color: '#e2e8f0', padding: '7px 14px', borderRadius: 9,
    fontSize: 13, cursor: 'pointer', outline: 'none',
    fontFamily: "'Outfit', sans-serif", fontWeight: 600,
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    border: 'none', color: '#fff', padding: '8px 22px',
    borderRadius: 10, fontSize: 14, fontWeight: 700,
    cursor: 'pointer', transition: 'all 0.3s',
    boxShadow: '0 4px 18px rgba(124,58,237,0.45)',
    display: 'flex', alignItems: 'center', gap: 8,
    fontFamily: "'Outfit', sans-serif",
  },
  spinner: {
    width: 14, height: 14,
    border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff',
    borderRadius: '50%', display: 'inline-block',
    animation: 'spin 0.8s linear infinite',
  },
  submitContestBtn: {
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    border: 'none', color: '#fff', padding: '8px 18px',
    borderRadius: 10, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', transition: 'all 0.3s',
    boxShadow: '0 4px 15px rgba(239,68,68,0.4)',
    fontFamily: "'Outfit', sans-serif",
  },
  mainLayout: { display: 'flex', flex: 1, overflow: 'hidden' },
  leftPanel: {
    width: 430, background: 'rgba(14,14,26,0.95)',
    borderRight: '1px solid rgba(139,92,246,0.2)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
  },
  questionNav: {
    display: 'flex', gap: 8, padding: '12px 16px',
    borderBottom: '1px solid rgba(139,92,246,0.15)', flexWrap: 'wrap',
  },
  questionNavBtn: {
    padding: '6px 14px', border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    transition: 'all 0.2s', fontFamily: "'Outfit', sans-serif",
  },
  panelTabs: { display: 'flex', borderBottom: '1px solid rgba(139,92,246,0.15)', flexShrink: 0 },
  panelTab: {
    flex: 1, padding: '12px', background: 'transparent', border: 'none',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
    fontFamily: "'Outfit', sans-serif",
  },
  problemPanel: { flex: 1, overflowY: 'auto', padding: '20px' },
  problemHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16, gap: 12,
  },
  problemTitle: { fontSize: 19, fontWeight: 800, color: '#f1f5f9', margin: 0, flex: 1, lineHeight: '1.3' },
  diffBadge: {
    fontSize: 12, fontWeight: 700, padding: '4px 12px',
    borderRadius: 20, textTransform: 'capitalize', flexShrink: 0,
  },
  contestTimeBox: {
    background: 'rgba(124,58,237,0.08)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 12, padding: '12px 16px', marginBottom: 20,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  contestTimeItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  contestTimeLabel: { fontSize: 12, color: '#a855f7', fontWeight: 600 },
  contestTimeValue: { fontSize: 12, color: '#cbd5e1', fontWeight: 500 },
  problemSection: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: 800, color: '#7c3aed',
    textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 10px',
  },
  problemDesc: { fontSize: 14, color: '#cbd5e1', lineHeight: '1.8', margin: 0 },
  codeBlock: {
    background: '#0d0d1a', borderRadius: 10, padding: 14,
    border: '1px solid rgba(139,92,246,0.2)',
  },
  codeText: {
    fontSize: 13, color: '#a855f7',
    fontFamily: "'JetBrains Mono', monospace",
    margin: 0, whiteSpace: 'pre-wrap',
  },
  marksBadge: {
    fontSize: 13, fontWeight: 700, color: '#f59e0b',
    background: 'rgba(245,158,11,0.12)',
    border: '1px solid rgba(245,158,11,0.25)',
    padding: '4px 14px', borderRadius: 20,
  },
  submitNotice: {
    background: 'rgba(124,58,237,0.06)',
    border: '1px solid rgba(139,92,246,0.15)',
    borderRadius: 10, padding: 14, marginBottom: 20,
  },
  submitNoticeText: { fontSize: 13, color: '#94a3b8', lineHeight: '1.7', margin: 0 },
  code: {
    background: 'rgba(124,58,237,0.15)', color: '#a855f7',
    padding: '1px 6px', borderRadius: 4,
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
  },
  resultPanel: { flex: 1, overflowY: 'auto', padding: '20px' },
  noResult: { textAlign: 'center', padding: '60px 20px' },
  noResultIcon: { fontSize: 48, marginBottom: 16 },
  noResultText: { fontSize: 14, color: '#475569' },
  resultCard: {
    borderRadius: 16, padding: 20,
    display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
  },
  resultIcon: { fontSize: 32 },
  resultStatus: { fontSize: 18, fontWeight: 800, margin: '0 0 4px' },
  resultSub: { fontSize: 13, color: '#64748b', margin: 0 },
  resultDetails: {
    background: 'rgba(124,58,237,0.06)',
    borderRadius: 14, padding: 16,
    display: 'flex', flexDirection: 'column', gap: 12,
    border: '1px solid rgba(139,92,246,0.15)', marginBottom: 16,
  },
  resultItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  resultLabel: { fontSize: 13, color: '#64748b' },
  resultValue: { fontSize: 13, fontWeight: 700, color: '#f1f5f9' },
  errorBox: {
    background: 'rgba(239,68,68,0.06)', borderRadius: 12, padding: 16,
    border: '1px solid rgba(239,68,68,0.2)', marginBottom: 12,
  },
  errorTitle: { fontSize: 13, color: '#ef4444', margin: '0 0 10px', fontWeight: 700 },
  errorText: {
    fontSize: 12, color: '#fca5a5',
    fontFamily: "'JetBrains Mono', monospace", margin: 0, whiteSpace: 'pre-wrap',
  },
  errorTip: {
    marginTop: 12, fontSize: 12, color: '#fbbf24',
    background: 'rgba(245,158,11,0.08)',
    border: '1px solid rgba(245,158,11,0.2)',
    borderRadius: 8, padding: '8px 12px', lineHeight: '1.5',
  },
  rejectedTip: {
    fontSize: 12, color: '#fbbf24',
    background: 'rgba(245,158,11,0.08)',
    border: '1px solid rgba(245,158,11,0.2)',
    borderRadius: 8, padding: '10px 12px', lineHeight: '1.5',
  },
  rightPanel: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  editorHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 16px',
    background: 'rgba(14,14,26,0.9)',
    borderBottom: '1px solid rgba(139,92,246,0.15)',
  },
  editorLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  editorLabel: { fontSize: 13, color: '#94a3b8', fontWeight: 600 },
  editorHint: {
    fontSize: 11, color: '#475569',
    background: 'rgba(139,92,246,0.08)',
    padding: '2px 8px', borderRadius: 4,
    border: '1px solid rgba(139,92,246,0.15)',
  },
  clearBtn: {
    background: 'transparent',
    border: '1px solid rgba(139,92,246,0.25)',
    color: '#64748b', padding: '5px 12px', borderRadius: 6,
    fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
    fontFamily: "'Outfit', sans-serif",
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, backdropFilter: 'blur(10px)',
  },
  exitModal: {
    background: 'rgba(14,14,26,0.97)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(139,92,246,0.35)',
    borderRadius: 24, padding: '40px',
    width: '100%', maxWidth: 420, textAlign: 'center',
    animation: 'fadeInScale 0.4s cubic-bezier(0.16,1,0.3,1)',
    boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
  },
  exitIcon: { fontSize: 52, marginBottom: 16 },
  exitTitle: { fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 12px' },
  exitDesc: { fontSize: 14, color: '#94a3b8', margin: '0 0 20px', lineHeight: '1.7' },
  exitWarningBox: {
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 12, padding: '12px 16px', marginBottom: 24,
  },
  exitWarningText: { fontSize: 13, color: '#ef4444', margin: 0 },
  exitActions: { display: 'flex', gap: 12 },
  stayBtn: {
    flex: 1, padding: '12px',
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    border: 'none', borderRadius: 12,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    color: '#fff', transition: 'all 0.3s',
    boxShadow: '0 4px 18px rgba(124,58,237,0.4)',
    fontFamily: "'Outfit', sans-serif",
  },
  leaveBtn: {
    flex: 1, padding: '12px',
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.4)',
    borderRadius: 12, fontSize: 14, fontWeight: 700,
    cursor: 'pointer', color: '#ef4444',
    transition: 'all 0.3s', fontFamily: "'Outfit', sans-serif",
  },
  hintsPanel: {
    flex: 1, overflowY: 'auto', padding: '20px',
    display: 'flex', flexDirection: 'column', gap: 16
  },
  hintCard: {
    background: 'rgba(79,195,247,0.03)',
    border: '1px solid rgba(79,195,247,0.15)',
    borderLeft: '4px solid #4fc3f7',
    borderRadius: 10, padding: 14,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  edgeCasesCard: {
    background: 'rgba(245,158,11,0.03)',
    border: '1px solid rgba(245,158,11,0.15)',
    borderLeft: '4px solid #f59e0b',
    borderRadius: 10, padding: 14,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  algCard: {
    background: 'rgba(139,92,246,0.03)',
    border: '1px solid rgba(139,92,246,0.15)',
    borderLeft: '4px solid #8b5cf6',
    borderRadius: 10, padding: 14,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  lockOverlay: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '24px 20px',
    background: 'rgba(13,13,26,0.7)',
    border: '1px dashed rgba(139,92,246,0.3)',
    borderRadius: 10, textAlign: 'center', gap: 12
  },
  unlockBtn: {
    background: 'linear-gradient(135deg, #7c3aed, #4c1d95)',
    color: 'white', border: 'none', padding: '10px 20px',
    borderRadius: 8, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', transition: 'all 0.2s',
    boxShadow: '0 4px 15px rgba(124,58,237,0.4)',
    fontFamily: "'Outfit', sans-serif"
  }
};

export default CodeEditor;
