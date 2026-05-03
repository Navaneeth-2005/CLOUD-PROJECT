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
  const timerRef = useRef(null);
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

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(timerRef.current);
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
            {['problem', 'result'].map(panel => (
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
                {panel === 'problem' ? '📋 Problem' : '📊 Result'}
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
    </div>
  );
};

const styles = {
  page: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#1e1e1e',
    overflow: 'hidden'
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 20px',
    height: '55px',
    background: '#0f0c29',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    flexShrink: 0
  },
  topLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1
  },
  backBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,107,107,0.3)',
    color: '#ff6b6b',
    padding: '6px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  contestInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  contestName: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)'
  },
  separator: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '16px'
  },
  questionName: {
    fontSize: '13px',
    color: 'white',
    fontWeight: '600'
  },
  topCenter: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center'
  },
  timer: {
    fontSize: '16px',
    fontWeight: '700',
    padding: '6px 20px',
    borderRadius: '10px',
    border: '1px solid',
    fontFamily: 'monospace',
    letterSpacing: '2px'
  },
  topRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    justifyContent: 'flex-end'
  },
  langSelect: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'white',
    padding: '7px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    outline: 'none'
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
    border: 'none',
    color: 'white',
    padding: '8px 22px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 15px rgba(79,195,247,0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.8s linear infinite'
  },
  mainLayout: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },
  leftPanel: {
    width: '420px',
    background: '#1a1a2e',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0
  },
  questionNav: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    flexWrap: 'wrap'
  },
  questionNavBtn: {
    padding: '6px 14px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  panelTabs: {
    display: 'flex',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    flexShrink: 0
  },
  panelTab: {
    flex: 1,
    padding: '12px',
    background: 'transparent',
    border: 'none',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  problemPanel: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px'
  },
  problemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '12px'
  },
  problemTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'white',
    margin: 0,
    flex: 1
  },
  diffBadge: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 12px',
    borderRadius: '20px',
    textTransform: 'capitalize',
    flexShrink: 0
  },
  contestTimeBox: {
    background: 'rgba(79,195,247,0.08)',
    border: '1px solid rgba(79,195,247,0.2)',
    borderRadius: '10px',
    padding: '10px 14px',
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  contestTimeItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  contestTimeLabel: {
    fontSize: '12px',
    color: '#4fc3f7',
    fontWeight: '500'
  },
  contestTimeValue: {
    fontSize: '12px',
    color: '#ccc',
    fontWeight: '500'
  },
  problemSection: {
    marginBottom: '20px'
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#4fc3f7',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    margin: '0 0 8px'
  },
  problemDesc: {
    fontSize: '14px',
    color: '#ccc',
    lineHeight: '1.7',
    margin: 0
  },
  codeBlock: {
    background: '#0d1117',
    borderRadius: '10px',
    padding: '14px',
    border: '1px solid rgba(255,255,255,0.08)'
  },
  codeText: {
    fontSize: '13px',
    color: '#4fc3f7',
    fontFamily: 'monospace',
    margin: 0,
    whiteSpace: 'pre-wrap'
  },
  marksBadge: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#f59e0b',
    background: '#fef3c7',
    padding: '4px 14px',
    borderRadius: '20px'
  },
  submitNotice: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    padding: '14px',
    marginBottom: '20px'
  },
  submitNoticeText: {
    fontSize: '13px',
    color: '#aaa',
    lineHeight: '1.6',
    margin: 0
  },
  code: {
    background: 'rgba(79,195,247,0.15)',
    color: '#4fc3f7',
    padding: '1px 6px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '12px'
  },
  resultPanel: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px'
  },
  noResult: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  noResultIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  noResultText: {
    fontSize: '14px',
    color: '#666'
  },
  resultCard: {
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px'
  },
  resultIcon: { fontSize: '32px' },
  resultStatus: {
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 4px'
  },
  resultSub: {
    fontSize: '13px',
    color: '#888',
    margin: 0
  },
  resultDetails: {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '14px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
    marginBottom: '16px'
  },
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  resultLabel: {
    fontSize: '13px',
    color: '#888'
  },
  resultValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'white'
  },
  errorBox: {
    background: '#1a0a0a',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #ef444433',
    marginBottom: '12px'
  },
  errorTitle: {
    fontSize: '13px',
    color: '#ef4444',
    margin: '0 0 10px'
  },
  errorText: {
    fontSize: '12px',
    color: '#ff8080',
    fontFamily: 'monospace',
    margin: 0,
    whiteSpace: 'pre-wrap'
  },
  errorTip: {
    marginTop: '12px',
    fontSize: '12px',
    color: '#f59e0b',
    background: 'rgba(245,158,11,0.1)',
    border: '1px solid rgba(245,158,11,0.2)',
    borderRadius: '8px',
    padding: '8px 12px',
    lineHeight: '1.5'
  },
  rejectedTip: {
    fontSize: '12px',
    color: '#f59e0b',
    background: 'rgba(245,158,11,0.1)',
    border: '1px solid rgba(245,158,11,0.2)',
    borderRadius: '8px',
    padding: '10px 12px',
    lineHeight: '1.5'
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  editorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    background: '#252526',
    borderBottom: '1px solid rgba(255,255,255,0.08)'
  },
  editorLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  editorLabel: {
    fontSize: '13px',
    color: '#ccc',
    fontWeight: '500'
  },
  editorHint: {
    fontSize: '11px',
    color: '#555',
    background: 'rgba(255,255,255,0.05)',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  clearBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#aaa',
    padding: '5px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(6px)'
  },
  exitModal: {
    background: '#1a1a2e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '24px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    textAlign: 'center',
    animation: 'modalIn 0.3s ease-out',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
  },
  exitIcon: { fontSize: '52px', marginBottom: '16px' },
  exitTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'white',
    margin: '0 0 12px'
  },
  exitDesc: {
    fontSize: '14px',
    color: '#aaa',
    margin: '0 0 20px',
    lineHeight: '1.6'
  },
  exitWarningBox: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '12px',
    padding: '12px 16px',
    marginBottom: '24px'
  },
  exitWarningText: {
    fontSize: '13px',
    color: '#ef4444',
    margin: 0
  },
  exitActions: {
    display: 'flex',
    gap: '12px'
  },
  stayBtn: {
    flex: 1,
    padding: '12px',
    background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    color: 'white',
    transition: 'all 0.3s',
    boxShadow: '0 4px 15px rgba(79,195,247,0.3)'
  },
  leaveBtn: {
    flex: 1,
    padding: '12px',
    background: '#ef4444',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    color: 'white',
    transition: 'all 0.3s'
  }
};

export default CodeEditor;