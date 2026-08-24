/**
 * liveLecture.js — InclusiveAI Live Lecture Broadcasting Service
 * 
 * Uses:
 *  - Web Speech API (SpeechRecognition) — teacher mic → real-time transcript
 *  - BroadcastChannel API — broadcast ISL gloss tokens to other tabs / same-page subscribers
 *  - ISL_VOCABULARY mapping for English → ISL Gloss conversion
 * 
 * No API keys required. Works offline within browser session.
 */

// ── ISL Gloss Vocabulary Lookup (English word → ISL token) ──────────────────
const ISL_GLOSS_MAP = {
  // Anatomy & Biology
  'heart': 'HEART', 'blood': 'BLOOD', 'pump': 'PUMP', 'vessel': 'VESSEL',
  'vein': 'VEIN', 'artery': 'ARTERY', 'oxygen': 'OXYGEN', 'lung': 'LUNG',
  'brain': 'BRAIN', 'cell': 'CELL', 'muscle': 'MUSCLE', 'bone': 'BONE',
  'ventricle': 'VENTRICLE', 'atrium': 'ATRIUM', 'valve': 'VALVE',
  'circulation': 'CIRCULATION', 'plasma': 'PLASMA', 'platelet': 'PLATELET',
  'photosynthesis': 'PHOTOSYNTHESIS', 'chlorophyll': 'CHLOROPHYLL',
  'glucose': 'GLUCOSE', 'carbon': 'CARBON', 'dioxide': 'DIOXIDE',
  'nitrogen': 'NITROGEN', 'protein': 'PROTEIN', 'enzyme': 'ENZYME',

  // Physics & Maths
  'force': 'FORCE', 'energy': 'ENERGY', 'motion': 'MOTION', 'gravity': 'GRAVITY',
  'light': 'LIGHT', 'sound': 'SOUND', 'wave': 'WAVE', 'heat': 'HEAT',
  'electric': 'ELECTRIC', 'magnet': 'MAGNET', 'atom': 'ATOM', 'electron': 'ELECTRON',
  'proton': 'PROTON', 'neutron': 'NEUTRON', 'nucleus': 'NUCLEUS',
  'addition': 'ADD', 'subtract': 'SUBTRACT', 'multiply': 'MULTIPLY', 'divide': 'DIVIDE',
  'equal': 'EQUAL', 'triangle': 'TRIANGLE', 'circle': 'CIRCLE', 'square': 'SQUARE',

  // Common classroom words
  'the': 'THE', 'is': 'IS', 'are': 'ARE', 'this': 'THIS', 'that': 'THAT',
  'what': 'WHAT', 'how': 'HOW', 'why': 'WHY', 'when': 'WHEN', 'where': 'WHERE',
  'yes': 'YES', 'no': 'NO', 'please': 'PLEASE', 'thank': 'THANK', 'you': 'YOU',
  'i': 'I', 'we': 'WE', 'they': 'THEY', 'it': 'IT', 'our': 'OUR',
  'today': 'TODAY', 'now': 'NOW', 'again': 'AGAIN', 'next': 'NEXT', 'stop': 'STOP',
  'start': 'START', 'look': 'LOOK', 'see': 'SEE', 'know': 'KNOW', 'learn': 'LEARN',
  'understand': 'UNDERSTAND', 'question': 'QUESTION', 'answer': 'ANSWER',
  'example': 'EXAMPLE', 'remember': 'REMEMBER', 'important': 'IMPORTANT',
  'good': 'GOOD', 'great': 'GREAT', 'correct': 'CORRECT', 'wrong': 'WRONG',
  'done': 'DONE', 'ready': 'READY', 'help': 'HELP', 'show': 'SHOW',
  'explain': 'EXPLAIN', 'mean': 'MEAN', 'called': 'CALLED', 'name': 'NAME',
  'work': 'WORK', 'chapter': 'CHAPTER', 'page': 'PAGE', 'diagram': 'DIAGRAM',
  'left': 'LEFT', 'right': 'RIGHT', 'top': 'TOP', 'bottom': 'BOTTOM',
  'red': 'RED', 'blue': 'BLUE', 'green': 'GREEN', 'black': 'BLACK', 'white': 'WHITE',
  'big': 'BIG', 'small': 'SMALL', 'fast': 'FAST', 'slow': 'SLOW',
  'up': 'UP', 'down': 'DOWN', 'inside': 'INSIDE', 'outside': 'OUTSIDE',
};

/**
 * Convert a single English word to its ISL gloss token.
 * Returns the word uppercased if not in dictionary.
 */
export function wordToISLGloss(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return null;
  return ISL_GLOSS_MAP[clean] || null; // return null for filler words
}

/**
 * Convert a sentence into an array of ISL gloss tokens.
 * Skips common filler words without sign equivalents.
 */
