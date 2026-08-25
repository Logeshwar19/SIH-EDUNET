import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { processLesson } from './services/contentEngine.js';
import { getSignSequence, evaluateGesture } from './services/deafModule.js';
import { getHapticDiagram, evaluateVoiceAnswer } from './services/blindModule.js';
import { matchSignToLesson, normalizeGlossToMeaning } from './services/semanticMatcher.js';
import { sampleLessons, sampleStudents } from './sampleData.js';
import { connectDB, isDbConnected } from './db/connection.js';
import { User, Class, Lesson, Progress, Message, LiveSession } from './models/index.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Fix 6: Restrict CORS to Frontend Origin
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: '15mb' }));

// Clean In-memory Database state (Empty - populated exclusively by real user uploads & actions)
const db = {
  lessons: {},
  progress: {},
  teacherInbox: []
};

// ── Authentication & Portal User Routes ──────────────────────────────────────

// A. Get available sample profiles for instant demo login
app.get('/api/auth/profiles', async (req, res) => {
  try {
    const mongoUsers = await User.find({}).lean();
    if (mongoUsers && mongoUsers.length > 0) {
      return res.json({
        success: true,
        teachers: mongoUsers.filter(u => u.role === 'teacher'),
        deafStudents: mongoUsers.filter(u => u.role === 'deaf_student'),
        blindStudents: mongoUsers.filter(u => u.role === 'blind_student')
      });
    }
  } catch (e) {}

  res.json({
    success: true,
    teachers: [
      {
        customId: 'teacher-main',
        name: 'Dr. Priya Sharma',
        email: 'priya.sharma@inclusiveai.edu',
        role: 'teacher',
        avatar: '👩‍🏫',
        school: 'Delhi Public Inclusive School',
        grade: 'Grade 10'
      }
    ],
    deafStudents: [
      {
        customId: 'student-rohan',
        name: 'Rohan Patel',
        email: 'rohan@inclusiveai.edu',
        role: 'deaf_student',
        avatar: '🤟',
        school: 'Delhi Public Inclusive School',
        grade: 'Grade 10'
      }
    ],
    blindStudents: [
      {
        customId: 'student-ananya',
        name: 'Ananya Sharma',
        email: 'ananya@inclusiveai.edu',
        role: 'blind_student',
        avatar: '👁️',
        school: 'Delhi Public Inclusive School',
        grade: 'Grade 10'
      }
    ]
  });
});

// B. Role-based Login (Supports Custom ID, Email/Password, or Instant Demo Token)
app.post('/api/auth/login', async (req, res) => {
  const { email, password, customId, role } = req.body;

  try {
    let user = null;
    if (customId) {
      user = await User.findOne({ customId }).lean();
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() }).lean();
    }

    if (!user) {
      // Fallback matching against standard demo profiles
      if (customId === 'teacher-main' || email?.includes('priya') || role === 'teacher') {
        user = {
          _id: 'usr_teacher_priya',
          customId: 'teacher-main',
          name: 'Dr. Priya Sharma',
          email: email || 'priya.sharma@inclusiveai.edu',
          role: 'teacher',
          avatar: '👩‍🏫',
          school: 'Delhi Public Inclusive School',
          grade: 'Grade 10'
        };
      } else if (customId === 'student-rohan' || email?.includes('rohan') || role === 'deaf_student') {
        user = {
          _id: 'usr_student_rohan',
          customId: 'student-rohan',
          name: 'Rohan Patel',
          email: email || 'rohan@inclusiveai.edu',
          role: 'deaf_student',
          avatar: '🤟',
          school: 'Delhi Public Inclusive School',
          grade: 'Grade 10'
        };
      } else if (customId === 'student-ananya' || email?.includes('ananya') || role === 'blind_student') {
        user = {
          _id: 'usr_student_ananya',
          customId: 'student-ananya',
          name: 'Ananya Sharma',
          email: email || 'ananya@inclusiveai.edu',
          role: 'blind_student',
          avatar: '👁️',
          school: 'Delhi Public Inclusive School',
          grade: 'Grade 10'
        };
      } else {
        return res.status(401).json({ success: false, error: 'Invalid user credentials.' });
      }
    }

    res.json({
      success: true,
      user: {
        id: user.customId || user._id,
        customId: user.customId || user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        school: user.school || 'Delhi Public Inclusive School',
        grade: user.grade || 'Grade 10',
        preferences: user.preferences || {}
      },
      token: `token_${user.customId || user._id}_${Date.now()}`
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Login server error' });
  }
});

