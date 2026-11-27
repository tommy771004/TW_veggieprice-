import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  // Resolve metadata before the body for every user agent (Next 14 behaviour)
  // instead of streaming it. Streamed metadata lands in the RSC payload wherever
  // generateMetadata happens to finish, so an ISR regeneration with unchanged data
  // could still emit different bytes (warm vs cold memo, bot vs browser request) and
  // be billed as an ISR write. Pages here are ISR-cached, so the blocking cost is
  // only paid during regeneration.
  htmlLimitedBots: /.*/,
  // /api/og reads its watercolor background from disk at runtime.
  outputFileTracingIncludes: {
    '/api/og': ['./src/app/api/og/background.jpg'],
  },

  async headers() {
    return [
      {
        // Site-wide hardening (PageSpeed best-practices). Nothing embeds this
        // site in a frame, and every external link opens with noopener, so
        // frame-ancestors / XFO and a same-origin COOP don't break anything.
        // A full script-src CSP is deliberately left out: GA and affiliate
        // trackers would need a nonce pipeline for little gain here.
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // The filename is not hashed: the ?v= query (written by
        // scripts/sync-icon-font.mjs) changes whenever the subset is rebuilt.
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Atlas files are replaced in place now and then, so cache for a week
        // rather than forever.
        source: '/images/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
      },
      {
        source: '/favicon.ico',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
      },
      {
        // Short on purpose: a fixed worker reaches users within an hour.
        // ServiceWorkerRegistrar registers with updateViaCache: 'all'.
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }],
      },
      {
        source: '/og-image.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
      {
        // Default for price APIs (route handlers may set longer TTLs on the response).
        // Note: more specific rules below override this for hot seafood paths.
        source: '/api/prices/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=120, stale-while-revalidate=300' }],
      },
      {
        // Align config-level headers with route handlers so CDN/s-maxage is not
        // accidentally shortened by the catch-all above.
        source: '/api/prices/overview',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=120, stale-while-revalidate=300' }],
      },
      {
        // Seafood data is backed by a daily local snapshot and is parsed once
        // per hour in the server data layer, so let the CDN keep it equally long.
        source: '/api/prices/overview',
        has: [{ type: 'query', key: 'category', value: 'seafood' }],
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=7200' }],
      },
      {
        source: '/api/prices/movers',
        has: [{ type: 'query', key: 'category', value: 'seafood' }],
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=7200' }],
      },
    ]
  },
}

export default nextConfig
