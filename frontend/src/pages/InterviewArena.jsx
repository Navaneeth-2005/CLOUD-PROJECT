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
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.role || 'candidate');

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
    socket.on('user-joined', ({ id, name, role }) => {
      toast.info(`${name} (${role}) has joined the room`);
      setPeers(prev => [...prev, { id, name, role }]);
      
      // If we are the interviewer, we initiate the WebRTC audio call
      if (role !== 'company') {
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
      }
    });

    socket.on('webrtc-candidate', async ({ id, candidate }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
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
      <div className="min-h-screen flex items-center justify-center bg-[#0a051b] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  // 7. Join Overlay / Landing Screen
  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050212] px-4">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
          <h2 className="text-2xl font-extrabold text-white text-center mb-6">⚡ Join Interview Room</h2>
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase text-cyan-400 mb-2">Interview Title</label>
            <div className="text-white bg-white/10 p-3 rounded-lg border border-white/5 font-semibold">
              {session?.title}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase text-cyan-400 mb-2">Interviewer</label>
            <div className="text-gray-300 bg-white/5 p-3 rounded-lg text-sm">
              {session?.interviewer?.name} ({session?.interviewer?.email})
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase text-cyan-400 mb-2">Your Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-white/15 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-400 transition"
              placeholder="e.g. Navaneeth"
            />
          </div>
          <button
            onClick={handleJoinArena}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg hover:shadow-cyan-500/20 transform hover:-translate-y-0.5 transition"
          >
            Enter Interview Arena →
          </button>
        </div>
      </div>
    );
  }

  // 8. Main Collaborative Interview Arena Interface
  return (
    <div className="min-h-screen bg-[#050212] flex flex-col text-white">
      {/* Hidden Audio Elements for Peer Streams */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Header Panel */}
      <header className="bg-white/5 border-b border-white/10 px-8 py-4 flex items-center justify-between backdrop-blur-md">
        <div>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">LIVE SESSION</span>
          <h1 className="text-xl font-black text-white">{session?.title}</h1>
        </div>

        {/* Live Timer and Session Control Center */}
        <div className="flex items-center gap-4">
          {session?.status === 'active' ? (
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-full px-4 py-1.5 text-cyan-400 font-bold text-sm tracking-widest animate-pulse">
              ⏱️ {timeRemaining}
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-amber-400 font-bold text-sm tracking-widest">
              ⏳ Waiting to Start
            </div>
          )}

          {/* Interviewer Command Actions */}
          {role === 'company' && (
            <div className="flex gap-2">
              {session?.status !== 'active' && (
                <button
                  onClick={handleStartInterview}
                  className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold uppercase py-2 px-4 rounded-lg transition"
                >
                  🚀 Start Interview
                </button>
              )}
              <button
                onClick={handleExtendInterview}
                className="bg-cyan-600 hover:bg-cyan-500 text-xs font-bold uppercase py-2 px-4 rounded-lg transition"
              >
                ⏳ Extend Time
              </button>
              <button
                onClick={handleEndInterview}
                className="bg-rose-600 hover:bg-rose-500 text-xs font-bold uppercase py-2 px-4 rounded-lg transition"
              >
                🛑 End Session
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Core Split Screen Arena */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Voice, Room Vitals & User Status */}
        <aside className="w-1/4 bg-white/5 border-r border-white/10 p-6 flex flex-col gap-6 overflow-y-auto">
          {/* WebRTC Audio status card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4">🎙️ Live Voice Room</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-3.5 w-3.5 rounded-full ${voiceConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
                <span className="text-sm font-medium text-gray-200">
                  {voiceConnected ? 'P2P Audio Connected' : 'Waiting for connection'}
                </span>
              </div>
              <button
                onClick={toggleMute}
                className={`p-2.5 rounded-xl border transition ${muted ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25'}`}
              >
                {muted ? '🔇 Muted' : '🎙️ Live'}
              </button>
            </div>
          </div>

          {/* Active room participants card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex-1 flex flex-col">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4">👥 Active Arena Users</h3>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl border border-white/5">
                <div className="h-8 w-8 rounded-full bg-cyan-500 flex items-center justify-center text-xs font-black">
                  ME
                </div>
                <div>
                  <div className="text-sm font-semibold">{displayName}</div>
                  <div className="text-xxs font-bold text-cyan-400 uppercase">{role} (Host)</div>
                </div>
              </div>
              {peers.map((peer) => (
                <div key={peer.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-black">
                    {peer.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{peer.name}</div>
                    <div className="text-xxs font-bold text-blue-400 uppercase">{peer.role}</div>
                  </div>
                </div>
              ))}
              {peers.length === 0 && (
                <div className="text-xs text-gray-500 text-center py-6">
                  Waiting for other peer to join...
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Right Side: Collaborative Notepad Scratchpad */}
        <main className="flex-1 flex flex-col p-6">
          <div className="flex-1 flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-white/10 px-6 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-extrabold uppercase tracking-widest text-cyan-400">
                  Shared Live Notepad & Scratchpad
                </span>
              </div>
              <span className="text-xxs font-semibold text-gray-400">
                Both of you can write, edit, and paste dynamically in real-time
              </span>
            </div>
            
            {/* Real-time sync textarea */}
            <textarea
              value={notepadContent}
              onChange={handleNotepadChange}
              className="flex-1 w-full bg-transparent p-6 text-gray-100 font-mono text-sm leading-relaxed border-none focus:outline-none resize-none"
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

export default InterviewArena;
