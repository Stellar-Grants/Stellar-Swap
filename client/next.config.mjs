/** @type {import('next').NextConfig} */

// Content-Security-Policy is set per-request in middleware.ts (nonce-based script-src);
// the static headers below don't need a fresh value per request.
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
