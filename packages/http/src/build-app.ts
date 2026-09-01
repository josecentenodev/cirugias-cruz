import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { AppDeps } from "./deps.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerCoreLoopRoutes } from "./routes/core-loop.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerResidentRoutes } from "./routes/resident.js";
import { forwardedClientIp } from "./shared/rate-limit-key.js";

/**
 * Assembles the Fastify app. Nothing Fastify-shaped is exported from
 * here into Application/Domain — this file is the boundary: it imports
 * Application operations and translates HTTP <-> their plain
 * input/output shapes.
 */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    // Structured logging (Milestone 7). Pino is Fastify's built-in
    // logger; "info" is a reasonable production default (errors, request
    // summaries) without the volume of "debug". Quieter than "info" in
    // production would hide operational signal; noisier ("debug") is
    // appropriate only for local troubleshooting, not the default.
    logger: { level: process.env.LOG_LEVEL ?? "info" },
  });

  await app.register(cookie);
  await app.register(helmet);
  // `global: false`: rate limiting is opt-in per route (via each route's
  // `config.rateLimit`), not applied to every route by default — see
  // Milestone 7's scope (POST /sessions and POST /physicians only).
  // `keyGenerator` is the load-bearing choice here: see
  // src/shared/rate-limit-key.ts for why this must be the forwarded
  // client IP, not the raw TCP connection IP `api` sees.
  await app.register(rateLimit, {
    global: false,
    keyGenerator: forwardedClientIp,
  });

  registerHealthRoute(app);
  registerAuthRoutes(app, deps);
  registerCoreLoopRoutes(app, deps);
  registerResidentRoutes(app, deps);

  return app;
}
