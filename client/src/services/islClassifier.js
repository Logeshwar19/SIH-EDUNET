import * as ort from 'onnxruntime-web';
import { ISL_VOCABULARY, ISL_PIPELINE_CONFIG } from '../data/islVocabulary.js';

// Global ONNX Runtime Web Model State
let onnxSession = null;
let modelMode = "HEURISTIC_FALLBACK"; // "REAL_MODEL" | "HEURISTIC_FALLBACK"
let modelLoadingPromise = null;
let modelLoadError = null;
let lastOnnxInferenceDurationMs = 0;

/**
 * Initializes the ONNX Runtime Web GRU Model for browser execution.
 * If model loading succeeds, modelMode is set to "REAL_MODEL".
 * If loading fails or is pending, graceful fallback to "HEURISTIC_FALLBACK" is preserved.
 */
export async function initDynamicONNXModel(modelPath = ISL_PIPELINE_CONFIG.DYNAMIC_MODEL.ONNX_PATH) {
  if (onnxSession) return { status: "READY", mode: "REAL_MODEL" };
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      if (typeof window !== 'undefined' && ort?.env?.wasm) {
        ort.env.wasm.numThreads = 1;
        ort.env.wasm.simd = true;
      }

      const loadPromise = ort.InferenceSession.create(modelPath, {
        executionProviders: ['wasm']
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("ONNX model load timeout (2500ms)")), 2500)
      );

      const session = await Promise.race([loadPromise, timeoutPromise]);

      onnxSession = session;
      modelMode = "REAL_MODEL";
      modelLoadError = null;
      console.log(`[InclusiveAI] ONNX Dynamic GRU Model loaded successfully (${modelPath}) -> MODEL_MODE: REAL_MODEL`);
      return { status: "READY", mode: "REAL_MODEL" };
    } catch (err) {
      console.warn(`[InclusiveAI] ONNX Model load notice: ${err?.message || err}. Preserving fast Heuristic Dynamic Evaluator.`);
      modelMode = "HEURISTIC_FALLBACK";
      modelLoadError = err?.message || String(err);
      return { status: "FALLBACK", mode: "HEURISTIC_FALLBACK", error: modelLoadError };
    }
  })();

  return modelLoadingPromise;
}

export function getModelMode() {
  return modelMode;
}

export function getOnnxInferenceLatency() {
  return lastOnnxInferenceDurationMs;
}

/**
 * Normalizes a single hand's 21 3D landmarks:
 * 1. Translation Invariance: Shifts coordinates relative to wrist landmark (index 0).
 * 2. Scale Invariance: Scales by palm span (wrist [0] to middle MCP [9]).
 * 3. Spatial Metrics: Computes finger curl/extension ratios.
 */
export function normalizeHandLandmarks(landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length < 21) return null;

  const wrist = landmarks[0];
  const middleMCP = landmarks[9];

  const dx = middleMCP.x - wrist.x;
  const dy = middleMCP.y - wrist.y;
  const dz = (middleMCP.z || 0) - (wrist.z || 0);
  const palmScale = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.15;

  const normalizedPoints = landmarks.map(pt => ({
    x: (pt.x - wrist.x) / palmScale,
    y: (pt.y - wrist.y) / palmScale,
    z: ((pt.z || 0) - (wrist.z || 0)) / palmScale,
    rawX: pt.x,
    rawY: pt.y,
    rawZ: pt.z || 0
  }));

  const isExtended = {
    thumb: landmarks[4].y < landmarks[2].y,
    index: landmarks[8].y < landmarks[6].y,
    middle: landmarks[12].y < landmarks[10].y,
    ring: landmarks[16].y < landmarks[14].y,
    pinky: landmarks[20].y < landmarks[18].y
  };

  const extendedCount = Object.values(isExtended).filter(Boolean).length;
  const isFist = extendedCount <= 1;
  const isAllExtended = extendedCount >= 4;

  return {
    normalizedPoints,
    rawWrist: wrist,
    isExtended,
    extendedCount,
    isFist,
    isAllExtended,
    palmScale
  };
}

/**
 * Extracts unified multi-hand features from 1 or 2 detected hands
 */
