/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: ['@horizon/ui', '@horizon/outreach'],
  experimental: { serverActions: { bodySizeLimit: '1mb' } },
};
