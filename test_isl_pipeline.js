/**
 * Comprehensive ISL Hybrid Pipeline Test Suite
 * Tests Landmark Normalization, Static Geometric Classifier,
 * 30-Frame Dynamic Sequence Buffer, 126-Dim Tensor Flattening,
 * ONNX Dynamic Sequence Classifier & Fallback, Unified Hybrid Router (recognizeISL),
 * Unknown Rejection, and Temporal State Machine.
 */

import { ISL_VOCABULARY, ISL_PIPELINE_CONFIG } from './client/src/data/islVocabulary.js';
import { 
  normalizeHandLandmarks, 
  extractMultiHandFeatures, 
  classifyStaticSign,
  classifyDynamicSequenceHeuristic,
  ISLDynamicSequenceBuffer,
  recognizeISL,
  getModelMode,
  ISLSignStateMachine 
} from './client/src/services/islClassifier.js';

// Helper to generate synthetic 21-landmark hand coordinates
function generateHandLandmarks({
  wrist = { x: 0.5, y: 0.6, z: 0 },
  middleMCP = { x: 0.5, y: 0.45, z: 0 },
  fingersCurled = false,
  allExtended = false
}) {
  const points = [];
  // 0: Wrist
  points.push({ x: wrist.x, y: wrist.y, z: wrist.z || 0 });

  // 1-4: Thumb
  points.push({ x: wrist.x - 0.04, y: wrist.y - 0.04, z: 0 });
  points.push({ x: wrist.x - 0.07, y: wrist.y - 0.08, z: 0 });
  points.push({ x: wrist.x - 0.09, y: wrist.y - 0.12, z: 0 });
  points.push({ x: wrist.x - 0.11, y: wrist.y - 0.15, z: 0 });

  // Fingers: Index (5-8), Middle (9-12), Ring (13-16), Pinky (17-20)
  const bases = [
    { x: wrist.x - 0.04, y: wrist.y - 0.12 }, // 5: Index MCP
    { x: middleMCP.x, y: middleMCP.y },       // 9: Middle MCP
    { x: wrist.x + 0.03, y: wrist.y - 0.12 }, // 13: Ring MCP
    { x: wrist.x + 0.06, y: wrist.y - 0.10 }  // 17: Pinky MCP
  ];

  bases.forEach((base, i) => {
    const tipDy = fingersCurled ? 0.04 : (allExtended ? -0.10 : -0.06);
    points.push({ x: base.x, y: base.y, z: 0 }); // MCP
    points.push({ x: base.x, y: base.y + tipDy * 0.4, z: 0 }); // PIP
    points.push({ x: base.x, y: base.y + tipDy * 0.7, z: 0 }); // DIP
    points.push({ x: base.x, y: base.y + tipDy, z: 0 }); // TIP
  });

  return points;
}

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

console.log("\n============================================================");
console.log("🧪 HYBRID ISL PIPELINE TEST SUITE (Static + Dynamic ONNX GRU)");
console.log("============================================================\n");

// 1. Landmark Normalization & Invariance Test
console.log("Test Suite 1: Landmark Normalization & Invariance");
{
  const rawHand1 = generateHandLandmarks({ wrist: { x: 0.3, y: 0.7, z: 0 } });
  const rawHand2 = generateHandLandmarks({ wrist: { x: 0.8, y: 0.2, z: 0 } });

  const norm1 = normalizeHandLandmarks(rawHand1);
  const norm2 = normalizeHandLandmarks(rawHand2);

  assert(norm1 !== null && norm1.normalizedPoints.length === 21, "Normalized hand produces 21 normalized landmarks");
  assert(Math.abs(norm1.normalizedPoints[0].x) < 0.001 && Math.abs(norm1.normalizedPoints[0].y) < 0.001, "Wrist is shifted to origin (0, 0)");
  assert(norm1.palmScale > 0.05, "Palm scale is non-zero reference span");
  assert(typeof norm1.isExtended === 'object', "Finger extension states computed");
}

// 2. Dual-Hand Feature Extraction
console.log("\nTest Suite 2: Dual-Hand Feature Extraction & Missing Hand Handling");
{
  const leftHand = generateHandLandmarks({ wrist: { x: 0.35, y: 0.5, z: 0 } });
  const rightHand = generateHandLandmarks({ wrist: { x: 0.65, y: 0.5, z: 0 } });

  const singleFeatures = extractMultiHandFeatures([leftHand], [{ label: "Left", score: 0.96 }]);
  const dualFeatures = extractMultiHandFeatures([leftHand, rightHand], [{ label: "Left", score: 0.96 }, { label: "Right", score: 0.94 }]);
  const emptyFeatures = extractMultiHandFeatures([], []);

  assert(singleFeatures.handsCount === 1 && singleFeatures.dominantHand !== null, "Single hand correctly extracted");
  assert(dualFeatures.handsCount === 2 && dualFeatures.dualHandSeparation > 0.2, "Dual hands separation calculated correctly");
  assert(emptyFeatures.handsCount === 0 && emptyFeatures.dominantHand === null, "Empty frame gracefully returns 0 hands");
}

