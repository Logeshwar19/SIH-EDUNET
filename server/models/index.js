import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  customId: { type: String, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String },
  role: { type: String, enum: ['teacher', 'deaf_student', 'blind_student', 'deaf', 'blind'], required: true },
  avatar: { type: String, default: '👤' },
  createdAt: { type: Date, default: Date.now }
});

const ClassSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subject: { type: String },
  grade: { type: String },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  teacherCustomId: { type: String },
  roomCode: { type: String, unique: true, index: true },
  roomPass: { type: String },
  enrolledStudents: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    studentCustomId: { type: String },
    studentName: { type: String },
    role: { type: String },
    enrolledAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const LessonSchema = new mongoose.Schema({
  lessonId: { type: String, unique: true, index: true },
  title: { type: String, required: true },
  subject: { type: String },
  grade: { type: String },
  estimatedTime: { type: String },
  summary: { type: String },
  originalFileName: { type: String },
  teacherNotes: { type: String },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  islModule: { type: mongoose.Schema.Types.Mixed },
  bviModule: { type: mongoose.Schema.Types.Mixed },
  text_blocks: [String],
  concepts: [mongoose.Schema.Types.Mixed],
  quiz_items: [mongoose.Schema.Types.Mixed],
  createdAt: { type: Date, default: Date.now }
});

const ProgressSchema = new mongoose.Schema({
  studentCustomId: { type: String, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  studentName: { type: String },
  lessonCustomId: { type: String },
  activityType: { type: String },
  signWord: { type: String },
  accuracy: { type: Number },
  questionId: { type: String },
  score: { type: Number },
  isCorrect: { type: Boolean },
  feedback: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  messageId: { type: String, unique: true, index: true },
  studentCustomId: { type: String },
  studentName: { type: String },
  type: { type: String },
  message: { type: String },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const LiveSessionSchema = new mongoose.Schema({
  roomCode: { type: String, unique: true, index: true },
  teacherId: { type: String },
  teacherName: { type: String },
  subject: { type: String },
  isLive: { type: Boolean, default: false },
  startTime: { type: Date },
  endedAt: { type: Date }
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Class = mongoose.models.Class || mongoose.model('Class', ClassSchema);
export const Lesson = mongoose.models.Lesson || mongoose.model('Lesson', LessonSchema);
export const Progress = mongoose.models.Progress || mongoose.model('Progress', ProgressSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
export const LiveSession = mongoose.models.LiveSession || mongoose.model('LiveSession', LiveSessionSchema);

export default {
  User,
  Class,
  Lesson,
  Progress,
  Message,
  LiveSession
};
