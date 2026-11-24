// Metro config: default Expo settings, plus a web-only stub for react-native-maps (native iOS/Android only),
// so the web build can render the non-map screens. Native builds resolve the real package unchanged.
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-maps") {
    return { type: "sourceFile", filePath: path.join(__dirname, "utils/web-stubs/react-native-maps.js") };
  }
  return (resolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
