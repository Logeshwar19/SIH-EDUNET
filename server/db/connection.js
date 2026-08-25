import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inclusive_ai';

mongoose.set('bufferCommands', false);

let isConnected = false;

export async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 4000, // Fast timeout if IP not whitelisted or unreachable
      connectTimeoutMS: 4000
    });

    isConnected = true;
    console.log(`✅ [MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('❌ [MongoDB] Runtime Connection Error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ [MongoDB] Disconnected. Reconnecting...');
      isConnected = false;
    });

    return conn;
  } catch (error) {
    console.warn(`⚠️ [MongoDB] Could not connect to ${MONGODB_URI} (${error.message})`);
    console.warn(`👉 To run with MongoDB: ensure local MongoDB service is running OR update MONGODB_URI in server/.env with MongoDB Atlas URI.`);
    return null;
  }
}

export function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}
