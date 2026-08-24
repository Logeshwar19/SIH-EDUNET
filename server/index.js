import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { processLesson } from './services/contentEngine.js';
import { getSignSequence, evaluateGesture } from './services/deafModule.js';
import { getHapticDiagram, evaluateVoiceAnswer } from './services/blindModule.js';
import { matchSignToLesson, normalizeGlossToMeaning } from './services/semanticMatcher.js';
import { sampleLessons, sampleStudents } from './sampleData.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Fix 6: Restrict CORS to Frontend Origin
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
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

// Fix 5: Add File Upload Validation & Limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only PDF and TXT files allowed'), false);
    }
    cb(null, true);
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

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎓 InclusiveAI Content Engine running on http://localhost:${PORT}`);
  console.log(`   - Allowed CORS Origin: ${FRONTEND_ORIGIN}`);
  console.log(`   - Extraction & Validation: Active (pdf-parse-fork / 10MB limit)`);
  console.log(`   - ISL Sign & MediaPipe CV: Active`);
  console.log(`   - Haptic Diagram & Voice UI: Active`);
  console.log(`=======================================================`);
});