export function sentenceToISLGlosses(sentence) {
  const fillers = new Set(['a', 'an', 'to', 'of', 'in', 'on', 'at', 'by', 'for',
    'with', 'and', 'but', 'or', 'so', 'if', 'as', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'very', 'also', 'just',
    'more', 'most', 'some', 'any', 'all', 'not', 'about', 'into', 'from',
    'than', 'then', 'its', 'their', 'which', 'who', 'was', 'were'
  ]);

  return sentence
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^a-z]/g, ''))
    .filter(w => w.length > 0 && !fillers.has(w))
    .map(w => ISL_GLOSS_MAP[w] || w.toUpperCase())
    .filter(Boolean);
}

// ── BroadcastChannel names ───────────────────────────────────────────────────
const LECTURE_CHANNEL = 'inclusiveai-live-lecture';
const REPLY_CHANNEL = 'inclusiveai-teacher-reply';

// ── Internal state ────────────────────────────────────────────────────────────
let _lectureChannel = null;
let _replyChannel = null;
let _recognition = null;
let _isRecording = false;
let _onTranscriptUpdate = null;

// ── Live Lecture Recording API ────────────────────────────────────────────────

/**
 * Start recording teacher's microphone.
 * @param {(glosses: string[], rawText: string) => void} onUpdate — called with each new gloss array + raw text
 * @returns {boolean} — true if started, false if not supported
 */
export function startLectureRecording(onUpdate) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('[LiveLecture] SpeechRecognition not supported in this browser.');
    return false;
  }

  if (!_lectureChannel) {
    _lectureChannel = new BroadcastChannel(LECTURE_CHANNEL);
  }

  _onTranscriptUpdate = onUpdate;
  _recognition = new SpeechRecognition();
  _recognition.continuous = true;
  _recognition.interimResults = true;
  _recognition.lang = 'en-IN';
  _recognition.maxAlternatives = 1;

  _recognition.onresult = (event) => {
    let finalText = '';
    let interimText = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalText += transcript + ' ';
      } else {
        interimText += transcript;
      }
    }

    const textToProcess = finalText || interimText;
    if (!textToProcess.trim()) return;

    const glosses = sentenceToISLGlosses(textToProcess);
    const isFinal = !!finalText;

    // Notify local listener
    if (_onTranscriptUpdate) {
      _onTranscriptUpdate(glosses, textToProcess.trim(), isFinal);
    }

    // Broadcast to other tabs / deaf module
    if (isFinal && glosses.length > 0) {
      _lectureChannel.postMessage({
        type: 'LECTURE_GLOSSES',
        glosses,
        rawText: finalText.trim(),
        timestamp: Date.now()
      });
    }
  };

  _recognition.onerror = (e) => {
    if (e.error !== 'no-speech') {
      console.warn('[LiveLecture] SpeechRecognition error:', e.error);
    }
  };

  _recognition.onend = () => {
    // Auto-restart if still supposed to be recording
    if (_isRecording) {
      try { _recognition.start(); } catch (e) {}
    }
  };

  try {
    _recognition.start();
    _isRecording = true;
    return true;
  } catch (e) {
    console.warn('[LiveLecture] Could not start recognition:', e);
    return false;
  }
}

/**
 * Stop the live lecture recording.
 */
export function stopLectureRecording() {
  _isRecording = false;
  if (_recognition) {
    try { _recognition.stop(); } catch (e) {}
    _recognition = null;
  }
}

/**
 * Returns whether recording is currently active.
 */
export function isLectureRecording() {
  return _isRecording;
}

// ── Subscriber API (for DeafModule / BlindModule) ──────────────────────────

/**
 * Subscribe to live lecture gloss stream.
 * @param {(glosses: string[], rawText: string) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function subscribeLecture(callback) {
  const channel = new BroadcastChannel(LECTURE_CHANNEL);
  channel.onmessage = (event) => {
    if (event.data?.type === 'LECTURE_GLOSSES') {
      callback(event.data.glosses, event.data.rawText);
    }
  };
  return () => channel.close();
}

// ── Teacher Reply → ISL API ──────────────────────────────────────────────────

/**
 * Send a teacher's text reply as ISL glosses to student modules.
 * @param {string} replyText
 */
export function broadcastTeacherReply(replyText) {
  if (!_replyChannel) {
    _replyChannel = new BroadcastChannel(REPLY_CHANNEL);
  }
  const glosses = sentenceToISLGlosses(replyText);
  _replyChannel.postMessage({
    type: 'TEACHER_REPLY',
    glosses,
    rawText: replyText,
    timestamp: Date.now()
  });
  return glosses;
}

/**
 * Subscribe to teacher reply ISL stream.
 * @param {(glosses: string[], rawText: string) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function subscribeTeacherReply(callback) {
  const channel = new BroadcastChannel(REPLY_CHANNEL);
  channel.onmessage = (event) => {
    if (event.data?.type === 'TEACHER_REPLY') {
      callback(event.data.glosses, event.data.rawText);
    }
  };
  return () => channel.close();
}
