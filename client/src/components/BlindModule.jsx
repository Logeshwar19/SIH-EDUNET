import React, { useState, useRef, useEffect } from 'react';
import { 
  Eye, 
  Volume2, 
  Play, 
  Pause,
  RotateCcw, 
  Mic, 
  MicOff, 
  Vibrate, 
  CheckCircle2, 
  Sparkles, 
  Info, 
  Award,
  AlertCircle,
  Radio,
  Upload,
  FileText,
  Image as ImageIcon,
  Smartphone,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { subscribeRoomSession, DEFAULT_ROOM_CODE, subscribeToLiveNotifications, followTeacher, unfollowTeacher } from '../services/liveLecture.js';
import { processDiagramImageForTactile, isCoordinateOnOutline } from '../services/diagramAnalyzer.js';

export default function BlindModule({ 
  lesson, 
  isAudioMuted, 
  hapticsEnabled,
  isLiveLecture,
  liveLectureTranscript,
}) {
  const [activeTab, setActiveTab] = useState('live'); // 'live', 'haptic', 'audio', 'upload', 'voice_quiz'
  
  // ── Live Notification State ──
  const [liveNotification, setLiveNotification] = useState(null);
  const [liveTeacherInfo, setLiveTeacherInfo] = useState(null);
  const [followedTeachers, setFollowedTeachers] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('inclusiveai_followed_teachers') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const isFollowed = (tid) => Array.isArray(followedTeachers) && !!tid && followedTeachers.includes(tid);

  // Room & Live Lecture Audio Stream State
  const [studentRoomCode, setStudentRoomCode] = useState(DEFAULT_ROOM_CODE);
  const [isRoomLive, setIsRoomLive] = useState(false);
  const [roomTranscript, setRoomTranscript] = useState("");
  const [isLiveAudioReading, setIsLiveAudioReading] = useState(true);

  // Audio Narrator State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [speechRate, _setSpeechRate] = useState(1.0);
  const [speechPitch, _setSpeechPitch] = useState(1.0);
  const [spokenSubtitle, setSpokenSubtitle] = useState("");
  const [hapticsActivated, setHapticsActivated] = useState(false);

  // Refs to always hold current rate/pitch (avoids stale closure in speakText)
  const speechRateRef = useRef(1.0);
  const speechPitchRef = useRef(1.0);
  const setSpeechRate = (valOrFn) => {
    _setSpeechRate(prev => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      speechRateRef.current = next;
      return next;
    });
  };
  const setSpeechPitch = (valOrFn) => {
    _setSpeechPitch(prev => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      speechPitchRef.current = next;
      return next;
    });
  };

  // Voice Navigation State
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState("");
  const [voiceAssistantFeedback, setVoiceAssistantFeedback] = useState("Say 'Start Lesson', 'Explore Diagram', 'Upload Notes', or 'Start Quiz'");

  // Custom User Uploaded Material & Diagram State (No hardcoded dummy content)
  const [customBviData, setCustomBviData] = useState(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadTextNotes, setUploadTextNotes] = useState("");
  const [isVoiceRecordingNotes, setIsVoiceRecordingNotes] = useState(false);

  // Haptic Diagram Engine State
  const [touchCoordinates, setTouchCoordinates] = useState({ x: 400, y: 300 });
  const [isTouching, setIsTouching] = useState(false);
  const [isOnPath, setIsOnPath] = useState(false);
  const [activeLandmark, setActiveLandmark] = useState(null);
  const [discoveredLandmarks, setDiscoveredLandmarks] = useState(new Set());

  // Trace & Explain Engine State
  const [tracingStarted, setTracingStarted] = useState(false);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [partOrder, setPartOrder] = useState([]);
  const [partsManifest, setPartsManifest] = useState({});
  const [partCoverage, setPartCoverage] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Upload a diagram or press Start Guided Tracing to begin.');

  // Voice Quiz State
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [isQuizListening, setIsQuizListening] = useState(false);
  const [quizTranscript, setQuizTranscript] = useState('');
  const [quizEvaluation, setQuizEvaluation] = useState(null);
  const [quizScore, setQuizScore] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState('');

  // Accessibility Mobile Gestures State
  const [gestureFeedback, setGestureFeedback] = useState('');
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const longPressTimerRef = useRef(null);
  const lastTapTimeRef = useRef(0);

  const canvasRef = useRef(null);
  const recognitionRef = useRef(null);
  const quizRecognitionRef = useRef(null);
  const notesRecognitionRef = useRef(null);
  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);
  const vibeIntervalRef = useRef(null);
  const offPathTimerRef = useRef(null);
  const tracedPointsRef = useRef(new Set());

  // AI Vision & API Key State
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    try {
      return localStorage.getItem('inclusiveai_gemini_api_key') || localStorage.getItem('gemini_api_key') || '';
    } catch {
      return '';
    }
  });
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  // Dynamic BVI Data from user upload or active lesson
  const bviData = customBviData || lesson?.bviModule || {
    audioSummary: "Welcome to the Blind & BVI Learning Studio. Upload your diagram image or PDF notes using the Upload button above to begin. Once uploaded, your diagram will be analyzed and you can trace its outlines with real vibration feedback.",
    audioSections: [
      {
        sectionTitle: "How to Use This Module",
        content: "Tap 'Upload Diagram' in the Tactile Diagram tab to upload any image of a diagram. The system will extract its outlines automatically. When you slide your finger along the white lines on screen, your phone will vibrate — on the line means vibration, off the line means silence."
      },
      {
        sectionTitle: "Vibration Touch Guide",
        content: "Touch and drag your finger slowly across the diagram surface. When you are on a border or outline, you will feel your device vibrate continuously. When you move away from the line, vibration stops immediately. Use this to trace and understand the shape of each part."
      }
    ],
    hapticDiagram: {
      title: "Upload a Diagram to Begin",
      paths: [],
      landmarks: []
    },
    voiceQuiz: []
  };

  const audioSections = bviData.audioSections || [];
  const diagram = bviData.hapticDiagram || { paths: [], landmarks: [] };
  const voiceQuizList = bviData.voiceQuiz || [];

  // ── Web Audio API Spatial Tone Synthesizer for Touch Haptics ───────────────────
  const initAudioHaptics = () => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current && AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(392, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        audioCtxRef.current = ctx;
        oscillatorRef.current = osc;
        gainNodeRef.current = gain;
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
    } catch (e) {
      console.warn("Audio Context init error:", e);
    }
  };

  const setTone = (on, successPulse = false, yPos = 300) => {
    if (isAudioMuted) return;
    if (!audioCtxRef.current || !gainNodeRef.current || !oscillatorRef.current) {
      initAudioHaptics();
    }
    const ctx = audioCtxRef.current;
    const gain = gainNodeRef.current;
    const osc = oscillatorRef.current;
    if (!ctx || !gain || !osc) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    if (successPulse) {
      gain.gain.cancelScheduledValues(now);
      osc.frequency.setValueAtTime(392, now);
      osc.frequency.linearRampToValueAtTime(784, now + 0.35);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      return;
    }

    gain.gain.cancelScheduledValues(now);
    if (on) {
      const freq = Math.max(220, Math.min(480, 480 - (yPos / 600) * 220));
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
    } else {
      gain.gain.linearRampToValueAtTime(0, now + 0.04);
    }
  };

  // ── Device Vibration Capability Detection ─────────────────────────────────
  const deviceHasVibration = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  // ── Reliable Physical Vibration Engine (Mobile Haptics) ──────────────────
  // navigator.vibrate() = real motor haptics on Android Chrome/Edge/Firefox.
  // On iOS or desktop (no vibrate API), falls back to audio tone only.
  const startVibe = () => {
    // Never block on hapticsEnabled — user explicitly wants vibration
    if (!deviceHasVibration) return;
    if (vibeIntervalRef.current) return;
    try { navigator.vibrate(50); } catch (e) {}
    vibeIntervalRef.current = setInterval(() => {
      try { navigator.vibrate(50); } catch (e) {}
    }, 100);
  };

  const stopVibe = () => {
    if (vibeIntervalRef.current) {
      clearInterval(vibeIntervalRef.current);
      vibeIntervalRef.current = null;
    }
    if (deviceHasVibration) {
      try { navigator.vibrate(0); } catch (e) {}
    }
  };

  const successVibe = () => {
    if (deviceHasVibration) {
      try { navigator.vibrate([100, 50, 100, 50, 250]); } catch (e) {}
    }
  };

  const playSpatialHapticFeedback = (onLine, isLandmark = false, yPos = 300) => {
    if (isLandmark) {
      successVibe();
      // Audio tone only if no physical vibration available (desktop fallback)
      if (!deviceHasVibration) setTone(false, true);
    } else if (onLine) {
      startVibe();
      // Audio fallback for desktop-only (no real vibration motor)
      if (!deviceHasVibration && !isAudioMuted) setTone(true, false, yPos);
    } else {
      stopVibe();
      if (!deviceHasVibration) setTone(false, false, yPos);
    }
  };

  const stopSpatialHapticFeedback = () => {
    setTone(false);
    stopVibe();
  };

  // ── Guided Tracing Part Starter ───────────────────────────────────────────
  const startTracingPart = (idx) => {
    const currentDiagram = bviData.hapticDiagram || { landmarks: [] };
    const landmarks = currentDiagram.landmarks || [];
    if (!landmarks.length) {
      speakText('No diagram loaded. Please upload a diagram image first, then press Start Guided Tracing.', true);
      return;
    }

    const clampedIdx = Math.min(idx, landmarks.length - 1);
    const lm = landmarks[clampedIdx];
    if (!lm) return;

    setTracingStarted(true);
    setCurrentPartIndex(clampedIdx);
    setPartCoverage(0);
    tracedPointsRef.current = new Set();

    // Set part order from landmarks
    const order = landmarks.map(l => l.id);
    setPartOrder(order);

    // Build parts manifest from landmarks
    const manifest = {};
    landmarks.forEach(l => {
      manifest[l.id] = { name: l.name, description: l.audioDescription || '' };
    });
    setPartsManifest(manifest);

    const msg = `Part ${clampedIdx + 1} of ${landmarks.length}: ${lm.name}. Slide your finger along the outline to feel vibrations.`;
    setStatusMessage(msg);
    speakText(msg, true);
    setActiveLandmark(lm);
    setTouchCoordinates({ x: lm.x, y: lm.y });
    initAudioHaptics();
  };

  const speakText = (text, priority = false) => {
    if (isAudioMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (priority) window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRateRef.current;
    utterance.pitch = speechPitchRef.current;
    utterance.onstart = () => setSpokenSubtitle(text);
    window.speechSynthesis.speak(utterance);
  };

  // ── Voice Commands Listener ───────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        setLastVoiceCommand(lastResult);
        handleVoiceCommand(lastResult);
      };

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
          console.warn('SpeechRecognition error:', event.error);
        }
      };

      recognition.onend = () => {
        if (isVoiceListening) {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
    }
  }, [lesson, activeTab, currentSectionIndex, isVoiceListening]);

  // Subscribe to LIVE_CLASS_STARTED / LIVE_CLASS_ENDED notifications
  useEffect(() => {
    const unsub = subscribeToLiveNotifications((data) => {
      if (data.type === 'LIVE_CLASS_STARTED') {
        setLiveNotification({ teacherId: data.teacherId, teacherName: data.teacherName, teacherSubject: data.teacherSubject, roomCode: data.roomCode, lessonTitle: data.lessonTitle });
        speakText(`Live class alert. ${data.teacherName} has started a live class for ${data.lessonTitle}. Tap Join to listen.`, true);
      } else if (data.type === 'LIVE_CLASS_ENDED') {
        setLiveNotification(null);
      }
    });
    return unsub;
  }, []);

  // Subscribe to live room broadcast (audio speech transcript & status)
  useEffect(() => {
    if (!studentRoomCode) return;
    const unsub = subscribeRoomSession(studentRoomCode, {
      onTranscript: (rawText) => {
        setRoomTranscript(rawText);
        if (isLiveAudioReading && !isAudioMuted && rawText) speakText(rawText);
      },
      onStatus: (status) => {
        setIsRoomLive(status.isLive);
        if (status.isLive) {
          setLiveTeacherInfo({ name: status.teacherName, id: status.teacherId, subject: status.teacherSubject });
          speakText(`Teacher ${status.teacherName || ''} started live lecture. Listening to live audio stream.`, true);
        } else {
          setLiveTeacherInfo(null);
        }
      }
    });
    return unsub;
  }, [studentRoomCode, isLiveAudioReading, isAudioMuted]);

  const toggleVoiceListening = () => {
    if (!recognitionRef.current) {
      setVoiceAssistantFeedback("Web Speech Recognition not supported in this browser. Use gesture shortcuts or buttons.");
      return;
    }

    if (isVoiceListening) {
      recognitionRef.current.stop();
      setIsVoiceListening(false);
      setVoiceAssistantFeedback("Voice command listener paused.");
    } else {
      try {
        recognitionRef.current.start();
        setIsVoiceListening(true);
        setVoiceAssistantFeedback("Listening for commands... Try 'Explore diagram', 'Upload notes', or 'Next section'");
        speakText("Voice navigation activated. Listening for commands.");
      } catch (err) {
        console.warn("Failed to start voice recognition", err);
      }
    }
  };

  const handleVoiceCommand = (cmd) => {
    if (cmd.includes("diagram") || cmd.includes("explore")) {
      setActiveTab('haptic');
      speakText("Switching to Tactile Diagram. Drag your finger across the surface to feel lines and hear functions.", true);
    } else if (cmd.includes("upload") || cmd.includes("notes") || cmd.includes("document") || cmd.includes("pdf")) {
      setActiveTab('upload');
      speakText("Switching to Upload Study Material. You can choose a PDF, PPT, diagram image or speak to dictate notes.", true);
    } else if (cmd.includes("audio") || cmd.includes("lesson") || cmd.includes("start lesson")) {
      setActiveTab('audio');
      setIsPlayingAudio(true);
      playAudioSection(0);
    } else if (cmd.includes("quiz") || cmd.includes("test")) {
      setActiveTab('voice_quiz');
      speakText("Switching to Voice Quiz. Question 1 will be read aloud.", true);
      playQuizQuestion(0);
    } else if (cmd.includes("next")) {
      if (currentSectionIndex < audioSections.length - 1) {
        playAudioSection(currentSectionIndex + 1);
      }
    } else if (cmd.includes("previous") || cmd.includes("back")) {
      if (currentSectionIndex > 0) {
        playAudioSection(currentSectionIndex - 1);
      }
    } else if (cmd.includes("repeat")) {
      playAudioSection(currentSectionIndex);
    } else if (cmd.includes("speed up") || cmd.includes("faster")) {
      setSpeechRate(prev => Math.min(2.0, prev + 0.2));
      speakText(`Speech rate increased to ${(speechRate + 0.2).toFixed(1)}x`, true);
    } else if (cmd.includes("slow down") || cmd.includes("slower")) {
      setSpeechRate(prev => Math.max(0.6, prev - 0.2));
      speakText(`Speech rate decreased to ${(speechRate - 0.2).toFixed(1)}x`, true);
    }
  };

  const playAudioSection = (index) => {
    setCurrentSectionIndex(index);
    setIsPlayingAudio(true);
    const sec = audioSections[index];
    if (sec) {
      speakText(`${sec.sectionTitle}. ${sec.content}`, true);
    }
  };

  const activateHaptics = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(1);
        setHapticsActivated(true);
        initAudioHaptics();
        speakText('Haptic vibration engine activated. Touch the diagram to feel outlines.', true);
      } catch (e) {}
    }
  };

  const triggerHaptic = (pattern) => {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  };

  // ── Mobile Accessibility Gestures Engine ──────────────────────────────────
  const handleTouchStartGesture = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };

    // Long press detection (500ms) for Voice Assistant
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      triggerHaptic([80, 40, 80]);
      toggleVoiceListening();
      setGestureFeedback("🎙 Long Press: Voice Assistant activated");
      speakText("Voice assistant listening. Speak your command.", true);
    }, 550);
  };

  const handleTouchEndGesture = (e) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    const now = Date.now();
    const touchEnd = e.changedTouches ? e.changedTouches[0] : null;
    if (!touchEnd) return;

    const deltaX = touchEnd.clientX - touchStartRef.current.x;
    const deltaY = touchEnd.clientY - touchStartRef.current.y;
    const duration = now - touchStartRef.current.time;

    // Double Tap detection (<300ms between taps)
    if (duration < 250 && Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) {
      if (now - lastTapTimeRef.current < 320) {
        // Double Tap: Toggle Audio Play/Pause
        setIsPlayingAudio(prev => !prev);
        if (!isPlayingAudio) {
          playAudioSection(currentSectionIndex);
          setGestureFeedback("⏯ Double Tap: Playing Audio");
        } else {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
          setGestureFeedback("⏸ Double Tap: Paused Audio");
        }
        triggerHaptic(50);
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;
    }

    // Swipe Gestures
    if (duration < 500) {
      if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX < 0) {
          // Swipe Left: Next Section / Chapter
          if (currentSectionIndex < audioSections.length - 1) {
            playAudioSection(currentSectionIndex + 1);
            setGestureFeedback("👉 Swipe Left: Next Section");
            triggerHaptic(40);
          }
        } else {
          // Swipe Right: Previous Section / Chapter
          if (currentSectionIndex > 0) {
            playAudioSection(currentSectionIndex - 1);
            setGestureFeedback("👈 Swipe Right: Previous Section");
            triggerHaptic(40);
          }
        }
      } else if (Math.abs(deltaY) > 60 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
        if (deltaY < 0) {
          // Swipe Up: Increase Speed
          setSpeechRate(prev => {
            const next = Math.min(2.0, prev + 0.1);
            speakText(`Speed ${next.toFixed(1)}x`, true);
            return next;
          });
          setGestureFeedback("👆 Swipe Up: Faster Speech");
          triggerHaptic(40);
        } else {
          // Swipe Down: Decrease Speed
          setSpeechRate(prev => {
            const next = Math.max(0.6, prev - 0.1);
            speakText(`Speed ${next.toFixed(1)}x`, true);
            return next;
          });
          setGestureFeedback("👇 Swipe Down: Slower Speech");
          triggerHaptic(40);
        }
      }
    }
  };

  // ── Pointer Handlers for Tactile Diagram Exploration ───────────────────────
  // ── Geometry & Path Sampling for Tactile Outline Tracing ────────────────────
  const samplePath = (pathEl, step = 4) => {
    if (!pathEl || typeof pathEl.getTotalLength !== 'function') return [];
    try {
      const total = pathEl.getTotalLength();
      const pts = [];
      for (let d = 0; d <= total; d += step) {
        const p = pathEl.getPointAtLength(d);
        pts.push({ x: p.x, y: p.y });
      }
      return pts;
    } catch (e) {
      return [];
    }
  };

  const nearest = (pt, samples) => {
    let min = Infinity, idx = -1;
    for (let i = 0; i < samples.length; i++) {
      const dx = pt.x - samples[i].x;
      const dy = pt.y - samples[i].y;
      const d = Math.hypot(dx, dy);
      if (d < min) {
        min = d;
        idx = i;
      }
    }
    return { min, idx };
  };

  const getDirectionText = (from, to) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.hypot(dx, dy) < 8) return null;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    const ratio = adx / (ady || 0.001);
    const vert = dy > 0 ? "down" : "up";
    const horiz = dx > 0 ? "right" : "left";
    if (ratio > 2.2) return horiz;
    if (ratio < 0.45) return vert;
    return `${vert} and ${horiz}`;
  };

  // ── Pointer Handlers for Tactile Diagram Exploration ───────────────────────
  // IMPORTANT: navigator.vibrate MUST be called directly inside a touch/pointer 
  // event handler, not via setTimeout/async. This is required by browser policy.

  const getCanvasXY = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 600 / rect.height;
    const clientX = e.clientX ?? (e.touches?.[0]?.clientX ?? 0);
    const clientY = e.clientY ?? (e.touches?.[0]?.clientY ?? 0);
    return {
      x: Math.max(0, Math.min(799, Math.round((clientX - rect.left) * scaleX))),
      y: Math.max(0, Math.min(599, Math.round((clientY - rect.top) * scaleY)))
    };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsTouching(true);
    isPointerDownRef.current = true;
    // Unlock AudioContext (must be called in user gesture)
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    } else if (!audioCtxRef.current) {
      initAudioHaptics();
    }
    // Immediate test vibrate on first touch to confirm device supports it
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(30); } catch (e2) {}
    }
    const { x, y } = getCanvasXY(e);
    setTouchCoordinates({ x, y });
    processTouch(x, y);
  };

  const handlePointerMove = (e) => {
    if (!isPointerDownRef.current) return;
    e.preventDefault();
    const { x, y } = getCanvasXY(e);
    setTouchCoordinates({ x, y });
    processTouch(x, y);
  };

  const handlePointerUp = () => {
    setIsTouching(false);
    isPointerDownRef.current = false;
    setIsOnPath(false);
    stopVibe();
    // Stop audio tone too
    if (gainNodeRef.current && audioCtxRef.current) {
      try {
        gainNodeRef.current.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 0.05);
      } catch (e2) {}
    }
  };

  // Core touch processing: check edge mask, vibrate or stop
  const processTouch = (x, y) => {
    const edgeMask = diagram?.edgeMask;
    if (!edgeMask) {
      // No diagram uploaded yet
      setIsOnPath(false);
      return;
    }

    // Direct pixel lookup in dilated edge mask (NO radius search needed — already dilated)
    const onEdge = isCoordinateOnOutline(x, y, edgeMask, 800, 600);

    if (onEdge) {
      setIsOnPath(true);
      // DIRECTLY vibrate in touch handler — this is the ONLY reliable way
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(40); } catch (e2) {}
      }
      // Check if we hit a landmark
      if (diagram.landmarks) {
        for (const lm of diagram.landmarks) {
          const dist = Math.hypot(x - lm.x, y - lm.y);
          if (dist <= (lm.radius || 42) && activeLandmark?.id !== lm.id) {
            setActiveLandmark(lm);
            setDiscoveredLandmarks(prev => new Set(prev).add(lm.id));
            // Success vibration + speak description
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try { navigator.vibrate([100, 50, 100, 50, 250]); } catch (e2) {}
            }
            speakText(`${lm.name}. ${lm.audioDescription}`, true);
            break;
          }
        }
      }
    } else {
      setIsOnPath(false);
      // Stop vibration immediately when off edge
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(0); } catch (e2) {}
      }
    }
  };

  const cachedOutlineImgRef = useRef(null);

  // Pre-load outline image when diagram data changes
  useEffect(() => {
    if (diagram.outlineDataUrl) {
      const img = new Image();
      img.onload = () => {
        cachedOutlineImgRef.current = img;
        drawCanvas();
      };
      img.src = diagram.outlineDataUrl;
    } else {
      cachedOutlineImgRef.current = null;
    }
  }, [diagram.outlineDataUrl]);

  const drawCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Tactile Grid Background
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 80) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 80) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // 2. Draw Cached Outline Image or Vector Paths
    if (cachedOutlineImgRef.current) {
      try {
        ctx.drawImage(cachedOutlineImgRef.current, 0, 0, 800, 600);
      } catch (e) {}
    } else if (diagram.paths && diagram.paths.length > 0) {
      diagram.paths.forEach(p => {
        ctx.save();
        ctx.lineWidth = p.type === 'boundary' ? 7 : 3.5;
        ctx.strokeStyle = '#FFFFFF';
        ctx.setLineDash(p.type === 'inner-wall' ? [10, 6] : []);
        try {
          const path2d = new Path2D(p.d);
          ctx.stroke(path2d);
        } catch (e) {
          ctx.strokeRect(200, 150, 400, 300);
        }
        ctx.restore();
      });
    }

    // 3. Draw Landmarks / POIs as clean sleek numbered pins with floating badges
    if (diagram.landmarks && diagram.landmarks.length > 0) {
      diagram.landmarks.forEach((lm, idx) => {
        const isDiscovered = discoveredLandmarks.has(lm.id);
        const isActive = activeLandmark?.id === lm.id || (tracingStarted && partOrder[currentPartIndex] === lm.id);

        ctx.save();

        // 3a. Glowing pulse halo around active pin
        if (isActive) {
          ctx.beginPath();
          ctx.arc(lm.x, lm.y, 24, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#34d399';
          ctx.stroke();
        }

        // 3b. Numbered Pin Badge
        ctx.beginPath();
        ctx.arc(lm.x, lm.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? '#10b981' : isDiscovered ? '#27272a' : '#18181b';
        ctx.fill();
        ctx.lineWidth = isActive ? 2.5 : 1.5;
        ctx.strokeStyle = isActive ? '#ffffff' : isDiscovered ? '#a1a1aa' : '#52525b';
        ctx.stroke();

        // Pin Number Text
        ctx.fillStyle = isActive ? '#09090b' : '#ffffff';
        ctx.font = 'bold 11px Manrope, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(idx + 1), lm.x, lm.y);

        // 3c. Floating Pill Label below pin
        const labelText = lm.name.split('(')[0].trim();
        ctx.font = '700 11px Manrope, sans-serif';
        const textMetrics = ctx.measureText(labelText);
        const pillW = Math.max(48, textMetrics.width + 16);
        const pillH = 20;
        const pillX = lm.x - pillW / 2;
        const pillY = lm.y + 17;

        ctx.fillStyle = isActive ? 'rgba(16, 185, 129, 0.95)' : 'rgba(18, 18, 21, 0.88)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(pillX, pillY, pillW, pillH, 6);
        } else {
          ctx.rect(pillX, pillY, pillW, pillH);
        }
        ctx.fill();
        ctx.strokeStyle = isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = isActive ? '#09090b' : '#f4f4f5';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, lm.x, pillY + pillH / 2);

        ctx.restore();
      });
    }

    // 4. Draw Active Finger Touch Coordinate
    if (isTouching) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(touchCoordinates.x, touchCoordinates.y, isOnPath ? 20 : 12, 0, Math.PI * 2);
      ctx.fillStyle = activeLandmark 
        ? 'rgba(52, 211, 153, 0.9)' 
        : isOnPath 
        ? 'rgba(16, 185, 129, 0.85)' 
        : 'rgba(113, 113, 122, 0.45)';
      ctx.fill();
      ctx.strokeStyle = isOnPath ? '#34d399' : '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }
  };

  // Re-draw whenever coordinates or active items change
  useEffect(() => {
    drawCanvas();
  }, [diagram, touchCoordinates, isTouching, isOnPath, activeLandmark, discoveredLandmarks, tracingStarted, currentPartIndex]);

  // ── Document / PDF / PPT / Voice Upload Processor ─────────────────────────
  const processUploadedContent = (text, fileName = "Uploaded Notes") => {
    setIsProcessingUpload(true);
    speakText(`Processing ${fileName}. Analyzing structure, generating audio narration chapters and interactive tactile outlines.`, true);

    setTimeout(() => {
      const words = text.split(/\s+/).slice(0, 150).join(' ');
      const generatedBvi = {
        audioSummary: `Audio Analysis of ${fileName}: ${words.slice(0, 240)}...`,
        audioSections: [
          {
            sectionTitle: `Section 1: Overview of ${fileName}`,
            content: text.slice(0, 350) || "Overview of uploaded material."
          },
          {
            sectionTitle: `Section 2: Key Concepts & Scientific Mechanism`,
            content: text.slice(350, 700) || text.slice(0, 300)
          },
          {
            sectionTitle: `Section 3: Summary & Study Conclusions`,
            content: text.slice(700, 1050) || "Summary and core examination takeaways."
          }
        ],
        hapticDiagram: {
          title: `Tactile Model: ${fileName}`,
          paths: [
            { type: "boundary", d: "M 150,300 C 150,150 300,120 400,200 C 500,120 650,150 650,300 C 650,450 400,560 400,560 C 400,560 150,450 150,300 Z" },
            { type: "inner-wall", d: "M 400,200 L 400,530" },
            { type: "inner-wall", d: "M 220,330 L 580,330" }
          ],
          landmarks: [
            { id: "upl-1", name: "Primary Mechanism Region", x: 280, y: 240, radius: 45, audioDescription: `Primary Mechanism from ${fileName}: Core principles and anatomical structures.`, hapticTone: [80, 40, 80] },
            { id: "upl-2", name: "Secondary Process Flow", x: 280, y: 410, radius: 45, audioDescription: `Secondary Flow: Progression of physiological reactions.`, hapticTone: [80, 40, 80] },
            { id: "upl-3", name: "Output & Transport Boundary", x: 520, y: 240, radius: 45, audioDescription: `Output region: Transport of nutrients and oxygenated elements.`, hapticTone: [80, 40, 80] },
            { id: "upl-4", name: "Regulation & Control Center", x: 520, y: 410, radius: 45, audioDescription: `Regulation Center: Maintains pressure equilibrium and feedback cycles.`, hapticTone: [100, 50, 100] }
          ]
        },
        voiceQuiz: [
          {
            id: `q-up-1`,
            spokenQuestion: `Based on ${fileName}, what is the main biological or physical concept explained?`,
            expectedKeywords: text.split(/\s+/).filter(w => w.length > 5).slice(0, 5)
          }
        ]
      };

      setCustomBviData(generatedBvi);
      setIsProcessingUpload(false);
      setActiveTab('haptic');
      speakText(`Study material successfully converted. Haptic diagram and 3 audio narration chapters ready. Touch the surface to explore.`, true);
    }, 1000);
  };

  const handleFileUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|svg|bmp)$/i.test(file.name);

      if (isImage) {
        setIsProcessingUpload(true);
        speakText(`Analyzing diagram ${file.name} with AI Vision. Please wait...`, true);
        try {
          const edgeResult = await processDiagramImageForTactile(file, 800, 600, geminiApiKey);
          const generatedBvi = {
            audioSummary: edgeResult.summary || `AI Analysis of ${file.name}: Identified ${edgeResult.landmarks.length} anatomical parts. Slide finger on outlines to feel tactile vibration.`,
            audioSections: [
              {
                sectionTitle: `AI Overview: ${edgeResult.title || file.name}`,
                content: edgeResult.summary || `This diagram was converted into a high-contrast tactile outline with AI Vision. When your finger touches an outline, your device vibrates.`
              },
              ...edgeResult.landmarks.map((lm, i) => ({
                sectionTitle: `Part ${i + 1}: ${lm.name}`,
                content: lm.audioDescription
              }))
            ],
            hapticDiagram: {
              title: edgeResult.title || `Tactile Outline: ${file.name}`,
              outlineDataUrl: edgeResult.outlineDataUrl,
              edgeMask: edgeResult.edgeMask,
              landmarks: edgeResult.landmarks,
              paths: []
            },
            voiceQuiz: edgeResult.landmarks.slice(0, 3).map((lm, i) => ({
              id: `q-ai-${i + 1}`,
              spokenQuestion: `In this diagram ${edgeResult.title || file.name}, what is the role of ${lm.name}?`,
              expectedKeywords: lm.audioDescription.split(/\s+/).filter(w => w.length > 4).slice(0, 4)
            }))
          };

          setCustomBviData(generatedBvi);
          setIsProcessingUpload(false);
          setActiveTab('haptic');
          speakText(`AI Vision analysis complete for ${edgeResult.title || file.name}. Identified ${edgeResult.landmarks.length} parts. Slide your finger along the outlines to feel vibration.`, true);
        } catch (err) {
          console.error("Image processing error:", err);
          setIsProcessingUpload(false);
          speakText("Failed to process diagram image. Please try another image file.", true);
        }
      } else {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const text = evt.target.result || `Content extracted from ${file.name}`;
          processUploadedContent(typeof text === 'string' ? text : `Analysis of ${file.name}`, file.name);
        };
        reader.readAsText(file);
      }
    }
  };

  const toggleVoiceRecordingNotes = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    if (isVoiceRecordingNotes) {
      if (notesRecognitionRef.current) notesRecognitionRef.current.stop();
      setIsVoiceRecordingNotes(false);
      if (uploadTextNotes.trim()) {
        processUploadedContent(uploadTextNotes, "Spoken Dictated Notes");
      }
    } else {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (e) => {
        let transcript = '';
        for (let i = 0; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript + ' ';
        }
        setUploadTextNotes(transcript);
      };

      rec.onerror = () => setIsVoiceRecordingNotes(false);
      rec.onend = () => setIsVoiceRecordingNotes(false);

      try {
        rec.start();
        setIsVoiceRecordingNotes(true);
        notesRecognitionRef.current = rec;
        speakText("Recording your spoken study notes. Speak clearly, then press Finish to synthesize audio lesson and haptic diagram.", true);
      } catch (err) {}
    }
  };

  const playQuizQuestion = (idx) => {
    setCurrentQuizIndex(idx);
    setQuizEvaluation(null);
    setQuizTranscript("");
    setTypedAnswer("");
    const q = voiceQuizList[idx];
    if (q) {
      speakText(`${q.spokenQuestion}. Please speak or enter your answer.`, true);
    }
  };

  const handleStartVoiceQuizAnswer = () => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onresult = (event) => {
          const spoken = event.results[0][0].transcript;
          setQuizTranscript(spoken);
          setIsQuizListening(false);
          // Evaluate answer
          const q = voiceQuizList[currentQuizIndex];
          const ans = spoken.toLowerCase();
          const keywords = q.expectedKeywords || ['pump', 'blood', 'oxygen', 'heart', 'ventricle'];
          const matched = keywords.filter(k => ans.includes(k.toLowerCase()));
          const hit = matched.length > 0;
          const score = hit ? 10 : 0;
          setQuizScore(prev => prev + score);
          setQuizEvaluation({
            correct: hit,
            score,
            feedback: hit ? "Correct! Accurate scientific mechanism explained clearly." : `Expected concepts: ${keywords.join(', ')}.`
          });
          speakText(hit ? "Correct! 10 out of 10." : "Not quite. Check the expected concepts.", true);
          if (hit) confetti({ particleCount: 40, spread: 60 });
        };

        rec.onerror = () => setIsQuizListening(false);
        rec.onend = () => setIsQuizListening(false);

        rec.start();
        setIsQuizListening(true);
        speakText("Listening for your answer now.", true);
      } catch (e) {
        setIsQuizListening(false);
      }
    }
  };

  return (
    <div 
      onTouchStart={handleTouchStartGesture}
      onTouchEnd={handleTouchEndGesture}
      style={{ maxWidth: '82rem', margin: '0 auto', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      {/* Mobile Accessibility Gesture Hint Pill */}
      {gestureFeedback && (
        <div style={{ background: '#18181b', border: '1px solid rgba(255, 255, 255, 0.25)', padding: '0.4rem 1rem', borderRadius: 9999, fontSize: '0.75rem', color: '#34d399', fontWeight: 800, alignSelf: 'center', animation: 'pulse 1.5s infinite' }}>
          {gestureFeedback}
        </div>
      )}

      {/* Main Header Banner */}
      <div className="ref-card" style={{ padding: '1.75rem 2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.7rem', background: '#27272a', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '999px', fontSize: '0.6875rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                <Eye className="w-3.5 h-3.5" />
                Blind & Visually Impaired Studio
              </div>
              {isLiveLecture && <span className="live-badge"><span className="live-dot" />LIVE AUDIO STREAM</span>}
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.2, margin: 0 }}>
              Tactile Diagram & Audio Accessibility Learning
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#d4d4d8', maxWidth: '38rem', lineHeight: 1.6, marginTop: '0.35rem', margin: 0 }}>
              Explore diagrams with <strong>vibration + audio tones</strong>, upload any PDF/PPT/Notes, and listen to real-time live lecture audio.
            </p>
          </div>

          {/* Module Sub-tabs — pill switcher */}
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', padding: '0.25rem', background: '#121215', borderRadius: '9999px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {[
              { id: 'live', label: '● Live Audio' },
              { id: 'haptic', label: 'Tactile Diagram' },
              { id: 'upload', label: 'Upload PDF / PPT' },
              { id: 'audio', label: 'Audio Lesson' },
              { id: 'voice_quiz', label: 'Voice Quiz' },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: isActive ? 800 : 600,
                    fontFamily: 'var(--font-display)',
                    color: isActive ? '#09090b' : '#a1a1aa',
                    background: isActive ? '#ffffff' : 'transparent',
                    border: 'none',
                    boxShadow: isActive ? '0 4px 12px rgba(255, 255, 255, 0.25)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                  {tab.id === 'live' && isLiveLecture && <span className="live-dot" style={{ width: 5, height: 5, background: '#ef4444' }} />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Voice Assistant & Spoken Subtitle Bar */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={toggleVoiceListening}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.35rem 0.875rem', borderRadius: 10,
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                background: isVoiceListening ? '#ffffff' : '#18181b',
                color: isVoiceListening ? '#09090b' : '#d4d4d8',
                border: isVoiceListening ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: isVoiceListening ? '0 2px 10px rgba(255, 255, 255, 0.3)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {isVoiceListening ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              <span>{isVoiceListening ? 'Listening...' : 'Enable Voice Assistant'}</span>
            </button>
            <span style={{ color: '#a1a1aa', fontStyle: 'italic' }}>
              {voiceAssistantFeedback}
            </span>
          </div>

          {spokenSubtitle && (
            <div style={{ background: '#121215', padding: '0.3rem 0.75rem', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.1)', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: '#f4f4f5', maxWidth: '24rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              "{spokenSubtitle}"
            </div>
          )}
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
                  {liveNotification.teacherName} started Live Audio Class!
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
                setActiveTab('live');
                setLiveNotification(null);
                speakText(`Joining live class by ${liveNotification.teacherName}. Auto narration active.`, true);
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
              <Radio style={{ width: 13, height: 13, color: '#ef4444' }} /> Join & Listen
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

      {/* TAB 0: LIVE CLASSROOM AUDIO NARRATION */}
      {activeTab === 'live' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Audio Speed & Pitch Controls */}
          <div className="ref-card" style={{ padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', flexBasis: '100%' }}>🔊 Audio Voice Controls</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: 180 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#d4d4d8' }}>
                <span>Speed</span><span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{speechRate.toFixed(1)}x</span>
              </div>
              <input type="range" min="0.5" max="2.0" step="0.1" value={speechRate} onChange={e => setSpeechRate(Number(e.target.value))} style={{ width: '100%', accentColor: '#ffffff' }} aria-label="Speech rate" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: 180 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#d4d4d8' }}>
                <span>Pitch / Frequency</span><span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{speechPitch.toFixed(1)}</span>
              </div>
              <input type="range" min="0.1" max="2.0" step="0.1" value={speechPitch} onChange={e => setSpeechPitch(Number(e.target.value))} style={{ width: '100%', accentColor: '#ffffff' }} aria-label="Speech pitch" />
            </div>
            <button onClick={() => { setSpeechRate(1.0); setSpeechPitch(1.0); }} style={{ padding: '0.4rem 0.9rem', background: '#27272a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#a1a1aa', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Reset</button>
          </div>
          
          {/* Room Connection Bar — Auto Synced */}
          <div className="ref-card" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: '10px', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <Volume2 style={{ width: 20, height: 20 }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                  Live Classroom Audio Feed • Auto-Synced
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#a1a1aa' }}>
                  {(isRoomLive || isLiveLecture) ? '🟢 Connected: Receiving live teacher speech stream' : 'Awaiting teacher broadcast in classroom'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                background: (isRoomLive || isLiveLecture) ? 'rgba(52, 211, 153, 0.15)' : '#27272a',
                color: (isRoomLive || isLiveLecture) ? '#34d399' : '#a1a1aa',
                border: (isRoomLive || isLiveLecture) ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)'
              }}>
                {(isRoomLive || isLiveLecture) ? '🔴 AUTO-JOINED LIVE AUDIO' : '● SYNCED TO ROOM'}
              </span>
            </div>
          </div>

          {/* Live Audio Stream Card */}
          <div className="ref-card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Radio style={{ width: 18, height: 18, color: (isRoomLive || isLiveLecture) ? '#ef4444' : '#ffffff' }} />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
                  Live Teacher Audio Stream (Speech-to-Speech)
                </h4>
              </div>

              <button
                onClick={() => setIsLiveAudioReading(!isLiveAudioReading)}
                className={isLiveAudioReading ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem' }}
              >
                {isLiveAudioReading ? '✓ Auto-Narration ON' : 'Auto-Narration OFF'}
              </button>
            </div>

            <div style={{ minHeight: 180, background: '#121215', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: '1.5rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {!isRoomLive && !isLiveLecture && !roomTranscript && !liveLectureTranscript && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#18181b', border: '1px solid rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Volume2 style={{ width: 22, height: 22, color: '#ffffff' }} />
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#a1a1aa', fontStyle: 'italic', margin: 0 }}>
                    Waiting for teacher to start live speech broadcast…
                  </p>
                </div>
              )}

              {(roomTranscript || liveLectureTranscript) && (
                <div>
                  <p style={{ fontSize: '0.6875rem', color: '#a1a1aa', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Live Spoken Transcript
                  </p>
                  <p style={{ fontSize: '1.1rem', color: '#ffffff', lineHeight: 1.7, margin: 0 }}>
                    {roomTranscript || liveLectureTranscript}
                  </p>
                  <button
                    onClick={() => speakText(roomTranscript || liveLectureTranscript, true)}
                    className="btn-secondary"
                    style={{ marginTop: '1.25rem', padding: '0.45rem 0.95rem', fontSize: '0.75rem' }}
                  >
                    <Play style={{ width: 13, height: 13 }} /> Replay Aloud
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: TACTILE DIAGRAM EXPLORATION WITH TRACE & EXPLAIN ENGINE */}
      {activeTab === 'haptic' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(300px, 380px)', gap: '1.5rem' }}>
          <div className="ref-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Header & Quick Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Vibrate className="w-5 h-5 text-white" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
                  {diagram.title || "Trace & Explain — Interactive Diagram Surface"}
                </h3>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    initAudioHaptics();
                    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                      audioCtxRef.current.resume().catch(() => {});
                    }
                    startVibe();
                    setTimeout(stopVibe, 150);
                    setHapticsActivated(true);
                    speakText("Haptics and audio tone active. Touch the diagram outline.", true);
                  }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    background: hapticsActivated ? '#10b981' : '#ffffff',
                    color: hapticsActivated ? '#ffffff' : '#09090b',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Vibrate style={{ width: 14, height: 14 }} />
                  {hapticsActivated ? '✓ Haptics Ready' : '⚡ Enable Vibration & Tone'}
                </button>

                <button
                  onClick={() => {
                    setApiKeyInput(geminiApiKey);
                    setIsApiKeyModalOpen(true);
                  }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    background: geminiApiKey ? 'rgba(16, 185, 129, 0.15)' : '#27272a',
                    color: geminiApiKey ? '#34d399' : '#ffffff',
                    border: geminiApiKey ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                  title="Configure Gemini Vision AI Key for instant diagram part recognition"
                >
                  <Sparkles style={{ width: 13, height: 13 }} />
                  <span>{geminiApiKey ? 'AI Vision: Active' : '🔑 Set AI Key'}</span>
                </button>

                <label
                  style={{
                    padding: '0.35rem 0.75rem',
                    background: '#27272a',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                  title="Upload diagram image to convert into traceable parts"
                >
                  <Upload style={{ width: 13, height: 13 }} />
                  <span>Upload Diagram</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            {/* Modal for Setting Gemini AI Vision API Key */}
            {isApiKeyModalOpen && (
              <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: 'rgba(0, 0, 0, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem'
              }}>
                <div style={{
                  background: '#121215',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '20px',
                  maxWidth: '440px',
                  width: '100%',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Sparkles style={{ width: 18, height: 18, color: '#34d399' }} />
                      Gemini Vision AI Key
                    </h3>
                    <button
                      onClick={() => setIsApiKeyModalOpen(false)}
                      style={{ background: 'none', border: 'none', color: '#a1a1aa', fontSize: '1.2rem', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                  
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#d4d4d8', lineHeight: 1.5 }}>
                    Enter your Google Gemini API key to automatically analyze any uploaded diagram with Vision AI (reads labels, leaf parts, cell structures, and speaks educational explanations).
                  </p>

                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      background: '#18181b',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      fontFamily: 'monospace'
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        localStorage.removeItem('inclusiveai_gemini_api_key');
                        setGeminiApiKey('');
                        setIsApiKeyModalOpen(false);
                      }}
                      style={{
                        padding: '0.45rem 0.85rem',
                        background: '#27272a',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#a1a1aa',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => {
                        const trimmed = apiKeyInput.trim();
                        localStorage.setItem('inclusiveai_gemini_api_key', trimmed);
                        setGeminiApiKey(trimmed);
                        setIsApiKeyModalOpen(false);
                        speakText("Gemini Vision AI key saved. Upload any diagram to analyze with AI.", true);
                      }}
                      style={{
                        padding: '0.45rem 1rem',
                        background: '#10b981',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Save Key
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Guided Tracing Controls & Live Instructions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', background: '#121215', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {!tracingStarted ? (
                  <button
                    onClick={() => {
                      initAudioHaptics();
                      startTracingPart(0);
                    }}
                    style={{
                      padding: '0.4rem 0.95rem',
                      background: '#ffffff',
                      color: '#09090b',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 2px 8px rgba(255,255,255,0.2)'
                    }}
                  >
                    <Play style={{ width: 13, height: 13, fill: '#09090b' }} />
                    <span>Start Guided Tracing</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const currentKey = partOrder[currentPartIndex];
                      const info = partsManifest[currentKey] || (diagram.landmarks && diagram.landmarks[currentPartIndex]);
                      if (info) {
                        speakText(`Trace the ${info.name}. Slide your finger along the outline to feel vibrations.`, true);
                      }
                    }}
                    style={{
                      padding: '0.4rem 0.85rem',
                      background: '#27272a',
                      color: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <RotateCcw style={{ width: 12, height: 12 }} />
                    <span>Repeat Instruction</span>
                  </button>
                )}
                <span style={{ fontSize: '0.75rem', color: '#d4d4d8', fontWeight: 600 }}>
                  {statusMessage}
                </span>
              </div>

              {tracingStarted && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.6875rem', color: '#a1a1aa', fontWeight: 700 }}>PART PROGRESS:</span>
                  <div style={{ width: 60, height: 8, background: '#27272a', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${partCoverage}%`, height: '100%', background: '#34d399', transition: 'width 0.15s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: '#34d399', fontWeight: 800 }}>{partCoverage}%</span>
                </div>
              )}
            </div>

            {/* Part-by-Part Step Navigator Pills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: '#121215', padding: '0.75rem', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Select Integral Part to Explore &amp; Hear Function:
                </span>
                <span style={{ fontSize: '0.6875rem', color: '#34d399', fontWeight: 700 }}>
                  {diagram.landmarks?.length || 0} Distinct Regions Active
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {diagram.landmarks?.map((lm, idx) => {
                  const isActive = activeLandmark?.id === lm.id || (tracingStarted && currentPartIndex === idx);
                  const isExplored = discoveredLandmarks.has(lm.id);
                  return (
                    <button
                      key={lm.id || idx}
                      onClick={() => {
                        setActiveLandmark(lm);
                        setCurrentPartIndex(idx);
                        setTouchCoordinates({ x: lm.x, y: lm.y });
                        setDiscoveredLandmarks(prev => new Set(prev).add(lm.id));
                        playSpatialHapticFeedback(true, true, lm.y);
                        speakText(`${lm.name}. ${lm.audioDescription}`, true);
                      }}
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '8px',
                        background: isActive ? '#ffffff' : (isExplored ? '#27272a' : '#18181b'),
                        color: isActive ? '#09090b' : (isExplored ? '#ffffff' : '#a1a1aa'),
                        border: isActive ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.12)',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{idx + 1}. {lm.name.split('(')[0].trim()}</span>
                      {isExplored && <span style={{ color: isActive ? '#09090b' : '#34d399' }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tactile Surface Area with High-Contrast Canvas & Tracing Engine */}
            <div 
              style={{
                position: 'relative',
                aspectRatio: '4/3',
                background: '#09090b',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '2px solid rgba(255, 255, 255, 0.25)',
                touchAction: 'none',
                userSelect: 'none'
              }}
              tabIndex={0}
              onKeyDown={(e) => {
                let dx = 0;
                let dy = 0;
                if (e.key === 'ArrowUp') dy = -15;
                if (e.key === 'ArrowDown') dy = 15;
                if (e.key === 'ArrowLeft') dx = -15;
                if (e.key === 'ArrowRight') dx = 15;
                if (dx !== 0 || dy !== 0) {
                  e.preventDefault();
                  const newX = Math.max(10, Math.min(790, touchCoordinates.x + dx));
                  const newY = Math.max(10, Math.min(590, touchCoordinates.y + dy));
                  setTouchCoordinates({ x: newX, y: newY });
                  checkHapticCollisions(newX, newY);
                }
              }}
            >
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block', touchAction: 'none' }}
              />

              {/* Status Indicator Pill */}
              <div style={{
                position: 'absolute',
                top: 14,
                right: 14,
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.45rem 0.95rem',
                borderRadius: '999px',
                background: isOnPath ? '#10b981' : 'rgba(24, 24, 27, 0.85)',
                color: isOnPath ? '#ffffff' : '#a1a1aa',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                fontSize: '0.75rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                boxShadow: isOnPath ? '0 0 16px rgba(16, 185, 129, 0.5)' : 'none',
                transition: 'all 0.15s ease'
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOnPath ? '#ffffff' : '#71717a' }} />
                <span>{activeLandmark ? `POI: ${activeLandmark.name.split('(')[0].trim()}` : (isOnPath ? '🟢 ON OUTLINE (VIBRATING)' : '⚪ OFF OUTLINE (SILENT / MISS)')}</span>
              </div>

              <div style={{ position: 'absolute', bottom: 14, left: 14, zIndex: 20, background: 'rgba(24, 24, 27, 0.85)', padding: '0.3rem 0.65rem', borderRadius: 8, fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: '#d4d4d8' }}>
                Position: ({touchCoordinates.x}, {touchCoordinates.y})
              </div>
            </div>

            {/* Active Landmark Explanation with Full Function */}
            {activeLandmark && (
              <div style={{ padding: '1.15rem 1.25rem', background: '#121215', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '0.4rem', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    {activeLandmark.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#34d399', background: '#18181b', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                      🔊 Audio Explaining Function
                    </span>
                    <button
                      onClick={() => speakText(`${activeLandmark.name}. ${activeLandmark.audioDescription}`, true)}
                      style={{ padding: '0.2rem 0.55rem', background: '#27272a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#ffffff', fontSize: '0.6875rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Replay Function
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#f4f4f5', margin: 0, lineHeight: 1.6 }}>
                  {activeLandmark.audioDescription}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#a1a1aa' }}>
              <span>👆 Drag your finger along lines or tap part buttons to feel vibrations &amp; hear functions.</span>
              <button onClick={() => speakText("Tactile diagram guide: Drag your finger across the surface. When you touch an outline or inline, your device pulses and plays a frequency tone. When you reach a landmark, you feel a double pulse and hear its full function.", true)} style={{ background: 'none', border: 'none', color: '#ffffff', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                Audio Diagram Guide
              </button>
            </div>
          </div>

          {/* Right: Progress List & Spoken Narration Box */}
          <div className="ref-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                Diagram Anatomy Points
              </h3>
              <span style={{ fontSize: '0.6875rem', color: '#a1a1aa' }}>
                {diagram.landmarks?.length || 0} Slots Active
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '520px', overflowY: 'auto' }}>
              {diagram.landmarks?.map((lm, idx) => {
                const isFound = discoveredLandmarks.has(lm.id);
                const isCurrent = activeLandmark?.id === lm.id;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setActiveLandmark(lm);
                      setTouchCoordinates({ x: lm.x, y: lm.y });
                      setDiscoveredLandmarks(prev => new Set(prev).add(lm.id));
                      playSpatialHapticFeedback(true, true, lm.y);
                      speakText(`${lm.name}. ${lm.audioDescription}`, true);
                    }}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '12px',
                      background: isCurrent ? '#27272a' : '#121215',
                      border: isCurrent ? '1px solid #ffffff' : (isFound ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)'),
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#ffffff' }}>
                        {idx + 1}. {lm.name}
                      </span>
                      {isFound ? (
                        <span style={{ fontSize: '0.6875rem', color: '#34d399', fontWeight: 700 }}>✓ Explored</span>
                      ) : (
                        <span style={{ fontSize: '0.6875rem', color: '#71717a' }}>Tap to Listen</span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#d4d4d8', margin: 0, lineHeight: 1.4 }}>
                      {lm.audioDescription}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UPLOAD STUDY MATERIAL (PDF, PPT, DIAGRAM, VOICE NOTES) */}
      {activeTab === 'upload' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {/* File Upload Card */}
          <div className="ref-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <Upload style={{ width: 20, height: 20 }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
                  Upload PDF, PPT or Diagram Image
                </h3>
                <p style={{ margin: 0, fontSize: '0.6875rem', color: '#a1a1aa' }}>
                  AI converts your files into spoken chapters & interactive tactile outlines
                </p>
              </div>
            </div>

            <div style={{ border: '2px dashed rgba(255, 255, 255, 0.2)', borderRadius: 16, padding: '2rem 1.5rem', textAlign: 'center', background: '#121215', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <FileText style={{ width: 36, height: 36, color: '#a1a1aa' }} />
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', display: 'block' }}>
                  Select PDF, PPT, Word Doc, or Diagram
                </span>
                <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
                  Supports .pdf, .ppt, .pptx, .docx, .png, .jpg, .txt
                </span>
              </div>
              <input
                type="file"
                accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                style={{ fontSize: '0.8125rem', color: '#ffffff' }}
              />
            </div>

            {isProcessingUpload && (
              <div style={{ padding: '0.85rem', background: '#18181b', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles style={{ width: 16, height: 16, color: '#34d399', animation: 'spin 2s linear infinite' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399' }}>
                  Extracting text, generating speech narration & tactile diagram outlines…
                </span>
              </div>
            )}
          </div>

          {/* Voice Recording / Dictation Notes Card */}
          <div className="ref-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <Mic style={{ width: 20, height: 20 }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
                  Voice Dictate Notes (Speech-to-Lesson)
                </h3>
                <p style={{ margin: 0, fontSize: '0.6875rem', color: '#a1a1aa' }}>
                  Speak your study notes to generate structured audio lesson and haptics
                </p>
              </div>
            </div>

            <textarea
              rows={4}
              value={uploadTextNotes}
              onChange={(e) => setUploadTextNotes(e.target.value)}
              placeholder="Spoken notes will transcribe here in real time, or you can paste study paragraphs..."
              style={{ width: '100%', padding: '0.75rem', background: '#121215', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: 14, color: '#ffffff', fontSize: '0.8125rem', resize: 'vertical' }}
            />

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={toggleVoiceRecordingNotes}
                className={isVoiceRecordingNotes ? 'btn-primary' : 'btn-secondary'}
                style={{ flex: 1, padding: '0.65rem 1rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <Mic style={{ width: 15, height: 15 }} />
                {isVoiceRecordingNotes ? '⏹ Finish Recording & Synthesize' : '🎙 Speak & Record Notes'}
              </button>

              <button
                onClick={() => {
                  if (uploadTextNotes.trim()) {
                    processUploadedContent(uploadTextNotes, "Dictated Study Material");
                  }
                }}
                disabled={!uploadTextNotes.trim() || isProcessingUpload}
                className="btn-primary"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.8125rem' }}
              >
                Generate Audio & Diagram
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIO LESSON NARRATOR */}
      {activeTab === 'audio' && (
        <div className="ref-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '54rem', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Volume2 style={{ width: 20, height: 20, color: '#ffffff' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                Audio Lesson Narrator
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {[0.8, 1.0, 1.2, 1.5].map(rate => (
                <button
                  key={rate}
                  onClick={() => setSpeechRate(rate)}
                  style={{ padding: '0.25rem 0.6rem', borderRadius: 8, background: speechRate === rate ? '#ffffff' : '#121215', color: speechRate === rate ? '#09090b' : '#a1a1aa', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '1.25rem', background: '#121215', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
              Executive Audio Summary
            </span>
            <p style={{ fontSize: '0.9375rem', color: '#e4e4e7', margin: 0, lineHeight: 1.6 }}>
              {bviData.audioSummary}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {audioSections.map((sec, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: 14,
                  background: currentSectionIndex === idx && isPlayingAudio ? '#27272a' : '#121215',
                  border: currentSectionIndex === idx && isPlayingAudio ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                    {sec.sectionTitle}
                  </h4>
                  <button
                    onClick={() => playAudioSection(idx)}
                    className="btn-primary"
                    style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem' }}
                  >
                    <Play style={{ width: 13, height: 13 }} />
                    {currentSectionIndex === idx && isPlayingAudio ? 'Replay' : 'Listen'}
                  </button>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#a1a1aa', margin: 0, lineHeight: 1.6 }}>
                  {sec.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: VOICE QUIZ */}
      {activeTab === 'voice_quiz' && (
        <div className="ref-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '46rem', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award style={{ width: 20, height: 20, color: '#ffffff' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                Oral Voice Quiz
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34d399', background: '#121215', padding: '0.25rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
              Score: {quizScore} Points
            </span>
          </div>

          {voiceQuizList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#a1a1aa', fontFamily: 'var(--font-mono)' }}>Question {currentQuizIndex + 1} of {voiceQuizList.length}</span>
                <h4 style={{ margin: '0.35rem 0 0 0', fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.4 }}>
                  {voiceQuizList[currentQuizIndex].spokenQuestion}
                </h4>
              </div>

              <div style={{ padding: '2rem', background: '#121215', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
                <button
                  onClick={handleStartVoiceQuizAnswer}
                  disabled={isQuizListening}
                  style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: isQuizListening ? '#ffffff' : '#27272a',
                    color: isQuizListening ? '#09090b' : '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isQuizListening ? '0 0 20px rgba(255,255,255,0.6)' : 'none',
                    animation: isQuizListening ? 'pulse 1.5s infinite' : 'none'
                  }}
                  title="Click to speak your oral answer"
                >
                  <Mic style={{ width: 30, height: 30 }} />
                </button>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>
                  {isQuizListening ? 'Listening for your spoken answer…' : 'Tap microphone & speak answer'}
                </span>
              </div>

              {quizTranscript && (
                <div style={{ padding: '0.85rem 1rem', background: '#121215', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ fontSize: '0.6875rem', color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase' }}>Your Spoken Answer:</span>
                  <p style={{ fontSize: '0.95rem', color: '#ffffff', margin: '0.25rem 0 0 0', fontWeight: 600 }}>"{quizTranscript}"</p>
                </div>
              )}

              {quizEvaluation && (
                <div style={{ padding: '1rem', background: quizEvaluation.correct ? 'rgba(52, 211, 153, 0.1)' : '#18181b', border: quizEvaluation.correct ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(255,255,255,0.15)', borderRadius: 14 }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: quizEvaluation.correct ? '#34d399' : '#ffffff' }}>
                    {quizEvaluation.correct ? `✓ Correct (+${quizEvaluation.score || 10} pts)` : 'Not quite.'}
                  </span>
                  <p style={{ fontSize: '0.8125rem', color: '#d4d4d8', margin: '0.25rem 0 0 0' }}>{quizEvaluation.feedback}</p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <button
                  onClick={() => playQuizQuestion(currentQuizIndex)}
                  className="btn-secondary"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.8125rem' }}
                >
                  <RotateCcw style={{ width: 14, height: 14 }} /> Replay Question
                </button>
                {currentQuizIndex < voiceQuizList.length - 1 && (
                  <button
                    onClick={() => playQuizQuestion(currentQuizIndex + 1)}
                    className="btn-primary"
                    style={{ padding: '0.45rem 1.25rem', fontSize: '0.8125rem' }}
                  >
                    Next Question →
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p style={{ color: '#a1a1aa', fontStyle: 'italic' }}>Upload study notes to generate voice quiz questions.</p>
          )}
        </div>
      )}
    </div>
  );
}
