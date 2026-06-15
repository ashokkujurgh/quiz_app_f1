import admin from 'firebase-admin';

let firebaseApp: admin.app.App | undefined;

export const initFirebase = (): admin.app.App => {
  if (firebaseApp) return firebaseApp;

  const projectId   = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  // env stores \n as literal backslash-n — replace back to real newlines
  const privateKey  = (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  console.log('✅ Firebase Admin initialized (project:', projectId, ')');
  return firebaseApp;
};

export const getFirebaseAuth = (): admin.auth.Auth => {
  if (!firebaseApp) initFirebase();
  return admin.auth();
};
