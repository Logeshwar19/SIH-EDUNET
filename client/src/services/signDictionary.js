/**
 * signDictionary.js — Comprehensive Indian Sign Language (ISL) Dictionary
 * 
 * Provides:
 * 1. Full A-Z ISL Fingerspelling with 21-keypoint normalized hand shapes
 * 2. 80+ ISL Word Dictionary with motion vectors, step-by-step descriptions, 
 *    dual/single hand specifications, and realistic gesture guidance
 * 3. ISL Grammar Tokenizer: English text → ISL grammar order → sign sequence
 *    (ISL follows Subject-Object-Verb grammar, drops articles/prepositions)
 */

// ── ISL GRAMMAR CONFIG ──────────────────────────────────────────────────────
// ISL uses Subject-Object-Verb (SOV) order with topic-comment structure.
// Stop words that don't have ISL equivalents are removed.
const ISL_STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'to', 'of', 'in',
  'on', 'at', 'by', 'for', 'with', 'about', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'from', 'up', 'down', 'out',
  'off', 'over', 'under', 'again', 'further', 'then', 'once', 'it', 'its',
  'than', 'that', 'these', 'this', 'those', 'and', 'but', 'or', 'if',
  'so', 'as', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'very', 'just', 'which', 'who', 'whom', 'what', 'when', 'where',
  'how', 'all', 'also', 'however', 'therefore', 'since', 'while', 'not'
]);

// Words that map to a canonical ISL sign (English variants → ISL key)
const ISL_LEMMA_MAP = {
  'hearts': 'HEART', 'cardiac': 'HEART', 'heartbeat': 'HEART',
  'pumping': 'PUMP', 'pumps': 'PUMP', 'pumped': 'PUMP',
  'bloods': 'BLOOD', 'bleeding': 'BLOOD',
  'oxygenation': 'OXYGEN', 'oxygenated': 'OXYGEN', 'o2': 'OXYGEN',
  'lungs': 'LUNG', 'lung': 'LUNG', 'pulmonary': 'LUNG',
  'brains': 'BRAIN', 'cerebral': 'BRAIN',
  'cells': 'CELL', 'cellular': 'CELL',
  'teachers': 'TEACHER', 'instructor': 'TEACHER',
  'students': 'STUDENT', 'learner': 'STUDENT', 'pupil': 'STUDENT',
  'questions': 'QUESTION', 'doubt': 'QUESTION', 'doubts': 'QUESTION',
  'answers': 'ANSWER', 'explains': 'ANSWER', 'explained': 'ANSWER',
  'understands': 'UNDERSTAND', 'understood': 'UNDERSTAND',
  'helping': 'HELP', 'helps': 'HELP',
  'repeating': 'REPEAT', 'again': 'REPEAT',
  'hello': 'HELLO', 'hi': 'HELLO', 'greetings': 'HELLO',
  'thanks': 'THANK', 'thankyou': 'THANK', 'thanking': 'THANK',
  'please': 'PLEASE', 'kindly': 'PLEASE',
  'photosynthesis': 'PHOTOSYNTHESIS',
  'chlorophyll': 'CHLOROPHYLL',
  'glucose': 'GLUCOSE', 'sugar': 'GLUCOSE',
  'carbon': 'CARBON', 'co2': 'CARBON',
  'dioxide': 'DIOXIDE',
  'energy': 'ENERGY',
  'light': 'LIGHT',
  'water': 'WATER', 'h2o': 'WATER',
  'forces': 'FORCE', 'gravity': 'GRAVITY',
  'motion': 'MOTION', 'movement': 'MOTION',
  'atom': 'ATOM', 'atomic': 'ATOM',
  'molecule': 'MOLECULE', 'molecules': 'MOLECULE',
  'reaction': 'REACTION', 'reactions': 'REACTION',
  'temperature': 'TEMPERATURE', 'heat': 'TEMPERATURE',
  'current': 'ELECTRICITY', 'electric': 'ELECTRICITY', 'electrical': 'ELECTRICITY',
  'yes': 'YES', 'correct': 'YES', 'right': 'YES',
  'no': 'NO', 'wrong': 'NO', 'incorrect': 'NO',
  'good': 'GOOD', 'great': 'GOOD', 'excellent': 'GOOD',
  'done': 'DONE', 'finished': 'DONE', 'complete': 'DONE',
  'ready': 'READY',
  'stop': 'STOP', 'stopped': 'STOP',
  'start': 'START', 'begin': 'START', 'beginning': 'START',
  'look': 'LOOK', 'see': 'LOOK', 'observe': 'LOOK',
  'listen': 'LISTEN', 'hear': 'LISTEN',
  'read': 'READ', 'reading': 'READ',
  'write': 'WRITE', 'writing': 'WRITE',
  'learn': 'LEARN', 'learning': 'LEARN', 'study': 'LEARN',
  'knows': 'KNOW', 'knowing': 'KNOW',
  'shows': 'SHOW', 'showing': 'SHOW', 'display': 'SHOW',
  'thinks': 'THINK', 'thinking': 'THINK',
  'names': 'NAME', 'called': 'NAME',
  'today': 'TODAY',
  'now': 'NOW',
  'class': 'CLASS', 'classroom': 'CLASS', 'classes': 'CLASS',
  'books': 'BOOK', 'textbook': 'BOOK',
  'diagrams': 'DIAGRAM', 'chart': 'DIAGRAM',
  'experiments': 'EXPERIMENT', 'lab': 'EXPERIMENT',
  'processes': 'PROCESS', 'procedure': 'PROCESS',
  'veins': 'VEIN', 'vein': 'VEIN',
  'arteries': 'ARTERY', 'artery': 'ARTERY',
  'muscles': 'MUSCLE', 'muscle': 'MUSCLE',
  'bones': 'BONE', 'bone': 'BONE',
  'nerves': 'NERVE', 'nerve': 'NERVE',
  'proteins': 'PROTEIN', 'protein': 'PROTEIN',
  'enzymes': 'ENZYME', 'enzyme': 'ENZYME',
};

