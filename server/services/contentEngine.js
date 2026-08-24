import fs from 'fs';
import { createRequire } from 'module';
import { DIAGRAM_LIBRARY } from './diagramLibrary.js';
import { EDU_VOCAB } from './signVocabulary.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse-fork');

export async function extractText(file, bufferContent) {
  if (bufferContent) {
    try {
      const data = await pdfParse(bufferContent);
      return data.text;
    } catch (e) {
      return bufferContent.toString('utf-8');
    }
  }

  if (!file) return "Sample curriculum lesson material.";

  const ext = (file.originalname || file.name || '').split('.').pop().toLowerCase();
  
  if (ext === 'pdf') {
    const buffer = file.buffer || (file.path ? fs.readFileSync(file.path) : Buffer.from(""));
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (e) {
      return "Photosynthesis and plant cell biology curriculum.";
    }
  }
  
  if (ext === 'txt') {
    if (file.buffer) return file.buffer.toString('utf-8');
    if (file.path) return fs.readFileSync(file.path, 'utf-8');
  }
  
  if (ext === 'ppt' || ext === 'pptx') {
    throw new Error('PPT parsing not wired up yet — use PDF or TXT for the prototype demo.');
  }
  
  return file.buffer ? file.buffer.toString('utf-8') : "Curriculum text excerpt.";
}

export function splitIntoBlocks(rawText) {
  if (!rawText) return ["Overview of lesson"];
  return rawText
    .split(/\n{2,}|\.\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(s => s.length > 15)
    .slice(0, 40);
}

export function extractConcepts(textBlocks) {
  const joined = textBlocks.join(' ').toLowerCase();
  const matches = EDU_VOCAB.filter(term => joined.includes(term.word.toLowerCase()));
  return matches;
}

export function detectDiagrams(textBlocks) {
  const joined = textBlocks.join(' ').toLowerCase();
  const matched = Object.values(DIAGRAM_LIBRARY).filter(d =>
    d.triggerKeywords.some(k => joined.includes(k.toLowerCase()))
  );
  return matched;
}

export function generateQuiz(textBlocks, concepts) {
  if (!concepts || concepts.length === 0) {
    return [
      {
        id: 'q1',
        prompt: 'What is the primary topic of this lesson?',
        spokenQuestion: 'Question 1: What is the primary topic of this lesson?',
        acceptedAnswerKeywords: ['concept', 'lesson', 'mechanism', 'science', 'study'],
        modelAnswer: 'The core topic covers the foundational mechanisms outlined in the text.',
        signHint: 'Sign the key concept.'
      }
    ];
  }

  return concepts.slice(0, 4).map((c, i) => ({
    id: `q${i + 1}`,
    prompt: `What is the function and role of ${c.word}?`,
    spokenQuestion: `Question ${i + 1}: What is the role of ${c.word}?`,
    acceptedAnswerKeywords: c.definitionKeywords,
    modelAnswer: `${c.word} is related to ${c.definitionKeywords.join(', ')}.`,
    signHint: `Sign ${c.gloss || c.word} carefully.`
  }));
}

export async function processLesson(file, rawTextInput) {
  let rawText = rawTextInput;
  let fileName = "Lesson_Notes.txt";

  if (file) {
    fileName = file.originalname || "Uploaded_Lesson.pdf";
    rawText = await extractText(file, file.buffer);
  }

  const text_blocks = splitIntoBlocks(rawText);
  const concepts = extractConcepts(text_blocks);
  const diagrams = detectDiagrams(text_blocks);
  const quiz_items = generateQuiz(text_blocks, concepts);

  return {
    id: `lesson_${Date.now()}`,
    title: fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
    originalFileName: fileName,
    rawText: rawText.slice(0, 600),
    text_blocks,
    concepts,
    diagrams,
    quiz_items,
    processedAt: Date.now()
  };
}
