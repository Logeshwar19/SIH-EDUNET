import React, { useState, useEffect, useCallback, Component } from 'react';
import Navbar from './components/Navbar';
import TeacherDashboard from './components/TeacherDashboard';
import DeafModule from './components/DeafModule';
import BlindModule from './components/BlindModule';
import AccessibilityPanel from './components/AccessibilityPanel';
import AuthModal from './components/AuthModal';
import { initialLessons, initialStudents } from './data/lessonsData';
import {
  startLectureRecording,
  stopLectureRecording,
  broadcastTeacherReply,
  subscribeLecture,
  sentenceToISLGlosses,
  sendStudentQuestionViaWS,
  clearStaleLiveData
} from './services/liveLecture';

// Robust Error Boundary to prevent black screens
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[InclusiveAI] Component Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ maxWidth: '40rem', margin: '4rem auto', padding: '2rem', background: '#18181b', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '24px', textAlign: 'center', color: '#ffffff' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Module Interface Reload Needed</h2>
          <p style={{ fontSize: '0.875rem', color: '#a1a1aa', margin: '0 0 1.5rem 0' }}>
            {this.state.error?.message || "An unexpected view error occurred."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{ padding: '0.5rem 1.25rem', background: '#ffffff', color: '#09090b', borderRadius: '12px', border: 'none', fontWeight: 800, cursor: 'pointer' }}
          >
            Refresh Studio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('inclusiveai_current_user') || localStorage.getItem('inclusiveai_user_auth');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [defaultRoleOnAuth, setDefaultRoleOnAuth] = useState('teacher');
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const r = p.get('role');
      if (r === 'deaf' || r === 'blind' || r === 'teacher') return r;
    } catch {}
    try {
      const saved = localStorage.getItem('inclusiveai_current_user') || localStorage.getItem('inclusiveai_user_auth');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'teacher') return 'teacher';
        if (u.role === 'deaf' || u.role === 'deaf_student') return 'deaf';
        if (u.role === 'blind' || u.role === 'blind_student') return 'blind';
      }
    } catch {}
    return 'teacher';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [lessons, setLessons] = useState(initialLessons);
  const [currentLessonId, setCurrentLessonId] = useState(null);
  const [students, setStudents] = useState(initialStudents);

  // Live Lecture State
  const [isLiveLecture, setIsLiveLecture] = useState(false);
  const [liveLectureGlosses, setLiveLectureGlosses] = useState([]);
  const [liveLectureTranscript, setLiveLectureTranscript] = useState('');
  const [liveTeacherReply, setLiveTeacherReply] = useState(null);

  const [inboxMessages, setInboxMessages] = useState([]);

  // Accessibility Controls
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  // Handle URL parameters on load + clean up stale live class data
  useEffect(() => {
    // Clear any stale live class data from previous sessions
    clearStaleLiveData();
    
    try {
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get('role');
      if (roleParam === 'deaf' || roleParam === 'blind' || roleParam === 'teacher') {
        setDefaultRoleOnAuth(roleParam);
        setActiveTab(roleParam);
      }
    } catch (e) {}
  }, []);

  // ── Live Lecture Controls ───────────────────────────────────────────────────
  const handleStartLiveLecture = useCallback(() => {
    setIsLiveLecture(true);
    setLiveLectureGlosses([]);
    setLiveLectureTranscript('');
  }, []);

  const handleStopLiveLecture = useCallback(() => {
    setIsLiveLecture(false);
  }, []);

  const handleLiveTranscriptUpdate = useCallback((glosses, rawText) => {
    setLiveLectureTranscript(rawText);
    if (Array.isArray(glosses) && glosses.length > 0) {
      setLiveLectureGlosses(prev => {
        const next = [...prev, ...glosses];
        return next.slice(-40);
      });
    }
  }, []);

  // Listen for teacher reply broadcasts
  useEffect(() => {
    const unsub = subscribeLecture((glosses, rawText) => {
      setLiveLectureGlosses(prev => {
        const next = [...prev, ...glosses];
        return next.slice(-40);
      });
    });
    return unsub;
  }, []);

  // ── Teacher Reply → ISL Broadcast ──────────────────────────────────────────
  const handleTeacherReply = useCallback((replyText) => {
    const glosses = broadcastTeacherReply(replyText);
    setLiveTeacherReply({ glosses, rawText: replyText, timestamp: Date.now() });
  }, []);

  // ── Lesson Handlers ─────────────────────────────────────────────────────────
  const handleUploadLesson = (newLesson) => {
    setLessons(prev => [newLesson, ...prev]);
    setCurrentLessonId(newLesson.id);
  };

  const handleSavePractice = (payload) => {
    try {
      const signWord = payload?.sign || payload?.word || "Gesture";
      const score = payload?.score || 90;
      const meaning = payload?.meaning || signWord;
      const isMatched = payload?.matched !== undefined ? payload.matched : true;
      const matchScore = payload?.matchScore !== undefined ? Math.round(payload.matchScore * 100) : 91;
      const lessonTitle = payload?.lesson || "Current Lesson";

      setStudents(prev => {
        const copy = Array.isArray(prev) ? [...prev] : [];
        let rohan = copy.find(s => s && s.id === 'student-rohan');
        if (!rohan) {
          rohan = {
            id: 'student-rohan',
            name: currentUser?.name ? `${currentUser.name} (${currentUser.role === 'deaf' ? 'Deaf Student' : 'Student'})` : 'Rohan Patel (Deaf Student)',
            role: 'Deaf Student',
            signAccuracyAvg: score,
            recentSignSubmissions: []
          };
          copy.push(rohan);
        }
        if (!Array.isArray(rohan.recentSignSubmissions)) {
          rohan.recentSignSubmissions = [];
        }
        rohan.recentSignSubmissions.unshift({
          word: signWord,
          meaning,
          score,
          matchScore,
          lesson: lessonTitle,
          matched: isMatched,
          timestamp: "Just now",
          status: isMatched ? "Lesson Relevant" : "Reviewed"
        });
        const total = rohan.recentSignSubmissions.reduce((acc, curr) => acc + (curr.score || 0), 0);
        rohan.signAccuracyAvg = Math.round(total / Math.max(1, rohan.recentSignSubmissions.length));
        return copy;
      });

      fetch('/api/sign-practice/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: 'student-rohan', word: signWord, score, meaning, matched: isMatched })
      }).catch(() => {});
    } catch (err) {
      console.warn("handleSavePractice safe fallback:", err);
    }
  };

  // Real-time Student Doubts Synchronization across devices
  useEffect(() => {
    const handleIncomingDoubt = (e) => {
      if (e.detail) {
        const doubtMsg = {
          id: e.detail.id || `msg-${Date.now()}`,
          studentName: e.detail.studentName || "Student Doubt",
          message: e.detail.message || e.detail.recognizedSignText || "",
          timestamp: new Date().toISOString()
        };
        setInboxMessages(prev => [doubtMsg, ...prev]);
      }
    };
    window.addEventListener('inclusiveai-student-doubt', handleIncomingDoubt);
    return () => window.removeEventListener('inclusiveai-student-doubt', handleIncomingDoubt);
  }, []);

  const handleSendMessageToTeacher = ({ studentName, recognizedSignText }) => {
    const senderName = studentName || currentUser?.name || "Rohan Patel (Deaf Student)";
    const newMsg = {
      id: `msg-${Date.now()}`,
      studentName: senderName,
      message: recognizedSignText,
      timestamp: new Date().toISOString()
    };

    setInboxMessages(prev => [newMsg, ...prev]);

    // Send doubt in real-time over WebSocket to Teacher on any laptop
    sendStudentQuestionViaWS({
      studentId: currentUser?.id || 'student-rohan',
      studentName: senderName,
      message: recognizedSignText,
      doubtType: 'sign_to_text'
    });

    fetch('/api/sign-to-text/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentName: senderName, recognizedSignText })
    }).catch(() => {});
  };

  const [sharedLessonAlert, setSharedLessonAlert] = useState(null);

  // Real-time Shared Lesson Broadcast from Teacher to Students
  useEffect(() => {
    const handleIncomingLesson = (e) => {
      if (e.detail?.lesson) {
        const incomingLesson = e.detail.lesson;
        setLessons(prev => [incomingLesson, ...prev.filter(l => l.id !== incomingLesson.id)]);
        setCurrentLessonId(incomingLesson.id);
        setSharedLessonAlert(incomingLesson);
        setTimeout(() => setSharedLessonAlert(null), 10000);
      }
    };
    window.addEventListener('inclusiveai-lesson-shared', handleIncomingLesson);
    return () => window.removeEventListener('inclusiveai-lesson-shared', handleIncomingLesson);
  }, []);

  const handleLoginSuccess = useCallback((user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('inclusiveai_current_user', JSON.stringify(user));
    } catch (e) {}
    setIsAuthModalOpen(false);
    if (user.role === 'teacher') {
      setActiveTab('teacher');
    } else if (user.role === 'deaf' || user.role === 'deaf_student') {
      setActiveTab('deaf');
    } else if (user.role === 'blind' || user.role === 'blind_student') {
      setActiveTab('blind');
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('inclusiveai_current_user');
      localStorage.removeItem('inclusiveai_user_auth');
    } catch (e) {}
    setActiveTab('teacher');
    setIsAuthModalOpen(true);
  }, []);

  const currentLesson = lessons.find(l => l.id === currentLessonId) || lessons[0];

  return (
    <div style={{ position: 'relative', minHeight: '100vh', zIndex: 1 }}>
      {/* Real-Time Teacher Shared Lesson Alert Banner */}
      {sharedLessonAlert && (
        <div style={{
          maxWidth: '82rem',
          margin: '0.75rem auto 0 auto',
          padding: '0 1rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #18181b, #27272a)',
            border: '1px solid rgba(52, 211, 153, 0.4)',
            borderRadius: '16px',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📚</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 800, background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                    TEACHER SHARED CURRICULUM
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#ffffff' }}>
                    {sharedLessonAlert.title}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: '0.15rem 0 0 0' }}>
                  Multi-modal conversion complete: ISL Sign Gestures (Deaf) and Voice Chapters & Haptics (Blind) ready!
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setCurrentLessonId(sharedLessonAlert.id);
                  setSharedLessonAlert(null);
                }}
                style={{
                  padding: '0.45rem 1rem',
                  background: '#ffffff',
                  color: '#09090b',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Explore Lesson Now →
              </button>
              <button
                onClick={() => setSharedLessonAlert(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a1a1aa',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Navbar with Profile & Role Tabs */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lessons={lessons}
        currentLessonId={currentLessonId}
        setCurrentLessonId={setCurrentLessonId}
        isAudioMuted={isAudioMuted}
        setIsAudioMuted={setIsAudioMuted}
        hapticsEnabled={hapticsEnabled}
        setHapticsEnabled={setHapticsEnabled}
        isLiveLecture={isLiveLecture}
        onStartLiveLecture={handleStartLiveLecture}
        onStopLiveLecture={handleStopLiveLecture}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main style={{ paddingBottom: '5rem' }}>
        {activeTab === 'teacher' && (
          <TeacherDashboard
            currentUser={currentUser}
            lessons={lessons}
            currentLessonId={currentLessonId}
            setCurrentLessonId={setCurrentLessonId}
            onUploadLesson={handleUploadLesson}
            students={students}
            inboxMessages={inboxMessages}
            setActiveTab={setActiveTab}
            isLiveLecture={isLiveLecture}
            onStartLiveLecture={handleStartLiveLecture}
            onStopLiveLecture={handleStopLiveLecture}
            onTranscriptUpdate={handleLiveTranscriptUpdate}
            liveLectureGlosses={liveLectureGlosses}
            liveLectureTranscript={liveLectureTranscript}
            onTeacherReply={handleTeacherReply}
          />
        )}

        {activeTab === 'deaf' && (
          <DeafModule
            lesson={currentLesson}
            onSavePractice={handleSavePractice}
            onSendMessageToTeacher={handleSendMessageToTeacher}
            isLiveLecture={isLiveLecture}
            liveLectureGlosses={liveLectureGlosses}
            liveTeacherReply={liveTeacherReply}
          />
        )}

        {activeTab === 'blind' && (
          <BlindModule
            lesson={currentLesson}
            isAudioMuted={isAudioMuted}
            hapticsEnabled={hapticsEnabled}
            isLiveLecture={isLiveLecture}
            liveLectureTranscript={liveLectureTranscript}
          />
        )}
      </main>

      {/* Persistent Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '1.25rem 1rem',
        textAlign: 'center',
        background: 'rgba(10, 8, 20, 0.6)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)' }}>
            InclusiveAI • SIH 2026 • Multi-Modal Accessible Education Engine
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.6875rem' }}>
            <span>MediaPipe ISL</span>
            <span>•</span>
            <span>Web Speech API</span>
            <span>•</span>
            <span>Upload once, learn without barriers</span>
          </div>
        </div>
      </footer>

      {/* Universal Floating Accessibility Panel */}
      <AccessibilityPanel />

      {/* Gmail Authentication & Role Setup Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleLoginSuccess}
        currentProfile={currentUser}
      />
    </div>
  );
}
