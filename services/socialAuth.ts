import { Platform } from "react-native";
import Constants from "expo-constants";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  UserCredential,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "./firebaseConfig";

// ─── Apple Sign-In ───────────────────────────────────────────────────────────

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Generates a SHA256-hashed nonce. Apple wants the hashed value; Firebase
 * needs the raw value to verify the identity-token's nonce claim.
 */
async function generateNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = Array.from(await Crypto.getRandomBytesAsync(32))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const hashed = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    raw
  );
  return { raw, hashed };
}

export async function signInWithApple(): Promise<UserCredential> {
  if (Platform.OS !== "ios") {
    throw new Error("Apple Sign-In is only available on iOS.");
  }

  const { raw, hashed } = await generateNonce();

  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashed,
  });

  const { identityToken, authorizationCode } = appleCredential;
  if (!identityToken) {
    throw new Error("Apple Sign-In did not return an identity token.");
  }

  const provider = new OAuthProvider("apple.com");
  const firebaseCred = provider.credential({
    idToken: identityToken,
    rawNonce: raw,
  });

  const userCred = await signInWithCredential(auth, firebaseCred);

  // Fire-and-forget: exchange the authorization code for a refresh token
  // server-side and store it so we can revoke on account delete (Apple
  // guideline 5.1.1(v)). We deliberately don't await — sign-in should
  // succeed even if the exchange fails (e.g. functions not yet deployed,
  // network blip). Apple compliance still requires the function to be
  // deployed, but we never want a server hiccup to break login.
  if (authorizationCode) {
    const exchange = httpsCallable<{ authorizationCode: string }, { ok: boolean }>(
      functions,
      "exchangeAndStoreAppleToken"
    );
    exchange({ authorizationCode }).catch((err) => {
      console.warn(
        "Apple token exchange failed (sign-in succeeded, revoke-on-delete may not work):",
        err?.message ?? err
      );
    });
  }

  return userCred;
}

// ─── Google Sign-In ──────────────────────────────────────────────────────────

let googleConfigured = false;

function configureGoogle() {
  if (googleConfigured) return;
  const iosClientId = Constants.expoConfig?.extra?.googleIosClientId as string | undefined;
  const webClientId = Constants.expoConfig?.extra?.googleWebClientId as string | undefined;

  if (!iosClientId && !webClientId) {
    throw new Error(
      "Google Sign-In is not configured. Add googleIosClientId / googleWebClientId to app.config.local.js."
    );
  }

  GoogleSignin.configure({
    iosClientId,
    webClientId,
    offlineAccess: false,
  });
  googleConfigured = true;
}

export async function signInWithGoogle(): Promise<UserCredential> {
  configureGoogle();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result: any = await GoogleSignin.signIn();

  // The library has changed return shape across versions — accept both.
  const idToken: string | undefined =
    result?.idToken ??
    result?.data?.idToken ??
    result?.user?.idToken;

  if (!idToken) {
    throw new Error("Google Sign-In did not return an idToken.");
  }

  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

export async function signOutGoogle(): Promise<void> {
  if (!googleConfigured) return;
  try {
    await GoogleSignin.signOut();
  } catch {
    /* ignore */
  }
}

/** True if the error from signInWithGoogle was a user-cancelled flow. */
export function isGoogleCancelled(err: any): boolean {
  return err?.code === statusCodes.SIGN_IN_CANCELLED;
}

/** True if the error from signInWithApple was a user-cancelled flow. */
export function isAppleCancelled(err: any): boolean {
  return err?.code === "ERR_REQUEST_CANCELED" || err?.code === "ERR_CANCELED";
}
