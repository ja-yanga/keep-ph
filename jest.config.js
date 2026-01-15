// eslint-disable-next-line @typescript-eslint/no-var-requires -- Jest config requires CommonJS
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transformIgnorePatterns: ["node_modules/(?!(lighthouse)/)"],
  // Show test results first, then errors at the end
  verbose: false,
  // Don't show coverage during test runs (cleaner output)
  collectCoverage: false,
};

module.exports = createJestConfig(customJestConfig);
