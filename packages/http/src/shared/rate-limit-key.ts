import type { FastifyRequest } from "fastify";

/**
 * The rate-limit key generator for `api`.
 *
 * `api` is a BFF backend (see docs/architecture/frontend-architecture-discovery.md
 * §3): the browser never talks to it directly, `packages/web`'s own server
 * does, server-to-server. That means every request `api` ever receives —
 * from every physician, in every browser, everywhere — arrives from the
 * same handful of `web` server processes, and therefore from the same
 * small set of TCP-connection IPs (`request.ip`/`request.socket.remoteAddress`)
 * once this is deployed on Railway's private network. Keying rate limits
 * on that raw connection IP would not rate-limit per client at all — it
 * would rate-limit *all physicians combined*, since they'd all share one
 * bucket keyed on `web`'s IP. A single physician mistyping their password
 * a few times could lock out every other physician's login attempts.
 *
 * The fix is to key on the *original client* IP, which `web` is expected
 * to forward via a standard proxy header (`X-Forwarded-For` or
 * `X-Real-IP`) once it exists (Milestone 8 — not built yet). This module
 * only prepares `api` to trust and use that header; it does not implement
 * the forwarding side.
 *
 * `X-Forwarded-For` may be a comma-separated chain (each proxy appends its
 * own hop) — the first entry is the original client, per convention.
 * `X-Real-IP` is a single-value fallback some proxies use instead.
 *
 * If neither header is present (e.g. a direct request that didn't come
 * through `web` at all, including most local/dev traffic), every such
 * request falls into one shared "unforwarded" bucket rather than being
 * keyed on the raw connection IP — deliberately conservative, since
 * crediting each unforwarded request as its own independent client would
 * defeat the point of this key strategy the moment `web` is misconfigured
 * or bypassed.
 */
const UNFORWARDED_BUCKET = "unforwarded";

export function forwardedClientIp(request: FastifyRequest): string {
  const forwardedFor = request.headers["x-forwarded-for"];
  const forwardedForValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  if (forwardedForValue) {
    const firstHop = forwardedForValue.split(",")[0]?.trim();
    if (firstHop) {
      return firstHop;
    }
  }

  const realIp = request.headers["x-real-ip"];
  const realIpValue = Array.isArray(realIp) ? realIp[0] : realIp;
  if (realIpValue && realIpValue.trim().length > 0) {
    return realIpValue.trim();
  }

  return UNFORWARDED_BUCKET;
}
