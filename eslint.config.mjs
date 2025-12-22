import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import eslintComments from "eslint-plugin-eslint-comments";
import react from "eslint-plugin-react";

export default defineConfig([
  // Next recommended flat configs
  ...nextCoreWebVitals,
  ...nextTypescript,

  // default ignores
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),

  // shared rules/plugins that don't require parserOptions.project
  {
    plugins: {
      react,
      "eslint-comments": eslintComments,
    },
    rules: {
      "prefer-const": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-var-requires": "warn",
      "no-empty": ["error", { allowEmptyCatch: false }],
      "comma-spacing": ["error", { before: false, after: true }],
      "react-hooks/exhaustive-deps": "off",
      // Allow unescaped entities - quotes and braces are safe in JSX expressions
      "react/no-unescaped-entities": [
        "warn",
        {
          forbid: [{ char: ">", alternatives: ["&gt;"] }],
        },
      ],

      // core rule
      "no-nested-ternary": "error",

      // eslint-disable discipline
      "eslint-comments/no-unlimited-disable": "error",
      "eslint-comments/require-description": [
        "error",
        { ignore: ["eslint-enable"] },
      ],
      "eslint-comments/no-unused-disable": "error",
    },
  },

  // Apply TypeScript parser + project only to TS/TSX files (excluding test files)
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["__tests__/**"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: 2020,
        sourceType: "module",
      },
    },
  },

  // Test files - use TypeScript parser without project reference
  {
    files: ["__tests__/**/*.ts", "__tests__/**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
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