export function extractMultiHandFeatures(multiHandLandmarks, multiHandedness = []) {
  if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
    return {
      handsCount: 0,
      hands: [],
      dominantHand: null,
      dualHandSeparation: 0,
      heightDifferential: 0
    };
  }

  const hands = multiHandLandmarks.map((h, i) => {
    const label = multiHandedness[i]?.label || (i === 0 ? "Right" : "Left");
    const score = multiHandedness[i]?.score || 0.95;
    const normalized = normalizeHandLandmarks(h);
    if (!normalized) return null;
    return {
      ...normalized,
      label,
      score,
      originalLandmarks: h
    };
  }).filter(h => h !== null);

  let dualHandSeparation = 0;
  let heightDifferential = 0;

  if (hands.length >= 2) {
    const w1 = hands[0].rawWrist;
    const w2 = hands[1].rawWrist;
    const sepX = w1.x - w2.x;
    const sepY = w1.y - w2.y;
    dualHandSeparation = Math.sqrt(sepX * sepX + sepY * sepY);
    heightDifferential = Math.abs(w1.y - w2.y);
  }

  return {
    handsCount: hands.length,
    hands,
    dominantHand: hands[0] || null,
    dualHandSeparation,
    heightDifferential
  };
}

/**
 * Dedicated 30-Frame Rolling Sequence Buffer for Dynamic Sign Recognition
 * Fixed circular length, trajectory analysis, and tracking timeout resets.
 */
export class ISLDynamicSequenceBuffer {
  constructor(maxLength = ISL_PIPELINE_CONFIG.DYNAMIC_SEQUENCE_LENGTH) {
    this.maxLength = maxLength;
    this.frames = [];
    this.lastHandSeenTimestamp = Date.now();
  }

  reset() {
    this.frames = [];
    this.lastHandSeenTimestamp = Date.now();
  }

  pushFrame(features, timestamp = Date.now()) {
    if (features.handsCount === 0 || !features.dominantHand) {
      if (timestamp - this.lastHandSeenTimestamp > ISL_PIPELINE_CONFIG.NO_HAND_TIMEOUT_MS) {
        this.reset();
      }
      return;
    }

    this.lastHandSeenTimestamp = timestamp;

    const leftHand = features.hands.find(h => h.label === "Left") || (features.hands.length === 2 ? features.hands[1] : null);
    const rightHand = features.hands.find(h => h.label === "Right") || (features.hands.length >= 1 ? features.hands[0] : null);

    const snapshot = {
      timestamp,
      handsCount: features.handsCount,
      wrist: { ...features.dominantHand.rawWrist },
      wristLeft: leftHand ? { ...leftHand.rawWrist } : null,
      dualHandSeparation: features.dualHandSeparation,
      heightDifferential: features.heightDifferential,
      extendedCount: features.dominantHand.extendedCount,
      isFist: features.dominantHand.isFist,
      isAllExtended: features.dominantHand.isAllExtended,
      leftNormalizedPoints: leftHand ? leftHand.normalizedPoints : null,
      rightNormalizedPoints: rightHand ? rightHand.normalizedPoints : null
    };

    this.frames.push(snapshot);
    if (this.frames.length > this.maxLength) {
      this.frames.shift();
    }
  }

  get length() {
    return this.frames.length;
  }

  /**
   * Flattens the 30-frame sequence buffer into a 1D Float32Array of shape (1 * 30 * 126)
   * Left Hand: indices 0..62 | Right Hand: indices 63..125 per frame
   */
  getFlattenedTensorData() {
    const data = new Float32Array(30 * 126);
    const numFrames = this.frames.length;

    for (let f = 0; f < 30; f++) {
      // If buffer is partially filled, repeat earliest available frame
      const frameIdx = f < (30 - numFrames) ? 0 : (f - (30 - numFrames));
      const frame = this.frames[frameIdx] || null;
      if (!frame) continue;

      const frameOffset = f * 126;

      // Left hand landmarks (0..62)
      if (frame.leftNormalizedPoints && frame.leftNormalizedPoints.length >= 21) {
        for (let i = 0; i < 21; i++) {
          const pt = frame.leftNormalizedPoints[i];
          data[frameOffset + i * 3 + 0] = pt.x;
          data[frameOffset + i * 3 + 1] = pt.y;
          data[frameOffset + i * 3 + 2] = pt.z || 0.0;
        }
      }

      // Right hand landmarks (63..125)
      if (frame.rightNormalizedPoints && frame.rightNormalizedPoints.length >= 21) {
        for (let i = 0; i < 21; i++) {
          const pt = frame.rightNormalizedPoints[i];
          data[frameOffset + 63 + i * 3 + 0] = pt.x;
          data[frameOffset + 63 + i * 3 + 1] = pt.y;
          data[frameOffset + 63 + i * 3 + 2] = pt.z || 0.0;
        }
      }
    }

    return data;
  }

