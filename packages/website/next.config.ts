import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NODE_ENV === "production" ? "/scarcity" : "",
  assetPrefix: process.env.NODE_ENV === "production" ? "/scarcity/" : "",
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
