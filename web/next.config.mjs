/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // WalletConnect/pino pulls in optional deps (pino-pretty) and node-only
    // modules that aren't needed in the browser bundle. Mark them external so
    // they don't break the build or bloat/crash the client.
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
    };
    return config;
  },
};

export default nextConfig;
