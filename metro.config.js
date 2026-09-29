const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// ─── Didit SDK: native-only ─────────────────────────────────────────────────
// @didit-protocol/sdk-react-native uses native modules (camera, NFC) that do
// not exist in a browser. Replacing it with an empty module on web lets
// `expo export --platform web` succeed while keeping the native builds intact.
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "@didit-protocol/sdk-react-native") {
    return { type: "empty" };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: "./global.css",
});