import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";

export default defineConfig([
  // Next recommended flat configs
  ...nextCoreWebVitals,
  ...nextTypescript,

  // default ignores
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),

  // shared rules/plugins that don't require parserOptions.project
  {
    plugins: { "@typescript-eslint": tsPlugin },
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
    rules: {
      "prefer-const": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-var-requires": "warn",
      "no-empty": ["error", { allowEmptyCatch: false }],
      "comma-spacing": [
        "error",
        {
          before: false,
          after: true,
        },
      ],
      "react-hooks/exhaustive-deps": "off",
      "no-nested-ternary": "error",
    },
  },

  // Apply TypeScript parser + project only to TS/TSX files
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: 2020,
        sourceType: "module",
      },
    },
  },

  {
    // allow CommonJS config files to use require()
    files: ["jest.config.js", "**/*.config.js", "**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  prettierConfig,
]);
