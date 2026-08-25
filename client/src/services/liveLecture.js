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

// ── ROOM & BROADCAST MANAGEMENT (Google Meet Multi-Device Hub) ───────────────
export const DEFAULT_ROOM_CODE = 'ROOM-SIH-2026';
export const DEFAULT_ROOM_PASS = 'LEARN2026';

// Generates Google Meet format room code (e.g. "edu-math-789" or "sih-live-101")
export function generateMeetRoomCode() {
  const prefixes = ['sih', 'edu', 'sci', 'bio', 'cls', 'art', 'lab', 'hub'];
  const p = prefixes[Math.floor(Math.random() * prefixes.length)];
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let seg1 = '';
  let seg2 = '';
  for (let i = 0; i < 4; i++) seg1 += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 3; i++) seg2 += chars[Math.floor(Math.random() * chars.length)];
  return `${p}-${seg1}-${seg2}`.toUpperCase();
}

// Fetch local network IP from backend to allow effortless multi-laptop sharing
export async function fetchNetworkInfo() {
  try {
    const res = await fetch('/api/network-info');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[LiveLecture] Network info fetch notice:', e);
  }
  const host = (typeof window !== 'undefined' ? window.location.hostname : 'localhost') || 'localhost';
  const port = (typeof window !== 'undefined' ? window.location.port : '5173') || '5173';
  return {
    success: true,
    ip: host,
    port: port,
    teacherUrl: typeof window !== 'undefined' ? window.location.origin : `http://${host}:${port}`
  };
}

// ── WEBSOCKET CLIENT SINGLETON (Cross-Laptop Real-Time Sync) ─────────────────
let _ws = null;
let _wsReconnectTimer = null;
let _wsCurrentRoom = null;
let _wsCurrentRole = 'guest';
const _wsMessageListeners = new Set();

function getWebSocketConnection() {
  if (typeof window === 'undefined') return null;
  if (_ws && (_ws.readyState === WebSocket.OPEN || _ws.readyState === WebSocket.CONNECTING)) {
    return _ws;
  }

  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    _ws = new WebSocket(wsUrl);

    _ws.onopen = () => {
      console.log('[LiveLecture WS] Connected to multi-device classroom hub at', wsUrl);
      if (_wsCurrentRoom) {
        _ws.send(JSON.stringify({
          type: 'JOIN_ROOM',
          roomCode: _wsCurrentRoom,
          role: _wsCurrentRole,
          timestamp: Date.now()
        }));
      }
    };

    _ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data) return;

        // Dispatch to all registered listeners
        _wsMessageListeners.forEach((fn) => {
          try { fn(data); } catch (err) {}
        });

        // Trigger native window events for same-page listeners
        if (data.type === 'VIDEO_FRAME' && data.frameData) {
          window.dispatchEvent(new CustomEvent('inclusiveai-live-frame', { detail: { frameData: data.frameData, roomCode: data.roomCode } }));
        } else if (data.type === 'LIVE_CLASS_STARTED' || data.type === 'LIVE_CLASS_ENDED') {
          window.dispatchEvent(new CustomEvent('inclusiveai-live-notification', { detail: data }));
          if (data.type === 'LIVE_CLASS_STARTED') {
            try { localStorage.setItem('inclusiveai_active_live_class', JSON.stringify(data)); } catch (e) {}
          } else {
            try { localStorage.removeItem('inclusiveai_active_live_class'); } catch (e) {}
          }
        } else if (data.type === 'STUDENT_QUESTION' || data.type === 'STUDENT_DOUBT') {
          window.dispatchEvent(new CustomEvent('inclusiveai-student-doubt', { detail: data }));
        } else if (data.type === 'LESSON_SHARED' && data.lesson) {
          window.dispatchEvent(new CustomEvent('inclusiveai-lesson-shared', { detail: data }));
        }
      } catch (err) {
        console.warn('[LiveLecture WS] Parsing error:', err);
      }
    };

    _ws.onclose = () => {
      _ws = null;
      if (!_wsReconnectTimer) {
        _wsReconnectTimer = setTimeout(() => {
          _wsReconnectTimer = null;
          getWebSocketConnection();
        }, 2000);
      }
    };

    _ws.onerror = (e) => {
      console.warn('[LiveLecture WS] Hub connection notice:', e);
    };

    return _ws;
  } catch (err) {
    console.warn('[LiveLecture WS] Init failed:', err);
    return null;
  }
}

export function sendWebSocketBroadcast(payload) {
  const ws = getWebSocketConnection();
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('[LiveLecture WS] Broadcast failed:', e);
    }
  }
  return false;
}

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

