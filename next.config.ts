import type { NextConfig } from "next";

// Content-Security-Policy: difesa in profondità contro XSS/clickjacking.
// Applicata SOLO in produzione: in sviluppo l'HMR di Next usa eval + websocket
// e verrebbe bloccato. Allowlist esplicita per Stripe (js/api/hooks), immagini
// esterne (og:image news/KB, avatar Google), embed YouTube (nocookie).
// NB: 'unsafe-inline' su script è necessario perché l'App Router inietta script
// di hydration inline e non è configurata un'infrastruttura di nonce.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com https://r.stripe.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.youtube-nocookie.com",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

// Header di sicurezza applicati a tutte le risposte.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