// 3. Static Signs Geometric Classification (HEART, PLANT, TEACHER)
console.log("\nTest Suite 3: Static Sign Geometric Recognition");
{
  // Heart (1 hand over chest, curled)
  const heartHand = generateHandLandmarks({ wrist: { x: 0.45, y: 0.55, z: 0 }, fingersCurled: true });
  const heartFeats = extractMultiHandFeatures([heartHand]);
  const heartCandidates = classifyStaticSign(heartFeats);
  assert(heartCandidates.length > 0 && heartCandidates[0].id === 'heart' && heartCandidates[0].source === 'geometric', "HEART recognized via static geometric classifier");

  // Teacher (Hand near temple/forehead)
  const teacherHand = generateHandLandmarks({ wrist: { x: 0.45, y: 0.30, z: 0 }, allExtended: true });
  const teacherFeats = extractMultiHandFeatures([teacherHand]);
  const teacherCandidates = classifyStaticSign(teacherFeats);
  assert(teacherCandidates.length > 0 && teacherCandidates[0].id === 'teacher' && teacherCandidates[0].type === 'static', "TEACHER recognized via static geometric classifier");

  // Plant (1 hand with opening fingers)
  const plantHand = generateHandLandmarks({ wrist: { x: 0.50, y: 0.60, z: 0 }, allExtended: true });
  const plantFeats = extractMultiHandFeatures([plantHand]);
  const plantCandidates = classifyStaticSign(plantFeats);
  assert(plantCandidates.length > 0 && plantCandidates[0].id === 'plant', "PLANT recognized via static geometric classifier");
}

// 4. Dynamic 30-Frame Sequence Buffer & Tensor Data Formatting
console.log("\nTest Suite 4: Dynamic 30-Frame Sequence Buffer & Tensor Flattening");
{
  const buffer = new ISLDynamicSequenceBuffer(30);

  // Push 30 frames simulating upward motion (Student)
  for (let i = 0; i < 30; i++) {
    const yPos = 0.65 - (i / 30) * 0.30;
    const hand = generateHandLandmarks({ wrist: { x: 0.5, y: yPos, z: 0 } });
    const feats = extractMultiHandFeatures([hand]);
    buffer.pushFrame(feats, Date.now() + i * 33);
  }

  assert(buffer.length === 30, "Sequence buffer maintains exactly 30 frames");

  const tensorData = buffer.getFlattenedTensorData();
  assert(tensorData instanceof Float32Array && tensorData.length === 30 * 126, "Flattened tensor data is Float32Array of length 3780 (30 x 126)");

  const dynamics = buffer.computeDynamics();
  assert(dynamics.isSufficient === true, "Buffer has sufficient frames for trajectory analysis");
  assert(dynamics.verticalDisplacement < -0.20, `Upward trajectory detected (deltaY: ${dynamics.verticalDisplacement.toFixed(2)})`);

  // Test timeout reset
  const emptyFeats = extractMultiHandFeatures([], []);
  buffer.pushFrame(emptyFeats, Date.now() + 1000 + ISL_PIPELINE_CONFIG.NO_HAND_TIMEOUT_MS);
  assert(buffer.length === 0, "Buffer resets automatically when tracking lost > 500ms");
}

// 5. Dynamic Sequence Recognition (PUMP, SCIENCE, STUDENT)
console.log("\nTest Suite 5: Dynamic Sequence Classification");
{
  // Test PUMP (30 frames of dual fists)
  const pumpBuffer = new ISLDynamicSequenceBuffer(30);
  for (let i = 0; i < 30; i++) {
    const h1 = generateHandLandmarks({ wrist: { x: 0.35, y: 0.50, z: 0 }, fingersCurled: true });
    const h2 = generateHandLandmarks({ wrist: { x: 0.65, y: 0.50, z: 0 }, fingersCurled: true });
    const feats = extractMultiHandFeatures([h1, h2]);
    pumpBuffer.pushFrame(feats, Date.now() + i * 33);
  }

  const pumpFeats = extractMultiHandFeatures([
    generateHandLandmarks({ wrist: { x: 0.35, y: 0.50, z: 0 }, fingersCurled: true }),
    generateHandLandmarks({ wrist: { x: 0.65, y: 0.50, z: 0 }, fingersCurled: true })
  ]);
  const pumpCandidates = classifyDynamicSequenceHeuristic(pumpBuffer, pumpFeats);
  assert(pumpCandidates.length > 0 && pumpCandidates[0].id === 'pump', "PUMP recognized via sequence classifier");

  // Test STUDENT (30 frames of upward translation)
  const studentBuffer = new ISLDynamicSequenceBuffer(30);
  for (let i = 0; i < 30; i++) {
    const yPos = 0.60 - (i / 30) * 0.25;
    const hand = generateHandLandmarks({ wrist: { x: 0.5, y: yPos, z: 0 } });
    const feats = extractMultiHandFeatures([hand]);
    studentBuffer.pushFrame(feats, Date.now() + i * 33);
  }

  const studentFeats = extractMultiHandFeatures([generateHandLandmarks({ wrist: { x: 0.5, y: 0.40, z: 0 } })]);
  const studentCandidates = classifyDynamicSequenceHeuristic(studentBuffer, studentFeats);
  assert(studentCandidates.length > 0 && studentCandidates[0].id === 'student' && studentCandidates[0].type === 'dynamic', "STUDENT recognized via sequence classifier");
}

