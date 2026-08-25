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
import { subscribeTeacherReply, subscribeRoomSession, DEFAULT_ROOM_CODE, subscribeToLiveNotifications, followTeacher, unfollowTeacher, isFollowingTeacher, getTeacherProfiles } from '../services/liveLecture.js';
import SignVisualizer from './SignVisualizer.jsx';
import { convertTextToISLSequence, translateISLToTamil } from '../services/signDictionary.js';

export default function DeafModule({
  lesson,
  onSavePractice,
  onSendMessageToTeacher,
  isLiveLecture,
  liveLectureGlosses,
  liveLectureTranscript,
  liveTeacherReply,
}) {
  const [activeTab, setActiveTab] = useState('live_lecture'); // 'live_lecture', 'text_to_sign', 'sign_to_text', 'quiz'

  // ── Live Notification State ──
  const [liveNotification, setLiveNotification] = useState(null); // { teacherId, teacherName, roomCode, lessonTitle }
  const [followedTeachers, setFollowedTeachers] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('inclusiveai_followed_teachers') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [teacherProfilesMap, setTeacherProfilesMap] = useState({});

  const isFollowed = (tid) => Array.isArray(followedTeachers) && !!tid && followedTeachers.includes(tid);

  // Room & Live Teacher Streaming State
  const [studentRoomCode, setStudentRoomCode] = useState(DEFAULT_ROOM_CODE);
  const [isRoomConnected, setIsRoomConnected] = useState(false);
  const [teacherLiveVideoFrame, setTeacherLiveVideoFrame] = useState(null);
  const [isRoomBroadcastLive, setIsRoomBroadcastLive] = useState(false);
  const [roomTranscript, setRoomTranscript] = useState('');
  const [roomGlosses, setRoomGlosses] = useState([]);
  const [liveTeacherInfo, setLiveTeacherInfo] = useState(null); // { name, id, subject }

  // Text-to-Sign state
  const [inputTextForSign, setInputTextForSign] = useState('');
  const [activeSignText, setActiveSignText] = useState('');

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
  const [speechFeedbackEnabled, setSpeechFeedbackEnabled] = useState(false);

  // Sign-to-Text Generated Natural Doubt
  const [detectedSignSequence, setDetectedSignSequence] = useState([]);
  const [aiFormattedDoubt, setAiFormattedDoubt] = useState('');
  const [customSignMessage, setCustomSignMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageSentSuccess, setMessageSentSuccess] = useState(false);

  // Teacher Reply Strip
  const [teacherReplyGlosses, setTeacherReplyGlosses] = useState([]);
  const [teacherReplyText, setTeacherReplyText] = useState('');

  // Direct Text-to-Text Conversation state
  const [directChatMessages, setDirectChatMessages] = useState([
    { id: '1', sender: 'Teacher', text: 'Welcome to class! You can type questions here in real-time or sign on camera.', time: 'Live' }
  ]);
  const [directChatInput, setDirectChatInput] = useState('');

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

  // Subscribe to live room broadcast (video frames, transcript, glosses)
  useEffect(() => {
    // Load teacher profiles for display
    setTeacherProfilesMap(getTeacherProfiles());
  }, []);

  // Subscribe to LIVE_CLASS_STARTED / LIVE_CLASS_ENDED notifications
  useEffect(() => {
    const unsub = subscribeToLiveNotifications((data) => {
      if (data?.type === 'LIVE_CLASS_STARTED') {
        setLiveNotification({
          teacherId: data.teacherId || 'TCH-0000',
          teacherName: data.teacherName || 'Teacher',
          teacherSubject: data.teacherSubject || '',
          roomCode: data.roomCode || DEFAULT_ROOM_CODE,
          lessonTitle: data.lessonTitle || 'Live Class'
        });
      } else if (data?.type === 'LIVE_CLASS_ENDED') {
        setLiveNotification(null);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!studentRoomCode) return;
    
    // Listen to custom event for same-tab instant video frame streaming
    const handleCustomFrame = (e) => {
      if (e.detail?.frameData) {
        setTeacherLiveVideoFrame(e.detail.frameData);
        setIsRoomBroadcastLive(true);
      }
    };
    window.addEventListener('inclusiveai-live-frame', handleCustomFrame);

    // Initial check from localStorage cache
    try {
      const cached = localStorage.getItem('inclusiveai_live_frame');
      if (cached) setTeacherLiveVideoFrame(cached);
    } catch (e) {}

    const unsub = subscribeRoomSession(studentRoomCode, {
      onVideoFrame: (frameData) => {
        setTeacherLiveVideoFrame(frameData);
        setIsRoomBroadcastLive(true);
      },
      onTranscript: (rawText) => {
        setRoomTranscript(rawText);
        if (rawText && rawText.trim()) {
          setActiveSignText(rawText.trim());
        }
      },
      onGlosses: (g) => {
        setRoomGlosses(g);
      },
      onStatus: (status) => {
        setIsRoomBroadcastLive(status.isLive);
        if (status.isLive) {
          setLiveTeacherInfo({ name: status.teacherName, id: status.teacherId, subject: status.teacherSubject });
        } else {
          setTeacherLiveVideoFrame(null);
          setLiveTeacherInfo(null);
        }
      },
      onTeacherReply: (g, t) => {
        setTeacherReplyGlosses(g);
        setTeacherReplyText(t);
      }
    });

    return () => {
      unsub();
      window.removeEventListener('inclusiveai-live-frame', handleCustomFrame);
    };
  }, [studentRoomCode]);

  // Direct localStorage polling — most reliable cross-tab sync
  // This runs independently and catches live class data even if BroadcastChannel fails
  useEffect(() => {
    const poll = setInterval(() => {
      try {
        // Check for active live class
        const statusKey = 'inclusiveai_room_status_' + studentRoomCode;
        const statusRaw = localStorage.getItem(statusKey) || localStorage.getItem('inclusiveai_active_live_class');
        if (statusRaw) {
          const status = JSON.parse(statusRaw);
          const age = Date.now() - (status.timestamp || 0);
          if (age < 15000 && (status.isLive || status.type === 'LIVE_CLASS_STARTED')) {
            if (!isRoomBroadcastLive) {
              setIsRoomBroadcastLive(true);
              setLiveTeacherInfo({
                name: status.teacherName || 'Teacher',
                id: status.teacherId || 'TCH-0000',
                subject: status.teacherSubject || ''
              });
            }
            // Read video frame
            const frame = localStorage.getItem('inclusiveai_live_frame');
            if (frame) setTeacherLiveVideoFrame(frame);
            // Read transcript
            const tRaw = localStorage.getItem('inclusiveai_live_transcript');
            if (tRaw) {
              const t = JSON.parse(tRaw);
              if (t.rawText) {
                setRoomTranscript(t.rawText);
                setActiveSignText(t.rawText);
              }
              if (t.glosses) setRoomGlosses(t.glosses);
            }
          } else if (age >= 15000 && isRoomBroadcastLive) {
            // Teacher heartbeat expired
            setIsRoomBroadcastLive(false);
            setTeacherLiveVideoFrame(null);
            setLiveTeacherInfo(null);
          }
        }
      } catch (e) {}
    }, 800);

    return () => clearInterval(poll);
  }, [studentRoomCode, isRoomBroadcastLive]);

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
      if (liveTeacherReply.rawText) {
        setDirectChatMessages(prev => [
          ...prev,
          { id: `reply-${Date.now()}`, sender: 'Teacher (Live Reply)', text: liveTeacherReply.rawText, time: 'Just now' }
        ]);
      }
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

  // Load MediaPipe scripts (Hands + Pose Landmarker)
  const loadMediaPipeScripts = async () => {
    if (window.Hands && window.Pose && window.Camera) return { Hands: window.Hands, Pose: window.Pose, Camera: window.Camera };
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
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');
      return { Hands: window.Hands, Pose: window.Pose, Camera: window.Camera };
    } catch (e) {
      console.warn("MediaPipe CDN load note:", e);
      return { Hands: window.Hands, Pose: window.Pose, Camera: window.Camera };
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

      // Convert sign directly to text and send to teacher inbox + live conversation (no voice audio)
      if (onSendMessageToTeacher && doubtText) {
        try {
          onSendMessageToTeacher({
            studentName: "Rohan Patel (Deaf Student)",
            recognizedSignText: doubtText,
            activeLesson: lesson?.title || "Classroom Session",
            timestamp: new Date().toISOString()
          });
          setDirectChatMessages(prev => [
            ...prev,
            { id: `auto-${Date.now()}`, sender: 'You (Camera Sign AI)', text: doubtText, time: 'Just now' }
          ]);
          setMessageSentSuccess(true);
          setTimeout(() => setMessageSentSuccess(false), 4000);
        } catch (e) {}
      }

      if (onSavePractice) {
        try {
          onSavePractice({
            sign: recognition.word,
            meaning: lessonMatch?.concept || recognition.word,
            matched: lessonMatch?.matched || false,
            matchScore: lessonMatch?.score || 0,
            lesson: lesson?.title || "Curriculum Lesson",
            score: recognition.confidence,
            timestamp: new Date().toISOString()
          });
        } catch (e) {}
      }
    }
  }, [lesson, onSendMessageToTeacher, onSavePractice]);

  // Convert raw sign tokens to natural English + Tamil question
  const generateNaturalDoubtFromSign = (sign, activeLesson) => {
    const s = sign.toUpperCase();
    const tamilTerm = translateISLToTamil(s) || s;
    if (s === 'HEART' || s === 'PUMP') {
      return `Teacher, I have a doubt: How does the human heart pump oxygenated blood through the circulatory system?\n(ஆசிரியர் அவர்களே, மனித இதயம் எவ்வாறு இரத்தத்தை பம்ப் செய்கிறது என்று விளக்குவீர்களா?)`;
    } else if (s === 'OXYGEN') {
      return `Teacher, how does oxygen get absorbed into red blood cells in the lungs?\n(ஆசிரியர் அவர்களே, ஆக்ஸிஜன் வாயு எவ்வாறு நுரையீரலில் உள்ள இரத்தத்தில் சேர்கிறது?)`;
    } else if (s === 'SCIENCE') {
      return `Teacher, could you explain the experimental scientific mechanism behind this topic?\n(ஆசிரியர் அவர்களே, இந்த அறிவியல் சோதனையின் செயல்முறையை விளக்குவீர்களா?)`;
    } else if (s === 'QUESTION' || s === 'HELP') {
      return `Teacher, I didn't fully understand this part of the lecture. Could you please explain again with the diagram?\n(ஆசிரியர் அவர்களே, இந்த பகுதி புரியவில்லை. மீண்டும் வரைபடத்துடன் விளக்குவீர்களா?)`;
    } else if (s === 'REPEAT') {
      return `Teacher, could you please repeat the last concept?\n(ஆசிரியர் அவர்களே, கடைசி கருத்தை மீண்டும் கூறுவீர்களா?)`;
    }
    return `Teacher, I signed "${sign}" (${tamilTerm}) and have a doubt regarding ${activeLesson?.title || 'this lesson'}.\n(ஆசிரியர் அவர்களே, நான் "${tamilTerm}" என சைகை செய்தேன்.)`;
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
      setDirectChatMessages(prev => [
        ...prev,
        { id: `doubt-${Date.now()}`, sender: 'You (Doubt AI)', text: msg, time: 'Just now' }
      ]);
      setTimeout(() => setMessageSentSuccess(false), 4000);
    }, 400);
  };

  const handleSendDirectChat = (e) => {
    e?.preventDefault();
    if (!directChatInput.trim()) return;
    const msg = directChatInput.trim();
    setDirectChatMessages(prev => [
      ...prev,
      { id: `msg-${Date.now()}`, sender: 'You (Student)', text: msg, time: 'Just now' }
    ]);
    onSendMessageToTeacher({
      studentName: "Rohan Patel (Deaf Student)",
      recognizedSignText: msg,
      activeLesson: lesson?.title || "Classroom Session",
      timestamp: new Date().toISOString()
    });
    setDirectChatInput('');
  };

  const TABS = [
    { id: 'live_lecture', label: '● Live Class Broadcast', icon: Radio },
    { id: 'text_to_sign', label: 'Text → Sign Engine', icon: Type },
    { id: 'sign_to_text', label: 'Sign → Text & Doubt AI', icon: Camera },
    { id: 'text_chat', label: '💬 Text Conversation', icon: MessageSquare },
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

      {/* NON-INTRUSIVE LIVE CLASS NOTIFICATION BANNER */}
      {liveNotification && (
        <div style={{
          background: 'linear-gradient(90deg, #18181b 0%, #27272a 100%)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '18px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 8px 24px rgba(239, 68, 68, 0.15)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '1.1rem', flexShrink: 0 }}>
              👩‍🏫
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="live-dot" style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#ffffff' }}>
                  {liveNotification.teacherName} started Live Class!
                </span>
                <span style={{ fontSize: '0.6875rem', color: '#a1a1aa' }}>({liveNotification.teacherSubject})</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#d4d4d8', margin: '0.15rem 0 0 0' }}>
                Lesson: <strong style={{ color: '#ffffff' }}>{liveNotification.lessonTitle}</strong> • Room: <span style={{ fontFamily: 'monospace' }}>{liveNotification.roomCode}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => {
                setStudentRoomCode(liveNotification.roomCode);
                setActiveTab('live_lecture');
                setLiveNotification(null);
              }}
              style={{
                padding: '0.45rem 1rem',
                background: '#ffffff',
                color: '#09090b',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 2px 8px rgba(255, 255, 255, 0.2)'
              }}
            >
              <Radio style={{ width: 13, height: 13, color: '#ef4444' }} /> Join Live Class
            </button>
            <button
              onClick={() => setLiveNotification(null)}
              style={{
                padding: '0.45rem 0.85rem',
                background: '#18181b',
                color: '#a1a1aa',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 1: LIVE CLASSROOM BROADCAST (Live Teacher Video & ISL Sign Stream) ───── */}
      {activeTab === 'live_lecture' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Teacher Profile Card (when connected) */}
          {(isRoomBroadcastLive || isLiveLecture) && liveTeacherInfo && (
            <div className="ref-card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #3f3f46, #52525b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>👩‍🏫</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>{liveTeacherInfo.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>{liveTeacherInfo.subject} • ID: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{liveTeacherInfo.id}</span></div>
              </div>
              <button onClick={() => {
                const tid = liveTeacherInfo?.id;
                if (!tid) return;
                const already = isFollowed(tid);
                if (already) {
                  unfollowTeacher(tid);
                  setFollowedTeachers(f => (Array.isArray(f) ? f.filter(x => x !== tid) : []));
                } else {
                  followTeacher(tid);
                  setFollowedTeachers(f => [...(Array.isArray(f) ? f : []), tid]);
                }
              }} style={{ padding: '0.4rem 1rem', background: isFollowed(liveTeacherInfo?.id) ? '#27272a' : '#3f3f46', border: `1px solid ${isFollowed(liveTeacherInfo?.id) ? '#52525b' : 'rgba(255,255,255,0.2)'}`, borderRadius: '10px', color: isFollowed(liveTeacherInfo?.id) ? '#a1a1aa' : '#e4e4e7', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                {isFollowed(liveTeacherInfo?.id) ? '✓ Following' : '+ Follow'}
              </button>
            </div>
          )}
          
          {/* Room Join & Connection Bar — Crystal Clear Offline vs Live States */}
          <div className="ref-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: '12px',
                  background: (isRoomBroadcastLive || isLiveLecture) ? 'rgba(239, 68, 68, 0.15)' : '#27272a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  border: (isRoomBroadcastLive || isLiveLecture) ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <Radio style={{ width: 20, height: 20, color: (isRoomBroadcastLive || isLiveLecture) ? '#ef4444' : '#71717a' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
                      Teacher Live Stream Classroom
                    </h4>
                    {(isRoomBroadcastLive || isLiveLecture) ? (
                      <span className="live-badge" style={{ fontSize: '0.65rem', background: '#ef4444', color: '#ffffff' }}>
                        <span className="live-dot" style={{ background: '#ffffff', boxShadow: '0 0 6px #ffffff' }} /> LIVE NOW
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#a1a1aa', background: '#27272a', padding: '0.15rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        ⚪ OFFLINE / STANDBY
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: (isRoomBroadcastLive || isLiveLecture) ? '#34d399' : '#a1a1aa', lineHeight: 1.4 }}>
                    {(isRoomBroadcastLive || isLiveLecture) ? (
                      `🟢 Connected to ${studentRoomCode} • Live Video & Speech-to-Sign Active`
                    ) : (
                      `Teacher has not started a live class yet. Auto-listening for room ${studentRoomCode}...`
                    )}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.4rem 0.95rem',
                borderRadius: '9999px',
                background: (isRoomBroadcastLive || isLiveLecture) ? 'rgba(239, 68, 68, 0.15)' : '#27272a',
                color: (isRoomBroadcastLive || isLiveLecture) ? '#f87171' : '#a1a1aa',
                border: (isRoomBroadcastLive || isLiveLecture) ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                {(isRoomBroadcastLive || isLiveLecture) ? '🔴 RECEIVING LIVE CLASS' : '● LISTENING FOR TEACHER'}
              </span>
            </div>

            {/* Room Code Selector & Settings */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: '#121215',
              padding: '0.6rem 0.85rem',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                Class Room Code:
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
                <input
                  type="text"
                  value={studentRoomCode}
                  onChange={(e) => setStudentRoomCode(e.target.value.toUpperCase().trim())}
                  placeholder="Paste Room Code (e.g. ROOM-SIH-2026)"
                  style={{
                    flex: 1,
                    background: '#18181b',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '0.45rem 0.75rem',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    outline: 'none',
                    letterSpacing: '0.04em'
                  }}
                />

                <button
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setStudentRoomCode(text.toUpperCase().trim());
                    } catch (e) {}
                  }}
                  title="Paste from clipboard"
                  style={{
                    padding: '0.45rem 0.75rem',
                    background: '#27272a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#e4e4e7',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  📋 Paste
                </button>

                <button
                  onClick={() => {
                    const code = studentRoomCode?.trim() || DEFAULT_ROOM_CODE;
                    setStudentRoomCode(code);
                    setIsRoomConnected(true);
                    
                    // Direct local check
                    try {
                      const activeClass = localStorage.getItem('inclusiveai_active_live_class') || localStorage.getItem('inclusiveai_room_status_' + code);
                      if (activeClass) {
                        const parsed = JSON.parse(activeClass);
                        if (parsed) {
                          setIsRoomBroadcastLive(true);
                          setLiveTeacherInfo({ name: parsed.teacherName, id: parsed.teacherId, subject: parsed.teacherSubject });
                        }
                      }
                      const cachedFrame = localStorage.getItem('inclusiveai_live_frame');
                      if (cachedFrame) setTeacherLiveVideoFrame(cachedFrame);
                    } catch (e) {}
                  }}
                  style={{
                    padding: '0.45rem 1.1rem',
                    background: (isRoomBroadcastLive || isLiveLecture) ? '#10b981' : '#ffffff',
                    color: (isRoomBroadcastLive || isLiveLecture) ? '#ffffff' : '#09090b',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s'
                  }}
                >
                  {(isRoomBroadcastLive || isLiveLecture) ? '✓ Connected' : '⚡ Connect Room'}
                </button>
              </div>

              {/* Quick Preset Room Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Quick Pick:</span>
                <button
                  onClick={() => {
                    setStudentRoomCode('ROOM-SIH-2026');
                    try {
                      const active = localStorage.getItem('inclusiveai_active_live_class');
                      if (active) {
                        const p = JSON.parse(active);
                        setIsRoomBroadcastLive(true);
                        setLiveTeacherInfo({ name: p.teacherName, id: p.teacherId, subject: p.teacherSubject });
                      }
                    } catch (e) {}
                  }}
                  style={{
                    fontSize: '0.6875rem',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px',
                    background: studentRoomCode === 'ROOM-SIH-2026' ? 'rgba(59, 130, 246, 0.2)' : '#27272a',
                    color: studentRoomCode === 'ROOM-SIH-2026' ? '#60a5fa' : '#a1a1aa',
                    border: studentRoomCode === 'ROOM-SIH-2026' ? '1px solid #3b82f6' : '1px solid transparent',
                    cursor: 'pointer',
                    fontFamily: 'monospace'
                  }}
                >
                  ROOM-SIH-2026
                </button>
                <button
                  onClick={() => {
                    setStudentRoomCode('CLASS-101');
                  }}
                  style={{
                    fontSize: '0.6875rem',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px',
                    background: studentRoomCode === 'CLASS-101' ? 'rgba(59, 130, 246, 0.2)' : '#27272a',
                    color: studentRoomCode === 'CLASS-101' ? '#60a5fa' : '#a1a1aa',
                    border: studentRoomCode === 'CLASS-101' ? '1px solid #3b82f6' : '1px solid transparent',
                    cursor: 'pointer',
                    fontFamily: 'monospace'
                  }}
                >
                  CLASS-101
                </button>
              </div>
            </div>
          </div>

          {/* Dual-Pane Stage: Teacher's Live Video Feed + Animated ISL Sign Visualizer */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1.2fr)', gap: '1.5rem', alignItems: 'stretch' }}>
            
            {/* Left: Teacher's Live Video Feed */}
            <div className="ref-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Video style={{ width: 16, height: 16, color: '#ffffff' }} />
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#ffffff' }}>
                    Teacher Live Camera Feed
                  </h4>
                </div>
                {(isRoomBroadcastLive || isLiveLecture) && (
                  <span className="live-badge" style={{ fontSize: '0.65rem' }}>
                    <span className="live-dot" /> LIVE VIDEO
                  </span>
                )}
              </div>

              {/* Video Viewport */}
              <div style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/10',
                background: '#09090b',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {teacherLiveVideoFrame ? (
                  <img
                    src={teacherLiveVideoFrame}
                    alt="Teacher Live Classroom Stream"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '1.5rem' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', margin: '0 auto 0.75rem auto' }}>
                      <Video style={{ width: 24, height: 24 }} />
                    </div>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                      {(isRoomBroadcastLive || isLiveLecture) ? 'Receiving Teacher Stream...' : 'Teacher Video Classroom Ready'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#71717a', margin: '0.25rem 0 0 0' }}>
                      {(isRoomBroadcastLive || isLiveLecture) ? 'Camera stream active from room host' : `Teacher will appear here when class begins in ${studentRoomCode}`}
                    </p>
                  </div>
                )}

                {(isRoomBroadcastLive || isLiveLecture) && (
                  <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.6875rem', fontWeight: 700, color: '#ffffff' }}>
                    Host: Teacher
                  </div>
                )}
              </div>

              {/* Live Transcript Box below teacher video */}
              <div style={{ background: '#121215', borderRadius: '12px', padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#a1a1aa', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                  Live Teacher Spoken Words:
                </span>
                <p style={{ fontSize: '0.8125rem', color: '#d4d4d8', margin: 0, lineHeight: 1.4 }}>
                  {roomTranscript || liveLectureTranscript || (
                    <span style={{ color: '#71717a', fontStyle: 'italic' }}>Listening to teacher speech…</span>
                  )}
                </p>
              </div>
            </div>

            {/* Right: Live ISL Sign Language Animation Visualizer */}
            <div className="ref-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Hand style={{ width: 16, height: 16, color: '#ffffff' }} />
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#ffffff' }}>
                    Synchronized Indian Sign Language (ISL) Avatar
                  </h4>
                </div>
                <span style={{ fontSize: '0.6875rem', padding: '0.15rem 0.5rem', background: '#27272a', color: '#ffffff', borderRadius: '999px', fontWeight: 700 }}>
                  Real-time Sign Synthesizer
                </span>
              </div>

              {/* Visual Sign Player linked to Live Speech */}
              <SignVisualizer
                text={roomTranscript || activeSignText || ''}
                speed={1.0}
              />

              {/* Live Caption Strip */}
              <div style={{ marginTop: '0.25rem' }}>
                <p style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#a1a1aa', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                  Live ISL Sign Tokens:
                </p>
                <div className="caption-strip" style={{ minHeight: '44px' }}>
                  {(roomGlosses?.length > 0 ? roomGlosses : (liveLectureGlosses?.length > 0 ? liveLectureGlosses : [])).length > 0
                    ? (roomGlosses?.length > 0 ? roomGlosses : liveLectureGlosses).map((token, idx) => (
                        <span key={idx} className="caption-token new">
                          {typeof token === 'string' ? token : (token.word || token.token)}
                        </span>
                      ))
                    : <span style={{ color: '#71717a', fontSize: '0.75rem', fontStyle: 'italic' }}>Waiting for teacher speech…</span>
                  }
                </div>
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



            {/* File / Document Upload for Deaf Student */}
            <div style={{ background: '#121215', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen style={{ width: 15, height: 15, color: '#34d399' }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#ffffff' }}>
                  Upload Document / PDF / Notes for ISL Synthesis
                </span>
              </div>
              <input
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const content = evt.target.result || '';
                      setInputTextForSign(content.slice(0, 300));
                      setActiveSignText(content.slice(0, 300));
                    };
                    reader.readAsText(file);
                  }
                }}
                style={{ fontSize: '0.75rem', color: '#a1a1aa' }}
              />
            </div>

            {/* Quick Curriculum Concepts Picker from Teacher's Active Lesson */}
            {lesson?.concepts && lesson.concepts.length > 0 && (
              <div style={{ background: '#121215', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#ffffff' }}>
                  📖 Select Teacher's Slide Concepts to Generate Signs:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {lesson.concepts.map((concept, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputTextForSign(concept);
                        setActiveSignText(concept);
                      }}
                      style={{
                        padding: '0.35rem 0.75rem',
                        background: activeSignText === concept ? '#ffffff' : '#1f1f23',
                        color: activeSignText === concept ? '#09090b' : '#d4d4d8',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {concept}
                    </button>
                  ))}
                </div>
              </div>
            )}

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

            {/* Last Recognized Gesture Indicator with Tamil Translation */}
            {isCameraActive && liveRecognition?.isKnown && (
              <div style={{ background: '#121215', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '14px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.625rem', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    AI Detected ISL Gesture (English + Tamil தமிழ்)
                  </span>
                  <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', margin: 0, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{liveRecognition.word.toUpperCase()}</span>
                    <span style={{ fontSize: '0.95rem', color: '#34d399', fontWeight: 700 }}>
                      ({translateISLToTamil(liveRecognition.word)})
                    </span>
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
                  Converts recognized ISL signs into clear natural English & Tamil questions
                </p>
              </div>
            </div>

            {/* Detected Tokens History with Tamil Badges and Clear Option */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase' }}>
                  Captured Sign Sequence (One-by-One Doubt Builder):
                </label>
                {detectedSignSequence.length > 0 && (
                  <button
                    onClick={() => {
                      setDetectedSignSequence([]);
                      setAiFormattedDoubt('');
                      setCustomSignMessage('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Clear Sequence
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', minHeight: '38px', padding: '0.35rem 0.5rem', background: '#121215', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                {detectedSignSequence.length > 0 ? (
                  detectedSignSequence.map((token, idx) => (
                    <span key={idx} style={{ padding: '0.25rem 0.65rem', background: '#27272a', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>{token}</span>
                      <span style={{ fontSize: '0.6875rem', color: '#34d399', fontWeight: 700 }}>[{translateISLToTamil(token)}]</span>
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#71717a', fontSize: '0.75rem', fontStyle: 'italic', alignSelf: 'center' }}>
                    Sign on camera or tap sign buttons below to sequence your doubt…
                  </span>
                )}
              </div>

              {/* Quick Sign Token Appender */}
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.6875rem', color: '#71717a', fontWeight: 700 }}>+ Add Sign:</span>
                {['HEART', 'PUMP', 'OXYGEN', 'BLOOD', 'ARTERY', 'SCIENCE', 'QUESTION', 'REPEAT', 'HELP', 'DIAGRAM'].map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      const nextSeq = [...detectedSignSequence, s];
                      setDetectedSignSequence(nextSeq);
                      const generated = generateNaturalDoubtFromSign(s, lesson);
                      setAiFormattedDoubt(generated);
                    }}
                    style={{
                      padding: '0.2rem 0.5rem',
                      background: '#18181b',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '6px',
                      color: '#e4e4e7',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Formatted Question Output (Bilingual: English + Tamil) */}
            <div style={{ background: '#121215', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '16px', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  AI Sequenced Question to Teacher (English & தமிழ்):
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

      {/* ─── TAB 4: DIRECT TEXT-TO-TEXT CONVERSATION WITH TEACHER ───────── */}
      {activeTab === 'text_chat' && (
        <div style={{ maxWidth: '54rem', margin: '0 auto', width: '100%' }}>
          <div className="ref-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ width: 38, height: 38, borderRadius: '10px', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  <MessageSquare style={{ width: 20, height: 20 }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                    Live Classroom Text Conversation
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: 0 }}>
                    Direct two-way real-time messaging with your teacher & classroom
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34d399', background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '0.25rem 0.75rem', borderRadius: '999px' }}>
                🟢 Live Connected
              </span>
            </div>

            {/* Messages Stream */}
            <div style={{ minHeight: '260px', maxHeight: '360px', overflowY: 'auto', background: '#121215', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {directChatMessages.map((msg) => {
                const isMe = msg.sender.includes('You');
                return (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      background: isMe ? '#ffffff' : '#27272a',
                      color: isMe ? '#09090b' : '#ffffff',
                      padding: '0.75rem 1rem',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      border: isMe ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: isMe ? '#52525b' : '#34d399' }}>
                        {msg.sender}
                      </span>
                      <span style={{ fontSize: '0.625rem', color: isMe ? '#71717a' : '#a1a1aa' }}>
                        {msg.time}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.4 }}>
                      {msg.text}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendDirectChat} style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                value={directChatInput}
                onChange={(e) => setDirectChatInput(e.target.value)}
                placeholder="Type your message or question to the teacher..."
                style={{
                  flex: 1,
                  padding: '0.85rem 1.1rem',
                  background: '#121215',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '14px',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '0.85rem 1.25rem', gap: '0.5rem' }}
              >
                <Send style={{ width: 16, height: 16 }} /> Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── TAB 5: ISL QUIZ ─────────────────────────────────────────────────── */}
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
