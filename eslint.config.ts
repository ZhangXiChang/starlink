import { defineConfig } from "eslint/config";
import eslint from "@eslint/js";
import ts from "typescript-eslint";

export default defineConfig({
  files: ["src/**/*.{ts,tsx}"],
  languageOptions: { parserOptions: { projectService: true } },
  extends: [eslint.configs.recommended, ts.configs.recommendedTypeChecked],
  rules: {
    "@typescript-eslint/strict-boolean-expressions": "error",
    "@typescript-eslint/no-misused-promises": "off",
    "no-unassigned-vars": "off",
  },
});