// 6. Unified Hybrid Router (recognizeISL) & Model Mode
console.log("\nTest Suite 6: Unified Hybrid Router & Model Mode");
{
  const hybridBuffer = new ISLDynamicSequenceBuffer(30);

  // Test Known Static Sign (Heart)
  const heartHand = generateHandLandmarks({ wrist: { x: 0.45, y: 0.55, z: 0 }, fingersCurled: true });
  const heartPred = recognizeISL([heartHand], [{ label: "Right", score: 0.95 }], hybridBuffer);
  assert(heartPred.isKnown === true && heartPred.id === 'heart' && heartPred.source === 'geometric', `Heart predicted with type=${heartPred.type}, source=${heartPred.source}`);
  assert(typeof heartPred.modelMode === 'string', `Prediction contains explicit modelMode: ${heartPred.modelMode}`);

  // Test Dynamic Sign Override
  const dynamicOverride = [{ id: "pump", score: 0.96, type: "dynamic", source: "sequence_gru_onnx" }];
  const dualHand1 = generateHandLandmarks({ wrist: { x: 0.35, y: 0.50, z: 0 }, fingersCurled: true });
  const dualHand2 = generateHandLandmarks({ wrist: { x: 0.65, y: 0.50, z: 0 }, fingersCurled: true });
  const pumpPred = recognizeISL([dualHand1, dualHand2], [{ label: "Left", score: 0.95 }, { label: "Right", score: 0.95 }], hybridBuffer, dynamicOverride);
  assert(pumpPred.isKnown === true && pumpPred.id === 'pump' && pumpPred.source === 'sequence_gru_onnx', "Dynamic ONNX candidate routed successfully through unified prediction");

  // Test Unknown Off-Frame Gesture
  const unknownHand = generateHandLandmarks({ wrist: { x: 0.95, y: 0.95, z: 0 } });
  const unknownPred = recognizeISL([unknownHand], [{ label: "Right", score: 0.95 }], hybridBuffer);
  assert(unknownPred.isKnown === false && unknownPred.id === 'unknown', "Out-of-frame gesture rejected as isKnown: false");
}

// 7. Unified Temporal State Machine & Duplicate Prevention
console.log("\nTest Suite 7: Temporal State Machine & Duplicate Prevention");
{
  const sm = new ISLSignStateMachine(ISL_PIPELINE_CONFIG);

  const teacherPred = {
    isKnown: true,
    id: "teacher",
    word: "Teacher",
    type: "static",
    source: "geometric",
    confidence: 94
  };

  // Frame 1: Detecting
  const r1 = sm.processFrame(teacherPred);
  assert(r1.event === "DETECTING", "Frame 1 in DETECTING state");

  // Frame 2: Detecting
  const r2 = sm.processFrame(teacherPred);
  assert(r2.event === "DETECTING", "Frame 2 in DETECTING state");

  // Frame 3: Committed (Threshold = 3)
  const r3 = sm.processFrame(teacherPred);
  assert(r3.event === "COMMITTED" && r3.stableSign.id === "teacher", "Frame 3 transitioned to COMMITTED for TEACHER");

  // Frame 4 & 5: Holding (No duplicate commit event!)
  const r4 = sm.processFrame(teacherPred);
  assert(r4.event === "HOLDING" && r4.state === "HOLDING", "Holding sign prevents duplicate commit events (HOLDING)");

  const r5 = sm.processFrame(teacherPred);
  assert(r5.event === "HOLDING", "Continued hold maintains HOLDING state without duplicate spam");
}

console.log("\n============================================================");
console.log(`📊 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed/total)*100)}%)`);
console.log("============================================================\n");

if (passed !== total) {
  process.exit(1);
}
