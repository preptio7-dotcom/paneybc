/** @type {import('next').NextConfig} */
const remotePatterns = [
  {
    protocol: 'https',
    hostname: 'api.dicebear.com',
  },
  {
    protocol: 'https',
    hostname: 'api.multiavatar.com',
  },
  {
    protocol: 'https',
    hostname: 'models.readyplayer.me',
  },
  {
    protocol: 'https',
    hostname: '**.r2.dev',
  },
  {
    protocol: 'https',
    hostname: '**.r2.cloudflarestorage.com',
  },
]

const r2PublicUrl = process.env.R2_PUBLIC_URL || process.env.R2_PUBLIC_BASE_URL
if (r2PublicUrl) {
  try {
    const parsed = new URL(r2PublicUrl)
    remotePatterns.push({
      protocol: parsed.protocol.replace(':', ''),
      hostname: parsed.hostname,
    })
  } catch {
    // Ignore invalid URL format, fallback patterns above still apply.
  }
}

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns,
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
