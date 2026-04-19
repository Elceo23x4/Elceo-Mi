module.exports = {
  root: true,
  ignorePatterns: ["**/dist/**", "**/.next/**", "**/coverage/**"],
  env: {
    es2022: true,
    node: true,
    browser: true
  },
  extends: ["eslint:recommended", "next/core-web-vitals"],
  overrides: [
    {
      files: ["**/*.{ts,tsx}"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true }
      },
      rules: {
        "no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
      }
    }
  ]
};
