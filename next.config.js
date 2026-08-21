/** @type {import('next').NextConfig} */

// Everything under /api/v1 is served by the Go backend. Proxying it through
// Next instead of calling :8080 from the browser keeps the session cookie
// same-origin, so it survives without CORS credentials or a SameSite=None
// cookie. In production this points at the deployed API.
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      // beforeFiles so the proxy always wins, even if a route file is added
      // under app/api/v1 by mistake.
      beforeFiles: [
        {
          source: '/api/v1/:path*',
          destination: `${BACKEND_URL}/api/v1/:path*`,
        },
      ],
    };
  },
};

module.exports = nextConfig;