  computeDynamics() {
    if (this.frames.length < 5) {
      return {
        isSufficient: false,
        verticalDisplacement: 0,
        separationVariance: 0,
        dualHandOscillations: 0,
        fistRatio: 0,
        averageHeightDifferential: 0
      };
    }

    const first = this.frames[0];
    const last = this.frames[this.frames.length - 1];
    const verticalDisplacement = last.wrist.y - first.wrist.y;

    const separations = this.frames.filter(f => f.handsCount === 2).map(f => f.dualHandSeparation);
    let separationVariance = 0;
    if (separations.length > 2) {
      const meanSep = separations.reduce((a, b) => a + b, 0) / separations.length;
      separationVariance = separations.reduce((acc, val) => acc + Math.pow(val - meanSep, 2), 0) / separations.length;
    }

    let dualHandOscillations = 0;
    let prevDiff = 0;
    for (let i = 1; i < this.frames.length; i++) {
      if (this.frames[i].handsCount === 2 && this.frames[i].wristLeft) {
        const diff = this.frames[i].wrist.y - this.frames[i].wristLeft.y;
        if (i > 1 && Math.sign(diff) !== Math.sign(prevDiff) && Math.abs(diff) > 0.02) {
          dualHandOscillations++;
        }
        prevDiff = diff;
      }
    }

    const fistFrames = this.frames.filter(f => f.isFist || f.extendedCount <= 2).length;
    const fistRatio = fistFrames / this.frames.length;

    const heightDiffs = this.frames.filter(f => f.handsCount === 2).map(f => f.heightDifferential);
    const avgHeightDiff = heightDiffs.length > 0 
      ? heightDiffs.reduce((a, b) => a + b, 0) / heightDiffs.length 
      : 0;

    return {
      isSufficient: this.frames.length >= 8,
      verticalDisplacement,
      separationVariance,
      dualHandOscillations,
      fistRatio,
      averageHeightDifferential: avgHeightDiff
    };
  }
}

/**
 * Static Geometric Classifier
 * Evaluates single-frame normalized geometry for static curriculum signs (HEART, PLANT, TEACHER).
 */
