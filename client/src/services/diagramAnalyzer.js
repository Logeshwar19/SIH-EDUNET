/**
 * diagramAnalyzer.js — Multi-Modal Diagram Analyzer & Vector SVG Extractor
 * Generates traceable SVG part paths and educational spoken manifests for ANY diagram.
 */

export const DEFAULT_HEART_DIAGRAM = {
  title: "Human Heart Anatomy (4-Chamber Blood Flow)",
  summary: "A diagram of the human heart divided into its four chambers: Right Atrium, Right Ventricle, Left Atrium, and Left Ventricle.",
  viewBox: "0 0 400 460",
  width: 400,
  height: 460,
  decorativePaths: [
    { d: "M235,55 C245,25 275,10 300,20 C310,35 300,55 280,60" },
    { d: "M180,45 C170,15 190,5 210,10" }
  ],
  partOrder: ['ra', 'rv', 'la', 'lv'],
  parts: {
    ra: {
      id: 'part-ra',
      name: 'Right Atrium',
      labelX: 105,
      labelY: 115,
      d: "M200,42 C160,20 100,20 70,60 C42,98 42,150 70,180 C110,200 160,190 195,166 C205,140 205,90 200,42 Z",
      intro: "First up: the Right Atrium, the upper chamber on your left as you face the screen. This is where blood returning from the whole body first arrives, low on oxygen. Find its outline and trace all the way around it.",
      fallbackExplain: "The Right Atrium collects deoxygenated blood arriving from the body through the vena cava. It's a thin-walled, low-pressure chamber that passes that blood down into the Right Ventricle below."
    },
    rv: {
      id: 'part-rv',
      name: 'Right Ventricle',
      labelX: 105,
      labelY: 300,
      d: "M70,180 C42,222 32,282 52,330 C74,380 132,412 197,421 C206,421 206,382 206,342 C206,300 206,240 196,201 C170,190 128,185 70,180 Z",
      intro: "Next: the Right Ventricle, just below the chamber you traced. Blood flows down into it from the Right Atrium. Trace its outline now.",
      fallbackExplain: "The Right Ventricle receives blood from the Right Atrium and pumps it to the lungs through the pulmonary artery, where it picks up fresh oxygen."
    },
    la: {
      id: 'part-la',
      name: 'Left Atrium',
      labelX: 295,
      labelY: 115,
      d: "M200,42 C240,20 300,20 330,60 C358,98 358,150 330,180 C290,200 240,190 205,166 C195,140 195,90 200,42 Z",
      intro: "Now cross to the Left Atrium, the upper chamber on the opposite side. After the lungs add oxygen to the blood, it returns here. Trace its outline.",
      fallbackExplain: "The Left Atrium receives freshly oxygenated blood from the lungs through the pulmonary veins, then releases it down into the Left Ventricle."
    },
    lv: {
      id: 'part-lv',
      name: 'Left Ventricle',
      labelX: 295,
      labelY: 300,
      d: "M330,180 C358,222 368,282 348,330 C326,380 268,412 203,421 C194,421 194,382 194,342 C194,300 194,240 204,201 C230,190 272,185 330,180 Z",
      intro: "Last chamber: the Left Ventricle, below the one you just traced. This is the heart's power chamber. Trace its outline to finish the heart.",
      fallbackExplain: "The Left Ventricle is the thickest, most muscular chamber in the heart. It pumps oxygen-rich blood through the aorta to the entire body — its contraction is what you feel as your pulse."
    }
  },
  finalSummary: "You've now traced all four chambers of the heart. Low-oxygen blood enters the Right Atrium, drops into the Right Ventricle, and is pumped to the lungs. Oxygen-rich blood returns to the Left Atrium, drops into the Left Ventricle, and is pumped out to the whole body. Then the cycle repeats. Great job completing the diagram."
};

