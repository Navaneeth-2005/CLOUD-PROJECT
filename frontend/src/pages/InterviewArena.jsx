import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

// Resolve the base Socket domain from our Axios configuration dynamically
const getSocketUrl = () => {
  const url = API.defaults.baseURL || 'http://localhost:5000/api';
  return url.replace(/\/api$/, '');
};

const InterviewArena = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('candidate');

  // Sync auth state when user loads to fix race condition
  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      setRole(user.role || 'candidate');
    }
  }, [user]);

  // Collaborative Notepad state
  const [notepadContent, setNotepadContent] = useState('');
  const [peers, setPeers] = useState([]);

  // Voice Chat (WebRTC) state
  const [muted, setMuted] = useState(false);
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const textareaRef = useRef(null);
  const queuedIceCandidatesRef = useRef([]);

  const processQueuedCandidates = async () => {
    if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
      while (queuedIceCandidatesRef.current.length > 0) {
        const candidate = queuedIceCandidatesRef.current.shift();
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('Failed to add queued ice candidate:', e.message);
        }
      }
    }
  };

  // 1. Fetch Session Details on Load
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await API.get(`/interviews/session/${token}`);
        setSession(response.data);
        setNotepadContent(response.data.notepadContent || '');
        setLoading(false);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to fetch interview session');
        setLoading(false);
      }
    };
    fetchSession();
  }, [token]);

  // 2. Handle Countdown Timer
  useEffect(() => {
    if (!session || session.status !== 'active') return;

    const updateTimer = () => {
      const now = new Date();
      const end = new Date(session.scheduledEnd);
      const diff = end - now;

      if (diff <= 0) {
        setTimeRemaining('Time expired');
        clearInterval(timerIntervalRef.current);
        if (role === 'company') {
          handleEndInterview();
        }
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    };

    updateTimer();
    timerIntervalRef.current = setInterval(updateTimer, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [session]);

  // 2.5 Component Unmount Cleanup (Closes background sockets, streams & peer connections)
  useEffect(() => {
    return () => {
      // 1. Disconnect Socket
      if (socketRef.current) {
        console.log('🔌 Disconnecting socket on unmount...');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      // 2. Stop Microphone streams
      if (localStreamRef.current) {
        console.log('🎤 Releasing microphone on unmount...');
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      // 3. Close WebRTC Peer Connection
      if (peerConnectionRef.current) {
        console.log('🌐 Closing WebRTC connection on unmount...');
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, []);

  // 3. Connect to WebSockets and Init WebRTC
  const handleJoinArena = async () => {
    if (!displayName.trim()) {
      toast.warning('Please enter a display name to join');
      return;
    }

    try {
      // Set up local voice stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setVoiceConnected(true);
      toast.success('Microphone connected successfully!');
    } catch (micErr) {
      toast.error('Failed to access microphone. Joining voice-muted.');
      console.warn(micErr.message);
    }

    // Connect socket
    const socket = io(getSocketUrl());
    socketRef.current = socket;

    socket.emit('join-room', {
      token,
      name: displayName,
      role: role
    });

    setJoined(true);

    // Notepad Updates Sync
    socket.on('notepad-update', ({ content }) => {
      setNotepadContent(content);
    });

    // Cursor/Selection sync listener
    socket.on('cursor-update', ({ id, selectionRange }) => {
      if (textareaRef.current && selectionRange) {
        // Prevent infinite loops by verifying selections differ
        if (
          textareaRef.current.selectionStart !== selectionRange.start ||
          textareaRef.current.selectionEnd !== selectionRange.end
        ) {
          textareaRef.current.selectionStart = selectionRange.start;
          textareaRef.current.selectionEnd = selectionRange.end;
        }
      }
    });

    // Sync already connected users in the room
    socket.on('room-users', ({ users }) => {
      // Filter out ourselves, and filter duplicates by name/role in case of rapid reloads
      const filteredUsers = users.filter(u => u.id !== socket.id);
      const uniqueUsers = [];
      const seen = new Set();
      for (const u of filteredUsers) {
        const key = `${u.name}-${u.role}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueUsers.push(u);
        }
      }
      setPeers(uniqueUsers);
    });

    // Real-time Interview Management Sync
    socket.on('session-ended', () => {
      toast.info('This interview session has been ended by the interviewer.');
      cleanupStream();
      navigate('/');
    });

    socket.on('session-extended', ({ newEnd }) => {
      toast.success('The interviewer has extended this session!');
      setSession(prev => ({ ...prev, scheduledEnd: newEnd }));
    });

    // Active users tracking
    socket.on('user-joined', ({ id, name, role: peerRole }) => {
      toast.info(`${name} (${peerRole}) has joined the room`);
      
      setPeers(prev => {
        // Filter out any stale connections from the same user (same name and role)
        const filtered = prev.filter(p => !(p.name === name && p.role === peerRole));
        return [...filtered, { id, name, role: peerRole }];
      });
      
      // Only the interviewer (company) initiates the WebRTC audio call
      if (role === 'company' && peerRole !== 'company') {
        initiateWebRtcCall(id);
      }
    });

    socket.on('user-left', ({ id, name }) => {
      toast.info(`${name} has disconnected`);
      setPeers(prev => prev.filter(p => p.id !== id));
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      setVoiceConnected(false);
    });

    // WebRTC Signaling listeners
    socket.on('webrtc-offer', async ({ id, offer }) => {
      await handleWebRtcOffer(id, offer);
    });

    socket.on('webrtc-answer', async ({ id, answer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        await processQueuedCandidates();
      }
    });

    socket.on('webrtc-candidate', async ({ id, candidate }) => {
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('Failed to add ice candidate:', e.message);
        }
      } else {
        queuedIceCandidatesRef.current.push(candidate);
      }
    });
  };

  // 4. WebRTC Peer-to-Peer Voice Functions
  const createPeerConnection = (targetSocketId) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Send candidate to target peer
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc-candidate', {
          token,
          candidate: event.candidate
        });
      }
    };

    // Attach remote stream to audio element
    pc.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        setVoiceConnected(true);
      }
    };

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    peerConnectionRef.current = pc;
    return pc;
  };

  const initiateWebRtcCall = async (targetSocketId) => {
    const pc = createPeerConnection(targetSocketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketRef.current.emit('webrtc-offer', {
      token,
      offer
    });
  };

  const handleWebRtcOffer = async (senderId, offer) => {
    const pc = createPeerConnection(senderId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    await processQueuedCandidates();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socketRef.current.emit('webrtc-answer', {
      token,
      answer
    });
  };

  // 5. Shared Notepad Change Listener
  const handleNotepadChange = (e) => {
    const content = e.target.value;
    setNotepadContent(content);
    
    if (socketRef.current) {
      socketRef.current.emit('notepad-change', {
        token,
        content
      });
    }
  };

  const handleTextareaSelect = (e) => {
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    if (socketRef.current) {
      socketRef.current.emit('cursor-move', {
        token,
        cursorPosition: start,
        selectionRange: { start, end },
        name: displayName
      });
    }
  };

  // 6. Recruiter Interview Controls (Start, Extend, End)
  const handleStartInterview = async () => {
    try {
      await API.post(`/interviews/session/${token}/status`, { status: 'active' });
      setSession(prev => ({ ...prev, status: 'active' }));
      toast.success('Interview session successfully started!');
    } catch (err) {
      toast.error('Failed to start interview session');
    }
  };

  const handleExtendInterview = async () => {
    const minutes = prompt('How many minutes would you like to extend this session?', '15');
    if (!minutes || isNaN(minutes) || minutes <= 0) return;

    try {
      const response = await API.post(`/interviews/session/${token}/extend`, { minutes: parseInt(minutes) });
      const newEnd = response.data.session.scheduledEnd;
      setSession(prev => ({ ...prev, scheduledEnd: newEnd }));
      
      if (socketRef.current) {
        socketRef.current.emit('session-extended', { token, newEnd });
      }
      toast.success(`Session successfully extended by ${minutes} minutes!`);
    } catch (err) {
      toast.error('Failed to extend interview session');
    }
  };

  const handleEndInterview = async () => {
    if (!confirm('Are you sure you want to end this interview session? This will disconnect the candidate and finalize the logs.')) return;

    try {
      await API.post(`/interviews/session/${token}/status`, { status: 'completed' });
      
      if (socketRef.current) {
        socketRef.current.emit('session-ended', { token });
      }
      
      toast.info('Interview session completed.');
      cleanupStream();
      navigate('/company/dashboard');
    } catch (err) {
      toast.error('Failed to end interview session');
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMuted(!audioTrack.enabled);
      }
    }
  };

  const cleanupStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  useEffect(() => {
    return () => cleanupStream();
  }, []);

  if (loading) {
    return (
      <div style={styles.loader}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>
          <div>Syncing Collaborative Arena...</div>
        </div>
      </div>
    );
  }

  // 7. Join Overlay / Landing Screen
  if (!joined) {
    return (
      <div style={styles.landingOverlay}>
        <div style={styles.landingCard}>
          <h2 style={styles.landingTitle}>🎙️ Join Interview Room</h2>
          
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Interview Title</label>
            <div style={styles.staticVal}>
              {session?.title}
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Interviewer</label>
            <div style={styles.staticValSub}>
              {session?.interviewer?.name} ({session?.interviewer?.email})
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Your Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={styles.input}
              placeholder="e.g. Navaneeth"
            />
          </div>

          <button
            onClick={handleJoinArena}
            style={styles.btnPrimary}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 229, 255, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 229, 255, 0.3)';
            }}
          >
            Enter Interview Arena →
          </button>
        </div>
      </div>
    );
  }

  // 8. Main Collaborative Interview Arena Interface
  return (
    <div style={styles.page}>
      {/* Hidden Audio Elements for Peer Streams */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Header Panel */}
      <header style={styles.header}>
        <div>
          <span style={styles.headerSubtitle}>LIVE COLLABORATIVE SESSION</span>
          <h1 style={styles.headerTitle}>{session?.title}</h1>
        </div>

        {/* Live Timer and Session Control Center */}
        <div style={styles.controlCenter}>
          {session?.status === 'active' ? (
            <div style={styles.timerBadge}>
              ⏱️ {timeRemaining}
            </div>
          ) : (
            <div style={styles.timerBadgeWaiting}>
              ⏳ Waiting to Start
            </div>
          )}

          {/* Interviewer Command Actions */}
          {role === 'company' && (
            <div style={styles.actionBtnGroup}>
              {session?.status !== 'active' && (
                <button
                  onClick={handleStartInterview}
                  style={styles.btnStart}
                  onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                >
                  🚀 Start Session
                </button>
              )}
              <button
                onClick={handleExtendInterview}
                style={styles.btnExtend}
                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
              >
                ⏳ Extend Time
              </button>
              <button
                onClick={handleEndInterview}
                style={styles.btnEnd}
                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
              >
                🛑 End Interview
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Core Split Screen Arena */}
      <div style={styles.arenaLayout}>
        {/* Left Side: Voice, Room Vitals & User Status */}
        <aside style={styles.sidebar}>
          {/* WebRTC Audio status card */}
          <div style={styles.sideCard}>
            <h3 style={styles.sideCardTitle}>🎙️ Live Voice Room</h3>
            <div style={styles.voiceStatusRow}>
              <div style={styles.voiceIndicator}>
                <div style={voiceConnected ? styles.pulseDot : styles.pulseDotOff} />
                <span>
                  {voiceConnected ? 'Audio Live' : 'Audio Closed'}
                </span>
              </div>
              <button
                onClick={toggleMute}
                style={muted ? styles.btnMute : styles.btnUnmute}
              >
                {muted ? '🔇 Muted' : '🎙️ Live'}
              </button>
            </div>
          </div>

          {/* Active room participants card */}
          <div style={{ ...styles.sideCard, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={styles.sideCardTitle}>👥 Active Arena Users</h3>
            <div style={styles.userList}>
              <div style={styles.userBadge}>
                <div style={styles.userInitials}>
                  ME
                </div>
                <div>
                  <div style={styles.userName}>{displayName}</div>
                  <div style={styles.userRole}>{role}</div>
                </div>
              </div>
              
              {peers.map((peer) => (
                <div key={peer.id} style={styles.userBadge}>
                  <div style={{ ...styles.userInitials, background: '#a855f7' }}>
                    {peer.name ? peer.name[0].toUpperCase() : 'C'}
                  </div>
                  <div>
                    <div style={styles.userName}>{peer.name}</div>
                    <div style={styles.userRole}>{peer.role}</div>
                  </div>
                </div>
              ))}

              {peers.length === 0 && (
                <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '24px' }}>
                  ⏳ Waiting for peers...
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Right Side: Collaborative Notepad Scratchpad */}
        <main style={styles.mainArea}>
          <div style={styles.notepadContainer}>
            <div style={styles.notepadHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ height: '8px', width: '8px', borderRadius: '50%', background: '#00e5ff' }} />
                <span style={styles.notepadTitle}>
                  Shared Live Notepad & Scratchpad
                </span>
              </div>
              <span style={styles.notepadSub}>
                Real-time synchronized collaborative peer environment
              </span>
            </div>
            
            {/* Real-time sync textarea */}
            <textarea
              ref={textareaRef}
              value={notepadContent}
              onChange={handleNotepadChange}
              onSelect={handleTextareaSelect}
              style={styles.textarea}
              placeholder="// Welcome to your collaborative interview scratchpad!
// Start jotting down details, outlining logic, or explaining algorithms here.
// Everything typed here is instantly synchronized between both screens!"
            />
          </div>
        </main>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#09051b',
    fontFamily: "'Outfit', 'Inter', sans-serif",
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
  },
  loader: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#050212',
    color: '#00e5ff',
    fontSize: '18px',
    fontWeight: 'bold',
    fontFamily: "'Outfit', 'Inter', sans-serif",
  },
  landingOverlay: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at center, #160a30 0%, #050212 100%)',
    padding: '24px',
    fontFamily: "'Outfit', 'Inter', sans-serif",
  },
  landingCard: {
    width: '100%',
    maxWidth: '440px',
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '36px',
    borderRadius: '24px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
  },
  landingTitle: {
    fontSize: '24px',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: '28px',
    color: '#ffffff',
    marginTop: 0,
  },
  formGroup: {
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  formLabel: {
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#00e5ff',
  },
  staticVal: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
  },
  staticValSub: {
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#cbd5e1',
  },
  input: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    color: '#ffffff',
    outline: 'none',
    transition: 'border 0.2s',
  },
  btnPrimary: {
    width: '100%',
    padding: '14px 20px',
    background: 'linear-gradient(135deg, #00e5ff, #0077ff)',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0, 229, 255, 0.3)',
    transition: 'all 0.2s',
    marginTop: '8px',
  },
  header: {
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '16px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#ffffff',
    margin: 0,
    marginTop: '4px',
  },
  headerSubtitle: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#00e5ff',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
  },
  controlCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  timerBadge: {
    background: 'rgba(0, 229, 255, 0.08)',
    border: '1px solid rgba(0, 229, 255, 0.2)',
    borderRadius: '20px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#00e5ff',
    letterSpacing: '1px',
  },
  timerBadgeWaiting: {
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    borderRadius: '20px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#f59e0b',
    letterSpacing: '1px',
  },
  actionBtnGroup: {
    display: 'flex',
    gap: '8px',
  },
  btnStart: {
    background: '#10b981',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnExtend: {
    background: '#0288d1',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnEnd: {
    background: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  arenaLayout: {
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '300px',
    background: 'rgba(255, 255, 255, 0.01)',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    overflowY: 'auto',
  },
  sideCard: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '16px',
  },
  sideCardTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#00e5ff',
    marginBottom: '16px',
    marginTop: 0,
  },
  voiceStatusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '500',
  },
  pulseDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 8px #10b981',
  },
  pulseDotOff: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#ef4444',
  },
  btnMute: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    padding: '6px 12px',
    color: '#ef4444',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  btnUnmute: {
    background: 'rgba(0, 229, 255, 0.1)',
    border: '1px solid #00e5ff',
    borderRadius: '8px',
    padding: '6px 12px',
    color: '#00e5ff',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
  },
  userInitials: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#0077ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '900',
  },
  userName: {
    fontSize: '13px',
    fontWeight: '600',
  },
  userRole: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#00e5ff',
    textTransform: 'uppercase',
  },
  mainArea: {
    flex: 1,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  },
  notepadContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
  },
  notepadHeader: {
    background: 'rgba(255, 255, 255, 0.04)',
    padding: '12px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notepadTitle: {
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    color: '#00e5ff',
  },
  notepadSub: {
    fontSize: '10px',
    color: '#94a3b8',
  },
  textarea: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    padding: '24px',
    color: '#e2e8f0',
    fontFamily: "'Fira Code', 'Courier New', Courier, monospace",
    fontSize: '14px',
    lineHeight: '1.6',
    resize: 'none',
  }
};

export default InterviewArena;
