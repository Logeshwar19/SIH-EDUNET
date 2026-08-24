import React, { useState, useRef, useEffect } from 'react';
import { 
  Eye, 
  Volume2, 
  Play, 
  RotateCcw, 
  Mic, 
  MicOff, 
  Vibrate, 
  CheckCircle2, 
  Sparkles, 
  Info, 
  Award,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function BlindModule({ 
  lesson, 
  isAudioMuted, 
  hapticsEnabled,
  isLiveLecture,
  liveLectureTranscript,
}) {
  const [activeTab, setActiveTab] = useState('live'); // 'live', 'haptic', 'audio', 'voice_quiz'
  
  // Audio Narrator State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [spokenSubtitle, setSpokenSubtitle] = useState("");

  // Voice Navigation State
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState("");
  const [voiceAssistantFeedback, setVoiceAssistantFeedback] = useState("Say 'Start Lesson', 'Explore Diagram', or 'Start Quiz'");

  // Haptic Diagram Engine State
  const [touchCoordinates, setTouchCoordinates] = useState({ x: 0, y: 0 });
  const [isTouching, setIsTouching] = useState(false);
  const [isOnPath, setIsOnPath] = useState(false);
  const [activeLandmark, setActiveLandmark] = useState(null);
  const [discoveredLandmarks, setDiscoveredLandmarks] = useState(new Set());

  // Voice Quiz State
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [isQuizListening, setIsQuizListening] = useState(false);
  const [quizTranscript, setQuizTranscript] = useState("");
  const [quizEvaluation, setQuizEvaluation] = useState(null);
  const [quizScore, setQuizScore] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState("");

  const canvasRef = useRef(null);
  const recognitionRef = useRef(null);
  const quizRecognitionRef = useRef(null);

  const bviData = lesson?.bviModule || {};
  const audioSections = bviData.audioSections || [];
  const diagram = bviData.hapticDiagram || { paths: [], landmarks: [] };
  const voiceQuizList = bviData.voiceQuiz || [];

  const speakText = (text, priority = false) => {
    if (isAudioMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    if (priority) {
      window.speechSynthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => {
      setSpokenSubtitle(text);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Fix 7: Fix SpeechRecognition Error Handling
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
        console.warn('SpeechRecognition error:', event.error);
        setIsVoiceListening(false);
        setVoiceAssistantFeedback(`Voice error: ${event.error}. Try again or use buttons.`);
        // Auto-restart for recoverable errors
        if (['no-speech', 'audio-capture'].includes(event.error)) {
          setTimeout(() => {
            try { recognition.start(); } catch (e) {}
          }, 1000);
        }
      };

      recognition.onend = () => {
        if (isVoiceListening) {
          // Restart if still supposed to be listening
          try { recognition.start(); } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
    }
  }, [lesson, activeTab, currentSectionIndex, isVoiceListening]);

  const toggleVoiceListening = () => {
    if (!recognitionRef.current) {
      setVoiceAssistantFeedback("Web Speech Recognition not supported in this browser. Use buttons below.");
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
        setVoiceAssistantFeedback("Listening for commands... Try 'Explore diagram' or 'Next section'");
        speakText("Voice navigation activated. Listening for commands.");
      } catch (err) {
        console.warn("Failed to start voice recognition", err);
      }
    }
  };

  const handleVoiceCommand = (cmd) => {
    if (cmd.includes("diagram") || cmd.includes("explore")) {
      setActiveTab('haptic');
      setVoiceAssistantFeedback("Switching to Haptic Diagram Learning.");
      speakText("Switching to Haptic Diagram. Touch the screen to feel outlines and hear anatomical regions.", true);
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
    } else if (cmd.includes("repeat")) {
      playAudioSection(currentSectionIndex);
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

  const triggerHaptic = (pattern) => {
    if (!hapticsEnabled || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore
    }
  };

  const handlePointerDown = (e) => {
    setIsTouching(true);
    handlePointerMove(e);
  };

  const handlePointerUp = () => {
    setIsTouching(false);
    setIsOnPath(false);
    setActiveLandmark(null);
    triggerHaptic(0);
  };

  const handlePointerMove = (e) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = 800 / rect.width;
    const scaleY = 600 / rect.height;
    
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    setTouchCoordinates({ x: Math.round(x), y: Math.round(y) });

    let hitLandmark = null;
    if (diagram.landmarks) {
      for (const lm of diagram.landmarks) {
        const dist = Math.hypot(x - lm.x, y - lm.y);
        if (dist <= lm.radius) {
          hitLandmark = lm;
          break;
        }
      }
    }

    if (hitLandmark) {
      if (activeLandmark?.id !== hitLandmark.id) {
        setActiveLandmark(hitLandmark);
        setDiscoveredLandmarks(prev => new Set(prev).add(hitLandmark.id));
        
        triggerHaptic(hitLandmark.hapticTone || [100, 50, 100]);
        speakText(hitLandmark.audioDescription, true);
      }
      setIsOnPath(true);
      return;
    } else {
      setActiveLandmark(null);
    }

    const distToCenter = Math.hypot(x - 400, y - 320);
    let onOutline = false;
    if (distToCenter >= 140 && distToCenter <= 260) {
      onOutline = true;
    }

    if (onOutline) {
      setIsOnPath(true);
      triggerHaptic([35, 15]);
    } else {
      setIsOnPath(false);
      triggerHaptic(0);
    }
  };

  // Draw monochrome diagram on HTML5 Canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

    if (diagram.paths) {
      diagram.paths.forEach(p => {
        ctx.save();
        ctx.lineWidth = p.type === 'boundary' ? 6 : 3;
        ctx.strokeStyle = '#FFFFFF';
        ctx.setLineDash(p.type === 'inner-wall' ? [8, 5] : []);
        
        const path2d = new Path2D(p.d);
        ctx.stroke(path2d);
        ctx.restore();
      });
    }

    if (diagram.landmarks) {
      diagram.landmarks.forEach(lm => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(lm.x, lm.y, lm.radius, 0, Math.PI * 2);
        
        const isDiscovered = discoveredLandmarks.has(lm.id);
        const isActive = activeLandmark?.id === lm.id;

        ctx.fillStyle = isActive 
          ? 'rgba(255, 255, 255, 0.4)' 
          : isDiscovered 
          ? 'rgba(255, 255, 255, 0.15)' 
          : 'rgba(255, 255, 255, 0.05)';
        ctx.fill();

        ctx.lineWidth = isActive ? 3 : 1.5;
        ctx.strokeStyle = isActive ? '#FFFFFF' : isDiscovered ? '#a1a1aa' : '#52525b';
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Manrope, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(lm.name, lm.x, lm.y + 4);
        ctx.restore();
      });
    }

    if (isTouching) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(touchCoordinates.x, touchCoordinates.y, isOnPath ? 22 : 12, 0, Math.PI * 2);
      ctx.fillStyle = activeLandmark 
        ? 'rgba(255, 255, 255, 0.8)' 
        : isOnPath 
        ? 'rgba(255, 255, 255, 0.6)' 
        : 'rgba(113, 113, 122, 0.4)';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }, [diagram, touchCoordinates, isTouching, isOnPath, activeLandmark, discoveredLandmarks]);

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

  // Evaluate voice quiz via backend API with strict keyword matching
  const evaluateAnswerWithBackend = async (spokenText) => {
    const q = voiceQuizList[currentQuizIndex];
    if (!q) return;

    setQuizTranscript(spokenText);

    try {
      const res = await fetch('/api/blind/quiz/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: 'student-ananya',
          lessonId: lesson.id,
          questionId: q.id,
          spokenAnswer: spokenText
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        setQuizEvaluation(data);
        if (data.correct) {
          setQuizScore(prev => prev + (data.score || 10));
          speakText(`Correct! You scored ${data.score || 10} out of 10. ${data.feedback}`, true);
          confetti({ particleCount: 45, spread: 60 });
        } else {
          speakText(`Not quite. You scored 0 out of 10. ${data.feedback}`, true);
        }
      } else {
        // Fallback local evaluation (Fix 1: actual keyword matching only)
        const answer = (spokenText || '').toLowerCase();
        const keywords = q.expectedKeywords || ['pump', 'blood', 'oxygen', 'heart', 'ventricle'];
        const matched = keywords.filter(k => answer.includes(k.toLowerCase()));
        const hit = matched.length > 0;
        const score = hit ? 10 : 0;
        const fallbackEval = {
          correct: hit,
          score,
          feedback: hit 
            ? "Correct! Accurate scientific mechanism explained clearly." 
            : `Not quite. Expected concepts: ${keywords.join(', ')}.`
        };
        setQuizEvaluation(fallbackEval);
        if (hit) {
          setQuizScore(prev => prev + 10);
          speakText(`Correct! You scored 10 out of 10.`, true);
          confetti({ particleCount: 45, spread: 60 });
        } else {
          speakText(`Not quite. You scored 0 out of 10. ${fallbackEval.feedback}`, true);
        }
      }
    } catch (e) {
      console.warn("Quiz eval fallback", e);
    }
  };

  const handleStartVoiceQuizAnswer = () => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        setIsQuizListening(true);
        setQuizTranscript("Listening to your explanation...");

        recognition.onresult = (event) => {
          setIsQuizListening(false);
          const transcript = event.results[0][0].transcript;
          evaluateAnswerWithBackend(transcript);
        };

        recognition.onerror = (err) => {
          console.warn("Quiz STT error", err);
          setIsQuizListening(false);
          setQuizTranscript("Microphone error. You can also use quick answers or text input below.");
        };

        recognition.onend = () => {
          setIsQuizListening(false);
        };

        recognition.start();
        quizRecognitionRef.current = recognition;
        return;
      } catch (err) {
        console.warn("STT unavailable", err);
      }
    }

    // Fallback if browser blocks STT
    setIsQuizListening(true);
    setQuizTranscript("Recording simulated speech answer...");
    setTimeout(() => {
      setIsQuizListening(false);
      const sampleAnswer = currentQuizIndex === 0
        ? "The left ventricle pumps oxygenated blood through the aorta to the rest of the body."
        : "Heart valves prevent backflow and maintain unidirectional blood flow.";
      evaluateAnswerWithBackend(sampleAnswer);
    }, 2000);
  };

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="ref-card" style={{ padding: '1.75rem 2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.7rem', background: '#27272a', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '999px', fontSize: '0.6875rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                <Eye className="w-3.5 h-3.5" />
                Blind & Low Vision Module
              </div>
              {isLiveLecture && <span className="live-badge"><span className="live-dot" />LIVE AUDIO STREAM</span>}
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.2, margin: 0 }}>
              Voice & Haptic Diagram Learning
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#d4d4d8', maxWidth: '38rem', lineHeight: 1.6, marginTop: '0.35rem', margin: 0 }}>
              Explore interactive diagram shapes with tactile vibration feedback, listen to live lecture audio, and complete voice quizzes.
            </p>
          </div>

          {/* Module Sub-tabs — pill switcher */}
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', padding: '0.25rem', background: '#121215', borderRadius: '9999px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {[
              { id: 'live', label: '● Live Audio' },
              { id: 'haptic', label: 'Tactile Diagram' },
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
              <span>{isVoiceListening ? 'Listening...' : 'Enable Voice Commands'}</span>
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

      {/* TAB 0: LIVE LECTURE AUDIO FEED */}
      {activeTab === 'live' && (
        <div style={{ background: 'rgba(8,6,18,0.80)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '1.5rem' }} className="animate-slide-up">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}>
              <Volume2 style={{ width: 18, height: 18, color: 'white' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>Live Lecture Audio Feed</h2>
              <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>Listen to your teacher's live lecture with screen reader support</p>
            </div>
            {isLiveLecture && <span className="live-badge" style={{ marginLeft: 'auto', borderColor: 'rgba(16,185,129,0.4)', color: '#10b981', background: 'rgba(16,185,129,0.12)' }}><span className="live-dot" style={{ background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.8)' }} />RECEIVING</span>}
          </div>

          <div style={{ minHeight: 160, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {!isLiveLecture && !liveLectureTranscript && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Volume2 style={{ width: 22, height: 22, color: 'rgba(16,185,129,0.6)' }} />
                </div>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }} role="status" aria-live="polite">Waiting for teacher to start live lecture…</p>
              </div>
            )}
            {liveLectureTranscript && (
              <div>
                <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>Live Transcript</p>
                <p style={{ fontSize: '1rem', color: 'white', lineHeight: 1.8, letterSpacing: '-0.01em' }} aria-live="polite">{liveLectureTranscript}</p>
                <button
                  onClick={() => { if (!isAudioMuted && liveLectureTranscript) { try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(liveLectureTranscript); window.speechSynthesis.speak(u); } catch(e){} } }}
                  aria-label="Read lecture transcript aloud"
                  style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, fontSize: '0.75rem', color: '#34d399', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Play style={{ width: 13, height: 13 }} /> Read Aloud (TTS)
                </button>
              </div>
            )}
          </div>

          <div style={{ padding: '0.875rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, display: 'flex', gap: '0.625rem' }}>
            <Info style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              This panel displays and reads aloud your teacher's live lecture. Use the "Read Aloud" button or enable a screen reader.
              Voice commands like <strong style={{ color: 'rgba(255,255,255,0.6)' }}>"Explore diagram"</strong>, <strong style={{ color: 'rgba(255,255,255,0.6)' }}>"Start quiz"</strong> also work.
            </p>
          </div>
        </div>
      )}

      {/* TAB 1: UNIQUE INNOVATION — HAPTIC DIAGRAM LEARNING */}
      {activeTab === 'haptic' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vibrate className="w-5 h-5 text-white" />
                  <h3 className="text-base font-bold text-white">{diagram.title || "Interactive Haptic Diagram"}</h3>
                </div>
                <span className="text-xs font-mono text-white bg-zinc-900 px-2.5 py-1 rounded border border-zinc-700">
                  {discoveredLandmarks.size} of {diagram.landmarks?.length || 0} Landmarks Explored
                </span>
              </div>

              {/* Touchscreen Diagram Surface with Keyboard Arrow Key Support */}
              <div 
                className="relative aspect-[4/3] bg-zinc-900 rounded-xl overflow-hidden border-2 border-zinc-200 select-none touch-none focus-visible:ring-2 focus-visible:ring-zinc-900 shadow-sm"
                tabIndex={0}
                role="application"
                aria-label={`Interactive Tactile Diagram for ${diagram.title || "Human Anatomy"}. Use Arrow keys to move coordinate cursor and explore regions with audio and vibration feedback.`}
                onKeyDown={(e) => {
                  let dx = 0;
                  let dy = 0;
                  if (e.key === 'ArrowUp') dy = -15;
                  if (e.key === 'ArrowDown') dy = 15;
                  if (e.key === 'ArrowLeft') dx = -15;
                  if (e.key === 'ArrowRight') dx = 15;
                  
                  if (dx !== 0 || dy !== 0 || e.key === 'Enter' || e.key === ' ') {
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
                  className="w-full h-full cursor-crosshair"
                  aria-hidden="true"
                />

                <div className={`absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md transition-all ${
                  isOnPath 
                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm' 
                    : 'bg-white/80 border-zinc-200 text-zinc-600'
                }`} role="status" aria-live="polite">
                  <div className={`w-2.5 h-2.5 rounded-full ${isOnPath ? 'bg-white' : 'bg-zinc-400'}`}></div>
                  <span className="text-xs font-mono font-semibold">
                    {activeLandmark 
                      ? `POI: ${activeLandmark.name}` 
                      : isOnPath 
                      ? 'ON BOUNDARY' 
                      : 'OFF BOUNDARY'}
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg border border-zinc-200 text-[11px] font-mono text-zinc-700 shadow-sm">
                  Position: ({touchCoordinates.x}, {touchCoordinates.y})
                </div>
              </div>

              {activeLandmark && (
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-700 space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-white" aria-hidden="true" />
                      Explored: {activeLandmark.name}
                    </span>
                    <span className="text-xs font-mono font-bold text-black bg-white px-2 py-0.5 rounded">
                      Audio Playing
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {activeLandmark.audioDescription}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400 pt-2">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-white" />
                  Touch and drag across the diagram.
                </span>
                <button
                  onClick={() => speakText("You are on the Haptic Diagram. Drag your finger across the surface. When you touch the heart outline, your device pulses. When you reach a chamber like the Left Ventricle, you will feel a double buzz and hear its detailed explanation.", true)}
                  className="text-white hover:underline font-semibold"
                >
                  Listen to Diagram Guide
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Diagram Points</h3>
                <span className="text-xs text-zinc-400 font-mono">Audio Points</span>
              </div>

              <div className="space-y-2.5">
                {diagram.landmarks?.map((lm, idx) => {
                  const isFound = discoveredLandmarks.has(lm.id);
                  const isCurrent = activeLandmark?.id === lm.id;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setActiveLandmark(lm);
                        setDiscoveredLandmarks(prev => new Set(prev).add(lm.id));
                        triggerHaptic(lm.hapticTone || [100, 50, 100]);
                        speakText(lm.audioDescription, true);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-zinc-900 border-white shadow-md'
                          : isFound
                          ? 'bg-black border-zinc-700'
                          : 'bg-black border-zinc-900 hover:border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-white">{lm.name}</span>
                        {isFound ? (
                          <span className="text-[10px] font-mono text-white flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Explored
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-600 font-mono">Not Explored</span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2">
                        {lm.audioDescription}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="p-3.5 rounded-xl bg-black border border-zinc-800 text-[11px] text-zinc-400 space-y-1.5">
                <strong className="text-white block">Technical Details:</strong>
                <p>
                  Uses screen coordinates and vibration feedback to guide touch exploration on standard mobile devices.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Audio Lesson Reader */}
      {activeTab === 'audio' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-5 h-5 text-white" />
                <h3 className="text-base font-bold text-white">Audio Narrator</h3>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-400">Speed:</span>
                {[0.8, 1.0, 1.2, 1.5].map(rate => (
                  <button
                    key={rate}
                    onClick={() => setSpeechRate(rate)}
                    className={`px-2.5 py-1 rounded font-mono font-bold transition-all ${
                      speechRate === rate 
                        ? 'bg-white text-black' 
                        : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black border border-zinc-800 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                Summary:
              </span>
              <p className="text-sm text-zinc-200 leading-relaxed">
                {bviData.audioSummary}
              </p>
            </div>

            <div className="space-y-3">
              {audioSections.map((sec, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${
                    currentSectionIndex === idx && isPlayingAudio
                      ? 'bg-zinc-900 border-white shadow-lg'
                      : 'bg-black border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-white">{sec.sectionTitle}</h4>
                    <button
                      onClick={() => playAudioSection(idx)}
                      className="px-3 py-1.5 rounded-lg bg-white text-black font-bold text-xs flex items-center gap-1.5 hover:bg-zinc-200 transition-all"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{currentSectionIndex === idx && isPlayingAudio ? 'Replay' : 'Listen'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {sec.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Voice Quiz */}
      {activeTab === 'voice_quiz' && (
        <div className="max-w-3xl mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-white" />
              <h3 className="text-base font-bold text-white">Voice Quiz</h3>
            </div>
            <span className="text-xs font-mono text-white bg-zinc-900 px-2.5 py-1 rounded border border-zinc-700">
              Score: {quizScore} points
            </span>
          </div>

          {voiceQuizList.length > 0 ? (
            <div className="space-y-6">
              <div>
                <span className="text-xs text-zinc-400 font-mono">Question {currentQuizIndex + 1} of {voiceQuizList.length}</span>
                <h4 className="text-lg font-bold text-white mt-1">
                  {voiceQuizList[currentQuizIndex].spokenQuestion}
                </h4>
              </div>

              <div className="p-6 rounded-2xl bg-black border border-zinc-800 text-center space-y-4">
                <button
                  onClick={handleStartVoiceQuizAnswer}
                  disabled={isQuizListening}
                  className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all ${
                    isQuizListening 
                      ? 'bg-white text-black animate-pulse shadow-xl' 
                      : 'bg-zinc-900 text-white hover:bg-white hover:text-black border border-zinc-700'
                  }`}
                  title="Click to speak your answer"
                >
                  <Mic className="w-9 h-9" />
                </button>

                <div>
                  <h5 className="text-sm font-bold text-white">
                    {isQuizListening ? "Listening to your answer..." : "Click to Speak Your Answer"}
                  </h5>
                  <p className="text-xs text-zinc-400 mt-1">
                    Speak your response clearly.
                  </p>
                </div>

                {/* Quick Test Chips for Demo Testing */}
                <div className="pt-2 flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => evaluateAnswerWithBackend(
                      currentQuizIndex === 0
                        ? "The left ventricle pumps oxygenated blood through the aorta to the entire body."
                        : "Valves prevent backflow and maintain unidirectional blood flow."
                    )}
                    className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-300"
                  >
                    Test Sample Answer
                  </button>
                  <button
                    onClick={() => evaluateAnswerWithBackend("I don't know anything about this topic at all")}
                    className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-400"
                  >
                    Test Incorrect Answer
                  </button>
                </div>

                {/* Spoken / Tested Transcript */}
                {quizTranscript && (
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-left text-xs font-mono text-zinc-200">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Your Answer:</span>
                    "{quizTranscript}"
                  </div>
                )}
              </div>

              {/* Evaluation Feedback */}
              {quizEvaluation && (
                <div className={`p-4 rounded-xl border space-y-2 animate-fadeIn ${
                  quizEvaluation.correct 
                    ? 'bg-zinc-900 border-white' 
                    : 'bg-zinc-950 border-zinc-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      {quizEvaluation.correct ? <CheckCircle2 className="w-4 h-4 text-white" /> : <AlertCircle className="w-4 h-4 text-zinc-400" />}
                      Score: {quizEvaluation.score} / 10
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 bg-black px-2 py-0.5 rounded border border-zinc-800">
                      {quizEvaluation.correct ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300">
                    {quizEvaluation.feedback}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <button
                  onClick={() => playQuizQuestion(currentQuizIndex)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 font-semibold text-xs hover:bg-zinc-800 transition-all flex items-center gap-1.5 border border-zinc-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Repeat Question
                </button>

                {quizEvaluation && currentQuizIndex < voiceQuizList.length - 1 && (
                  <button
                    onClick={() => playQuizQuestion(currentQuizIndex + 1)}
                    className="px-6 py-2.5 rounded-xl bg-white text-black font-extrabold text-xs hover:bg-zinc-200 transition-all"
                  >
                    Next Question
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-400">No voice quiz questions available.</p>
          )}
        </div>
      )}
    </div>
  );
}
