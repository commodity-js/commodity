import js from "@eslint/js"
import tseslint from "typescript-eslint"
import eslintConfigPrettier from "eslint-config-prettier/flat"
import { defineConfig } from "eslint/config"

export default defineConfig([
    // TypeScript specific config
    ...tseslint.configs.recommended,
    ...tseslint.configs.strict,
    {
        files: ["**/*.{ts,tsx}"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-empty-function": "error"
        }
    },
    // JavaScript specific config
    {
        files: ["**/*.{js,mjs,cjs,jsx}"],
        plugins: {
            js
        },
        extends: ["js/recommended"],
        rules: {
            "require-atomic-updates": "error",
            "no-await-in-loop": "error",
            "no-constant-condition": "off",
            "no-redeclare": "off",
            "no-unused-vars": "off"
        }
    },
    // Prettier config
    eslintConfigPrettier
])
