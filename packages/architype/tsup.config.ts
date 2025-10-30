import { defineConfig } from "tsup"

export default defineConfig([
    {
        entry: ["src/index.ts"],
        format: ["esm", "cjs"],
        dts: true,
        outDir: "dist",
        clean: true,
        treeshake: true,
        sourcemap: true,
        // Additional optimizations
        target: "es2020",
        bundle: true
    }
])
