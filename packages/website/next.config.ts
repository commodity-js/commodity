import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    output: "export",
    basePath: process.env.NODE_ENV === "production" ? "/solvency" : "",
    assetPrefix: process.env.NODE_ENV === "production" ? "/solvency/" : "",
    trailingSlash: true,
    images: {
        unoptimized: true
    }
}

export default nextConfig
