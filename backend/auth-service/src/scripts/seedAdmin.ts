import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User';

const DEFAULT_ADMIN = {
  name:     'Super Admin',
  email:    'admin@quizhub.com',
  password: 'Admin@123',
  role:     'admin' as const,
  authProvider: 'email' as const,
  isEmailVerified: true,
};

(async () => {
  await mongoose.connect(process.env.DB_URL!);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ email: DEFAULT_ADMIN.email });
  if (existing) {
    console.log('Default admin already exists:', DEFAULT_ADMIN.email);
    await mongoose.disconnect();
    return;
  }

  await User.create(DEFAULT_ADMIN);
  console.log('✅ Default admin created');
  console.log('   Email   :', DEFAULT_ADMIN.email);
  console.log('   Password:', DEFAULT_ADMIN.password);

  await mongoose.disconnect();
})().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
