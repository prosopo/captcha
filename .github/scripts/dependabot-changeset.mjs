// Writes a patch changeset for the versioned workspace packages whose package.json
// changed in a Dependabot PR, so the `changesets` check passes. Invoked by
// .github/workflows/dependabot-changeset.yml — see that file for the why.
//
// No-op (writes nothing) when only the root package.json, private packages, or
// non-package files (e.g. github-actions bumps) changed, because the `changesets`
// check does not require a changeset in those cases.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const baseRef = process.env.BASE_REF;
const prNumber = process.env.PR_NUMBER;
const prTitle = process.env.PR_TITLE ?? "dependabot dependency update";

if (!baseRef || !prNumber) {
	throw new Error("BASE_REF and PR_NUMBER must be set");
}

const git = (...args) =>
	execFileSync("git", args, { encoding: "utf8" }).trim();

// Files introduced by this PR relative to the merge base with the target branch.
const changed = git(
	"diff",
	"--name-only",
	`origin/${baseRef}...HEAD`,
	"--",
	"package.json",
	"**/package.json",
)
	.split("\n")
	.map((line) => line.trim())
	.filter(Boolean);

const packages = [];
for (const path of changed) {
	// Skip the repo root: it is private (devDependency bumps there need no changeset).
	if (path === "package.json") continue;
	if (!existsSync(path)) continue; // deleted package.json
	let pkg;
	try {
		pkg = JSON.parse(readFileSync(path, "utf8"));
	} catch {
		continue;
	}
	// changesets ignores private and unnamed packages, so we must too.
	if (pkg.private === true || typeof pkg.name !== "string") continue;
	packages.push(pkg.name);
}

const unique = [...new Set(packages)].sort();

if (unique.length === 0) {
	console.log("No versioned package changed; no changeset needed.");
	process.exit(0);
}

const frontmatter = unique.map((name) => `"${name}": patch`).join("\n");
// Single-line summary; collapse any newlines from the PR title.
const summary = prTitle.replace(/\s+/g, " ").trim();

const contents = `---\n${frontmatter}\n---\n\n${summary}\n`;

// Deterministic filename per PR so repeated synchronize runs overwrite rather than pile up.
const file = join(".changeset", `dependabot-${prNumber}.md`);
writeFileSync(file, contents);

console.log(`Wrote ${file} for: ${unique.join(", ")}`);