/**
 * Starts a real Teacher Video & Audio live lecture session.
 * Broadcasts a live notification to all followers across tabs and laptops.
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
    _wsCurrentRoom = (roomCode || DEFAULT_ROOM_CODE).toUpperCase().trim();
    _wsCurrentRole = 'teacher';

    // Ensure WebSocket is connected & joined to room
    const ws = getWebSocketConnection();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'JOIN_ROOM',
        roomCode: _wsCurrentRoom,
        role: 'teacher',
        name: teacherProfile?.name || 'Teacher',
        timestamp: Date.now()
      }));
    }

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

    // 3. Setup video frame broadcaster for student views using offscreen capture
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

    if (stream && stream.getVideoTracks().length > 0) {
      const ctx = _hiddenCanvas.getContext('2d');
      if (_frameBroadcastTimer) clearInterval(_frameBroadcastTimer);
      _frameBroadcastTimer = setInterval(() => {
        const sourceVid = (videoElement && videoElement.readyState >= 2) ? videoElement : _captureVideoElement;
        if (!sourceVid || sourceVid.paused || sourceVid.ended) return;
        try {
          ctx.drawImage(sourceVid, 0, 0, 360, 270);
          _lastCapturedFrame = _hiddenCanvas.toDataURL('image/jpeg', 0.55);
          
          const framePayload = {
            type: 'VIDEO_FRAME',
            roomCode: _wsCurrentRoom,
            frameData: _lastCapturedFrame,
            timestamp: Date.now()
          };

          // Post to WebSocket Hub (cross-laptop)
          sendWebSocketBroadcast(framePayload);

          // Post to BroadcastChannel (cross-tab on same machine)
          if (roomChan) {
            roomChan.postMessage(framePayload);
          }
          // Same-tab & local storage fallback
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('inclusiveai-live-frame', { detail: { frameData: _lastCapturedFrame, roomCode: _wsCurrentRoom } }));
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

        const transcriptPayload = {
          type: 'LECTURE_TRANSCRIPT',
          roomCode: _wsCurrentRoom,
          glosses,
          islSequence,
          rawText: currentText.trim(),
          isFinal,
          timestamp: Date.now()
        };

        // Broadcast over WebSocket (cross-laptop) and BroadcastChannel
        sendWebSocketBroadcast(transcriptPayload);
        if (roomChan) {
          roomChan.postMessage(transcriptPayload);
        }
      };

      _recognition.onerror = (e) => { if (e.error !== 'no-speech') console.warn('[LiveClass] Speech error:', e.error); };
      _recognition.onend = () => { if (_isLectureActive && _recognition) { try { _recognition.start(); } catch (e) {} } };
      try { _recognition.start(); } catch (e) {}
    }

    _isLectureActive = true;

    const roomStatusPayload = {
      type: 'ROOM_STATUS',
      roomCode: _wsCurrentRoom,
      isLive: true,
      lessonTitle,
      teacherName: teacherProfile?.name || 'Teacher (Host)',
      teacherId: teacherProfile?.id || 'TCH-0000',
      teacherSubject: teacherProfile?.subject || '',
      timestamp: Date.now()
    };

    // 5. Broadcast room active to WebSocket & BroadcastChannel
    sendWebSocketBroadcast(roomStatusPayload);
    if (roomChan) roomChan.postMessage(roomStatusPayload);

    // 6. Broadcast LIVE_NOTIFICATION to all followers across tabs & laptops
    const notifPayload = {
      type: 'LIVE_CLASS_STARTED',
      teacherId: teacherProfile?.id || 'TCH-0000',
      teacherName: teacherProfile?.name || 'Teacher',
      teacherSubject: teacherProfile?.subject || '',
      teacherAvatar: teacherProfile?.avatar || null,
      roomCode: _wsCurrentRoom,
      lessonTitle,
      timestamp: Date.now()
    };

    sendWebSocketBroadcast(notifPayload);
    const notifChan = getNotifChannel();
    if (notifChan) notifChan.postMessage(notifPayload);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('inclusiveai-live-notification', { detail: notifPayload }));
      try { localStorage.setItem('inclusiveai_active_live_class', JSON.stringify(notifPayload)); } catch (e) {}
    }

    return { success: true, stream };
  } catch (err) {
    console.error('[LiveClass] startTeacherVideoSession failed:', err);
    if (onError) onError(err);
    return { success: false, error: err.message };
  }
}

/**
 * Stops the active teacher live lecture and releases media streams.
 */
