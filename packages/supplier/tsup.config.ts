import { defineConfig } from "tsup"

export default defineConfig([
    {
        entry: ["src/index.ts"],
        format: ["esm", "cjs"],
        dts: true,
        clean: true,
        treeshake: true,
        sourcemap: true,
        splitting: false,
        external: ["memoize"],
        // Additional optimizations
        target: "es2020",
        bundle: true
    }
])