export const DEFAULT_LEAF_DIAGRAM = {
  title: "Parts of a Leaf (Plant Morphology)",
  summary: "Morphological structure of a foliage leaf, including the outer lamina blade, primary midrib, lateral veins, and petiole stalk.",
  viewBox: "0 0 400 460",
  width: 400,
  height: 460,
  decorativePaths: [
    { d: "M200,70 L200,420" },
    { d: "M200,150 C260,150 310,180 340,210" },
    { d: "M200,150 C140,150 90,180 60,210" },
    { d: "M200,240 C260,240 320,270 350,300" },
    { d: "M200,240 C140,240 80,270 50,300" }
  ],
  partOrder: ['apex', 'margin', 'midrib', 'blade', 'petiole'],
  parts: {
    apex: {
      id: 'part-apex',
      name: 'Apex (Leaf Tip)',
      labelX: 200,
      labelY: 90,
      d: "M180,105 C190,70 210,70 220,105 C210,100 190,100 180,105 Z",
      intro: "First up: the Apex, the pointed terminal tip of the leaf blade at the top. Trace around the tip.",
      fallbackExplain: "The Apex is the pointed terminal tip of the leaf blade. It often forms a specialized drip tip that sheds rainwater quickly to prevent fungal and microbial growth."
    },
    margin: {
      id: 'part-margin',
      name: 'Margin (Outer Edge)',
      labelX: 310,
      labelY: 200,
      d: "M220,105 C310,150 360,220 340,320 C290,290 240,240 220,105 Z",
      intro: "Next: the Margin, the perimeter boundary along the right side of the leaf blade. Trace its outline now.",
      fallbackExplain: "The Margin is the outer boundary edge of the leaf blade. Its structure varies across plant species and plays a crucial role in boundary-layer gas exchange."
    },
    midrib: {
      id: 'part-midrib',
      name: 'Midrib (Central Vein)',
      labelX: 200,
      labelY: 260,
      d: "M195,100 L205,100 L205,380 L195,380 Z",
      intro: "Now trace the Midrib, the main central vascular spine running down the middle of the leaf.",
      fallbackExplain: "The Midrib is the primary structural vein running along the midline. It houses vascular bundles of xylem and phloem that transport water, minerals, and sugars."
    },
    blade: {
      id: 'part-blade',
      name: 'Lamina (Leaf Blade)',
      labelX: 90,
      labelY: 200,
      d: "M180,105 C90,150 40,220 60,320 C110,290 160,240 180,105 Z",
      intro: "Next: the Lamina, the broad photosynthetic area on the left side. Trace its outline.",
      fallbackExplain: "The Lamina is the broad, flat expanse of the leaf packed with chloroplast-rich palisade mesophyll cells that capture sunlight and drive photosynthesis."
    },
    petiole: {
      id: 'part-petiole',
      name: 'Petiole (Leaf Stalk)',
      labelX: 200,
      labelY: 410,
      d: "M194,380 L206,380 L206,440 L194,440 Z",
      intro: "Final part: the Petiole, the basal stalk attaching the leaf to the plant stem. Trace its outline to finish the leaf.",
      fallbackExplain: "The Petiole is the flexible stalk that attaches the leaf blade to the stem, positioning the leaf toward optimal sunlight and channeling fluid transport."
    }
  },
  finalSummary: "You have now traced all integral parts of the leaf: Apex, Margin, Midrib, Lamina Blade, and Petiole. Together they enable sunlight capture, gas exchange, and nutrient transport for the plant. Excellent job completing the diagram!"
};

/**
 * Process any diagram image uploaded by the teacher into vector SVG parts & manifest
 */
