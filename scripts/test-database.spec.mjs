/**
 * Tests de `test-database.mjs` — el guard que impide que la suite
 * DB-backed (packages/infrastructure, packages/http) escriba en la base de
 * producción. Existe porque eso pasó: hasta 2026-09-29 `pnpm run test`
 * corría contra la Postgres de producción vía el `DATABASE_URL` del `.env`
 * (docs/architecture/ROADMAP.md § Risks and Unknowns).
 *
 *   node --test scripts/test-database.spec.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolveTestDatabaseUrl } from "./test-database.mjs";

const LOCAL = "postgresql://cirugias_test:pw@localhost:5432/cirugias_test";
const PROD = "postgresql://postgres:pw@sakura.proxy.rlwy.net:35705/railway";

describe("resolveTestDatabaseUrl", () => {
  test("uses DATABASE_URL_TEST when it points at this machine", () => {
    assert.equal(resolveTestDatabaseUrl({ DATABASE_URL_TEST: LOCAL, DATABASE_URL: PROD }), LOCAL);
  });

  test("accepts 127.0.0.1 and ::1 as local too", () => {
    for (const host of ["127.0.0.1", "[::1]"]) {
      const url = `postgresql://u:p@${host}:5432/cirugias_test`;
      assert.equal(resolveTestDatabaseUrl({ DATABASE_URL_TEST: url }), url);
    }
  });

  test("fails — never falls back to DATABASE_URL — when DATABASE_URL_TEST is missing", () => {
    assert.throws(
      () => resolveTestDatabaseUrl({ DATABASE_URL: PROD }),
      /DATABASE_URL_TEST is not set/,
    );
  });

  test("refuses a remote host (the production proxy included)", () => {
    assert.throws(
      () => resolveTestDatabaseUrl({ DATABASE_URL_TEST: PROD }),
      /not a local database/,
    );
  });

  test("refuses a test URL identical to DATABASE_URL, even with the remote opt-in", () => {
    assert.throws(
      () =>
        resolveTestDatabaseUrl({
          DATABASE_URL_TEST: PROD,
          DATABASE_URL: PROD,
          TEST_DATABASE_ALLOW_REMOTE: "1",
        }),
      /same database as DATABASE_URL/,
    );
  });

  test("allows a dedicated remote test database only with the explicit opt-in", () => {
    const remoteTest = "postgresql://u:p@test-db.example.net:5432/cirugias_test";
    assert.equal(
      resolveTestDatabaseUrl({
        DATABASE_URL_TEST: remoteTest,
        DATABASE_URL: PROD,
        TEST_DATABASE_ALLOW_REMOTE: "1",
      }),
      remoteTest,
    );
  });

  test("rejects a value that isn't a postgres URL", () => {
    assert.throws(() => resolveTestDatabaseUrl({ DATABASE_URL_TEST: "localhost" }), /not a valid/);
  });
});
