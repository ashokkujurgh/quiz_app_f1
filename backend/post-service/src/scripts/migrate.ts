// Idempotent: builds indexes for the premium-post collections and the new Post index.
// Existing posts are not modified (isPremium is absent = ordinary post). Safe to run repeatedly.
//   npm run migrate        (uses DB_URL from .env)
import 'dotenv/config';
import mongoose from 'mongoose';
import Post from '../models/Post';
import PremiumPost from '../models/PremiumPost';
import PremiumPostRevision from '../models/PremiumPostRevision';
import UploadedAsset from '../models/UploadedAsset';
import { AiImageCandidate, AiImageUsage } from '../models/AiImage';
import ValidationResult from '../models/ValidationResult';
import ReviewAction from '../models/ReviewAction';
import EmailOutbox from '../models/EmailOutbox';
import PendingView from '../models/PendingView';
import AnonLink from '../models/AnonLink';
import { Violation, CreatorRestriction, CreatorStanding } from '../models/Violation';

(async () => {
  await mongoose.connect(process.env.DB_URL!);
  // createIndexes (not syncIndexes) on posts: never drops an index someone added by hand
  await Post.createIndexes();
  console.log('indexes ok: posts');
  for (const m of [PremiumPost, PremiumPostRevision, UploadedAsset, AiImageCandidate, AiImageUsage, ValidationResult, ReviewAction, EmailOutbox, Violation, CreatorRestriction, CreatorStanding, PendingView, AnonLink]) {
    await m.syncIndexes();
    console.log(`indexes ok: ${m.collection.collectionName}`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
