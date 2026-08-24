# UPLOAD ONCE → LEARN WITHOUT BARRIERS
### AI-Powered Inclusive Education Platform — End-to-End Build Guide

---

## 1. Problem

Classroom content — PDFs, slides, textbook pages — is built for students who can see and hear normally. Deaf and blind students are left out unless someone manually re-creates that same lesson: an interpreter re-signs it, or a volunteer re-narrates it. That doesn't scale past a handful of students.

## 2. Solution

Teacher uploads **one lesson file**. A shared AI Content Engine reads and understands it once, then automatically produces two accessible experiences from that single source:

- **Deaf/HoH module** — sign-language playback + gesture practice
- **Blind module** — audio narration + haptic diagram exploration

One upload, multiple accessible outputs, one teacher dashboard.

## 3. Architecture

```
TEACHER
  │ uploads PDF / TXT
  ▼
AI CONTENT ENGINE
  extraction (pdf-parse/OCR) → concept detection → diagram lookup → quiz generation
  │
  ├──► DEAF MODULE  ──► ISL sign sequence + gesture scoring ──► Deaf Student
  └──► BLIND MODULE ──► TTS narration + haptic diagram paths ──► Blind Student
                                                                       │
                                    both feed progress back to ──► TEACHER DASHBOARD
```

Both modules consume the **same structured lesson JSON** — that's what makes "upload once" literal in the code, not just the pitch.

## 4. Deaf/HoH Module

- PDF/text extracted once by the shared engine.
- Detected concepts matched against a **limited prototype ISL vocabulary** (Science, Maths, Teacher, Photosynthesis, Heart, Cell, etc.) — each mapped to a sign video/animation asset.
- **Sign practice:** camera → MediaPipe hand landmarks → compared against a reference pattern → accuracy score.
- **Sign → Text:** same recognition pipeline in reverse, pushes recognized word to the teacher's live feed.
- Honest scope: isolated-sign recognition on a small fixed vocabulary, not continuous free ISL translation.

## 5. Blind Module

- Lesson text read aloud via Web Speech API (TTS).
- Diagrams get a plain-language description (rule-based/LLM) read aloud.
- Voice navigation: fixed command set — "next page," "repeat," "explain diagram," "start quiz."
- Voice quiz: Speech-to-Text → keyword/semantic match against accepted answers.
- Vibration API gives correct/incorrect and navigation cues.

## 6. Haptic Diagram Learning (key feature)

- Teacher uploads a diagram (e.g. heart). System looks it up in a **small predefined library** of hand-verified outline coordinates and labeled regions — not live CV parsing of arbitrary images.
- Student traces on touchscreen: on-path → continuous vibration; off-path → vibration stops; inside a labeled region → vibration pulse + audio label ("You are touching the left ventricle").
- Explicitly scoped as a prototype content library (heart, cell, plant, water cycle), not a general "any diagram" claim.

## 7. AI Content Engine (shared backbone)

| Stage | Function |
|---|---|
| Extraction | PDF/text parser (OCR for scans, flagged as future work for prototype) |
| Understanding | Concept/keyword detection, sentence segmentation |
| Vision | Diagram lookup by keyword against predefined library |
| Structuring | One JSON lesson object: `{ text_blocks, concepts, diagrams, quiz_items }` |

## 8. Teacher Dashboard

Upload lessons · create/approve quizzes · view students · track progress · view sign-practice accuracy · view quiz results · set accessibility preferences.

## 9. Student Dashboards

**Deaf:** sign playback, camera practice, sign→text captions, quizzes, progress.
**Blind:** audio playback, diagram narration, haptic explorer, voice nav, voice quiz, progress.

## 10. Tech Stack

Frontend: React.js · Backend: Node.js + Express · DB: MongoDB/Supabase · Storage: Supabase Storage · APIs: Web Speech, Web Camera (`getUserMedia`), Vibration · AI: OCR, NLP, MediaPipe, CV, STT/TTS.

## 11. Real-Life Example

`Class9_Photosynthesis.pdf` uploaded once → Deaf student gets signed lesson + camera practice on leaf/sunlight/oxygen → Blind student gets narrated lesson + haptic leaf cross-section trace → teacher sees both students' results in one dashboard.

## 12. Key Innovation

One content pipeline, two renderers. The haptic diagram path system is the concrete demoable proof — a static diagram becomes something a blind student can spatially explore using just a phone's touchscreen and vibration motor.

