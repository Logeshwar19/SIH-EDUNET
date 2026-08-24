import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import TeacherDashboard from './components/TeacherDashboard';
import DeafModule from './components/DeafModule';
import BlindModule from './components/BlindModule';
import AccessibilityPanel from './components/AccessibilityPanel';
import { initialLessons, initialStudents } from './data/lessonsData';
import {
  startLectureRecording,
  stopLectureRecording,
  broadcastTeacherReply,
  subscribeLecture,
  sentenceToISLGlosses
} from './services/liveLecture';

export default function App() {
  const [activeTab, setActiveTab] = useState('teacher'); // 'teacher', 'deaf', 'blind'
  const [lessons, setLessons] = useState(initialLessons);
  const [currentLessonId, setCurrentLessonId] = useState('lesson-heart-anatomy');
  const [students, setStudents] = useState(initialStudents);

  // Live Lecture State
  const [isLiveLecture, setIsLiveLecture] = useState(false);
  const [liveLectureGlosses, setLiveLectureGlosses] = useState([]); // rolling window of latest glosses
  const [liveLectureTranscript, setLiveLectureTranscript] = useState('');
  const [liveTeacherReply, setLiveTeacherReply] = useState(null); // { glosses, rawText }

  const [inboxMessages, setInboxMessages] = useState([
    {
      id: "msg-init-1",
      studentName: "Rohan Patel (Deaf)",
      message: "Signed: Teacher, I completed the Heart circulation sign practice.",
      timestamp: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: "msg-init-2",
      studentName: "Ananya Sharma (Blind)",
      message: "Completed Voice Quiz for 'The Human Heart & Circulatory System' with 100% score.",
      timestamp: new Date(Date.now() - 900000).toISOString()
    }
  ]);

  // Accessibility Controls
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  // Fetch backend lessons if server is running
  useEffect(() => {
    fetch('/api/lessons')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.lessons?.length > 0) {
          // Sync with backend if available
        }
      })
      .catch(() => {
        // Fallback to local lessonsData — expected behavior
      });
  }, []);

  // ── Live Lecture Controls ───────────────────────────────────────────────────
  const handleStartLiveLecture = useCallback(() => {
    const started = startLectureRecording((glosses, rawText, isFinal) => {
      if (isFinal && glosses.length > 0) {
        setLiveLectureGlosses(prev => {
          const next = [...prev, ...glosses];
          return next.slice(-40); // keep rolling 40-token window
        });
        setLiveLectureTranscript(prev => {
          const lines = prev.split('\n').filter(Boolean);
          lines.push(rawText);
          return lines.slice(-8).join('\n'); // last 8 lines
        });
      }
    });
    if (started) {
      setIsLiveLecture(true);
      setLiveLectureGlosses([]);
      setLiveLectureTranscript('');
    } else {
      alert('Microphone / Speech Recognition not available in this browser. Please use Chrome or Edge.');
    }
  }, []);

  const handleStopLiveLecture = useCallback(() => {
    stopLectureRecording();
    setIsLiveLecture(false);
  }, []);

  // Listen for teacher reply broadcasts
  useEffect(() => {
    const unsub = subscribeLecture((glosses, rawText) => {
      // Update glosses from broadcast (cross-tab sync)
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
    const signWord = payload.sign || payload.word || "Gesture";
    const score = payload.score || 90;
    const meaning = payload.meaning || signWord;
    const isMatched = payload.matched !== undefined ? payload.matched : true;
    const matchScore = payload.matchScore !== undefined ? Math.round(payload.matchScore * 100) : 91;
    const lessonTitle = payload.lesson || "Current Lesson";

    setStudents(prev => {
      const copy = [...prev];
      const rohan = copy.find(s => s.id === 'student-rohan') || copy[0];
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
      const total = rohan.recentSignSubmissions.reduce((acc, curr) => acc + curr.score, 0);
      rohan.signAccuracyAvg = Math.round(total / rohan.recentSignSubmissions.length);
      return copy;
    });

    fetch('/api/sign-practice/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: 'student-rohan', word: signWord, score, meaning, matched: isMatched })
    }).catch(() => {});
  };

  const handleSendMessageToTeacher = ({ studentName, recognizedSignText }) => {
    const newMsg = {
      id: `msg-${Date.now()}`,
      studentName,
      message: recognizedSignText,
      timestamp: new Date().toISOString()
    };

    setInboxMessages(prev => [newMsg, ...prev]);

    fetch('/api/sign-to-text/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentName, recognizedSignText })
    }).catch(() => {});
  };

  const currentLesson = lessons.find(l => l.id === currentLessonId) || lessons[0];

  return (
    <div style={{ position: 'relative', minHeight: '100vh', zIndex: 1 }}>
      {/* Universal Navbar */}
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
      />

      {/* Main Content Area */}
      <main style={{ paddingBottom: '5rem' }}>
        {activeTab === 'teacher' && (
          <TeacherDashboard
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
    </div>
  );
}
