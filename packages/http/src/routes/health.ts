import type { FastifyInstance } from "fastify";

/**
 * `GET /health` — unauthenticated, no rate limit, no schema validation
 * needed (no body/params). Used as the Railway health check
 * (`deploy.healthcheckPath`) for `api` — see docs/architecture/ROADMAP.md
 * Milestone 7.
 */
export function registerHealthRoute(app: FastifyInstance): void {
  app.get("/health", () => {
    return { status: "ok" };
  });
}
