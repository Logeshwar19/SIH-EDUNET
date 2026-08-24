// Initial pre-loaded lessons for client-side state and instant offline operation
export const initialLessons = [
  {
    id: "lesson-heart-anatomy",
    title: "The Human Heart & Circulatory System",
    subject: "Class 10 Biology",
    grade: "Grade 10",
    estimatedTime: "15 mins",
    summary: "The human heart is a four-chambered muscular organ that pumps blood throughout the body. It consists of the Right Atrium, Right Ventricle, Left Atrium, and Left Ventricle, separating oxygen-rich and oxygen-poor blood.",
    originalFileName: "Class10_Human_Heart_Anatomy.pdf",
    uploadedAt: "2026-08-20T10:30:00Z",
    teacherNotes: "Emphasize blood circulation pathway from Right Atrium to Lungs to Left Ventricle to Body.",
    
    // Deaf Module Artifacts
    islModule: {
      lessonGlosses: [
        { word: "HEART", gloss: "HEART", description: "Place hand over left chest and tap twice.", duration: 2.5 },
        { word: "PUMP", gloss: "PUMP BLOOD", description: "Open and squeeze both fists rhythmically.", duration: 3.0 },
        { word: "CHAMBERS", gloss: "FOUR ROOMS", description: "Hold four fingers up, then form box shapes.", duration: 2.8 },
        { word: "OXYGEN", gloss: "O-X-Y-G-E-N AIR", description: "Fingerspell O-X, then wave hand toward nose.", duration: 3.2 },
        { word: "SCIENCE", gloss: "SCIENCE / EXPERIMENT", description: "Move fists in alternating downward circular motions.", duration: 2.6 },
        { word: "STUDENT", gloss: "STUDENT / LEARN", description: "Move hand from palm to forehead, then point down.", duration: 2.7 },
        { word: "TEACHER", gloss: "TEACHER / INSTRUCTOR", description: "Move hands forward from temples, then downward.", duration: 2.8 },
        { word: "QUESTION", gloss: "ASK / QUESTION", description: "Form a question mark in the air with index finger.", duration: 2.2 },
        { word: "ANSWER", gloss: "REPLY / ANSWER", description: "Touch index finger to chin and move outward.", duration: 2.4 }
      ],
      videoSequenceUrl: "https://assets.mixkit.co/videos/preview/mixkit-hands-gesturing-sign-language-42674-large.mp4",
      practiceWords: [
        {
          id: "heart",
          word: "Heart",
          hint: "Place your right hand over the left side of your chest and tap gently.",
          targetLandmarksDescription: "Right hand palm facing chest, fingers curved, near center-left torso.",
          targetPose: "CHEST_CUP",
          difficulty: "Easy"
        },
        {
          id: "pump",
          word: "Pump",
          hint: "Hold both hands in front and squeeze into fists repeatedly.",
          targetLandmarksDescription: "Both hands forming symmetric fists expanding and contracting.",
          targetPose: "FIST_PULSE",
          difficulty: "Medium"
        },
        {
          id: "science",
          word: "Science",
          hint: "Form fists with thumbs inward and rotate hands in circular motions.",
          targetLandmarksDescription: "Thumbs pointing towards body, alternating circular vertical loops.",
          targetPose: "BEAKER_POUR",
          difficulty: "Medium"
        },
        {
          id: "teacher",
          word: "Teacher",
          hint: "Hold hands near temples and move them forward.",
          targetLandmarksDescription: "Hands at head height, forward translation, person indicator sign.",
          targetPose: "TEMPLE_FORWARD",
          difficulty: "Easy"
        },
        {
          id: "answer",
          word: "Answer",
          hint: "Touch index finger to chin and move it forward.",
          targetLandmarksDescription: "Index finger forward extension from mouth region.",
          targetPose: "CHIN_EXTEND",
          difficulty: "Easy"
        }
      ],
      quiz: [
        {
          id: "q-isl-1",
          question: "Which chamber pumps oxygenated blood to the rest of the body?",
          options: ["Right Atrium", "Left Ventricle", "Right Ventricle", "Pulmonary Artery"],
          correctIndex: 1,
          signHint: "Left Ventricle has the thickest muscle wall."
        },
        {
          id: "q-isl-2",
          question: "How many chambers does the human heart have?",
          options: ["Two", "Three", "Four", "Six"],
          correctIndex: 2,
          signHint: "Four chambers: 2 Atria and 2 Ventricles."
        }
      ]
    },

    // Blind Module Artifacts
    bviModule: {
      audioSummary: "Welcome to the Human Heart lesson. The heart is a muscular organ with four chambers: the Right Atrium, Left Atrium, Right Ventricle, and Left Ventricle. Valves keep blood flowing in one direction.",
      audioSections: [
        {
          sectionTitle: "Section 1: Overview & Location",
          content: "The human heart is roughly the size of a closed fist, located slightly to the left of the center of your chest. It beats around 70 to 80 times per minute, circulating 5 liters of blood continuously."
        },
        {
          sectionTitle: "Section 2: The Four Chambers",
          content: "The Right Atrium receives deoxygenated blood from the body. It passes to the Right Ventricle, which pumps it to the lungs. Oxygenated blood from the lungs enters the Left Atrium, moves into the Left Ventricle, and is pumped through the Aorta to the entire body."
        },
        {
          sectionTitle: "Section 3: Valves and Unidirectional Flow",
          content: "Tricuspid and Bicuspid valves prevent backward flow of blood. When heart muscles contract, known as systole, blood is propelled forward under pressure."
        }
      ],
      hapticDiagram: {
        id: "diagram-heart",
        title: "Cross-Section of Human Heart",
        aspectRatio: "4:3",
        viewBox: { width: 800, height: 600 },
        paths: [
          {
            id: "outer-wall",
            name: "Cardiac Outer Boundary",
            type: "boundary",
            d: "M 400,120 C 520,70 660,160 640,320 C 620,440 460,530 400,560 C 340,530 180,440 160,320 C 140,160 280,70 400,120 Z",
            vibrationPattern: [40, 25]
          },
          {
            id: "septum-wall",
            name: "Central Septum Dividing Wall",
            type: "inner-wall",
            d: "M 400,200 L 400,540",
            vibrationPattern: [60, 30]
          },
          {
            id: "aorta-arch",
            name: "Aorta Arch",
            type: "vessel",
            d: "M 370,140 C 370,50 490,40 500,120",
            vibrationPattern: [45, 20]
          }
        ],
        landmarks: [
          {
            id: "poi-left-ventricle",
            name: "Left Ventricle",
            x: 490,
            y: 430,
            radius: 46,
            audioDescription: "You are touching the Left Ventricle. It has thick muscular walls to pump oxygen-rich blood through the aorta to the body.",
            hapticTone: [100, 50, 100],
            color: "#EF4444"
          },
          {
            id: "poi-right-ventricle",
            name: "Right Ventricle",
            x: 310,
            y: 430,
            radius: 46,
            audioDescription: "You are touching the Right Ventricle. It pumps blood to the lungs to receive oxygen.",
            hapticTone: [80, 40, 80],
            color: "#3B82F6"
          },
          {
            id: "poi-left-atrium",
            name: "Left Atrium",
            x: 490,
            y: 250,
            radius: 42,
            audioDescription: "You are touching the Left Atrium. It receives oxygen-rich blood from the lungs.",
            hapticTone: [90, 45, 90],
            color: "#F87171"
          },
          {
            id: "poi-right-atrium",
            name: "Right Atrium",
            x: 310,
            y: 250,
            radius: 42,
            audioDescription: "You are touching the Right Atrium. It receives blood returning from the body.",
            hapticTone: [70, 35, 70],
            color: "#60A5FA"
          },
          {
            id: "poi-aorta",
            name: "Aorta Arch",
            x: 430,
            y: 95,
            radius: 45,
            audioDescription: "You are touching the Aorta Arch. It is the main artery carrying oxygenated blood from the heart to the body.",
            hapticTone: [120, 60, 120],
            color: "#DC2626"
          }
        ]
      },
      voiceQuiz: [
        {
          id: "vq-1",
          spokenQuestion: "What is the main function of the Left Ventricle?",
          expectedKeywords: ["pump", "blood", "body", "oxygen", "aorta", "thick"],
          modelAnswer: "The Left Ventricle pumps oxygenated blood through the aorta to the rest of the body.",
          points: 10
        },
        {
          id: "vq-2",
          spokenQuestion: "Why are heart valves important during blood flow?",
          expectedKeywords: ["backflow", "prevent", "one direction", "backward", "unidirectional"],
          modelAnswer: "Valves prevent the backflow of blood and maintain unidirectional flow.",
          points: 10
        }
      ]
    }
  },
  {
    id: "lesson-photosynthesis",
    title: "Photosynthesis & Leaf Anatomy",
    subject: "Class 9 Science",
    grade: "Grade 9",
    estimatedTime: "12 mins",
    summary: "Photosynthesis is the process green plants use to convert sunlight, water, and carbon dioxide into energy and oxygen.",
    originalFileName: "Class9_Photosynthesis_Leaf_Structure.pdf",
    uploadedAt: "2026-08-19T09:15:00Z",
    teacherNotes: "Focus on chloroplasts, chlorophyll, and stomata function.",
    
    // Deaf Module Artifacts
    islModule: {
      lessonGlosses: [
        { word: "PHOTOSYNTHESIS", gloss: "PLANT + SUN + FOOD MAKE", description: "Sign plant growth, touch sun overhead, and gesture energy.", duration: 3.5 },
        { word: "PLANT", gloss: "PLANT GROW", description: "Open hand upward to mimic a growing plant.", duration: 2.4 },
        { word: "SUNLIGHT", gloss: "SUN SHINE DOWN", description: "Circle hand overhead and lower open fingers.", duration: 2.8 },
        { word: "WATER", gloss: "WATER / LIQUID", description: "W-handshape tapping near the corner of the lower lip.", duration: 2.2 },
        { word: "OXYGEN", gloss: "AIR GOOD / OXYGEN", description: "Open palms fluttering near chest indicating breathable air.", duration: 2.5 },
        { word: "ENERGY", gloss: "POWER / ENERGY", description: "Flex bicep and touch with other hand showing vitality.", duration: 2.6 }
      ],
      videoSequenceUrl: "https://assets.mixkit.co/videos/preview/mixkit-hands-gesturing-sign-language-42674-large.mp4",
      practiceWords: [
        {
          id: "plant",
          word: "Plant",
          hint: "Hold left hand cupped and push right hand upward while expanding fingers.",
          targetLandmarksDescription: "Right hand ascending through left palm, fingers expanding.",
          targetPose: "PLANT_GROWTH",
          difficulty: "Easy"
        },
        {
          id: "sunlight",
          word: "Sunlight",
          hint: "Form a circle above your head and lower your fingers.",
          targetLandmarksDescription: "High circular gesture expanding downward into open palm.",
          targetPose: "SUN_RAYS",
          difficulty: "Medium"
        },
        {
          id: "water",
          word: "Water",
          hint: "Form a W shape with your fingers and tap your chin.",
          targetLandmarksDescription: "Index, middle, and ring finger raised in W configuration near mouth.",
          targetPose: "W_CHIN_TAP",
          difficulty: "Easy"
        }
      ],
      quiz: [
        {
          id: "q-isl-p1",
          question: "Which green pigment absorbs light energy in chloroplasts?",
          options: ["Hemoglobin", "Chlorophyll", "Carotene", "Melanin"],
          correctIndex: 1,
          signHint: "Chlorophyll gives leaves their green color."
        }
      ]
    },

    // Blind Module Artifacts
    bviModule: {
      audioSummary: "Welcome to the Photosynthesis lesson. Leaves use chlorophyll to capture sunlight, absorb carbon dioxide through stomata, and combine water to make glucose.",
      audioSections: [
        {
          sectionTitle: "Section 1: The Chemical Formula",
          content: "Six molecules of carbon dioxide plus six molecules of water, in the presence of light and chlorophyll, yield one molecule of glucose and six molecules of oxygen gas."
        },
        {
          sectionTitle: "Section 2: Leaf Cross-Section Anatomy",
          content: "A leaf has an upper waxy cuticle protecting it. Below is the palisade mesophyll packed with chloroplasts. At the bottom, stomatal pores flanked by guard cells control gas exchange."
        }
      ],
      hapticDiagram: {
        id: "diagram-leaf",
        title: "Microscopic Cross-Section of a Plant Leaf",
        aspectRatio: "4:3",
        viewBox: { width: 800, height: 600 },
        paths: [
          {
            id: "upper-cuticle",
            name: "Upper Waxy Cuticle Layer",
            type: "boundary",
            d: "M 100,120 L 700,120",
            vibrationPattern: [35, 15]
          },
          {
            id: "lower-cuticle",
            name: "Lower Epidermis Boundary",
            type: "boundary",
            d: "M 100,480 L 700,480",
            vibrationPattern: [35, 15]
          },
          {
            id: "vein-bundle",
            name: "Vascular Bundle (Xylem & Phloem)",
            type: "vessel",
            d: "M 400,240 C 460,240 460,360 400,360 C 340,360 340,240 400,240 Z",
            vibrationPattern: [50, 20]
          }
        ],
        landmarks: [
          {
            id: "poi-chloroplast",
            name: "Palisade Chloroplasts",
            x: 250,
            y: 220,
            radius: 45,
            audioDescription: "You are touching the Palisade Mesophyll. These cells contain chloroplasts where photosynthesis occurs.",
            hapticTone: [90, 45, 90],
            color: "#22C55E"
          },
          {
            id: "poi-stoma",
            name: "Stomatal Pore & Guard Cells",
            x: 350,
            y: 480,
            radius: 40,
            audioDescription: "You are touching a Stomatal Pore. Guard cells open and close to control gas exchange.",
            hapticTone: [110, 50, 110],
            color: "#10B981"
          },
          {
            id: "poi-vein",
            name: "Vascular Bundle (Vein)",
            x: 400,
            y: 300,
            radius: 48,
            audioDescription: "You are touching the Vascular Vein. Xylem carries water from roots, and phloem transports sugar.",
            hapticTone: [100, 50, 100],
            color: "#3B82F6"
          }
        ]
      },
      voiceQuiz: [
        {
          id: "vq-p1",
          spokenQuestion: "What gas do plants take in through stomata during photosynthesis?",
          expectedKeywords: ["carbon dioxide", "co2", "carbon"],
          modelAnswer: "Plants absorb Carbon Dioxide from the atmosphere through their stomata.",
          points: 10
        },
        {
          id: "vq-p2",
          spokenQuestion: "What is the main sugar product created by photosynthesis?",
          expectedKeywords: ["glucose", "sugar", "carbohydrate", "energy"],
          modelAnswer: "Glucose is the primary carbohydrate food product created.",
          points: 10
        }
      ]
    }
  }
];

