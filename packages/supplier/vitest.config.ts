import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["**/*.test.ts", "**/*.spec.ts"],
        typecheck: {
            include: ["**/*.test.ts", "**/*.spec.ts", "**/test-d.ts"],
            tsconfig: "./tsconfig.json"
        },
        exclude: ["**/node_modules/**", "**/dist/**"]
    }
})