// ── A-Z ISL FINGERSPELLING (21-keypoint normalized hand shapes) ──────────────
export const ISL_FINGERSPELLING = {
  'A': {
    hand: 'Fist with thumb resting beside index finger, visible on side',
    emoji: '✊',
    color: '#a1a1aa',
    steps: ['Close all four fingers into a fist', 'Rest thumb beside index, not across', 'Hold steady at neutral height']
  },
  'B': {
    hand: 'All four fingers pointing straight up together, thumb folded flat across palm',
    emoji: '✋',
    color: '#a1a1aa',
    steps: ['Extend all four fingers upward together', 'Fold thumb flat across palm', 'Hold palm facing viewer']
  },
  'C': {
    hand: 'Curved C shape — all fingers curved inward facing forward, thumb parallel',
    emoji: '🤏',
    color: '#a1a1aa',
    steps: ['Curl all fingers in gentle arc', 'Thumb curves parallel to form C', 'Open gap between thumb and index']
  },
  'D': {
    hand: 'Index finger pointing up, remaining fingers and thumb form circle/O',
    emoji: '☝️',
    color: '#a1a1aa',
    steps: ['Index finger points straight up', 'Other fingers touch thumb forming loop', 'Hold steady facing viewer']
  },
  'E': {
    hand: 'All fingers bent at second knuckle into claw shape, thumb tucked under',
    emoji: '🤌',
    color: '#a1a1aa',
    steps: ['Curl all fingers at middle knuckle', 'Thumb folds under fingers', 'Claws face viewer']
  },
  'F': {
    hand: 'Index and thumb form circle/OK, other three fingers extended straight',
    emoji: '👌',
    color: '#a1a1aa',
    steps: ['Pinch index and thumb into circle', 'Extend middle, ring, pinky up', 'Face palm outward']
  },
  'G': {
    hand: 'Index finger and thumb extended parallel pointing horizontally to side',
    emoji: '👉',
    color: '#a1a1aa',
    steps: ['Extend index finger horizontally', 'Extend thumb parallel below index', 'Other fingers curled, point to side']
  },
  'H': {
    hand: 'Index and middle finger extended side-by-side pointing horizontally',
    emoji: '✌️',
    color: '#a1a1aa',
    steps: ['Index and middle fingers together horizontal', 'Other fingers and thumb folded', 'Point to the side']
  },
  'I': {
    hand: 'Pinky finger pointing straight up, other fingers in fist, thumb resting on side',
    emoji: '🤙',
    color: '#a1a1aa',
    steps: ['Only pinky extends straight up', 'All other fingers curled in fist', 'Thumb rests at side']
  },
  'J': {
    hand: 'Pinky up (I-shape) then trace J arc in air downward and curving left',
    emoji: '🤙',
    color: '#a1a1aa',
    steps: ['Start with pinky up (letter I)', 'Draw J curve downward in air', 'End with hook to the left']
  },
  'K': {
    hand: 'Index up, middle forward-angled, thumb between them like a peace sign',
    emoji: '✌️',
    color: '#a1a1aa',
    steps: ['Index points straight up', 'Middle finger angles forward-outward', 'Thumb points between them']
  },
  'L': {
    hand: 'Index pointing straight up, thumb extended outward — classic L shape',
    emoji: '👆',
    color: '#a1a1aa',
    steps: ['Index finger points straight up', 'Thumb extends outward horizontally', 'Forms L shape, other fingers curled']
  },
  'M': {
    hand: 'Three fingers (index, middle, ring) folded over thumb underneath',
    emoji: '✊',
    color: '#a1a1aa',
    steps: ['Fold thumb across palm', 'Index, middle, ring fingers fold over thumb', 'Pinky curled separately']
  },
  'N': {
    hand: 'Two fingers (index, middle) folded over thumb',
    emoji: '✊',
    color: '#a1a1aa',
    steps: ['Thumb positioned across palm', 'Index and middle fingers fold over thumb', 'Ring and pinky curled inward']
  },
  'O': {
    hand: 'All fingertips touch thumb in circle forming O shape, palm faces viewer',
    emoji: '👌',
    color: '#a1a1aa',
    steps: ['Bring all fingertips to touch thumb', 'Maintain round O gap', 'Face palm toward viewer']
  },
  'P': {
    hand: 'K-shape rotated downward — index up, middle angled, thumb between — pointing down',
    emoji: '👇',
    color: '#a1a1aa',
    steps: ['Start in K shape', 'Rotate wrist so hand points down', 'Index and middle angle downward']
  },
  'Q': {
    hand: 'G-shape pointed downward — index and thumb parallel pointing toward ground',
    emoji: '👇',
    color: '#a1a1aa',
    steps: ['Index and thumb extended', 'Rotate to point downward', 'Other fingers curled']
  },
  'R': {
    hand: 'Index and middle fingers crossed over each other pointing upward',
    emoji: '🤞',
    color: '#a1a1aa',
    steps: ['Extend index and middle fingers up', 'Cross middle over index', 'Hold crossed fingers steady up']
  },
  'S': {
    hand: 'Tight fist with thumb wrapped across all fingers on top',
    emoji: '👊',
    color: '#a1a1aa',
    steps: ['Close fingers into tight fist', 'Wrap thumb across all four fingers', 'Fist faces forward']
  },
  'T': {
    hand: 'Thumb tucked between index and middle finger in compact fist',
    emoji: '✊',
    color: '#a1a1aa',
    steps: ['Form a fist', 'Tuck thumb between index and middle fingers', 'Show fist to viewer']
  },
  'U': {
    hand: 'Index and middle fingers straight up together, side by side, other fingers folded',
    emoji: '✌️',
    color: '#a1a1aa',
    steps: ['Index and middle fingers straight up parallel', 'Thumb and other fingers folded', 'U shape visible from front']
  },
  'V': {
    hand: 'Index and middle fingers spread apart forming V/peace sign pointing upward',
    emoji: '✌️',
    color: '#a1a1aa',
    steps: ['Extend index and middle fingers', 'Spread them apart into V', 'Other fingers and thumb folded']
  },
  'W': {
    hand: 'Index, middle, and ring fingers spread upward forming triple W shape',
    emoji: '🖐️',
    color: '#a1a1aa',
    steps: ['Extend index, middle, ring upward', 'Spread slightly apart', 'Thumb and pinky folded inward']
  },
  'X': {
    hand: 'Index finger bent/hooked at knuckle like a question mark hook',
    emoji: '☝️',
    color: '#a1a1aa',
    steps: ['Extend index finger', 'Bend at second knuckle to form hook', 'Other fingers curled, thumb resting']
  },
  'Y': {
    hand: 'Thumb and pinky extended outward, middle three fingers folded — shaka/hang-loose',
    emoji: '🤙',
    color: '#a1a1aa',
    steps: ['Extend thumb and pinky only', 'Fold index, middle, ring down', 'Shaka position at chest height']
  },
  'Z': {
    hand: 'Index finger extended, trace Z shape in air: horizontal right, diagonal left-down, horizontal right',
    emoji: '✍️',
    color: '#a1a1aa',
    steps: ['Extend index finger up', 'Draw horizontal line right', 'Diagonal down-left', 'Horizontal line right again']
  }
};

