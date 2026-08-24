/**
 * signDictionary.js — Comprehensive Indian Sign Language (ISL) Visual & Spatial Dictionary
 * 
 * Provides:
 * 1. Rich ISL Word Dictionary (Motion vectors, hand shapes, 2D visual representations, explanations)
 * 2. Complete A-Z Fingerspelling Hand Shapes (21 keypoints + visual paths)
 * 3. Text-to-Sign Tokenizer & Converter
 */

export const ISL_FINGERSPELLING = {
  'A': { hand: 'Fist with thumb resting beside index finger', points: [[0,0], [1,0], [2,-1], [3,-2], [4,-3]], emoji: '✊' },
  'B': { hand: 'Four fingers straight up, thumb folded across palm', points: [[0,0], [0,4], [1,4], [2,4], [3,4]], emoji: '✋' },
  'C': { hand: 'Curved hand forming C shape facing left/forward', points: [[0,0], [2,2], [3,3], [2,4], [0,4]], emoji: '🤏' },
  'D': { hand: 'Index finger pointing straight up, other fingers touch thumb in circle', points: [[0,0], [0,4], [1,1], [2,1]], emoji: '☝️' },
  'E': { hand: 'Fingers curled inward touching thumb, claws shape', points: [[0,0], [1,1], [2,1], [3,1]], emoji: '✊' },
  'F': { hand: 'Index and thumb form circle, other 3 fingers straight up', points: [[0,0], [1,4], [2,4], [3,4]], emoji: '👌' },
  'G': { hand: 'Index finger and thumb parallel pointing horizontally', points: [[0,0], [3,0], [3,1]], emoji: '👉' },
  'H': { hand: 'Index and middle fingers pointing horizontally together', points: [[0,0], [3,0], [3,-1]], emoji: '👉' },
  'I': { hand: 'Pinky finger straight up, other fingers in fist with thumb across', points: [[0,0], [4,4]], emoji: '🤙' },
  'J': { hand: 'Pinky finger traces J shape in air', points: [[0,0], [4,4], [3,2]], emoji: '🤙' },
  'K': { hand: 'Index straight up, middle finger angled forward, thumb between', points: [[0,0], [0,4], [1,3]], emoji: '✌️' },
  'L': { hand: 'Index pointing up and thumb extended forming L shape', points: [[0,0], [0,4], [3,0]], emoji: '👆' },
  'M': { hand: 'Three fingers folded over thumb resting under them', points: [[0,0], [1,1], [2,1], [3,1]], emoji: '✊' },
  'N': { hand: 'Two fingers folded over thumb', points: [[0,0], [1,1], [2,1]], emoji: '✊' },
  'O': { hand: 'All fingertips touch thumb forming circular O shape', points: [[0,0], [2,3], [3,2], [2,0]], emoji: '👌' },
  'P': { hand: 'K shape pointed downward', points: [[0,0], [0,-3], [1,-2]], emoji: '👇' },
  'Q': { hand: 'G shape pointed downward', points: [[0,0], [2,-2]], emoji: '👇' },
  'R': { hand: 'Index and middle fingers crossed pointing up', points: [[0,0], [0,4], [1,4]], emoji: '🤞' },
  'S': { hand: 'Fist with thumb wrapped across all fingers', points: [[0,0], [1,0], [2,0]], emoji: '👊' },
  'T': { hand: 'Thumb tucked between index and middle finger in fist', points: [[0,0], [1,1]], emoji: '✊' },
  'U': { hand: 'Index and middle fingers straight up together', points: [[0,0], [0,4], [1,4]], emoji: '✌️' },
  'V': { hand: 'Index and middle fingers separated forming V shape', points: [[0,0], [0,4], [2,4]], emoji: '✌️' },
  'W': { hand: 'Index, middle, and ring fingers spread up forming W', points: [[0,0], [0,4], [1,4], [2,4]], emoji: '🖐️' },
  'X': { hand: 'Index finger hooked like a question mark', points: [[0,0], [0,3], [1,2]], emoji: '☝️' },
  'Y': { hand: 'Thumb and pinky extended, middle 3 fingers folded', points: [[0,0], [-2,2], [4,2]], emoji: '🤙' },
  'Z': { hand: 'Index finger traces Z shape in air', points: [[0,0], [3,3], [0,0], [3,0]], emoji: '✍️' },
};

