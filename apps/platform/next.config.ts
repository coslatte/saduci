import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Required for the container image built from apps/platform/Dockerfile.
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/registros",
        destination: "/records/simulations",
        permanent: true,
      },
      {
        source: "/registros/simulaciones",
        destination: "/records/simulations",
        permanent: true,
      },
      {
        source: "/registros/predicciones",
        destination: "/records/predictions",
        permanent: true,
      },
      {
        source: "/registros/estadisticas",
        destination: "/records/statistics",
        permanent: true,
      },
      {
        source: "/prediction/explicaciones",
        destination: "/prediction/explanations",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
