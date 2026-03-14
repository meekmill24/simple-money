import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    // Disable standalone mode for Vercel preview compatibility
    // Enable 'standalone' only for Docker/self-hosted deployments
};

export default nextConfig;
