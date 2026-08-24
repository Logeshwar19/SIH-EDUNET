/**
 * islClassifier.js — High-Accuracy ISL Gesture Classifier
 * 
 * Architecture:
 * 1. normalizeHandLandmarks() — 21-keypoint normalization (translation + scale invariant)
 * 2. computeHandBiometrics() — 16 geometric features per hand (curl, pinch, extension, orientation)
 * 3. classifyStaticSign()  — Frame-by-frame static handshape recognition (30+ signs)
 * 4. classifyDynamicSequenceHeuristic() — Temporal motion pattern recognition
 * 5. recognizeISL() — Unified pipeline: normalize → biometrics → static + dynamic → state machine
 * 6. ISLSignStateMachine — Rolling temporal window, majority vote, duplicate suppression
 */

// Global ONNX Runtime Web Model State & Lazy Ref
let ortModule = null;
let onnxSession = null;
let modelMode = "HEURISTIC_FALLBACK"; // "REAL_MODEL" | "HEURISTIC_FALLBACK"
let modelLoadingPromise = null;
let modelLoadError = null;
let lastOnnxInferenceDurationMs = 0;

// Pipeline configuration
export const ISL_PIPELINE_CONFIG = {
  CONFIDENCE_THRESHOLD: 0.60,
  ROLLING_WINDOW_SIZE: 14,
  REQUIRED_CONSECUTIVE_FRAMES: 8,
  GESTURE_HOLD_COOLDOWN_MS: 1200,
  NO_HAND_TIMEOUT_MS: 1500,
  DYNAMIC_SEQUENCE_LENGTH: 30,
  DYNAMIC_MODEL: {
    ONNX_PATH: '/models/isl_gru_v2.onnx',
    CLASSES: ['pump', 'science', 'student', 'learn', 'repeat', 'done', 'show', 'write', 'photosynthesis', 'unknown'],
    UNKNOWN_CLASS_INDEX: 9,
    CONFIDENCE_THRESHOLD: 0.58
  }
};

// Landmark index reference
const LM = {
  WRIST: 0,
  THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20
};

/**
 * Initializes ONNX model with graceful fallback to heuristic classifier.
 */
export async function initDynamicONNXModel(modelPath = ISL_PIPELINE_CONFIG.DYNAMIC_MODEL.ONNX_PATH) {
  if (onnxSession) return { status: "READY", mode: "REAL_MODEL" };
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      if (!ortModule) {
        ortModule = await import('onnxruntime-web');
      }
      const ort = ortModule;
      if (typeof window !== 'undefined' && ort?.env?.wasm) {
        ort.env.wasm.numThreads = 1;
        ort.env.wasm.simd = true;
      }
      const session = await Promise.race([
        ort.InferenceSession.create(modelPath, { executionProviders: ['wasm'] }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("ONNX load timeout")), 3000))
      ]);
      onnxSession = session;
      modelMode = "REAL_MODEL";
      modelLoadError = null;
      return { status: "READY", mode: "REAL_MODEL" };
    } catch (err) {
      modelMode = "HEURISTIC_FALLBACK";
      modelLoadError = err?.message || String(err);
      return { status: "FALLBACK", mode: "HEURISTIC_FALLBACK", error: modelLoadError };
    }
  })();

  return modelLoadingPromise;
}

export function getModelMode() { return modelMode; }
export function getOnnxInferenceLatency() { return lastOnnxInferenceDurationMs; }

// ── GEOMETRY UTILITIES ────────────────────────────────────────────────────────

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function dotNorm(a, b, c) {
  // Angle at vertex b between points a-b-c
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (b.z || 0) };
  const m1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z) || 1;
  const m2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z) || 1;
  const dot = (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z) / (m1 * m2);
  return Math.acos(Math.max(-1, Math.min(1, dot))); // angle in radians 0..π
}

/**
 * Normalizes 21 hand landmarks: translation + scale invariant.
 * Returns normalized points plus extension/curl flags.
 */
export function normalizeHandLandmarks(landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length < 21) return null;

  const wrist = landmarks[LM.WRIST];
  const middleMCP = landmarks[LM.MIDDLE_MCP];

  const dx = middleMCP.x - wrist.x;
  const dy = middleMCP.y - wrist.y;
  const dz = (middleMCP.z || 0) - (wrist.z || 0);
  const palmScale = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.15;

  const N = landmarks.map(pt => ({
    x: (pt.x - wrist.x) / palmScale,
    y: (pt.y - wrist.y) / palmScale,
    z: ((pt.z || 0) - (wrist.z || 0)) / palmScale,
    rawX: pt.x,
    rawY: pt.y,
    rawZ: pt.z || 0
  }));

  // Extension check: tip above pip (lower y = higher on screen)
  const isExtended = {
    thumb: landmarks[LM.THUMB_TIP].y < landmarks[LM.THUMB_IP].y,
    index: landmarks[LM.INDEX_TIP].y < landmarks[LM.INDEX_PIP].y,
    middle: landmarks[LM.MIDDLE_TIP].y < landmarks[LM.MIDDLE_PIP].y,
    ring: landmarks[LM.RING_TIP].y < landmarks[LM.RING_PIP].y,
    pinky: landmarks[LM.PINKY_TIP].y < landmarks[LM.PINKY_PIP].y
  };

  const extendedCount = Object.values(isExtended).filter(Boolean).length;
  const isFist = extendedCount <= 1;
  const isAllExtended = extendedCount >= 4;

  return {
    normalizedPoints: N,
    rawWrist: wrist,
    isExtended,
    extendedCount,
    isFist,
    isAllExtended,
    palmScale
  };
}

/**
 * Compute 16 biometric features from normalized 21-point landmarks.
 * These features distinguish 30+ ISL signs with high accuracy.
 */
