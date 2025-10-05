import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  }
});

const nextConfig = {
  reactStrictMode: true,
  
  images: {
    domains: ['eonet.gsfc.nasa.gov', 'firms.modaps.eosdis.nasa.gov'],
    unoptimized: false,
  },

  env: {
    NEXT_PUBLIC_NASA_API_KEY: process.env.NASA_API_KEY || 'DEMO_KEY',
  },
};

export default withPWA(nextConfig);