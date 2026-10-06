import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "web/src/components/ui/**"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // 允許用解構排除不要的屬性，例如 const { node, ...props } = p
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true, argsIgnorePattern: "^_" }],
    },
  },
  {
    // 後端
    files: ["src/**/*.ts", "*.config.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    // 前端
    files: ["web/src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
);
