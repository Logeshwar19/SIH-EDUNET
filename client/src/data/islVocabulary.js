/**
 * Supported ISL Educational Curriculum Lexicon Configuration
 * 
 * Source of truth for supported ISL curriculum vocabulary.
 * Each entry defines verified linguistic metadata, anatomical gesture specifications,
 * tracking constraints (single vs dual hand), and static vs dynamic classifications.
 */
export const ISL_VOCABULARY = [
  {
    id: "heart",
    label: "HEART",
    word: "Heart",
    gloss: "HEART / BLOOD PUMP",
    category: "Anatomy",
    type: "static", // Single-frame stable cupped hand placement over chest
    minHands: 1,
    requiredHand: "dominant",
    description: "Cup hand over left chest area.",
    lessonReferences: ["lesson-heart-anatomy"],
    expectedLandmarks: {
      chestRegion: { minY: 0.35, maxY: 0.80 },
      fingerState: "curled",
      minHands: 1
    }
  },
  {
    id: "pump",
    label: "PUMP",
    word: "Pump",
    gloss: "PUMP BLOOD",
    category: "Physiology",
    type: "dynamic", // Pulse cycle recognized via temporal sequence
    minHands: 2,
    requiredHand: "both",
    description: "Pulse both fists rhythmically in front of chest.",
    lessonReferences: ["lesson-heart-anatomy"],
    expectedLandmarks: {
      fingerState: "fist",
      minHands: 2,
      temporalMotion: "rhythmic_pulse"
    }
  },
  {
    id: "science",
    label: "SCIENCE",
    word: "Science",
    gloss: "SCIENCE / EXPERIMENT",
    category: "Science",
    type: "dynamic",
    minHands: 2,
    requiredHand: "both",
    description: "Move both hands in alternating circular motions.",
    lessonReferences: ["lesson-photosynthesis", "lesson-heart-anatomy"],
    expectedLandmarks: {
      minHands: 2,
      minHandSeparation: 0.16,
      temporalMotion: "alternating_vertical"
    }
  },
  {
    id: "plant",
    label: "PLANT",
    word: "Plant",
    gloss: "PLANT GROW",
    category: "Botany",
    type: "static",
    minHands: 1,
    requiredHand: "dominant",
    description: "Move hand upward while opening fingers.",
    lessonReferences: ["lesson-photosynthesis"],
    expectedLandmarks: {
      fingerState: "extended",
      minHands: 1
    }
  },
  {
    id: "teacher",
    label: "TEACHER",
    word: "Teacher",
    gloss: "TEACHER / INSTRUCTOR",
    category: "Classroom",
    type: "static",
    minHands: 1,
    requiredHand: "dominant",
    description: "Move hand forward from temple.",
    lessonReferences: ["general-classroom"],
    expectedLandmarks: {
      maxWristY: 0.42,
      minHands: 1
    }
  },
  {
    id: "student",
    label: "STUDENT",
    word: "Student",
    gloss: "STUDENT / LEARN",
    category: "Classroom",
    type: "dynamic",
    minHands: 1,
    requiredHand: "dominant",
    description: "Move hand from palm upward toward forehead.",
    lessonReferences: ["general-classroom"],
    expectedLandmarks: {
      temporalMotion: "upward_trajectory",
      minHands: 1
    }
  }
];

export const ISL_PIPELINE_CONFIG = {
  // Classification Thresholds
  CONFIDENCE_THRESHOLD: 0.70,        // Minimum confidence to declare known sign
  HIGH_CONFIDENCE_THRESHOLD: 0.85,    // High confidence for auto-passing practice milestones
  UNKNOWN_FALLBACK_LABEL: "Unknown Gesture",
  
  // Dynamic Sequence Modeling
  DYNAMIC_SEQUENCE_LENGTH: 30,       // 30-frame temporal buffer (~1.0 sec at 30 FPS)
  NO_HAND_TIMEOUT_MS: 500,           // Reset sequence if tracking is lost for > 500ms
  DYNAMIC_EVAL_INTERVAL_MS: 120,     // Throttle dynamic model evaluation to ~8 Hz to keep UI 100% responsive
  
  // Dynamic Neural Model Config (ONNX WebAssembly)
  DYNAMIC_MODEL: {
    ONNX_PATH: '/models/isl_dynamic_gru.onnx',
    CLASSES: ['pump', 'science', 'student', 'unknown'],
    UNKNOWN_CLASS_INDEX: 3,
    CONFIDENCE_THRESHOLD: 0.80,
    SEQUENCE_LENGTH: 30,
    FEATURE_DIM: 126
  },

  // Temporal Stabilization (State Machine)
  ROLLING_WINDOW_SIZE: 6,            // Number of frames in majority voting buffer
  REQUIRED_CONSECUTIVE_FRAMES: 3,    // Minimum consecutive matching frames for stable commit
  
  // State Machine & Cooldowns
  GESTURE_HOLD_COOLDOWN_MS: 1500,    // Cooldown before same sign can re-commit
  SPEECH_THROTTLE_MS: 3000,          // Cooldown between spoken announcements
  TARGET_FPS: 30,
  
  // Camera & MediaPipe Configuration (Optimized for real-time dual-hand tracking)
  CAMERA: {
    WIDTH: { ideal: 1280, min: 640 },
    HEIGHT: { ideal: 720, min: 480 },
    FRAMERATE: { ideal: 30, max: 30 },
    FACING_MODE: "user"
  },
  MEDIAPIPE: {
    MAX_NUM_HANDS: 2,
    MODEL_COMPLEXITY: 1,             // Optimal complexity 1: fast dual-hand tracking, smooth 30 FPS
    MIN_DETECTION_CONFIDENCE: 0.5,   // 0.5 enables reliable dual-hand palm detection
    MIN_TRACKING_CONFIDENCE: 0.5    // 0.5 maintains robust continuous dual-hand tracking
  }
};