export function classifyStaticSign(features) {
  const { handsCount, dominantHand } = features;
  const candidates = [];

  if (handsCount === 0 || !dominantHand) return candidates;

  const wrist = dominantHand.rawWrist;
  const inVisibleFrame = wrist.x >= 0.10 && wrist.x <= 0.90 && wrist.y >= 0.15 && wrist.y <= 0.85;
  if (!inVisibleFrame) return candidates;

  // 1. HEART (Static: Single hand cupped over chest, y ~ 0.35 - 0.80, curled fingers)
  if (handsCount === 1) {
    const inChestRegion = wrist.y >= 0.35 && wrist.y <= 0.80;
    const isCentered = wrist.x >= 0.25 && wrist.x <= 0.75;
    const fingersCurled = !dominantHand.isAllExtended;

    let score = 0;
    if (inChestRegion) score += 0.40;
    if (isCentered) score += 0.15;
    if (fingersCurled) score += 0.35;
    if (dominantHand.extendedCount >= 1 && dominantHand.extendedCount <= 3) score += 0.06;

    if (score > 0.40) {
      candidates.push({
        id: "heart",
        score: Math.min(0.96, score),
        type: "static",
        source: "geometric"
      });
    }
  }

  // 2. PLANT (Static: Single hand with open fingers pointing upward, mid-to-lower elevation, y >= 0.45)
  if (handsCount === 1) {
    const inPlantRegion = wrist.y >= 0.45 && wrist.y <= 0.80;
    const isCentered = wrist.x >= 0.25 && wrist.x <= 0.75;
    const allExtended = dominantHand.isAllExtended;

    let score = 0;
    if (allExtended) score += 0.50;
    if (inPlantRegion) score += 0.30;
    if (isCentered) score += 0.14;

    if (score > 0.40) {
      candidates.push({
        id: "plant",
        score: Math.min(0.94, score),
        type: "static",
        source: "geometric"
      });
    }
  }

  // 3. TEACHER (Static: High elevation near temple / forehead, y < 0.42)
  if (handsCount >= 1) {
    const nearTemple = wrist.y < 0.42;
    const nearHeadHeight = wrist.y < 0.36;

    let score = 0;
    if (nearTemple) score += 0.55;
    if (nearHeadHeight) score += 0.38;

    if (score > 0.40) {
      candidates.push({
        id: "teacher",
        score: Math.min(0.95, score),
        type: "static",
        source: "geometric"
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

/**
 * Heuristic Dynamic Sequence Evaluator (Fallback Mode)
 */
export function classifyDynamicSequenceHeuristic(sequenceBuffer, currentFeatures) {
  const candidates = [];
  const dynamics = sequenceBuffer.computeDynamics();
  const { handsCount, hands, dualHandSeparation, heightDifferential } = currentFeatures;

  // 1. PUMP (Dual fists pulsing in rhythm over 30 frames)
  if (handsCount >= 2) {
    const h1Fist = hands[0]?.isFist || hands[0]?.extendedCount <= 3;
    const h2Fist = hands[1]?.isFist || hands[1]?.extendedCount <= 3;
    const properSeparation = dualHandSeparation >= 0.08 && dualHandSeparation <= 0.85;
    const symmetricHeight = heightDifferential < 0.30;

    let score = 0;
    if (h1Fist && h2Fist) score += 0.50;
    else if (h1Fist || h2Fist) score += 0.30;
    if (properSeparation) score += 0.25;
    if (symmetricHeight) score += 0.15;
    if (dynamics.fistRatio >= 0.50) score += 0.15;

    if (score > 0.35) {
      candidates.push({
        id: "pump",
        score: Math.min(0.97, score),
        type: "dynamic",
        source: "sequence_heuristic"
      });
    }
  } else if (handsCount === 1 && (hands[0]?.isFist || hands[0]?.extendedCount <= 2)) {
    // Single-hand pump fallback
    candidates.push({
      id: "pump",
      score: 0.72,
      type: "dynamic",
      source: "sequence_heuristic"
    });
  }

  // 2. SCIENCE (Dual offset hands with alternating beaker-pour vertical trajectory)
  if (handsCount >= 2) {
    const separated = dualHandSeparation > 0.10;
    const asymmetricHeight = heightDifferential > 0.02 && heightDifferential < 0.45;

    let score = 0;
    if (separated) score += 0.45;
    if (asymmetricHeight) score += 0.35;
    if (dynamics.dualHandOscillations >= 1) score += 0.20;

    if (score > 0.35) {
      candidates.push({
        id: "science",
        score: Math.min(0.95, score),
        type: "dynamic",
        source: "sequence_heuristic"
      });
    }
  }

  // 3. STUDENT (Knowledge drawn upward toward forehead, trajectory deltaY < -0.08)
  if (handsCount === 1 && currentFeatures.dominantHand) {
    const inStudentBand = currentFeatures.dominantHand.rawWrist.y >= 0.30 && currentFeatures.dominantHand.rawWrist.y <= 0.70;
    const partialExtended = currentFeatures.dominantHand.extendedCount >= 2;

    let score = 0;
    if (inStudentBand) score += 0.40;
    if (partialExtended) score += 0.30;
    if (dynamics.verticalDisplacement < -0.05) score += 0.22;

    if (score > 0.40) {
      candidates.push({
        id: "student",
        score: Math.min(0.92, score),
        type: "dynamic",
        source: "sequence_heuristic"
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

/**
 * Real ONNX WebAssembly Dynamic GRU Classifier
 * Evaluates the 30-frame sequence buffer using the exported PyTorch GRU ONNX model.
 */
export async function classifyDynamicSequenceONNX(sequenceBuffer, currentFeatures) {
  if (!onnxSession || sequenceBuffer.length < 8) {
    return classifyDynamicSequenceHeuristic(sequenceBuffer, currentFeatures);
  }

  const t0 = performance.now();

  try {
    const tensorData = sequenceBuffer.getFlattenedTensorData();
    const inputTensor = new ort.Tensor('float32', tensorData, [1, 30, 126]);

    const feeds = { sequence_input: inputTensor };
    const results = await onnxSession.run(feeds);

    const probs = results.class_probabilities.data; // Float32Array [p_pump, p_science, p_student, p_unknown]
    lastOnnxInferenceDurationMs = Math.round(performance.now() - t0);

    const classes = ISL_PIPELINE_CONFIG.DYNAMIC_MODEL.CLASSES;
    const candidates = [];

    // Parse class probabilities
    for (let i = 0; i < classes.length; i++) {
      const clsName = classes[i];
      const prob = probs[i];

      if (clsName !== 'unknown' && prob >= 0.40) {
        candidates.push({
          id: clsName,
          score: Math.min(0.98, prob),
          type: "dynamic",
          source: "sequence_gru_onnx"
        });
      }
    }

    // Check if unknown class won or if top probability < confidence threshold
    const unkProb = probs[ISL_PIPELINE_CONFIG.DYNAMIC_MODEL.UNKNOWN_CLASS_INDEX] || 0;
    if (unkProb >= ISL_PIPELINE_CONFIG.DYNAMIC_MODEL.CONFIDENCE_THRESHOLD) {
      return []; // Rejected as Unknown gesture
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  } catch (err) {
    console.warn("[InclusiveAI] ONNX inference notice, falling back to heuristic:", err);
    return classifyDynamicSequenceHeuristic(sequenceBuffer, currentFeatures);
  }
}

/**
 * Synchronous / Heuristic Dynamic Sequence Evaluator
 */
export function classifyDynamicSequence(sequenceBuffer, currentFeatures) {
  return classifyDynamicSequenceHeuristic(sequenceBuffer, currentFeatures);
}

/**
 * Unified Hybrid ISL Recognition Pipeline
 * Combines Static Geometric and Dynamic Sequence classifiers.
 */
export function recognizeISL(multiHandLandmarks, multiHandedness = [], sequenceBuffer = null, dynamicCandidatesOverride = null) {
  const timestamp = Date.now();

  // 1. Feature Extraction & Normalization
  const features = extractMultiHandFeatures(multiHandLandmarks, multiHandedness);

  if (features.handsCount === 0 || !features.dominantHand) {
    return {
      isKnown: false,
      id: "none",
      word: "No Hands Tracked",
      label: "NO HANDS",
      gloss: "NONE",
      type: "unknown",
      source: "geometric",
      modelMode,
      confidence: 0,
      description: "Position hands inside the camera frame.",
      topCandidates: [],
      timestamp,
      bufferSize: sequenceBuffer ? sequenceBuffer.length : 0
    };
  }

  // 2. Push frame to 30-frame sequence buffer
  if (sequenceBuffer) {
    sequenceBuffer.pushFrame(features, timestamp);
  }

  // 3. Static Geometric Evaluation
  const staticCandidates = classifyStaticSign(features);

  // 4. Dynamic Sequence Evaluation (uses real ONNX candidates when provided, otherwise heuristic)
  const dynamicCandidates = dynamicCandidatesOverride !== null
    ? dynamicCandidatesOverride
    : (sequenceBuffer ? classifyDynamicSequenceHeuristic(sequenceBuffer, features) : []);

  const allCandidates = [...staticCandidates, ...dynamicCandidates];
  allCandidates.sort((a, b) => b.score - a.score);

  const best = allCandidates[0];

  // 5. Unknown Gesture Rejection
  if (!best || best.score < ISL_PIPELINE_CONFIG.CONFIDENCE_THRESHOLD) {
    const fallbackConfidence = best ? Math.round(best.score * 100) : 30;
    return {
      isKnown: false,
      id: "unknown",
      word: "Unknown Gesture",
      label: "UNKNOWN",
      gloss: "UNKNOWN",
      type: "unknown",
      source: best ? best.source : "geometric",
      modelMode,
      confidence: fallbackConfidence,
      description: "Gesture not recognized — perform a supported curriculum sign.",
      topCandidates: allCandidates.map(c => ({ 
        id: c.id, 
        confidence: Math.round(c.score * 100),
        type: c.type,
        source: c.source
      })),
      timestamp,
      bufferSize: sequenceBuffer ? sequenceBuffer.length : 0
    };
  }

  const vocabMatch = ISL_VOCABULARY.find(v => v.id === best.id);
  const confidencePercent = Math.round(best.score * 100);

  return {
    isKnown: true,
    id: vocabMatch.id,
    word: vocabMatch.word,
    label: vocabMatch.label,
    gloss: vocabMatch.gloss,
    category: vocabMatch.category,
    type: best.type,
    source: best.source,
    modelMode,
    confidence: confidencePercent,
    description: vocabMatch.description,
    topCandidates: allCandidates.map(c => ({ 
      id: c.id, 
      confidence: Math.round(c.score * 100),
      type: c.type,
      source: c.source
    })),
    timestamp,
    bufferSize: sequenceBuffer ? sequenceBuffer.length : 0
  };
}

/**
 * Temporal State Machine for Robust Continuous Sign Recognition
 * - Sliding-window majority voting (prevents frame jitter)
 * - Minimum consecutive frame requirement
 * - Duplicate prevention state tracking (HOLDING vs COMMITTED)
 */
export class ISLSignStateMachine {
  constructor(config = ISL_PIPELINE_CONFIG) {
    this.config = config;
    this.window = [];
    this.consecutiveCount = 0;
    this.currentCandidateId = null;
    this.lastCommittedSignId = null;
    this.lastCommitTimestamp = 0;
    this.state = "IDLE";
  }

  reset() {
    this.window = [];
    this.consecutiveCount = 0;
    this.currentCandidateId = null;
    this.lastCommittedSignId = null;
    this.state = "IDLE";
  }

  processFrame(classification) {
    const now = Date.now();

    if (!classification || !classification.isKnown) {
      this.window.push("unknown");
      if (this.window.length > this.config.ROLLING_WINDOW_SIZE) this.window.shift();
      this.consecutiveCount = 0;
      this.currentCandidateId = null;

      if (now - this.lastCommitTimestamp > this.config.GESTURE_HOLD_COOLDOWN_MS) {
        this.state = "IDLE";
        this.lastCommittedSignId = null;
      }

      return {
        event: "NONE",
        stableSign: null,
        state: this.state
      };
    }

    const signId = classification.id;
    this.window.push(signId);
    if (this.window.length > this.config.ROLLING_WINDOW_SIZE) this.window.shift();

    if (signId === this.currentCandidateId) {
      this.consecutiveCount++;
    } else {
      this.currentCandidateId = signId;
      this.consecutiveCount = 1;
    }

    const counts = {};
    this.window.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    const majoritySignId = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, signId);
    const majorityCount = counts[majoritySignId] || 0;

    const isTemporallyStable = 
      this.consecutiveCount >= this.config.REQUIRED_CONSECUTIVE_FRAMES &&
      majoritySignId === signId &&
      majorityCount >= Math.floor(this.config.ROLLING_WINDOW_SIZE / 2);

    if (isTemporallyStable) {
      if (this.lastCommittedSignId === signId) {
        this.state = "HOLDING";
        return {
          event: "HOLDING",
          stableSign: classification,
          state: "HOLDING"
        };
      }

      this.lastCommittedSignId = signId;
      this.lastCommitTimestamp = now;
      this.state = "COMMITTED";

      return {
        event: "COMMITTED",
        stableSign: classification,
        state: "COMMITTED"
      };
    }

    this.state = "DETECTING";
    return {
      event: "DETECTING",
      stableSign: null,
      state: "DETECTING"
    };
  }
}