## 13. 30-Second Pitch

> "Teachers already spend hours making lessons. We don't ask them to make three versions for three kinds of students. They upload once, and our AI engine automatically produces a sign-language lesson with gesture practice for Deaf students, and an audio-plus-haptic lesson for blind students — where they can literally feel a diagram through vibration and hear what they're touching. One upload. Every student learns the same lesson, their way."

---

## 14. Build Steps — Backend (Node.js + Express)

### 14.1 Init and install

```bash
mkdir inclusive-edu && cd inclusive-edu
mkdir backend frontend
cd backend
npm init -y
npm install express cors multer pdf-parse dotenv
mkdir services uploads
```

### 14.2 `backend/services/signVocabulary.js`

```js
const EDU_VOCAB = [
  { word: 'Science', signAsset: 'science.mp4', definitionKeywords: ['study', 'nature', 'observation'] },
  { word: 'Maths', signAsset: 'maths.mp4', definitionKeywords: ['numbers', 'calculation'] },
  { word: 'Teacher', signAsset: 'teacher.mp4', definitionKeywords: ['instructor', 'educator'] },
  { word: 'Student', signAsset: 'student.mp4', definitionKeywords: ['learner', 'pupil'] },
  { word: 'Question', signAsset: 'question.mp4', definitionKeywords: ['ask', 'query'] },
  { word: 'Answer', signAsset: 'answer.mp4', definitionKeywords: ['response', 'reply'] },
  { word: 'Photosynthesis', signAsset: 'photosynthesis.mp4', definitionKeywords: ['sunlight', 'chlorophyll', 'oxygen', 'glucose'] },
  { word: 'Heart', signAsset: 'heart.mp4', definitionKeywords: ['pump', 'blood', 'ventricle', 'atrium'] },
  { word: 'Cell', signAsset: 'cell.mp4', definitionKeywords: ['nucleus', 'membrane', 'organism'] },
  { word: 'Plant', signAsset: 'plant.mp4', definitionKeywords: ['leaf', 'root', 'stem'] },
];
module.exports = { EDU_VOCAB };
```

### 14.3 `backend/services/diagramLibrary.js`

```js
const DIAGRAM_LIBRARY = {
  heart: {
    id: 'heart',
    label: 'Human Heart Cross-Section',
    triggerKeywords: ['heart', 'ventricle', 'atrium', 'cardiac'],
    outlinePath: [
      { x: 0.50, y: 0.10 }, { x: 0.65, y: 0.15 }, { x: 0.75, y: 0.30 },
      { x: 0.70, y: 0.55 }, { x: 0.55, y: 0.80 }, { x: 0.50, y: 0.90 },
      { x: 0.45, y: 0.80 }, { x: 0.30, y: 0.55 }, { x: 0.25, y: 0.30 },
      { x: 0.35, y: 0.15 }, { x: 0.50, y: 0.10 },
    ],
    regions: [
      { id: 'left_ventricle', label: 'left ventricle', x: 0.40, y: 0.65, radius: 0.08 },
      { id: 'right_ventricle', label: 'right ventricle', x: 0.60, y: 0.65, radius: 0.08 },
      { id: 'left_atrium', label: 'left atrium', x: 0.40, y: 0.30, radius: 0.07 },
      { id: 'right_atrium', label: 'right atrium', x: 0.60, y: 0.30, radius: 0.07 },
    ],
  },
  plant_cell: {
    id: 'plant_cell',
    label: 'Plant Cell Diagram',
    triggerKeywords: ['photosynthesis', 'cell', 'chloroplast', 'leaf'],
    outlinePath: [
      { x: 0.20, y: 0.20 }, { x: 0.80, y: 0.20 }, { x: 0.80, y: 0.80 },
      { x: 0.20, y: 0.80 }, { x: 0.20, y: 0.20 },
    ],
    regions: [
      { id: 'nucleus', label: 'nucleus', x: 0.5, y: 0.5, radius: 0.1 },
      { id: 'chloroplast', label: 'chloroplast', x: 0.3, y: 0.35, radius: 0.07 },
      { id: 'cell_wall', label: 'cell wall', x: 0.2, y: 0.5, radius: 0.05 },
    ],
  },
};
module.exports = { DIAGRAM_LIBRARY };
```

> These are illustrative placeholder coordinates. Before demoing, trace your actual diagram image in an image editor and replace the points with real normalized (0–1) coordinates matching that image.

