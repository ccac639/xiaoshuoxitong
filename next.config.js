/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // 路径别名
  webpack: (config) => {
    config.resolve.alias['@'] = require('path').join(__dirname, 'src');
    return config;
  },
}

module.exports = nextConfig;
