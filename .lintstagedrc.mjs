import path from "path";

const buildEslintCommand = (filenames) =>
  `eslint --fix ${filenames
    .map((f) => `"${path.relative(process.cwd(), f).replace(/"/g, '\\"')}"`)
    .join(" ")}`;

const config = {
  "*.{js,jsx,ts,tsx}": ["prettier --write", buildEslintCommand],
};

export default config;
