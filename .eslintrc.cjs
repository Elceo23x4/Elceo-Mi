module.exports = {
  root: true,
  ignorePatterns: ["**/dist/**", "**/.next/**", "**/coverage/**", "node_modules/**"],
  env: {
    es2022: true,
    node: true,
    browser: true
  },
  extends: ["eslint:recommended"],
  overrides: [
    {
      files: ["**/*.{ts,tsx}"],
      parser: "@typescript-eslint/parser",
      plugins: ["@typescript-eslint"],
      extends: ["plugin:@typescript-eslint/recommended"],
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true }
      },
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
      }
    }
  ]
};