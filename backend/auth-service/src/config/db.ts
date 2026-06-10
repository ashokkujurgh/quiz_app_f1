import mongoose from 'mongoose';

let isConnected = false;

const connectDB = async (): Promise<void> => {
  if (isConnected) return;

  const uri = process.env.DB_URL;
  if (!uri) throw new Error('DB_URL is not defined in environment variables.');

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', (error as Error).message);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('⚠️  MongoDB disconnected. Reconnecting...');
});

export default connectDB;