export const ISL_WORD_DICTIONARY = {
  // Classroom & General
  'HEART': {
    gloss: 'HEART',
    category: 'Anatomy',
    description: 'Cup right hand over the left side of chest and tap twice in a gentle heartbeat rhythm.',
    hands: 1,
    motion: 'chest-tap',
    icon: '❤️',
    steps: ['Place open curved palm on left chest', 'Tap gently inward twice', 'Hold briefly to symbolize pulse']
  },
  'PUMP': {
    gloss: 'PUMP BLOOD',
    category: 'Physiology',
    description: 'Hold both hands in front of body at chest level. Rhythmically open fingers and squeeze into tight fists.',
    hands: 2,
    motion: 'fist-pulse',
    icon: '🫀',
    steps: ['Both open palms facing forward', 'Contract rhythmically into tight fists', 'Expand and repeat twice']
  },
  'BLOOD': {
    gloss: 'BLOOD / RED LIQUID',
    category: 'Anatomy',
    description: 'Touch index finger to lower lip (red), then move hand downward while wiggling fingers (flowing liquid).',
    hands: 1,
    motion: 'lip-flow',
    icon: '🩸',
    steps: ['Touch chin/lip with index', 'Wiggle fingers downward', 'Simulate flowing stream']
  },
  'OXYGEN': {
    gloss: 'OXYGEN / AIR',
    category: 'Science',
    description: 'Fingerspell O-X, then gently wave open flat palm toward nose to represent breathing fresh air.',
    hands: 1,
    motion: 'wave-nose',
    icon: '💨',
    steps: ['Form O shape then X shape', 'Wave flat palm toward nose', 'Take visible gentle breath']
  },
  'LUNGS': {
    gloss: 'LUNGS',
    category: 'Anatomy',
    description: 'Place both flat palms on both sides of upper ribcage and expand hands outward as you breathe in.',
    hands: 2,
    motion: 'chest-expand',
    icon: '🫁',
    steps: ['Flat palms on upper ribs', 'Expand hands outward and upward', 'Contract inward gently']
  },
  'SCIENCE': {
    gloss: 'SCIENCE / EXPERIMENT',
    category: 'Education',
    description: 'Hold both hands in fists with thumbs inward. Rotate hands in alternating circular vertical loops.',
    hands: 2,
    motion: 'beaker-circle',
    icon: '🔬',
    steps: ['Fists held at chest height', 'Alternating forward circular loops', 'Simulate laboratory beakers']
  },
  'TEACHER': {
    gloss: 'TEACHER / INSTRUCTOR',
    category: 'Education',
    description: 'Flattened O-hands at both temples move forward together, then flat open hands move straight downward.',
    hands: 2,
    motion: 'temple-forward',
    icon: '👩‍🏫',
    steps: ['Hands at temples', 'Push knowledge forward from mind', 'Flat hands slide downward to denote person']
  },
  'STUDENT': {
    gloss: 'STUDENT / LEARNER',
    category: 'Education',
    description: 'Place right hand on flat left palm as if taking knowledge, lift to forehead, then lower hands downward.',
    hands: 2,
    motion: 'palm-forehead',
    icon: '🧑‍🎓',
    steps: ['Right fingers touch flat left palm', 'Draw upward toward forehead', 'Point hands downward (person marker)']
  },
  'QUESTION': {
    gloss: 'QUESTION / DOUBT',
    category: 'Communication',
    description: 'Point index finger straight up, draw a question mark shape in the air, and finish with a dot.',
    hands: 1,
    motion: 'draw-question',
    icon: '❓',
    steps: ['Index finger up in air', 'Draw curve of question mark', 'Bring index down sharply for dot']
  },
  'ANSWER': {
    gloss: 'ANSWER / EXPLAIN',
    category: 'Communication',
    description: 'Place index fingers at lips, then move both hands forward together pointing toward the student.',
    hands: 2,
    motion: 'lips-forward',
    icon: '💡',
    steps: ['Index touches lower lip', 'Move straight forward to listener', 'Open palm upward to show response']
  },
  'UNDERSTAND': {
    gloss: 'UNDERSTAND',
    category: 'Communication',
    description: 'Place index finger flicking upward near right temple with a nodding facial expression.',
    hands: 1,
    motion: 'flick-temple',
    icon: '🧠',
    steps: ['Fist near right temple', 'Index finger flicks upward like lightbulb', 'Nod head affirmatively']
  },
  'HELLO': {
    gloss: 'HELLO / GREETINGS',
    category: 'General',
    description: 'Open flat right palm near right eyebrow, move outward in a salute-like smooth arc with a warm smile.',
    hands: 1,
    motion: 'salute-arc',
    icon: '👋',
    steps: ['Open hand at eyebrow edge', 'Smooth arc outward to right', 'Facial expression: smile']
  },
  'THANK': {
    gloss: 'THANK YOU',
    category: 'General',
    description: 'Touch fingertips of flat open right hand to chin, then move hand forward and downward toward person.',
    hands: 1,
    motion: 'chin-forward',
    icon: '🙏',
    steps: ['Flat hand touches chin', 'Move straight forward toward teacher', 'Slight bow of head']
  },
  'PLEASE': {
    gloss: 'PLEASE',
    category: 'General',
    description: 'Rub flat open right palm in a gentle clockwise circle over the center of the chest.',
    hands: 1,
    motion: 'chest-rub',
    icon: '✨',
    steps: ['Flat palm on center of chest', 'Rotate in smooth clockwise circle', 'Gentle respectful facial posture']
  },
  'HELP': {
    gloss: 'HELP / ASSIST',
    category: 'General',
    description: 'Place closed right fist (thumb up) on top of flat open left palm and lift both hands upward together.',
    hands: 2,
    motion: 'lift-support',
    icon: '🤝',
    steps: ['Flat left palm facing up', 'Right thumbs-up on left palm', 'Lift both hands upward toward teacher']
  },
  'REPEAT': {
    gloss: 'REPEAT / AGAIN',
    category: 'Classroom',
    description: 'Bent right hand jumps in an arc from right to land into the flat palm of left hand.',
    hands: 2,
    motion: 'arc-palm',
    icon: '🔄',
    steps: ['Flat open left hand', 'Right bent hand forms arc', 'Lands firmly on left palm']
  }
};

/**
 * Convert any text or transcript into a sequence of ISL tokens (words or fingerspelled letters).
 */
export function convertTextToISLSequence(text) {
  if (!text || typeof text !== 'string') return [];

  const rawWords = text
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const sequence = [];

  for (const word of rawWords) {
    if (ISL_WORD_DICTIONARY[word]) {
      sequence.push({
        type: 'word',
        token: word,
        ...ISL_WORD_DICTIONARY[word]
      });
    } else {
      // Deconstruct into fingerspelling letters
      const letters = word.split('').map(char => ({
        type: 'letter',
        token: char,
        letter: char,
        category: 'Fingerspelling',
        description: `ISL Fingerspelling Hand Shape for letter '${char}'`,
        ...(ISL_FINGERSPELLING[char] || { emoji: '✋', hand: 'Hand shape' })
      }));
      sequence.push(...letters);
    }
  }

  return sequence;
}