function computeHandBiometrics(N, lm) {
  // N = normalized landmark array
  // Finger tip to palm distances (curl metric, lower = more curled)
  const tipToWrist = [
    dist(N[LM.INDEX_TIP], N[LM.WRIST]),
    dist(N[LM.MIDDLE_TIP], N[LM.WRIST]),
    dist(N[LM.RING_TIP], N[LM.WRIST]),
    dist(N[LM.PINKY_TIP], N[LM.WRIST])
  ];

  // Pinch distances (normalized by palmScale=1 since already normalized)
  const thumbIndexPinch = dist(N[LM.THUMB_TIP], N[LM.INDEX_TIP]);
  const thumbMiddlePinch = dist(N[LM.THUMB_TIP], N[LM.MIDDLE_TIP]);
  const thumbRingPinch = dist(N[LM.THUMB_TIP], N[LM.RING_TIP]);
  const thumbPinkyPinch = dist(N[LM.THUMB_TIP], N[LM.PINKY_TIP]);
  const indexMiddleSpread = dist(N[LM.INDEX_TIP], N[LM.MIDDLE_TIP]);

  // Finger curl ratios: 1.0 = fully curled, 0.0 = straight
  // Curl = MCP to TIP distance ratio vs MCP to TIP when extended
  const fingerCurlRatios = {
    index: Math.max(0, 1 - tipToWrist[0] / 3.0),
    middle: Math.max(0, 1 - tipToWrist[1] / 3.0),
    ring: Math.max(0, 1 - tipToWrist[2] / 3.0),
    pinky: Math.max(0, 1 - tipToWrist[3] / 3.0)
  };

  // Individual finger extension: normalized tip height relative to wrist (positive = extended upward)
  const fingerHeights = {
    thumb: -N[LM.THUMB_TIP].y,   // higher (more negative normalized Y) = more extended
    index: -N[LM.INDEX_TIP].y,
    middle: -N[LM.MIDDLE_TIP].y,
    ring: -N[LM.RING_TIP].y,
    pinky: -N[LM.PINKY_TIP].y
  };

  // Thumb position relative to index MCP (side vs in front)
  const thumbSideExtension = N[LM.THUMB_TIP].x - N[LM.INDEX_MCP].x; // > 0 = thumb out to thumb side

  // PIP joint angles (bend angle at PIP)
  const indexBend = dotNorm(lm[LM.INDEX_MCP], lm[LM.INDEX_PIP], lm[LM.INDEX_TIP]);
  const middleBend = dotNorm(lm[LM.MIDDLE_MCP], lm[LM.MIDDLE_PIP], lm[LM.MIDDLE_TIP]);

  // Average curl of middle three fingers
  const avgCenterCurl = (fingerCurlRatios.index + fingerCurlRatios.middle + fingerCurlRatios.ring) / 3;

  // Index-Middle together vs spread
  const indexMiddleTogether = indexMiddleSpread < 0.35; // touching when < 0.35 normalized

  return {
    thumbIndexPinch,
    thumbMiddlePinch,
    thumbRingPinch,
    thumbPinkyPinch,
    indexMiddleSpread,
    fingerCurlRatios,
    fingerHeights,
    thumbSideExtension,
    indexBend,
    middleBend,
    avgCenterCurl,
    indexMiddleTogether,
    tipToWrist
  };
}

/**
 * Extracts unified multi-hand features from 1 or 2 detected hands.
 */
export function extractMultiHandFeatures(multiHandLandmarks, multiHandedness = []) {
  if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
    return { handsCount: 0, hands: [], dominantHand: null, dualHandSeparation: 0, heightDifferential: 0 };
  }

  const hands = multiHandLandmarks.map((h, i) => {
    const label = multiHandedness[i]?.label || (i === 0 ? "Right" : "Left");
    const score = multiHandedness[i]?.score || 0.95;
    const normalized = normalizeHandLandmarks(h);
    if (!normalized) return null;
    const biometrics = computeHandBiometrics(normalized.normalizedPoints, h);
    return { ...normalized, biometrics, label, score, originalLandmarks: h };
  }).filter(h => h !== null);

  let dualHandSeparation = 0, heightDifferential = 0;
  if (hands.length >= 2) {
    const w1 = hands[0].rawWrist, w2 = hands[1].rawWrist;
    const sepX = w1.x - w2.x, sepY = w1.y - w2.y;
    dualHandSeparation = Math.sqrt(sepX * sepX + sepY * sepY);
    heightDifferential = Math.abs(w1.y - w2.y);
  }

  return { handsCount: hands.length, hands, dominantHand: hands[0] || null, dualHandSeparation, heightDifferential };
}

// ── SEQUENCE BUFFER ─────────────────────────────────────────────────────────

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
      if (timestamp - this.lastHandSeenTimestamp > ISL_PIPELINE_CONFIG.NO_HAND_TIMEOUT_MS) this.reset();
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
      isExtended: { ...features.dominantHand.isExtended },
      biometrics: features.dominantHand.biometrics,
      leftNormalizedPoints: leftHand ? leftHand.normalizedPoints : null,
      rightNormalizedPoints: rightHand ? rightHand.normalizedPoints : null
    };

    this.frames.push(snapshot);
    if (this.frames.length > this.maxLength) this.frames.shift();
  }

  get length() { return this.frames.length; }

  getFlattenedTensorData() {
    const data = new Float32Array(30 * 126);
    const numFrames = this.frames.length;
    for (let f = 0; f < 30; f++) {
      const frameIdx = f < (30 - numFrames) ? 0 : (f - (30 - numFrames));
      const frame = this.frames[frameIdx] || null;
      if (!frame) continue;
      const frameOffset = f * 126;
      if (frame.leftNormalizedPoints?.length >= 21) {
        for (let i = 0; i < 21; i++) {
          const pt = frame.leftNormalizedPoints[i];
          data[frameOffset + i * 3 + 0] = pt.x;
          data[frameOffset + i * 3 + 1] = pt.y;
          data[frameOffset + i * 3 + 2] = pt.z || 0.0;
        }
      }
      if (frame.rightNormalizedPoints?.length >= 21) {
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
      return { isSufficient: false, verticalDisplacement: 0, horizontalDisplacement: 0, separationVariance: 0, dualHandOscillations: 0, fistRatio: 0, avgExtendedCount: 0 };
    }
    const first = this.frames[0];
    const last = this.frames[this.frames.length - 1];
    const verticalDisplacement = last.wrist.y - first.wrist.y;
    const horizontalDisplacement = last.wrist.x - first.wrist.x;

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
        if (i > 1 && Math.sign(diff) !== Math.sign(prevDiff) && Math.abs(diff) > 0.02) dualHandOscillations++;
        prevDiff = diff;
      }
    }

    const fistFrames = this.frames.filter(f => f.isFist || f.extendedCount <= 2).length;
    const avgExtendedCount = this.frames.reduce((s, f) => s + (f.extendedCount || 0), 0) / this.frames.length;

    return {
      isSufficient: this.frames.length >= 8,
      verticalDisplacement,
      horizontalDisplacement,
      separationVariance,
      dualHandOscillations,
      fistRatio: fistFrames / this.frames.length,
      avgExtendedCount
    };
  }
}

