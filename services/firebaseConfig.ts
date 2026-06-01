import { initializeApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  // @ts-ignore — present at runtime in firebase 12.x but missing from the public types
  getReactNativePersistence,
  Auth,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFunctions, Functions } from "firebase/functions";
import Constants from "expo-constants";
import { Platform } from "react-native";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Default config for fallback in production (placeholder values)
const defaultConfig = {
  apiKey: "placeholder-for-production",
  authDomain: "placeholder-for-production",
  projectId: "placeholder-for-production",
  storageBucket: "placeholder-for-production",
  messagingSenderId: "placeholder-for-production",
  appId: "placeholder-for-production",
};

// Firebase configuration
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || defaultConfig.apiKey,
  authDomain:
    Constants.expoConfig?.extra?.firebaseAuthDomain || defaultConfig.authDomain,
  projectId:
    Constants.expoConfig?.extra?.firebaseProjectId || defaultConfig.projectId,
  storageBucket:
    Constants.expoConfig?.extra?.firebaseStorageBucket ||
    defaultConfig.storageBucket,
  messagingSenderId:
    Constants.expoConfig?.extra?.firebaseMessagingSenderId ||
    defaultConfig.messagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId || defaultConfig.appId,
};

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

try {
  console.log("Initializing Firebase...");

  // Initialize Firebase
  app = initializeApp(firebaseConfig);

  // Initialize Firebase Authentication with proper React Native persistence
  if (Platform.OS === "web") {
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
    console.log("Firebase Auth initialized for web");
  } else {
    // Use AsyncStorage so sessions persist across cold-launches
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
    console.log("Firebase Auth initialized for React Native with AsyncStorage persistence");
  }

  // Initialize Firestore, Storage, and Functions
  firestore = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app, "us-central1");

  console.log("Firebase initialized successfully!");
} catch (error) {
  console.error("Error initializing Firebase:", error);

  // @ts-ignore
  app = {} as FirebaseApp;
  // @ts-ignore
  auth = {} as Auth;
  // @ts-ignore
  firestore = {} as Firestore;
  // @ts-ignore
  storage = {} as FirebaseStorage;
  // @ts-ignore
  functions = {} as Functions;
}

const isFirebaseConfigured = () => {
  return Boolean(
    firebaseConfig.apiKey !== defaultConfig.apiKey &&
      firebaseConfig.projectId !== defaultConfig.projectId
  );
};

export { auth, firestore, storage, functions, isFirebaseConfigured };
export default app;
