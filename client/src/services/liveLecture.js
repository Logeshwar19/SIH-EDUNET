/**
 * liveLecture.js — InclusiveAI Real-Time Classroom Broadcasting Engine
 * 
 * Features:
 * - Teacher ID system (customizable & unique IDs)
 * - Teacher Profile & Follow system (localStorage persistence)
 * - Live class broadcast with room codes
 * - Real-time WebRTC camera/mic streaming
 * - Speech-to-ISL-Gloss translation pipeline
 * - Follower notification system (join/ignore banner trigger)
 */

import { convertTextToISLSequence } from './signDictionary.js';

// ── RELIABLE CLIPBOARD HELPER ────────────────────────────────────────────────
export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('[Clipboard] navigator.clipboard fallback:', err);
  }

  // Fallback for insecure contexts or iframe restrictions
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('[Clipboard] Fallback failed:', err);
    return false;
  }
}

// ── TEACHER PROFILE & ID SYSTEM ──────────────────────────────────────────────

/**
 * Generates a unique Teacher ID like TCH-A7B2 based on name.
 */
export function generateTeacherID(name = '') {
  // Check if a custom teacher ID was set in storage
  try {
    const custom = JSON.parse(localStorage.getItem('inclusiveai_teacher_id') || '""');
    if (custom && typeof custom === 'string' && custom.trim()) return custom.trim();
  } catch (e) {}

  const nameHash = (name || 'Teacher').split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 0x1234);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'TCH-';
  let seed = Math.abs(nameHash);
  for (let i = 0; i < 4; i++) {
    id += chars[seed % chars.length];
    seed = Math.floor(seed / chars.length) + (seed * 17 + 3) % 37;
  }
  return id;
}

// In-memory teacher profile store (backed by localStorage)
const TEACHER_PROFILES_KEY = 'inclusiveai_teacher_profiles';
const FOLLOWED_TEACHERS_KEY = 'inclusiveai_followed_teachers';

