/**
 * Semantic Meaning Normalization & Lesson Vector Matching Engine
 * 
 * Maps recognized ISL glosses to canonical concept spaces and executes
 * cosine-similarity semantic vector search strictly against the active lesson's chunks.
 */

// Comprehensive Concept Knowledge Graph for ISL Gloss Normalization
export const GLOSS_SEMANTIC_DICTIONARY = {
  "PUMP": {
    gloss: "PUMP",
    canonicalTerm: "pump",
    primaryConcept: "cardiac pumping mechanism",
    concepts: [
      "blood pumping",
      "pumping mechanism",
      "circulation of blood",
      "ventricular contraction",
      "heart pump muscular action",
      "cardiac cycle systole diastole",
      "pumping oxygenated blood through aorta"
    ],
    domain: "Circulatory Physiology"
  },
  "HEART": {
    gloss: "HEART",
    canonicalTerm: "heart",
    primaryConcept: "heart anatomy and structure",
    concepts: [
      "cardiac muscular organ",
      "heart chambers atria ventricles",
      "circulatory system central organ",
      "cardiovascular anatomy",
      "cardiac muscle myocardium pericardium"
    ],
    domain: "Anatomy & Organ Systems"
  },
  "SCIENCE": {
    gloss: "SCIENCE",
    canonicalTerm: "science",
    primaryConcept: "scientific methodology and experiments",
    concepts: [
      "scientific experiment and lab research",
      "chemistry biological investigation",
      "scientific method hypothesis observation",
      "beaker chemical reaction analysis"
    ],
    domain: "General Science"
  },
  "PLANT": {
    gloss: "PLANT",
    canonicalTerm: "plant",
    primaryConcept: "plant biology and photosynthesis",
    concepts: [
      "photosynthesis autotrophic growth",
      "chlorophyll chloroplast sunlight absorption",
      "botanical cellular structure xylem phloem",
      "plant shoot leaf carbon dioxide conversion"
    ],
    domain: "Botany & Plant Physiology"
  },
  "TEACHER": {
    gloss: "TEACHER",
    canonicalTerm: "teacher",
    primaryConcept: "educator and pedagogical instruction",
    concepts: [
      "teacher instructor classroom guide",
      "pedagogy learning facilitation",
      "educational instruction and lesson explanation"
    ],
    domain: "Education"
  },
  "STUDENT": {
    gloss: "STUDENT",
    canonicalTerm: "student",
    primaryConcept: "learner and academic knowledge acquisition",
    concepts: [
      "student learner acquiring knowledge",
      "classroom studying understanding concepts",
      "academic practice and question evaluation"
    ],
    domain: "Education"
  },
  "HOSPITAL": {
    gloss: "HOSPITAL",
    canonicalTerm: "hospital",
    primaryConcept: "medical healthcare facility",
    concepts: [
      "hospital clinical treatment medical center",
      "healthcare doctors patient cardiology ward",
      "emergency medical diagnosis and surgical care"
    ],
    domain: "Healthcare"
  },
  "THANK YOU": {
    gloss: "THANK YOU",
    canonicalTerm: "thank you",
    primaryConcept: "gratitude expression",
    concepts: [
      "gratitude appreciation acknowledge help",
      "polite student response to teacher"
    ],
    domain: "Social Communication"
  },
  "HOW ARE YOU": {
    gloss: "HOW ARE YOU",
    canonicalTerm: "how are you",
    primaryConcept: "wellbeing inquiry",
    concepts: [
      "greeting inquiry regarding wellbeing health",
      "classroom greeting between student and teacher"
    ],
    domain: "Social Communication"
  }
};

/**
 * Normalizes an ISL Gloss to its canonical semantic concept payload
 */
export function normalizeGlossToMeaning(gloss) {
  if (!gloss) return null;
  const upper = String(gloss).trim().toUpperCase();
  const entry = GLOSS_SEMANTIC_DICTIONARY[upper];

  if (entry) {
    return {
      gloss: entry.gloss,
      canonicalTerm: entry.canonicalTerm,
      primaryConcept: entry.primaryConcept,
      concepts: entry.concepts,
      domain: entry.domain,
      queryText: `${entry.canonicalTerm} ${entry.concepts.join(' ')}`
    };
  }

  // Open-ended fallback for arbitrary uncatalogued glosses
  const clean = gloss.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  return {
    gloss: upper,
    canonicalTerm: clean,
    primaryConcept: clean,
    concepts: [clean, `${clean} concept`, `mechanism of ${clean}`],
    domain: "General Curriculum",
    queryText: `${clean} ${clean} concept mechanism process`
  };
}

/**
 * Tokenizes and generates subword N-gram frequency vectors for semantic matching
 */
