import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const firebaseClientApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const clientDb = getFirestore(firebaseClientApp);
export const clientAuth = getAuth(firebaseClientApp);

// ✅ Helper functions so the rest of the ecosystem can call these consistently
export function getClientDb() {
  return clientDb;
}

export function getClientAuth() {
  return clientAuth;
}

export default firebaseClientApp;