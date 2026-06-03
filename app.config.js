const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");

// Load environment variables from .env file (only used in development)
dotenv.config();

const isEasBuild = process.env.EAS_BUILD === "true";
const isProd = process.env.APP_ENV === "production";
const env = isProd ? "production" : "development";

let localConfig = {};
if (!isEasBuild) {
  try {
    if (fs.existsSync("./app.config.local.js")) {
      localConfig = require("./app.config.local.js");
    }
  } catch (error) {
    console.warn("Error loading local config:", error.message);
  }
}

const firebaseConfig = {
  apiKey:
    process.env.FIREBASE_API_KEY ||
    localConfig.firebase?.apiKey ||
    "YOUR_FIREBASE_API_KEY",
  authDomain:
    process.env.FIREBASE_AUTH_DOMAIN ||
    localConfig.firebase?.authDomain ||
    "YOUR_FIREBASE_AUTH_DOMAIN",
  projectId:
    process.env.FIREBASE_PROJECT_ID ||
    localConfig.firebase?.projectId ||
    "YOUR_FIREBASE_PROJECT_ID",
  storageBucket:
    process.env.FIREBASE_STORAGE_BUCKET ||
    localConfig.firebase?.storageBucket ||
    "YOUR_FIREBASE_STORAGE_BUCKET",
  messagingSenderId:
    process.env.FIREBASE_MESSAGING_SENDER_ID ||
    localConfig.firebase?.messagingSenderId ||
    "YOUR_FIREBASE_MESSAGING_SENDER_ID",
  appId:
    process.env.FIREBASE_APP_ID ||
    localConfig.firebase?.appId ||
    "YOUR_FIREBASE_APP_ID",
};

const revenueCatConfig = {
  apiKeyIOS:
    process.env.REVENUECAT_API_KEY_IOS ||
    localConfig.revenueCat?.apiKeyIOS ||
    "",
  apiKeyAndroid:
    process.env.REVENUECAT_API_KEY_ANDROID ||
    localConfig.revenueCat?.apiKeyAndroid ||
    "",
};

const googleSignInConfig = {
  iosClientId:
    process.env.GOOGLE_IOS_CLIENT_ID ||
    localConfig.google?.iosClientId ||
    "",
  iosUrlScheme:
    process.env.GOOGLE_IOS_URL_SCHEME ||
    localConfig.google?.iosUrlScheme ||
    "",
  webClientId:
    process.env.GOOGLE_WEB_CLIENT_ID ||
    localConfig.google?.webClientId ||
    "",
};

module.exports = {
  name: "CalPal",
  slug: "calpal-ai",
  version: "5",
  orientation: "portrait",
  icon: "./assets/images/calpal-logo.png",
  userInterfaceStyle: "light",
  scheme: "calpal",
  newArchEnabled: true,
  owner: "x1supreme",
  updates: {
    url: "https://u.expo.dev/e8f43e11-6ca9-4b2f-8445-487ffdc1c69a",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/transparent-logo.png",
      backgroundColor: "#ffffff",
    },
    package: "com.calpal.ai",
    versionCode: 5,
    permissions: [
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "BILLING", // Required for in-app purchases
    ],
    runtimeVersion: "5",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.calpal.ai",
    buildNumber: "1",
    usesAppleSignIn: true,
    infoPlist: {
      NSCameraUsageDescription:
        "CalPal needs camera access so you can snap a photo of your meal. The photo is sent to our AI service to estimate the calories and macros.",
      NSPhotoLibraryUsageDescription:
        "CalPal needs photo library access so you can pick an existing meal photo. The photo is sent to our AI service to estimate the calories and macros.",
      ITSAppUsesNonExemptEncryption: false,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
  },
  splash: {
    image: "./assets/images/transparent-logo.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  assetBundlePatterns: ["**/*"],
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  experiments: {
    typedRoutes: true,
  },
  plugins: [
    "expo-router",
    "expo-camera",
    "expo-image-picker",
    "expo-apple-authentication",
    [
      "expo-notifications",
      {
        icon: "./assets/images/transparent-logo.png",
        color: "#0a7ea4",
      },
    ],
    // Only register Google Sign-In if we have a valid URL scheme. EAS builds
    // without the secret configured will simply skip the plugin instead of
    // failing the build with a dummy value.
    ...(googleSignInConfig.iosUrlScheme.startsWith("com.googleusercontent.apps")
      ? [
          [
            "@react-native-google-signin/google-signin",
            { iosUrlScheme: googleSignInConfig.iosUrlScheme },
          ],
        ]
      : []),
    [
      "expo-splash-screen",
      {
        image: "./assets/images/transparent-logo.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
  ],
  extra: {
    firebaseApiKey: firebaseConfig.apiKey,
    firebaseAuthDomain: firebaseConfig.authDomain,
    firebaseProjectId: firebaseConfig.projectId,
    firebaseStorageBucket: firebaseConfig.storageBucket,
    firebaseMessagingSenderId: firebaseConfig.messagingSenderId,
    firebaseAppId: firebaseConfig.appId,
    geminiApiKey:
      process.env.GEMINI_API_KEY ||
      process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
      localConfig.geminiApiKey ||
      "",
    revenueCatApiKeyIOS: revenueCatConfig.apiKeyIOS,
    revenueCatApiKeyAndroid: revenueCatConfig.apiKeyAndroid,
    googleIosClientId: googleSignInConfig.iosClientId,
    googleWebClientId: googleSignInConfig.webClientId,
    eas: {
      projectId: "e8f43e11-6ca9-4b2f-8445-487ffdc1c69a",
    },
    environment: env,
  },
};
