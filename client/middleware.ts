import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Keep in sync with NEXT_PUBLIC_API_BASE_URL so the CSP always allows the configured backend.
const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'https://nexus-swap-server.vercel.app';

export function middleware(request: NextRequest) {
    // A fresh nonce per request lets script-src drop 'unsafe-inline'/'unsafe-eval'
    // in production while still allowing Next.js's own framework scripts to run.
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
    const isDev = process.env.NODE_ENV === 'development';

    const contentSecurityPolicy = [
        "default-src 'self'",
        // 'wasm-unsafe-eval' allows WebAssembly.compile, which @stellar/stellar-sdk's
        // contract client uses for contract-spec introspection (no JS eval permitted).
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        `connect-src 'self' https://soroban-testnet.stellar.org https://horizon-testnet.stellar.org https://friendbot.stellar.org ${apiBaseUrl}`,
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
    ].join('; ');

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);

    const response = NextResponse.next({
        request: { headers: requestHeaders },
    });
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
