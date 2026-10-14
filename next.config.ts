import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker builds set NEXT_OUTPUT=standalone for a small self-contained server bundle.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
};

export default nextConfig;
