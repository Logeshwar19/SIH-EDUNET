import { connectDB } from './connection.js';
import { User, Class, Lesson, Progress, Message } from '../models/index.js';
import { sampleLessons, sampleStudents } from '../sampleData.js';
import mongoose from 'mongoose';

async function seed() {
  console.log('🌱 [Seed] Starting MongoDB database seeding...');
  const conn = await connectDB();
  if (!conn) {
    console.error('❌ [Seed] Failed to connect to MongoDB. Check MONGODB_URI.');
    process.exit(1);
  }

  try {
    // 1. Create Default Teacher
    const teacher = await User.findOneAndUpdate(
      { customId: 'teacher-main' },
      {
        customId: 'teacher-main',
        name: 'Dr. Priya Sharma',
        email: 'priya.sharma@inclusiveai.edu',
        role: 'teacher',
        avatar: '👩‍🏫'
      },
      { upsert: true, new: true }
    );
    console.log(`👤 Seeded Teacher: ${teacher.name} (${teacher._id})`);

    // 2. Create Sample Students
    const studentDocs = {};
    for (const s of sampleStudents) {
      const role = s.type === 'deaf' ? 'deaf_student' : 'blind_student';
      const student = await User.findOneAndUpdate(
        { customId: s.id },
        {
          customId: s.id,
          name: s.name,
          email: `${s.id}@inclusiveai.edu`,
          role: role,
          avatar: s.avatar
        },
        { upsert: true, new: true }
      );
      studentDocs[s.id] = student;
      console.log(`👤 Seeded Student: ${student.name} (${role})`);
    }

    // 3. Create Sample Class
    const classDoc = await Class.findOneAndUpdate(
      { roomCode: 'CLASS-101' },
      {
        name: 'Class 10 - Inclusive Science Hub',
        subject: 'Science & Biology',
        grade: 'Grade 10',
        teacherId: teacher._id,
        teacherCustomId: teacher.customId,
        roomCode: 'CLASS-101',
        roomPass: '123456',
        enrolledStudents: Object.values(studentDocs).map((st) => ({
          studentId: st._id,
          studentCustomId: st.customId,
          studentName: st.name,
          role: st.role,
          enrolledAt: new Date()
        }))
      },
      { upsert: true, new: true }
    );
    console.log(`🏫 Seeded Class: ${classDoc.name} [Room Code: ${classDoc.roomCode}]`);

    // 4. Create Lessons from sampleLessons
    for (const l of sampleLessons) {
      await Lesson.findOneAndUpdate(
        { lessonId: l.id },
        {
          lessonId: l.id,
          title: l.title,
          subject: l.subject,
          grade: l.grade || 'Grade 10',
          estimatedTime: l.estimatedTime || '15 mins',
          summary: l.summary,
          originalFileName: l.originalFileName,
          teacherNotes: l.teacherNotes || '',
          teacherId: teacher._id,
          classId: classDoc._id,
          islModule: l.islModule,
          bviModule: l.bviModule,
          text_blocks: l.bviModule?.audioSections?.map((s) => s.content) || [l.summary],
          concepts:
            l.islModule?.lessonGlosses?.map((g) => ({
              word: g.word,
              gloss: g.gloss,
              description: g.description,
              signAsset: `${g.word.toLowerCase()}.mp4`
            })) || [],
          quiz_items:
            l.bviModule?.voiceQuiz?.map((q) => ({
              id: q.id,
              prompt: q.spokenQuestion,
              spokenQuestion: q.spokenQuestion,
              acceptedAnswerKeywords: q.expectedKeywords,
              modelAnswer: q.modelAnswer
            })) || []
        },
        { upsert: true, new: true }
      );
      console.log(`📖 Seeded Lesson: ${l.title}`);
    }

    // 5. Create Initial Progress Records
    const rohan = studentDocs['student-rohan'];
    if (rohan) {
      await Progress.create([
        {
          studentCustomId: rohan.customId,
          studentId: rohan._id,
          studentName: rohan.name,
          lessonCustomId: 'lesson-heart-anatomy',
          activityType: 'sign_practice',
          signWord: 'Heart',
          accuracy: 96,
          feedback: 'Accurate hand positioning over chest area.'
        },
        {
          studentCustomId: rohan.customId,
          studentId: rohan._id,
          studentName: rohan.name,
          lessonCustomId: 'lesson-heart-anatomy',
          activityType: 'sign_practice',
          signWord: 'Pump',
          accuracy: 91,
          feedback: 'Strong dual fist pulse rhythm.'
        }
      ]);
    }

    const ananya = studentDocs['student-ananya'];
    if (ananya) {
      await Progress.create([
        {
          studentCustomId: ananya.customId,
          studentId: ananya._id,
          studentName: ananya.name,
          lessonCustomId: 'lesson-heart-anatomy',
          activityType: 'voice_quiz',
          questionId: 'vq-1',
          score: 10,
          isCorrect: true,
          feedback: 'Clear explanation of Left Ventricle function.'
        },
        {
          studentCustomId: ananya.customId,
          studentId: ananya._id,
          studentName: ananya.name,
          lessonCustomId: 'lesson-heart-anatomy',
          activityType: 'voice_quiz',
          questionId: 'vq-2',
          score: 10,
          isCorrect: true,
          feedback: 'Accurate description of heart valves preventing backflow.'
        }
      ]);
    }

    // 6. Create Initial Teacher Inbox Messages
    await Message.create([
      {
        messageId: 'inbox-1',
        studentCustomId: 'student-rohan',
        studentName: 'Rohan Patel (Deaf)',
        type: 'sign_to_text',
        message: 'Signed: Teacher, can we review how the Left Ventricle pumps blood?',
        isRead: false
      },
      {
        messageId: 'inbox-2',
        studentCustomId: 'student-ananya',
        studentName: 'Ananya Sharma (Blind)',
        type: 'voice_quiz_completed',
        message: "Completed Voice Quiz for 'The Human Heart & Circulatory System' with 100% score.",
        isRead: false
      }
    ]);

    console.log('✅ [Seed] Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ [Seed] Error seeding database:', err);
    process.exit(1);
  }
}

seed();