export function getTeacherProfiles() {
  try {
    return JSON.parse(localStorage.getItem(TEACHER_PROFILES_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveTeacherProfile(profile) {
  const profiles = getTeacherProfiles();
  profiles[profile.id] = { ...profile, updatedAt: Date.now() };
  localStorage.setItem(TEACHER_PROFILES_KEY, JSON.stringify(profiles));
  if (profile.id) {
    localStorage.setItem('inclusiveai_teacher_id', JSON.stringify(profile.id));
  }
  return profiles[profile.id];
}

export function getTeacherProfile(teacherId) {
  const profiles = getTeacherProfiles();
  return profiles[teacherId] || null;
}

export function getFollowedTeachers() {
  try {
    return JSON.parse(localStorage.getItem(FOLLOWED_TEACHERS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function followTeacher(teacherId) {
  const followed = getFollowedTeachers();
  if (!followed.includes(teacherId)) {
    followed.push(teacherId);
    localStorage.setItem(FOLLOWED_TEACHERS_KEY, JSON.stringify(followed));
  }
  return followed;
}

export function unfollowTeacher(teacherId) {
  const followed = getFollowedTeachers().filter(id => id !== teacherId);
  localStorage.setItem(FOLLOWED_TEACHERS_KEY, JSON.stringify(followed));
  return followed;
}

export function isFollowingTeacher(teacherId) {
  return getFollowedTeachers().includes(teacherId);
}

// ── ISL GLOSS TRANSLATION ─────────────────────────────────────────────────────

const ISL_GLOSS_MAP = {
  'heart': 'HEART', 'blood': 'BLOOD', 'pump': 'PUMP', 'vessel': 'VESSEL',
  'vein': 'VEIN', 'artery': 'ARTERY', 'oxygen': 'OXYGEN', 'lung': 'LUNG',
  'brain': 'BRAIN', 'cell': 'CELL', 'muscle': 'MUSCLE', 'bone': 'BONE',
  'photosynthesis': 'PHOTOSYNTHESIS', 'chlorophyll': 'CHLOROPHYLL',
  'glucose': 'GLUCOSE', 'carbon': 'CARBON', 'dioxide': 'DIOXIDE',
  'nitrogen': 'NITROGEN', 'protein': 'PROTEIN', 'enzyme': 'ENZYME',
  'force': 'FORCE', 'energy': 'ENERGY', 'motion': 'MOTION', 'gravity': 'GRAVITY',
  'light': 'LIGHT', 'sound': 'SOUND', 'heat': 'HEAT',
  'electricity': 'ELECTRICITY', 'atom': 'ATOM', 'molecule': 'MOLECULE',
  'yes': 'YES', 'no': 'NO', 'please': 'PLEASE', 'thank': 'THANK',
  'today': 'TODAY', 'now': 'NOW', 'stop': 'STOP', 'start': 'START',
  'look': 'LOOK', 'know': 'KNOW', 'learn': 'LEARN', 'water': 'WATER',
  'understand': 'UNDERSTAND', 'question': 'QUESTION', 'answer': 'ANSWER',
  'good': 'GOOD', 'done': 'DONE', 'ready': 'READY', 'help': 'HELP',
  'show': 'SHOW', 'explain': 'EXPLAIN', 'remember': 'REMEMBER',
  'important': 'IMPORTANT', 'repeat': 'REPEAT', 'write': 'WRITE', 'read': 'READ',
  'think': 'THINK', 'teacher': 'TEACHER', 'student': 'STUDENT', 'class': 'CLASS',
  'book': 'BOOK', 'diagram': 'DIAGRAM', 'experiment': 'EXPERIMENT',
  'science': 'SCIENCE', 'biology': 'BIOLOGY', 'physics': 'PHYSICS', 'chemistry': 'CHEMISTRY',
};

export function wordToISLGloss(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  return ISL_GLOSS_MAP[clean] || null;
}

const ISL_STOP_WORDS_LIVE = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'to', 'of',
  'in', 'on', 'at', 'by', 'for', 'with', 'and', 'but', 'or', 'so', 'have',
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'from', 'it', 'its', 'that', 'this', 'which', 'very',
  'also', 'about', 'into', 'than', 'then', 'as', 'if'
]);

export function sentenceToISLGlosses(sentence) {
  return sentence
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^a-z]/g, ''))
    .filter(w => w.length > 0 && !ISL_STOP_WORDS_LIVE.has(w))
    .map(w => ISL_GLOSS_MAP[w] || w.toUpperCase())
    .filter(Boolean);
}

// ── ROOM & BROADCAST MANAGEMENT ───────────────────────────────────────────────
export const DEFAULT_ROOM_CODE = 'ROOM-SIH-2026';
export const DEFAULT_ROOM_PASS = 'LEARN2026';

// Global notification broadcast channel (cross-tab follower alerts)
const NOTIF_CHANNEL_NAME = 'inclusiveai-live-notifications';

let _activeMediaStream = null;
let _frameBroadcastTimer = null;
let _hiddenCanvas = null;
let _captureVideoElement = null;
let _lastCapturedFrame = null;
let _recognition = null;
let _isLectureActive = false;
let _activeRoomChannels = new Map();
let _notifChannel = null;
let _currentTeacherProfile = null;

function getNotifChannel() {
  if (!_notifChannel) {
    try {
      _notifChannel = new BroadcastChannel(NOTIF_CHANNEL_NAME);
    } catch (e) {
      console.warn('[LiveClass] Notification channel unavailable:', e);
    }
  }
  return _notifChannel;
}

function getRoomChannel(roomCode = DEFAULT_ROOM_CODE) {
  const cleanCode = (roomCode || DEFAULT_ROOM_CODE).toUpperCase().trim();
  const channelName = `inclusiveai-room-${cleanCode}`;
  if (!_activeRoomChannels.has(channelName)) {
    try {
      _activeRoomChannels.set(channelName, new BroadcastChannel(channelName));
    } catch (e) {
      console.warn('[LiveClass] BroadcastChannel error:', e);
    }
  }
  return _activeRoomChannels.get(channelName);
}

// ── TEACHER SESSION ───────────────────────────────────────────────────────────

// Max age (ms) for localStorage data to be considered valid
const LIVE_DATA_MAX_AGE = 15000; // 15 seconds

/**
 * Clean up ALL stale live class localStorage keys.
 * Call on app startup and when stopping a class.
 */
export function clearStaleLiveData() {
  try {
    localStorage.removeItem('inclusiveai_active_live_class');
    localStorage.removeItem('inclusiveai_live_frame');
    localStorage.removeItem('inclusiveai_live_transcript');
    // Remove all room status keys
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('inclusiveai_room_status_')) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {}
}

/**
 * Starts a real Teacher Video & Audio live lecture session.
 * Broadcasts via BroadcastChannel AND localStorage for reliable cross-tab delivery.
 */
export async function startTeacherVideoSession({
  videoElement,
  roomCode = DEFAULT_ROOM_CODE,
  teacherProfile = null,
  lessonTitle = 'Live Lecture',
  onTranscriptUpdate,
  onError
}) {
  try {
    _currentTeacherProfile = teacherProfile;

    // 1. Request real webcam and microphone stream
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { max: 20 } },
        audio: true
      });
    } catch {
      try { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); }
      catch { stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); }
    }

    _activeMediaStream = stream;

    // 2. Attach stream to teacher preview
    if (videoElement && stream && stream.getVideoTracks().length > 0) {
      videoElement.srcObject = stream;
      try { await videoElement.play(); } catch (e) {}
    }

    // 3. Setup video frame broadcaster — BOTH BroadcastChannel AND localStorage
    if (!_hiddenCanvas) {
      _hiddenCanvas = document.createElement('canvas');
      _hiddenCanvas.width = 360;
      _hiddenCanvas.height = 270;
    }

    if (!_captureVideoElement) {
      _captureVideoElement = document.createElement('video');
      _captureVideoElement.autoplay = true;
      _captureVideoElement.muted = true;
      _captureVideoElement.playsInline = true;
    }
    if (stream) {
      _captureVideoElement.srcObject = stream;
      try { await _captureVideoElement.play(); } catch (e) {}
    }

    const roomChan = getRoomChannel(roomCode);
    let frameCount = 0;

    if (stream.getVideoTracks().length > 0) {
      const ctx = _hiddenCanvas.getContext('2d');
      if (_frameBroadcastTimer) clearInterval(_frameBroadcastTimer);
      _frameBroadcastTimer = setInterval(() => {
        const sourceVid = (videoElement && videoElement.readyState >= 2) ? videoElement : _captureVideoElement;
        if (!sourceVid || sourceVid.paused || sourceVid.ended) return;
        try {
          ctx.drawImage(sourceVid, 0, 0, 320, 240);
          _lastCapturedFrame = _hiddenCanvas.toDataURL('image/jpeg', 0.55);
          frameCount++;

          // BroadcastChannel (for same-origin tabs)
          if (roomChan) {
            roomChan.postMessage({ type: 'VIDEO_FRAME', roomCode, frameData: _lastCapturedFrame, timestamp: Date.now() });
          }

          // localStorage fallback (write every 3rd frame = ~3fps to avoid perf issues)
          if (frameCount % 3 === 0) {
            try { localStorage.setItem('inclusiveai_live_frame', _lastCapturedFrame); } catch (e) {}
          }
        } catch (err) {}
      }, 100);
    }

    // 4. Setup Speech Recognition + ISL Gloss pipeline
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      _recognition = new SpeechRecognition();
      _recognition.continuous = true;
      _recognition.interimResults = true;
      _recognition.lang = 'en-IN';

      _recognition.onresult = (event) => {
        let finalText = '';
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += t + ' ';
          else interimText += t;
        }

        const currentText = finalText || interimText;
        if (!currentText.trim()) return;

        const glosses = sentenceToISLGlosses(currentText);
        const islSequence = convertTextToISLSequence(currentText);
        const isFinal = !!finalText;

        if (onTranscriptUpdate) onTranscriptUpdate(glosses, currentText.trim(), isFinal, islSequence);

        // BroadcastChannel
        if (roomChan) {
          roomChan.postMessage({
            type: 'LECTURE_TRANSCRIPT', roomCode, glosses,
            islSequence, rawText: currentText.trim(), isFinal, timestamp: Date.now()
          });
        }

        // localStorage fallback for transcript
        try {
          localStorage.setItem('inclusiveai_live_transcript', JSON.stringify({
            glosses, islSequence, rawText: currentText.trim(), isFinal, timestamp: Date.now()
          }));
        } catch (e) {}
      };

      _recognition.onerror = (e) => { if (e.error !== 'no-speech') console.warn('[LiveClass] Speech error:', e.error); };
      _recognition.onend = () => { if (_isLectureActive && _recognition) { try { _recognition.start(); } catch (e) {} } };
      try { _recognition.start(); } catch (e) {}
    }

    // 5. Setup Teacher listener for PING_ROOM requests from joining students
    const handleTeacherRoomMessage = (event) => {
      const data = event.data;
      if (!data) return;
      if (data.type === 'PING_ROOM') {
        if (roomChan) {
          roomChan.postMessage({
            type: 'ROOM_STATUS', roomCode, isLive: true, lessonTitle,
            teacherName: teacherProfile?.name || 'Teacher (Host)',
            teacherId: teacherProfile?.id || 'TCH-0000',
            teacherSubject: teacherProfile?.subject || '',
            timestamp: Date.now()
          });
          if (_lastCapturedFrame) {
            roomChan.postMessage({ type: 'VIDEO_FRAME', roomCode, frameData: _lastCapturedFrame, timestamp: Date.now() });
          }
        }
      }
    };

    if (roomChan) {
      roomChan.addEventListener('message', handleTeacherRoomMessage);
    }

    _isLectureActive = true;

    const roomStatusPayload = {
      type: 'ROOM_STATUS', roomCode, isLive: true, lessonTitle,
      teacherName: teacherProfile?.name || 'Teacher (Host)',
      teacherId: teacherProfile?.id || 'TCH-0000',
      teacherSubject: teacherProfile?.subject || '',
      timestamp: Date.now()
    };

    // 6. Broadcast room active via BroadcastChannel
    if (roomChan) roomChan.postMessage(roomStatusPayload);

    // 7. Broadcast LIVE_NOTIFICATION to all follower tabs + same tab
    const notifPayload = {
      type: 'LIVE_CLASS_STARTED',
      teacherId: teacherProfile?.id || 'TCH-0000',
      teacherName: teacherProfile?.name || 'Teacher',
      teacherSubject: teacherProfile?.subject || '',
      teacherAvatar: teacherProfile?.avatar || null,
      roomCode,
      lessonTitle,
      timestamp: Date.now()
    };

    const notifChan = getNotifChannel();
    if (notifChan) notifChan.postMessage(notifPayload);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('inclusiveai-live-notification', { detail: notifPayload }));
      try {
        localStorage.setItem('inclusiveai_active_live_class', JSON.stringify(notifPayload));
        localStorage.setItem('inclusiveai_room_status_' + roomCode, JSON.stringify(roomStatusPayload));
      } catch (e) {}
    }

    // 8. Keep-alive heartbeat — update localStorage timestamp every 3s so students know teacher is still live
    const heartbeatInterval = setInterval(() => {
      if (!_isLectureActive) { clearInterval(heartbeatInterval); return; }
      try {
        const hb = { ...roomStatusPayload, timestamp: Date.now() };
        localStorage.setItem('inclusiveai_active_live_class', JSON.stringify({ ...notifPayload, timestamp: Date.now() }));
        localStorage.setItem('inclusiveai_room_status_' + roomCode, JSON.stringify(hb));
      } catch (e) {}
    }, 3000);

    return { success: true, stream, _heartbeatInterval: heartbeatInterval };
  } catch (err) {
    console.error('[LiveClass] startTeacherVideoSession failed:', err);
    if (onError) onError(err);
    return { success: false, error: err.message };
  }
}

