export const DIAGRAM_LIBRARY = {
  heart: {
    id: 'heart',
    label: 'Human Heart & Blood Circulation',
    triggerKeywords: ['heart', 'ventricle', 'atrium', 'cardiac', 'circulation', 'blood', 'aorta', 'valve', 'cardiovascular'],
    description: 'A four-chambered muscular organ pumping oxygen-rich blood through the aorta and receiving deoxygenated blood via the vena cava.',
    paths: [
      { id: 'heart-outer', name: 'Muscular Pericardium Outer Wall', type: 'boundary', d: 'M 400,120 C 520,70 660,160 640,320 C 620,440 460,530 400,560 C 340,530 180,440 160,320 C 140,160 280,70 400,120 Z', vibrationPattern: [50, 30] },
      { id: 'heart-septum', name: 'Interventricular Septum Wall', type: 'inner-wall', d: 'M 400,180 L 400,540', vibrationPattern: [30, 20] },
      { id: 'heart-valves', name: 'Tricuspid & Bicuspid Valve Floor', type: 'inner-wall', d: 'M 220,340 L 580,340', vibrationPattern: [30, 20] },
      { id: 'heart-aorta-arch', name: 'Aorta Arch Vessel', type: 'boundary', d: 'M 370,170 C 370,70 470,60 480,170', vibrationPattern: [45, 25] },
      { id: 'heart-pulmonary-art', name: 'Pulmonary Artery Conduit', type: 'inner-wall', d: 'M 340,200 C 320,120 250,120 230,180', vibrationPattern: [30, 20] }
    ],
    regions: [
      { 
        id: 'left_ventricle', 
        label: 'Left Ventricle', 
        x: 0.62, 
        y: 0.70, 
        radius: 0.08,
        description: 'Left Ventricle: Has the thickest muscular chamber wall to generate high systolic pressure, pumping oxygenated blood through the aorta to bodily tissues.'
      },
      { 
        id: 'right_ventricle', 
        label: 'Right Ventricle', 
        x: 0.38, 
        y: 0.70, 
        radius: 0.08,
        description: 'Right Ventricle: Pumps deoxygenated blood to the pulmonary lungs via the pulmonary artery for oxygenation.'
      },
      { 
        id: 'left_atrium', 
        label: 'Left Atrium', 
        x: 0.62, 
        y: 0.38, 
        radius: 0.07,
        description: 'Left Atrium: Receives freshly oxygen-enriched blood returning from the four pulmonary veins.'
      },
      { 
        id: 'right_atrium', 
        label: 'Right Atrium', 
        x: 0.38, 
        y: 0.38, 
        radius: 0.07,
        description: 'Right Atrium: Collects deoxygenated venous blood returning from superior and inferior vena cava.'
      },
      { 
        id: 'aorta', 
        label: 'Aorta Arch', 
        x: 0.54, 
        y: 0.15, 
        radius: 0.07,
        description: 'Aorta Arch: The primary systemic artery in the human body distributing oxygen-rich blood.'
      }
    ]
  },
  plant_cell: {
    id: 'plant_cell',
    label: 'Plant Leaf & Photosynthesis Cell',
    triggerKeywords: ['photosynthesis', 'cell', 'chloroplast', 'leaf', 'plant', 'stomata', 'guard cell', 'chlorophyll'],
    description: 'Cross-section of plant tissue showing chloroplast-dense palisade cells and stomatal pores for gas exchange.',
    paths: [
      { id: 'cell-wall-outer', name: 'Cellulose Cell Wall & Cuticle', type: 'boundary', d: 'M 120,120 L 680,120 L 680,480 L 120,480 Z', vibrationPattern: [50, 30] },
      { id: 'cell-membrane-inner', name: 'Plasma Membrane Perimeter', type: 'inner-wall', d: 'M 145,145 L 655,145 L 655,455 L 145,455 Z', vibrationPattern: [30, 20] },
      { id: 'chloroplast-1', name: 'Upper Chloroplast Organelle', type: 'inner-wall', d: 'M 280,210 C 330,210 330,280 280,280 C 230,280 230,210 280,210 Z', vibrationPattern: [40, 20] },
      { id: 'chloroplast-2', name: 'Lower Chloroplast Organelle', type: 'inner-wall', d: 'M 280,330 C 330,330 330,400 280,400 C 230,400 230,330 280,330 Z', vibrationPattern: [40, 20] },
      { id: 'vascular-bundle-line', name: 'Vascular Bundle (Xylem & Phloem)', type: 'inner-wall', d: 'M 520,150 L 520,450', vibrationPattern: [30, 20] },
      { id: 'stoma-pore-crescent', name: 'Stomatal Aperture & Guard Cell Pair', type: 'inner-wall', d: 'M 370,480 C 400,430 400,430 430,480', vibrationPattern: [40, 25] }
    ],
    regions: [
      { 
        id: 'chloroplast', 
        label: 'Chloroplast Organelle', 
        x: 0.35, 
        y: 0.35, 
        radius: 0.08,
        description: 'Chloroplast: Double-membrane organelle containing thylakoid grana where solar light energy is converted into chemical glucose.'
      },
      { 
        id: 'stoma', 
        label: 'Stoma & Guard Cells', 
        x: 0.50, 
        y: 0.80, 
        radius: 0.07,
        description: 'Stomatal Pore: Microscopic aperture regulated by turgid guard cells to admit CO2 and release O2.'
      },
      { 
        id: 'vein_bundle', 
        label: 'Vascular Bundle', 
        x: 0.65, 
        y: 0.50, 
        radius: 0.08,
        description: 'Vascular Bundle: Xylem pipelines bringing water up from roots and phloem distributing synthesized sugars.'
      },
      { 
        id: 'cell_wall', 
        label: 'Cell Wall & Upper Cuticle', 
        x: 0.50, 
        y: 0.20, 
        radius: 0.06,
        description: 'Upper Cuticle & Cell Wall: Rigid cellulose matrix maintaining cellular structure and minimizing transpiration.'
      }
    ]
  },
  human_eye: {
    id: 'human_eye',
    label: 'Human Eye Optical Anatomy',
    triggerKeywords: ['eye', 'cornea', 'lens', 'retina', 'pupil', 'iris', 'optic', 'vision', 'optical', 'refraction'],
    description: 'Anatomical cross-section of the human eye showing light refraction pathways through the cornea, lens, and focus onto the retina.',
    paths: [
      { id: 'eye-sclera', name: 'Sclera Outer Eyeball Wall', type: 'boundary', d: 'M 400,120 C 580,120 680,220 680,360 C 680,500 580,560 400,560 C 260,560 200,480 200,360 C 200,240 260,120 400,120 Z', vibrationPattern: [50, 30] },
      { id: 'eye-cornea-dome', name: 'Cornea Anterior Bulge', type: 'boundary', d: 'M 200,240 C 130,300 130,420 200,480', vibrationPattern: [50, 30] },
      { id: 'eye-lens-ellipse', name: 'Crystalline Lens', type: 'inner-wall', d: 'M 300,270 C 335,270 335,450 300,450 C 265,450 265,270 300,270 Z', vibrationPattern: [40, 20] },
      { id: 'eye-retina-arc', name: 'Photoreceptive Retina Layer', type: 'inner-wall', d: 'M 540,170 C 640,240 640,480 540,520', vibrationPattern: [45, 25] },
      { id: 'eye-optic-nerve-stem', name: 'Optic Nerve Bundle', type: 'boundary', d: 'M 640,330 L 740,330 M 640,390 L 740,390', vibrationPattern: [40, 20] }
    ],
    regions: [
      { id: 'cornea', label: 'Cornea & Pupil', x: 0.20, y: 0.50, radius: 0.08, description: 'Cornea & Pupil: Clear front dome that bends incoming light rays into the anterior chamber.' },
      { id: 'lens', label: 'Crystalline Lens', x: 0.37, y: 0.50, radius: 0.07, description: 'Lens: Flexible biconvex crystalline structure focusing optical rays sharply onto the fovea.' },
      { id: 'retina', label: 'Retina Photoreceptor Layer', x: 0.76, y: 0.50, radius: 0.09, description: 'Retina: Light-sensitive sensory lining containing rod and cone photoreceptors.' },
      { id: 'optic_nerve', label: 'Optic Nerve Pathway', x: 0.88, y: 0.60, radius: 0.07, description: 'Optic Nerve: Cranial pathway transmitting neural visual data to the cerebral visual cortex.' }
    ]
  },
  brain: {
    id: 'brain',
    label: 'Human Brain & Neural Lobes',
    triggerKeywords: ['brain', 'neuron', 'nervous', 'cerebrum', 'cerebellum', 'lobe', 'cortex', 'medulla', 'synapse'],
    description: 'Sagittal view of the human brain displaying the cerebrum, frontal lobe, cerebellum, and brainstem.',
    paths: [
      { id: 'brain-cerebrum-outer', name: 'Cerebral Cortex Boundary', type: 'boundary', d: 'M 200,380 C 200,160 600,160 680,360 C 700,440 660,500 580,500 C 580,560 500,560 480,500 L 480,570 M 430,500 L 430,570 C 360,520 280,480 200,380 Z', vibrationPattern: [50, 30] },
      { id: 'brain-sulcus-divider', name: 'Central Sulcus & Fissure', type: 'inner-wall', d: 'M 440,180 C 440,300 460,380 480,440', vibrationPattern: [30, 20] },
      { id: 'brain-cerebellum-contour', name: 'Cerebellar Folia Lobes', type: 'inner-wall', d: 'M 580,420 C 640,460 600,520 540,510', vibrationPattern: [35, 20] }
    ],
    regions: [
      { id: 'frontal_lobe', label: 'Frontal Cerebrum', x: 0.35, y: 0.35, radius: 0.09, description: 'Frontal Lobe: Center for decision making, reasoning, motor control, and speech synthesis.' },
      { id: 'parietal_occipital', label: 'Parietal & Occipital Cortex', x: 0.70, y: 0.38, radius: 0.09, description: 'Parietal & Occipital Cortex: Processes sensory touch, spatial orientation, and visual signals.' },
      { id: 'cerebellum', label: 'Cerebellum', x: 0.70, y: 0.68, radius: 0.08, description: 'Cerebellum: Regulates fine motor precision, muscular coordination, and balance.' },
      { id: 'brainstem', label: 'Brainstem & Medulla', x: 0.48, y: 0.80, radius: 0.07, description: 'Brainstem & Medulla: Controls involuntary life-support functions like heartbeat and respiration.' }
    ]
  },
  respiratory: {
    id: 'respiratory',
    label: 'Human Respiratory System & Lungs',
    triggerKeywords: ['respiratory', 'lungs', 'trachea', 'bronchi', 'alveoli', 'breathing', 'inhalation', 'exhalation', 'diaphragm'],
    description: 'Human respiratory tract showing trachea bifurcation into bronchi, bronchial trees, and alveoli air sacs for oxygen-carbon dioxide gas exchange.',
    paths: [
      { id: 'resp-trachea-left', name: 'Trachea Windpipe Walls', type: 'boundary', d: 'M 375,100 L 375,260 M 425,100 L 425,260', vibrationPattern: [45, 25] },
      { id: 'resp-trachea-rings', name: 'Cartilaginous Rings', type: 'inner-wall', d: 'M 375,140 L 425,140 M 375,180 L 425,180 M 375,220 L 425,220', vibrationPattern: [30, 20] },
      { id: 'resp-left-lung', name: 'Left Lung Lobe Contour', type: 'boundary', d: 'M 425,260 C 560,260 660,340 660,480 C 660,540 560,560 450,520 C 440,400 430,320 425,260 Z', vibrationPattern: [50, 30] },
      { id: 'resp-right-lung', name: 'Right Lung Lobe Contour', type: 'boundary', d: 'M 375,260 C 240,260 140,340 140,480 C 140,540 240,560 350,520 C 360,400 370,320 375,260 Z', vibrationPattern: [50, 30] },
      { id: 'resp-diaphragm', name: 'Diaphragmatic Arch', type: 'inner-wall', d: 'M 140,550 C 400,510 400,510 660,550', vibrationPattern: [35, 20] }
    ],
    regions: [
      { id: 'trachea', label: 'Trachea (Windpipe)', x: 0.50, y: 0.22, radius: 0.06, description: 'Trachea: Cartilaginous windpipe conducting inhaled air down from the larynx into bronchial pathways.' },
      { id: 'left_lung', label: 'Left Lung & Bronchi', x: 0.68, y: 0.55, radius: 0.09, description: 'Left Lung: Two-lobed organ housing bronchial branching and alveoli micro-sacs.' },
      { id: 'right_lung', label: 'Right Lung & Alveoli', x: 0.32, y: 0.55, radius: 0.09, description: 'Right Lung: Three-lobed organ facilitating rapid diffusion of oxygen into the capillary bloodstream.' },
      { id: 'diaphragm', label: 'Diaphragm Muscle', x: 0.50, y: 0.85, radius: 0.07, description: 'Diaphragm: Primary dome-shaped respiratory muscle contracting downwards during inhalation.' }
    ]
  },
  digestive: {
    id: 'digestive',
    label: 'Human Digestive System',
    triggerKeywords: ['digestive', 'stomach', 'intestine', 'digestion', 'liver', 'esophagus', 'enzyme', 'food', 'nutrition'],
    description: 'Gastrointestinal tract displaying esophagus transport, stomach acid breakdown, and small intestine nutrient absorption.',
    paths: [
      { id: 'dig-esophagus', name: 'Esophagus Passage', type: 'boundary', d: 'M 385,90 L 385,220 M 415,90 L 415,220', vibrationPattern: [40, 20] },
      { id: 'dig-stomach-sac', name: 'Stomach Gastric Chamber', type: 'boundary', d: 'M 415,220 C 540,220 540,360 460,380 C 380,380 340,320 385,220 Z', vibrationPattern: [50, 30] },
      { id: 'dig-intestine-coils', name: 'Small Intestine Villi Coils', type: 'inner-wall', d: 'M 460,380 C 500,420 320,440 480,470 C 320,490 480,510 400,530', vibrationPattern: [35, 20] },
      { id: 'dig-large-colon', name: 'Large Colon Perimeter', type: 'boundary', d: 'M 280,550 L 280,380 L 520,380 L 520,550', vibrationPattern: [45, 25] }
    ],
    regions: [
      { id: 'esophagus', label: 'Esophagus Passage', x: 0.50, y: 0.24, radius: 0.06, description: 'Esophagus: Muscular tube pushing chewed food to the stomach via rhythmic peristalsis.' },
      { id: 'stomach', label: 'Stomach Acid Chamber', x: 0.55, y: 0.45, radius: 0.08, description: 'Stomach: Muscular sac churning food with hydrochloric acid and pepsin enzymes.' },
      { id: 'small_intestine', label: 'Small Intestine (Villi)', x: 0.50, y: 0.65, radius: 0.09, description: 'Small Intestine: Primary site where millions of microscopic villi absorb nutrients directly into the blood.' },
      { id: 'large_intestine', label: 'Large Intestine & Colon', x: 0.50, y: 0.80, radius: 0.08, description: 'Large Intestine: Reabsorbs water and electrolytes, consolidating digestive residues.' }
    ]
  },
  water_cycle: {
    id: 'water_cycle',
    label: 'Atmospheric Water Cycle',
    triggerKeywords: ['water cycle', 'evaporation', 'condensation', 'precipitation', 'clouds', 'rain', 'hydrological', 'transpiration'],
    description: 'Cyclic movement of Earth water through solar evaporation, cloud condensation, rain precipitation, and river collection.',
    paths: [
      { id: 'water-ocean-line', name: 'Ocean Surface Baseline', type: 'boundary', d: 'M 80,480 L 720,480', vibrationPattern: [50, 30] },
      { id: 'water-evaporation', name: 'Solar Evaporation Vector', type: 'inner-wall', d: 'M 200,460 L 200,280 M 180,300 L 200,280 L 220,300', vibrationPattern: [35, 20] },
      { id: 'water-cloud-contour', name: 'Atmospheric Cloud Formation', type: 'boundary', d: 'M 300,200 C 320,140 480,140 500,200 C 540,200 560,250 500,270 L 300,270 C 260,250 280,200 300,200 Z', vibrationPattern: [45, 25] },
      { id: 'water-precipitation', name: 'Rainfall Precipitation Streams', type: 'inner-wall', d: 'M 520,290 L 500,380 M 560,290 L 540,380 M 600,290 L 580,380', vibrationPattern: [35, 20] },
      { id: 'water-runoff', name: 'Mountain Runoff Incline', type: 'boundary', d: 'M 720,260 L 520,480', vibrationPattern: [45, 25] }
    ],
    regions: [
      { id: 'ocean_evap', label: 'Stage 1: Ocean Evaporation', x: 0.25, y: 0.75, radius: 0.08, description: 'Evaporation: Solar thermal energy heats liquid ocean water, converting it into rising water vapor.' },
      { id: 'cloud_cond', label: 'Stage 2: Cloud Condensation', x: 0.38, y: 0.30, radius: 0.08, description: 'Condensation: Rising water vapor cools in the upper atmosphere, clustering into dense cloud droplets.' },
      { id: 'rain_precip', label: 'Stage 3: Rainfall Precipitation', x: 0.70, y: 0.40, radius: 0.08, description: 'Precipitation: Condensed droplets become too heavy and fall to Earth as rainfall or snowfall.' },
      { id: 'river_runoff', label: 'Stage 4: Collection & River Flow', x: 0.75, y: 0.75, radius: 0.08, description: 'Collection: Precipitated water collects in rivers and groundwater aquifers, returning to oceans.' }
    ]
  },
  electric_circuit: {
    id: 'electric_circuit',
    label: 'Electric Circuit & Power Flow',
    triggerKeywords: ['circuit', 'voltage', 'current', 'resistor', 'battery', 'electricity', 'switch', 'ampere', 'ohm'],
    description: 'Closed electrical circuit diagram showing battery potential, current flow through conducting wires, switch, and load resistor.',
    paths: [
      { id: 'circuit-wire-loop', name: 'Conducting Wire Closed Loop', type: 'boundary', d: 'M 160,160 L 640,160 L 640,440 L 160,440 Z', vibrationPattern: [50, 30] },
      { id: 'circuit-battery-cell', name: 'DC Battery Potential Plates', type: 'inner-wall', d: 'M 130,280 L 190,280 M 145,300 L 175,300 M 130,320 L 190,320 M 145,340 L 175,340', vibrationPattern: [40, 20] },
      { id: 'circuit-switch-gate', name: 'Control Switch Gate', type: 'inner-wall', d: 'M 360,160 L 420,130 M 440,160 L 480,160', vibrationPattern: [35, 20] },
      { id: 'circuit-resistor-load', name: 'Resistor / Load Element', type: 'inner-wall', d: 'M 640,260 L 610,275 L 670,295 L 610,315 L 670,335 L 640,350', vibrationPattern: [40, 20] }
    ],
    regions: [
      { id: 'battery', label: 'DC Battery Voltage Source', x: 0.20, y: 0.50, radius: 0.08, description: 'Battery Source: Chemical cells generating electromotive force and driving electrical charges.' },
      { id: 'switch', label: 'Circuit Control Switch', x: 0.50, y: 0.25, radius: 0.07, description: 'Switch: Mechanical contact making or breaking the continuous conductive pathway.' },
      { id: 'resistor_bulb', label: 'Load / Resistor Element', x: 0.80, y: 0.50, radius: 0.08, description: 'Load Resistor: Dissipates electrical energy into light, heat, or mechanical motion.' },
      { id: 'conductors', label: 'Ground & Wire Loop', x: 0.50, y: 0.75, radius: 0.07, description: 'Conducting Wire: Copper lines with low electrical resistance completing the closed circuit.' }
    ]
  }
};

