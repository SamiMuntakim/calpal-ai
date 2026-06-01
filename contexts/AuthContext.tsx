import React, { createContext, useState, useEffect, useRef, ReactNode } from "react";
import { router } from "expo-router";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  deleteUser,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, functions } from "../services/firebaseConfig";
import { httpsCallable } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  signInWithApple as socialSignInApple,
  signInWithGoogle as socialSignInGoogle,
  signOutGoogle,
} from "../services/socialAuth";

// Auth session storage key
const AUTH_SESSION_KEY = "calpal_auth_session";

// Define the User type
type User = {
  id: string;
  email: string | null;
} | null;

// Auth session for persistence
type AuthSession = {
  userId: string;
  email: string | null;
  lastLogin: number;
};

// Define the Auth context type
type AuthContextType = {
  user: User;
  isLoading: boolean;
  authReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** Tell AuthContext to skip its next auto-navigation after an auth event.
   *  Used by paywall AuthSheet so the user stays on the paywall after
   *  signing up, so the purchase + profile-save can complete in place. */
  bypassNextAuthNavigation: () => void;
};

// Create the Auth context with default values
export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  authReady: false,
  signIn: async () => {},
  signUp: async () => {},
  signInWithApple: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  deleteAccount: async () => {},
  bypassNextAuthNavigation: () => {},
});

// Convert Firebase user to our app's user format
const formatUser = (firebaseUser: FirebaseUser | null): User => {
  if (!firebaseUser) return null;

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
  };
};

// Save auth session to AsyncStorage as backup
const saveAuthSession = async (user: User) => {
  if (!user) {
    await AsyncStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }

  const session: AuthSession = {
    userId: user.id,
    email: user.email,
    lastLogin: Date.now(),
  };

  try {
    await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    console.log("Auth session saved to storage as backup");
  } catch (error) {
    console.error("Error saving auth session:", error);
  }
};

// Load auth session from AsyncStorage (fallback only)
const loadAuthSession = async (): Promise<AuthSession | null> => {
  try {
    const sessionData = await AsyncStorage.getItem(AUTH_SESSION_KEY);
    if (!sessionData) return null;

    return JSON.parse(sessionData) as AuthSession;
  } catch (error) {
    console.error("Error loading auth session:", error);
    return null;
  }
};

// Auth Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  // Ref instead of state so the listener is only created once (no dep-array churn)
  const isFirstAuthEvent = useRef(true);
  // Single-use flag: when true, the very next auth-state-change skips its
  // auto-navigation. Used by the paywall's AuthSheet so the user stays put
  // after signing up, while the paywall finishes the purchase.
  const bypassNavRef = useRef(false);

  // Initialize auth state — set up once, never re-subscribed
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log(
        "Auth state changed:",
        firebaseUser ? "User logged in" : "No user"
      );

      const formattedUser = formatUser(firebaseUser);

      if (formattedUser) {
        setUser(formattedUser);
        await saveAuthSession(formattedUser);
      } else {
        setUser(null);
        await saveAuthSession(null);
      }

      setAuthReady(true);
      console.log("Firebase Auth is now ready");
      setIsLoading(false);

      // Skip navigation on the first event (app cold-start); let index.tsx route
      if (isFirstAuthEvent.current) {
        isFirstAuthEvent.current = false;
      } else if (bypassNavRef.current) {
        // Caller (e.g. paywall) will handle navigation manually
        bypassNavRef.current = false;
      } else {
        handleAuthNavigation(formattedUser);
      }
    });

    return unsubscribe;
  }, []);

  // Handle navigation based on auth state
  const handleAuthNavigation = (currentUser: User) => {
    if (currentUser) {
      // User just logged in or signed up - go to the index which will check if onboarding is needed
      console.log("User logged in, navigating to index for routing");
      router.replace("/");
    } else {
      // User just logged out or deleted account
      console.log("User logged out, navigating to welcome");
      router.replace("/(onboarding)/welcome");
    }
  };

  // Sign in function
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const formattedUser = formatUser(userCredential.user);

      // Save session to AsyncStorage as backup
      await saveAuthSession(formattedUser);

      // Navigation will be handled by the auth state change listener
    } catch (error) {
      console.error("Sign in error:", error);
      setIsLoading(false);
      throw error;
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const formattedUser = formatUser(userCredential.user);

      // Save session to AsyncStorage as backup
      await saveAuthSession(formattedUser);

      // Navigation will be handled by the auth state change listener
    } catch (error) {
      console.error("Sign up error:", error);
      setIsLoading(false);
      throw error;
    }
  };

  // Sign in with Apple
  const signInWithApple = async () => {
    setIsLoading(true);
    try {
      await socialSignInApple();
      // Navigation will be handled by the auth state change listener
    } catch (error) {
      console.error("Apple sign in error:", error);
      setIsLoading(false);
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      await socialSignInGoogle();
      // Navigation will be handled by the auth state change listener
    } catch (error) {
      console.error("Google sign in error:", error);
      setIsLoading(false);
      throw error;
    }
  };

  // Sign out function
  const signOut = async () => {
    setIsLoading(true);
    try {
      // Clear session from AsyncStorage
      await saveAuthSession(null);

      // Sign out of Google native SDK too (Apple has no equivalent)
      await signOutGoogle();

      // Sign out from Firebase
      await firebaseSignOut(auth);

      // Navigation will be handled by the auth state change listener
    } catch (error) {
      console.error("Sign out error:", error);
      setIsLoading(false);
      throw error;
    }
  };

  // Delete account function
  //
  // Apple guideline 5.1.1(v) requires us to revoke the user's Apple refresh
  // token when their account is deleted. We do that via a Cloud Function
  // (the .p8 private key can't live in the app). The function also wipes
  // the user's Firestore data — meal logs, exercise logs, weight logs,
  // profile, stored apple_tokens — so the order is:
  //   1. Call deleteAccountAndRevokeApple   (server-side cleanup + Apple revoke)
  //   2. Call firebaseDeleteUser            (removes the Auth user)
  //   3. AsyncStorage cleared, navigation handled by auth listener
  const deleteAccount = async () => {
    setIsLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("No authenticated user found");

      try {
        // 1. Server-side: revoke Apple token (if any) + delete Firestore data
        try {
          const revokeAndDelete = httpsCallable<unknown, { ok: boolean }>(
            functions,
            "deleteAccountAndRevokeApple"
          );
          await revokeAndDelete({});
        } catch (cleanupErr: any) {
          // Don't abort the account delete — the user has a right to delete
          // their auth record. We surface this in logs so any partial
          // cleanup failures are visible.
          console.warn(
            "Server-side account cleanup failed (continuing with auth delete):",
            cleanupErr?.message ?? cleanupErr
          );
        }

        // 2. Clear local session
        await saveAuthSession(null);

        // 3. Delete the Firebase Auth user
        await deleteUser(currentUser);
      } catch (error: any) {
        if (error.code === "auth/requires-recent-login") {
          throw new Error(
            "For security reasons, please sign out and sign in again before deleting your account."
          );
        }
        throw error;
      }
      // Navigation will be handled by the auth state change listener
    } catch (error) {
      console.error("Delete account error:", error);
      setIsLoading(false);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        authReady,
        signIn,
        signUp,
        signInWithApple,
        signInWithGoogle,
        signOut,
        deleteAccount,
        bypassNextAuthNavigation: () => { bypassNavRef.current = true; },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
