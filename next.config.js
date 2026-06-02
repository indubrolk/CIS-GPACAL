/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // pdfjs-dist uses canvas which is not available on the server
    if (isServer) {
      config.externals.push("canvas");
    }
    // Prevent webpack from trying to bundle pdfjs-dist worker
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
