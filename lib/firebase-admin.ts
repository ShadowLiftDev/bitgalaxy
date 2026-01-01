import { getApps, getApp, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let firebaseAdminApp: App;

const hasBase64 = !!process.env.FIREBASE_ADMIN_CREDENTIALS_BASE64;

const hasLegacy =
  !!process.env.FIREBASE_PROJECT_ID &&
  !!process.env.FIREBASE_CLIENT_EMAIL &&
  !!process.env.FIREBASE_PRIVATE_KEY;

if (!hasBase64 && !hasLegacy) {
  throw new Error(
    "Missing Firebase Admin environment variables. " +
      "Set FIREBASE_ADMIN_CREDENTIALS_BASE64 OR " +
      "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
  );
}

if (!getApps().length) {
  let credentials: any;

  if (hasBase64) {
    // ✅ Preferred: service account JSON encoded as base64
    const encoded = process.env.FIREBASE_ADMIN_CREDENTIALS_BASE64!;
    const jsonStr = Buffer.from(encoded, "base64").toString("utf8");
    credentials = JSON.parse(jsonStr);
  } else {
    // ✅ Fallback: 3 separate env vars with PEM key
    credentials = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    };
  }

  firebaseAdminApp = initializeApp({
    credential: cert(credentials),
  });
} else {
  firebaseAdminApp = getApp();
}

export const adminDb = getFirestore(firebaseAdminApp);
export const adminAuth = getAuth(firebaseAdminApp);