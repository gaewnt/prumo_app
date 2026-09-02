const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// No build web (Metro usa a condição "import" do package.json do zustand, que aponta pro
// arquivo ESM dele — esse arquivo usa `import.meta.env`, sintaxe que só funciona dentro de
// um <script type="module">, e o Expo Web carrega o bundle como script normal. Isso quebrava
// a página inteira com "Cannot use 'import.meta' outside a module". A versão CJS
// (`middleware.js`, já usada no build nativo) não tem esse problema — força ela pra web também.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "zustand/middleware") {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "node_modules/zustand/middleware.js"),
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