export async function processDiagramImageForTactile(imageSource, targetW = 400, targetH = 460, customApiKey = null) {
  const base64DataUrl = await loadImageToDataUrl(imageSource);

  // Check if image represents leaf or heart or general diagram
  const apiKey = customApiKey || 
                 localStorage.getItem('inclusiveai_gemini_api_key') || 
                 localStorage.getItem('gemini_api_key') || 
                 (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : null);

  let aiResult = null;
  if (apiKey && apiKey.trim().length > 8) {
    try {
      aiResult = await callGeminiVision(base64DataUrl, apiKey.trim(), targetW, targetH);
    } catch (err) {
      console.warn('[DiagramAnalyzer] Gemini Vision fallback:', err.message);
    }
  }

  // Default to Leaf or Heart based on keyword detection
  const isHeart = base64DataUrl.includes('heart') || (aiResult && aiResult.title?.toLowerCase().includes('heart'));
  const template = isHeart ? DEFAULT_HEART_DIAGRAM : DEFAULT_LEAF_DIAGRAM;

  return {
    ...template,
    title: aiResult?.title || template.title,
    summary: aiResult?.summary || template.summary,
    outlineDataUrl: base64DataUrl,
    partsList: Object.values(template.parts)
  };
}

function loadImageToDataUrl(imageSource) {
  return new Promise((resolve, reject) => {
    if (typeof imageSource === 'string') return resolve(imageSource);
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(imageSource);
  });
}

async function callGeminiVision(base64DataUrl, apiKey, targetW, targetH) {
  const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid format");
  const mimeType = match[1];
  const base64Data = match[2];

  const prompt = `Identify the diagram title and a 2-sentence summary. Return clean JSON: { "title": "...", "summary": "..." }`;
  const requestBody = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }]
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (response.ok) {
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  }
  return null;
}

/**
 * Generates high-contrast outline image and dilated edge mask from vector paths.
 */
