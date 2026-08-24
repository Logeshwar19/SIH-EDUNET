/**
 * MASTER TEST SUITE — InclusiveAI ISL Recognition & Lesson Retrieval
 * Tests Model Adapter, Model Modes, Preprocessing, Normalization,
 * Temporal State Machine, Dynamic Sequence Buffering, Semantic Normalization,
 * Active Lesson Vector Matching, Current Lesson Isolation, and Regression.
 */

import { ISL_VOCABULARY, ISL_PIPELINE_CONFIG } from './client/src/data/islVocabulary.js';
import { 
  normalizeHandLandmarks, 
  extractMultiHandFeatures, 
  classifyStaticSign, 
  classifyDynamicSequenceHeuristic,
  ISLDynamicSequenceBuffer,
  recognizeISL, 
  ISLSignStateMachine 
} from './client/src/services/islClassifier.js';
import { 
  ISLModelAdapter, 
  MODEL_MODES, 
  ABS6187_METADATA 
} from './client/src/services/islModelAdapter.js';
import { 
  normalizeGlossToMeaning, 
  matchSignToLesson 
} from './client/src/services/semanticMatcher.js';

// Synthetic Landmark Helpers
function generateHandLandmarks({
  wrist = { x: 0.5, y: 0.6, z: 0 },
  fingersCurled = false,
  allExtended = false
}) {
  const points = [{ x: wrist.x, y: wrist.y, z: wrist.z || 0 }];
  points.push({ x: wrist.x - 0.04, y: wrist.y - 0.04, z: 0 });
  points.push({ x: wrist.x - 0.07, y: wrist.y - 0.08, z: 0 });
  points.push({ x: wrist.x - 0.09, y: wrist.y - 0.12, z: 0 });
  points.push({ x: wrist.x - 0.11, y: wrist.y - 0.15, z: 0 });

  const bases = [
    { x: wrist.x - 0.04, y: wrist.y - 0.12 },
    { x: wrist.x, y: wrist.y - 0.14 },
    { x: wrist.x + 0.03, y: wrist.y - 0.12 },
    { x: wrist.x + 0.06, y: wrist.y - 0.10 }
  ];

  bases.forEach((base) => {
    const tipDy = fingersCurled ? 0.04 : (allExtended ? -0.10 : -0.06);
    points.push({ x: base.x, y: base.y, z: 0 });
    points.push({ x: base.x, y: base.y + tipDy * 0.4, z: 0 });
    points.push({ x: base.x, y: base.y + tipDy * 0.7, z: 0 });
    points.push({ x: base.x, y: base.y + tipDy, z: 0 });
  });

  return points;
}

// Sample Lessons for Testing Lesson Isolation
const sampleHeartLesson = {
  id: "lesson-heart-anatomy",
  title: "The Human Heart & Circulatory System — Grade 10",
  summary: "Comprehensive biology lesson covering the four chambers of the human heart and the cardiac pumping cycle.",
  bviModule: {
    audioSections: [
      {
        sectionTitle: "Section 1: Heart Anatomy & Four Chambers",
        content: "The human heart is a muscular organ comprising four distinct chambers: the right atrium, right ventricle, left atrium, and left ventricle."
      },
      {
        sectionTitle: "Section 2: Cardiac Pumping Mechanism",
        content: "The heart functions as a muscular pump, contracting rhythmically to circulate deoxygenated blood to the lungs and pump oxygenated blood through the aorta."
      }
    ]
  }
};

const samplePlantLesson = {
  id: "lesson-photosynthesis",
  title: "Photosynthesis & Plant Cell Biology — Grade 9",
  summary: "Curriculum study of plant cellular structure and light absorption.",
  bviModule: {
    audioSections: [
      {
        sectionTitle: "Section 1: Plant Cell Wall & Chloroplasts",
        content: "Plant cells contain chloroplasts filled with chlorophyll that capture radiant sunlight energy to produce glucose."
      }
    ]
  }
};

let passed = 0;
let total = 0;

