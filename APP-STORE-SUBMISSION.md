# App Store Submission Checklist — CalPal

This document covers everything between "code is done" and "app is live in the App Store." Some items are done in code (✅), some you do once in App Store Connect (⬜).

---

## Pre-submission: things outside CalPal you need to confirm

### ⬜ 1. Privacy Policy must be live at a real URL

Apple visits the URL during review. **If the URL 404s, your app is rejected.**

Your code links to **`https://calpal.ai/privacy`** in multiple places:
- The paywall legal block
- The Profile → Privacy Policy row

**Action:**
1. Take the `PRIVACY-POLICY.md` we generated.
2. Fill in the `[INSERT…]` placeholders (date, contact email, legal name).
3. Publish it. Options:
   - **Easiest:** Use a free service like **[Termly](https://termly.io)**, **[iubenda](https://iubenda.com)** to host it at their URL, then point your `calpal.ai/privacy` to redirect there. (Even simpler: change the URL in the code to point at their hosted version.)
   - **Cheapest:** Push a static HTML page to **GitHub Pages**, **Netlify**, or **Vercel** at `calpal.ai/privacy`.
   - **Quickest no-setup:** Publish in **Notion**, click Share → Publish, paste the URL into your code.

If you change the URL, update these spots:
- `app/paywall.tsx` line ~410 — `Linking.openURL("https://calpal.ai/privacy")`
- `app/(tabs)/profile.tsx` line ~218 — same URL

### ⬜ 2. Support URL and email

App Store Connect asks for a **Support URL** and **Marketing URL**.

- **Support URL:** Even a simple "Contact us at support@calpal.ai — replies within 24h" page is fine. Same hosting options as Privacy.
- **Marketing URL:** Optional, but a one-pager describing CalPal looks more professional.

### ⬜ 3. Verify Apple Sign-In is fully configured

You've already done this earlier, but quick sanity check:
- Apple Developer → Identifiers → `com.calpal.ai` → Sign In with Apple capability ticked ✅
- Firebase Auth → Apple provider enabled ✅
- Cloud Functions deployed with Apple secrets (`firebase functions:list` should show `exchangeAndStoreAppleToken` and `deleteAccountAndRevokeApple`) ✅

---

## App Store Connect setup

### ⬜ 4. App icon

A **1024×1024** PNG, no transparency, no rounded corners (Apple adds those). This is `assets/images/calpal-logo.png` — verify it's at least 1024×1024 and has a solid background.

### ⬜ 5. Screenshots

You need at least one screenshot per device size your app supports:

| Device | Required size |
|---|---|
| iPhone 6.7" (15/16 Pro Max) | 1290 × 2796 px |
| iPhone 6.5" (older Pro Max) | 1242 × 2688 px |
| iPhone 5.5" (Plus models) | 1242 × 2208 px (no longer required if you submit only 6.7") |

Take **screenshots that show real value**: the dashboard with logged meals, the AI meal-scan flow, the progress chart, the paywall. Avoid: empty states only, blurry shots, marketing mockups that look more polished than the actual app (Apple rejects those).

Tools: just use your iPhone (Hardware → Volume Up + Lock), or `xcrun simctl io booted screenshot`.

### ⬜ 6. App description

Required. **Don't lie about features.** Mention the AI photo scan, calorie/macro tracking, progress tracking, and the free trial. Apple rejects descriptions that imply medical advice or guaranteed weight loss.

### ⬜ 7. Keywords

Limited to ~100 characters. Examples: `calorie tracker, AI nutrition, macro tracking, weight loss, food diary`.

### ⬜ 8. Age rating

Open the App Store Connect questionnaire. CalPal is **4+** (no objectionable content). You'll be asked about:
- Medical/treatment info: **Infrequent/Mild** if you display nutritional data
- Other: all **None**

### ⬜ 9. App Privacy ("Nutrition Labels")

Apple shows users a summary of what data you collect. Fill these in **exactly as below** for CalPal:

| Category | Specific data | Used for | Linked to identity? | Used to track you? |
|---|---|---|---|---|
| **Contact Info** | Email address | App functionality, Account management | Yes | No |
| **Health & Fitness** | Health (weight, body stats, calorie/macro logs) | App functionality, Product personalisation | Yes | No |
| **User Content** | Photos (food photos), Other (logged meals/exercises) | App functionality | Yes | No |
| **Identifiers** | User ID | App functionality | Yes | No |
| **Diagnostics** | Crash data, Performance data | App functionality | No | No |

Critical: tick **"No"** under "Used to track you" — we don't have ATT and don't do cross-app tracking.

### ⬜ 10. Subscription details in App Store Connect

In App Store Connect → My Apps → CalPal → Subscriptions:

| Product | Display name | Description |
|---|---|---|
| `com.calpal.ai.Annual` | "CalPal Premium · Annual" | "Full access to AI meal scanning, personalised targets, and unlimited tracking. 7-day free trial included." |
| `com.calpal.ai.Monthly` | "CalPal Premium · Monthly" | "Full access to AI meal scanning, personalised targets, and unlimited tracking." |