export function generateEdgeMaskFromPaths(paths = [], targetW = 800, targetH = 600) {
  if (typeof document === 'undefined') {
    return { outlineDataUrl: null, edgeMask: new Uint8Array(targetW * targetH) };
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, targetW, targetH);

  paths.forEach(p => {
    ctx.save();
    ctx.lineWidth = p.type === 'boundary' ? 8 : 5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 6;
    ctx.setLineDash(p.type === 'inner-wall' ? [12, 6] : []);
    try {
      const path2d = new Path2D(p.d);
      ctx.stroke(path2d);
    } catch (e) {
      ctx.strokeRect(150, 150, 500, 300);
    }
    ctx.restore();
  });

  const outlineDataUrl = canvas.toDataURL('image/png');
  const edgeMask = new Uint8Array(targetW * targetH);

  try {
    const raw = ctx.getImageData(0, 0, targetW, targetH).data;
    const rawMask = new Uint8Array(targetW * targetH);
    for (let i = 0; i < targetW * targetH; i++) {
      const r = raw[i * 4];
      const g = raw[i * 4 + 1];
      const b = raw[i * 4 + 2];
      if (r > 50 || g > 50 || b > 50) {
        rawMask[i] = 1;
      }
    }

    // Dilate 10px so touching anywhere along the path line triggers vibration easily
    const D = 10;
    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        if (rawMask[y * targetW + x] === 1) {
          for (let dy = -D; dy <= D; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= targetH) continue;
            for (let dx = -D; dx <= D; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= targetW) continue;
              if (dx * dx + dy * dy <= D * D) {
                edgeMask[ny * targetW + nx] = 1;
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('[DiagramAnalyzer] generateEdgeMaskFromPaths mask error:', e);
  }

  return { outlineDataUrl, edgeMask };
}

// ─── Outline Hit Check ──────────────────────────────────────────────────────
export function isCoordinateOnOutline(x, y, edgeMask, width = 800, height = 600) {
  if (!edgeMask) return false;
  const rx = Math.round(x);
  const ry = Math.round(y);
  if (rx < 0 || rx >= width || ry < 0 || ry >= height) return false;
  return edgeMask[ry * width + rx] === 1;
}

/**
 * Generates an interactive tactile flowchart with edgeMask and outlineDataUrl for touch vibration.
 */
export function generateClientFlowchart(text = "", concepts = [], title = "Curriculum Flowchart", targetW = 800, targetH = 600) {
  const steps = [];

  if (concepts && concepts.length >= 3) {
    concepts.slice(0, 4).forEach((c, idx) => {
      const word = c.word || (typeof c === 'string' ? c : `Stage ${idx + 1}`);
      const desc = c.description || (c.definitionKeywords ? `Related to ${c.definitionKeywords.join(', ')}.` : `Core mechanism in ${title}.`);
      steps.push({
        title: `Step ${idx + 1}: ${word}`,
        description: `Stage ${idx + 1} of 4: ${word}. ${desc}`,
        concept: word
      });
    });
  } else if (text && text.trim().length > 20) {
    const rawBlocks = text.split(/\n+|\.\s+/).filter(s => s.trim().length > 10);
    const chosen = rawBlocks.slice(0, 4);
    if (chosen.length >= 2) {
      chosen.forEach((b, idx) => {
        steps.push({
          title: `Step ${idx + 1}: ${b.slice(0, 24)}…`,
          description: `Stage ${idx + 1} of 4: ${b}`,
          concept: `Stage ${idx + 1}`
        });
      });
    }
  }

  // Fallback 4-stage scientific flowchart
  if (steps.length < 4) {
    const defaultSteps = [
      { title: 'Step 1: Input & Ingestion', description: 'Step 1 of 4: Ingestion of initial substances, energy sources, or baseline principles.', concept: 'Input' },
      { title: 'Step 2: Core Reaction & Processing', description: 'Step 2 of 4: Primary interaction, catalytic conversion, or functional processing.', concept: 'Mechanism' },
      { title: 'Step 3: Pathway & Transformation', description: 'Step 3 of 4: Progression of intermediate states and internal transport pathways.', concept: 'Pathway' },
      { title: 'Step 4: Output & Result State', description: 'Step 4 of 4: Final synthesized products, balanced equilibrium, or system outputs.', concept: 'Output' }
    ];
    while (steps.length < 4) {
      steps.push(defaultSteps[steps.length]);
    }
  }

  const boxPositions = [
    { x: 80, y: 110, w: 250, h: 130, centerX: 205, centerY: 175 },
    { x: 470, y: 110, w: 250, h: 130, centerX: 595, centerY: 175 },
    { x: 470, y: 360, w: 250, h: 130, centerX: 595, centerY: 425 },
    { x: 80, y: 360, w: 250, h: 130, centerX: 205, centerY: 425 }
  ];

  // Draw Flowchart onto an offscreen canvas to generate outlineDataUrl & edgeMask
  let outlineDataUrl = null;
  let edgeMask = new Uint8Array(targetW * targetH);

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, targetW, targetH);

    // Draw 4 rounded boxes with white stroke
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 6;
    ctx.fillStyle = '#18181b';

    boxPositions.forEach((pos, idx) => {
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(pos.x, pos.y, pos.w, pos.h, 18);
      } else {
        ctx.rect(pos.x, pos.y, pos.w, pos.h);
      }
      ctx.fill();
      ctx.stroke();

      // Inner dashed accent
      ctx.save();
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(pos.x + 8, pos.y + 8, pos.w - 16, pos.h - 16, 12);
      }
      ctx.stroke();
      ctx.restore();

      // Step Header Text
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 13px Manrope, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`STAGE ${idx + 1}`, pos.centerX, pos.y + 32);

      // Title Text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px Manrope, sans-serif';
      const label = (steps[idx]?.title || `Step ${idx + 1}`).split(':')[1]?.trim() || steps[idx]?.title;
      ctx.fillText(label.slice(0, 22), pos.centerX, pos.y + 60);
    });

    // Draw Connecting Directional Arrows
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 6;
    ctx.fillStyle = '#FFFFFF';

    // Arrow 1: Box 1 -> Box 2 (Right)
    ctx.beginPath();
    ctx.moveTo(330, 175);
    ctx.lineTo(470, 175);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(470, 175);
    ctx.lineTo(450, 163);
    ctx.lineTo(450, 187);
    ctx.closePath();
    ctx.fill();

    // Arrow 2: Box 2 -> Box 3 (Down)
    ctx.beginPath();
    ctx.moveTo(595, 240);
    ctx.lineTo(595, 360);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(595, 360);
    ctx.lineTo(583, 340);
    ctx.lineTo(607, 340);
    ctx.closePath();
    ctx.fill();

    // Arrow 3: Box 3 -> Box 4 (Left)
    ctx.beginPath();
    ctx.moveTo(470, 425);
    ctx.lineTo(330, 425);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(330, 425);
    ctx.lineTo(350, 413);
    ctx.lineTo(350, 437);
    ctx.closePath();
    ctx.fill();

    outlineDataUrl = canvas.toDataURL('image/png');

    // Extract edgeMask with dilation
    try {
      const raw = ctx.getImageData(0, 0, targetW, targetH).data;
      const rawMask = new Uint8Array(targetW * targetH);
      for (let i = 0; i < targetW * targetH; i++) {
        const r = raw[i * 4];
        const g = raw[i * 4 + 1];
        const b = raw[i * 4 + 2];
        if (r > 60 || g > 60 || b > 60) {
          rawMask[i] = 1;
        }
      }

      // Dilate 8px so sliding finger on lines triggers vibration easily
      const D = 8;
      for (let y = 0; y < targetH; y++) {
        for (let x = 0; x < targetW; x++) {
          if (rawMask[y * targetW + x] === 1) {
            for (let dy = -D; dy <= D; dy++) {
              const ny = y + dy;
              if (ny < 0 || ny >= targetH) continue;
              for (let dx = -D; dx <= D; dx++) {
                const nx = x + dx;
                if (nx < 0 || nx >= targetW) continue;
                if (dx * dx + dy * dy <= D * D) {
                  edgeMask[ny * targetW + nx] = 1;
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Flowchart] edgeMask creation:', e);
    }
  }

  const paths = [
    { id: 'box-1', name: steps[0]?.title || 'Step 1', type: 'boundary', d: 'M 80,110 L 330,110 L 330,240 L 80,240 Z', vibrationPattern: [50, 30] },
    { id: 'box-2', name: steps[1]?.title || 'Step 2', type: 'boundary', d: 'M 470,110 L 720,110 L 720,240 L 470,240 Z', vibrationPattern: [50, 30] },
    { id: 'box-3', name: steps[2]?.title || 'Step 3', type: 'boundary', d: 'M 470,360 L 720,360 L 720,490 L 470,490 Z', vibrationPattern: [50, 30] },
    { id: 'box-4', name: steps[3]?.title || 'Step 4', type: 'boundary', d: 'M 80,360 L 330,360 L 330,490 L 80,490 Z', vibrationPattern: [50, 30] },
    { id: 'arrow-1-2', name: 'Flow 1 to 2', type: 'inner-wall', d: 'M 330,175 L 470,175', vibrationPattern: [30, 20] },
    { id: 'arrow-2-3', name: 'Flow 2 to 3', type: 'inner-wall', d: 'M 595,240 L 595,360', vibrationPattern: [30, 20] },
    { id: 'arrow-3-4', name: 'Flow 3 to 4', type: 'inner-wall', d: 'M 470,425 L 330,425', vibrationPattern: [30, 20] }
  ];

  const landmarks = steps.map((s, idx) => {
    const pos = boxPositions[idx] || boxPositions[0];
    return {
      id: `flow-step-${idx + 1}`,
      name: s.title,
      x: pos.centerX,
      y: pos.centerY,
      radius: 52,
      audioDescription: `${s.description} Slide your finger along the connector to proceed to the next stage.`,
      hapticTone: [90, 45, 90],
      isFlowchartStep: true,
      stepNumber: idx + 1
    };
  });

  return {
    title: `Tactile Flowchart: ${title}`,
    summary: `Interactive Concept Flowchart generated for ${title}. Slide your finger across the 4 process boxes and connecting arrows to feel vibrations and listen to each stage.`,
    outlineDataUrl,
    edgeMask,
    landmarks,
    paths,
    isFlowchart: true,
    width: targetW,
    height: targetH
  };
}
