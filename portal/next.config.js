/** @type {import('next').NextConfig} */
module.exports = {
  // Two ways to deploy (see README):
  //  - Two Vercel projects (Hofund's setup): leave PORTAL_BASE_PATH unset; the portal has its own address.
  //  - One Vercel project (vercel.json routes /portal/* here): set PORTAL_BASE_PATH=/portal.
  basePath: process.env.PORTAL_BASE_PATH || undefined,
  transpilePackages: ['@horizon/ui', '@horizon/outreach'],
  experimental: { serverActions: { bodySizeLimit: '1mb' } },
};