Make sure each one has:
- An **intro offer** (7-day free trial on Annual already done ✅)
- **Subscription review information** field filled out describing what Premium unlocks
- A localised description in English at minimum

### ⬜ 11. Review notes

When you submit, App Store Connect asks for **Notes for Review**. Provide:

```
Test account credentials:
  Email: review@calpal.ai
  Password: [create a test account specifically for the reviewer]

Notes:
- Sign in with Apple is supported (required since we offer Google sign-in
  per guideline 4.8).
- Account deletion is available at Profile → Delete account. On deletion
  we call Apple's /auth/revoke endpoint via a Cloud Function to comply
  with guideline 5.1.1(v).
- The 7-day free trial requires no payment to start. Apple may use the
  sandbox tester flow to verify; no friction expected.
- AI nutrition estimates are clearly disclosed as approximate and not
  medical advice (Profile tab includes a visible disclaimer).
```

Creating a real test account for them avoids the back-and-forth where they ask for credentials.

---

## What we've already handled in code

These are the common rejection reasons we pre-empted while building:

### ✅ Apple Sign In with token revocation (Guideline 4.8 + 5.1.1(v))

- Sign in with Apple is offered alongside Google ✅
- When a user deletes their account, the Cloud Function calls Apple's `/auth/revoke` endpoint ✅
- The function also wipes all of the user's Firestore data (meal logs, exercise logs, weight logs, profile, stored Apple refresh token) ✅

### ✅ Account deletion is accessible and works (Guideline 5.1.1(v))

- Path: Profile → Delete account ✅
- Single confirm Alert, no obstacles ✅
- Deletes Firestore data + Auth user + Apple token in one flow ✅

### ✅ Subscription disclosure (Guideline 3.1.2(a))

Visible on the paywall before purchase:
- Subscription title ("CalPal Premium") ✅
- Length (per year / per month) ✅
- Price ✅
- Free-trial duration + post-trial price ✅
- Auto-renewal warning ✅
- Cancellation instructions (Apple ID → Subscriptions) ✅
- "Restore Purchases" link ✅
- EULA + Privacy Policy links ✅

### ✅ No unused permission requests (Guideline 5.1.1)

- Removed App Tracking Transparency (we weren't tracking anything) ✅
- Camera permission string is specific to actual use ✅
- Photo library permission string is specific ✅

### ✅ Medical/AI disclaimer (Guideline 1.4.1 / 5.1.5)

- Bottom of dashboard ✅
- Bottom of food detail screen ✅
- Prominent card in Profile tab ✅
- In Privacy Policy ✅

### ✅ Subscription guidelines compliance

- IAP only — no external payment ✅
- Restore Purchases button ✅
- Sign-out / delete-account exits don't hide ✅

---

## Apple's most-common rejection reasons — how we handle them

| Reason | Coverage |
|---|---|
| **2.1 — App not complete (crashes, broken links)** | All routes work, all buttons tested, no placeholder text remains |
| **2.3.7 — Hidden/disabled features** | Nothing hidden behind a feature flag |
| **3.1.1 — Payment outside IAP** | RevenueCat → StoreKit only |
| **3.1.2(a) — Subscription metadata missing** | Full disclosure on paywall (above) |
| **4.0 — Design quality** | Polished UI pass already done |
| **4.8 — No Sign in with Apple alongside Google** | Apple button on every auth screen on iOS |
| **5.1.1 — Privacy Policy URL invalid** | Must be live before submitting (see Step 1) |
| **5.1.1(v) — Apple token not revoked on delete** | Cloud Function handles this |
| **5.1.5 — Health data without disclaimer** | Disclaimer in 4 places |

---

## Final pre-submit checklist

Before you tap **Submit for Review**:

- [ ] Privacy Policy URL returns a real page (open it in a browser, not just the app)
- [ ] Sign in with Apple works in TestFlight build
- [ ] Apple Sign-In account can be deleted from Profile → Delete account, and the app no longer appears in iPhone Settings → Apple ID → Sign in with Apple
- [ ] Sandbox-test the free trial — fresh purchase should require no payment for 7 days
- [ ] Sign out and back in works
- [ ] All 4 tabs render with no console errors
- [ ] App icon shows correctly on the device home screen (1024×1024 source, no transparency)
- [ ] App version + build number bumped in `app.config.js` (`version` and `ios.buildNumber`)
- [ ] EAS build submitted to App Store Connect: `eas build --platform ios --profile production --auto-submit`
- [ ] App Store Connect "App Privacy" labels filled in
- [ ] Review notes added with test account credentials

---

## Likely first-review timeline

- **Submission → "Waiting for Review":** instant
- **"Waiting" → "In Review":** typically 24–48 hours
- **In Review → decision:** typically 24 hours
- **First-time apps:** sometimes a one-round rejection asking for clarification — respond within a day and you'll usually be approved within 48h of the response

If your first reviewer asks something we haven't covered here, paste the rejection message back to me and I'll write the response.

---

*This document was generated alongside the compliance code changes. If you tweak features, re-read the relevant sections to make sure the App Store Connect side still matches the app.*
