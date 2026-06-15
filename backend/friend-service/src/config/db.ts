import mongoose from 'mongoose';

export default async function connectDB() {
  const uri = process.env.DB_URL;
  if (!uri) throw new Error('DB_URL not set');
  mongoose.connection.on('connected',    () => console.log(`✅ MongoDB connected: ${mongoose.connection.host}`));
  mongoose.connection.on('error',        (e) => console.error('❌ MongoDB connection error:', e));
  mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected. Reconnecting...'));
  await mongoose.connect(uri);
}