export function stopTeacherVideoSession(roomCode = DEFAULT_ROOM_CODE) {
  _isLectureActive = false;
  const cleanCode = (roomCode || _wsCurrentRoom || DEFAULT_ROOM_CODE).toUpperCase().trim();

  if (_frameBroadcastTimer) { clearInterval(_frameBroadcastTimer); _frameBroadcastTimer = null; }
  if (_recognition) { try { _recognition.stop(); } catch (e) {} _recognition = null; }
  if (_activeMediaStream) {
    _activeMediaStream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
    _activeMediaStream = null;
  }

  const roomStatusPayload = { type: 'ROOM_STATUS', roomCode: cleanCode, isLive: false, timestamp: Date.now() };
  sendWebSocketBroadcast(roomStatusPayload);

  const roomChan = getRoomChannel(cleanCode);
  if (roomChan) roomChan.postMessage(roomStatusPayload);

  const endPayload = {
    type: 'LIVE_CLASS_ENDED',
    teacherId: _currentTeacherProfile?.id || 'TCH-0000',
    roomCode: cleanCode,
    timestamp: Date.now()
  };

  sendWebSocketBroadcast(endPayload);
  const notifChan = getNotifChannel();
  if (notifChan) notifChan.postMessage(endPayload);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('inclusiveai-live-notification', { detail: endPayload }));
    try { localStorage.removeItem('inclusiveai_active_live_class'); } catch (e) {}
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

export function subscribeRoomSession(roomCode = DEFAULT_ROOM_CODE, {
  onVideoFrame, onTranscript, onGlosses, onISLSequence, onStatus, onTeacherReply
}) {
  const cleanCode = (roomCode || DEFAULT_ROOM_CODE).toUpperCase().trim();
  _wsCurrentRoom = cleanCode;
  _wsCurrentRole = 'student';

  const roomChan = getRoomChannel(cleanCode);

  // Connect WebSocket and send JOIN_ROOM
  const ws = getWebSocketConnection();
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'JOIN_ROOM',
      roomCode: cleanCode,
      role: 'student',
      timestamp: Date.now()
    }));
  }

  const dispatchRoomData = (data) => {
    if (!data) return;
    // Check if message belongs to this room or is a global broadcast
    if (data.roomCode && data.roomCode.toUpperCase().trim() !== cleanCode) {
      if (data.type !== 'LIVE_CLASS_STARTED' && data.type !== 'LIVE_CLASS_ENDED') return;
    }

    if (data.type === 'VIDEO_FRAME' && onVideoFrame) onVideoFrame(data.frameData);
    else if (data.type === 'LECTURE_TRANSCRIPT') {
      if (onTranscript) onTranscript(data.rawText, data.isFinal);
      if (onGlosses) onGlosses(data.glosses || []);
      if (onISLSequence) onISLSequence(data.islSequence || []);
    } else if (data.type === 'ROOM_STATUS' && onStatus) onStatus(data);
    else if (data.type === 'TEACHER_REPLY' && onTeacherReply) onTeacherReply(data.glosses, data.rawText);
    else if (data.type === 'PING_ROOM') {
      if (_isLectureActive) {
        const replyStatus = {
          type: 'ROOM_STATUS', roomCode: cleanCode, isLive: true,
          teacherName: _currentTeacherProfile?.name || 'Teacher (Host)',
          teacherId: _currentTeacherProfile?.id || 'TCH-0000',
          teacherSubject: _currentTeacherProfile?.subject || '',
          timestamp: Date.now()
        };
        sendWebSocketBroadcast(replyStatus);
        if (roomChan) roomChan.postMessage(replyStatus);

        if (_lastCapturedFrame) {
          const replyFrame = { type: 'VIDEO_FRAME', roomCode: cleanCode, frameData: _lastCapturedFrame, timestamp: Date.now() };
          sendWebSocketBroadcast(replyFrame);
          if (roomChan) roomChan.postMessage(replyFrame);
        }
      }
    }
  };

  const handleMessage = (event) => {
    dispatchRoomData(event.data);
  };

  const handleWsMessage = (data) => {
    dispatchRoomData(data);
  };

  _wsMessageListeners.add(handleWsMessage);

  const handleStorageFrame = (e) => {
    if (e.key === 'inclusiveai_live_frame' && e.newValue && onVideoFrame) {
      onVideoFrame(e.newValue);
    }
  };

  if (roomChan) {
    roomChan.addEventListener('message', handleMessage);
    const pingPayload = { type: 'PING_ROOM', roomCode: cleanCode, timestamp: Date.now() };
    roomChan.postMessage(pingPayload);
    sendWebSocketBroadcast(pingPayload);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageFrame);
    try {
      const cached = localStorage.getItem('inclusiveai_live_frame');
      if (cached && onVideoFrame) onVideoFrame(cached);
    } catch (e) {}
  }

  return () => {
    _wsMessageListeners.delete(handleWsMessage);
    if (roomChan) roomChan.removeEventListener('message', handleMessage);
    if (typeof window !== 'undefined') window.removeEventListener('storage', handleStorageFrame);
  };
}