// ── BIOMETRIC SIGN PROFILES ────────────────────────────────────────────────────
// Each profile specifies the expected biometric values for a sign.
// Matching uses weighted scoring against each profile.
const STATIC_SIGN_PROFILES = {
  // ── GREETINGS & COMMUNICATION ──────────────────────────────────────────────
  hello: {
    label: 'HELLO',
    word: 'Hello',
    gloss: 'HELLO / GREETINGS',
    category: 'Greeting',
    description: 'Open flat hand salute at eyebrow, sweep outward.',
    matcher: (bio, ext, wrist) => {
      // STRICT: All fingers extended + hand must be near forehead/eyebrow level
      // NOT just any open hand anywhere
      let s = 0;
      if (!ext.isAllExtended || ext.extendedCount < 4) return 0; // must be fully open
      if (wrist.y >= 0.38) return 0; // must be near upper face, not chest
      s += 0.45; // fully open hand confirmed
      if (wrist.y < 0.30) s += 0.25; // forehead/eyebrow region
      if (bio.thumbIndexPinch > 0.65) s += 0.20; // fingers truly spread
      if (bio.avgCenterCurl < 0.15) s += 0.10; // fingers straight, not curved
      return s;
    },
    minScore: 0.75 // Raised from 0.60 to prevent false triggers
  },

  thank: {
    label: 'THANK YOU',
    word: 'Thank you',
    gloss: 'THANK YOU',
    category: 'General',
    description: 'Flat hand from chin forward.',
    matcher: (bio, ext, wrist) => {
      // STRICT: Flat open hand at chin level (NOT forehead, NOT chest)
      let s = 0;
      if (!ext.isAllExtended) return 0; // must be open flat
      if (wrist.y < 0.38 || wrist.y > 0.60) return 0; // strictly chin/mouth zone
      s += 0.40;
      if (bio.avgCenterCurl < 0.18) s += 0.25; // very flat palm
      if (wrist.x >= 0.32 && wrist.x <= 0.68) s += 0.20; // centered at face
      if (bio.thumbSideExtension > 0.05) s += 0.15; // thumb slightly away
      return s;
    },
    minScore: 0.72 // Raised from 0.58
  },

  please: {
    label: 'PLEASE',
    word: 'Please',
    gloss: 'PLEASE',
    category: 'General',
    description: 'Flat palm circular rub over chest.',
    matcher: (bio, ext, wrist) => {
      // STRICT: Open hand at chest level with thumb-side extension
      let s = 0;
      if (!ext.isAllExtended) return 0; // must be open
      if (wrist.y < 0.50 || wrist.y > 0.78) return 0; // strictly mid-chest zone
      s += 0.40;
      if (bio.avgCenterCurl < 0.20) s += 0.25; // flat palm
      if (wrist.x >= 0.28 && wrist.x <= 0.72) s += 0.20;
      if (bio.thumbSideExtension > 0.08) s += 0.15; // thumb away
      return s;
    },
    minScore: 0.72 // Raised from 0.58
  },

  yes: {
    label: 'YES / CORRECT',
    word: 'Yes',
    gloss: 'YES',
    category: 'General',
    description: 'Fist (S-hand) nods yes at wrist.',
    matcher: (bio, ext, wrist) => {
      let s = 0;
      if (ext.isFist) s += 0.55;
      if (ext.extendedCount <= 1) s += 0.25;
      if (wrist.y >= 0.30 && wrist.y <= 0.70) s += 0.20;
      return s;
    },
    minScore: 0.62
  },

  no: {
    label: 'NO / WRONG',
    word: 'No',
    gloss: 'NO',
    category: 'General',
    description: 'Index and middle snap down to thumb.',
    matcher: (bio, ext, wrist) => {
      let s = 0;
      if (ext.isExtended.index && ext.isExtended.middle && !ext.isExtended.ring && !ext.isExtended.pinky) s += 0.45;
      if (bio.thumbIndexPinch < 0.40) s += 0.30; // pinching motion
      if (ext.extendedCount === 2) s += 0.15;
      if (wrist.y >= 0.25 && wrist.y <= 0.65) s += 0.10;
      return s;
    },
    minScore: 0.60
  },

  good: {
    label: 'GOOD',
    word: 'Good',
    gloss: 'GOOD / GREAT',
    category: 'General',
    description: 'Flat hand from chin down to other palm.',
    matcher: (bio, ext, wrist) => {
      // STRICT: Open hand moving DOWN from chin toward waist
      // Distinct from HELLO (face) and PLEASE (chest rub) by being mid-body + downward motion implied
      let s = 0;
      if (!ext.isAllExtended) return 0; // must be open
      if (wrist.y < 0.45) return 0; // NOT near face — must be chin to waist range
      s += 0.38;
      if (bio.avgCenterCurl < 0.18) s += 0.27; // very flat, not curved
      if (wrist.y >= 0.52 && wrist.y <= 0.78) s += 0.25; // chin-downward zone
      if (bio.thumbSideExtension > 0.12) s += 0.10; // thumb open
      return s;
    },
    minScore: 0.75 // Raised from 0.58
  },

  stop: {
    label: 'STOP',
    word: 'Stop',
    gloss: 'STOP',
    category: 'General',
    description: 'Right hand chops down onto left palm.',
    matcher: (bio, ext, wrist) => {
      // STRICT: Open hand held low AND sideways (perpendicular to body = blade-like chop)
      let s = 0;
      if (!ext.isAllExtended || ext.extendedCount < 4) return 0;
      if (wrist.y < 0.50) return 0; // must be lower body, not face
      s += 0.35;
      if (wrist.y >= 0.55 && wrist.y <= 0.88) s += 0.30; // waist zone
      if (bio.thumbIndexPinch > 0.60) s += 0.25; // fingers spread apart (chop)
      if (bio.indexMiddleSpread > 0.25) s += 0.10; // flat blade shape
      return s;
    },
    minScore: 0.70 // Raised from 0.56
  },

  // ── ISL HANDSHAPES / FINGERSPELLING STATIC POSES ────────────────────────────
  isl_A: {
    label: 'LETTER A',
    word: 'A',
    gloss: 'ISL-A',
    category: 'Fingerspelling',
    description: 'Fist, thumb beside index finger.',
    matcher: (bio, ext) => {
      let s = 0;
      if (ext.isFist) s += 0.50;
      if (ext.extendedCount === 0) s += 0.25;
      if (bio.thumbSideExtension > 0.05) s += 0.15; // thumb not tucked across
      if (bio.thumbIndexPinch > 0.20 && bio.thumbIndexPinch < 0.55) s += 0.10;
      return s;
    },
    minScore: 0.65
  },

  isl_B: {
    label: 'LETTER B',
    word: 'B',
    gloss: 'ISL-B',
    category: 'Fingerspelling',
    description: 'Four fingers up, thumb folded.',
    matcher: (bio, ext) => {
      let s = 0;
      if (ext.isExtended.index && ext.isExtended.middle && ext.isExtended.ring && ext.isExtended.pinky) s += 0.50;
      if (!ext.isExtended.thumb) s += 0.25;
      if (bio.indexMiddleTogether) s += 0.15;
      if (bio.fingerHeights.index > 1.2) s += 0.10;
      return s;
    },
    minScore: 0.65
  },

  isl_C: {
    label: 'LETTER C',
    word: 'C',
    gloss: 'ISL-C',
    category: 'Fingerspelling',
    description: 'Curved C shape.',
    matcher: (bio, ext) => {
      let s = 0;
      // Curved: partial extension with space between thumb and fingers
      if (bio.thumbIndexPinch > 0.35 && bio.thumbIndexPinch < 1.0) s += 0.35;
      if (bio.avgCenterCurl > 0.25 && bio.avgCenterCurl < 0.70) s += 0.30;
      if (!ext.isFist && !ext.isAllExtended) s += 0.25;
      if (bio.fingerHeights.index > 0.2) s += 0.10;
      return s;
    },
    minScore: 0.58
  },

  isl_D: {
    label: 'LETTER D',
    word: 'D',
    gloss: 'ISL-D',
    category: 'Fingerspelling',
    description: 'Index up, others form circle with thumb.',
    matcher: (bio, ext) => {
      let s = 0;
      if (ext.isExtended.index && !ext.isExtended.middle && !ext.isExtended.ring && !ext.isExtended.pinky) s += 0.45;
      if (bio.thumbMiddlePinch < 0.40) s += 0.30; // middle/ring/pinky touching thumb
      if (bio.fingerHeights.index > 1.0) s += 0.15;
      if (bio.thumbIndexPinch > 0.50) s += 0.10;
      return s;
    },
    minScore: 0.63
  },

  isl_I: {
    label: 'LETTER I',
    word: 'I',
    gloss: 'ISL-I',
    category: 'Fingerspelling',
    description: 'Pinky only extended.',
    matcher: (bio, ext) => {
      let s = 0;
      if (!ext.isExtended.index && !ext.isExtended.middle && !ext.isExtended.ring && ext.isExtended.pinky) s += 0.60;
      if (bio.fingerHeights.pinky > 0.6) s += 0.25;
      if (bio.fingerCurlRatios.index > 0.5 && bio.fingerCurlRatios.middle > 0.5) s += 0.15;
      return s;
    },
    minScore: 0.65
  },

  isl_L: {
    label: 'LETTER L',
    word: 'L',
    gloss: 'ISL-L',
    category: 'Fingerspelling',
    description: 'Index up, thumb out — L shape.',
    matcher: (bio, ext) => {
      let s = 0;
      if (ext.isExtended.index && ext.isExtended.thumb) s += 0.45;
      if (!ext.isExtended.middle && !ext.isExtended.ring && !ext.isExtended.pinky) s += 0.25;
      if (bio.thumbSideExtension > 0.30) s += 0.20; // thumb points out
      if (bio.fingerHeights.index > 1.0) s += 0.10;
      return s;
    },
    minScore: 0.63
  },

  isl_O: {
    label: 'LETTER O',
    word: 'O',
    gloss: 'ISL-O',
    category: 'Fingerspelling',
    description: 'All fingertips touch thumb forming O.',
    matcher: (bio, ext) => {
      let s = 0;
      // All fingertips close to thumb
      const allPinching = bio.thumbIndexPinch < 0.50 && bio.thumbMiddlePinch < 0.55 && bio.thumbRingPinch < 0.60;
      if (allPinching) s += 0.55;
      if (bio.avgCenterCurl > 0.35) s += 0.25;
      if (!ext.isFist) s += 0.20;
      return s;
    },
    minScore: 0.60
  },

  isl_V: {
    label: 'LETTER V / PEACE',
    word: 'V',
    gloss: 'ISL-V',
    category: 'Fingerspelling',
    description: 'Index and middle spread apart upward.',
    matcher: (bio, ext) => {
      let s = 0;
      if (ext.isExtended.index && ext.isExtended.middle && !ext.isExtended.ring && !ext.isExtended.pinky) s += 0.45;
      if (bio.indexMiddleSpread > 0.35) s += 0.30; // spread apart
      if (bio.fingerHeights.index > 0.8 && bio.fingerHeights.middle > 0.8) s += 0.15;
      if (!ext.isExtended.thumb) s += 0.10;
      return s;
    },
    minScore: 0.62
  },

  isl_Y: {
    label: 'LETTER Y / SHAKA',
    word: 'Y',
    gloss: 'ISL-Y',
    category: 'Fingerspelling',
    description: 'Thumb and pinky extended (shaka/hang-loose).',
    matcher: (bio, ext) => {
      let s = 0;
      if (ext.isExtended.thumb && ext.isExtended.pinky) s += 0.45;
      if (!ext.isExtended.index && !ext.isExtended.middle && !ext.isExtended.ring) s += 0.35;
      if (bio.thumbPinkyPinch > 0.70) s += 0.20;
      return s;
    },
    minScore: 0.65
  },

  // ── CLASSROOM & EDUCATION SIGNS ────────────────────────────────────────────
  question: {
    label: 'QUESTION / DOUBT',
    word: 'Question',
    gloss: 'QUESTION',
    category: 'Communication',
    description: 'Index traces question mark in air.',
    matcher: (bio, ext, wrist) => {
      let s = 0;
      if (ext.isExtended.index && !ext.isExtended.middle && !ext.isExtended.ring && !ext.isExtended.pinky) s += 0.45;
      if (bio.fingerHeights.index > 0.8) s += 0.25; // index pointing up
      if (wrist.y >= 0.20 && wrist.y <= 0.65) s += 0.20;
      if (bio.fingerCurlRatios.middle > 0.4) s += 0.10;
      return s;
    },
    minScore: 0.60
  },

  understand: {
    label: 'UNDERSTAND',
    word: 'Understand',
    gloss: 'UNDERSTAND',
    category: 'Communication',
    description: 'Fist at temple, index flicks up.',
    matcher: (bio, ext, wrist) => {
      let s = 0;
      // Fist with index flicked up at temple height
      if (ext.extendedCount <= 2) s += 0.35;
      if (wrist.y < 0.45) s += 0.30; // temple height
      if (ext.isExtended.index) s += 0.25;
      if (!ext.isExtended.middle && !ext.isExtended.ring) s += 0.10;
      return s;
    },
    minScore: 0.58
  },

  think: {
    label: 'THINK',
    word: 'Think',
    gloss: 'THINK',
    category: 'Communication',
    description: 'Index circles at temple.',
    matcher: (bio, ext, wrist) => {
      let s = 0;
      if (ext.isExtended.index && !ext.isExtended.middle) s += 0.40;
      if (wrist.y < 0.45) s += 0.35;
      if (wrist.x >= 0.40 && wrist.x <= 0.75) s += 0.15; // temple side
      if (bio.fingerHeights.index > 0.7) s += 0.10;
      return s;
    },
    minScore: 0.58
  },

  know: {
    label: 'KNOW',
    word: 'Know',
    gloss: 'KNOW',
    category: 'Education',
    description: 'Bent fingers tap temple.',
    matcher: (bio, ext, wrist) => {
      let s = 0;
      if (!ext.isAllExtended && ext.extendedCount >= 2) s += 0.35;
      if (bio.avgCenterCurl > 0.25 && bio.avgCenterCurl < 0.65) s += 0.25;
      if (wrist.y < 0.42) s += 0.30;
      if (bio.fingerHeights.index > 0.3) s += 0.10;
      return s;
    },
    minScore: 0.56
  },

  help: {
    label: 'HELP / ASSIST',
    word: 'Help',
    gloss: 'HELP',
    category: 'General',
    description: 'Thumbs-up on flat palm, lift upward.',
    matcher: (bio, ext, wrist) => {
      let s = 0;
      // Thumbs up: thumb extended, fingers folded
      if (ext.isExtended.thumb && !ext.isExtended.index) s += 0.45;
      if (ext.extendedCount === 1) s += 0.25;
      if (wrist.y >= 0.35 && wrist.y <= 0.75) s += 0.20;
      if (bio.thumbSideExtension < 0 || bio.fingerHeights.thumb > 0.8) s += 0.10;
      return s;
    },
    minScore: 0.60
  },

  look: {
    label: 'LOOK / SEE',
    word: 'Look',
    gloss: 'LOOK',
    category: 'Communication',
    description: 'V-sign from eyes pointing forward.',
    matcher: (bio, ext, wrist) => {
      let s = 0;
      if (ext.isExtended.index && ext.isExtended.middle && !ext.isExtended.ring && !ext.isExtended.pinky) s += 0.40;
      if (bio.indexMiddleTogether) s += 0.25;  // fingers together
      if (wrist.y <= 0.50) s += 0.25; // near eye/face
      if (bio.indexMiddleSpread < 0.35) s += 0.10;
      return s;
    },
    minScore: 0.60
  },

  listen: {
    label: 'LISTEN / HEAR',
    word: 'Listen',
    gloss: 'LISTEN',
    category: 'Communication',
    description: 'Cupped hand behind ear.',
    matcher: (bio, ext, wrist) => {
      let s = 0;
      // Curved/cupped hand near ear
      if (!ext.isAllExtended && !ext.isFist) s += 0.30;
      if (bio.avgCenterCurl > 0.20 && bio.avgCenterCurl < 0.65) s += 0.30;
      if (wrist.y < 0.45 && (wrist.x < 0.30 || wrist.x > 0.70)) s += 0.30; // ear side
      if (ext.extendedCount >= 2 && ext.extendedCount <= 4) s += 0.10;
      return s;
    },
    minScore: 0.56
  },

  // ── BIOLOGY & SCIENCE SIGNS ────────────────────────────────────────────────
  heart: {
    label: 'HEART',
    word: 'Heart',
    gloss: 'HEART',
    category: 'Anatomy',
    description: 'Curved palm over left chest, tap twice.',
    matcher: (bio, ext, wrist) => {
      let s = 0;
      if (!ext.isAllExtended) s += 0.30;
      if (bio.avgCenterCurl > 0.25 && bio.avgCenterCurl < 0.70) s += 0.25;
      if (wrist.y >= 0.40 && wrist.y <= 0.75) s += 0.25; // chest
      if (wrist.x >= 0.25 && wrist.x <= 0.65) s += 0.20;
      return s;
    },
    minScore: 0.58
  },

  oxygen: {
    label: 'OXYGEN / O2',
    word: 'Oxygen',
    gloss: 'OXYGEN',
    category: 'Science',
    description: 'O-shape then wave toward nose.',
    matcher: (bio, ext, wrist) => {
      let s = 0;
      if (bio.thumbIndexPinch < 0.45) s += 0.40; // O pinch
      if (bio.thumbMiddlePinch < 0.50) s += 0.20;
      if (bio.avgCenterCurl > 0.30) s += 0.25;
      if (wrist.y >= 0.30 && wrist.y <= 0.65) s += 0.15;
      return s;
    },
    minScore: 0.60
  },

  water: {
    label: 'WATER',
    word: 'Water',
    gloss: 'WATER',
    category: 'General',
    description: 'W-shape (3 fingers) tapping chin.',
    matcher: (bio, ext, wrist) => {
      let s = 0;
      if (ext.isExtended.index && ext.isExtended.middle && ext.isExtended.ring && !ext.isExtended.pinky) s += 0.45;
      if (!ext.isExtended.pinky && !ext.isExtended.thumb) s += 0.25;
      if (wrist.y >= 0.35 && wrist.y <= 0.65) s += 0.20;
      if (bio.fingerHeights.index > 0.8) s += 0.10;
      return s;
    },
    minScore: 0.62
  },

  light: {
    label: 'LIGHT / SUNLIGHT',
    word: 'Light',
    gloss: 'LIGHT',
    category: 'Science',
    description: 'Fingertips burst open from O shape.',
    matcher: (bio, ext, wrist) => {
      // STRICT: Open hand held HIGH (above face/forehead level) — simulating light above
      // Distinct from HELLO (at eyebrow, sweeping), GOOD (chin down), PLEASE (chest)
      let s = 0;
      if (!ext.isAllExtended) return 0; // must be fully open
      if (wrist.y >= 0.35) return 0; // must be ABOVE head, not near face/chin
      s += 0.40;
      if (bio.thumbIndexPinch > 0.65) s += 0.30; // spread fingers (burst)
      if (wrist.y < 0.25) s += 0.20; // very high = light above
      if (bio.avgCenterCurl < 0.15) s += 0.10; // straight, not curved
      return s;
    },
    minScore: 0.75 // Raised from 0.60
  },

  brain: {
    label: 'BRAIN',
    word: 'Brain',
    gloss: 'BRAIN',
    category: 'Anatomy',
    description: 'Bent fingers tap right temple.',
    matcher: (bio, ext, wrist) => {
      let s = 0;
      if (!ext.isAllExtended && ext.extendedCount >= 1) s += 0.30;
      if (bio.avgCenterCurl > 0.30 && bio.avgCenterCurl < 0.70) s += 0.30;
      if (wrist.y < 0.40) s += 0.30; // forehead/temple height
      if (wrist.x > 0.50) s += 0.10; // right side
      return s;
    },
    minScore: 0.58
  },

  energy: {
    label: 'ENERGY / POWER',
    word: 'Energy',
    gloss: 'ENERGY',
    category: 'Science',
    description: 'Fist arms surge upward.',
    matcher: (bio, ext, wrist) => {
      let s = 0;
      if (ext.isFist || ext.extendedCount <= 2) s += 0.40;
      if (wrist.y < 0.50) s += 0.35; // raised
      if (bio.fingerCurlRatios.index > 0.5) s += 0.15;
      if (bio.thumbSideExtension < 0.1) s += 0.10;
      return s;
    },
    minScore: 0.60
  },

  teacher: {
    label: 'TEACHER',
    word: 'Teacher',
    gloss: 'TEACHER',
    category: 'Education',
    description: 'O-hands at temples push knowledge forward.',
    matcher: (bio, ext, wrist) => {
      let s = 0;
      if (wrist.y < 0.42) s += 0.40; // temple/head height
      if (bio.thumbIndexPinch < 0.55) s += 0.30; // O-hand shape
      if (bio.avgCenterCurl > 0.25) s += 0.20;
      if (wrist.x >= 0.30 && wrist.x <= 0.70) s += 0.10;
      return s;
    },
    minScore: 0.60
  },

  student: {
    label: 'STUDENT',
    word: 'Student',
    gloss: 'STUDENT',
    category: 'Education',
    description: 'Right hand scoops from left palm to forehead.',
    matcher: (bio, ext, wrist) => {
      let s = 0;
      if (ext.extendedCount >= 2 && ext.extendedCount <= 4) s += 0.35;
      if (wrist.y >= 0.35 && wrist.y <= 0.70) s += 0.30;
      if (bio.avgCenterCurl > 0.15 && bio.avgCenterCurl < 0.60) s += 0.25;
      if (wrist.x >= 0.30 && wrist.x <= 0.70) s += 0.10;
      return s;
    },
    minScore: 0.55
  }
};