### 14.4 `backend/services/contentEngine.js`

```js
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { DIAGRAM_LIBRARY } = require('./diagramLibrary');
const { EDU_VOCAB } = require('./signVocabulary');

async function extractText(file) {
  const ext = file.originalname.split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    const buffer = fs.readFileSync(file.path);
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (ext === 'txt') return fs.readFileSync(file.path, 'utf-8');
  if (ext === 'ppt' || ext === 'pptx') {
    throw new Error('PPT parsing not wired up yet — use PDF or TXT for the demo.');
  }
  throw new Error(`Unsupported file type: .${ext}`);
}

function splitIntoBlocks(rawText) {
  return rawText
    .split(/\n{2,}|\.\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(s => s.length > 15)
    .slice(0, 40);
}

function extractConcepts(textBlocks) {
  const joined = textBlocks.join(' ').toLowerCase();
  return EDU_VOCAB.filter(term => joined.includes(term.word.toLowerCase()));
}

function detectDiagrams(textBlocks) {
  const joined = textBlocks.join(' ').toLowerCase();
  return Object.values(DIAGRAM_LIBRARY).filter(d =>
    d.triggerKeywords.some(k => joined.includes(k))
  );
}

function generateQuiz(textBlocks, concepts) {
  return concepts.slice(0, 5).map((c, i) => ({
    id: `q${i + 1}`,
    prompt: `What is ${c.word}?`,
    acceptedAnswerKeywords: c.definitionKeywords,
  }));
}

async function processLesson(file) {
  const rawText = await extractText(file);
  const text_blocks = splitIntoBlocks(rawText);
  const concepts = extractConcepts(text_blocks);
  const diagrams = detectDiagrams(text_blocks);
  const quiz_items = generateQuiz(text_blocks, concepts);
  return { title: file.originalname, text_blocks, concepts, diagrams, quiz_items, processedAt: Date.now() };
}

module.exports = { processLesson };
```

**Note:** `extractConcepts` and `generateQuiz` are keyword-based for prototype speed. Swap them for a real LLM API call (send `text_blocks.join('\n')`, ask for concepts + quiz JSON) if you have API budget/time — the rest of the pipeline doesn't need to change.

### 14.5 `backend/services/deafModule.js`

```js
const { EDU_VOCAB } = require('./signVocabulary');

function getSignSequence(lesson) {
  const sequence = lesson.concepts.map(c => ({ word: c.word, signAsset: c.signAsset }));
  return { lessonTitle: lesson.title, sequence };
}

function evaluateGesture(signWord, landmarkSequence) {
  const known = EDU_VOCAB.find(v => v.word.toLowerCase() === (signWord || '').toLowerCase());
  if (!known) return { accuracy: 0, feedback: 'Unknown sign — not in prototype vocabulary.' };
  if (!Array.isArray(landmarkSequence) || landmarkSequence.length === 0) {
    return { accuracy: 0, feedback: 'No gesture data received.' };
  }
  // Placeholder scorer — swap for DTW comparison against a real reference sequence.
  const frames = landmarkSequence.length;
  const stability = Math.min(1, frames / 30);
  const accuracy = Math.round(stability * 100);
  return {
    accuracy,
    feedback: accuracy > 70 ? 'Good — sign recognized with high confidence.' : 'Partial match — hold the sign steadier.',
  };
}

module.exports = { getSignSequence, evaluateGesture };
```

### 14.6 `backend/services/blindModule.js`

```js
function getHapticDiagram(diagram) {
  return { id: diagram.id, label: diagram.label, outlinePath: diagram.outlinePath, regions: diagram.regions };
}

function evaluateVoiceAnswer(question, spokenAnswer) {
  if (!question) return { correct: false, feedback: 'Question not found.' };
  const answer = (spokenAnswer || '').toLowerCase();
  const hit = question.acceptedAnswerKeywords.some(k => answer.includes(k.toLowerCase()));
  return {
    correct: hit,
    feedback: hit ? 'Correct — nice work.' : `Not quite. Expected: ${question.acceptedAnswerKeywords.join(', ')}.`,
  };
}

module.exports = { getHapticDiagram, evaluateVoiceAnswer };
```

### 14.7 `backend/server.js`

