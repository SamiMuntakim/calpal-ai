# CalPal Privacy Policy

**Effective date: [INSERT DATE — e.g. 1 December 2024]**
**Last updated: [INSERT DATE]**

---

## 1. Who we are

CalPal ("we", "us", "our") is a mobile application that uses artificial intelligence to help you track meals, calories, macros, weight, and physical activity.

Contact: [INSERT YOUR CONTACT EMAIL — e.g. support@calpal.ai]
App owner: [INSERT YOUR LEGAL NAME OR COMPANY]

---

## 2. What this policy covers

This policy explains what information CalPal collects, how we use it, who we share it with, your rights, and how to contact us. It applies to the CalPal iOS application and any related services we offer.

---

## 3. Information we collect

### 3.1 Information you provide directly

When you create an account and use CalPal, you provide:

- **Authentication data** — email address (if you sign up with email/password or Google), or an Apple-relay email address (if you use Sign in with Apple). We do not see or store your password.
- **Profile information** — first name, age, biological sex, height, current weight, starting weight, target weight, weekly goal, activity level.
- **Logged meals** — meal name, time logged, calories, protein, carbs, fats, and (optionally) a photo of the meal.
- **Logged exercises** — exercise type, duration, intensity, AI-estimated calories burned.
- **Logged body weight** — your weight reading and the date.

### 3.2 Information collected automatically

- **Subscription status** — whether you have an active trial or paid subscription. Managed via Apple's StoreKit and RevenueCat (we do not see your payment card details — Apple handles payment).
- **Device identifiers** — a Firebase-generated user ID, used to associate your data with your account. We do not collect IDFA or use cross-app tracking.
- **Crash and error logs** — limited diagnostic information when the app encounters an error, used to fix bugs.

### 3.3 Information we do NOT collect

- We do **not** access your contacts, calendar, location, microphone, or Apple Health data.
- We do **not** track you across other apps or websites.
- We do **not** use your data to train AI models.
- We do **not** sell your data to anyone, ever.

---

## 4. How we use your information

We use the information we collect to:

- Calculate your personalised calorie and macro targets (via Google's Gemini API).
- Analyse photos of your meals to estimate nutrition values (via Google's Gemini API).
- Estimate calories burned from exercises (via Google's Gemini API).
- Show you trends, charts, and AI insights based on your logged data.
- Manage your subscription (via RevenueCat and Apple).
- Send you reminder notifications (only if you enable them in CalPal Settings → Reminders).
- Improve CalPal — for example, fixing bugs that surface in error logs.

We do **not** use your data for advertising, marketing to third parties, or any purpose unrelated to making CalPal work for you.

---

## 5. Who we share your information with

We share the minimum necessary information with the following third-party processors:

| Provider | Purpose | Data shared |
|---|---|---|
| **Google Firebase** (Authentication, Firestore, Storage, Functions) | Account authentication, data storage, server-side functions | All profile data, all logged data |
| **Google Gemini API** | AI photo analysis, nutrition calculation, exercise estimation, weight trend analysis | Meal photos (when you choose to scan a meal), body stats (for calorie target generation), aggregated weight data (for trend insight) |
| **RevenueCat** | Subscription management | Anonymous subscription identifier, your Firebase user ID |
| **Apple** | Authentication (Sign in with Apple) and in-app purchases | Apple ID identifier, purchase token |

We do **not** share your data with advertisers, data brokers, or any party other than these essential service providers.

---

## 6. International data transfers

Your data is stored on Google Cloud servers, which may be located outside your country of residence (typically in the United States). All transfers comply with applicable data protection laws.

---

## 7. How long we keep your data

We keep your data for as long as your CalPal account is active. When you delete your account:

1. We immediately delete your profile, all logged meals, exercises, weight entries, and meal photos from our Firestore database.
2. If you signed in with Apple, we call Apple's `/auth/revoke` endpoint to revoke your authorisation token, in line with Apple's App Store Review Guideline 5.1.1(v).
3. Your Firebase Authentication record is deleted.
4. Diagnostic logs may persist for up to 90 days for security purposes, then are deleted.

To delete your account, open CalPal → Profile tab → Delete account.

---

## 8. Your rights

Depending on where you live, you may have the right to:

- **Access** the data we hold about you.
- **Correct** inaccurate data — most fields can be updated in CalPal → Profile → Edit profile & goals.
- **Delete** your account and all associated data — see Section 7 above.
- **Object** to certain processing.
- **Export** your data in a portable format.
- **Lodge a complaint** with your local data protection authority.

To exercise any of these rights, email us at [INSERT CONTACT EMAIL].

### EU / UK residents (GDPR)

The legal basis for our processing is:

- **Contract** — providing CalPal as you've requested.
- **Consent** — when you enable notifications or scan meal photos.
- **Legitimate interest** — fixing bugs, preventing fraud.

### California residents (CCPA)

You have the right to know what personal information we collect, to delete it, and to opt out of any sale of personal information. We do not sell personal information.

---

## 9. Children's privacy

CalPal is not designed for or directed at children under the age of 13. We do not knowingly collect data from children under 13. If you believe a child has provided us with personal information, please contact us and we will delete it.

For users aged 13–17, we recommend using CalPal only with the involvement of a parent or guardian, and only for general wellness purposes — never as a substitute for medical or nutritional advice from a qualified professional.

---

## 10. Health and wellness disclaimer

CalPal provides educational estimates of calories, macros, and nutritional content using artificial intelligence. These estimates are **not medical advice**. They should not replace consultation with a qualified healthcare professional, particularly if you have a medical condition, eating disorder, or are pregnant or nursing.

Always consult a qualified professional before making significant changes to your diet or exercise routine.

---

## 11. Security

We protect your data using industry-standard security practices:

- All data is transmitted over encrypted connections (HTTPS / TLS).
- Stored data is encrypted at rest on Google Cloud.
- Apple refresh tokens are stored in a server-only Firestore collection that no client can read.
- Authentication relies on Firebase Auth's industry-standard secure flows.

No system is 100% secure. If you become aware of a security issue, please contact us immediately.

---

## 12. Changes to this policy

We may update this policy from time to time. When we do, we will update the "Last updated" date at the top of this page. Significant changes will be announced in the app or by email.

---

## 13. Contact us

Questions, requests, or concerns about your privacy?

**Email:** [INSERT CONTACT EMAIL]
**App:** CalPal — Profile tab → Help & support

---

*This document was last reviewed and updated on [INSERT DATE].*