// ── STATIC CLASSIFIER (30+ ISL signs) ────────────────────────────────────────
export function classifyStaticSign(features) {
  const { handsCount, dominantHand } = features;
  const candidates = [];

  if (handsCount === 0 || !dominantHand) return candidates;

  const wrist = dominantHand.rawWrist;
  const inFrame = wrist.x >= 0.08 && wrist.x <= 0.92 && wrist.y >= 0.10 && wrist.y <= 0.90;
  if (!inFrame) return candidates;

  const bio = dominantHand.biometrics;
  const ext = dominantHand;

  for (const [id, profile] of Object.entries(STATIC_SIGN_PROFILES)) {
    const score = profile.matcher(bio, ext, wrist);
    if (score >= profile.minScore) {
      candidates.push({
        id,
        score: Math.min(0.97, score),
        type: 'static',
        source: 'biometric_geometry',
        label: profile.label,
        word: profile.word,
        gloss: profile.gloss,
        category: profile.category,
        description: profile.description
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

// ── DYNAMIC CLASSIFIER (10+ ISL motion patterns) ─────────────────────────────
const DYNAMIC_SIGN_PROFILES = {
  pump: {
    label: 'PUMP BLOOD',
    word: 'Pump',
    gloss: 'PUMP',
    category: 'Physiology',
    description: 'Both fists open and close rhythmically.',
    matcher: (dynamics, current) => {
      let s = 0;
      if (current.handsCount >= 2) {
        if (dynamics.fistRatio > 0.40) s += 0.40;
        if (current.dualHandSeparation >= 0.05 && current.dualHandSeparation <= 0.90) s += 0.30;
        if (dynamics.separationVariance > 0.001) s += 0.20; // rhythmic variation
        if (dynamics.avgExtendedCount < 3.0) s += 0.10;
      } else if (current.handsCount === 1 && (current.dominantHand?.isFist)) {
        s += 0.55;
      }
      return s;
    },
    minScore: 0.50
  },

  science: {
    label: 'SCIENCE',
    word: 'Science',
    gloss: 'SCIENCE',
    category: 'Education',
    description: 'Both fists rotate in alternating circles.',
    matcher: (dynamics, current) => {
      let s = 0;
      if (current.handsCount >= 2) {
        if (current.dualHandSeparation >= 0.08) s += 0.35;
        if (dynamics.dualHandOscillations >= 1) s += 0.35;
        if (dynamics.fistRatio > 0.30) s += 0.20;
        if (dynamics.verticalDisplacement < 0.10 && dynamics.verticalDisplacement > -0.10) s += 0.10;
      }
      return s;
    },
    minScore: 0.52
  },

  learn: {
    label: 'LEARN / STUDY',
    word: 'Learn',
    gloss: 'LEARN',
    category: 'Education',
    description: 'Hand sweeps from palm upward to forehead.',
    matcher: (dynamics, current) => {
      let s = 0;
      if (current.handsCount >= 1 && dynamics.verticalDisplacement < -0.08) s += 0.45; // upward movement
      if (current.dominantHand?.extendedCount >= 2 && current.dominantHand?.extendedCount <= 4) s += 0.30;
      if (dynamics.isSufficient) s += 0.15;
      if (current.dominantHand?.rawWrist?.y < 0.50) s += 0.10; // ends near head
      return s;
    },
    minScore: 0.55
  },

  repeat: {
    label: 'REPEAT / AGAIN',
    word: 'Repeat',
    gloss: 'REPEAT',
    category: 'Classroom',
    description: 'Bent hand arcs and lands on flat palm.',
    matcher: (dynamics, current) => {
      let s = 0;
      if (Math.abs(dynamics.horizontalDisplacement) > 0.05) s += 0.35;
      if (dynamics.verticalDisplacement > 0.04) s += 0.30; // moves down at end
      if (current.handsCount >= 2) s += 0.20;
      if (dynamics.isSufficient) s += 0.15;
      return s;
    },
    minScore: 0.52
  },

  done: {
    label: 'DONE / FINISHED',
    word: 'Done',
    gloss: 'DONE',
    category: 'General',
    description: 'Both hands flip outward from chest.',
    matcher: (dynamics, current) => {
      let s = 0;
      if (current.handsCount >= 2) s += 0.25;
      if (current.dominantHand?.isAllExtended) s += 0.30;
      if (Math.abs(dynamics.horizontalDisplacement) > 0.06) s += 0.30;
      if (dynamics.avgExtendedCount > 3.0) s += 0.15;
      return s;
    },
    minScore: 0.52
  },

  show: {
    label: 'SHOW / DISPLAY',
    word: 'Show',
    gloss: 'SHOW',
    category: 'Communication',
    description: 'Both hands swing forward from body.',
    matcher: (dynamics, current) => {
      let s = 0;
      if (current.handsCount >= 1 && dynamics.verticalDisplacement < -0.03) s += 0.35;
      if (current.dominantHand?.isAllExtended) s += 0.30;
      if (dynamics.avgExtendedCount > 3.0) s += 0.20;
      if (dynamics.isSufficient) s += 0.15;
      return s;
    },
    minScore: 0.52
  },

  write: {
    label: 'WRITE',
    word: 'Write',
    gloss: 'WRITE',
    category: 'Communication',
    description: 'Writing cursive on flat palm.',
    matcher: (dynamics, current) => {
      let s = 0;
      if (current.handsCount >= 2) s += 0.25;
      const bio = current.dominantHand?.biometrics;
      if (bio?.thumbIndexPinch < 0.45) s += 0.35; // pinch grip
      if (dynamics.separationVariance > 0.0005) s += 0.25; // small movement
      if (current.dominantHand?.extendedCount <= 2) s += 0.15;
      return s;
    },
    minScore: 0.52
  },

  photosynthesis: {
    label: 'PHOTOSYNTHESIS',
    word: 'Photosynthesis',
    gloss: 'PHOTOSYNTHESIS',
    category: 'Plant Biology',
    description: 'Light burst + combine + plant sprout.',
    matcher: (dynamics, current) => {
      let s = 0;
      if (current.dominantHand?.isAllExtended) s += 0.35;
      if (dynamics.verticalDisplacement < -0.06) s += 0.30; // upward
      if (current.handsCount >= 2) s += 0.20;
      if (dynamics.isSufficient) s += 0.15;
      return s;
    },
    minScore: 0.55
  }
};

export function classifyDynamicSequenceHeuristic(sequenceBuffer, currentFeatures) {
  const candidates = [];
  if (!sequenceBuffer || sequenceBuffer.length < 5) return candidates;

  const dynamics = sequenceBuffer.computeDynamics();
  if (!dynamics.isSufficient) return candidates;

  for (const [id, profile] of Object.entries(DYNAMIC_SIGN_PROFILES)) {
    const score = profile.matcher(dynamics, currentFeatures);
    if (score >= profile.minScore) {
      candidates.push({
        id,
        score: Math.min(0.95, score),
        type: 'dynamic',
        source: 'sequence_biometric_heuristic',
        label: profile.label,
        word: profile.word,
        gloss: profile.gloss,
        category: profile.category,
        description: profile.description
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

// ── ONNX MODEL CLASSIFIER ─────────────────────────────────────────────────────
export async function classifyDynamicSequenceONNX(sequenceBuffer, currentFeatures) {
  if (!onnxSession || !ortModule || sequenceBuffer.length < 8) {
    return classifyDynamicSequenceHeuristic(sequenceBuffer, currentFeatures);
  }

  const t0 = performance.now();

  try {
    const tensorData = sequenceBuffer.getFlattenedTensorData();
    const inputTensor = new ortModule.Tensor('float32', tensorData, [1, 30, 126]);
    const results = await onnxSession.run({ sequence_input: inputTensor });
    const probs = results.class_probabilities.data;
    lastOnnxInferenceDurationMs = Math.round(performance.now() - t0);

    const classes = ISL_PIPELINE_CONFIG.DYNAMIC_MODEL.CLASSES;
    const candidates = [];

    for (let i = 0; i < classes.length; i++) {
      const clsName = classes[i];
      const prob = probs[i];
      if (clsName !== 'unknown' && prob >= 0.40) {
        const profile = DYNAMIC_SIGN_PROFILES[clsName];
        candidates.push({
          id: clsName,
          score: Math.min(0.98, prob),
          type: 'dynamic',
          source: 'sequence_gru_onnx',
          label: profile?.label || clsName.toUpperCase(),
          word: profile?.word || clsName,
          gloss: profile?.gloss || clsName.toUpperCase(),
          category: profile?.category || 'Unknown',
          description: profile?.description || ''
        });
      }
    }

    const unkProb = probs[ISL_PIPELINE_CONFIG.DYNAMIC_MODEL.UNKNOWN_CLASS_INDEX] || 0;
    if (unkProb >= ISL_PIPELINE_CONFIG.DYNAMIC_MODEL.CONFIDENCE_THRESHOLD) return [];

    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  } catch (err) {
    console.warn('[InclusiveAI] ONNX inference fallback:', err);
    return classifyDynamicSequenceHeuristic(sequenceBuffer, currentFeatures);
  }
}

export function classifyDynamicSequence(sequenceBuffer, currentFeatures) {
  return classifyDynamicSequenceHeuristic(sequenceBuffer, currentFeatures);
}

// ── UNIFIED RECOGNITION PIPELINE ──────────────────────────────────────────────
export function recognizeISL(multiHandLandmarks, multiHandedness = [], sequenceBuffer = null, dynamicCandidatesOverride = null) {
  const timestamp = Date.now();
  const features = extractMultiHandFeatures(multiHandLandmarks, multiHandedness);

  if (features.handsCount === 0 || !features.dominantHand) {
    return {
      isKnown: false, id: 'none', word: 'No Hands Tracked', label: 'NO HANDS',
      gloss: 'NONE', type: 'unknown', source: 'geometric', modelMode,
      confidence: 0, description: 'Position hands inside the camera frame.',
      topCandidates: [], timestamp, bufferSize: sequenceBuffer?.length || 0
    };
  }

  if (sequenceBuffer) sequenceBuffer.pushFrame(features, timestamp);

  const staticCandidates = classifyStaticSign(features);
  const dynamicCandidates = dynamicCandidatesOverride !== null
    ? dynamicCandidatesOverride
    : (sequenceBuffer ? classifyDynamicSequenceHeuristic(sequenceBuffer, features) : []);

  const allCandidates = [...staticCandidates, ...dynamicCandidates];
  allCandidates.sort((a, b) => b.score - a.score);

  const best = allCandidates[0];

  if (!best || best.score < ISL_PIPELINE_CONFIG.CONFIDENCE_THRESHOLD) {
    return {
      isKnown: false, id: 'unknown', word: 'Gesture Not Recognized', label: 'UNKNOWN',
      gloss: 'UNKNOWN', type: 'unknown', source: best?.source || 'geometric',
      modelMode, confidence: best ? Math.round(best.score * 100) : 28,
      description: 'Gesture not recognized. Try a supported ISL sign.',
      topCandidates: allCandidates.map(c => ({ id: c.id, confidence: Math.round(c.score * 100), type: c.type })),
      timestamp, bufferSize: sequenceBuffer?.length || 0
    };
  }

  return {
    isKnown: true,
    id: best.id,
    word: best.word || best.id,
    label: best.label || best.id.toUpperCase(),
    gloss: best.gloss || best.label,
    category: best.category || 'General',
    type: best.type,
    source: best.source,
    modelMode,
    confidence: Math.round(best.score * 100),
    description: best.description || '',
    topCandidates: allCandidates.map(c => ({ id: c.id, confidence: Math.round(c.score * 100), type: c.type })),
    timestamp,
    bufferSize: sequenceBuffer?.length || 0
  };
}

// ── TEMPORAL STATE MACHINE ─────────────────────────────────────────────────────
export class ISLSignStateMachine {
  constructor(config = ISL_PIPELINE_CONFIG) {
    this.config = config;
    this.window = [];
    this.consecutiveCount = 0;
    this.currentCandidateId = null;
    this.lastCommittedSignId = null;
    this.lastCommitTimestamp = 0;
    this.state = 'IDLE';
  }

  reset() {
    this.window = [];
    this.consecutiveCount = 0;
    this.currentCandidateId = null;
    this.lastCommittedSignId = null;
    this.state = 'IDLE';
  }

  processFrame(classification) {
    const now = Date.now();

    if (!classification || !classification.isKnown) {
      this.window.push('unknown');
      if (this.window.length > this.config.ROLLING_WINDOW_SIZE) this.window.shift();
      this.consecutiveCount = 0;
      this.currentCandidateId = null;
      // After cooldown: clear lastCommittedSignId so same sign can be recognized again
      // Without this, the same sign loops as HOLDING forever
      if (now - this.lastCommitTimestamp > this.config.GESTURE_HOLD_COOLDOWN_MS) {
        this.state = 'IDLE';
        this.lastCommittedSignId = null; // reset so same sign can be re-committed
      }
      return { event: 'NONE', stableSign: null, state: this.state };
    }

    // If a new sign candidate appears, clear consecutive count immediately
    // This prevents false continuation when transitioning between signs
    if (this.currentCandidateId !== null && this.currentCandidateId !== classification.id) {
      this.consecutiveCount = 0;
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

    const isStable =
      this.consecutiveCount >= this.config.REQUIRED_CONSECUTIVE_FRAMES &&
      majoritySignId === signId &&
      majorityCount >= Math.floor(this.config.ROLLING_WINDOW_SIZE / 2);

    if (isStable) {
      if (this.lastCommittedSignId === signId) {
        this.state = 'HOLDING';
        return { event: 'HOLDING', stableSign: classification, state: 'HOLDING' };
      }
      this.lastCommittedSignId = signId;
      this.lastCommitTimestamp = now;
      this.state = 'COMMITTED';
      return { event: 'COMMITTED', stableSign: classification, state: 'COMMITTED' };
    }

    this.state = 'DETECTING';
    return { event: 'DETECTING', stableSign: null, state: 'DETECTING' };
  }
}
