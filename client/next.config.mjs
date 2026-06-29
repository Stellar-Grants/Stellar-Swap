/** @type {import('next').NextConfig} */

// Keep the Content-Security-Policy connect-src in sync with the API base URL
// (see NEXT_PUBLIC_API_BASE_URL) so the frontend can always reach the backend.
const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'https://nexus-swap-server.vercel.app';

const contentSecurityPolicy = [
    "default-src 'self'",
    // 'unsafe-inline'/'unsafe-eval' are required by Next.js's runtime and dev mode.
    // A nonce-based CSP (via middleware) is the documented follow-up hardening step.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    // Allow connections to Stellar testnet, Horizon, Friendbot, and our own API.
    `connect-src 'self' https://soroban-testnet.stellar.org https://horizon-testnet.stellar.org https://friendbot.stellar.org ${apiBaseUrl}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
].join('; ');

const nextConfig = {
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    // Prevent HTTPS downgrade attacks (ignored by browsers over plain HTTP).
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    },
                    // Prevent clickjacking.
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    // Prevent MIME type sniffing.
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    // Prevent referrer leakage (secret keys in URLs would leak via Referer).
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    // Restrict browser APIs — no camera, mic, payment UI, geolocation.
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), payment=(), geolocation=()',
                    },
                    // Primary XSS defense.
                    {
                        key: 'Content-Security-Policy',
                        value: contentSecurityPolicy,
                    },
                ],
            },
        ];
    },
    webpack: config => {
        config.externals.push('pino-pretty', 'lokijs', 'encoding')
        return config
    },
}

export default nextConfig;
