/**
 * CalPal Cloud Functions — Apple Sign-In token revocation
 *
 * Two callable functions implement the full Apple guideline 5.1.1(v) flow:
 *
 *   exchangeAndStoreAppleToken — Called from the client right after a
 *     successful Apple Sign-In. Exchanges the one-shot authorization code
 *     for a refresh token via Apple's /auth/token endpoint, then stores
 *     the refresh token in Firestore at apple_tokens/{uid}. The client
 *     never sees the refresh token; the apple_tokens collection is locked
 *     down by Firestore rules so only this function (running with admin
 *     privileges) can read it.
 *
 *   deleteAccountAndRevokeApple — Called from the client BEFORE
 *     firebaseDeleteUser. If the user has a stored Apple refresh token,
 *     calls Apple's /auth/revoke endpoint. Then wipes all of the user's
 *     Firestore data (profile, meal/exercise/weight logs, apple_token).
 *     The client deletes the Firebase Auth user after this returns.
 *
 * Secrets used (set via `firebase functions:secrets:set`):
 *
 *   APPLE_TEAM_ID       — your Apple Developer team ID (10 chars)
 *   APPLE_KEY_ID        — Key ID from your Sign-In-with-Apple .p8 key
 *   APPLE_PRIVATE_KEY   — full contents of the .p8 file (PEM, multi-line)
 *   APPLE_CLIENT_ID     — typically your iOS bundle ID (com.calpal.ai)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as jwt from "jsonwebtoken";

admin.initializeApp();
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

// ─── Secrets ─────────────────────────────────────────────────────────────────

const APPLE_TEAM_ID = defineSecret("APPLE_TEAM_ID");
const APPLE_KEY_ID = defineSecret("APPLE_KEY_ID");
const APPLE_PRIVATE_KEY = defineSecret("APPLE_PRIVATE_KEY");
const APPLE_CLIENT_ID = defineSecret("APPLE_CLIENT_ID");

// ─── Apple helpers ───────────────────────────────────────────────────────────

/**
 * Generates the `client_secret` JWT that Apple requires for every
 * /auth/token or /auth/revoke call. Valid for one hour.
 */
function generateAppleClientSecret(): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      iss: APPLE_TEAM_ID.value(),
      iat: now,
      exp: now + 60 * 60,
      aud: "https://appleid.apple.com",
      sub: APPLE_CLIENT_ID.value(),
    },
    APPLE_PRIVATE_KEY.value(),
    {
      algorithm: "ES256",
      keyid: APPLE_KEY_ID.value(),
    }
  );
}

async function postForm(url: string, params: Record<string, string>) {
  const body = new URLSearchParams(params).toString();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return res;
}

// ─── exchangeAndStoreAppleToken ──────────────────────────────────────────────

export const exchangeAndStoreAppleToken = onCall(
  {
    secrets: [APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, APPLE_CLIENT_ID],
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }

    const authorizationCode = (request.data?.authorizationCode ?? "") as string;
    if (!authorizationCode) {
      throw new HttpsError("invalid-argument", "authorizationCode is required.");
    }

    let clientSecret: string;
    try {
      clientSecret = generateAppleClientSecret();
    } catch (err) {
      console.error("Failed to generate Apple client_secret:", err);
      throw new HttpsError(
        "internal",
        "Server is missing Apple credentials. Check Firebase secrets."
      );
    }

    const res = await postForm("https://appleid.apple.com/auth/token", {
      client_id: APPLE_CLIENT_ID.value(),
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: "authorization_code",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Apple /auth/token failed:", res.status, text);
      throw new HttpsError(
        "internal",
        `Apple token exchange failed (${res.status}).`
      );
    }

    const tokens = (await res.json()) as {
      refresh_token?: string;
      access_token?: string;
      id_token?: string;
    };

    if (!tokens.refresh_token) {
      console.error("Apple token response missing refresh_token:", tokens);
      throw new HttpsError("internal", "Apple did not return a refresh_token.");
    }

    await admin.firestore().doc(`apple_tokens/${uid}`).set({
      refreshToken: tokens.refresh_token,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { ok: true };
  }
);

// ─── deleteAccountAndRevokeApple ─────────────────────────────────────────────

export const deleteAccountAndRevokeApple = onCall(
  {
    secrets: [APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, APPLE_CLIENT_ID],
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }

    const db = admin.firestore();

    // 1. If we have a stored Apple refresh token, revoke it.
    const tokenRef = db.doc(`apple_tokens/${uid}`);
    const tokenSnap = await tokenRef.get();

    if (tokenSnap.exists) {
      const data = tokenSnap.data() as { refreshToken?: string };
      const refreshToken = data?.refreshToken;
      if (refreshToken) {
        try {
          const clientSecret = generateAppleClientSecret();
          const res = await postForm("https://appleid.apple.com/auth/revoke", {
            client_id: APPLE_CLIENT_ID.value(),
            client_secret: clientSecret,
            token: refreshToken,
            token_type_hint: "refresh_token",
          });
          if (!res.ok) {
            const text = await res.text();
            console.warn("Apple /auth/revoke non-OK:", res.status, text);
            // Continue — we still need to delete user data even if Apple
            // can't revoke (e.g. token already expired/revoked).
          }
        } catch (err) {
          console.warn("Apple revoke threw (continuing to delete):", err);
        }
      }
    }

    // 2. Delete all of this user's data.
    await deleteUserData(uid, db);

    return { ok: true };
  }
);

/**
 * Wipe everything we have on this user. Batched in chunks of 400 to
 * stay under Firestore's 500-write batch limit.
 */
async function deleteUserData(uid: string, db: admin.firestore.Firestore) {
  // User-owned top-level collections
  const ownedCollections = ["mealLogs", "exerciseLogs", "weightLogs"];

  for (const coll of ownedCollections) {
    const snap = await db.collection(coll).where("userId", "==", uid).get();
    await batchDelete(snap.docs, db);
  }

  // Single docs keyed by uid
  await db.doc(`apple_tokens/${uid}`).delete().catch(() => {});
  await db.doc(`users/${uid}`).delete().catch(() => {});
}

async function batchDelete(
  docs: admin.firestore.QueryDocumentSnapshot[],
  db: admin.firestore.Firestore
) {
  const chunkSize = 400;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const batch = db.batch();
    docs.slice(i, i + chunkSize).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}