function assert(condition, name) {
  total++;
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name}`);
  }
}

console.log("\n================================================================================");
console.log("🧪 INCLUSIVEAI MASTER TEST SUITE: ISL RECOGNITION & LESSON SEMANTIC RETRIEVAL");
console.log("================================================================================\n");

// 1. Model Adapter & Metadata Verification
console.log("Group 1: ISL Model Adapter, Vocabulary & Checkpoint Inspection");
{
  const adapter = new ISLModelAdapter();
  assert(adapter !== null, "ISLModelAdapter initializes cleanly");
  assert(ABS6187_METADATA.repoId === "Abs6187/isl-models", "Abs6187 repository correctly referenced");
  assert(ABS6187_METADATA.supportedVocabulary.length === 8, "Abs6187 checkpoint vocabulary (8 classes) accurately documented");
  
  const vocab = adapter.getVocabulary();
  assert(vocab.length >= 6, `Combined vocabulary loaded (${vocab.length} signs)`);
  assert(vocab.some(v => v.id === "heart"), "Curriculum sign 'heart' present in lexicon");
  assert(vocab.some(v => v.id === "pump"), "Curriculum sign 'pump' present in lexicon");
}

// 2. Normalization & Geometric Invariance
console.log("\nGroup 2: Landmark Preprocessing & Normalization");
{
  const rawHand = generateHandLandmarks({ wrist: { x: 0.4, y: 0.6 } });
  const norm = normalizeHandLandmarks(rawHand);
  assert(norm.normalizedPoints.length === 21, "Hand normalized into 21 3D coordinates");
  assert(Math.abs(norm.normalizedPoints[0].x) < 0.001, "Wrist shifted to origin (0, 0)");
  assert(norm.palmScale > 0.05, "Palm scale reference computed");
}

// 3. Static Signs Recognition (HEART, PLANT, TEACHER)
console.log("\nGroup 3: Static Sign Recognition");
{
  const heartHand = generateHandLandmarks({ wrist: { x: 0.45, y: 0.55 }, fingersCurled: true });
  const heartFeats = extractMultiHandFeatures([heartHand]);
  const candidates = classifyStaticSign(heartFeats);
  assert(candidates.length > 0 && candidates[0].id === 'heart', "HEART recognized via static geometric classifier");

  const teacherHand = generateHandLandmarks({ wrist: { x: 0.45, y: 0.30 }, allExtended: true });
  const teacherFeats = extractMultiHandFeatures([teacherHand]);
  const teacherCandidates = classifyStaticSign(teacherFeats);
  assert(teacherCandidates.length > 0 && teacherCandidates[0].id === 'teacher', "TEACHER recognized via static geometric classifier");
}

// 4. Dynamic Sequence Buffer & Recognition (PUMP, SCIENCE, STUDENT)
console.log("\nGroup 4: Dynamic 30-Frame Sequence Modeling");
{
  const buffer = new ISLDynamicSequenceBuffer(30);
  for (let i = 0; i < 30; i++) {
    const h1 = generateHandLandmarks({ wrist: { x: 0.35, y: 0.50 }, fingersCurled: true });
    const h2 = generateHandLandmarks({ wrist: { x: 0.65, y: 0.50 }, fingersCurled: true });
    const feats = extractMultiHandFeatures([h1, h2]);
    buffer.pushFrame(feats, Date.now() + i * 33);
  }

  assert(buffer.length === 30, "Dynamic sequence buffer maintains 30 frames");
  const pumpFeats = extractMultiHandFeatures([
    generateHandLandmarks({ wrist: { x: 0.35, y: 0.50 }, fingersCurled: true }),
    generateHandLandmarks({ wrist: { x: 0.65, y: 0.50 }, fingersCurled: true })
  ]);
  const pumpCand = classifyDynamicSequenceHeuristic(buffer, pumpFeats);
  assert(pumpCand.length > 0 && pumpCand[0].id === 'pump', "PUMP recognized via dynamic sequence evaluator");
}

// 5. Temporal State Machine & Duplicate Prevention
console.log("\nGroup 5: Temporal State Machine Stabilization");
{
  const sm = new ISLSignStateMachine(ISL_PIPELINE_CONFIG);
  const signPred = { isKnown: true, id: "pump", word: "Pump", confidence: 92 };

  const f1 = sm.processFrame(signPred);
  assert(f1.event === "DETECTING", "Frame 1 in DETECTING state");

  const f2 = sm.processFrame(signPred);
  assert(f2.event === "DETECTING", "Frame 2 in DETECTING state");

  const f3 = sm.processFrame(signPred);
  assert(f3.event === "COMMITTED" && f3.stableSign.id === "pump", "Frame 3 transitions to COMMITTED");

  const f4 = sm.processFrame(signPred);
  assert(f4.event === "HOLDING", "Continued holding sign produces HOLDING (no duplicate commit spam)");
}

// 6. Sign Gloss -> Semantic Meaning Normalization
console.log("\nGroup 6: Semantic Meaning Normalization Layer");
{
  const pumpNorm = normalizeGlossToMeaning("PUMP");
  assert(pumpNorm !== null && pumpNorm.canonicalTerm === "pump", "PUMP normalizes to canonicalTerm 'pump'");
  assert(pumpNorm.concepts.some(c => c.includes("blood pumping") || c.includes("pumping")), "PUMP expands to blood pumping concepts");

  const heartNorm = normalizeGlossToMeaning("HEART");
  assert(heartNorm !== null && heartNorm.canonicalTerm === "heart", "HEART normalizes to canonicalTerm 'heart'");
  assert(heartNorm.concepts.some(c => c.includes("cardiac") || c.includes("organ")), "HEART expands to cardiac organ concepts");

  const arbitraryNorm = normalizeGlossToMeaning("CUSTOM_CONCEPT");
  assert(arbitraryNorm !== null && arbitraryNorm.canonicalTerm === "custom concept", "Uncatalogued gloss safely normalizes to generic concept");
}

// 7. Active Lesson Vector Search & Current Lesson Isolation
console.log("\nGroup 7: Lesson Semantic Retrieval & Current Lesson Isolation");
{
  // Test 1: PUMP against Heart Lesson -> MATCH
  const pumpMatch = matchSignToLesson("PUMP", sampleHeartLesson);
  assert(pumpMatch.matched === true, "PUMP matches Heart Lesson content");
  assert(pumpMatch.score > 0.50, `PUMP match score is real positive cosine similarity (${pumpMatch.score})`);
  assert(pumpMatch.chunk.includes("pump"), "Matched chunk comes from real uploaded lesson text");
  assert(pumpMatch.section.includes("Section 2"), "Matched chunk points to Section 2");

  // Test 2: HEART against Heart Lesson -> MATCH
  const heartMatch = matchSignToLesson("HEART", sampleHeartLesson);
  assert(heartMatch.matched === true, "HEART matches Heart Lesson content");
  assert(heartMatch.chunk.includes("muscular organ") || heartMatch.chunk.includes("chambers"), "HEART matches anatomical chamber text");

  // Test 3: PLANT against Heart Lesson -> NO MATCH (Lesson Isolation)
  const plantOnHeart = matchSignToLesson("PLANT", sampleHeartLesson);
  assert(plantOnHeart.matched === false, "PLANT does NOT match Heart Lesson (Correct lesson isolation)");
  assert(plantOnHeart.score < 0.40, `Unrelated sign receives low similarity score (${plantOnHeart.score})`);

  // Test 4: PLANT against Plant Lesson -> MATCH
  const plantOnPlant = matchSignToLesson("PLANT", samplePlantLesson);
  assert(plantOnPlant.matched === true, "PLANT matches Plant/Photosynthesis Lesson");
  assert(plantOnPlant.chunk.includes("chloroplasts") || plantOnPlant.chunk.includes("Plant cells"), "PLANT matches photosynthesis chunk");

  // Test 5: Empty Lesson Graceful Handling
  const emptyMatch = matchSignToLesson("HEART", { id: "empty", title: "Empty", bviModule: {} });
  assert(emptyMatch.matched === false, "Empty lesson returns matched: false without throwing");
}

// 8. End-to-End Adapter Predict & Semantic Integration
console.log("\nGroup 8: Unified Adapter Predict & Semantic Bridge Integration");
async function testAdapterE2E() {
  const adapter = new ISLModelAdapter();
  await adapter.load();

  // Single dominant hand for HEART
  const heartHand = generateHandLandmarks({ wrist: { x: 0.45, y: 0.55 }, fingersCurled: true });
  const result = await adapter.predict([heartHand], [{ label: "Right", score: 0.95 }], sampleHeartLesson);

  assert(result.recognition !== null && result.recognition.isKnown === true, "Adapter returns valid recognition payload");
  assert(result.recognition.word.toLowerCase() === "heart", "Adapter recognizes sign 'Heart'");
  assert(result.lessonMatch !== null && result.lessonMatch.matched === true, "Adapter attaches active lesson semantic match");
  assert(result.lessonMatch.scorePercent > 50, `Semantic match score: ${result.lessonMatch.scorePercent}%`);
}

await testAdapterE2E();

console.log("\n================================================================================");
console.log(`📊 MASTER TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed/total)*100)}%)`);
console.log("================================================================================\n");

if (passed !== total) {
  process.exit(1);
}
