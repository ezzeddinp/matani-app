import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "matani-app",
  slug: "matani-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/matani-logo.png",
  scheme: "mataniapp",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "com.matani.app",
    supportsTablet: true,
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS ?? "",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
  },
  android: {
    package: "com.matani.app",
    softwareKeyboardLayoutMode: "pan",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID ?? "",
      },
    },
  },
  web: {
    output: "static",
    favicon: "./assets/images/matani-logo.png",
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-web-browser",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-matani-logo.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: "8412a993-1dcd-42cd-a433-ece093519147",
    },
  },
  owner: "zeddin",
  updates: {
    url: "https://u.expo.dev/8412a993-1dcd-42cd-a433-ece093519147",
  },
};

export default config;