/**
 * Stops the active teacher live lecture and releases media streams.
 * Cleans up ALL localStorage keys to prevent stale "connected" states.
 */
export function stopTeacherVideoSession(roomCode = DEFAULT_ROOM_CODE) {
  _isLectureActive = false;

  if (_frameBroadcastTimer) { clearInterval(_frameBroadcastTimer); _frameBroadcastTimer = null; }
  if (_recognition) { try { _recognition.stop(); } catch (e) {} _recognition = null; }
  if (_activeMediaStream) {
    _activeMediaStream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
    _activeMediaStream = null;
  }

  const roomChan = getRoomChannel(roomCode);
  if (roomChan) roomChan.postMessage({ type: 'ROOM_STATUS', roomCode, isLive: false, timestamp: Date.now() });

  const endPayload = {
    type: 'LIVE_CLASS_ENDED',
    teacherId: _currentTeacherProfile?.id || 'TCH-0000',
    roomCode,
    timestamp: Date.now()
  };

  const notifChan = getNotifChannel();
  if (notifChan) notifChan.postMessage(endPayload);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('inclusiveai-live-notification', { detail: endPayload }));
    // Clean up ALL live class localStorage keys
    clearStaleLiveData();
  }

  _currentTeacherProfile = null;
}

export function toggleCameraTrack(enable) {
  if (_activeMediaStream) {
    const tracks = _activeMediaStream.getVideoTracks();
    tracks.forEach(t => { t.enabled = enable; });
    return tracks.length > 0 && tracks[0].enabled;
  }
  return false;
}