// C. Register New User (Teacher / Deaf Student / Blind Student)
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, school, grade, preferences } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ success: false, error: 'Name, email, and role are required.' });
  }

  try {
    const customId = `usr_${role}_${Date.now().toString(36)}`;
    const avatar = role === 'teacher' ? '👩‍🏫' : role === 'deaf_student' ? '🤟' : '👁️';

    let user = null;
    try {
      user = await User.create({
        customId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: password || 'password123',
        role,
        avatar,
        school: school || 'Inclusive Model School',
        grade: grade || 'Grade 10',
        preferences: preferences || {}
      });
    } catch (dbErr) {
      // Return user object even if Mongo is in offline mode
      user = {
        _id: customId,
        customId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role,
        avatar,
        school: school || 'Inclusive Model School',
        grade: grade || 'Grade 10',
        preferences: preferences || {}
      };
    }

    res.status(201).json({
      success: true,
      user: {
        id: user.customId || user._id,
        customId: user.customId || user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        school: user.school,
        grade: user.grade,
        preferences: user.preferences
      },
      token: `token_${user.customId || user._id}_${Date.now()}`
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: 'Registration error' });
  }
});

// D. Student Join Room by Room Code (e.g. CLASS-101)
app.post('/api/auth/join-room', async (req, res) => {
  const { roomCode = 'CLASS-101', roomPass = '123456', studentName = 'Student', role = 'deaf_student' } = req.body;

  let classDoc = null;
  try {
    classDoc = await Class.findOne({ roomCode: roomCode.toUpperCase().trim() }).lean();
  } catch (e) {}

  if (!classDoc && roomCode.toUpperCase().trim() !== 'CLASS-101') {
    return res.status(404).json({ success: false, error: 'Classroom not found. Please check your room code.' });
  }

  res.json({
    success: true,
    roomCode: (classDoc?.roomCode || roomCode).toUpperCase(),
    className: classDoc?.name || 'Class 10 - Inclusive Science Hub',
    subject: classDoc?.subject || 'Science & Biology',
    teacherName: 'Dr. Priya Sharma',
    user: {
      id: `guest_${role}_${Date.now().toString(36)}`,
      name: studentName,
      role: role,
      avatar: role === 'deaf_student' ? '🤟' : '👁️',
      roomCode: (classDoc?.roomCode || roomCode).toUpperCase()
    }
  });
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
          audioSummary: processed.text_blocks.join(' ').slice(0, 200),
          audioSections: processed.text_blocks.map((b, i) => ({
            sectionTitle: `Section ${i + 1}`,
            content: b
          })),
          hapticDiagram: {
            id: processed.diagrams[0]?.id || 'diagram-main',
            title: processed.diagrams[0]?.label || 'Diagram',
            aspectRatio: "4:3",
            viewBox: { width: 800, height: 600 },
            paths: [
              {
                id: "outer-boundary",
                name: "Diagram Outline Boundary",
                type: "boundary",
                d: "M 400,120 C 520,70 660,160 640,320 C 620,440 460,530 400,560 C 340,530 180,440 160,320 C 140,160 280,70 400,120 Z",
                vibrationPattern: [40, 20]
              }
            ],
            landmarks: (processed.diagrams[0]?.regions || []).map(r => ({
              id: r.id,
              name: r.label,
              x: Math.round(r.x * 800),
              y: Math.round(r.y * 600),
              radius: Math.round((r.radius || 0.08) * 800),
              audioDescription: r.description || `You are touching ${r.label}.`,
              hapticTone: [100, 50, 100],
              color: "#FFFFFF"
            }))
          },
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

      // Persist to MongoDB
      try {
        await Lesson.findOneAndUpdate(
          { lessonId },
          { ...fullLesson, lessonId },
          { upsert: true, returnDocument: 'after' }
        );
      } catch (dbErr) {
        console.warn('MongoDB save warning:', dbErr.message);
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

// 2. Get all lessons
app.get('/api/lessons', async (req, res) => {
  try {
    const mongoLessons = await Lesson.find({}).sort({ createdAt: -1 }).lean();
    if (mongoLessons && mongoLessons.length > 0) {
      const formatted = mongoLessons.map(l => ({ ...l, id: l.lessonId || l._id.toString() }));
      return res.json({
        success: true,
        count: formatted.length,
        lessons: formatted
      });
    }
  } catch (err) {
    console.warn('MongoDB fetch fallback:', err.message);
  }

  res.json({
    success: true,
    count: Object.keys(db.lessons).length,
    lessons: Object.values(db.lessons)
  });
});

// 3. Get single lesson
app.get('/api/lessons/:id', async (req, res) => {
  try {
    const mongoLesson = await Lesson.findOne({ lessonId: req.params.id }).lean();
    if (mongoLesson) {
      return res.json({
        success: true,
        lesson: { ...mongoLesson, id: mongoLesson.lessonId || mongoLesson._id.toString() }
      });
    }
  } catch (err) {
    console.warn('MongoDB single fetch fallback:', err.message);
  }

  const lesson = db.lessons[req.params.id];
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  res.json({ success: true, lesson });
});

// 3b. Semantic Lesson Matching (Student sign gloss -> Vector search over currently selected lesson)
app.post('/api/lessons/:id/semantic-match', async (req, res) => {
  let lesson = db.lessons[req.params.id];
  if (!lesson) {
    try {
      lesson = await Lesson.findOne({ lessonId: req.params.id }).lean();
      if (lesson) lesson.id = lesson.lessonId;
    } catch (e) {}
  }
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  const { gloss } = req.body;
  if (!gloss) return res.status(400).json({ error: 'No sign gloss provided' });

  const matchResult = matchSignToLesson(gloss, lesson);
  res.json({
    success: true,
    lessonId: lesson.id || lesson.lessonId,
    lessonTitle: lesson.title,
    gloss,
    ...matchResult
  });
});

// 4. Deaf Module: Get sign sequence
app.get('/api/deaf/:lessonId/signs', async (req, res) => {
  let lesson = db.lessons[req.params.lessonId];
  if (!lesson) {
    try {
      lesson = await Lesson.findOne({ lessonId: req.params.lessonId }).lean();
      if (lesson) lesson.id = lesson.lessonId;
    } catch (e) {}
  }
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  res.json(getSignSequence(lesson));
});

// 5. Deaf Module: Evaluate gesture practice
app.post('/api/deaf/practice/evaluate', async (req, res) => {
  const { studentId = 'student-rohan', lessonId, signWord, landmarkSequence } = req.body;
  const result = evaluateGesture(signWord, landmarkSequence);

  db.progress[studentId] = db.progress[studentId] || { signPractice: [], quizResults: [] };
  db.progress[studentId].signPractice.unshift({
    signWord,
    accuracy: result.accuracy,
    at: Date.now()
  });

  // Persist to MongoDB Progress collection
  try {
    await Progress.create({
      studentCustomId: studentId,
      lessonCustomId: lessonId || 'lesson-heart-anatomy',
      activityType: 'sign_practice',
      signWord,
      accuracy: result.accuracy,
      feedback: result.feedback || `${result.accuracy}% match`
    });
  } catch (dbErr) {
    console.warn('MongoDB progress save warning:', dbErr.message);
  }

  res.json({
    success: true,
    ...result
  });
});

// 6. Deaf Module: Sign-to-Text Bridge
app.post('/api/deaf/sign-to-text', async (req, res) => {
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

  // Persist to MongoDB Messages collection
  try {
    await Message.create({
      messageId: inboxItem.id,
      studentCustomId: studentId,
      studentName,
      type: 'sign_to_text',
      message: inboxItem.message
    });
  } catch (dbErr) {
    console.warn('MongoDB message save warning:', dbErr.message);
  }

  res.json({
    success: true,
    inboxItem
  });
});

// 7. Blind Module: Get content (narration, haptic diagrams, quiz)
app.get('/api/blind/:lessonId/content', async (req, res) => {
  let lesson = db.lessons[req.params.lessonId];
  if (!lesson) {
    try {
      lesson = await Lesson.findOne({ lessonId: req.params.lessonId }).lean();
      if (lesson) lesson.id = lesson.lessonId;
    } catch (e) {}
  }
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  
  res.json({
    narration: lesson.text_blocks,
    diagrams: (lesson.diagrams || []).map(getHapticDiagram),
    quiz: lesson.quiz_items
  });
});

// 8. Blind Module: Evaluate voice answer
app.post('/api/blind/quiz/evaluate', async (req, res) => {
  const { studentId = 'student-ananya', lessonId, questionId, spokenAnswer } = req.body;
  let lesson = db.lessons[lessonId];
  if (!lesson) {
    try {
      lesson = await Lesson.findOne({ lessonId }).lean();
      if (lesson) lesson.id = lesson.lessonId;
    } catch (e) {}
  }
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

  // Persist to MongoDB Progress collection
  try {
    await Progress.create({
      studentCustomId: studentId,
      lessonCustomId: lessonId,
      activityType: 'voice_quiz',
      questionId,
      score: result.score,
      isCorrect: result.correct,
      studentAnswer: spokenAnswer,
      feedback: result.feedback
    });
  } catch (dbErr) {
    console.warn('MongoDB quiz progress save warning:', dbErr.message);
  }

  res.json({
    success: true,
    ...result
  });
});

// 9. Teacher: Get Student Progress
app.get('/api/teacher/progress/:studentId', async (req, res) => {
  try {
    const mongoProgress = await Progress.find({ studentCustomId: req.params.studentId }).sort({ completedAt: -1 }).lean();
    if (mongoProgress && mongoProgress.length > 0) {
      const signPractice = mongoProgress
        .filter(p => p.activityType === 'sign_practice')
        .map(p => ({ signWord: p.signWord, accuracy: p.accuracy, at: new Date(p.completedAt).getTime() }));
      const quizResults = mongoProgress
        .filter(p => p.activityType === 'voice_quiz' || p.activityType === 'visual_quiz')
        .map(p => ({ questionId: p.questionId, score: p.score, correct: p.isCorrect, at: new Date(p.completedAt).getTime() }));

      return res.json({ signPractice, quizResults });
    }
  } catch (e) {}

  res.json(db.progress[req.params.studentId] || { signPractice: [], quizResults: [] });
});

// 10. Teacher: Dashboard summary
app.get('/api/teacher/dashboard', async (req, res) => {
  let lessonsList = Object.values(db.lessons);
  let messagesList = db.teacherInbox;
  let studentsList = [];

  try {
    const mongoLessons = await Lesson.find({}).sort({ createdAt: -1 }).lean();
    if (mongoLessons && mongoLessons.length > 0) {
      lessonsList = mongoLessons.map(l => ({ ...l, id: l.lessonId || l._id.toString() }));
    }
    const mongoMessages = await Message.find({}).sort({ timestamp: -1 }).limit(20).lean();
    if (mongoMessages && mongoMessages.length > 0) {
      messagesList = mongoMessages.map(m => ({
        id: m.messageId || m._id.toString(),
        studentId: m.studentCustomId,
        studentName: m.studentName,
        type: m.type,
        message: m.message,
        timestamp: m.timestamp
      }));
    }
    const mongoStudents = await User.find({ role: { $in: ['deaf_student', 'blind_student'] } }).lean();
    if (mongoStudents && mongoStudents.length > 0) {
      studentsList = mongoStudents.map(s => ({
        id: s.customId || s._id.toString(),
        name: s.name,
        type: s.role === 'deaf_student' ? 'deaf' : 'blind',
        avatar: s.avatar || (s.role === 'deaf_student' ? '🤟' : '👁️'),
        school: s.school || 'Inclusive School',
        grade: s.grade || 'Grade 10',
        completedLessons: 0,
        signAccuracyAvg: 0
      }));
    }
  } catch (e) {}

  res.json({
    success: true,
    stats: {
      totalLessons: lessonsList.length,
      activeStudents: studentsList.length,
      avgDeafSignAccuracy: 0,
      avgBlindQuizScore: 0
    },
    students: studentsList,
    inbox: messagesList,
    recentLessons: lessonsList.slice(0, 5)
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎓 InclusiveAI Content Engine running on http://localhost:${PORT}`);
  console.log(`   - Allowed CORS Origin: ${FRONTEND_ORIGIN}`);
  console.log(`   - Extraction & Validation: Active (pdf-parse-fork / 10MB limit)`);
  console.log(`   - ISL Sign & MediaPipe CV: Active`);
  console.log(`   - Haptic Diagram & Voice UI: Active`);
  console.log(`=======================================================`);
});
