import { defineConfig } from "tsup"

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    minify: true,
    treeshake: true,
    sourcemap: true,
    splitting: false,
    external: ["memoize"],
    // Additional optimizations
    minifyIdentifiers: true,
    minifyWhitespace: true,
    minifySyntax: true,
    target: "es2020",
    bundle: true
})
