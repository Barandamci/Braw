import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore, enableNetwork } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyDUy-d08C8KvpYd8JOsfng2NxyddGrQt-4",
  authDomain: "braw-te.firebaseapp.com",
  projectId: "braw-te",
  storageBucket: "braw-te.firebasestorage.app",
  messagingSenderId: "531426380270",
  appId: "1:531426380270:web:60f0f26fbc309a809fa6ff",
  measurementId: "G-3VLPQP1L8P",
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

if (Platform.OS === "web") {
  enableNetwork(db).catch(() => {});
}

export { auth, db };
export default app;
