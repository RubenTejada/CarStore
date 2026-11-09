import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App Service ejecuta el servidor standalone (.github/workflows/deploy.yml).
  output: "standalone",
  // Fuentes de los anuncios para redes (src/lib/social/fonts.ts): se leen del disco al generar la imagen.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@fontsource/*/files/*-latin-{400,500,700,800}-normal.woff"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    localPatterns: [
      { pathname: "/uploads/**", search: "" },
      { pathname: "/lenders/**", search: "" },
      // Vistas 360 de demostración (prisma/seed.ts).
      { pathname: "/demo-360/**", search: "" },
      { pathname: "/emblems/**", search: "" },
      { pathname: "/registration/**", search: "" },
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
