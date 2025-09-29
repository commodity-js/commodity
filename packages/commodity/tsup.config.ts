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
        // Additional optimizations
        target: "es2020",
        bundle: true,
        minifyWhitespace: true,
        minifySyntax: true
    }
])
