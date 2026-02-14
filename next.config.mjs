/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  productionBrowserSourceMaps: false,
  webpack: (config, { dev }) => {
    if (dev) {
      config.devtool = false
    }
    return config
  },
 
}

export default nextConfig
