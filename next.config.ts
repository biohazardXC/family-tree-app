import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libsql ships native bindings — keep it out of the bundler
  serverExternalPackages: ["@libsql/client", "libsql"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  // allow the sandbox preview proxy origin during development
  allowedDevOrigins: ["*.e2b.app"],
};

export default nextConfig;
