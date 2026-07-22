/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'file.kie.ai' },
      { protocol: 'https', hostname: '**.kie.ai' },
    ],
  },
};

module.exports = nextConfig;
