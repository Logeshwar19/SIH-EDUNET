import express from 'express';
import http from 'http';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import multer from 'multer';
import { processLesson } from './services/contentEngine.js';
import { getSignSequence, evaluateGesture } from './services/deafModule.js';
import { getHapticDiagram, evaluateVoiceAnswer } from './services/blindModule.js';
import { matchSignToLesson, normalizeGlossToMeaning } from './services/semanticMatcher.js';
import { sampleLessons, sampleStudents } from './sampleData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, '../client/dist');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend and any LAN device IP during multi-device classroom usage
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));

// In-memory Database state
const db = {
  lessons: {},
  progress: {
    'student-rohan': {
      signPractice: [
        { signWord: 'Heart', accuracy: 96, at: Date.now() - 3600000 },
        { signWord: 'Pump', accuracy: 91, at: Date.now() - 1800000 }
      ],
      quizResults: []
    },
    'student-ananya': {
      signPractice: [],
      quizResults: [
        { questionId: 'vq-1', correct: true, score: 10, at: Date.now() - 2400000 },
        { questionId: 'vq-2', correct: true, score: 10, at: Date.now() - 1200000 }
      ]
    }
  },
  teacherInbox: [
    {
      id: "inbox-1",
      studentId: "student-rohan",
      studentName: "Rohan Patel (Deaf)",
      type: "sign_to_text",
      message: "Signed: Teacher, can we review how the Left Ventricle pumps blood?",
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: "inbox-2",
      studentId: "student-ananya",
      studentName: "Ananya Sharma (Blind)",
      type: "voice_quiz_completed",
      message: "Completed Voice Quiz for 'The Human Heart & Circulatory System' with 100% score.",
      timestamp: new Date(Date.now() - 1800000).toISOString()
    }
  ]
};

// Populate initial sample lessons into DB
sampleLessons.forEach(l => {
  db.lessons[l.id] = {
    ...l,
    text_blocks: l.bviModule?.audioSections?.map(s => s.content) || [l.summary],
    concepts: l.islModule?.lessonGlosses?.map(g => ({
      word: g.word,
      gloss: g.gloss,
      description: g.description,
      signAsset: `${g.word.toLowerCase()}.mp4`
    })) || [],
    diagrams: l.bviModule?.hapticDiagram ? [
      {
        id: l.bviModule.hapticDiagram.id,
        label: l.bviModule.hapticDiagram.title,
        description: l.summary,
        outlinePath: [
          { x: 0.50, y: 0.15 }, { x: 0.65, y: 0.18 }, { x: 0.78, y: 0.32 },
          { x: 0.80, y: 0.50 }, { x: 0.70, y: 0.70 }, { x: 0.55, y: 0.88 },
          { x: 0.50, y: 0.95 }, { x: 0.45, y: 0.88 }, { x: 0.30, y: 0.70 },
          { x: 0.20, y: 0.50 }, { x: 0.22, y: 0.32 }, { x: 0.35, y: 0.18 },
          { x: 0.50, y: 0.15 }
        ],
        regions: l.bviModule.hapticDiagram.landmarks.map(lm => ({
          id: lm.id,
          label: lm.name.toLowerCase(),
          x: lm.x / 800,
          y: lm.y / 600,
          radius: lm.radius / 800,
          description: lm.audioDescription
        }))
      }
    ] : [],
    quiz_items: l.bviModule?.voiceQuiz?.map(q => ({
      id: q.id,
      prompt: q.spokenQuestion,
      spokenQuestion: q.spokenQuestion,
      acceptedAnswerKeywords: q.expectedKeywords,
      modelAnswer: q.modelAnswer
    })) || []
  };
});

// File Upload Validation & Limits (PDF, PPT, TXT, Diagrams/Images)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'text/plain',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/svg+xml'
    ];
    const ext = (file.originalname || '').split('.').pop().toLowerCase();
    const allowedExts = ['pdf', 'txt', 'md', 'ppt', 'pptx', 'png', 'jpg', 'jpeg', 'svg'];
    if (allowed.includes(file.mimetype) || allowedExts.includes(ext)) {
      return cb(null, true);
    }
    cb(new Error('Supported formats: PDF, PPT/PPTX, TXT, and Diagram Images (PNG, JPG, SVG)'), false);
  }
});

