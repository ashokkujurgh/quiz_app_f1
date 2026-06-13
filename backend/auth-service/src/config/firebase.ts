import admin from 'firebase-admin';

let firebaseApp: admin.app.App | undefined;

export const initFirebase = (): admin.app.App => {
  if (firebaseApp) return firebaseApp;

  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'quzmyt';

  firebaseApp = admin.initializeApp({ projectId });
  console.log('✅ Firebase Admin initialized (project:', projectId, ')');
  return firebaseApp;
};

export const getFirebaseAuth = (): admin.auth.Auth => {
  if (!firebaseApp) initFirebase();
  return admin.auth();
};
