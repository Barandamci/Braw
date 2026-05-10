import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore, enableNetwork, disableNetwork } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const appId =
  process.env["EXPO_PUBLIC_FIREBASE_APP_ID"] ||
  "1:531426380270:web:000000000000000000000000";

const firebaseConfig = {
  apiKey: process.env["EXPO_PUBLIC_FIREBASE_API_KEY"] || "AIzaSyCylUIn89c7Xkev3tbBSncFGqNwPchb3bU",
  authDomain: "braw-te.firebaseapp.com",
  projectId: "braw-te",
  storageBucket: "braw-te.firebasestorage.app",
  messagingSenderId: "531426380270",
  appId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let auth: ReturnType<typeof getAuth>;
if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(app);
  }
}

const db = getFirestore(app);

// Force Firestore online (workaround for offline errors on web)
if (Platform.OS === "web") {
  enableNetwork(db).catch(() => {});
}

export { auth, db };
export default app;
