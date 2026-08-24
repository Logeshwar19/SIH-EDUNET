/**
 * Unified ISL Model Adapter Abstraction
 * 
 * Bridges Hugging Face Abs6187/isl-models, PyTorch GRU ONNX WebAssembly,
 * and Geometric Static classifiers with explicit model modes.
 */

import { ISL_VOCABULARY, ISL_PIPELINE_CONFIG } from '../data/islVocabulary.js';
import { 
  recognizeISL, 
  classifyDynamicSequenceONNX, 
  initDynamicONNXModel, 
  getModelMode as getONNXModelMode,
  extractMultiHandFeatures,
  ISLDynamicSequenceBuffer, 
  ISLSignStateMachine 
} from './islClassifier.js';
import { matchSignToLesson } from './semanticMatcher.js';

export const MODEL_MODES = {
  MODEL_LOADING: "MODEL_LOADING",
  REAL_MODEL: "REAL_MODEL",
  GRU_FALLBACK: "GRU_FALLBACK",
  HEURISTIC_FALLBACK: "HEURISTIC_FALLBACK",
  MODEL_ERROR: "MODEL_ERROR"
};

// Abs6187 Model Metadata
export const ABS6187_METADATA = {
  repoId: "Abs6187/isl-models",
  architecture: "HierarchicalTwoStreamTransformer (MobileNetV3 + MediaPipe Pose Stream)",
  checkpoint: "checkpoints/gating_model/best_model.pth",
  license: "MIT",
  url: "https://huggingface.co/Abs6187/isl-models",
  supportedVocabulary: [
    "Hospital",
    "How_Are_You",
    "Monday",
    "Night",
    "Shoe",
    "Street",
    "Thank You",
    "Yellow"
  ],
  curriculumVocabulary: [
    "HEART",
    "PUMP",
    "SCIENCE",
    "PLANT",
    "TEACHER",
    "STUDENT"
  ]
};

export class ISLModelAdapter {
  constructor(config = ISL_PIPELINE_CONFIG) {
    this.config = config;
    this.modelMode = MODEL_MODES.MODEL_LOADING;
    this.modelInfo = {
      name: "Hybrid ISL Vision Model (Abs6187 Adapter + GRU ONNX + Geometric)",
      primaryTarget: "Abs6187/isl-models",
      activeEngine: "GRU ONNX WebAssembly / Geometric",
      checkpoint: "isl_dynamic_gru.onnx",
      version: "2.1.0",
      status: "INITIALIZING"
    };
    this.sequenceBuffer = new ISLDynamicSequenceBuffer(config.DYNAMIC_SEQUENCE_LENGTH);
    this.stateMachine = new ISLSignStateMachine(config);
    this.cachedDynamicCandidates = [];
    this.lastDynamicEvalTimestamp = 0;
  }

  async load() {
    this.modelMode = MODEL_MODES.MODEL_LOADING;
    try {
      const res = await initDynamicONNXModel(this.config.DYNAMIC_MODEL.ONNX_PATH);
      if (res.mode === "REAL_MODEL") {
        this.modelMode = MODEL_MODES.REAL_MODEL;
        this.modelInfo.status = "READY";
        this.modelInfo.activeEngine = "GRU ONNX WebAssembly (Trained Model)";
      } else {
        this.modelMode = MODEL_MODES.HEURISTIC_FALLBACK;
        this.modelInfo.status = "FALLBACK_ACTIVE";
        this.modelInfo.activeEngine = "Heuristic Dynamic Trajectory + Geometric Fallback";
      }
    } catch (err) {
      console.warn("[ISLModelAdapter] Load exception:", err);
      this.modelMode = MODEL_MODES.HEURISTIC_FALLBACK;
      this.modelInfo.status = "FALLBACK_ACTIVE";
    }
  }

  getVocabulary() {
    const combined = [...ISL_VOCABULARY];

    // Append Abs6187 catalog signs as secondary recognized signs
    ABS6187_METADATA.supportedVocabulary.forEach(term => {
      const id = term.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (!combined.some(v => v.id === id)) {
        combined.push({
          id,
          label: term.toUpperCase(),
          word: term.replace(/_/g, ' '),
          gloss: term.toUpperCase(),
          category: "General ISL Lexicon",
          type: "video_model",
          minHands: 1,
          description: `General ISL sign for "${term}" (Abs6187 catalog)`,
          supportedByModel: true
        });
      }
    });

    return combined;
  }

  getModelInfo() {
    return {
      ...this.modelInfo,
      modelMode: this.modelMode,
      bufferLength: this.sequenceBuffer.length,
      abs6187Metadata: ABS6187_METADATA
    };
  }

  reset() {
    this.sequenceBuffer.reset();
    this.stateMachine.reset();
    this.cachedDynamicCandidates = [];
    this.lastDynamicEvalTimestamp = 0;
  }

  /**
   * Evaluates incoming camera landmarks and returns a unified recognition + semantic lesson match result.
   */
  async predict(multiHandLandmarks, multiHandedness = [], currentLesson = null) {
    const now = Date.now();
    const features = extractMultiHandFeatures(multiHandLandmarks, multiHandedness);

    // Dynamic sequence evaluation throttled to avoid thread starvation
    if (now - this.lastDynamicEvalTimestamp >= this.config.DYNAMIC_EVAL_INTERVAL_MS && this.sequenceBuffer.length >= 5) {
      this.lastDynamicEvalTimestamp = now;
      try {
        const dynamicRes = await classifyDynamicSequenceONNX(this.sequenceBuffer, features);
        if (Array.isArray(dynamicRes)) {
          this.cachedDynamicCandidates = dynamicRes;
        }
      } catch (e) {
        console.warn("[ISLModelAdapter] Dynamic prediction notice:", e);
      }
    }

    // 1. Unified Recognition
    const rawRecognition = recognizeISL(
      multiHandLandmarks,
      multiHandedness,
      this.sequenceBuffer,
      this.cachedDynamicCandidates
    );

    // 2. Temporal State Machine Processing
    const smResult = this.stateMachine.processFrame(rawRecognition);

    const recognitionResult = {
      isKnown: rawRecognition.isKnown,
      id: rawRecognition.id,
      word: rawRecognition.word,
      label: rawRecognition.label,
      gloss: rawRecognition.gloss,
      type: rawRecognition.type,
      source: rawRecognition.source,
      modelMode: this.modelMode,
      confidence: rawRecognition.confidence,
      description: rawRecognition.description,
      topCandidates: rawRecognition.topCandidates || [],
      temporalEvent: smResult.event, // "DETECTING" | "COMMITTED" | "HOLDING" | "NONE"
      isStable: smResult.event === "COMMITTED" || smResult.event === "HOLDING",
      timestamp: now
    };

    // 3. Lesson Semantic Vector Search (Strictly over current lesson)
    let lessonMatchResult = null;
    if (recognitionResult.isKnown && currentLesson) {
      lessonMatchResult = matchSignToLesson(recognitionResult.gloss, currentLesson);
    }

    return {
      recognition: recognitionResult,
      lessonMatch: lessonMatchResult
    };
  }
}
