import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/solanaCreateIntentCors',
        destination: 'https://us-central1-studio-2714959067-22ea0.cloudfunctions.net/solanaCreateIntentCors',
      },
      {
        source: '/api/solanaConfirmCors',
        destination: 'https://us-central1-studio-2714959067-22ea0.cloudfunctions.net/solanaConfirmCors',
      },
    ]
  },
};

export default nextConfig;
