import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Hide / disable Next.js development indicator overlay toolbar */
  devIndicators: false,

  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