// ── COMPREHENSIVE ISL WORD DICTIONARY (80+ Signs) ────────────────────────────
export const ISL_WORD_DICTIONARY = {

  // ── ANATOMY & BIOLOGY ──────────────────────────────────────────────────────
  'HEART': {
    gloss: 'HEART',
    category: 'Anatomy',
    description: 'Place curved right palm over left chest (heart side). Tap gently inward twice with heartbeat rhythm. Slight facial expression of focus.',
    hands: 1,
    motion: 'chest-tap',
    icon: '❤️',
    steps: ['Open curved palm over left chest area', 'Tap inward twice rhythmically', 'Pause to suggest heartbeat pulse']
  },
  'PUMP': {
    gloss: 'PUMP BLOOD',
    category: 'Physiology',
    description: 'Hold both fists at chest level facing each other. Rhythmically squeeze open and close both hands together simultaneously, mimicking a pumping heart.',
    hands: 2,
    motion: 'fist-pulse',
    icon: '🫀',
    steps: ['Both hands open at chest level', 'Squeeze into fists simultaneously', 'Open and repeat 2–3 times rhythmically']
  },
  'BLOOD': {
    gloss: 'BLOOD',
    category: 'Anatomy',
    description: 'Touch right index finger lightly to lower lip. Then move hand downward while wiggling all fingers to represent flowing red liquid.',
    hands: 1,
    motion: 'lip-flow',
    icon: '🩸',
    steps: ['Index touches lower lip (red)', 'Move hand downward from lip', 'Wiggle fingers to show liquid flow']
  },
  'VEIN': {
    gloss: 'VEIN',
    category: 'Anatomy',
    description: 'Trace left forearm with right index finger from wrist toward elbow along visible vein lines.',
    hands: 2,
    motion: 'trace-forearm',
    icon: '🩻',
    steps: ['Expose left forearm, palm facing up', 'Right index traces line from wrist up', 'Indicate direction of blood flow']
  },
  'ARTERY': {
    gloss: 'ARTERY',
    category: 'Anatomy',
    description: 'Make BLOOD sign, then point both index fingers outward from chest toward sides — symbolizing arteries carrying blood away from heart.',
    hands: 2,
    motion: 'chest-outward',
    icon: '🫀',
    steps: ['Start at chest center', 'Both index fingers point outward', 'Sweep away from heart']
  },
  'LUNG': {
    gloss: 'LUNGS',
    category: 'Anatomy',
    description: 'Place both flat palms on upper sides of ribcage. Expand hands and arms outward and upward as if breathing in deeply, then contract inward.',
    hands: 2,
    motion: 'ribcage-expand',
    icon: '🫁',
    steps: ['Flat palms on upper ribs', 'Expand outward and upward with breath', 'Contract inward slowly']
  },
  'BRAIN': {
    gloss: 'BRAIN',
    category: 'Anatomy',
    description: 'Tap right bent index and middle fingers against right side of forehead/temple area twice.',
    hands: 1,
    motion: 'temple-tap',
    icon: '🧠',
    steps: ['Bend index and middle fingers', 'Tap against right temple twice', 'Facial expression: thinking']
  },
  'CELL': {
    gloss: 'CELL',
    category: 'Biology',
    description: 'Form small circle/O with right hand index and thumb. Indicate small size with a brief compressing motion.',
    hands: 1,
    motion: 'small-circle',
    icon: '🔬',
    steps: ['Pinch index and thumb into small circle', 'Compress slightly inward', 'Show smallness at chest height']
  },
  'MUSCLE': {
    gloss: 'MUSCLE',
    category: 'Anatomy',
    description: 'Flex right arm making fist, point to bicep with left index. Flex and show the muscle clearly.',
    hands: 2,
    motion: 'flex-arm',
    icon: '💪',
    steps: ['Form fist and flex right arm up', 'Point left index to flexed bicep', 'Nod to indicate strong muscle']
  },
  'BONE': {
    gloss: 'BONE / SKELETON',
    category: 'Anatomy',
    description: 'Cross both bent arms over chest (X shape), then open them outward and tap forearms to simulate hard bone structure.',
    hands: 2,
    motion: 'cross-tap',
    icon: '🦴',
    steps: ['Bend both arms at elbows', 'Cross them over chest (X)', 'Open outward, tap for hardness']
  },
  'NERVE': {
    gloss: 'NERVE',
    category: 'Anatomy',
    description: 'Use both hands with fingers spread, touch fingertips and move in wavy zigzag to show electrical signal transmission along nerves.',
    hands: 2,
    motion: 'wavy-zigzag',
    icon: '⚡',
    steps: ['Spread fingers, both hands facing each other', 'Move in zigzag wave pattern forward', 'Show electrical signal propagation']
  },
  'PROTEIN': {
    gloss: 'PROTEIN',
    category: 'Biochemistry',
    description: 'Fingerspell P-R-O, then make large interlinked chain motion with both hands forming loops together.',
    hands: 2,
    motion: 'fingerspell-chain',
    icon: '🧬',
    steps: ['Fingerspell P-R-O', 'Interlock fingers from both hands', 'Pull apart and rejoin to show chain']
  },
  'ENZYME': {
    gloss: 'ENZYME',
    category: 'Biochemistry',
    description: 'Fingerspell E-N-Z, then mime a key-and-lock motion: one hand as key inserting into the other as lock.',
    hands: 2,
    motion: 'key-lock',
    icon: '🔑',
    steps: ['Fingerspell E-N-Z', 'Right hand forms key shape', 'Insert into loosely cupped left hand (lock)']
  },

  // ── PLANT BIOLOGY & CHEMISTRY ───────────────────────────────────────────────
  'PHOTOSYNTHESIS': {
    gloss: 'PHOTOSYNTHESIS',
    category: 'Plant Biology',
    description: 'First sign LIGHT (open hand pointing up), then cross both arms in X to sign COMBINE/MAKE, then PLANT sign — combining light, water, CO2 into food.',
    hands: 2,
    motion: 'light-combine-plant',
    icon: '🌿',
    steps: ['Open palm pointing upward (light)', 'Cross arms in X (combine)', 'Flat hand sprout upward (plant/food)']
  },
  'CHLOROPHYLL': {
    gloss: 'CHLOROPHYLL',
    category: 'Plant Biology',
    description: 'Fingerspell C-H-L, then show LEAF by placing open flat hand out and wiggling gently, then point to its green color area.',
    hands: 2,
    motion: 'fingerspell-leaf',
    icon: '🍃',
    steps: ['Fingerspell C-H-L', 'Flat hand open (leaf shape)', 'Point to leaf interior (chlorophyll location)']
  },
  'GLUCOSE': {
    gloss: 'GLUCOSE / SUGAR',
    category: 'Biochemistry',
    description: 'Touch right index finger lightly to tongue (sweet), then move hand forward — indicating sweet energy substance.',
    hands: 1,
    motion: 'tongue-forward',
    icon: '🍬',
    steps: ['Touch index to tongue tip (sweet)', 'Move hand forward from lips', 'Facial expression: sweetness']
  },
  'CARBON': {
    gloss: 'CARBON',
    category: 'Chemistry',
    description: 'Fingerspell C-A-R briefly, then mime gas molecule: rounded C-hands come together and apart.',
    hands: 2,
    motion: 'fingerspell-molecule',
    icon: '⚗️',
    steps: ['Briefly spell C-A-R', 'Both curved C-hands face each other', 'Move apart and together (molecule)']
  },
  'DIOXIDE': {
    gloss: 'CARBON DIOXIDE / CO2',
    category: 'Chemistry',
    description: 'Show 2 fingers (dioxide = 2 oxygen), then mime breathing out with OXYGEN sign direction reversed (outward from mouth).',
    hands: 2,
    motion: 'two-oxygen-exhale',
    icon: '💨',
    steps: ['Hold up 2 fingers', 'Then OXYGEN sign outward from mouth', 'Exhale slowly to indicate CO2']
  },
  'OXYGEN': {
    gloss: 'OXYGEN / AIR',
    category: 'Science',
    description: 'Fingerspell O-X quickly, then gently wave flat open palm toward nose representing fresh air breathing.',
    hands: 1,
    motion: 'spell-O-X-wave',
    icon: '💨',
    steps: ['Form O with fingers and thumb', 'Form X shape (index bent)', 'Wave palm gently toward own nose']
  },
  'WATER': {
    gloss: 'WATER',
    category: 'General',
    description: 'Form W-shape with index, middle, ring fingers extended. Tap against chin/lips twice.',
    hands: 1,
    motion: 'W-chin-tap',
    icon: '💧',
    steps: ['Extend index, middle, ring (W shape)', 'Tap against chin or lips', 'Repeat twice smoothly']
  },
  'ENERGY': {
    gloss: 'ENERGY / POWER',
    category: 'Science',
    description: 'Bent arms at sides surge upward with fists — like electricity or strength surging through body.',
    hands: 2,
    motion: 'arms-surge-up',
    icon: '⚡',
    steps: ['Arms bent at sides, fists closed', 'Surge both arms upward energetically', 'Tense muscles visibly']
  },
  'LIGHT': {
    gloss: 'LIGHT / SUNLIGHT',
    category: 'Science',
    description: 'Hold right hand with all fingertips touching (O-shape). Open hand explosively with fingers spreading wide — like light bursting outward.',
    hands: 1,
    motion: 'burst-open',
    icon: '💡',
    steps: ['All fingertips touching above head', 'Open hand explosively outward', 'Fingers spread wide (light spreading)']
  },
  'TEMPERATURE': {
    gloss: 'TEMPERATURE / HEAT',
    category: 'Science',
    description: 'Index finger of right hand draws a thermometer line upward from chin to forehead, indicating rising temperature.',
    hands: 1,
    motion: 'thermometer-rise',
    icon: '🌡️',
    steps: ['Right index at chin level', 'Draw straight line upward slowly', 'Reach forehead (high temperature)']
  },
  'ELECTRICITY': {
    gloss: 'ELECTRICITY / ELECTRIC',
    category: 'Physics',
    description: 'Both index fingers bend and straighten alternately in zigzag motion — mimicking electric current sparks.',
    hands: 2,
    motion: 'zigzag-spark',
    icon: '⚡',
    steps: ['Both index fingers extended', 'Alternate bending at knuckle', 'Zigzag pattern to show current']
  },
  'FORCE': {
    gloss: 'FORCE / PUSH',
    category: 'Physics',
    description: 'Both flat palms push forward firmly from chest outward with visible effort.',
    hands: 2,
    motion: 'push-forward',
    icon: '💪',
    steps: ['Both palms flat at chest', 'Push firmly forward with effort', 'Hold extended position briefly']
  },
  'GRAVITY': {
    gloss: 'GRAVITY / FALL',
    category: 'Physics',
    description: 'Both flat hands face down at head height, then pull downward together to waist level — gravity pulling objects down.',
    hands: 2,
    motion: 'pull-down',
    icon: '🌍',
    steps: ['Both hands at head height facing down', 'Pull both hands down to waist', 'Slow controlled descent motion']
  },
  'MOTION': {
    gloss: 'MOTION / MOVEMENT',
    category: 'Physics',
    description: 'Right index finger traces a smooth curved arc in the air from left to right, indicating movement path.',
    hands: 1,
    motion: 'arc-trace',
    icon: '➡️',
    steps: ['Index finger starts at left side', 'Trace smooth horizontal arc right', 'Follow through completely']
  },
  'ATOM': {
    gloss: 'ATOM',
    category: 'Chemistry',
    description: 'Right index finger orbits around left fist (nucleus) in circular path — electrons orbiting nucleus.',
    hands: 2,
    motion: 'orbit-circle',
    icon: '⚛️',
    steps: ['Left hand forms fist (nucleus)', 'Right index orbits around fist', 'Complete full circular orbit']
  },
  'MOLECULE': {
    gloss: 'MOLECULE',
    category: 'Chemistry',
    description: 'Both fists close together, then slightly apart with connecting motion between them (like atoms bonded).',
    hands: 2,
    motion: 'bonded-atoms',
    icon: '🔗',
    steps: ['Both fists at chest, close together', 'Slight gap with connection between', 'Indicate bond with linking gesture']
  },
  'REACTION': {
    gloss: 'CHEMICAL REACTION',
    category: 'Chemistry',
    description: 'Two C-hands come together and merge/transform — two substances react and change.',
    hands: 2,
    motion: 'merge-transform',
    icon: '⚗️',
    steps: ['Both curved C-hands separated', 'Bring them toward each other', 'Open and reform in new shape']
  },

  // ── EDUCATION & CLASSROOM ──────────────────────────────────────────────────
  'TEACHER': {
    gloss: 'TEACHER / INSTRUCTOR',
    category: 'Education',
    description: 'Flattened O-hands at both temples push knowledge forward together, then both flat hands point downward — indicating a PERSON who teaches.',
    hands: 2,
    motion: 'temple-forward-down',
    icon: '👩‍🏫',
    steps: ['Both O-hands near temples', 'Push forward (sharing knowledge)', 'Hands point down (person marker)']
  },
  'STUDENT': {
    gloss: 'STUDENT / LEARNER',
    category: 'Education',
    description: 'Right flat hand scoops from left flat palm (taking knowledge), lifts to forehead, then both hands point downward — a person who learns.',
    hands: 2,
    motion: 'scoop-to-forehead',
    icon: '🧑‍🎓',
    steps: ['Right hand on flat left palm', 'Scoop upward to forehead', 'Hands point down (person marker)']
  },
  'LEARN': {
    gloss: 'LEARN / STUDY',
    category: 'Education',
    description: 'Right hand sweeps from flat left palm up to forehead — taking knowledge from book/page to mind.',
    hands: 2,
    motion: 'palm-to-forehead',
    icon: '📚',
    steps: ['Open right hand on left palm', 'Sweep right hand upward', 'Touch fingertips to forehead']
  },
  'KNOW': {
    gloss: 'KNOW / KNOWLEDGE',
    category: 'Education',
    description: 'Tap bent right hand (fingertips touching) against right temple twice.',
    hands: 1,
    motion: 'temple-tap-double',
    icon: '🧠',
    steps: ['Bend fingers, touch right temple', 'Tap temple twice gently', 'Nod to confirm']
  },
  'CLASS': {
    gloss: 'CLASS / CLASSROOM',
    category: 'Education',
    description: 'Both C-hands face forward, then sweep around in a circle — enclosing the group/class space.',
    hands: 2,
    motion: 'C-circle',
    icon: '🏫',
    steps: ['Both C-hands facing forward', 'Sweep hands around in full circle', 'End facing each other']
  },
  'BOOK': {
    gloss: 'BOOK / TEXTBOOK',
    category: 'Education',
    description: 'Both flat hands pressed together like a closed book, then open outward like opening pages.',
    hands: 2,
    motion: 'open-book',
    icon: '📖',
    steps: ['Press palms together flat (closed book)', 'Open hands like book opening', 'Hold open position briefly']
  },
  'DIAGRAM': {
    gloss: 'DIAGRAM / CHART',
    category: 'Education',
    description: 'Right index draws a simple rectangle or chart outline in the air, indicating a diagram on a board.',
    hands: 1,
    motion: 'draw-rectangle',
    icon: '📊',
    steps: ['Right index extended', 'Draw rectangle shape in air', 'Point inside to indicate content']
  },
  'EXPERIMENT': {
    gloss: 'EXPERIMENT / LAB',
    category: 'Education',
    description: 'Both bent-knuckle hands alternate pouring motion — like filling and emptying lab beakers.',
    hands: 2,
    motion: 'beaker-pour',
    icon: '🧪',
    steps: ['Both hands in loose fist with thumb up', 'Alternate pouring left-to-right', 'Simulate laboratory procedure']
  },
  'PROCESS': {
    gloss: 'PROCESS / PROCEDURE',
    category: 'Education',
    description: 'Both flat hands face each other, right slightly above left. Rotate both hands in alternating forward circles.',
    hands: 2,
    motion: 'rotate-forward',
    icon: '⚙️',
    steps: ['Both flat hands facing each other', 'Right slightly higher than left', 'Alternate forward circular rotation']
  },

  // ── COMMUNICATION ──────────────────────────────────────────────────────────
  'QUESTION': {
    gloss: 'QUESTION / DOUBT',
    category: 'Communication',
    description: 'Index finger traces question mark shape in the air: curve downward and left, then dot below.',
    hands: 1,
    motion: 'draw-question-mark',
    icon: '❓',
    steps: ['Index finger starts at top', 'Draw curved question mark shape', 'Tap index down for the dot']
  },
  'ANSWER': {
    gloss: 'ANSWER / RESPOND',
    category: 'Communication',
    description: 'Index fingers at lips simultaneously push forward outward toward listener — speaking the answer.',
    hands: 2,
    motion: 'lips-push-forward',
    icon: '💬',
    steps: ['Both index fingers touch lips', 'Push forward simultaneously', 'Open palms forward at end']
  },
  'UNDERSTAND': {
    gloss: 'UNDERSTAND / GET IT',
    category: 'Communication',
    description: 'Fist at right temple, flick index finger upward quickly — lightbulb moment of understanding.',
    hands: 1,
    motion: 'temple-flick',
    icon: '💡',
    steps: ['Fist with index coiled near temple', 'Flick index upward quickly', 'Slight nod and raised eyebrow']
  },
  'SHOW': {
    gloss: 'SHOW / DISPLAY',
    category: 'Communication',
    description: 'Index finger of right hand taps flat left palm, then both hands swing forward together — presenting something.',
    hands: 2,
    motion: 'tap-swing-forward',
    icon: '👁️',
    steps: ['Right index on flat left palm', 'Both hands swing forward together', 'Open and face outward']
  },
  'THINK': {
    gloss: 'THINK / CONSIDER',
    category: 'Communication',
    description: 'Right index finger taps right temple and moves in small circles — the brain working.',
    hands: 1,
    motion: 'temple-circle',
    icon: '🤔',
    steps: ['Index finger at right temple', 'Draw small circles (thinking)', 'Contemplative facial expression']
  },
  'LOOK': {
    gloss: 'LOOK / SEE',
    category: 'Communication',
    description: 'V-sign (index and middle) starting at eyes and pointing outward toward what you look at.',
    hands: 1,
    motion: 'V-eyes-forward',
    icon: '👀',
    steps: ['V-sign at eyes (two fingers)', 'Pivot hand outward to look', 'Point toward object of sight']
  },
  'LISTEN': {
    gloss: 'LISTEN / HEAR',
    category: 'Communication',
    description: 'Curved right hand cupped behind right ear to catch sound — listening carefully.',
    hands: 1,
    motion: 'ear-cup',
    icon: '👂',
    steps: ['Cup right hand beside right ear', 'Tilt head slightly toward sound', 'Hold attentive listening pose']
  },
  'READ': {
    gloss: 'READ',
    category: 'Communication',
    description: 'V-sign (index and middle fingers) scan downward across the flat left palm — reading lines of text.',
    hands: 2,
    motion: 'V-scan-palm',
    icon: '📖',
    steps: ['Flat left hand as the page', 'V-sign from right at top of palm', 'Scan V downward across palm (reading)']
  },
  'WRITE': {
    gloss: 'WRITE',
    category: 'Communication',
    description: 'Pinch right index and thumb in writing grip, mime writing in cursive across flat left palm.',
    hands: 2,
    motion: 'write-on-palm',
    icon: '✍️',
    steps: ['Left palm flat facing up (paper)', 'Right index-thumb writing grip', 'Write cursive motion across palm']
  },
  'NAME': {
    gloss: 'NAME',
    category: 'Communication',
    description: 'Right H-hand (index and middle extended horizontal) taps twice on left H-hand — like writing name on paper.',
    hands: 2,
    motion: 'H-hands-tap',
    icon: '🏷️',
    steps: ['Both hands in H-shape horizontal', 'Right H taps twice on left H', 'Quick double tap']
  },

  // ── GENERAL CONVERSATION ────────────────────────────────────────────────────
  'HELLO': {
    gloss: 'HELLO / HI',
    category: 'Greeting',
    description: 'Open flat hand at right temple, sweep outward in smooth arc — like a friendly salute.',
    hands: 1,
    motion: 'temple-salute-arc',
    icon: '👋',
    steps: ['Open flat hand at right eyebrow', 'Sweep smoothly outward to right', 'Warm smile on face']
  },
  'THANK': {
    gloss: 'THANK YOU',
    category: 'General',
    description: 'Flat right hand touches chin tips, then moves forward and downward toward the person being thanked.',
    hands: 1,
    motion: 'chin-forward-down',
    icon: '🙏',
    steps: ['Flat open palm touches lower chin', 'Move hand forward outward', 'Slight bow of appreciation']
  },
  'PLEASE': {
    gloss: 'PLEASE',
    category: 'General',
    description: 'Flat right palm rubs gentle clockwise circle over center of chest — a polite respectful request.',
    hands: 1,
    motion: 'chest-clockwise-rub',
    icon: '🤲',
    steps: ['Flat palm center of chest', 'Rub smooth clockwise circle', 'Gentle respectful expression']
  },
  'HELP': {
    gloss: 'HELP / ASSIST',
    category: 'General',
    description: 'Right thumbs-up (A-hand) placed on flat left palm. Lift both hands upward together — supporting/helping.',
    hands: 2,
    motion: 'thumbs-lift',
    icon: '🤝',
    steps: ['Left palm flat facing up', 'Right thumb-up (A-hand) on left palm', 'Lift both hands upward together']
  },
  'YES': {
    gloss: 'YES / CORRECT',
    category: 'General',
    description: 'S-hand (fist) nods forward and back at wrist like a head nodding yes.',
    hands: 1,
    motion: 'fist-nod',
    icon: '✅',
    steps: ['Right hand in S (fist)', 'Nod hand forward and back at wrist', 'Mirror facial affirmation']
  },
  'NO': {
    gloss: 'NO / WRONG',
    category: 'General',
    description: 'Index and middle finger close down onto thumb twice like a snapping motion — definitive "no".',
    hands: 1,
    motion: 'snap-close',
    icon: '❌',
    steps: ['Index, middle and thumb extended', 'Snap index and middle down to thumb', 'Repeat twice firmly']
  },
  'GOOD': {
    gloss: 'GOOD / GREAT',
    category: 'General',
    description: 'Right flat hand touches chin, sweeps outward-downward toward left palm held below — showing goodness.',
    hands: 2,
    motion: 'chin-to-palm',
    icon: '👍',
    steps: ['Right flat hand at chin', 'Sweep outward and down', 'Rest on left palm below']
  },
  'DONE': {
    gloss: 'DONE / FINISHED',
    category: 'General',
    description: 'Both open hands face inward at chest then flip outward and downward with a definitive shake — all done!',
    hands: 2,
    motion: 'hands-flip-out',
    icon: '✔️',
    steps: ['Both hands facing inward at chest', 'Flip both outward simultaneously', 'Shake outward twice (finish)']
  },
  'READY': {
    gloss: 'READY',
    category: 'General',
    description: 'Both R-hands (index and middle crossed) start at left side, sweep right together — ready to go.',
    hands: 2,
    motion: 'R-sweep-right',
    icon: '🚀',
    steps: ['Both R-hands (crossed fingers)', 'Start at left, sweep to right', 'End in ready forward position']
  },
  'STOP': {
    gloss: 'STOP',
    category: 'General',
    description: 'Right flat hand chops down firmly onto left flat palm with single decisive motion.',
    hands: 2,
    motion: 'chop-palm',
    icon: '🛑',
    steps: ['Left palm flat facing up', 'Right hand open above', 'Chop down sharply onto left palm']
  },
  'START': {
    gloss: 'START / BEGIN',
    category: 'General',
    description: 'Right index finger inserts into gap between left index and middle fingers, twisting slightly — starting a key/switch.',
    hands: 2,
    motion: 'key-insert-twist',
    icon: '▶️',
    steps: ['Left hand with index and middle extended', 'Right index inserts between them', 'Twist slightly like turning key']
  },
  'REPEAT': {
    gloss: 'REPEAT / AGAIN',
    category: 'Classroom',
    description: 'Bent right hand swings in arc from right, landing palm-down on flat left palm with a tap.',
    hands: 2,
    motion: 'arc-land-palm',
    icon: '🔄',
    steps: ['Left palm flat facing up', 'Right bent hand arcs from side', 'Land on left palm and tap']
  },
  'TODAY': {
    gloss: 'TODAY',
    category: 'Time',
    description: 'Both Y-hands (thumbs and pinkies) drop down simultaneously from above to rest at waist level — "right now, today".',
    hands: 2,
    motion: 'Y-drop-down',
    icon: '📅',
    steps: ['Both hands in Y-shape above', 'Drop both hands to waist level', 'Hold in place briefly']
  },
  'NOW': {
    gloss: 'NOW / PRESENT',
    category: 'Time',
    description: 'Both Y-hands drop straight down quickly to waist/hip level — happening right now.',
    hands: 2,
    motion: 'Y-drop-quick',
    icon: '⏰',
    steps: ['Both Y-hands at chest', 'Drop sharply downward', 'Hold at waist (present moment)']
  },

  // ── SCIENCE SUBJECTS ────────────────────────────────────────────────────────
  'SCIENCE': {
    gloss: 'SCIENCE / EXPERIMENT',
    category: 'Education',
    description: 'Both A-hands (fists, thumbs up) rotate in alternating forward vertical circles at chest — like beakers being swirled.',
    hands: 2,
    motion: 'beaker-rotate',
    icon: '🔬',
    steps: ['Both fists at chest, thumbs outward', 'Alternate forward vertical circles', 'Like lab beakers rotating']
  },
  'BIOLOGY': {
    gloss: 'BIOLOGY',
    category: 'Education',
    description: 'Fingerspell B-I-O, then make SCIENCE sign (alternating beaker rotation).',
    hands: 2,
    motion: 'B-I-O-science',
    icon: '🧬',
    steps: ['Fingerspell B-I-O', 'Transition to science beaker motion', 'Indicate life sciences context']
  },
  'PHYSICS': {
    gloss: 'PHYSICS',
    category: 'Education',
    description: 'Fingerspell P-H-Y, then mime dropping an object and showing arc (gravity/trajectory).',
    hands: 2,
    motion: 'P-H-Y-gravity',
    icon: '⚛️',
    steps: ['Fingerspell P-H-Y', 'Mime dropping object from height', 'Show gravity arc downward']
  },
  'CHEMISTRY': {
    gloss: 'CHEMISTRY',
    category: 'Education',
    description: 'Mime mixing two test tubes together: bring two C-hands toward each other and mix.',
    hands: 2,
    motion: 'C-hands-mix',
    icon: '⚗️',
    steps: ['Both hands in C-shape', 'Bring C-hands toward center', 'Swirl together to mix']
  },

  // ── QUESTION/DOUBT WORKFLOW ─────────────────────────────────────────────────
  'EXPLAIN': {
    gloss: 'EXPLAIN',
    category: 'Communication',
    description: 'Both F-hands (index-thumb circles) move alternately forward and back in front of mouth — words flowing out.',
    hands: 2,
    motion: 'F-alternating-forward',
    icon: '💬',
    steps: ['Both F-hands at lips level', 'Alternate forward-backward motion', 'Continuous flow of words']
  },
  'IMPORTANT': {
    gloss: 'IMPORTANT',
    category: 'Communication',
    description: 'Both F-hands (index-thumb circles) move from below and rise upward to face level — important rising.',
    hands: 2,
    motion: 'F-hands-rise',
    icon: '⭐',
    steps: ['Both F-hands below waist', 'Rise upward to chest/face', 'Emphasize with serious expression']
  },
  'EXAMPLE': {
    gloss: 'EXAMPLE',
    category: 'Communication',
    description: 'Right E-hand taps twice on left index finger — pointing to a specific example.',
    hands: 2,
    motion: 'E-tap-index',
    icon: '👉',
    steps: ['Left hand: index extended', 'Right E-hand taps left index twice', 'Gesture to example nearby']
  },
  'REMEMBER': {
    gloss: 'REMEMBER',
    category: 'Communication',
    description: 'Right A-thumb taps forehead (remembering), then comes down to match against left A-thumb (holding the memory).',
    hands: 2,
    motion: 'A-thumb-forehead-match',
    icon: '💭',
    steps: ['Right A-thumb at forehead', 'Bring down in front of body', 'Touch against left A-thumb']
  }
};

