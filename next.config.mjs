/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      // Windows note: Next's on-disk webpack cache intermittently fails to
      // rename its *.pack.gz files (antivirus / OneDrive / cloud-sync locking,
      // or two dev servers writing at once). A corrupted cache then makes SWC
      // throw bogus "Unexpected token `div`" errors on valid .tsx files.
      // Using an in-memory cache in dev sidesteps the disk entirely.
      config.cache = { type: "memory" };
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.next/**"],
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        // Ensure the service worker is always served fresh and can control the whole scope.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
