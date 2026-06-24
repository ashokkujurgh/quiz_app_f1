import admin from 'firebase-admin';

let firebaseApp: admin.app.App | undefined;

export const initFirebase = (): admin.app.App => {
  if (firebaseApp) return firebaseApp;

  const projectId   = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const privateKey  = (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  }, 'quiz-service');

  console.log('✅ Firebase Admin initialized (quiz-service)');
  return firebaseApp;
};

export const getMessaging = (): admin.messaging.Messaging => {
  if (!firebaseApp) initFirebase();
  return admin.messaging(firebaseApp);
};
