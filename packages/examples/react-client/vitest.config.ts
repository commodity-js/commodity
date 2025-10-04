import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src")
        }
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./tests/setup.ts"],
        include: ["**/*.test.tsx"],
        typecheck: {
            include: ["**/*.test.tsx", "**/test-d.tsx"],
            tsconfig: "./tsconfig.json"
        },
        exclude: ["**/node_modules/**", "**/dist/**"]
    }
})
