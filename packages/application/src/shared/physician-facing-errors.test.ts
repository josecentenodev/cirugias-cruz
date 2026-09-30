import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Every `DomainError` / `NotFoundError` message reaches the physician
 * verbatim (`packages/http/src/shared/errors.ts` → web's `runFormAction`,
 * which never rewords). So the message literals thrown in Domain and
 * Application are UI copy, and must never leak implementation language:
 * type names (`CustomField`), field names (`dateOfBirth`), enum constants
 * (`DRAFT`), record ids, ISO timestamps, ADR references or "tenant".
 *
 * This scans the source of both packages so a new throw site can't
 * reintroduce the problem silently.
 */
const packagesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const scannedRoots = [join(packagesDir, "domain", "src"), join(packagesDir, "application", "src")];

/** Upper-case words that are legitimately physician vocabulary. */
const ALLOWED_ACRONYMS = new Set(["DNI"]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return path.endsWith(".ts") && !path.endsWith(".test.ts") ? [path] : [];
  });
}

interface ThrownMessage {
  file: string;
  literal: string;
}

/** The first argument of every `new DomainError(...)` / `new NotFoundError(...)`, when it's a string literal or a message constant. */
function thrownMessages(): ThrownMessage[] {
  const found: ThrownMessage[] = [];
  const throwSite = /new (?:DomainError|NotFoundError)\(\s*(["`])((?:\\.|(?!\1)[\s\S])*)\1/g;
  const messageConstant = /const [A-Z_]*MESSAGE\s*=\s*(["`])((?:\\.|(?!\1)[\s\S])*)\1/g;
  for (const file of scannedRoots.flatMap(sourceFiles)) {
    const source = readFileSync(file, "utf8");
    for (const pattern of [throwSite, messageConstant]) {
      for (const match of source.matchAll(pattern)) {
        found.push({ file, literal: match[2] ?? "" });
      }
    }
  }
  return found;
}

function jargonIn(literal: string): string[] {
  const problems: string[] = [];
  for (const interpolation of literal.matchAll(/\$\{([^}]*)\}/g)) {
    const expression = interpolation[1] ?? "";
    if (/(?:^|\.)\w*Id$|\.id$/.test(expression))
      problems.push(`interpolates a record id: ${expression}`);
    if (/toISOString/.test(expression))
      problems.push(`interpolates a raw ISO timestamp: ${expression}`);
  }
  const text = literal.replace(/\$\{[^}]*\}/g, "");
  for (const word of text.match(/\b[A-Za-z_]+\b/g) ?? []) {
    if (/^[A-Z][a-z]+[A-Z]/.test(word)) problems.push(`type name: ${word}`);
    else if (/^[a-z]+[A-Z]/.test(word)) problems.push(`code identifier: ${word}`);
    else if (/^[A-Z][A-Z_]+$/.test(word) && !ALLOWED_ACRONYMS.has(word))
      problems.push(`enum constant: ${word}`);
  }
  if (/\bADR\b/.test(text)) problems.push("ADR reference");
  if (/\btenant\b/i.test(text)) problems.push('internal term "tenant"');
  return problems;
}

describe("physician-facing error messages", () => {
  const messages = thrownMessages();

  it("finds the throw sites it is meant to guard", () => {
    expect(messages.length).toBeGreaterThan(50);
  });

  it("never leak implementation language", () => {
    const offenders = messages.flatMap(({ file, literal }) =>
      jargonIn(literal).map(
        (problem) => `${file.slice(packagesDir.length)}: "${literal}" — ${problem}`,
      ),
    );
    expect(offenders).toEqual([]);
  });

  it("flags the kind of message that once reached the UI", () => {
    expect(jargonIn('CustomField "${definition.name}" must be one of: 1, 2')).toEqual([
      "type name: CustomField",
    ]);
    expect(jargonIn("Only a DRAFT research study can move to IN_PROGRESS")).toEqual([
      "enum constant: DRAFT",
      "enum constant: IN_PROGRESS",
    ]);
    expect(jargonIn("Patient ${input.patientId} was not found")).toEqual([
      "interpolates a record id: input.patientId",
    ]);
  });
});