// 1. Upload & Ingest Lesson (PDF, TXT, or Raw Text)
app.post('/api/lessons/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'File upload error' });
    }

    try {
      const rawText = req.body?.rawText;
      if (!req.file && !rawText) {
        return res.status(400).json({ error: 'No file or text uploaded' });
      }

      const processed = await processLesson(req.file, rawText);
      const lessonId = processed.id;

      const fullLesson = {
        ...processed,
        subject: req.body?.subject || 'Class 10 Science',
        grade: req.body?.grade || 'Grade 10',
        estimatedTime: '12 mins',
        summary: processed.text_blocks[0] || 'Lesson overview.',
        uploadedAt: new Date().toISOString(),
        originalFileName: processed.originalFileName,
        islModule: {
          lessonGlosses: processed.concepts.map(c => ({
            word: c.word,
            gloss: c.gloss || c.word.toUpperCase(),
            description: c.description || `Sign gesture for ${c.word}`,
            duration: 2.5
          })),
          practiceWords: processed.concepts.slice(0, 3).map(c => ({
            id: c.word.toLowerCase(),
            word: c.word,
            hint: c.description || `Perform the sign for ${c.word}.`,
            targetPose: 'SIGN_POSE',
            difficulty: 'Easy'
          })),
          quiz: processed.quiz_items.map((q, idx) => ({
            id: `q-isl-${idx}`,
            question: q.prompt,
            options: ["Primary core concept", "Secondary mechanism", "Unrelated function", "Incorrect premise"],
            correctIndex: 0,
            signHint: `Focus on ${q.prompt}`
          }))
        },
        bviModule: {
          audioSummary: processed.text_blocks.join(' ').slice(0, 240) + '...',
          audioSections: processed.text_blocks.map((b, i) => ({
            sectionTitle: `Section ${i + 1}`,
            content: b
          })),
          hapticDiagram: (() => {
            const primaryDiagram = processed.diagrams?.[0];
            const isFlowchart = !!primaryDiagram?.isFlowchart;

            let diagramPaths = primaryDiagram?.paths || [];
            if (!diagramPaths || diagramPaths.length === 0) {
              if (primaryDiagram?.outlinePath && primaryDiagram.outlinePath.length > 0) {
                const pts = primaryDiagram.outlinePath.map(pt => `${Math.round(pt.x * 800)},${Math.round(pt.y * 600)}`);
                diagramPaths = [
                  {
                    id: "outer-boundary",
                    name: primaryDiagram.label || "Diagram Outline Boundary",
                    type: "boundary",
                    d: `M ${pts.join(' L ')} Z`,
                    vibrationPattern: [50, 30]
                  }
                ];
              } else {
                diagramPaths = [
                  {
                    id: "outer-boundary",
                    name: primaryDiagram?.label || "Diagram Outline Boundary",
                    type: "boundary",
                    d: "M 400,120 C 520,70 660,160 640,320 C 620,440 460,530 400,560 C 340,530 180,440 160,320 C 140,160 280,70 400,120 Z",
                    vibrationPattern: [40, 20]
                  }
                ];
              }
            }

            let diagramLandmarks = primaryDiagram?.landmarks || [];
            if (!diagramLandmarks || diagramLandmarks.length === 0) {
              diagramLandmarks = (primaryDiagram?.regions || []).map(r => ({
                id: r.id,
                name: r.label,
                x: Math.round(r.x * 800),
                y: Math.round(r.y * 600),
                radius: Math.round((r.radius || 0.08) * 800),
                audioDescription: r.description || `You are touching ${r.label}.`,
                hapticTone: [100, 50, 100],
                color: "#FFFFFF"
              }));
            }

            return {
              id: primaryDiagram?.id || 'diagram-main',
              title: primaryDiagram?.title || primaryDiagram?.label || 'Tactile Diagram',
              isFlowchart,
              aspectRatio: "4:3",
              viewBox: { width: 800, height: 600 },
              paths: diagramPaths,
              landmarks: diagramLandmarks,
              description: primaryDiagram?.description || "Tactile diagram ready for touch and vibration exploration."
            };
          })(),
          voiceQuiz: processed.quiz_items.map(q => ({
            id: q.id,
            spokenQuestion: q.spokenQuestion,
            expectedKeywords: q.acceptedAnswerKeywords,
            modelAnswer: q.modelAnswer,
            points: 10
          }))
        }
      };

      db.lessons[lessonId] = fullLesson;

      // Broadcast new lesson to all connected student laptops in real-time
      try {
        const lessonPayload = JSON.stringify({
          type: 'LESSON_SHARED',
          lesson: fullLesson,
          timestamp: Date.now()
        });
        for (const client of wss.clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(lessonPayload);
          }
        }
      } catch (e) {
        console.warn('[WS] Lesson broadcast warning:', e);
      }

      res.status(201).json({
        success: true,
        lessonId,
        lesson: fullLesson
      });
    } catch (err) {
      console.error('Processing error:', err);
      res.status(500).json({ error: 'Failed to process lesson', detail: err.message });
    }
  });
});

