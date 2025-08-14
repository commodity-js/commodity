import pluginReact from "eslint-plugin-react"
import globals from "globals"
import { defineConfig } from "eslint/config"
import { FlatCompat } from "@eslint/eslintrc"
import baseConfig from "./eslint.config.js"

const compat = new FlatCompat({
    baseDirectory: import.meta.url
})

export default defineConfig([
    ...baseConfig,
    {
        files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
        languageOptions: { globals: globals.browser }
    },
    pluginReact.configs.flat.recommended,
    ...compat.extends("next/core-web-vitals", "next/typescript"),
    {
        files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
        languageOptions: { globals: globals.browser }
    }
])
