import admin, { type App, type auth } from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let firebaseApp: App | undefined;

export const initFirebase = (): App => {
  if (firebaseApp) return firebaseApp;

  try {
    const serviceAccountPath = path.resolve(
      __dirname,
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? '../../google-services.json'
    );

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`google-services.json not found at: ${serviceAccountPath}`);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });

    console.log('✅ Firebase Admin initialized');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Firebase init error:', (error as Error).message);
    throw error;
  }
};

export const getFirebaseAuth = (): auth.Auth => {
  if (!firebaseApp) initFirebase();
  return admin.auth();
};
