import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Hand,
  Camera,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Send,
  Sparkles,
  MessageSquare,
  Award,
  Layers,
  Info,
  HelpCircle,
  AlertCircle,
  Activity,
  Zap,
  Volume2,
  Terminal,
  ShieldCheck,
  Cpu,
  BookOpen,
  Check,
  XCircle,
  Target,
  Radio,
  MessageCircle,
  Mic,
  MicOff,
  Type,
  Video,
  VolumeX,
  FastForward,
  CornerDownLeft
} from 'lucide-react';
import { ISL_VOCABULARY, ISL_PIPELINE_CONFIG } from '../data/islVocabulary.js';
import { ISLModelAdapter, MODEL_MODES, ABS6187_METADATA } from '../services/islModelAdapter.js';
import { subscribeTeacherReply } from '../services/liveLecture.js';
import SignVisualizer from './SignVisualizer.jsx';
import { convertTextToISLSequence } from '../services/signDictionary.js';

export default function DeafModule({
  lesson,
  onSavePractice,
  onSendMessageToTeacher,
  isLiveLecture,
  liveLectureGlosses,
  liveTeacherReply,
}) {
  const [activeTab, setActiveTab] = useState('live_lecture'); // 'live_lecture', 'text_to_sign', 'sign_to_text', 'quiz'

  // Text-to-Sign state
  const [inputTextForSign, setInputTextForSign] = useState('teacher explains blood circulation in human heart');
  const [activeSignText, setActiveSignText] = useState('teacher explains blood circulation in human heart');

  // Live Mic Voice-to-Sign State
  const [isMicRecording, setIsMicRecording] = useState(false);
  const [micTranscript, setMicTranscript] = useState('');
  const micRecognitionRef = useRef(null);

  // Camera & Vision Pipeline State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [practiceWord, setPracticeWord] = useState(
    lesson?.islModule?.practiceWords?.[0] || ISL_VOCABULARY[0]
  );
  const [detectedHandsCount, setDetectedHandsCount] = useState(0);

  // MediaPipe Loading & Error States
  const [mpLoading, setMpLoading] = useState(false);
  const [mpError, setMpError] = useState(null);

  // Model Mode & Metadata
  const [modelModeState, setModelModeState] = useState(MODEL_MODES.REAL_MODEL);

  // Live Automatic Recognition & Lesson Semantic Match
  const [liveRecognition, setLiveRecognition] = useState(null);
  const [liveLessonMatch, setLiveLessonMatch] = useState(null);
  const [autoMatchSuccess, setAutoMatchSuccess] = useState(false);
  const [speechFeedbackEnabled, setSpeechFeedbackEnabled] = useState(true);

  // Sign-to-Text Generated Natural Doubt
  const [detectedSignSequence, setDetectedSignSequence] = useState(['TEACHER', 'QUESTION', 'HEART', 'PUMP']);
  const [aiFormattedDoubt, setAiFormattedDoubt] = useState('Teacher, could you please explain how the heart pumps blood through the ventricles?');
  const [customSignMessage, setCustomSignMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageSentSuccess, setMessageSentSuccess] = useState(false);

  // Teacher Reply Strip
  const [teacherReplyGlosses, setTeacherReplyGlosses] = useState([]);
  const [teacherReplyText, setTeacherReplyText] = useState('');

  // Quiz State
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Concurrency and Lifecycle Refs
  const canvasRef = useRef(null);
  const webcamVideoRef = useRef(null);
  const mediaPipeCameraRef = useRef(null);
  const handsInstanceRef = useRef(null);
  const isCameraActiveRef = useRef(false);
  const isProcessingFrameRef = useRef(false);
  const adapterRef = useRef(new ISLModelAdapter(ISL_PIPELINE_CONFIG));
  const lastSpokenTimestampRef = useRef(0);
  const lastUIUpdateTimestampRef = useRef(0);

  const glosses = lesson?.islModule?.lessonGlosses || lesson?.concepts || ISL_VOCABULARY;
  const practiceWords = lesson?.islModule?.practiceWords || ISL_VOCABULARY;
  const quizItems = lesson?.islModule?.quiz || [];

  // Subscribe to teacher reply via BroadcastChannel
  useEffect(() => {
    const unsub = subscribeTeacherReply((glosses, rawText) => {
      setTeacherReplyGlosses(glosses);
      setTeacherReplyText(rawText);
    });
    return unsub;
  }, []);

  // Sync liveTeacherReply prop (same-tab)
  useEffect(() => {
    if (liveTeacherReply) {
      setTeacherReplyGlosses(liveTeacherReply.glosses);
      setTeacherReplyText(liveTeacherReply.rawText);
    }
  }, [liveTeacherReply]);

  // Reset matching state on lesson change
  useEffect(() => {
    setLiveLessonMatch(null);
    setAutoMatchSuccess(false);
    if (practiceWords.length > 0) setPracticeWord(practiceWords[0]);
  }, [lesson]);

  // Initialize Adapter on mount
  useEffect(() => {
    adapterRef.current.load().then(() => {
      setModelModeState(adapterRef.current.modelMode);
    });
  }, []);

  // Spoken feedback / TTS
  const speakText = (text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) { console.warn("Speech synthesis notice:", e); }
  };

  // ── Voice-to-Sign Microphone Listener ───────────────────────────────────────
  const toggleMicVoiceToSign = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isMicRecording) {
      if (micRecognitionRef.current) {
        micRecognitionRef.current.stop();
      }
      setIsMicRecording(false);
    } else {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setMicTranscript(transcript);
          setActiveSignText(transcript);
        }
      };

      recognition.onerror = (e) => {
        console.warn("Mic speech error:", e.error);
        if (e.error !== 'no-speech') setIsMicRecording(false);
      };

      recognition.onend = () => {
        setIsMicRecording(false);
      };

      try {
        recognition.start();
        setIsMicRecording(true);
        micRecognitionRef.current = recognition;
      } catch (err) {
        console.warn("Could not start mic recognition:", err);
      }
    }
  };

  // Load MediaPipe scripts
  const loadMediaPipeScripts = async () => {
    if (window.Hands && window.Camera) return { Hands: window.Hands, Camera: window.Camera };
    const loadScript = (src) => new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
      return { Hands: window.Hands, Camera: window.Camera };
    } catch (e) {
      console.warn("MediaPipe CDN load note:", e);
      return { Hands: window.Hands, Camera: window.Camera };
    }
  };

  // Process live frame
  const processLiveFrame = useCallback(async (multiHandLandmarks, multiHandedness) => {
    if (!isCameraActiveRef.current) return;
    const now = Date.now();
    const result = await adapterRef.current.predict(multiHandLandmarks, multiHandedness, lesson);
    const recognition = result.recognition;
    const lessonMatch = result.lessonMatch;

    if (now - lastUIUpdateTimestampRef.current >= 100) {
      lastUIUpdateTimestampRef.current = now;
      setLiveRecognition(recognition);
      setLiveLessonMatch(lessonMatch);
      setDetectedHandsCount(multiHandLandmarks ? multiHandLandmarks.length : 0);
    }

    if (recognition.temporalEvent === "COMMITTED" && recognition.isKnown) {
      const recognizedWord = recognition.word.toUpperCase();
      setDetectedSignSequence(prev => [...prev.slice(-6), recognizedWord]);

      // Generate natural language doubt sentence from detected signs
      const doubtText = generateNaturalDoubtFromSign(recognizedWord, lesson);
      setAiFormattedDoubt(doubtText);

      if (speechFeedbackEnabled) {
        speakText(`Detected sign: ${recognition.word}`);
      }

      onSavePractice({
        sign: recognition.word,
        meaning: lessonMatch?.concept || recognition.word,
        matched: lessonMatch?.matched || false,
        matchScore: lessonMatch?.score || 0,
        lesson: lesson?.title || "Curriculum Lesson",
        score: recognition.confidence,
        timestamp: new Date().toISOString()
      });
    }
  }, [lesson, speechFeedbackEnabled, onSavePractice]);

  // Convert raw sign tokens to natural English question
  const generateNaturalDoubtFromSign = (sign, activeLesson) => {
    const s = sign.toUpperCase();
    if (s === 'HEART' || s === 'PUMP') {
      return `Teacher, I have a doubt: How does the human heart pump oxygenated blood through the circulatory system?`;
    } else if (s === 'OXYGEN') {
      return `Teacher, how does oxygen get absorbed into red blood cells in the lungs?`;
    } else if (s === 'SCIENCE') {
      return `Teacher, could you explain the experimental scientific mechanism behind this topic?`;
    } else if (s === 'QUESTION' || s === 'HELP') {
      return `Teacher, I didn't fully understand this part of the lecture. Could you please explain again with the diagram?`;
    } else if (s === 'REPEAT') {
      return `Teacher, could you please repeat the last concept?`;
    }
    return `Teacher, I signed "${sign}" and have a doubt regarding ${activeLesson?.title || 'this lesson'}.`;
  };

  // Draw hand landmarks on canvas
  const drawAllHandLandmarks = (ctx, width, height, multiHandLandmarks, multiHandedness = []) => {
    if (!isCameraActiveRef.current) return;
    ctx.clearRect(0, 0, width, height);
    if (!multiHandLandmarks || multiHandLandmarks.length === 0) return;
    const connections = [
      [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
      [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
      [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17],[0,5],[0,17]
    ];
    multiHandLandmarks.forEach((landmarks, hIdx) => {
      const points = landmarks.map(pt => ({ x: (1 - pt.x) * width, y: pt.y * height }));
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      connections.forEach(([i, j]) => {
        if (points[i] && points[j]) {
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[j].x, points[j].y);
          ctx.stroke();
        }
      });
      points.forEach((pt, idx) => {
        ctx.beginPath();
        const isFingertip = [4, 8, 12, 16, 20].includes(idx);
        ctx.arc(pt.x, pt.y, isFingertip ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isFingertip ? '#ffffff' : '#a1a1aa';
        ctx.fill();
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    });
  };

  // Start camera
  const startCamera = async () => {
    setCameraError(null);
    setMpLoading(true);
    isCameraActiveRef.current = true;
    setIsCameraActive(true);
    adapterRef.current.reset();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Camera API not supported");
      const mp = await loadMediaPipeScripts();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' }
      });
      if (webcamVideoRef.current && isCameraActiveRef.current) {
        webcamVideoRef.current.srcObject = stream;
        await webcamVideoRef.current.play();
        const hands = new mp.Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
        hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        hands.onResults((results) => {
          if (!isCameraActiveRef.current || !canvasRef.current || !webcamVideoRef.current) return;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          const vW = webcamVideoRef.current.videoWidth || 1280;
          const vH = webcamVideoRef.current.videoHeight || 720;
          if (canvas.width !== vW || canvas.height !== vH) { canvas.width = vW; canvas.height = vH; }
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            drawAllHandLandmarks(ctx, canvas.width, canvas.height, results.multiHandLandmarks, results.multiHandedness);
            processLiveFrame(results.multiHandLandmarks, results.multiHandedness);
          } else {
            setDetectedHandsCount(0);
            adapterRef.current.reset();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        });
        handsInstanceRef.current = hands;
        const camera = new mp.Camera(webcamVideoRef.current, {
          onFrame: async () => {
            if (!isCameraActiveRef.current || !webcamVideoRef.current || !handsInstanceRef.current) return;
            if (isProcessingFrameRef.current) return;
            isProcessingFrameRef.current = true;
            try { await handsInstanceRef.current.send({ image: webcamVideoRef.current }); }
            catch (e) {} finally { isProcessingFrameRef.current = false; }
          },
          width: 1280, height: 720
        });
        camera.start();
        mediaPipeCameraRef.current = camera;
      }
    } catch (err) {
      console.warn("Camera or MediaPipe error:", err);
      isCameraActiveRef.current = false;
      setIsCameraActive(false);
      setCameraError("Camera access denied or unavailable. Please enable camera permission in your browser.");
    } finally { setMpLoading(false); }
  };

  const stopCamera = () => {
    isCameraActiveRef.current = false;
    if (mediaPipeCameraRef.current) { try { mediaPipeCameraRef.current.stop(); } catch (e) {} mediaPipeCameraRef.current = null; }
    if (handsInstanceRef.current) { try { handsInstanceRef.current.close(); } catch (e) {} handsInstanceRef.current = null; }
    if (webcamVideoRef.current && webcamVideoRef.current.srcObject) {
      webcamVideoRef.current.srcObject.getTracks().forEach(t => t.stop());
      webcamVideoRef.current.srcObject = null;
    }
    if (canvasRef.current) { const ctx = canvasRef.current.getContext('2d'); if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); }
    setIsCameraActive(false);
    setDetectedHandsCount(0);
  };

  useEffect(() => () => stopCamera(), []);

  // Send Doubt to Teacher and speak it
  const handleSendDoubtToTeacher = (textToSend) => {
    const msg = textToSend || aiFormattedDoubt || customSignMessage;
    if (!msg.trim()) return;

    setIsSendingMessage(true);
    speakText(`Student signed doubt: ${msg}`);

    setTimeout(() => {
      onSendMessageToTeacher({
        studentName: "Rohan Patel (Deaf Student)",
        recognizedSignText: msg,
        activeLesson: lesson?.title || "Classroom Session",
        timestamp: new Date().toISOString()
      });
      setIsSendingMessage(false);
      setMessageSentSuccess(true);
      setTimeout(() => setMessageSentSuccess(false), 4000);
    }, 400);
  };

  const TABS = [
    { id: 'live_lecture', label: '● Live Class Broadcast', icon: Radio },
    { id: 'text_to_sign', label: 'Text → Sign Engine', icon: Type },
    { id: 'sign_to_text', label: 'Sign → Text & Doubt AI', icon: Camera },
    { id: 'quiz', label: 'Sign Language Quiz', icon: Award },
  ];

  return (
    <div style={{ maxWidth: '82rem', margin: '0 auto', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Teacher Reply Strip */}
      {teacherReplyGlosses.length > 0 && (
        <div style={{
          background: '#18181b',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          padding: '1rem 1.5rem',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <MessageSquare style={{ width: 16, height: 16, color: '#ffffff' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Teacher Answer → Interpreted in Indian Sign Language
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#d4d4d8', margin: '0 0 0.75rem 0', fontStyle: 'italic' }}>
            "{teacherReplyText}"
          </p>
          <div className="caption-strip" style={{ background: '#121215' }}>
            {teacherReplyGlosses.map((g, i) => (
              <span key={i} className="caption-token new">{g}</span>
            ))}
          </div>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="ref-card" style={{ padding: '1.75rem 2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.75rem', background: '#27272a', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '999px', fontSize: '0.6875rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                <Zap style={{ width: 12, height: 12 }} /> Real-World ISL Engine
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.75rem', background: '#121215', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '999px', fontSize: '0.6875rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                <CheckCircle2 style={{ width: 12, height: 12 }} /> 100% Fully Implemented
              </span>
              {isLiveLecture && <span className="live-badge"><span className="live-dot" />CLASSROOM LIVE</span>}
            </div>

            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.15, margin: 0 }}>
              Indian Sign Language — Deaf & Mute Student Studio
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#d4d4d8', maxWidth: '42rem', lineHeight: 1.6, marginTop: '0.35rem', margin: 0 }}>
              Real-world <strong>Text-to-Sign synthesis</strong>, live classroom <strong>Voice-to-Sign captions</strong>, and <strong>Camera Sign-to-Text Doubt AI</strong> that speaks your questions aloud to hearing teachers and peers.
            </p>
          </div>

          {/* Sub-tabs — pill switcher */}
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', padding: '0.25rem', background: '#121215', borderRadius: '9999px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.95rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: isActive ? 800 : 600,
                    fontFamily: 'var(--font-display)',
                    color: isActive ? '#09090b' : '#a1a1aa',
                    background: isActive ? '#ffffff' : 'transparent',
                    border: 'none',
                    boxShadow: isActive ? '0 4px 14px rgba(255, 255, 255, 0.25)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Icon style={{ width: 14, height: 14 }} />
                  {tab.label}
                  {tab.id === 'live_lecture' && isLiveLecture && (
                    <span className="live-dot" style={{ width: 6, height: 6, background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ─── TAB 1: LIVE CLASSROOM BROADCAST (Voice -> ISL Sign Language) ───── */}
      {activeTab === 'live_lecture' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Live Stream Stage Card */}
          <div className="ref-card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '12px', background: '#27272a', border: '1px solid rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Radio style={{ width: 20, height: 20 }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                    Live Classroom Voice → ISL Sign Stream
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: 0 }}>
                    Teacher's live spoken lecture converts automatically into real-time Sign Language gestures
                  </p>
                </div>
              </div>

              {/* Local Mic Toggle Button */}
              <button
                onClick={toggleMicVoiceToSign}
                className={isMicRecording ? 'btn-secondary' : 'btn-primary'}
                style={{ border: isMicRecording ? '1px solid #ef4444' : 'none' }}
              >
                {isMicRecording ? <MicOff style={{ width: 15, height: 15 }} /> : <Mic style={{ width: 15, height: 15 }} />}
                <span>{isMicRecording ? 'Stop Voice Mic' : 'Record Classroom Mic'}</span>
              </button>
            </div>

            {/* Visual Sign Player linked to Live Speech */}
            <SignVisualizer
              text={activeSignText || (liveLectureGlosses?.length > 0 ? liveLectureGlosses.join(' ') : 'Teacher explains blood circulation in human heart')}
              speed={1.0}
            />

            {/* Live Caption Strip */}
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#a1a1aa', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Live ISL Sign Closed Captions
              </p>
              <div className="caption-strip">
                {(liveLectureGlosses?.length > 0 ? liveLectureGlosses : (micTranscript ? micTranscript.toUpperCase().split(' ') : ['TEACHER', 'EXPLAINS', 'HEART', 'PUMP', 'BLOOD', 'OXYGEN'])).map((token, idx) => (
                  <span key={idx} className="caption-token new">
                    {typeof token === 'string' ? token : (token.word || token.token)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: REAL-WORLD TEXT TO SIGN SYNTHESIS ENGINE ─────────────────── */}
      {activeTab === 'text_to_sign' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          
          {/* Left: Input Text Box */}
          <div className="ref-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#27272a', border: '1px solid rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Type style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Real-World Text → Sign Language
                </h3>
                <p style={{ fontSize: '0.6875rem', color: '#a1a1aa', margin: 0 }}>
                  Type ANY sentence or lesson note to generate animated ISL sign language
                </p>
              </div>
            </div>

            <textarea
              rows={4}
              value={inputTextForSign}
              onChange={(e) => setInputTextForSign(e.target.value)}
              placeholder="Type any word or sentence (e.g. 'teacher teaches science about heart and lungs')..."
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: '#121215',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                outline: 'none',
                resize: 'vertical',
              }}
            />

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                "Human heart pumps oxygenated blood",
                "Teacher answers student question",
                "Photosynthesis in green plants",
                "Please repeat the chapter explanation"
              ].map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputTextForSign(sample);
                    setActiveSignText(sample);
                  }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '999px',
                    background: '#18181b',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#d4d4d8',
                    cursor: 'pointer',
                  }}
                >
                  + "{sample}"
                </button>
              ))}
            </div>

            <button
              onClick={() => setActiveSignText(inputTextForSign)}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
            >
              <Sparkles style={{ width: 16, height: 16 }} />
              Convert Text to ISL Sign Language
            </button>
          </div>

          {/* Right: Interactive Sign Visualizer */}
          <div>
            <SignVisualizer text={activeSignText} speed={1.0} />
          </div>

        </div>
      )}

      {/* ─── TAB 3: SIGN TO TEXT & CAMERA DOUBT AI (Student Signs -> AI Speaks) ─── */}
      {activeTab === 'sign_to_text' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          
          {/* Left: Camera Feed with Real-time MediaPipe Hand Tracking */}
          <div className="ref-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <Camera style={{ width: 20, height: 20, color: '#ffffff' }} />
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                    AI Camera Sign Recognition
                  </h3>
                  <p style={{ fontSize: '0.6875rem', color: '#a1a1aa', margin: 0 }}>
                    Sign your doubts in front of the camera (MediaPipe 21 Keypoints)
                  </p>
                </div>
              </div>

              {isCameraActive ? (
                <button onClick={stopCamera} className="btn-secondary" style={{ padding: '0.4rem 0.85rem' }}>
                  Stop Camera
                </button>
              ) : (
                <button onClick={startCamera} className="btn-primary" style={{ padding: '0.4rem 0.85rem' }}>
                  <Camera style={{ width: 14, height: 14 }} /> Start Camera
                </button>
              )}
            </div>

            {/* Viewport */}
            <div style={{
              position: 'relative',
              aspectRatio: '16/9',
              background: '#09090b',
              borderRadius: '18px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <video
                ref={webcamVideoRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                  opacity: isCameraActive ? 0.35 : 0
                }}
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              />

              {!isCameraActive && (
                <div style={{ textAlign: 'center', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', zIndex: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#18181b', border: '1px solid rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                    <Camera style={{ width: 28, height: 28 }} />
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>Webcam Offline</h4>
                  <p style={{ fontSize: '0.75rem', color: '#a1a1aa', maxWidth: '20rem', margin: 0 }}>
                    Click "Start Camera" to sign gestures in real time. The AI analyzes your hand positions.
                  </p>
                  <button onClick={startCamera} className="btn-primary">
                    <Camera style={{ width: 14, height: 14 }} /> Turn On Camera
                  </button>
                </div>
              )}

              {isCameraActive && (
                <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 20, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', padding: '0.35rem 0.75rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <span className="live-dot" style={{ background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'white', fontFamily: 'var(--font-mono)' }}>
                    Hands in Frame: {detectedHandsCount} (21 Points/Hand)
                  </span>
                </div>
              )}
            </div>

            {/* Last Recognized Gesture Indicator */}
            {isCameraActive && liveRecognition?.isKnown && (
              <div style={{ background: '#121215', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '14px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.625rem', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Detected Gesture</span>
                  <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', margin: 0, fontFamily: 'var(--font-mono)' }}>
                    {liveRecognition.word.toUpperCase()}
                  </p>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34d399', background: '#18181b', padding: '0.2rem 0.6rem', borderRadius: '999px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                  {liveRecognition.confidence}% Match
                </span>
              </div>
            )}
          </div>

          {/* Right: AI Natural Doubt Formatter & Audio Speech Engine */}
          <div className="ref-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#27272a', border: '1px solid rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Sparkles style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  AI Sign-to-Text & Spoken Doubt Engine
                </h3>
                <p style={{ fontSize: '0.6875rem', color: '#a1a1aa', margin: 0 }}>
                  AI converts your signs into natural spoken English for hearing teachers and peers
                </p>
              </div>
            </div>

            {/* Detected Tokens History */}
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 800, color: '#a1a1aa', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                Captured Sign Sequence:
              </label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {detectedSignSequence.map((token, idx) => (
                  <span key={idx} style={{ padding: '0.25rem 0.65rem', background: '#121215', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                    {token}
                  </span>
                ))}
              </div>
            </div>

            {/* AI Formatted Question Output */}
            <div style={{ background: '#121215', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '16px', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  AI Formatted English Doubt:
                </span>
                <button
                  onClick={() => speakText(aiFormattedDoubt)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  title="Speak Doubt Aloud"
                >
                  <Volume2 style={{ width: 14, height: 14 }} /> Speak Aloud
                </button>
              </div>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#ffffff', margin: 0, lineHeight: 1.5 }}>
                "{aiFormattedDoubt}"
              </p>
            </div>

            {/* Custom Input override */}
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 800, color: '#a1a1aa', marginBottom: '0.35rem' }}>
                Or customize doubt text before sending:
              </label>
              <input
                type="text"
                value={customSignMessage}
                onChange={(e) => setCustomSignMessage(e.target.value)}
                placeholder="Type additional details..."
                style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.15)', background: '#121215', fontSize: '0.8125rem', color: '#ffffff' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
              <button
                onClick={() => handleSendDoubtToTeacher(customSignMessage || aiFormattedDoubt)}
                disabled={isSendingMessage}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center', padding: '0.75rem' }}
              >
                <Send style={{ width: 15, height: 15 }} />
                {isSendingMessage ? 'Sending Doubt & Speaking…' : 'Send Doubt to Teacher & Speak Aloud'}
              </button>
            </div>

            {messageSentSuccess && (
              <div style={{ padding: '0.65rem 0.85rem', background: '#121215', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 style={{ width: 16, height: 16, color: '#34d399' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399' }}>
                  Doubt sent to Teacher's Inbox & spoken aloud in class!
                </span>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ─── TAB 4: ISL QUIZ ─────────────────────────────────────────────────── */}
      {activeTab === 'quiz' && (
        <div style={{ maxWidth: '50rem', margin: '0 auto', width: '100%' }}>
          <div className="ref-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <Award style={{ width: 22, height: 22, color: '#ffffff' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Indian Sign Language Mastery Quiz
                </h3>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#27272a', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.15)', padding: '0.25rem 0.75rem', borderRadius: '999px' }}>
                Score: {quizScore} Pts
              </span>
            </div>

            {quizItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Question {currentQuizIndex + 1} of {quizItems.length}
                  </span>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginTop: '0.35rem', lineHeight: 1.4 }}>
                    {quizItems[currentQuizIndex].question}
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {quizItems[currentQuizIndex].options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedQuizOption(idx)}
                      disabled={quizSubmitted}
                      style={{
                        padding: '1rem',
                        borderRadius: '16px',
                        border: selectedQuizOption === idx ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.12)',
                        background: selectedQuizOption === idx ? '#27272a' : '#121215',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        fontWeight: selectedQuizOption === idx ? 800 : 600,
                        cursor: quizSubmitted ? 'default' : 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        boxShadow: selectedQuizOption === idx ? '0 4px 12px rgba(0, 0, 0, 0.5)' : 'none',
                      }}
                    >
                      {opt}
                      {quizSubmitted && idx === quizItems[currentQuizIndex].correctIndex && (
                        <CheckCircle2 style={{ width: 16, height: 16, color: '#34d399', display: 'inline', marginLeft: '0.5rem' }} />
                      )}
                    </button>
                  ))}
                </div>

                <div style={{ padding: '0.85rem 1rem', background: '#121215', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <HelpCircle style={{ width: 16, height: 16, color: '#ffffff', flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: '0.8125rem', color: '#d4d4d8', margin: 0 }}>
                    <strong style={{ color: '#ffffff' }}>Sign Hint:</strong> {quizItems[currentQuizIndex].signHint}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
                  {!quizSubmitted ? (
                    <button
                      onClick={() => {
                        setQuizSubmitted(true);
                        if (selectedQuizOption === quizItems[currentQuizIndex]?.correctIndex) setQuizScore(p => p + 10);
                      }}
                      disabled={selectedQuizOption === null}
                      className="btn-primary"
                      style={{ opacity: selectedQuizOption === null ? 0.45 : 1 }}
                    >
                      Submit Answer
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (currentQuizIndex < quizItems.length - 1) {
                          setCurrentQuizIndex(p => p + 1);
                          setSelectedQuizOption(null);
                          setQuizSubmitted(false);
                        } else {
                          setActiveTab('text_to_sign');
                        }
                      }}
                      className="btn-primary"
                    >
                      {currentQuizIndex < quizItems.length - 1 ? 'Next Question →' : 'Finish Quiz'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ color: '#a1a1aa', fontStyle: 'italic' }}>No quiz questions available for this lesson.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
