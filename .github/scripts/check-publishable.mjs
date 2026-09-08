#!/usr/bin/env node
// Release preflight: fail BEFORE `changeset publish` runs if any publishable
// workspace package cannot actually be published or installed.
//
// `changeset publish` publishes packages one at a time and does not roll back.
// When package number 32 fails, the previous 31 are already live and immutable,
// so the release lands half-applied and the only way out is a fresh patch
// release. Both checks below exist to turn that mid-publish failure into a
// cheap pre-publish failure.
//
// ---------------------------------------------------------------------------
// Check 1 — first publish of a new package (the v3.8.8 failure)
// ---------------------------------------------------------------------------
// This repo publishes with npm trusted publishing (OIDC), see the `id-token:
// write` permission and the notes in .github/workflows/publish_release.yml.
// A trusted publisher is configured per package, on that package's settings
// page on npmjs.com — which means the package has to already exist before the
// trusted publisher can be attached to it. A package that has never been
// published therefore has no trusted publisher, npm rejects the OIDC exchange,
// and the npm CLI reports the failure as a generic `ENEEDAUTH` that looks like
// a broken token rather than a missing configuration (npm/cli#9088).
//
// `changeset publish` always attempts a brand-new package, because its local
// version is by definition not on the registry yet. So adding a new publishable
// package to the workspace silently arms a release failure.
//
// The fix is a one-time manual bootstrap publish, after which CI owns every
// subsequent release of that package. This check makes that requirement loud
// and early instead of discovering it half way through a release.
//
// ---------------------------------------------------------------------------
// Check 2 — private package leaked into a published package's runtime deps
// ---------------------------------------------------------------------------
// A `private: true` workspace package is never published. If a *publishable*
// package lists one in dependencies / peerDependencies / optionalDependencies,
// the published tarball is installable only inside this monorepo: every
// consumer gets E404 on the private name. npm does not catch this at publish
// time, because the dependency is only resolved when someone installs.

import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = process.cwd();
const REGISTRY = process.env.npm_config_registry || "https://registry.npmjs.org";

// Runtime sections only. A devDependency is not installed by consumers, so a
// private package there is harmless.
const RUNTIME_SECTIONS = [
	"dependencies",
	"peerDependencies",
	"optionalDependencies",
];

// Known, accepted private-dependency leaks. Each entry is uninstallable from
// the public registry today and is grandfathered in so this check can be
// enforced for everything else; removing an entry is the fix, not the goal.
//
//   @prosopo/fingerprintjs — private vendored fork consumed by
//   @prosopo/fingerprint, which reaches @prosopo/procaptcha* and
//   @prosopo/account. Predates this check (@prosopo/fingerprint@2.7.42 on the
//   registry already carries it). Browser consumers load the prebuilt
//   procaptcha bundle rather than installing from npm, so this has gone
//   unnoticed.
const ALLOWED_PRIVATE_DEPS = new Set(["@prosopo/fingerprintjs"]);

const IGNORE_DIRS = new Set([
	"node_modules",
	".git",
	"dist",
	"build",
	".next",
	".astro",
	".turbo",
	".nx",
	"coverage",
	".cache",
]);

// Git submodules are separate repositories that publish on their own schedule.
function loadSubmodulePaths() {
	const paths = new Set();
	try {
		const txt = readFileSync(join(ROOT, ".gitmodules"), "utf8");
		for (const m of txt.matchAll(/^\s*path\s*=\s*(.+)\s*$/gm)) {
			paths.add(resolve(ROOT, m[1].trim()));
		}
	} catch {
		/* no submodules */
	}
	return paths;
}
const SUBMODULE_PATHS = loadSubmodulePaths();

/** @typedef {{name: string, version: string, private: boolean, file: string, json: Record<string, unknown>}} Pkg */

