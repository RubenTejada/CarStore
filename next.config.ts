import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    localPatterns: [
      { pathname: "/uploads/**", search: "" },
      { pathname: "/lenders/**", search: "" },
      // Vistas 360 de demostración (prisma/seed.ts).
      { pathname: "/demo-360/**", search: "" },
      { pathname: "/emblems/**", search: "" },
    ],
  },
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