export const initialStudents = [
  {
    id: "student-rohan",
    name: "Rohan Patel",
    type: "deaf",
    avatar: "ISL",
    school: "Delhi Inclusive Academy",
    grade: "Grade 10",
    completedLessons: 4,
    signAccuracyAvg: 93,
    lastActive: "Active 5m ago",
    recentSignSubmissions: [
      { word: "Heart", score: 96, timestamp: "Today 10:15 AM", status: "Mastered" },
      { word: "Pump", score: 91, timestamp: "Today 10:18 AM", status: "Mastered" },
      { word: "Science", score: 92, timestamp: "Yesterday", status: "Mastered" }
    ],
    messagesToTeacher: [
      { id: "msg-1", text: "Completed the Heart circulation sign practice.", timestamp: "10:20 AM" }
    ]
  },
  {
    id: "student-ananya",
    name: "Ananya Sharma",
    type: "blind",
    avatar: "BVI",
    school: "Delhi Inclusive Academy",
    grade: "Grade 10",
    completedLessons: 4,
    voiceQuizAvg: 95,
    lastActive: "Active 2m ago",
    hapticExplorationMinutes: 28,
    recentQuizResults: [
      { lesson: "Human Heart", score: 20, maxScore: 20, feedback: "Clear explanation of Left Ventricle pressure and valve prevention." },
      { lesson: "Photosynthesis", score: 19, maxScore: 20, feedback: "Accurate recall of Carbon Dioxide and stomatal mechanism." }
    ],
    diagramsExplored: ["Cross-Section of Human Heart", "Microscopic Leaf Anatomy"]
  }
];