```js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { processLesson } = require('./services/contentEngine');
const { getSignSequence, evaluateGesture } = require('./services/deafModule');
const { getHapticDiagram, evaluateVoiceAnswer } = require('./services/blindModule');

const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const db = { lessons: {}, progress: {} };
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const upload = multer({ dest: uploadDir });

app.post('/api/lessons/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const lesson = await processLesson(req.file);
    const lessonId = 'lesson_' + Date.now();
    db.lessons[lessonId] = lesson;
    res.json({ lessonId, lesson });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process lesson', detail: err.message });
  }
});

app.get('/api/lessons', (req, res) => {
  res.json(Object.entries(db.lessons).map(([id, l]) => ({ id, title: l.title, concepts: l.concepts.length })));
});

app.get('/api/lessons/:id', (req, res) => {
  const lesson = db.lessons[req.params.id];
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  res.json(lesson);
});

app.get('/api/deaf/:lessonId/signs', (req, res) => {
  const lesson = db.lessons[req.params.lessonId];
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  res.json(getSignSequence(lesson));
});

app.post('/api/deaf/practice/evaluate', (req, res) => {
  const { studentId, signWord, landmarkSequence } = req.body;
  const result = evaluateGesture(signWord, landmarkSequence);
  db.progress[studentId] = db.progress[studentId] || { signPractice: [], quizResults: [] };
  db.progress[studentId].signPractice.push({ signWord, accuracy: result.accuracy, at: Date.now() });
  res.json(result);
});

app.post('/api/deaf/sign-to-text', (req, res) => {
  const { studentId, recognizedWord } = req.body;
  res.json({ studentId, text: recognizedWord, timestamp: Date.now() });
});

app.get('/api/blind/:lessonId/content', (req, res) => {
  const lesson = db.lessons[req.params.lessonId];
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  res.json({
    narration: lesson.text_blocks,
    diagrams: lesson.diagrams.map(getHapticDiagram),
    quiz: lesson.quiz_items,
  });
});

app.post('/api/blind/quiz/evaluate', (req, res) => {
  const { studentId, questionId, spokenAnswer, lessonId } = req.body;
  const lesson = db.lessons[lessonId];
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  const question = lesson.quiz_items.find(q => q.id === questionId);
  const result = evaluateVoiceAnswer(question, spokenAnswer);
  db.progress[studentId] = db.progress[studentId] || { signPractice: [], quizResults: [] };
  db.progress[studentId].quizResults.push({ questionId, correct: result.correct, at: Date.now() });
  res.json(result);
});

app.get('/api/teacher/progress/:studentId', (req, res) => {
  res.json(db.progress[req.params.studentId] || { signPractice: [], quizResults: [] });
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
```

### 14.8 Run it

```bash
node server.js
# → Inclusive Ed backend running on http://localhost:4000
```

Test the upload with a sample PDF:

```bash
curl -F "file=@sample_lesson.pdf" http://localhost:4000/api/lessons/upload
```

---

## 15. Build Steps — Frontend (React)

```bash
cd ../frontend
npx create-react-app .
npm install axios
```

### 15.1 Teacher upload component (`src/TeacherUpload.js`)

```jsx
import { useState } from 'react';
import axios from 'axios';

export default function TeacherUpload({ onLessonReady }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    setStatus('Processing...');
    const form = new FormData();
    form.append('file', file);
    const res = await axios.post('http://localhost:4000/api/lessons/upload', form);
    setStatus('Done');
    onLessonReady(res.data.lessonId, res.data.lesson);
  };

  return (
    <div>
      <h2>Upload Lesson</h2>
      <input type="file" accept=".pdf,.txt" onChange={e => setFile(e.target.files[0])} />
      <button onClick={handleUpload}>Upload</button>
      <p>{status}</p>
    </div>
  );
}
```

### 15.2 Blind module — TTS narration + voice nav (`src/BlindModule.js`)

```jsx
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function BlindModule({ lessonId }) {
  const [content, setContent] = useState(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    axios.get(`http://localhost:4000/api/blind/${lessonId}/content`).then(r => setContent(r.data));
  }, [lessonId]);

  const speak = (text) => {
    const utter = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utter);
  };

  useEffect(() => {
    if (content) speak(content.narration[index]);
  }, [content, index]);

  const startVoiceNav = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.onresult = (e) => {
      const command = e.results[0][0].transcript.toLowerCase();
      if (command.includes('next')) setIndex(i => Math.min(i + 1, content.narration.length - 1));
      if (command.includes('repeat')) speak(content.narration[index]);
      if (command.includes('explain diagram') && content.diagrams[0]) {
        speak(`This diagram is called ${content.diagrams[0].label}.`);
      }
    };
    recognition.start();
  };

  if (!content) return <p>Loading...</p>;

  return (
    <div>
      <h2>Blind Module</h2>
      <p>{content.narration[index]}</p>
      <button onClick={startVoiceNav}>🎤 Voice Command</button>
      <HapticDiagram diagram={content.diagrams[0]} />
    </div>
  );
}

