// Verification script for the 8 P1 fixes & MediaPipe Gesture Recognition
async function runVerification() {
  console.log("================ RUNNING P1 & MEDIAPIPE VERIFICATION ================");

  // 1. Test Voice Quiz with Nonsense (Fix 1)
  try {
    const res1 = await fetch('http://localhost:5000/api/blind/quiz/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonId: 'lesson-heart-anatomy',
        questionId: 'vq-1',
        spokenAnswer: 'I do not know anything about this topic at all'
      })
    });
    const data1 = await res1.json();
    console.log("1. Voice Quiz (Nonsense input):", data1.score === 0 ? "PASSED (Score 0/10)" : "FAILED", data1);
  } catch (e) {
    console.error("1. Voice Quiz Failed:", e.message);
  }

  // 2. Test Voice Quiz with Keywords (Fix 1)
  try {
    const res2 = await fetch('http://localhost:5000/api/blind/quiz/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonId: 'lesson-heart-anatomy',
        questionId: 'vq-1',
        spokenAnswer: 'The left ventricle pumps oxygenated blood through the aorta to the body'
      })
    });
    const data2 = await res2.json();
    console.log("2. Voice Quiz (Keywords input):", data2.score === 10 ? "PASSED (Score 10/10)" : "FAILED", data2);
  } catch (e) {
    console.error("2. Voice Quiz Failed:", e.message);
  }

  // 3. Test Unknown Question (Fix 4: 404)
  try {
    const res3 = await fetch('http://localhost:5000/api/blind/quiz/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonId: 'lesson-heart-anatomy',
        questionId: 'unknown-question-999',
        spokenAnswer: 'Some answer'
      })
    });
    console.log("3. Unknown Question 404 Check:", res3.status === 404 ? "PASSED (HTTP 404)" : "FAILED (Status " + res3.status + ")");
  } catch (e) {
    console.error("3. Unknown Question Failed:", e.message);
  }

  // 4. Test Gesture Evaluation with Empty Landmark (Fix 2)
  try {
    const res4 = await fetch('http://localhost:5000/api/deaf/practice/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'student-rohan',
        signWord: 'Heart',
        landmarkSequence: []
      })
    });
    const data4 = await res4.json();
    console.log("4. Gesture Evaluation (No landmark data):", data4.accuracy === 0 ? "PASSED (Accuracy 0%)" : "FAILED", data4);
  } catch (e) {
    console.error("4. Gesture Evaluation Failed:", e.message);
  }

  // 5. Test Real 21-Landmark Vector Sequence (MediaPipe + Cosine Similarity)
  try {
    // Generate a 21-point hand coordinate frame
    const sampleFrame = Array.from({ length: 21 }, (_, i) => ({
      x: 0.5 + Math.sin(i) * 0.05,
      y: 0.5 + Math.cos(i) * 0.05,
      z: 0.01 * i
    }));

    const res5 = await fetch('http://localhost:5000/api/deaf/practice/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'student-rohan',
        signWord: 'Heart',
        landmarkSequence: [sampleFrame, sampleFrame]
      })
    });
    const data5 = await res5.json();
    console.log("5. Gesture Evaluation (Real 21-Landmark Cosine Similarity):", data5.accuracy >= 70 ? "PASSED (Accuracy " + data5.accuracy + "%)" : "FAILED", data5);
  } catch (e) {
    console.error("5. Real Landmark Evaluation Failed:", e.message);
  }

  console.log("=====================================================================");
}

runVerification();
