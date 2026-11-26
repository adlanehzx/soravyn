import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function markdownFilesIn(relativeDir: string): string[] {
  return readdirSync(join(repoRoot, relativeDir))
    .filter((name) => name.endsWith(".md"))
    .map((name) => join(relativeDir, name));
}

const documents = [
  "README.md",
  "CONTRIBUTING.md",
  "AGENTS.md",
  ...markdownFilesIn("doc"),
];

function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

/** Relative targets of inline Markdown links, without anchors or queries. */
function relativeLinkTargets(markdown: string): string[] {
  const targets: string[] = [];
  for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const raw = match[1];
    if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(raw)) continue;
    const target = raw.split("#")[0].split("?")[0];
    if (target) targets.push(target);
  }
  return targets;
}

describe("documentation integrity", () => {
  it.each(documents)("%s only links to files that exist", (document) => {
    const baseDir = dirname(join(repoRoot, document));
    const missing = relativeLinkTargets(read(document)).filter(
      (target) => !existsSync(resolve(baseDir, target))
    );
    expect(missing, `broken links in ${document}`).toEqual([]);
  });

  it.each(documents)("%s only mentions doc/ files that exist", (document) => {
    const mentioned = [...read(document).matchAll(/\bdoc\/([A-Za-z0-9_.-]+\.md)\b/g)].map(
      (match) => match[1]
    );
    const missing = mentioned.filter(
      (name) => !existsSync(join(repoRoot, "doc", name))
    );
    expect(missing, `missing doc/ files mentioned in ${document}`).toEqual([]);
  });

  it("keeps the third-party licence notices that the docs refer to", () => {
    expect(existsSync(join(repoRoot, "LICENSE"))).toBe(true);
    expect(existsSync(join(repoRoot, "THIRD_PARTY_NOTICES.md"))).toBe(true);
  });
});