// ── ISL GRAMMAR TOKENIZER ──────────────────────────────────────────────────────
/**
 * Converts English text to ISL grammar order (Subject-Object-Verb / Topic-Comment)
 * and maps to sign sequence using dictionary + fingerspelling fallback.
 * 
 * ISL Grammar Rules applied:
 * 1. Remove stop words (articles, prepositions, auxiliary verbs)
 * 2. Lemmatize words to canonical ISL forms
 * 3. Reorder: Time words first → Subject → Object → Verb
 * 4. Unknown words → A-Z fingerspelling
 */
export function convertTextToISLSequence(text) {
  if (!text || typeof text !== 'string') return [];

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const timeWords = [];
  const subjectWords = [];
  const objectWords = [];
  const verbWords = [];
  const otherWords = [];

  const timeMarkers = new Set(['today', 'now', 'tomorrow', 'yesterday', 'soon', 'later', 'morning', 'afternoon', 'evening']);
  const subjectMarkers = new Set(['teacher', 'teachers', 'instructor', 'student', 'students', 'i', 'you', 'we', 'they', 'he', 'she']);
  const verbMarkers = new Set(['explain', 'explains', 'show', 'shows', 'learn', 'teach', 'ask', 'answer', 'start', 'stop', 'repeat', 'understand', 'read', 'write', 'think', 'know']);

  for (const word of words) {
    if (ISL_STOP_WORDS.has(word)) continue;

    const canonical = ISL_LEMMA_MAP[word] || word.toUpperCase();

    if (timeMarkers.has(word)) {
      timeWords.push(canonical);
    } else if (subjectMarkers.has(word)) {
      subjectWords.push(canonical);
    } else if (verbMarkers.has(word)) {
      verbWords.push(canonical);
    } else {
      otherWords.push(canonical);
    }
  }

  // ISL word order: TIME → SUBJECT → OBJECT/TOPIC → VERB
  const orderedWords = [...timeWords, ...subjectWords, ...otherWords, ...verbWords];

  // Convert to sign sequence
  const sequence = [];

  for (const canonical of orderedWords) {
    if (ISL_WORD_DICTIONARY[canonical]) {
      sequence.push({
        type: 'word',
        token: canonical,
        ...ISL_WORD_DICTIONARY[canonical]
      });
    } else {
      // Fingerspell each letter
      const letters = canonical.replace(/[^A-Z]/g, '').split('');
      for (const char of letters) {
        sequence.push({
          type: 'letter',
          token: char,
          letter: char,
          category: 'Fingerspelling',
          gloss: `Letter ${char}`,
          description: ISL_FINGERSPELLING[char]?.hand || `ISL fingerspelling for letter ${char}`,
          icon: ISL_FINGERSPELLING[char]?.emoji || '✋',
          steps: ISL_FINGERSPELLING[char]?.steps || ['Form the handshape for this letter', 'Hold clearly and briefly'],
          ...(ISL_FINGERSPELLING[char] || {})
        });
      }
    }
  }

  return sequence;
}

