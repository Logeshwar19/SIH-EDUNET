import React, { useState, useEffect, useCallback, Component } from 'react';
import Navbar from './components/Navbar';
import TeacherDashboard from './components/TeacherDashboard';
import DeafModule from './components/DeafModule';
import BlindModule from './components/BlindModule';
import AccessibilityPanel from './components/AccessibilityPanel';
import AuthPortal from './components/AuthPortal';
import { initialLessons, initialStudents } from './data/lessonsData';
import {
  startLectureRecording,
  stopLectureRecording,
  broadcastTeacherReply,
  subscribeLecture,
  sentenceToISLGlosses,
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
      const saved = localStorage.getItem('inclusiveai_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [defaultRoleOnAuth, setDefaultRoleOnAuth] = useState('teacher');
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem('inclusiveai_current_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'teacher') return 'teacher';
        if (u.role === 'deaf_student') return 'deaf';
        if (u.role === 'blind_student') return 'blind';
      }
    } catch {}
    return 'auth';
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
      }
    } catch (e) {}
  }, [currentUser]);

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

  const handleSendMessageToTeacher = ({ studentName, recognizedSignText }) => {
    const newMsg = {
      id: `msg-${Date.now()}`,
      studentName: studentName || currentUser?.name || "Student Doubt",
      message: recognizedSignText,
      timestamp: new Date().toISOString()
    };

    setInboxMessages(prev => [newMsg, ...prev]);

    fetch('/api/sign-to-text/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentName: newMsg.studentName, recognizedSignText })
    }).catch(() => {});
  };

  const handleLoginSuccess = useCallback((user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('inclusiveai_current_user', JSON.stringify(user));
    } catch (e) {}
    setIsAuthModalOpen(false);
    if (user.role === 'teacher') {
      setActiveTab('teacher');
    } else if (user.role === 'deaf_student') {
      setActiveTab('deaf');
    } else if (user.role === 'blind_student') {
      setActiveTab('blind');
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('inclusiveai_current_user');
    } catch (e) {}
    setActiveTab('auth');
  }, []);

  const currentLesson = lessons.find(l => l.id === currentLessonId) || lessons[0];

  return (
    <div style={{ position: 'relative', minHeight: '100vh', zIndex: 1 }}>
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

      {/* Main Content Area — Strict Role Isolation */}
      <main style={{ paddingBottom: '5rem' }}>
        {!currentUser && (
          <AuthPortal
            onLoginSuccess={handleLoginSuccess}
            currentActiveRole={defaultRoleOnAuth}
          />
        )}

        {currentUser?.role === 'teacher' && (
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

        {currentUser?.role === 'deaf_student' && (
          <DeafModule
            lesson={currentLesson}
            onSavePractice={handleSavePractice}
            onSendMessageToTeacher={handleSendMessageToTeacher}
            isLiveLecture={isLiveLecture}
            liveLectureGlosses={liveLectureGlosses}
            liveTeacherReply={liveTeacherReply}
          />
        )}

        {currentUser?.role === 'blind_student' && (
          <BlindModule
            lesson={currentLesson}
            isAudioMuted={isAudioMuted}
            hapticsEnabled={hapticsEnabled}
            isLiveLecture={isLiveLecture}
            liveLectureTranscript={liveLectureTranscript}
          />
        )}
      </main>

      {/* Auth Portal Modal (Quick Switch Portal / Switch User) */}
      {isAuthModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(16px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '52rem' }}>
            <button
              onClick={() => setIsAuthModalOpen(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 20,
                background: '#27272a',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                cursor: 'pointer',
                zIndex: 20,
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close"
            >
              ✕
            </button>
            <AuthPortal
              onLoginSuccess={handleLoginSuccess}
              currentActiveRole={activeTab}
            />
          </div>
        </div>
      )}

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
        onClose={() => currentUser && setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        currentProfile={currentUser}
      />
    </div>
  );
}
