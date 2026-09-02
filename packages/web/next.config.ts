import type { NextConfig } from "next";

/**
 * No `env`/`publicRuntimeConfig` block exposing `API_BASE_URL` to the
 * client on purpose — it stays a server-only environment variable, read
 * directly via `process.env` inside `lib/api-client.ts`. Never renamed to
 * `NEXT_PUBLIC_API_BASE_URL`: that prefix inlines a value into the
 * client-side bundle, which would put `api`'s private-network address
 * (and the fact that it exists at all) into the browser — the one thing
 * the BFF pattern exists to avoid. See
 * docs/architecture/milestone-8-design.md §1/§11.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Don't advertise the framework in every response — a minor
  // fingerprinting surface with no upside. Actual security headers
  // (CSP, etc.) are set per-request in `src/proxy.ts`
  // (`lib/security-headers.ts`), not here — `headers()` in this file
  // can't generate the per-request nonce a strict CSP needs.
  poweredByHeader: false,
};

export default nextConfig;
