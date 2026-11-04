import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    // eslint-plugin-react (pulled in by eslint-config-next) calls
    // context.getFilename() to auto-detect the React version, but that API
    // was removed in ESLint 9 flat config. Providing the version explicitly
    // avoids the detection code path entirely.
    settings: {
      react: {
        version: "19.2.3",
      },
    },
  },
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": "error",
    },
  },
  prettierConfig,
]);

export default eslintConfig;
