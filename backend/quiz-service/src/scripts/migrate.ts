// Idempotent: labels existing quizzes as 'daily' (made by an admin) or 'custom' (made by a user)
// and builds the new indexes. Changes nothing else. Safe to run repeatedly.
//   npm run migrate        (uses DB_URL from .env)
import 'dotenv/config';
import mongoose from 'mongoose';
import Quiz from '../models/Quiz';
import GameInvite from '../models/GameInvite';

(async () => {
  await mongoose.connect(process.env.DB_URL!);
  const users = mongoose.connection.db!.collection('users');
  const adminIds = (await users.find({ role: 'admin' }, { projection: { _id: 1 } }).toArray()).map((u) => u._id);

  const daily  = await Quiz.collection.updateMany({ kind: { $exists: false }, createdBy: { $in: adminIds } },  { $set: { kind: 'daily' } });
  const custom = await Quiz.collection.updateMany({ kind: { $exists: false }, createdBy: { $nin: adminIds } }, { $set: { kind: 'custom' } });
  console.log(`quizzes labelled: ${daily.modifiedCount} daily, ${custom.modifiedCount} custom`);

  await GameInvite.syncIndexes();
  console.log('indexes ok: gameinvites');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