function textToVector(text, vocabulary) {
  const words = String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const vec = new Float32Array(vocabulary.length);

  words.forEach((word, wIdx) => {
    // Exact word match (first words carry higher weight)
    const idx = vocabulary.indexOf(word);
    if (idx !== -1) {
      vec[idx] += (wIdx < 2 ? 3.5 : 2.0);
    }
    // Subword stem matches (e.g. "pump" in "pumps", "pumping", "plant" in "plants")
    vocabulary.forEach((term, tIdx) => {
      if (term !== word && (word.startsWith(term) || term.startsWith(word)) && Math.min(term.length, word.length) >= 3) {
        vec[tIdx] += 1.5;
      }
    });
  });

  // L2 Normalize vector
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  }

  return vec;
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1.0, dot));
}

/**
 * Performs Semantic Vector Search of an ISL Gloss / Meaning strictly over the currently selected lesson
 */
export function matchSignToLesson(gloss, currentLesson, similarityThreshold = 0.40) {
  if (!gloss || !currentLesson) {
    return {
      matched: false,
      score: 0,
      concept: "None",
      section: "N/A",
      chunk: "",
      explanation: "No active lesson or sign provided for semantic search."
    };
  }

  const normalized = normalizeGlossToMeaning(gloss);
  if (!normalized) {
    return {
      matched: false,
      score: 0,
      concept: gloss,
      section: "N/A",
      chunk: "",
      explanation: "Could not normalize sign gloss to semantic representation."
    };
  }

  // Extract chunks strictly from the current lesson
  const rawChunks = [];

  // Check audioSections or text_blocks
  if (Array.isArray(currentLesson.bviModule?.audioSections) && currentLesson.bviModule.audioSections.length > 0) {
    currentLesson.bviModule.audioSections.forEach((sec, idx) => {
      rawChunks.push({
        section: sec.sectionTitle || `Section ${idx + 1}`,
        text: sec.content || ""
      });
    });
  } else if (Array.isArray(currentLesson.text_blocks) && currentLesson.text_blocks.length > 0) {
    currentLesson.text_blocks.forEach((block, idx) => {
      rawChunks.push({
        section: `Lesson Unit ${idx + 1}`,
        text: block
      });
    });
  } else if (currentLesson.summary) {
    rawChunks.push({
      section: "Lesson Overview",
      text: currentLesson.summary
    });
  }

  if (rawChunks.length === 0) {
    return {
      matched: false,
      score: 0,
      concept: normalized.primaryConcept,
      section: "Empty Lesson",
      chunk: "",
      explanation: "The selected lesson contains no indexed text content."
    };
  }

  // Build shared vocabulary space
  const allText = `${normalized.queryText} ${rawChunks.map(c => c.text).join(' ')}`;
  const vocabWords = Array.from(new Set(
    allText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3)
  ));

  const queryVec = textToVector(normalized.queryText, vocabWords);

  let bestScore = 0;
  let bestChunk = null;

  rawChunks.forEach(chunkObj => {
    const chunkVec = textToVector(chunkObj.text, vocabWords);
    let score = cosineSimilarity(queryVec, chunkVec);

    // Hybrid keyword boost for canonical terms
    const chunkLower = chunkObj.text.toLowerCase();
    if (chunkLower.includes(normalized.canonicalTerm.toLowerCase())) {
      score = Math.min(1.0, score + 0.20);
    }

    if (score > bestScore) {
      bestScore = score;
      bestChunk = chunkObj;
    }
  });

  const roundedScore = Math.round(bestScore * 100) / 100;
  const isMatched = roundedScore >= similarityThreshold;

  if (isMatched && bestChunk) {
    return {
      matched: true,
      score: roundedScore,
      scorePercent: Math.round(roundedScore * 100),
      concept: normalized.primaryConcept,
      canonicalTerm: normalized.canonicalTerm,
      section: bestChunk.section,
      chunk: bestChunk.text,
      explanation: `The recognized sign "${normalized.gloss}" directly matches the ${normalized.primaryConcept} presented in ${bestChunk.section}.`,
      lessonTitle: currentLesson.title || "Selected Lesson",
      lessonId: currentLesson.id
    };
  }

  return {
    matched: false,
    score: roundedScore,
    scorePercent: Math.round(roundedScore * 100),
    concept: normalized.primaryConcept,
    canonicalTerm: normalized.canonicalTerm,
    section: bestChunk?.section || "Current Lesson Context",
    chunk: bestChunk?.text ? bestChunk.text.slice(0, 140) + "..." : "",
    explanation: `No relevant passage matching "${normalized.gloss}" (${normalized.primaryConcept}) was found in "${currentLesson.title || 'this lesson'}".`,
    lessonTitle: currentLesson.title || "Selected Lesson",
    lessonId: currentLesson.id
  };
}