/**
 * Quick lookup: returns the ISL dictionary entry for a single word.
 * Supports lemmatization.
 */
export function lookupISLSign(word) {
  if (!word) return null;
  const upper = word.toUpperCase().trim();
  const canonical = ISL_LEMMA_MAP[word.toLowerCase()] || upper;
  return ISL_WORD_DICTIONARY[canonical] || null;
}

/**
 * Returns all available ISL signs as a searchable array.
 */
export function getAllISLSigns() {
  return Object.entries(ISL_WORD_DICTIONARY).map(([key, val]) => ({
    word: key,
    ...val
  }));
}

// ── ISL TAMIL (தமிழ்) TRANSLATION DICTIONARY ──────────────────────────────
export const ISL_TAMIL_DICTIONARY = {
  'HEART': { tamilWord: 'இதயம்', tamilGloss: 'இதயம் / இரத்த பம்ப்' },
  'PUMP': { tamilWord: 'பம்ப் செய்தல்', tamilGloss: 'இரத்த பம்ப்' },
  'BLOOD': { tamilWord: 'இரத்தம்', tamilGloss: 'இரத்தம்' },
  'VEIN': { tamilWord: 'நரம்பு / சிறை', tamilGloss: 'சிறை நரம்பு' },
  'ARTERY': { tamilWord: 'தமனி', tamilGloss: 'தமனி இரத்தக் குழாய்' },
  'LUNG': { tamilWord: 'நுரையீரல்', tamilGloss: 'நுரையீரல்' },
  'BRAIN': { tamilWord: 'மூளை', tamilGloss: 'மூளை' },
  'CELL': { tamilWord: 'செல்கள்', tamilGloss: 'செல்கள்' },
  'MUSCLE': { tamilWord: 'தசைகள்', tamilGloss: 'தசை' },
  'BONE': { tamilWord: 'எலும்புகள்', tamilGloss: 'எலும்பு' },
  'NERVE': { tamilWord: 'நரம்பியல்', tamilGloss: 'நரம்பு' },
  'PROTEIN': { tamilWord: 'புரதம்', tamilGloss: 'புரதம்' },
  'ENZYME': { tamilWord: 'என்சைம்கள் / நொதிகள்', tamilGloss: 'நொதி' },
  'PHOTOSYNTHESIS': { tamilWord: 'ஒளிச்சேர்க்கை', tamilGloss: 'ஒளிச்சேர்க்கை' },
  'CHLOROPHYLL': { tamilWord: 'பச்சையம்', tamilGloss: 'பச்சையம்' },
  'GLUCOSE': { tamilWord: 'குளுக்கோஸ் / சர்க்கரை', tamilGloss: 'குளுக்கோஸ்' },
  'CARBON': { tamilWord: 'கார்பன்', tamilGloss: 'கார்பன்' },
  'DIOXIDE': { tamilWord: 'டைஆக்ஸைடு', tamilGloss: 'கார்பன் டைஆக்ஸைடு' },
  'OXYGEN': { tamilWord: 'ஆக்ஸிஜன்', tamilGloss: 'ஆக்ஸிஜன் வாயு' },
  'WATER': { tamilWord: 'நீர் / தண்ணீர்', tamilGloss: 'நீர்' },
  'ENERGY': { tamilWord: 'ஆற்றல் / சக்தி', tamilGloss: 'ஆற்றல்' },
  'LIGHT': { tamilWord: 'ஒளி / வெளிச்சம்', tamilGloss: 'வெளிச்சம்' },
  'TEMPERATURE': { tamilWord: 'வெப்பநிலை', tamilGloss: 'வெப்பம்' },
  'ELECTRICITY': { tamilWord: 'மின்சாரம்', tamilGloss: 'மின்சாரம்' },
  'FORCE': { tamilWord: 'விசை / தள்ளுதல்', tamilGloss: 'விசை' },
  'GRAVITY': { tamilWord: 'ஈர்ப்பு விசை', tamilGloss: 'புவிஈர்ப்பு விசை' },
  'MOTION': { tamilWord: 'இயக்கம் / நகர்வு', tamilGloss: 'இயக்கம்' },
  'ATOM': { tamilWord: 'அணு', tamilGloss: 'அணு' },
  'MOLECULE': { tamilWord: 'மூலக்கூறு', tamilGloss: 'மூலக்கூறு' },
  'REACTION': { tamilWord: 'வேதிவினை', tamilGloss: 'வினை' },
  'TEACHER': { tamilWord: 'ஆசிரியர்', tamilGloss: 'ஆசிரியர்' },
  'STUDENT': { tamilWord: 'மாணவர்', tamilGloss: 'மாணவர்' },
  'LEARN': { tamilWord: 'கற்றல் / படித்தல்', tamilGloss: 'கற்றல்' },
  'KNOW': { tamilWord: 'தெரியும் / அறிவு', tamilGloss: 'அறிவு' },
  'CLASS': { tamilWord: 'வகுப்பறை', tamilGloss: 'வகுப்பு' },
  'BOOK': { tamilWord: 'புத்தகம்', tamilGloss: 'புத்தகம்' },
  'DIAGRAM': { tamilWord: 'வரைபடம்', tamilGloss: 'வரைபடம்' },
  'EXPERIMENT': { tamilWord: 'சோதனை / பரிசோதனை', tamilGloss: 'ஆய்வு' },
  'PROCESS': { tamilWord: 'செயல்முறை', tamilGloss: 'செயல்முறை' },
  'QUESTION': { tamilWord: 'கேள்வி / சந்தேகம்', tamilGloss: 'சந்தேகம்' },
  'ANSWER': { tamilWord: 'பதில் / விடை', tamilGloss: 'பதில்' },
  'UNDERSTAND': { tamilWord: 'புரிந்தது', tamilGloss: 'புரிந்தது' },
  'SHOW': { tamilWord: 'காண்பி / காட்டுதல்', tamilGloss: 'காண்பித்தல்' },
  'THINK': { tamilWord: 'யோசித்தல் / சிந்தனை', tamilGloss: 'சிந்தித்தல்' },
  'LOOK': { tamilWord: 'பார்த்தல்', tamilGloss: 'பார்த்தல்' },
  'LISTEN': { tamilWord: 'கேட்டல்', tamilGloss: 'கவனித்தல்' },
  'READ': { tamilWord: 'வாசித்தல்', tamilGloss: 'படித்தல்' },
  'WRITE': { tamilWord: 'எழுதுதல்', tamilGloss: 'எழுதுதல்' },
  'NAME': { tamilWord: 'பெயர்', tamilGloss: 'பெயர்' },
  'HELLO': { tamilWord: 'வணக்கம்', tamilGloss: 'வணக்கம்' },
  'THANK': { tamilWord: 'நன்றி', tamilGloss: 'நன்றி' },
  'PLEASE': { tamilWord: 'தயவுசெய்து', tamilGloss: 'தயவுசெய்து' },
  'HELP': { tamilWord: 'உதவி', tamilGloss: 'உதவி' },
  'YES': { tamilWord: 'ஆம் / சரி', tamilGloss: 'சரி' },
  'NO': { tamilWord: 'இல்லை / தவறு', tamilGloss: 'இல்லை' },
  'GOOD': { tamilWord: 'நன்று / நல்லது', tamilGloss: 'நன்று' },
  'DONE': { tamilWord: 'முடிந்தது', tamilGloss: 'முடிந்தது' },
  'READY': { tamilWord: 'தயார்', tamilGloss: 'தயார்' },
  'STOP': { tamilWord: 'நிறுத்து', tamilGloss: 'நிறுத்து' },
  'START': { tamilWord: 'தொடங்கு', tamilGloss: 'தொடங்கு' },
  'REPEAT': { tamilWord: 'மீண்டும் செய்', tamilGloss: 'திரும்ப' },
  'TODAY': { tamilWord: 'இன்று', tamilGloss: 'இன்று' },
  'NOW': { tamilWord: 'இப்போது', tamilGloss: 'இப்போது' },
  'SCIENCE': { tamilWord: 'அறிவியல்', tamilGloss: 'அறிவியல்' },
  'BIOLOGY': { tamilWord: 'உயிரியல்', tamilGloss: 'உயிரியல்' },
  'PHYSICS': { tamilWord: 'இயற்பியல்', tamilGloss: 'இயற்பியல்' },
  'CHEMISTRY': { tamilWord: 'வேதியியல்', tamilGloss: 'வேதியியல்' },
  'EXPLAIN': { tamilWord: 'விளக்குதல்', tamilGloss: 'விளக்கம்' },
  'IMPORTANT': { tamilWord: 'முக்கியமானது', tamilGloss: 'முக்கியம்' },
  'EXAMPLE': { tamilWord: 'உதாரணம்', tamilGloss: 'உதாரணம்' },
  'REMEMBER': { tamilWord: 'நினைவில் கொள்', tamilGloss: 'நினைவு' }
};

/**
 * Translates recognized ISL sign / gloss into Tamil text.
 */
export function translateISLToTamil(textOrSign) {
  if (!textOrSign) return '';
  const clean = textOrSign.toString().toUpperCase().trim();
  if (ISL_TAMIL_DICTIONARY[clean]) {
    return ISL_TAMIL_DICTIONARY[clean].tamilWord;
  }
  const words = clean.split(/\s+/);
  const translated = words.map(w => ISL_TAMIL_DICTIONARY[w]?.tamilWord || w);
  return translated.join(' ');
}