/**
 * Broadcasts a live speech or typed lecture line to all students in the room across laptops.
 */
export function broadcastLiveSpeechText(speechText, roomCode = DEFAULT_ROOM_CODE) {
  if (!speechText || !speechText.trim()) return null;
  const clean = speechText.trim();
  const cleanCode = (roomCode || DEFAULT_ROOM_CODE).toUpperCase().trim();
  const glosses = sentenceToISLGlosses(clean);
  const islSequence = convertTextToISLSequence(clean);

  const payload = {
    type: 'LECTURE_TRANSCRIPT',
    roomCode: cleanCode,
    glosses,
    islSequence,
    rawText: clean,
    isFinal: true,
    timestamp: Date.now()
  };

  sendWebSocketBroadcast(payload);
  const roomChan = getRoomChannel(cleanCode);
  if (roomChan) {
    roomChan.postMessage(payload);
  }
  return { glosses, islSequence, rawText: clean };
}

/**
 * Sends a student question or doubt directly to the Teacher Dashboard Inbox in real-time across laptops.
 */
export function sendStudentQuestionViaWS({
  studentId = 'student-live',
  studentName = 'Student',
  message = '',
  doubtType = 'sign_to_text',
  roomCode = DEFAULT_ROOM_CODE
}) {
  const cleanCode = (roomCode || DEFAULT_ROOM_CODE).toUpperCase().trim();
  const payload = {
    type: 'STUDENT_QUESTION',
    roomCode: cleanCode,
    studentId,
    studentName,
    message,
    doubtType,
    timestamp: Date.now()
  };

  sendWebSocketBroadcast(payload);
  const roomChan = getRoomChannel(cleanCode);
  if (roomChan) roomChan.postMessage(payload);
}

/**
 * Subscribes to live class notifications (for followed teachers / student popups).
 */
export function subscribeToLiveNotifications(callback) {
  const chan = getNotifChannel();

  const handleMessage = (event) => {
    const data = event.data;
    if (data && (data.type === 'LIVE_CLASS_STARTED' || data.type === 'LIVE_CLASS_ENDED')) {
      callback(data);
    }
  };

  const handleWsMessage = (data) => {
    if (data && (data.type === 'LIVE_CLASS_STARTED' || data.type === 'LIVE_CLASS_ENDED')) {
      callback(data);
    }
  };

  _wsMessageListeners.add(handleWsMessage);

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
    _wsMessageListeners.delete(handleWsMessage);
    if (chan) chan.removeEventListener('message', handleMessage);
    if (typeof window !== 'undefined') {
      window.removeEventListener('inclusiveai-live-notification', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
}

/**
 * Broadcasts teacher reply (answer to student question) to room across laptops.
 */
export function broadcastTeacherReply(replyText, roomCode = DEFAULT_ROOM_CODE) {
  const cleanCode = (roomCode || DEFAULT_ROOM_CODE).toUpperCase().trim();
  const glosses = sentenceToISLGlosses(replyText);
  const islSequence = convertTextToISLSequence(replyText);

  const payload = {
    type: 'TEACHER_REPLY',
    roomCode: cleanCode,
    glosses,
    islSequence,
    rawText: replyText,
    timestamp: Date.now()
  };

  sendWebSocketBroadcast(payload);
  const roomChan = getRoomChannel(cleanCode);
  if (roomChan) {
    roomChan.postMessage(payload);
  }
  return glosses;
}

/**
 * Broadcasts an uploaded or selected lesson to all students in the room across laptops.
 */
export function broadcastLessonToRoom(lesson, roomCode = DEFAULT_ROOM_CODE) {
  if (!lesson) return false;
  const cleanCode = (roomCode || DEFAULT_ROOM_CODE).toUpperCase().trim();
  const payload = {
    type: 'LESSON_SHARED',
    roomCode: cleanCode,
    lesson,
    timestamp: Date.now()
  };

  sendWebSocketBroadcast(payload);
  const roomChan = getRoomChannel(cleanCode);
  if (roomChan) roomChan.postMessage(payload);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('inclusiveai-lesson-shared', { detail: payload }));
  }

  // Also notify backend broadcast route
  try {
    fetch('/api/lessons/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id, roomCode: cleanCode })
    }).catch(() => {});
  } catch (e) {}

  return true;
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
export function clearStaleLiveData() {
  try {
    sessionStorage.removeItem('inclusiveai_active_live_stream');
  } catch (e) {}
}


