import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import type { AppDeps } from "./deps.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerCoreLoopRoutes } from "./routes/core-loop.js";

/**
 * Assembles the Fastify app. Nothing Fastify-shaped is exported from
 * here into Application/Domain — this file is the boundary: it imports
 * Application operations and translates HTTP <-> their plain
 * input/output shapes.
 */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cookie);

  registerAuthRoutes(app, deps);
  registerCoreLoopRoutes(app, deps);

  return app;
}
