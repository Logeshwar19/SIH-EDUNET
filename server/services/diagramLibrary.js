export const DIAGRAM_LIBRARY = {
  heart: {
    id: 'heart',
    label: 'Human Heart Cross-Section',
    triggerKeywords: ['heart', 'ventricle', 'atrium', 'cardiac', 'circulation', 'blood', 'aorta', 'valve'],
    description: 'A four-chambered muscular organ pumping oxygen-rich blood through the aorta and receiving deoxygenated blood via the vena cava.',
    outlinePath: [
      { x: 0.50, y: 0.15 }, { x: 0.65, y: 0.18 }, { x: 0.78, y: 0.32 },
      { x: 0.80, y: 0.50 }, { x: 0.70, y: 0.70 }, { x: 0.55, y: 0.88 },
      { x: 0.50, y: 0.95 }, { x: 0.45, y: 0.88 }, { x: 0.30, y: 0.70 },
      { x: 0.20, y: 0.50 }, { x: 0.22, y: 0.32 }, { x: 0.35, y: 0.18 },
      { x: 0.50, y: 0.15 }
    ],
    regions: [
      { 
        id: 'left_ventricle', 
        label: 'left ventricle', 
        x: 0.62, 
        y: 0.70, 
        radius: 0.08,
        description: 'Left Ventricle: Has the thickest muscular wall to pump oxygenated blood under high pressure through the aorta to the body.'
      },
      { 
        id: 'right_ventricle', 
        label: 'right ventricle', 
        x: 0.38, 
        y: 0.70, 
        radius: 0.08,
        description: 'Right Ventricle: Pumps deoxygenated blood to the lungs via the pulmonary artery.'
      },
      { 
        id: 'left_atrium', 
        label: 'left atrium', 
        x: 0.62, 
        y: 0.38, 
        radius: 0.07,
        description: 'Left Atrium: Receives freshly oxygenated blood from the pulmonary veins.'
      },
      { 
        id: 'right_atrium', 
        label: 'right atrium', 
        x: 0.38, 
        y: 0.38, 
        radius: 0.07,
        description: 'Right Atrium: Collects deoxygenated blood returning from bodily tissues.'
      },
      { 
        id: 'aorta', 
        label: 'aorta arch', 
        x: 0.54, 
        y: 0.15, 
        radius: 0.07,
        description: 'Aorta Arch: The largest artery in the human body distributing oxygen-rich blood.'
      }
    ]
  },
  plant_cell: {
    id: 'plant_cell',
    label: 'Plant Leaf & Cell Diagram',
    triggerKeywords: ['photosynthesis', 'cell', 'chloroplast', 'leaf', 'plant', 'stomata', 'guard cell'],
    description: 'Cross-section of plant tissue showing chloroplast-dense palisade cells and stomatal pores for gas exchange.',
    outlinePath: [
      { x: 0.15, y: 0.20 }, { x: 0.85, y: 0.20 }, { x: 0.85, y: 0.80 },
      { x: 0.15, y: 0.80 }, { x: 0.15, y: 0.20 }
    ],
    regions: [
      { 
        id: 'chloroplast', 
        label: 'chloroplast', 
        x: 0.35, 
        y: 0.38, 
        radius: 0.08,
        description: 'Chloroplast: Organelle containing chlorophyll where light energy is converted into glucose.'
      },
      { 
        id: 'stoma', 
        label: 'stoma & guard cells', 
        x: 0.50, 
        y: 0.80, 
        radius: 0.07,
        description: 'Stomatal Pore: Microscopic pore regulated by guard cells to let carbon dioxide enter and oxygen exit.'
      },
      { 
        id: 'vein_bundle', 
        label: 'vascular bundle', 
        x: 0.65, 
        y: 0.50, 
        radius: 0.08,
        description: 'Vascular Bundle: Xylem and phloem vessels transporting water and synthesized nutrients.'
      },
      { 
        id: 'cell_wall', 
        label: 'cell wall & cuticle', 
        x: 0.50, 
        y: 0.20, 
        radius: 0.06,
        description: 'Upper Cuticle: Protective waxy boundary reducing water loss.'
      }
    ]
  }
};
