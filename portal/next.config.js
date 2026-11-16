/** @type {import('next').NextConfig} */
module.exports = {
  // Served at /portal: on Vercel, vercel.json routes /portal/* to this app; the operator app has /.
  basePath: '/portal',
  transpilePackages: ['@horizon/ui', '@horizon/outreach'],
  experimental: { serverActions: { bodySizeLimit: '1mb' } },
};