// 1b. Broadcast any selected lesson to students across laptops
app.post('/api/lessons/broadcast', (req, res) => {
  const { lessonId, roomCode } = req.body;
  const lesson = db.lessons[lessonId];
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  try {
    const payload = JSON.stringify({
      type: 'LESSON_SHARED',
      roomCode: (roomCode || 'ROOM-SIH-2026').toUpperCase().trim(),
      lesson,
      timestamp: Date.now()
    });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  } catch (e) {
    console.warn('[WS] Broadcast error:', e);
  }

  res.json({ success: true, lessonId, message: 'Lesson broadcasted to all students in room.' });
});

// 2. Get all lessons
app.get('/api/lessons', (req, res) => {
  res.json({
    success: true,
    count: Object.keys(db.lessons).length,
    lessons: Object.values(db.lessons)
  });
});

// 3. Get single lesson
app.get('/api/lessons/:id', (req, res) => {
  const lesson = db.lessons[req.params.id];
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  res.json({ success: true, lesson });
});

// 3b. Semantic Lesson Matching (Student sign gloss -> Vector search over currently selected lesson)
app.post('/api/lessons/:id/semantic-match', (req, res) => {
  const lesson = db.lessons[req.params.id];
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  const { gloss } = req.body;
  if (!gloss) return res.status(400).json({ error: 'No sign gloss provided' });

  const matchResult = matchSignToLesson(gloss, lesson);
  res.json({
    success: true,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    gloss,
    ...matchResult
  });
});

// 4. Deaf Module: Get sign sequence
app.get('/api/deaf/:lessonId/signs', (req, res) => {
  const lesson = db.lessons[req.params.lessonId];
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  res.json(getSignSequence(lesson));
});

// 5. Deaf Module: Evaluate gesture practice
app.post('/api/deaf/practice/evaluate', (req, res) => {
  const { studentId = 'student-rohan', signWord, landmarkSequence } = req.body;
  const result = evaluateGesture(signWord, landmarkSequence);

  db.progress[studentId] = db.progress[studentId] || { signPractice: [], quizResults: [] };
  db.progress[studentId].signPractice.unshift({
    signWord,
    accuracy: result.accuracy,
    at: Date.now()
  });

  res.json({
    success: true,
    ...result
  });
});

// 6. Deaf Module: Sign-to-Text Bridge
app.post('/api/deaf/sign-to-text', (req, res) => {
  const { studentId = 'student-rohan', studentName = 'Rohan Patel (Deaf)', recognizedWord } = req.body;
  
  const inboxItem = {
    id: `inbox-${Date.now()}`,
    studentId,
    studentName,
    type: "sign_to_text",
    message: `Signed: "${recognizedWord}"`,
    timestamp: new Date().toISOString()
  };

  db.teacherInbox.unshift(inboxItem);

  res.json({
    success: true,
    inboxItem
  });
});

// 7. Blind Module: Get content (narration, haptic diagrams, quiz)
app.get('/api/blind/:lessonId/content', (req, res) => {
  const lesson = db.lessons[req.params.lessonId];
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  
  res.json({
    narration: lesson.text_blocks,
    diagrams: (lesson.diagrams || []).map(getHapticDiagram),
    quiz: lesson.quiz_items
  });
});

// 8. Blind Module: Evaluate voice answer (Fix 4: Return 404 for Unknown Question)
app.post('/api/blind/quiz/evaluate', (req, res) => {
  const { studentId = 'student-ananya', lessonId, questionId, spokenAnswer } = req.body;
  const lesson = db.lessons[lessonId];
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found', lessonId });
  }

  const question = lesson?.quiz_items?.find(q => q.id === questionId);
  if (!question) {
    return res.status(404).json({ error: 'Question not found', questionId });
  }

  const result = evaluateVoiceAnswer(question, spokenAnswer);
  
  db.progress[studentId] = db.progress[studentId] || { signPractice: [], quizResults: [] };
  db.progress[studentId].quizResults.unshift({
    questionId,
    score: result.score,
    correct: result.correct,
    at: Date.now()
  });

  res.json({
    success: true,
    ...result
  });
});

// 9. Teacher: Get Student Progress
app.get('/api/teacher/progress/:studentId', (req, res) => {
  res.json(db.progress[req.params.studentId] || { signPractice: [], quizResults: [] });
});

// 10. Teacher: Dashboard summary
app.get('/api/teacher/dashboard', (req, res) => {
  res.json({
    success: true,
    stats: {
      totalLessons: Object.keys(db.lessons).length,
      activeStudents: sampleStudents.length,
      avgDeafSignAccuracy: 93,
      avgBlindQuizScore: 95
    },
    students: sampleStudents,
    inbox: db.teacherInbox,
    recentLessons: Object.values(db.lessons).slice(0, 5)
  });
});

