import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    output: "export",
    basePath: process.env.NODE_ENV === "production" ? "/supplier" : "",
    assetPrefix: process.env.NODE_ENV === "production" ? "/supplier/" : "",
    trailingSlash: true,
    images: {
        unoptimized: true
    }
}

export default nextConfig
