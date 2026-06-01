# Apple Token Revocation — Cloud Functions Deployment Guide

To pass **App Store Review Guideline 5.1.1(v)**, when a user deletes their CalPal account we must call Apple's `/auth/revoke` endpoint to invalidate their Sign-In-with-Apple token. Apple rejects apps that don't do this.

This guide is a **one-time setup**. After deployment, every account deletion automatically revokes the Apple token. No further work needed.

---

## What you'll need before starting

From your existing Apple Developer setup (you already have these from the Firebase Apple Auth provider config we did earlier):

| Value | Where to find it |
|---|---|
| **Apple Team ID** | [developer.apple.com](https://developer.apple.com) → top right corner (10-char string) — yours is `T8LRTJ92ND` |
| **Apple Key ID** | The Sign-In-with-Apple key you generated in Apple Developer → Keys (10-char string) |
| **Apple Private Key (.p8 file)** | The file you downloaded when creating that key. Open it in a text editor — copy the **entire contents** including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines |
| **Apple Client ID** | Your iOS bundle ID — `com.calpal.ai` |

> ⚠️ If you can't find the `.p8` file: go to Apple Developer → Keys, and either find the existing key for your app, or create a new one. You can only download the `.p8` once — if it's lost, generate a new one and revoke the old.

---

## One-time setup

### 1. Install the Firebase CLI

If you don't have it already:

```bash
npm install -g firebase-tools
firebase login
```

### 2. Make sure you're on the right project

From the CalPal repo root:

```bash
firebase use calpal-38ed5
```

If that errors with "no project association", do:

```bash
firebase projects:list
firebase use --add
# pick calpal-38ed5
```

### 3. Install function dependencies

```bash
cd functions
npm install
cd ..
```

### 4. Set the Apple secrets

These commands prompt you for the value, store it encrypted in Google Secret Manager, and grant the function read access. Run each one and paste the value:

```bash
firebase functions:secrets:set APPLE_TEAM_ID
# paste: T8LRTJ92ND

firebase functions:secrets:set APPLE_KEY_ID
# paste: e.g. ABC123DEFG

firebase functions:secrets:set APPLE_CLIENT_ID
# paste: com.calpal.ai

firebase functions:secrets:set APPLE_PRIVATE_KEY
# paste: the ENTIRE contents of the .p8 file, including BEGIN/END lines.
# Press Enter, then Ctrl+D (Mac/Linux) or Ctrl+Z then Enter (Windows) to finish.
```

The CLI will warn that the value is multi-line for the private key — that's expected.

### 5. Deploy

```bash
firebase deploy --only functions
```

You should see something like:

```
✔  functions[exchangeAndStoreAppleToken(us-central1)] Successful create operation.
✔  functions[deleteAccountAndRevokeApple(us-central1)] Successful create operation.
```

Total deploy time: **~2 minutes**.

### 6. Deploy the updated Firestore rules

```bash
firebase deploy --only firestore:rules
```

This locks the new `apple_tokens` collection so only the functions can read/write it.

**You're done.** Every Apple Sign-In from now on will automatically store the user's refresh token, and every account deletion will revoke it.

---

## How to verify it works

### Method 1: Apple's Sandbox test (best for App Review compliance)

1. Sign in with Apple on a fresh build of CalPal
2. Open **Settings on your iPhone → Apple ID → Sign in with Apple → CalPal**
3. You should see CalPal listed there as an authorized app
4. In CalPal, go to **Profile → Delete account**
5. Confirm deletion
6. Wait ~10 seconds
7. Go back to **Settings → Apple ID → Sign in with Apple → CalPal**
8. **It should be GONE.** That confirms Apple's revoke endpoint accepted the call.

### Method 2: Inspect function logs

```bash
firebase functions:log --only deleteAccountAndRevokeApple
```

You'll see entries for each invocation. Errors (if any) will be visible there.

### Method 3: Firestore inspection

After an Apple Sign-In, the `apple_tokens` collection in the Firestore console should contain a document keyed by the user's Firebase UID. After a deletion, that document should be gone — along with the user's `users/{uid}` doc and all their meal/exercise/weight logs.

---

## What gets cleaned up on account deletion

The `deleteAccountAndRevokeApple` function wipes **all** user data, in this order:

1. Apple `/auth/revoke` is called (if the user signed in with Apple)
2. `apple_tokens/{uid}` document deleted
3. All `mealLogs` where `userId == uid` deleted (batched in chunks of 400)
4. All `exerciseLogs` where `userId == uid` deleted
5. All `weightLogs` where `userId == uid` deleted
6. `users/{uid}` profile document deleted

Then the client-side `deleteUser(currentUser)` call removes the Firebase Auth account itself.

---

## Email / Google sign-in users

The function is safe for these accounts too — if there's no `apple_tokens` document, it skips the revoke step and goes straight to deleting Firestore data. Apple's guideline only mandates revoke for Apple Sign-In users; for email/Google users the same function handles the data-deletion side of the guideline anyway.

---

## Updating secrets later

If you rotate your `.p8` key:

```bash
firebase functions:secrets:set APPLE_PRIVATE_KEY
firebase deploy --only functions
```

The deploy step is necessary to roll the new secret version to the running functions.

---

## Cost

These functions run only on:
- Successful Apple Sign-In (`exchangeAndStoreAppleToken` — typically once per device install)
- Account deletion (`deleteAccountAndRevokeApple` — once per delete)

Both are rare events. Firebase Functions free tier gives you **2 million invocations/month** plus generous CPU/network. **You will not hit any billable usage from this for a long time.**