// 11. Network & Multi-Device Connection Info (returns local Wi-Fi / LAN IP for other laptops)
app.get('/api/network-info', (req, res) => {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  const primaryIp = addresses[0] || 'localhost';
  res.json({
    success: true,
    ip: primaryIp,
    allIps: addresses,
    port: 5173,
    teacherUrl: `http://${primaryIp}:5173`,
    backendUrl: `http://${primaryIp}:${PORT}`
  });
});

// ── WEBSOCKET ROOM BROADCASTER (Cross-Laptop Real-Time Engine) ──────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const rooms = new Map(); // roomCode -> Set<WebSocket>

function getRoomSockets(roomCode) {
  const code = (roomCode || 'ROOM-SIH-2026').toUpperCase().trim();
  if (!rooms.has(code)) {
    rooms.set(code, new Set());
  }
  return rooms.get(code);
}

wss.on('connection', (ws) => {
  let currentRoom = null;
  let clientRole = 'guest';

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      const type = data.type;
      const roomCode = (data.roomCode || currentRoom || 'ROOM-SIH-2026').toUpperCase().trim();

      if (type === 'JOIN_ROOM') {
        if (currentRoom && currentRoom !== roomCode) {
          const oldSet = rooms.get(currentRoom);
          if (oldSet) oldSet.delete(ws);
        }
        currentRoom = roomCode;
        clientRole = data.role || 'student';
        const roomSet = getRoomSockets(roomCode);
        roomSet.add(ws);

        // Acknowledge join
        ws.send(JSON.stringify({
          type: 'JOINED_ROOM_ACK',
          roomCode,
          participantCount: roomSet.size,
          timestamp: Date.now()
        }));

        // Broadcast presence
        const joinNotif = JSON.stringify({
          type: 'USER_JOINED',
          roomCode,
          role: clientRole,
          name: data.name || 'Participant',
          participantCount: roomSet.size,
          timestamp: Date.now()
        });
        for (const peer of roomSet) {
          if (peer !== ws && peer.readyState === WebSocket.OPEN) {
            peer.send(joinNotif);
          }
        }
        return;
      }

      if (type === 'LEAVE_ROOM') {
        if (currentRoom) {
          const roomSet = rooms.get(currentRoom);
          if (roomSet) {
            roomSet.delete(ws);
            const leaveNotif = JSON.stringify({
              type: 'USER_LEFT',
              roomCode: currentRoom,
              role: clientRole,
              participantCount: roomSet.size,
              timestamp: Date.now()
            });
            for (const peer of roomSet) {
              if (peer !== ws && peer.readyState === WebSocket.OPEN) {
                peer.send(leaveNotif);
              }
            }
          }
          currentRoom = null;
        }
        return;
      }

      // Handle student sending doubt/question directly to teacher inbox via WS
      if (type === 'STUDENT_QUESTION' || type === 'STUDENT_DOUBT') {
        const inboxItem = {
          id: `inbox-${Date.now()}`,
          studentId: data.studentId || `student-${Date.now()}`,
          studentName: data.studentName || 'Student',
          type: data.doubtType || 'sign_to_text',
          message: data.message || 'Student Doubt Question',
          timestamp: new Date().toISOString()
        };
        db.teacherInbox.unshift(inboxItem);
      }

      // Forward room message to all other participants in the room
      const roomSet = getRoomSockets(roomCode);
      const outgoing = JSON.stringify(data);

      for (const peer of roomSet) {
        if (peer !== ws && peer.readyState === WebSocket.OPEN) {
          peer.send(outgoing);
        }
      }

      // Global live class notifications broadcast to ALL connected clients
      if (type === 'LIVE_CLASS_STARTED' || type === 'LIVE_CLASS_ENDED') {
        for (const client of wss.clients) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(outgoing);
          }
        }
      }
    } catch (e) {
      console.warn('[WS] Message error:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      const roomSet = rooms.get(currentRoom);
      if (roomSet) {
        roomSet.delete(ws);
        if (roomSet.size === 0) {
          rooms.delete(currentRoom);
        }
      }
    }
  });
});

// All-in-One Host: Serve static production frontend bundle
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  const primaryIp = ips[0] || 'localhost';

  console.log(`=======================================================`);
  console.log(`🎓 InclusiveAI Multi-Device Engine running on:`);
  console.log(`   - Local:      http://localhost:${PORT}`);
  console.log(`   - Network IP: http://${primaryIp}:${PORT}`);
  console.log(`   - WebSocket:  ws://${primaryIp}:${PORT}/ws`);
  console.log(`   - Cross-Laptop Classroom Hub Active (Google Meet Style)`);
  console.log(`=======================================================`);
});