export function toggleMicTrack(enable) {
  if (_activeMediaStream) {
    const tracks = _activeMediaStream.getAudioTracks();
    tracks.forEach(t => { t.enabled = enable; });
    return tracks.length > 0 && tracks[0].enabled;
  }
  return false;
}

/**
 * Student subscribes to a live room session.
 * Listens via BroadcastChannel AND polls localStorage for reliable cross-tab delivery.
 */
export function subscribeRoomSession(roomCode = DEFAULT_ROOM_CODE, {
  onVideoFrame, onTranscript, onGlosses, onISLSequence, onStatus, onTeacherReply
}) {
  const roomChan = getRoomChannel(roomCode);

  const handleMessage = (event) => {
    const data = event.data;
    if (!data) return;
    if (data.type === 'VIDEO_FRAME' && onVideoFrame) onVideoFrame(data.frameData);
    else if (data.type === 'LECTURE_TRANSCRIPT') {
      if (onTranscript) onTranscript(data.rawText, data.isFinal);
      if (onGlosses) onGlosses(data.glosses || []);
      if (onISLSequence) onISLSequence(data.islSequence || []);
    } else if (data.type === 'ROOM_STATUS' && onStatus) onStatus(data);
    else if (data.type === 'TEACHER_REPLY' && onTeacherReply) onTeacherReply(data.glosses, data.rawText);
    else if (data.type === 'PING_ROOM') {
      if (_isLectureActive && roomChan) {
        roomChan.postMessage({
          type: 'ROOM_STATUS', roomCode, isLive: true,
          teacherName: _currentTeacherProfile?.name || 'Teacher (Host)',
          teacherId: _currentTeacherProfile?.id || 'TCH-0000',
          teacherSubject: _currentTeacherProfile?.subject || '',
          timestamp: Date.now()
        });
        if (_lastCapturedFrame) {
          roomChan.postMessage({ type: 'VIDEO_FRAME', roomCode, frameData: _lastCapturedFrame, timestamp: Date.now() });
        }
      }
    }
  };

  // Listen for localStorage changes from teacher's tab
  const handleStorage = (e) => {
    if (e.key === 'inclusiveai_live_frame' && e.newValue && onVideoFrame) {
      onVideoFrame(e.newValue);
    }
    if (e.key === 'inclusiveai_live_transcript' && e.newValue) {
      try {
        const d = JSON.parse(e.newValue);
        if (onTranscript) onTranscript(d.rawText, d.isFinal);
        if (onGlosses) onGlosses(d.glosses || []);
        if (onISLSequence) onISLSequence(d.islSequence || []);
      } catch (err) {}
    }
    if (e.key === 'inclusiveai_active_live_class' || e.key === 'inclusiveai_room_status_' + roomCode) {
      if (e.newValue && onStatus) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && (parsed.roomCode === roomCode || !parsed.roomCode)) {
            onStatus({ ...parsed, isLive: true });
          }
        } catch (err) {}
      } else if (!e.newValue && onStatus) {
        onStatus({ isLive: false });
      }
    }
  };

  let pingInterval = null;
  if (roomChan) {
    roomChan.addEventListener('message', handleMessage);
    roomChan.postMessage({ type: 'PING_ROOM', roomCode, timestamp: Date.now() });
    pingInterval = setInterval(() => {
      try {
        roomChan.postMessage({ type: 'PING_ROOM', roomCode, timestamp: Date.now() });
      } catch (e) {}
    }, 2000);
  }

  // localStorage polling fallback — check every 1s if teacher's heartbeat is fresh
  let pollInterval = null;
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);

    // Check on mount whether a FRESH live class exists (not stale data)
    try {
      const activeClass = localStorage.getItem('inclusiveai_active_live_class');
      if (activeClass) {
        const parsed = JSON.parse(activeClass);
        const age = Date.now() - (parsed.timestamp || 0);
        // Only consider valid if less than 15 seconds old
        if (age < LIVE_DATA_MAX_AGE && parsed.roomCode === roomCode && onStatus) {
          onStatus({ ...parsed, isLive: true });
          const cachedFrame = localStorage.getItem('inclusiveai_live_frame');
          if (cachedFrame && onVideoFrame) onVideoFrame(cachedFrame);
        }
      }
    } catch (e) {}

    // Poll localStorage for live frame & status updates
    let lastFrameTs = 0;
    let lastTranscriptTs = 0;
    pollInterval = setInterval(() => {
      try {
        // Check if teacher is still alive via heartbeat
        const statusRaw = localStorage.getItem('inclusiveai_room_status_' + roomCode);
        if (statusRaw) {
          const status = JSON.parse(statusRaw);
          const age = Date.now() - (status.timestamp || 0);
          if (age < LIVE_DATA_MAX_AGE && status.isLive) {
            if (onStatus) onStatus({ ...status, isLive: true });

            // Read latest frame
            const frame = localStorage.getItem('inclusiveai_live_frame');
            if (frame && onVideoFrame) onVideoFrame(frame);

            // Read latest transcript
            const tRaw = localStorage.getItem('inclusiveai_live_transcript');
            if (tRaw) {
              const t = JSON.parse(tRaw);
              if (t.timestamp > lastTranscriptTs) {
                lastTranscriptTs = t.timestamp;
                if (onTranscript) onTranscript(t.rawText, t.isFinal);
                if (onGlosses) onGlosses(t.glosses || []);
                if (onISLSequence) onISLSequence(t.islSequence || []);
              }
            }
          } else if (age >= LIVE_DATA_MAX_AGE) {
            // Heartbeat expired — teacher is no longer live
            if (onStatus) onStatus({ isLive: false, roomCode });
          }
        }
      } catch (e) {}
    }, 1000);
  }

  return () => {
    if (pingInterval) clearInterval(pingInterval);
    if (pollInterval) clearInterval(pollInterval);
    if (roomChan) roomChan.removeEventListener('message', handleMessage);
    if (typeof window !== 'undefined') window.removeEventListener('storage', handleStorage);
  };
}

