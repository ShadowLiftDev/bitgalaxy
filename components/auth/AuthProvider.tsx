"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  signInWithCustomToken as firebaseSignInWithCustomToken,
  signOut as firebaseSignOut,
  type User,
  type UserCredential,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getClientAuth, getClientDb } from "@/lib/firebase-client";

type OrgRole = "owner" | "staff" | "client" | "guest" | null;

type AuthContextValue = {
  user: User | null;
  loading: boolean;

  // Auth actions
  signInWithEmailAndPassword: (
    email: string,
    password: string,
  ) => Promise<UserCredential | null>;
  signInWithCustomToken: (token: string) => Promise<UserCredential | null>;
  signOut: () => Promise<void>;

  // Role helpers
  getOrgRole: (orgId: string) => Promise<OrgRole>;
  isOwner: (orgId: string) => Promise<boolean>;
  isStaff: (orgId: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// simple in-memory cache: key = `${orgId}:${uid}`
const roleCache = new Map<string, OrgRole>();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Track auth state
  useEffect(() => {
    const auth = getClientAuth();
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? null);
      setLoading(false);

      if (!firebaseUser) {
        roleCache.clear();
      }
    });

    return () => unsub();
  }, []);

  // 🔹 Email/password sign-in
  async function signInEmail(email: string, password: string) {
    const auth = getClientAuth();
    try {
      const cred = await firebaseSignInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      setUser(cred.user);
      return cred;
    } catch (e) {
      console.error("[AuthProvider] signInWithEmailAndPassword failed:", e);
      throw e;
    }
  }

  // 🔹 Custom token sign-in (for server-issued tokens)
  async function signInToken(token: string) {
    const auth = getClientAuth();
    try {
      const cred = await firebaseSignInWithCustomToken(auth, token);
      setUser(cred.user);
      return cred;
    } catch (e) {
      console.error("[AuthProvider] signInWithCustomToken failed:", e);
      throw e;
    }
  }

  // 🔹 Sign out
  async function signOutUser() {
    const auth = getClientAuth();
    await firebaseSignOut(auth);
    roleCache.clear();
    setUser(null);
  }

  // 🔹 Load org-specific role from Firestore
  async function getOrgRole(orgId: string): Promise<OrgRole> {
    if (!user) return null;

    const cacheKey = `${orgId}:${user.uid}`;
    if (roleCache.has(cacheKey)) {
      return roleCache.get(cacheKey) ?? null;
    }

    const db = getClientDb();
    // 👉 Adjust this path/field if your schema differs
    const memberRef = doc(db, "orgs", orgId, "members", user.uid);
    const memberSnap = await getDoc(memberRef);

    let role: OrgRole = null;

    if (memberSnap.exists()) {
      const data = memberSnap.data() as any;
      role = (data.role as OrgRole) ?? null;
    }

    roleCache.set(cacheKey, role);
    return role;
  }

  async function isOwner(orgId: string): Promise<boolean> {
    const role = await getOrgRole(orgId);
    return role === "owner";
  }

  async function isStaff(orgId: string): Promise<boolean> {
    const role = await getOrgRole(orgId);
    // staff + owner both count as "staff" for access
    return role === "staff" || role === "owner";
  }

  const value: AuthContextValue = {
    user,
    loading,
    signInWithEmailAndPassword: signInEmail,
    signInWithCustomToken: signInToken,
    signOut: signOutUser,
    getOrgRole,
    isOwner,
    isStaff,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
