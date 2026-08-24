import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  Layers,
  BookOpen,
  Hand,
  Eye,
  BarChart3,
  Users,
  Clock,
  Inbox,
  ArrowRight,
  Sparkles,
  Zap,
  Radio,
  Square,
  Send,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  FolderUp,
  Check,
  Calendar,
  Award,
  ChevronRight
} from 'lucide-react';

const STAGE_LABELS = [
  '',
  'Parsing document structure...',
  'Extracting key concepts & diagrams...',
  'Generating Indian Sign Language (ISL) glosses...',
  'Building tactile vibration coordinates...'
];

export default function TeacherDashboard({
  lessons,
  currentLessonId,
  setCurrentLessonId,
  onUploadLesson,
  students,
  inboxMessages,
  setActiveTab,
  isLiveLecture,
  onStartLiveLecture,
  onStopLiveLecture,
  liveLectureGlosses,
  liveLectureTranscript,
  onTeacherReply,
}) {
  const [uploadText, setUploadText] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubject, setUploadSubject] = useState('Biology');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [replySentMsg, setReplySentMsg] = useState(null);
  const [selectedScheduleDay, setSelectedScheduleDay] = useState(6);
  const fileInputRef = useRef(null);

  const currentLesson = lessons.find((l) => l.id === currentLessonId) || lessons[0];

  const handleSimulatedUpload = (sampleKey) => {
    setIsProcessing(true);
    setProcessingStage(1);
    let current = 1;
    const interval = setInterval(() => {
      current++;
      setProcessingStage(current);
      if (current > 4) {
        clearInterval(interval);
        setIsProcessing(false);
        setProcessingStage(0);
        if (sampleKey === 'photosynthesis') {
          setCurrentLessonId('lesson-photosynthesis');
        } else {
          setCurrentLessonId('lesson-heart-anatomy');
        }
      }
    }, 600);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile && !uploadTitle.trim() && !uploadText.trim()) return;
    setIsProcessing(true);
    setProcessingStage(1);
    const formData = new FormData();
    if (selectedFile) formData.append('file', selectedFile);
    formData.append('title', uploadTitle);
    formData.append('subject', uploadSubject);
    formData.append('rawText', uploadText);

    try {
      setProcessingStage(2);
      const res = await fetch('/api/lessons/upload', { method: 'POST', body: formData });
      setProcessingStage(3);
      const data = await res.json();
      setProcessingStage(4);
      setTimeout(() => {
        if (data.success && data.lesson) {
          onUploadLesson(data.lesson);
        } else {
          const newLesson = {
            id: `lesson-custom-${Date.now()}`,
            title: uploadTitle || (selectedFile ? selectedFile.name : 'Custom Lesson'),
            subject: uploadSubject || 'Science',
            grade: 'Grade 10',
            estimatedTime: '12 mins',
            summary: uploadText ? uploadText.slice(0, 240) + '...' : 'Generated lesson.',
            originalFileName: selectedFile ? selectedFile.name : 'Lesson.pdf',
            uploadedAt: new Date().toISOString(),
            islModule: {
              lessonGlosses: [
                { word: 'SCIENCE', gloss: 'SCIENCE', description: 'Alternating downward circular motion.', duration: 2.6 },
                { word: 'TEACHER', gloss: 'TEACHER', description: 'Flattened hands at temples move forward.', duration: 2.8 },
                { word: 'STUDENT', gloss: 'STUDENT', description: 'Draw knowledge to forehead.', duration: 2.7 },
              ],
              practiceWords: [{ id: 'science', word: 'Science', hint: 'Rotate fists in circular motions.', targetPose: 'FIST_PULSE' }],
              quiz: [{ id: `q-${Date.now()}`, question: `What is the core principle of ${uploadTitle || 'this topic'}?`, options: ['Core mechanism', 'No analysis'], correctIndex: 0, signHint: 'Focus on fundamentals.' }],
            },
            bviModule: {
              audioSummary: `Welcome to ${uploadTitle || 'this lesson'}.`,
              audioSections: [{ sectionTitle: 'Overview', content: uploadText || 'Key principles.' }],
              hapticDiagram: {
                id: `diagram-${Date.now()}`,
                title: `Diagram: ${uploadTitle || 'Structure'}`,
                aspectRatio: '4:3',
                viewBox: { width: 800, height: 600 },
                paths: [{ id: 'boundary', name: 'Outer Boundary', type: 'boundary', d: 'M 400,120 C 520,70 660,160 640,320 C 620,440 460,530 400,560 C 340,530 180,440 160,320 C 140,160 280,70 400,120 Z', vibrationPattern: [40, 25] }],
                landmarks: [{ id: 'poi-1', name: 'Core Region', x: 400, y: 320, radius: 50, audioDescription: `You are touching ${uploadTitle || 'this lesson'}.`, hapticTone: [100, 50, 100], color: '#ffffff' }],
              },
              voiceQuiz: [{ id: `vq-${Date.now()}`, spokenQuestion: 'What is the primary function?', expectedKeywords: ['concept', 'system'], points: 10 }],
            },
          };
          onUploadLesson(newLesson);
        }
        setIsProcessing(false);
        setProcessingStage(0);
        setSelectedFile(null);
        setUploadTitle('');
        setUploadText('');
      }, 600);
    } catch (error) {
      setIsProcessing(false);
      setProcessingStage(0);
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    onTeacherReply(replyText.trim());
    setReplySentMsg(replyText.trim());
    setReplyText('');
    setTimeout(() => setReplySentMsg(null), 4000);
  };

  return (
    <div style={{ maxWidth: '82rem', margin: '0 auto', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* ── 1. HERO BANNER (Sleek Grey & Black Onyx Glass) ── */}
      <div className="ref-card-hero" style={{ padding: '2.25rem 2.5rem', position: 'relative' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '40rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.75rem', background: '#27272a', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem', color: '#f4f4f5' }}>
              <Sparkles style={{ width: 12, height: 12 }} />
              Inclusive Classroom Engine
            </div>
            <h1 style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.15, margin: 0, color: '#ffffff' }}>
              All-in-One Access for Every Student 👋
            </h1>
            <p style={{ fontSize: '0.9375rem', marginTop: '0.625rem', lineHeight: 1.6, color: '#d4d4d8' }}>
              Upload classroom PDFs or textbook notes. The AI engine generates <strong>Indian Sign Language (ISL)</strong> sign animations, <strong>tactile haptic diagrams</strong>, and <strong>voice-assisted assessments</strong>.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              <button onClick={() => setActiveTab('deaf')} className="btn-primary">
                <Hand style={{ width: 15, height: 15 }} /> Preview ISL Deaf Module
              </button>
              <button onClick={() => setActiveTab('blind')} className="btn-secondary">
                <Eye style={{ width: 15, height: 15 }} /> Preview Blind BVI Module
              </button>
            </div>
          </div>

          {/* Quick Stat Pill Card */}
          <div style={{ background: '#121215', padding: '1.25rem', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.12)', minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa' }}>Active Lesson</span>
              <span style={{ fontSize: '0.6875rem', padding: '0.15rem 0.5rem', background: '#27272a', color: '#ffffff', borderRadius: '999px', fontWeight: 800, border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                {currentLesson?.grade || 'Grade 10'}
              </span>
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff' }}>
              {currentLesson?.title?.slice(0, 26)}…
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
              <span style={{ color: '#d4d4d8' }}>✓ {currentLesson?.islModule?.lessonGlosses?.length || 0} Signs</span>
              <span>•</span>
              <span style={{ color: '#d4d4d8' }}>✓ {currentLesson?.bviModule?.voiceQuiz?.length || 0} Voice Qs</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. LIVE LECTURE BROADCAST HUB (Voice -> ISL Captions) ── */}
      <div className="ref-card" style={{ padding: '1.5rem 1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: '12px', background: '#27272a', border: '1px solid rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <Radio style={{ width: 20, height: 20, color: '#f87171' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Live Classroom Lecture Broadcast
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: 0 }}>
                Teacher speaks → Speech is immediately converted to Indian Sign Language (ISL) Closed Captions
              </p>
            </div>
          </div>

          {!isLiveLecture ? (
            <button onClick={onStartLiveLecture} className="btn-primary">
              <Radio style={{ width: 15, height: 15 }} /> Start Live Lecture
            </button>
          ) : (
            <button onClick={onStopLiveLecture} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.3rem', background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', fontWeight: 800,
              fontSize: '0.8125rem', borderRadius: '9999px', cursor: 'pointer'
            }}>
              <span className="live-dot" /> LIVE — Stop Broadcast
              <Square style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>

        {isLiveLecture ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#a1a1aa', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
              Live ISL Gloss Tokens (Streaming to Deaf Students)
            </p>
            <div className="caption-strip" style={{ minHeight: '52px' }}>
              {liveLectureGlosses.length === 0 ? (
                <span style={{ color: '#71717a', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                  Listening to teacher microphone… Speak to stream ISL sign tokens
                </span>
              ) : (
                liveLectureGlosses.slice(-20).map((g, i) => (
                  <span key={i} className={`caption-token ${i === liveLectureGlosses.slice(-20).length - 1 ? 'new' : ''}`}>
                    {g}
                  </span>
                ))
              )}
            </div>
            {liveLectureTranscript && (
              <div style={{ background: '#121215', borderRadius: '12px', padding: '0.75rem 1rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <p style={{ fontSize: '0.6875rem', color: '#a1a1aa', margin: '0 0 0.25rem 0', fontFamily: 'var(--font-mono)' }}>LIVE TRANSCRIPT</p>
                <p style={{ fontSize: '0.875rem', color: '#f4f4f5', margin: 0, lineHeight: 1.5 }}>{liveLectureTranscript}</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: '#121215', borderRadius: '14px', padding: '1rem 1.25rem', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Zap style={{ width: 18, height: 18, color: '#ffffff', flexShrink: 0 }} />
            <p style={{ fontSize: '0.8125rem', color: '#d4d4d8', margin: 0, lineHeight: 1.5 }}>
              Click <strong>"Start Live Lecture"</strong> above. When you speak, your lecture is captured in real time, translated to <strong>ISL Sign Glosses</strong>, and synchronized with students in the <strong>ISL / Deaf tab</strong> like live sign language captions.
            </p>
          </div>
        )}
      </div>

      {/* ── 3. VISUAL ANALYTICS & STATS GRID (Grey & Black Minimalist) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Visual Chart Card: Performance Wave */}
        <div className="ref-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Performance Chart
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: 0 }}>This week's student comprehension rate</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.6875rem', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#a1a1aa' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#71717a' }} /> Theory
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ffffff' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffffff' }} /> Practical
              </span>
            </div>
          </div>

          {/* Monochromatic SVG Wave chart */}
          <div style={{ position: 'relative', height: '140px', background: '#121215', borderRadius: '16px', padding: '0.5rem', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ position: 'absolute', top: '16px', left: '42%', background: '#ffffff', color: '#09090b', padding: '0.25rem 0.6rem', borderRadius: '12px', fontSize: '0.6875rem', fontWeight: 900, boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)', zIndex: 2 }}>
              +16% ISL Recall
            </div>

            <svg viewBox="0 0 500 120" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
              <defs>
                <linearGradient id="whiteWave" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id="greyWave" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#71717a" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#71717a" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d="M0,80 Q70,40 140,75 T280,30 T420,65 T500,40 L500,120 L0,120 Z" fill="url(#whiteWave)" />
              <path d="M0,80 Q70,40 140,75 T280,30 T420,65 T500,40" fill="none" stroke="#ffffff" strokeWidth="2" />
              <path d="M0,60 Q80,20 160,50 T320,15 T440,45 T500,25 L500,120 L0,120 Z" fill="url(#greyWave)" />
              <path d="M0,60 Q80,20 160,50 T320,15 T440,45 T500,25" fill="none" stroke="#a1a1aa" strokeWidth="1.5" />
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#71717a', marginTop: '0.5rem', fontFamily: 'var(--font-mono)' }}>
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>

        {/* Arc Progress Meter Card */}
        <div className="ref-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                My Learning Progress
              </h3>
              <span style={{ fontSize: '0.6875rem', color: '#a1a1aa', fontWeight: 600 }}>Current Portfolio</span>
            </div>
          </div>

          {/* Radial Arc Gauge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem 0' }}>
            <div style={{ position: 'relative', width: '160px', height: '100px', overflow: 'hidden' }}>
              <svg viewBox="0 0 160 90" style={{ width: '100%', height: '100%' }}>
                <path d="M10,80 A70,70 0 0,1 150,80" fill="none" stroke="#27272a" strokeWidth="14" strokeLinecap="round" />
                <path d="M10,80 A70,70 0 0,1 150,80" fill="none" stroke="#ffffff" strokeWidth="14" strokeLinecap="round" strokeDasharray="220" strokeDashoffset="55" />
              </svg>
              <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', textAlign: 'center' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>76%</span>
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: '0.35rem 0 0 0', fontWeight: 500 }}>
              Great progress across learning modules
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setActiveTab('deaf')} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '0.5rem' }}>
              Explore Quizzes
            </button>
            <button onClick={() => setActiveTab('blind')} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '0.5rem' }}>
              Evaluate Plan
            </button>
          </div>
        </div>

        {/* Schedule & Collaboration Card */}
        <div className="ref-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                My Schedule
              </h3>
              <span style={{ fontSize: '0.6875rem', color: '#a1a1aa' }}>Weekly classes & sessions</span>
            </div>

            {/* Schedule Day Pills */}
            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'space-between' }}>
              {[
                { day: '4', name: 'Apr' },
                { day: '5', name: 'Apr' },
                { day: '6', name: 'Apr' },
                { day: '7', name: 'Apr' },
                { day: '8', name: 'Apr' },
                { day: '9', name: 'Apr' },
              ].map((item, idx) => {
                const isActive = item.day === '6';
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedScheduleDay(parseInt(item.day))}
                    className={`schedule-pill ${isActive ? 'active' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: '0.8125rem', fontWeight: 800 }}>{item.day}</span>
                    <span style={{ fontSize: '0.625rem' }}>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffffff' }}>Student Collaboration</span>
              <span style={{ fontSize: '0.6875rem', color: '#d4d4d8', fontWeight: 700 }}>+ Add Student</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(students || []).map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: '#121215', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#27272a', color: 'white', border: '1px solid rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 800 }}>
                      {s.name[0]}
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>{s.name}</p>
                      <p style={{ fontSize: '0.625rem', color: '#a1a1aa', margin: 0 }}>{s.type === 'deaf' ? 'ISL Sign Student' : 'BVI Audio/Haptic'}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.625rem', fontWeight: 800, padding: '0.15rem 0.5rem', background: '#27272a', color: '#34d399', borderRadius: '999px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                    Completed
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. DOCUMENT INGESTION & TEACHER-STUDENT BRIDGE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        
        {/* Ingestion Card */}
        <div className="ref-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '12px', background: '#27272a', border: '1px solid rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Upload style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Document Curriculum Ingestion
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: 0 }}>Upload PDF, TXT or paste lesson notes</p>
            </div>
          </div>

          {/* Quick Benchmark Lessons */}
          <div style={{ background: '#121215', borderRadius: '16px', padding: '0.875rem', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#a1a1aa', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pre-Configured Benchmark Lessons:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                onClick={() => handleSimulatedUpload('heart')}
                disabled={isProcessing}
                style={{ padding: '0.625rem', background: '#18181b', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff' }}>Heart Anatomy</span>
                  <ChevronRight style={{ width: 12, height: 12, color: '#ffffff' }} />
                </div>
                <p style={{ fontSize: '0.625rem', color: '#a1a1aa', margin: '0.15rem 0 0 0' }}>Class 10 Biology</p>
              </button>

              <button
                onClick={() => handleSimulatedUpload('photosynthesis')}
                disabled={isProcessing}
                style={{ padding: '0.625rem', background: '#18181b', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff' }}>Photosynthesis</span>
                  <ChevronRight style={{ width: 12, height: 12, color: '#ffffff' }} />
                </div>
                <p style={{ fontSize: '0.625rem', color: '#a1a1aa', margin: '0.15rem 0 0 0' }}>Class 9 Biology</p>
              </button>
            </div>
          </div>

          {/* Upload Form */}
          <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.txt" style={{ display: 'none' }} />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '1.25rem',
                border: '2px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                background: '#121215',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <FolderUp style={{ width: 26, height: 26, color: '#ffffff' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>
                {selectedFile ? `✓ ${selectedFile.name}` : 'Click to select PDF or TXT notes'}
              </span>
              <span style={{ fontSize: '0.6875rem', color: '#a1a1aa' }}>Supports automatic OCR, ISL tokenization & tactile mapping</span>
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#a1a1aa', marginBottom: '0.25rem' }}>Lesson Title</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Circulatory System"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.15)', fontSize: '0.8125rem', color: '#ffffff', background: '#121215' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#a1a1aa', marginBottom: '0.25rem' }}>Subject & Grade</label>
                <input
                  type="text"
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  placeholder="Class 10 Biology"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.15)', fontSize: '0.8125rem', color: '#ffffff', background: '#121215' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#a1a1aa', marginBottom: '0.25rem' }}>Or Paste Lesson Content</label>
              <textarea
                rows={3}
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                placeholder="Paste textbook paragraph or teacher notes..."
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.15)', fontSize: '0.8125rem', color: '#ffffff', background: '#121215', resize: 'vertical' }}
              />
            </div>

            {isProcessing && (
              <div style={{ background: '#121215', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '0.75rem 1rem', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <RefreshCw style={{ width: 14, height: 14, color: '#ffffff', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff' }}>{STAGE_LABELS[processingStage] || 'Processing lesson…'}</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: processingStage >= i ? '#ffffff' : '#27272a' }} />
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing || (!selectedFile && !uploadTitle && !uploadText)}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.75rem',
                opacity: isProcessing || (!selectedFile && !uploadTitle && !uploadText) ? 0.45 : 1,
                cursor: isProcessing || (!selectedFile && !uploadTitle && !uploadText) ? 'not-allowed' : 'pointer',
              }}
            >
              <Sparkles style={{ width: 16, height: 16 }} />
              {isProcessing ? 'Generating Accessible Formats…' : 'Generate Accessible Curriculum'}
            </button>
          </form>
        </div>

        {/* Right Column: Teacher Reply to Doubt -> ISL & Student Inbox */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Reply -> ISL Broadcast Card */}
          <div className="ref-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#27272a', border: '1px solid rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <MessageSquare style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Teacher Answer → Live ISL Broadcast
                </h3>
                <p style={{ fontSize: '0.6875rem', color: '#a1a1aa', margin: 0 }}>
                  Type your explanation → automatically converted into sign tokens for deaf students
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type response to student's signed doubt…"
                onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                style={{ flex: 1, padding: '0.5rem 0.85rem', borderRadius: '999px', border: '1px solid rgba(255, 255, 255, 0.15)', fontSize: '0.8125rem', color: '#ffffff', background: '#121215' }}
              />
              <button
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                className="btn-primary"
                style={{ padding: '0.5rem 1.1rem', flexShrink: 0, opacity: !replyText.trim() ? 0.4 : 1 }}
              >
                <Send style={{ width: 14, height: 14 }} /> Send ISL
              </button>
            </div>

            {replySentMsg && (
              <div style={{ padding: '0.5rem 0.75rem', background: '#121215', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '10px', fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
                ✓ Broadcast as ISL: "{replySentMsg}"
              </div>
            )}
          </div>

          {/* Student Inbox Card */}
          <div className="ref-card" style={{ padding: '1.5rem', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Inbox style={{ width: 18, height: 18, color: '#ffffff' }} />
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Student Doubts & Questions
                </h3>
              </div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 800, padding: '0.15rem 0.6rem', background: '#27272a', color: '#ffffff', borderRadius: '999px', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                {inboxMessages.length} Messages
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', maxHeight: '220px', overflowY: 'auto' }}>
              {inboxMessages.map((msg) => (
                <div key={msg.id} style={{ padding: '0.75rem 0.85rem', background: '#121215', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffffff' }}>{msg.studentName}</span>
                    <span style={{ fontSize: '0.625rem', color: '#71717a', fontFamily: 'var(--font-mono)' }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#d4d4d8', margin: 0, lineHeight: 1.4 }}>{msg.message}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
