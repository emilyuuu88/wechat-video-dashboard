import type { NextConfig } from "next";

const isNetlifyStaticExport = process.env.NETLIFY_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(isNetlifyStaticExport
    ? {
        output: "export",
        trailingSlash: true,
        typescript: { ignoreBuildErrors: true },
      }
    : {}),
};

export default nextConfig;
