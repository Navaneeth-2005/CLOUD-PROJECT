import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import API from '../api/axios';

const MockInterview = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [interviewJobName, setInterviewJobName] = useState(null);
  const [interviewFeedback, setInterviewFeedback] = useState(null);
  const [interviewAnalyzing, setInterviewAnalyzing] = useState(false);
  const [question, setQuestion] = useState({ title: '', description: '' });
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  const interviewQuestions = [
    {
      title: 'System Design: URL Shortener',
      description: 'Explain how you would design a scalable URL shortener like bit.ly. Walk through the database choices, hashing algorithms, and how to handle high read/write throughput.'
    },
    {
      title: 'Behavioral: Conflict Resolution',
      description: 'Tell me about a time you disagreed with a senior engineer on a technical approach. How did you handle it and what was the outcome?'
    },
    {
      title: 'Technical: Hash Maps vs Trees',
      description: 'Explain the internal workings of a Hash Map versus a Binary Search Tree. When would you choose to use one over the other?'
    },
    {
      title: 'System Design: Real-time Chat',
      description: 'How would you architect a real-time chat application like WhatsApp? Discuss the protocols (WebSockets vs HTTP long-polling) and message persistence.'
    }
  ];

  useEffect(() => {
    // Pick a random question on load
    const randIdx = Math.floor(Math.random() * interviewQuestions.length);
    setQuestion(interviewQuestions[randIdx]);
  }, []);

  const generateNewQuestion = () => {
    const randIdx = Math.floor(Math.random() * interviewQuestions.length);
    setQuestion(interviewQuestions[randIdx]);
    setInterviewFeedback(null);
  };

  const startInterviewRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      finalTranscriptRef.current = '';

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await submitInterviewAudio(audioBlob);
      };

      // Initialize Web Speech API for real-time transcription (free, no AWS subscription needed)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscriptRef.current += event.results[i][0].transcript + ' ';
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      mediaRecorder.start();
      setIsRecording(true);
      setInterviewFeedback(null);
      toast.info('Recording started! Speak clearly into your microphone.');
    } catch (err) {
      console.error('Mic access denied', err);
      toast.error('Microphone access denied. Please allow mic access to use the mock interviewer.');
    }
  };

  const stopInterviewRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setInterviewAnalyzing(true);
    }
  };

  const submitInterviewAudio = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'interview.webm');

      // 1. Upload to S3 via backend
      const res = await API.post('/interviews/start', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const jobName = res.data.jobName;
      setInterviewJobName(jobName);
      
      // 2. Pass transcript directly to analyze
      const userTranscript = finalTranscriptRef.current.trim() || "The user did not speak clearly or their mic was muted.";
      analyzeInterviewDirectly(userTranscript, jobName);
    } catch (err) {
      console.error('Audio upload failed', err);
      toast.error('Failed to upload interview audio.');
      setInterviewAnalyzing(false);
    }
  };

  const analyzeInterviewDirectly = async (transcriptText, jobName) => {
    try {
      const res = await API.post('/interviews/analyze', {
        jobName,
        code: '', 
        questionTitle: question.title,
        questionDesc: question.description,
        clientTranscript: transcriptText // Send client transcript!
      });

      if (res.data.status === 'completed') {
        setInterviewFeedback(res.data.feedback);
        setInterviewAnalyzing(false);
        toast.success('AI Interview Analysis complete!');
      } else {
        setInterviewAnalyzing(false);
        toast.error(res.data.message || 'Analysis failed.');
      }
    } catch (err) {
      setInterviewAnalyzing(false);
      toast.error('Error connecting to AI Analysis server.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🎙️ AI Mock Interviewer</h1>
        <p style={styles.subtitle}>Practice your communication skills with Amazon Transcribe and Gemini AI.</p>
      </div>

      <div style={styles.content}>
        <div style={styles.questionCard}>
          <div style={styles.questionHeader}>
            <h3 style={styles.qTitle}>Current Prompt: {question.title}</h3>
            <button style={styles.refreshBtn} onClick={generateNewQuestion}>
              🔄 Next Prompt
            </button>
          </div>
          <p style={styles.qDesc}>{question.description}</p>
        </div>

        <div style={styles.recordingArea}>
          {!isRecording && !interviewAnalyzing && (
            <button style={styles.startBtn} onClick={startInterviewRecording}>
              🎤 Start Answering
            </button>
          )}

          {isRecording && (
            <div style={styles.recordingState}>
              <div style={styles.pulseIndicator}></div>
              <p style={styles.recordingText}>Recording in progress... speak clearly!</p>
              <button style={styles.stopBtn} onClick={stopInterviewRecording}>
                ⏹️ Stop & Analyze
              </button>
            </div>
          )}

          {interviewAnalyzing && (
            <div style={styles.analyzingState}>
              <div style={styles.spinner}></div>
              <p style={styles.analyzingText}>AWS Transcribe & Gemini AI are analyzing your audio...</p>
            </div>
          )}
        </div>

        {interviewFeedback && (
          <div style={styles.feedbackContainer}>
            <h3 style={styles.feedbackTitle}>📊 Interview Results</h3>
            
            <div style={styles.scoreCards}>
              <div style={styles.scoreCardGreen}>
                <h4 style={styles.scoreTitleGreen}>Communication Fluency</h4>
                <div style={styles.scoreValueGreen}>{interviewFeedback.communicationScore}/10</div>
              </div>
              <div style={styles.scoreCardPurple}>
                <h4 style={styles.scoreTitlePurple}>Technical Correctness</h4>
                <div style={styles.scoreValuePurple}>{interviewFeedback.technicalScore}/10</div>
              </div>
            </div>
            
            <div style={styles.reviewCard}>
              <h4 style={styles.reviewTitle}>🧠 AI Feedback</h4>
              <p style={styles.reviewText}>{interviewFeedback.review}</p>
            </div>
            
            <div style={styles.transcriptCard}>
              <h4 style={styles.transcriptTitle}>📝 What we heard (AWS Transcribe)</h4>
              <p style={styles.transcriptText}>"{interviewFeedback.transcript}"</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '40px',
    maxWidth: '900px',
    margin: '0 auto',
    fontFamily: "'Inter', sans-serif",
    color: '#fff',
    minHeight: '100vh',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '36px',
    fontWeight: '800',
    color: '#4fc3f7',
    marginBottom: '10px',
  },
  subtitle: {
    color: '#aaa',
    fontSize: '16px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  questionCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '16px',
  },
  qTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#fff',
  },
  refreshBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  qDesc: {
    fontSize: '16px',
    color: '#cbd5e1',
    lineHeight: '1.6',
    margin: 0,
  },
  recordingArea: {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px',
  },
  startBtn: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    padding: '16px 32px',
    fontSize: '18px',
    fontWeight: '700',
    borderRadius: '30px',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(16,185,129,0.4)',
    transition: 'transform 0.2s',
  },
  stopBtn: {
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: 'white',
    border: 'none',
    padding: '16px 32px',
    fontSize: '18px',
    fontWeight: '700',
    borderRadius: '30px',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(239,68,68,0.4)',
    marginTop: '20px',
  },
  recordingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  pulseIndicator: {
    width: '20px',
    height: '20px',
    background: '#ef4444',
    borderRadius: '50%',
    animation: 'pulse 1.5s infinite',
  },
  recordingText: {
    color: '#ef4444',
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
  },
  analyzingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.1)',
    borderTopColor: '#4fc3f7',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  analyzingText: {
    color: '#f59e0b',
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
  },
  feedbackContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    animation: 'fadeIn 0.5s ease-out',
  },
  feedbackTitle: {
    fontSize: '24px',
    color: '#fff',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    paddingBottom: '10px',
    margin: 0,
  },
  scoreCards: {
    display: 'flex',
    gap: '20px',
  },
  scoreCardGreen: {
    flex: 1,
    background: 'rgba(16,185,129,0.05)',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
  },
  scoreTitleGreen: {
    color: '#10b981',
    margin: '0 0 10px 0',
    fontSize: '16px',
  },
  scoreValueGreen: {
    color: '#10b981',
    fontSize: '48px',
    fontWeight: '800',
  },
  scoreCardPurple: {
    flex: 1,
    background: 'rgba(139,92,246,0.05)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
  },
  scoreTitlePurple: {
    color: '#8b5cf6',
    margin: '0 0 10px 0',
    fontSize: '16px',
  },
  scoreValuePurple: {
    color: '#8b5cf6',
    fontSize: '48px',
    fontWeight: '800',
  },
  reviewCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '20px',
  },
  reviewTitle: {
    color: '#4fc3f7',
    margin: '0 0 10px 0',
    fontSize: '18px',
  },
  reviewText: {
    color: '#cbd5e1',
    fontSize: '15px',
    lineHeight: '1.6',
    margin: 0,
  },
  transcriptCard: {
    background: 'rgba(245,158,11,0.05)',
    border: '1px solid rgba(245,158,11,0.2)',
    borderRadius: '12px',
    padding: '20px',
  },
  transcriptTitle: {
    color: '#f59e0b',
    margin: '0 0 10px 0',
    fontSize: '16px',
  },
  transcriptText: {
    color: '#888',
    fontSize: '14px',
    fontStyle: 'italic',
    lineHeight: '1.5',
    margin: 0,
  }
};

export default MockInterview;