/**
 * Broadcasts a live speech or typed lecture line to all students in the room.
 * Analyzes the text against the ISL dictionary and sends ISL glosses & sequence.
 */
export function broadcastLiveSpeechText(speechText, roomCode = DEFAULT_ROOM_CODE) {
  if (!speechText || !speechText.trim()) return null;
  const clean = speechText.trim();
  const glosses = sentenceToISLGlosses(clean);
  const islSequence = convertTextToISLSequence(clean);
  const roomChan = getRoomChannel(roomCode);
  if (roomChan) {
    roomChan.postMessage({
      type: 'LECTURE_TRANSCRIPT',
      roomCode,
      glosses,
      islSequence,
      rawText: clean,
      isFinal: true,
      timestamp: Date.now()
    });
  }
  return { glosses, islSequence, rawText: clean };
}

/**
 * Subscribes to live class notifications (for followed teachers / student popups).
 * Supports same-tab CustomEvents, cross-tab BroadcastChannel, and localStorage sync.
 */
export function subscribeToLiveNotifications(callback) {
  const chan = getNotifChannel();

  const handleMessage = (event) => {
    const data = event.data;
    if (data && (data.type === 'LIVE_CLASS_STARTED' || data.type === 'LIVE_CLASS_ENDED')) {
      callback(data);
    }
  };

  const handleCustomEvent = (e) => {
    if (e.detail) callback(e.detail);
  };

  const handleStorageEvent = (e) => {
    if (e.key === 'inclusiveai_active_live_class') {
      try {
        if (e.newValue) {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.type) callback(parsed);
        } else {
          callback({ type: 'LIVE_CLASS_ENDED' });
        }
      } catch (err) {}
    }
  };

  if (chan) chan.addEventListener('message', handleMessage);

  if (typeof window !== 'undefined') {
    window.addEventListener('inclusiveai-live-notification', handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    // Initial check: if a live class is active in localStorage right now, trigger immediately!
    try {
      const existing = localStorage.getItem('inclusiveai_active_live_class');
      if (existing) {
        const parsed = JSON.parse(existing);
        if (parsed && parsed.type === 'LIVE_CLASS_STARTED') {
          setTimeout(() => callback(parsed), 200);
        }
      }
    } catch (e) {}
  }

  return () => {
    if (chan) chan.removeEventListener('message', handleMessage);
    if (typeof window !== 'undefined') {
      window.removeEventListener('inclusiveai-live-notification', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
}

/**
 * Broadcasts teacher reply (answer to student question) to room.
 */
export function broadcastTeacherReply(replyText, roomCode = DEFAULT_ROOM_CODE) {
  const roomChan = getRoomChannel(roomCode);
  const glosses = sentenceToISLGlosses(replyText);
  const islSequence = convertTextToISLSequence(replyText);
  if (roomChan) {
    roomChan.postMessage({ type: 'TEACHER_REPLY', roomCode, glosses, islSequence, rawText: replyText, timestamp: Date.now() });
  }
  return glosses;
}

// ── LEGACY COMPATIBILITY ──────────────────────────────────────────────────────
export function startLectureRecording(onUpdate) {
  return startTeacherVideoSession({ roomCode: DEFAULT_ROOM_CODE, onTranscriptUpdate: onUpdate });
}
export function stopLectureRecording() { return stopTeacherVideoSession(DEFAULT_ROOM_CODE); }
export function isLectureRecording() { return _isLectureActive; }
export function subscribeLecture(callback) {
  return subscribeRoomSession(DEFAULT_ROOM_CODE, { onGlosses: (g) => callback(g, '') });
}
export function subscribeTeacherReply(callback) {
  return subscribeRoomSession(DEFAULT_ROOM_CODE, { onTeacherReply: (g, t) => callback(g, t) });
}
