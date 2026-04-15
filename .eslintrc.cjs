module.exports = {
  root: true,
  ignorePatterns: ["**/dist/**", "**/.next/**", "**/coverage/**"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  env: {
    es2022: true,
    node: true,
    browser: true
  },
  extends: ["eslint:recommended"]
};