/**
 * Automatically generates a tactile flowchart process diagram when no specific anatomical diagram is present in the PPT/PDF.
 */
export function generateFlowchartDiagram(textBlocks = [], concepts = [], title = "Curriculum Process Flow") {
  const steps = [];

  if (concepts && concepts.length >= 3) {
    concepts.slice(0, 4).forEach((c, idx) => {
      const word = c.word || (typeof c === 'string' ? c : `Stage ${idx + 1}`);
      const desc = c.description || (c.definitionKeywords ? `Related to ${c.definitionKeywords.join(', ')}.` : `Core concept in ${title}.`);
      steps.push({
        title: `Step ${idx + 1}: ${word}`,
        description: `Stage ${idx + 1} of 4: ${word}. ${desc}`,
        concept: word
      });
    });
  } else if (textBlocks && textBlocks.length >= 3) {
    textBlocks.slice(0, 4).forEach((block, idx) => {
      const firstSentence = block.split('.')[0] || `Process Step ${idx + 1}`;
      steps.push({
        title: `Step ${idx + 1}: ${firstSentence.slice(0, 32)}`,
        description: `Stage ${idx + 1} of 4: ${block.slice(0, 160)}`,
        concept: `Stage ${idx + 1}`
      });
    });
  } else {
    steps.push(
      { title: 'Step 1: Input & Absorption', description: 'Step 1 of 4: Ingestion of initial substances, energy sources, or baseline principles.', concept: 'Input' },
      { title: 'Step 2: Core Reaction & Processing', description: 'Step 2 of 4: Primary interaction, catalytic conversion, or functional processing.', concept: 'Mechanism' },
      { title: 'Step 3: Pathway & Transformation', description: 'Step 3 of 4: Progression of intermediate states and internal transport pathways.', concept: 'Pathway' },
      { title: 'Step 4: Output & Result State', description: 'Step 4 of 4: Final synthesized products, balanced equilibrium, or system outputs.', concept: 'Output' }
    );
  }

  const boxPositions = [
    { x: 80, y: 110, w: 250, h: 130, centerX: 205, centerY: 175 },
    { x: 470, y: 110, w: 250, h: 130, centerX: 595, centerY: 175 },
    { x: 470, y: 360, w: 250, h: 130, centerX: 595, centerY: 425 },
    { x: 80, y: 360, w: 250, h: 130, centerX: 205, centerY: 425 }
  ];

  const paths = [
    { id: 'box-1', name: steps[0]?.title || 'Stage 1', type: 'boundary', d: 'M 80,110 L 330,110 L 330,240 L 80,240 Z', vibrationPattern: [50, 30] },
    { id: 'box-2', name: steps[1]?.title || 'Stage 2', type: 'boundary', d: 'M 470,110 L 720,110 L 720,240 L 470,240 Z', vibrationPattern: [50, 30] },
    { id: 'box-3', name: steps[2]?.title || 'Stage 3', type: 'boundary', d: 'M 470,360 L 720,360 L 720,490 L 470,490 Z', vibrationPattern: [50, 30] },
    { id: 'box-4', name: steps[3]?.title || 'Stage 4', type: 'boundary', d: 'M 80,360 L 330,360 L 330,490 L 80,490 Z', vibrationPattern: [50, 30] },
    { id: 'arrow-1-2', name: 'Flow: Stage 1 to 2', type: 'inner-wall', d: 'M 330,175 L 470,175 M 450,163 L 470,175 L 450,187', vibrationPattern: [35, 20] },
    { id: 'arrow-2-3', name: 'Flow: Stage 2 to 3', type: 'inner-wall', d: 'M 595,240 L 595,360 M 583,340 L 595,360 L 607,340', vibrationPattern: [35, 20] },
    { id: 'arrow-3-4', name: 'Flow: Stage 3 to 4', type: 'inner-wall', d: 'M 470,425 L 330,425 M 350,413 L 330,425 L 350,437', vibrationPattern: [35, 20] }
  ];

  const landmarks = steps.map((s, idx) => {
    const pos = boxPositions[idx] || boxPositions[0];
    return {
      id: `flow-step-${idx + 1}`,
      name: s.title,
      x: pos.centerX,
      y: pos.centerY,
      radius: 52,
      audioDescription: `${s.description} Slide your finger along the connector arrow to explore the next stage.`,
      hapticTone: [85, 45, 85],
      isFlowchartStep: true,
      stepNumber: idx + 1
    };
  });

  return {
    id: `flowchart-${Date.now()}`,
    label: `Process Flowchart: ${title}`,
    title: `Tactile Flowchart: ${title}`,
    aspectRatio: '4:3',
    viewBox: { width: 800, height: 600 },
    isFlowchart: true,
    paths,
    landmarks,
    description: `Tactile Flowchart generated from ${title}. Trace the rectangular step boxes and connecting arrow paths across 4 sequential stages.`
  };
}
