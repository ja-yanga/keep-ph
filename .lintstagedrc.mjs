import path from "path";

const buildEslintCommand = (filenames) =>
  `next lint --fix ${filenames
    .map(
      (f) => `--file "${path.relative(process.cwd(), f).replace(/"/g, '\\"')}"`,
    )
    .join(" ")}`;

const config = {
  "*.{js,jsx,ts,tsx}": ["prettier --write", buildEslintCommand],
};

export default config;