function HapticDiagram({ diagram }) {
  if (!diagram) return null;

  const handleTouchMove = (e) => {
    const rect = e.target.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) / rect.width;
    const y = (touch.clientY - rect.top) / rect.height;

    const onPath = diagram.outlinePath.some(
      p => Math.hypot(p.x - x, p.y - y) < 0.03
    );
    const region = diagram.regions.find(
      r => Math.hypot(r.x - x, r.y - y) < r.radius
    );

    if (region) {
      navigator.vibrate?.([100, 50, 100]);
      new SpeechSynthesisUtterance(`You are touching the ${region.label}.`);
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(`You are touching the ${region.label}.`));
    } else if (onPath) {
      navigator.vibrate?.(50);
    } else {
      navigator.vibrate?.(0);
    }
  };

  return (
    <div
      onTouchMove={handleTouchMove}
      style={{ width: 300, height: 300, background: '#eee', touchAction: 'none' }}
    >
      <p style={{ textAlign: 'center' }}>{diagram.label} — trace here</p>
    </div>
  );
}
```

### 15.3 Deaf module — sign playback + camera practice (`src/DeafModule.js`)

```jsx
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

export default function DeafModule({ lessonId, studentId }) {
  const [signs, setSigns] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    axios.get(`http://localhost:4000/api/deaf/${lessonId}/signs`).then(r => setSigns(r.data));
  }, [lessonId]);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
  };

  // Real version: run MediaPipe Hands on each video frame to get 21 landmarks/frame,
  // push the resulting sequence to /api/deaf/practice/evaluate.
  const submitPractice = async (signWord, fakeFrameCount) => {
    const landmarkSequence = Array.from({ length: fakeFrameCount }, () => ({}));
    const res = await axios.post('http://localhost:4000/api/deaf/practice/evaluate', {
      studentId, signWord, landmarkSequence,
    });
    alert(`Accuracy: ${res.data.accuracy}% — ${res.data.feedback}`);
  };

  if (!signs) return <p>Loading...</p>;

  return (
    <div>
      <h2>Deaf Module — {signs.lessonTitle}</h2>
      <ul>
        {signs.sequence.map(s => (
          <li key={s.word}>
            {s.word} → <code>{s.signAsset}</code>
            <button onClick={() => submitPractice(s.word, 25)}>Practice</button>
          </li>
        ))}
      </ul>
      <button onClick={startCamera}>Start Camera</button>
      <video ref={videoRef} autoPlay muted width={240} />
    </div>
  );
}
```

> Wire in `@mediapipe/hands` (npm) to replace the fake landmark array with real per-frame hand landmarks before your demo — this stub keeps the UI/API contract working while you build that piece separately.

---

## 16. Demo Script (what to actually show judges)

1. Open Teacher dashboard → upload `Class9_Photosynthesis.pdf`.
2. Show the returned structured lesson JSON (concepts + diagrams detected) — this proves "one engine, one pass."
3. Switch to Deaf student view → play sign sequence → do a live camera practice attempt → show accuracy score.
4. Switch to Blind student view → hear narration → say "explain diagram" → hear description → trace the heart diagram on a touchscreen/phone and feel vibration change near "left ventricle."
5. Return to Teacher dashboard → show both students' progress logged from the same lesson.

## 17. What's Real vs. Placeholder (be upfront with judges)

| Piece | Status in this build |
|---|---|
| PDF/TXT extraction | Real (`pdf-parse`) |
| Concept detection | Real but keyword-based — swap for LLM call for production |
| Diagram haptic paths | Real mechanism, small hand-authored library (not live CV) |
| Gesture accuracy scoring | Placeholder scorer — needs MediaPipe + DTW for real accuracy |
| ISL sign videos | Needs real recorded clips per vocabulary word |
| Voice quiz grading | Real keyword matching — swap for LLM grading for nuance |
| PPT parsing | Not implemented — PDF/TXT only for demo |

Being explicit about this list in your pitch makes the project *more* credible to judges, not less.