/** @returns {Pkg[]} */
function findPackages(dir, out = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (IGNORE_DIRS.has(entry.name)) continue;
			if (SUBMODULE_PATHS.has(resolve(full))) continue;
			findPackages(full, out);
		} else if (entry.name === "package.json") {
			try {
				const json = JSON.parse(readFileSync(full, "utf8"));
				if (!json.name) continue;
				out.push({
					name: json.name,
					version: json.version,
					private: json.private === true,
					file: full,
					json,
				});
			} catch {
				/* checked by check-pinned-versions.mjs */
			}
		}
	}
	return out;
}

/** Does the package exist on the registry at all (any version)? */
async function existsOnRegistry(name) {
	const url = `${REGISTRY.replace(/\/$/, "")}/${name.replace("/", "%2F")}`;
	const res = await fetch(url, { method: "GET", headers: { accept: "*/*" } });
	if (res.status === 404) return false;
	if (!res.ok) {
		throw new Error(`registry returned ${res.status} for ${name}`);
	}
	return true;
}

const packages = findPackages(ROOT);
const byName = new Map(packages.map((p) => [p.name, p]));
const publishable = packages.filter((p) => !p.private);

// --- Check 2 (local, no network) -------------------------------------------
const leaks = [];
for (const pkg of publishable) {
	for (const section of RUNTIME_SECTIONS) {
		for (const dep of Object.keys(pkg.json[section] || {})) {
			const target = byName.get(dep);
			if (!target?.private) continue;
			if (ALLOWED_PRIVATE_DEPS.has(dep)) continue;
			leaks.push(
				`${relative(ROOT, pkg.file)}  ${section} > "${dep}" is a private workspace package and is never published`,
			);
		}
	}
}

// --- Check 1 (network) ------------------------------------------------------
// Bounded concurrency so a 50-package workspace does not open 50 sockets.
const CONCURRENCY = 8;
const unpublished = [];
let cursor = 0;
async function worker() {
	while (cursor < publishable.length) {
		const pkg = publishable[cursor++];
		if (!(await existsOnRegistry(pkg.name))) {
			unpublished.push(pkg);
		}
	}
}
await Promise.all(
	Array.from({ length: Math.min(CONCURRENCY, publishable.length) }, worker),
);

// --- Report -----------------------------------------------------------------
let failed = false;

if (unpublished.length > 0) {
	failed = true;
	console.error(
		`✖ ${unpublished.length} package(s) have never been published, so trusted publishing (OIDC) cannot publish them:\n`,
	);
	for (const p of unpublished) {
		console.error(`  ${p.name}@${p.version}  (${relative(ROOT, p.file)})`);
	}
	console.error(
		"\nA trusted publisher is attached to an existing package on npmjs.com, so the" +
			"\nfirst version has to be published by hand once. `changeset publish` would" +
			"\notherwise fail on these with a misleading ENEEDAUTH part way through the" +
			"\nrelease, after the earlier packages are already live and immutable." +
			"\n\nFor each package above, from a machine logged in to npm as a @prosopo" +
			"\npublisher:" +
			"\n  npm run build:all:tsc && npm run build:all && npm run build:all:cjs" +
			"\n  cd <package dir> && npm publish --access public" +
			"\nthen on https://www.npmjs.com/package/<name>/access add a GitHub Actions" +
			"\ntrusted publisher for prosopo/captcha with workflow publish_release.yml," +
			"\nand re-run this release.",
	);
}

if (leaks.length > 0) {
	if (failed) console.error("");
	failed = true;
	console.error(
		`✖ ${leaks.length} publishable package(s) depend on a private workspace package:\n`,
	);
	for (const l of leaks) console.error(`  ${l}`);
	console.error(
		"\nThese publish fine but are uninstallable: consumers get E404 on the private" +
			"\nname. Either publish the dependency, move it to devDependencies if it is" +
			"\nbundled into dist at build time, or inline it.",
	);
}

if (failed) {
	console.error(
		"\nRun `node .github/scripts/check-publishable.mjs` locally to reproduce.",
	);
	process.exit(1);
}

console.log(
	`✔ ${publishable.length} publishable package(s) exist on ${REGISTRY} and declare no unpublished private dependencies.`,
);
