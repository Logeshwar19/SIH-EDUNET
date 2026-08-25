import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Radio,
  HelpCircle,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { subscribeRoomSession, DEFAULT_ROOM_CODE, subscribeToLiveNotifications } from '../services/liveLecture.js';
import { DEFAULT_HEART_DIAGRAM, DEFAULT_LEAF_DIAGRAM, processDiagramImageForTactile } from '../services/diagramAnalyzer.js';

export default function BlindModule({
  lesson,
  isAudioMuted,
  hapticsEnabled,
  isLiveLecture,
  liveLectureTranscript,
}) {
  const [activeTab, setActiveTab] = useState('haptic'); // 'haptic', 'live', 'audio', 'voice_quiz'

  // ── Live Notification State ──
  const [liveNotification, setLiveNotification] = useState(null);
  const [studentRoomCode, setStudentRoomCode] = useState(DEFAULT_ROOM_CODE);
  const [isRoomLive, setIsRoomLive] = useState(false);
  const [roomTranscript, setRoomTranscript] = useState("");
  const [isLiveAudioReading, setIsLiveAudioReading] = useState(true);

  // ── Diagram State (Defaults to Teacher's Heart/Leaf Anatomy or Uploaded Image) ──
  const [diagram, setDiagram] = useState(() => {
    return DEFAULT_HEART_DIAGRAM;
  });

  // ── Exact Tracing Interaction State (From Haptic Explorer) ──
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [completedParts, setCompletedParts] = useState(new Set());
  const [isOnTarget, setIsOnTarget] = useState(false);
  const [demoStarted, setDemoStarted] = useState(false);
  const [inputEnabled, setInputEnabled] = useState(false);
  const [partCoverage, setPartCoverage] = useState(0);
  const [statusLine, setStatusLine] = useState('Press "▶ Start demo" to begin. You\'ll need sound on.');
  const [captionText, setCaptionText] = useState('Ready when you are.');

  // Toggles
  const [toneEnabled, setToneEnabled] = useState(true);
  const [vibeEnabled, setVibeEnabled] = useState(true);

  // Question Asking State
  const [askInputText, setAskInputText] = useState('');
  const [isAskingByVoice, setIsAskingByVoice] = useState(false);

  // Voice Quiz State
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [isQuizListening, setIsQuizListening] = useState(false);
  const [quizTranscript, setQuizTranscript] = useState('');

  // Audio Lesson State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  // ── Refs for Web Audio, Vibration, Speech & Geometry ──
  const svgRef = useRef(null);
  const cursorDotRef = useRef(null);
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const gainNodeRef = useRef(null);
  const vibeIntervalRef = useRef(null);
  const speechQueueRef = useRef([]);
  const isSpeakingRef = useRef(false);
  const pointerDownRef = useRef(false);
  const offPathSinceRef = useRef(null);
  const lastGuideAtRef = useRef(0);
  const samplesByPartRef = useRef({});
  const visitedByPartRef = useRef({});
  const recognitionRef = useRef(null);

  // Constants matching exact haptic explorer calibration
  const TOLERANCE = 22;
  const COMPLETE_THRESHOLD = 0.82;
  const VISIT_RADIUS = 2;
  const GUIDE_DELAY = 700;
  const GUIDE_COOLDOWN = 2400;

  // ── Sync with Teacher's Lesson / Uploads in Real-Time ──
  useEffect(() => {
    if (lesson?.bviModule?.hapticDiagram?.parts) {
      setDiagram(lesson.bviModule.hapticDiagram);
      resetDemo(lesson.bviModule.hapticDiagram);
    }
  }, [lesson]);

  // Subscribe to live room broadcast
  useEffect(() => {
    const unsub = subscribeRoomSession(studentRoomCode, (session) => {
      if (session) {
        setIsRoomLive(session.isLive);
        if (session.transcript) setRoomTranscript(session.transcript);
        if (session.diagram) {
          setDiagram(session.diagram);
          resetDemo(session.diagram);
        }
      }
    });
    return () => unsub();
  }, [studentRoomCode]);

  useEffect(() => {
    const unsubNotify = subscribeToLiveNotifications((notification) => {
      setLiveNotification(notification);
    });
    return () => unsubNotify();
  }, []);

  // ── Web Audio Synthesis (Sine Tone at 392Hz) ──
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 392;
      gain.gain.value = 0;
      osc.connect(gain).connect(ctx.destination);
      osc.start();

      audioCtxRef.current = ctx;
      oscRef.current = osc;
      gainNodeRef.current = gain;
    } catch (e) {
      console.warn('Web Audio init error:', e);
    }
  }, []);

  const setTone = useCallback((on, successPulse = false) => {
    if (!toneEnabled || !audioCtxRef.current || !gainNodeRef.current || !oscRef.current) return;
    const now = audioCtxRef.current.currentTime;
    if (successPulse) {
      gainNodeRef.current.gain.cancelScheduledValues(now);
      oscRef.current.frequency.setValueAtTime(392, now);
      oscRef.current.frequency.linearRampToValueAtTime(784, now + 0.35);
      gainNodeRef.current.gain.setValueAtTime(0.22, now);
      gainNodeRef.current.gain.linearRampToValueAtTime(0, now + 0.5);
      return;
    }
    gainNodeRef.current.gain.cancelScheduledValues(now);
    gainNodeRef.current.gain.linearRampToValueAtTime(on ? 0.16 : 0, now + 0.05);
    oscRef.current.frequency.setValueAtTime(392, now);
  }, [toneEnabled]);

  // ── Continuous Vibration Engine ──
  const startVibe = useCallback(() => {
    if (!vibeEnabled || !('vibrate' in navigator)) return;
    if (vibeIntervalRef.current) return;
    navigator.vibrate(45);
    vibeIntervalRef.current = setInterval(() => {
      navigator.vibrate(45);
    }, 90);
  }, [vibeEnabled]);

  const stopVibe = useCallback(() => {
    if (vibeIntervalRef.current) {
      clearInterval(vibeIntervalRef.current);
      vibeIntervalRef.current = null;
    }
    if ('vibrate' in navigator) navigator.vibrate(0);
  }, []);

  const successVibe = useCallback(() => {
    if (!vibeEnabled || !('vibrate' in navigator)) return;
    navigator.vibrate([90, 60, 90, 60, 220]);
  }, [vibeEnabled]);

  // ── Speech Synthesis with Priority & Queue ──
  const speak = useCallback((text, { priority = false } = {}) => {
    if (!text || isAudioMuted) return;
    setCaptionText(text);

    if (priority) {
      window.speechSynthesis.cancel();
      speechQueueRef.current = [];
      isSpeakingRef.current = false;
    }

    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.98;
    u.pitch = 1.0;
    speechQueueRef.current.push(u);
    pumpQueue();
  }, [isAudioMuted]);

  const pumpQueue = useCallback(() => {
    if (isSpeakingRef.current) return;
    const next = speechQueueRef.current.shift();
    if (!next) return;
    isSpeakingRef.current = true;
    next.onend = next.onerror = () => {
      isSpeakingRef.current = false;
      pumpQueue();
    };
    window.speechSynthesis.speak(next);
  }, []);

  const isSpeaking = useCallback(() => {
    return isSpeakingRef.current || window.speechSynthesis.speaking;
  }, []);

  // ── Geometric Path Sampling & Nearest Collision Detection ──
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

  const svgPoint = (clientX, clientY) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return pt.matrixTransform(ctm.inverse());
  };

  const direction = (from, to) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.hypot(dx, dy) < 4) return null;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    const ratio = adx / (ady || 0.001);
    let vert = dy > 0 ? "down" : "up";
    let horiz = dx > 0 ? "right" : "left";
    if (ratio > 2.2) return horiz;
    if (ratio < 0.45) return vert;
    return `${vert} and ${horiz}`;
  };

  // ── Active Part Setting ──
  const setActivePart = useCallback((idx) => {
    setCurrentIndex(idx);
    const order = diagram.partOrder || [];

    if (idx >= order.length) {
      finishDemo();
      return;
    }

    const key = order[idx];
    const part = diagram.parts?.[key];
    if (!part) return;

    setTimeout(() => {
      const pathEl = document.getElementById(part.id || `part-${key}`);
      if (pathEl) {
        samplesByPartRef.current[key] = samplePath(pathEl);
      }
    }, 50);

    visitedByPartRef.current[key] = new Set();
    offPathSinceRef.current = null;
    setInputEnabled(true);
    setPartCoverage(0);
    setStatusLine(`Tracing: ${part.name}. Slide your finger along its outline.`);
    speak(part.intro, { priority: true });
  }, [diagram, speak]);

  // ── Complete Part & Advance ──
  const completeCurrentPart = useCallback(async () => {
    const order = diagram.partOrder || [];
    if (currentIndex >= order.length) return;

    setInputEnabled(false);
    stopVibe();
    setTone(false, true);
    successVibe();

    const key = order[currentIndex];
    const part = diagram.parts?.[key];
    setCompletedParts(prev => new Set(prev).add(key));

    try {
      confetti({ particleCount: 65, spread: 60, origin: { y: 0.6 } });
    } catch (e) {}

    setStatusLine(`${part.name} complete. Explaining function…`);
    speak(`Well done — you've traced the ${part.name}.`, { priority: true });

    const explanation = part.fallbackExplain || part.description || `${part.name} is a vital biological structure.`;
    speak(explanation);

    const nextIndex = currentIndex + 1;
    const checkDrain = setInterval(() => {
      if (!isSpeaking() && speechQueueRef.current.length === 0) {
        clearInterval(checkDrain);
        if (nextIndex < order.length) {
          setActivePart(nextIndex);
        } else {
          finishDemo();
        }
      }
    }, 400);
  }, [currentIndex, diagram, isSpeaking, setActivePart, setTone, speak, stopVibe, successVibe]);

  // ── Finish Full Diagram Demo ──
  const finishDemo = useCallback(() => {
    const order = diagram.partOrder || [];
    setCurrentIndex(order.length);
    setInputEnabled(false);
    if (cursorDotRef.current) cursorDotRef.current.style.opacity = '0';
    setStatusLine("🎉 All chambers/parts complete! Full summary below.");
    const summary = diagram.finalSummary || diagram.summary || "You have successfully traced and understood all parts of the diagram. Excellent work!";
    speak(summary, { priority: true });
  }, [diagram, speak]);

  // ── Handle Pointer Movement ──
  const handleMove = useCallback((clientX, clientY) => {
    const order = diagram.partOrder || [];
    if (!inputEnabled || currentIndex < 0 || currentIndex >= order.length) return;

    const key = order[currentIndex];
    const samples = samplesByPartRef.current[key];
    if (!samples || samples.length === 0) {
      const pathEl = document.getElementById(diagram.parts?.[key]?.id || `part-${key}`);
      if (pathEl) samplesByPartRef.current[key] = samplePath(pathEl);
      return;
    }

    const pt = svgPoint(clientX, clientY);

    if (cursorDotRef.current) {
      cursorDotRef.current.setAttribute('cx', String(pt.x));
      cursorDotRef.current.setAttribute('cy', String(pt.y));
      cursorDotRef.current.style.opacity = '1';
    }

    const { min, idx } = nearest(pt, samples);

    if (min <= TOLERANCE) {
      setIsOnTarget(true);
      offPathSinceRef.current = null;
      startVibe();
      setTone(true);

      if (!visitedByPartRef.current[key]) visitedByPartRef.current[key] = new Set();
      for (let k = -VISIT_RADIUS; k <= VISIT_RADIUS; k++) {
        const j = idx + k;
        if (j >= 0 && j < samples.length) visitedByPartRef.current[key].add(j);
      }

      const coverage = visitedByPartRef.current[key].size / samples.length;
      setPartCoverage(Math.min(100, Math.round(coverage * 100)));

      if (coverage >= COMPLETE_THRESHOLD) {
        completeCurrentPart();
      }
    } else {
      setIsOnTarget(false);
      stopVibe();
      setTone(false);

      const now = performance.now();
      if (offPathSinceRef.current === null) offPathSinceRef.current = now;
      if (!isSpeaking() && now - offPathSinceRef.current > GUIDE_DELAY && now - lastGuideAtRef.current > GUIDE_COOLDOWN) {
        const dir = direction(pt, samples[idx]);
        if (dir) {
          lastGuideAtRef.current = now;
          speak(`Move ${dir} to find the edge.`);
        }
      }
    }
  }, [completeCurrentPart, currentIndex, diagram, inputEnabled, isSpeaking, setTone, speak, startVibe, stopVibe]);

  // Pointer event listeners
  const handlePointerDown = (e) => {
    if (!demoStarted) return;
    e.preventDefault();
    pointerDownRef.current = true;
    if (svgRef.current && typeof svgRef.current.setPointerCapture === 'function') {
      try { svgRef.current.setPointerCapture(e.pointerId); } catch (err) {}
    }
    handleMove(e.clientX, e.clientY);
  };

  const handlePointerMove = (e) => {
    if (!demoStarted || !pointerDownRef.current) return;
    e.preventDefault();
    handleMove(e.clientX, e.clientY);
  };

  const releasePointer = () => {
    pointerDownRef.current = false;
    stopVibe();
    setTone(false);
    if (cursorDotRef.current) cursorDotRef.current.style.opacity = '0';
    offPathSinceRef.current = null;
  };

  // ── Start Demo Button ──
  const startDemo = () => {
    initAudio();
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    setDemoStarted(true);
    const welcome = `Welcome. This is ${diagram.title}. As you slide your finger along each part's outline, you'll hear a steady tone and feel continuous vibration feedback. Move off the line and the feedback stops. I'll tell you which direction to move if you drift away. Trace each outline all the way around to complete it, and I'll explain what that part does before moving to the next one.`;
    speak(welcome, { priority: true });
    setActivePart(0);
  };

  // ── Repeat Instructions Button ──
  const repeatInstructions = () => {
    const order = diagram.partOrder || [];
    if (currentIndex < 0) return;
    if (currentIndex >= order.length) {
      speak(diagram.finalSummary || diagram.summary, { priority: true });
    } else {
      const key = order[currentIndex];
      speak(diagram.parts?.[key]?.intro || "Continue tracing the active chamber outline.", { priority: true });
    }
  };

  // ── Reset Demo Button ──
  const resetDemo = (newDiag = diagram) => {
    window.speechSynthesis.cancel();
    speechQueueRef.current = [];
    isSpeakingRef.current = false;
    stopVibe();
    setTone(false);
    setInputEnabled(false);
    setDemoStarted(false);
    setCurrentIndex(-1);
    setCompletedParts(new Set());
    setPartCoverage(0);
    visitedByPartRef.current = {};
    setStatusLine('Reset. Press "▶ Start demo" to begin again.');
    setCaptionText('Ready when you are.');
  };

  // ── Voice Question Asking (Web Speech API) ──
  const startVoiceQuestion = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      speak("Speech recognition is not supported in this browser. You can type your question in the text box below.", { priority: true });
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onstart = () => setIsAskingByVoice(true);
    rec.onend = () => setIsAskingByVoice(false);
    rec.onerror = () => setIsAskingByVoice(false);
    rec.onresult = (e) => {
      const query = e.results[0][0].transcript;
      handleAskQuestion(query);
    };
    rec.start();
  };

  const handleAskQuestion = (question) => {
    if (!question.trim()) return;
    setStatusLine(`You asked: "${question}"`);
    speak("Let me explain that.", { priority: true });

    const order = diagram.partOrder || [];
    const key = currentIndex >= 0 && currentIndex < order.length ? order[currentIndex] : null;
    const currentPart = key ? diagram.parts?.[key] : null;

    let answer = `You are exploring ${diagram.title}. `;
    if (currentPart) {
      answer += `Regarding the ${currentPart.name}: ${currentPart.fallbackExplain || currentPart.description}`;
    } else {
      answer += diagram.summary;
    }
    speak(answer, { priority: true });
    setAskInputText('');
  };

  // ── Voice Quiz Question Evaluator ──
  const QUIZ_QUESTIONS = [
    {
      q: "Which chamber of the heart receives deoxygenated blood returning from the whole body?",
      options: ["Right Atrium", "Left Atrium", "Left Ventricle", "Aorta"],
      correct: "Right Atrium",
      explain: "The Right Atrium collects deoxygenated blood returning from the upper and lower body via the vena cava."
    },
    {
      q: "Which chamber has the thickest muscular myocardium to pump blood through the aorta?",
      options: ["Left Ventricle", "Right Ventricle", "Right Atrium", "Pulmonary Vein"],
      correct: "Left Ventricle",
      explain: "The Left Ventricle is the thickest, highest-pressure pump that sends oxygenated blood across the systemic circuit."
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#f4f4f5', fontFamily: 'Manrope, sans-serif' }}>
      
      {/* Top Banner Navigation */}
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '1.25rem 1rem 0.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 800, padding: '0.2rem 0.5rem', background: '#10b981', color: '#09090b', borderRadius: '6px', letterSpacing: '0.05em' }}>
                HAPTIC AUDIO ENGINE
              </span>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                {diagram.title}
              </h1>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#a1a1aa', margin: '0.25rem 0 0 0' }}>
              A haptic and spoken-audio diagram explorer. Trace each chamber's outline with a finger or mouse.
            </p>
          </div>

          {/* Module Switcher Tabs */}
          <nav style={{ display: 'flex', gap: '0.35rem', background: '#18181b', padding: '0.3rem', borderRadius: '9999px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {[
              { id: 'haptic', label: 'Tactile Diagram' },
              { id: 'live', label: '● Live Audio' },
              { id: 'audio', label: 'Audio Lesson' },
              { id: 'voice_quiz', label: 'Voice Quiz' },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? '#09090b' : '#a1a1aa',
                    background: isActive ? '#ffffff' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Studio View */}
      <div style={{ maxWidth: '80rem', margin: '1rem auto', padding: '0 1rem' }}>

<<<<<<< Updated upstream
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
          
          {/* Room Connection Bar — Interactive Room Code Entry & Paste */}
          <div className="ref-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '12px', background: (isRoomLive || isLiveLecture) ? 'rgba(239, 68, 68, 0.15)' : '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', border: (isRoomLive || isLiveLecture) ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <Volume2 style={{ width: 20, height: 20, color: (isRoomLive || isLiveLecture) ? '#ef4444' : '#ffffff' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                    Live Classroom Audio Stream • Voice Narration
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: (isRoomLive || isLiveLecture) ? '#34d399' : '#a1a1aa' }}>
                    {(isRoomLive || isLiveLecture) ? `🟢 Connected to ${studentRoomCode} • Live Audio Speech Streaming` : `Awaiting teacher broadcast in ${studentRoomCode}`}
                  </p>
                </div>
              </div>

              <span style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.4rem 0.95rem',
                borderRadius: '9999px',
                background: (isRoomLive || isLiveLecture) ? 'rgba(52, 211, 153, 0.15)' : '#27272a',
                color: (isRoomLive || isLiveLecture) ? '#34d399' : '#a1a1aa',
                border: (isRoomLive || isLiveLecture) ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)'
              }}>
                {(isRoomLive || isLiveLecture) ? '🔴 CONNECTED TO LIVE AUDIO' : '● ROOM SYNC READY'}
              </span>
            </div>

            {/* Room Code Entry & Paste Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: '#121215',
              padding: '0.6rem 0.85rem',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
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
                      if (text) {
                        setStudentRoomCode(text.toUpperCase().trim());
                        speakText(`Pasted room code: ${text}`);
                      }
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
                    const code = studentRoomCode || DEFAULT_ROOM_CODE;
                    setStudentRoomCode(code);
                    speakText(`Connecting to room ${code}`);
                  }}
                  style={{
                    padding: '0.45rem 1rem',
                    background: '#ffffff',
                    color: '#09090b',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  ⚡ Connect Room
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Presets:</span>
                <button
                  onClick={() => { setStudentRoomCode('ROOM-SIH-2026'); speakText("Selected ROOM-SIH-2026"); }}
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
                  onClick={() => { setStudentRoomCode('CLASS-101'); speakText("Selected CLASS-101"); }}
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
=======
        {/* TAB 1: TACTILE DIAGRAM EXPLORER (Exact Architecture from Haptic Explorer) */}
        {activeTab === 'haptic' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(320px, 420px)', gap: '1.5rem', background: '#121215', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '24px', overflow: 'hidden' }}>
>>>>>>> Stashed changes
            
            {/* STAGE: SVG Canvas Container */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
                background: 'radial-gradient(circle at 50% 40%, #18181b 0%, #09090b 70%)',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none'
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={releasePointer}
              onPointerCancel={releasePointer}
              onPointerLeave={releasePointer}
            >
              <div style={{ width: '100%', maxWidth: '520px', aspectRatio: '400/460', touchAction: 'none' }}>
                <svg
                  id="heartSvg"
                  ref={svgRef}
                  viewBox={diagram.viewBox || "0 0 400 460"}
                  xmlns="http://www.w3.org/2000/svg"
                  role="img"
                  aria-label={diagram.title}
                  style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
                >
                  {/* Decorative vessel outlines */}
                  {diagram.decorativePaths?.map((dp, idx) => (
                    <path
                      key={`deco-${idx}`}
                      d={dp.d}
                      fill="none"
                      stroke="#3f3f46"
                      strokeWidth="2.5"
                      strokeDasharray="3 4"
                    />
                  ))}

                  {/* Dynamic Interactive Part Shapes from Diagram Manifest */}
                  {(diagram.partOrder || []).map((key, idx) => {
                    const p = diagram.parts?.[key];
                    if (!p) return null;

                    const isDone = completedParts.has(key);
                    const isActive = currentIndex === idx;

                    let fill = '#18181b';
                    let stroke = '#3f3f46';
                    let strokeWidth = 3;
                    let strokeDasharray = 'none';
                    let filter = 'none';

                    if (isDone) {
                      fill = 'rgba(16, 185, 129, 0.22)';
                      stroke = '#10b981';
                      strokeWidth = 3.5;
                    } else if (isActive) {
                      fill = '#27272a';
                      stroke = isOnTarget ? '#10b981' : '#ffffff';
                      strokeDasharray = '6 5';
                      strokeWidth = 4;
                      if (isOnTarget) {
                        filter = 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))';
                      }
                    } else {
                      fill = '#121215';
                      stroke = '#27272a';
                    }

                    return (
                      <path
                        key={p.id || key}
                        id={p.id || `part-${key}`}
                        d={p.d}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        strokeDasharray={strokeDasharray}
                        filter={filter}
                        style={{ transition: 'fill 0.3s ease, stroke 0.3s ease' }}
                      />
                    );
                  })}

                  {/* Part Labels */}
                  {(diagram.partOrder || []).map((key, idx) => {
                    const p = diagram.parts?.[key];
                    if (!p) return null;

                    const isDone = completedParts.has(key);
                    const isActive = currentIndex === idx;

                    return (
                      <text
                        key={`label-${key}`}
                        x={p.labelX || p.x}
                        y={p.labelY || p.y}
                        textAnchor="middle"
                        fill={isDone ? '#10b981' : isActive ? '#ffffff' : '#71717a'}
                        fontSize="14"
                        fontWeight="700"
                        fontFamily="Manrope, sans-serif"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {p.name.split('(')[0].trim()}
                      </text>
                    );
                  })}

                  {/* Cursor Dot Follower */}
                  <circle
                    id="cursorDot"
                    ref={cursorDotRef}
                    r="8"
                    fill={isOnTarget ? '#10b981' : '#ffffff'}
                    style={{ opacity: 0, pointerEvents: 'none', transition: 'fill 0.15s ease' }}
                  />
                </svg>
              </div>
            </div>

            {/* ASIDE: Controls, Live Progress, Captions, and Question Answering */}
            <aside style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', background: '#18181b' }}>
              
              {/* Primary Actions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                <button
                  onClick={startDemo}
                  disabled={demoStarted && currentIndex >= 0}
                  style={{
                    padding: '0.65rem 1.15rem',
                    background: '#ffffff',
                    color: '#09090b',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: demoStarted ? 'not-allowed' : 'pointer',
                    opacity: demoStarted ? 0.4 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Play style={{ width: 14, height: 14, fill: '#09090b' }} /> Start demo
                </button>

                <button
                  onClick={repeatInstructions}
                  disabled={!demoStarted}
                  style={{
                    padding: '0.65rem 1rem',
                    background: 'transparent',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: !demoStarted ? 'not-allowed' : 'pointer',
                    opacity: !demoStarted ? 0.4 : 1
                  }}
                >
                  Repeat instructions
                </button>

                <button
                  onClick={() => resetDemo()}
                  disabled={!demoStarted && completedParts.size === 0}
                  style={{
                    padding: '0.65rem 1rem',
                    background: 'transparent',
                    color: '#a1a1aa',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <RotateCcw style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} /> Reset
                </button>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8125rem', color: '#d4d4d8' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={toneEnabled}
                    onChange={(e) => setToneEnabled(e.target.checked)}
                    style={{ accentColor: '#10b981' }}
                  />
                  <span>Audio tone feedback (all devices)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={vibeEnabled}
                    onChange={(e) => setVibeEnabled(e.target.checked)}
                    style={{ accentColor: '#10b981' }}
                  />
                  <span>Vibration feedback (Android Chrome/Edge)</span>
                </label>
              </div>

              {/* Status Message Line */}
              <div style={{ fontSize: '0.8125rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                {statusLine}
              </div>

              {/* Progress List */}
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#ffffff' }}>Progress</h3>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {(diagram.partOrder || []).map((key, idx) => {
                    const p = diagram.parts?.[key];
                    if (!p) return null;

                    const isDone = completedParts.has(key);
                    const isCurrent = currentIndex === idx;

                    return (
                      <li
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.8125rem',
                          fontWeight: isCurrent || isDone ? 700 : 500,
                          border: isCurrent
                            ? '1.5px solid #10b981'
                            : isDone
                            ? '1px solid rgba(16, 185, 129, 0.35)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                          background: isCurrent
                            ? 'rgba(16, 185, 129, 0.15)'
                            : isDone
                            ? 'rgba(16, 185, 129, 0.08)'
                            : 'transparent',
                          color: isCurrent ? '#ffffff' : isDone ? '#10b981' : '#a1a1aa'
                        }}
                      >
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: isDone ? '#10b981' : isCurrent ? '#ffffff' : '#27272a',
                            color: isDone ? '#09090b' : isCurrent ? '#09090b' : '#a1a1aa'
                          }}
                        >
                          {isDone ? '✓' : idx + 1}
                        </span>
                        <span>{p.name}</span>
                        {isCurrent && (
                          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#10b981' }}>
                            {partCoverage}%
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* What AI is saying (Spoken Captions) */}
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 800, margin: '0 0 0.4rem 0', color: '#ffffff' }}>What AI is saying</h3>
                <div style={{ border: '1px solid rgba(255, 255, 255, 0.15)', background: '#121215', padding: '0.75rem 0.9rem', borderRadius: '10px', minHeight: '65px', fontSize: '0.8125rem', lineHeight: 1.45, color: '#f4f4f5' }}>
                  <span style={{ fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#10b981', display: 'block', marginBottom: '0.25rem', fontWeight: 800 }}>
                    Spoken Narration
                  </span>
                  <span>{captionText}</span>
                </div>
              </div>

              {/* Ask Question Box */}
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 800, margin: '0 0 0.4rem 0', color: '#ffffff' }}>Ask AI about this part</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <button
                    onClick={startVoiceQuestion}
                    style={{
                      padding: '0.5rem 0.85rem',
                      background: isAskingByVoice ? '#ef4444' : '#27272a',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Mic style={{ width: 13, height: 13 }} /> {isAskingByVoice ? 'Listening…' : 'Ask by voice'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    placeholder="Or type a question…"
                    value={askInputText}
                    onChange={(e) => setAskInputText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAskQuestion(askInputText); }}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.75rem',
                      background: '#121215',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.8125rem'
                    }}
                  />
                  <button
                    onClick={() => handleAskQuestion(askInputText)}
                    style={{
                      padding: '0.5rem 0.85rem',
                      background: '#ffffff',
                      color: '#09090b',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Ask
                  </button>
                </div>
              </div>

            </aside>
          </div>
        )}

        {/* TAB 2: LIVE AUDIO CLASSROOM */}
        {activeTab === 'live' && (
          <div style={{ background: '#121215', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '24px', padding: '2rem', textAlign: 'center' }}>
            <Radio style={{ width: 44, height: 44, color: '#ef4444', margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>Live Lecture Audio Stream</h2>
            <p style={{ color: '#a1a1aa', fontSize: '0.875rem', maxWidth: '30rem', margin: '0.5rem auto 1.5rem' }}>
              Connected to Classroom Room: <strong style={{ color: '#ffffff' }}>{studentRoomCode}</strong>
            </p>
            <div style={{ maxWidth: '36rem', margin: '0 auto', padding: '1rem', background: '#18181b', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'left', minHeight: '120px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>● Live Narration</span>
              <p style={{ fontSize: '0.875rem', color: '#f4f4f5', margin: '0.5rem 0 0 0' }}>
                {roomTranscript || liveLectureTranscript || "Waiting for teacher speech broadcast..."}
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: AUDIO LESSON */}
        {activeTab === 'audio' && (
          <div style={{ background: '#121215', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '24px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '1rem' }}>Chapter Audio Lessons</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(diagram.partOrder || []).map((key, idx) => {
                const p = diagram.parts?.[key];
                if (!p) return null;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#18181b', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#ffffff' }}>Chapter {idx + 1}: {p.name}</h4>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#a1a1aa' }}>{p.fallbackExplain || p.description}</p>
                    </div>
                    <button
                      onClick={() => speak(`${p.name}. ${p.fallbackExplain || p.description}`, { priority: true })}
                      style={{ padding: '0.5rem 1rem', background: '#ffffff', color: '#09090b', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Volume2 style={{ width: 14, height: 14 }} /> Listen
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: VOICE QUIZ */}
        {activeTab === 'voice_quiz' && (
          <div style={{ background: '#121215', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '24px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '1rem' }}>Interactive Voice Quiz</h2>
            {QUIZ_QUESTIONS.map((q, idx) => (
              <div key={idx} style={{ padding: '1.25rem', background: '#18181b', borderRadius: '14px', marginBottom: '1rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#ffffff', fontSize: '0.95rem' }}>{idx + 1}. {q.q}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                  {q.options.map((opt, optIdx) => (
                    <button
                      key={optIdx}
                      onClick={() => {
                        if (opt === q.correct) {
                          speak(`Correct! ${q.explain}`, { priority: true });
                          setStatusLine(`Correct! ${q.explain}`);
                        } else {
                          speak(`Incorrect. The correct answer is ${q.correct}. ${q.explain}`, { priority: true });
                          setStatusLine(`Incorrect. Correct: ${q.correct}`);
                        }
                      }}
                      style={{ padding: '0.65rem 0.9rem', background: '#121215', color: '#f4f4f5', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
