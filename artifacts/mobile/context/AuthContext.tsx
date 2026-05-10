import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const OWNER_EMAIL = "barandamci@icloud.com";

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL: string | null;
  bio: string;
  isAdmin: boolean;
  isOwner: boolean;
  isBanned: boolean;
  banReason: string | null;
  isVerified: boolean;
  createdAt: unknown;
  lastSeen: unknown;
  blockedUsers: string[];
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
  checkEmailAvailable: (email: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string) => {
    const docRef = doc(db, "users", uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      setProfile(snap.data() as UserProfile);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid);
        await updateDoc(doc(db, "users", firebaseUser.uid), {
          lastSeen: serverTimestamp(),
        }).catch(() => {});
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });

    const isOwner = email.toLowerCase() === OWNER_EMAIL.toLowerCase();

    const userProfile: UserProfile = {
      uid: cred.user.uid,
      email,
      username: username.toLowerCase(),
      displayName,
      photoURL: null,
      bio: "",
      isAdmin: isOwner,
      isOwner,
      isBanned: false,
      banReason: null,
      isVerified: false,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      blockedUsers: [],
    };

    await setDoc(doc(db, "users", cred.user.uid), userProfile);
    await sendEmailVerification(cred.user).catch(() => {});
  };

  const signInWithGoogle = async () => {
    const { GoogleSignin } = await import(
      "@react-native-google-signin/google-signin"
    );
    GoogleSignin.configure({
      webClientId:
        "531426380270-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
    });
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const { idToken } = userInfo.data ?? userInfo as { idToken: string };
    const credential = GoogleAuthProvider.credential(idToken as string);
    const cred = await signInWithCredential(auth, credential);

    const userRef = doc(db, "users", cred.user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const isOwner =
        cred.user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
      await setDoc(userRef, {
        uid: cred.user.uid,
        email: cred.user.email,
        username: (cred.user.email?.split("@")[0] || "user").toLowerCase(),
        displayName: cred.user.displayName || "User",
        photoURL: cred.user.photoURL || null,
        bio: "",
        isAdmin: isOwner,
        isOwner,
        isBanned: false,
        banReason: null,
        isVerified: false,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        blockedUsers: [],
      });
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), data);
    await fetchProfile(user.uid);
  };

  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    const q = query(
      collection(db, "users"),
      where("username", "==", username.toLowerCase())
    );
    const snap = await getDocs(q);
    return snap.empty;
  };

  const checkEmailAvailable = async (email: string): Promise<boolean> => {
    const q = query(
      collection(db, "users"),
      where("email", "==", email.toLowerCase())
    );
    const snap = await getDocs(q);
    return snap.empty;
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        logOut,
        updateUserProfile,
        checkUsernameAvailable,
        checkEmailAvailable,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
