import admin from 'firebase-admin';

let app: admin.app.App | undefined;

export const initFirebase = (): void => {
  if (app) return;
  const projectId   = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const privateKey  = (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');
  app = admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) }, 'post-service');
  console.log('✅ Firebase Admin initialized (post-service)');
};

export const getMessaging = (): admin.messaging.Messaging => {
  if (!app) initFirebase();
  return admin.messaging(app);
};
