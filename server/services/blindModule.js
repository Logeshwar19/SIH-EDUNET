export function getHapticDiagram(diagram) {
  return {
    id: diagram.id,
    label: diagram.label,
    description: diagram.description,
    outlinePath: diagram.outlinePath,
    regions: diagram.regions
  };
}

export function evaluateVoiceAnswer(question, spokenAnswer) {
  if (!question) return { correct: false, score: 0, feedback: 'Question not found.' };

  const answer = (spokenAnswer || '').toLowerCase();
  const keywords = question.acceptedAnswerKeywords || [];
  
  const matched = keywords.filter(k => answer.includes(k.toLowerCase()));
  const hit = matched.length > 0;

  return {
    correct: hit,
    score: hit ? 10 : 0,
    matchedKeywords: matched,
    feedback: hit 
      ? 'Correct! Accurate scientific mechanism explained clearly.'
      : `Not quite. Expected concepts: ${keywords.join(', ')}.`
  };
}
