const buildEslintCommand = (filenames) =>
  `eslint --fix ${filenames.map((f) => `"${f}"`).join(" ")}`;

const config = {
  "*.{js,jsx,ts,tsx}": ["prettier --write", buildEslintCommand],
};

export default config;
