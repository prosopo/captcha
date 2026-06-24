#!/usr/bin/env node
// One-shot helper used to introduce exact pinning: rewrites every floating
// (^, ~, range, *, latest) specifier in dependencies/devDependencies/
// optionalDependencies to the exact version that package-lock.json already
// resolved it to. Because the lockfile is the source of truth for `npm ci`,
// this does NOT change what gets installed — it only makes package.json declare
// the version explicitly. peerDependencies are left untouched.
//
// Resolution: for a workspace at dir D depending on N, the installed version is
// the lockfile `packages` entry nearest to D walking up node_modules dirs, then
// the hoisted root node_modules/N. This mirrors Node's module resolution.

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = process.cwd();

// Skip git submodule working trees (separate repos, pinned in their own PRs).
function loadSubmodulePaths() {
	const paths = new Set();
	try {
		const txt = readFileSync(join(ROOT, ".gitmodules"), "utf8");
		for (const m of txt.matchAll(/^\s*path\s*=\s*(.+)\s*$/gm))
			paths.add(resolve(ROOT, m[1].trim()));
	} catch {}
	return paths;
}
const SUBMODULE_PATHS = loadSubmodulePaths();
const ENFORCED_SECTIONS = new Set([
	"dependencies",
	"devDependencies",
	"optionalDependencies",
]);
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
const EXACT_SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function isPinned(v) {
	v = v.trim();
	if (EXACT_SEMVER.test(v)) return true;
	if (v.startsWith("file:") || v.startsWith("link:")) return true;
	if (v.startsWith("workspace:")) return EXACT_SEMVER.test(v.slice(10));
	if (v.startsWith("npm:")) {
		const at = v.lastIndexOf("@");
		return at > 4 && EXACT_SEMVER.test(v.slice(at + 1));
	}
	if (/^(git\+|git:|github:|https?:)/.test(v)) return /#[0-9a-f]{40}$/.test(v);
	return false;
}

function findPackageJsons(dir, out = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (IGNORE_DIRS.has(entry.name)) continue;
			if (SUBMODULE_PATHS.has(resolve(full))) continue;
			findPackageJsons(full, out);
		} else if (entry.name === "package.json") out.push(full);
	}
	return out;
}

// Find the package-lock.json that governs a given package.json (nearest ancestor).
function findLockFor(pkgFile) {
	let dir = dirname(pkgFile);
	for (;;) {
		const lock = join(dir, "package-lock.json");
		try {
			statSync(lock);
			return lock;
		} catch {}
		const parent = dirname(dir);
		if (parent === dir || !dir.startsWith(ROOT)) return null;
		dir = parent;
	}
}

// Detect a file's indentation (tab, or N spaces) so we re-serialise it the same
// way npm did and keep the diff to just the changed lines.
function detectIndent(text) {
	const m = /\n(\t+|[ ]+)"/.exec(text);
	if (!m) return "\t";
	return m[1][0] === "\t" ? "\t" : " ".repeat(m[1].length);
}
const lockIndent = new Map();

const lockCache = new Map();
function loadLock(lockFile) {
	if (!lockCache.has(lockFile)) {
		const text = readFileSync(lockFile, "utf8");
		lockIndent.set(lockFile, detectIndent(text));
		lockCache.set(lockFile, JSON.parse(text));
	}
	return lockCache.get(lockFile);
}

// Resolve installed version of dep `name` for the workspace at `pkgDir`.
function resolveVersion(lock, lockFile, pkgDir, name) {
	const packages = lock.packages || {};
	// workspace path relative to the lockfile root, using forward slashes
	const relDir = relative(dirname(lockFile), pkgDir).split("\\").join("/");
	const segments = relDir === "" ? [] : relDir.split("/");
	// Walk up: <ws>/node_modules/name, then parents, then root node_modules/name
	for (let i = segments.length; i >= 0; i--) {
		const prefix = segments.slice(0, i).join("/");
		const key = `${prefix ? `${prefix}/` : ""}node_modules/${name}`;
		if (packages[key]?.version) return packages[key].version;
	}
	return null;
}

const pkgFiles = findPackageJsons(ROOT);
let totalChanged = 0;
const unresolved = [];

for (const file of pkgFiles) {
	const pkg = JSON.parse(readFileSync(file, "utf8"));
	const lockFile = findLockFor(file);
	if (!lockFile) continue;
	const lock = loadLock(lockFile);
	const pkgDir = dirname(file);

	// Only resolve a version from the lockfile when this package.json is an actual
	// workspace tracked by that lockfile. For standalone dirs (not installed as
	// workspaces), walking up node_modules would borrow an unrelated, hoisted
	// version from another package — possibly a different major — so we must NOT
	// resolve them from the lockfile; we floor-strip their range instead.
	const relDir = relative(dirname(lockFile), pkgDir).split("\\").join("/");
	const isWorkspace = relDir === "" || Boolean(lock.packages?.[relDir]);

	// Collect replacements: section -> name -> newVersion
	const targets = {};
	for (const section of ENFORCED_SECTIONS) {
		const deps = pkg[section];
		if (!deps) continue;
		for (const [name, spec] of Object.entries(deps)) {
			if (isPinned(String(spec))) continue;
			let v = isWorkspace ? resolveVersion(lock, lockFile, pkgDir, name) : null;
			// Fallback for packages not resolvable from the lockfile (standalone
			// dirs, or unlisted deps): pin a simple ^/~ range to its floor version,
			// which is an exact pin that stays within the declared major.
			if (!v) {
				const floor = /^[\^~](\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(
					String(spec).trim(),
				);
				if (floor) v = floor[1];
			}
			if (!v) {
				unresolved.push(
					`${relative(ROOT, file)}  ${section} > ${name} (${spec})`,
				);
				continue;
			}
			targets[section] ||= {};
			targets[section][name] = v;
		}
	}
	if (Object.keys(targets).length === 0) continue;

	// Rewrite via line walking to preserve formatting & key order.
	const lines = readFileSync(file, "utf8").split("\n");
	let curSection = null;
	let changed = 0;
	const sectionRe = /^(\s*)"([^"]+)"\s*:\s*\{/;
	const depRe = /^(\s*)"([^"]+)"\s*:\s*"([^"]*)"(,?)\s*$/;
	for (let i = 0; i < lines.length; i++) {
		const s = sectionRe.exec(lines[i]);
		if (s) {
			curSection = ENFORCED_SECTIONS.has(s[2]) ? s[2] : null;
			continue;
		}
		if (!curSection) continue;
		if (/^\s*\}/.test(lines[i])) {
			curSection = null;
			continue;
		}
		const m = depRe.exec(lines[i]);
		if (!m) continue;
		const [, indent, name, , comma] = m;
		const nv = targets[curSection]?.[name];
		if (nv) {
			lines[i] = `${indent}"${name}": "${nv}"${comma}`;
			changed++;
		}
	}
	if (changed > 0) {
		writeFileSync(file, lines.join("\n"));
		totalChanged += changed;
		console.log(`  ${relative(ROOT, file)}: pinned ${changed}`);
	}
}

console.log(
	`\nPinned ${totalChanged} specifier(s) across ${pkgFiles.length} package.json file(s).`,
);
if (unresolved.length) {
	console.log(`\nCould NOT resolve ${unresolved.length} (left unchanged):`);
	for (const u of unresolved) console.log(`  ${u}`);
}

// Sync the recorded ranges inside each lockfile's workspace entries so they
// mirror the now-pinned package.json. We do NOT re-resolve the tree (which would
// drop entries for any uninitialised submodule workspace) — we only rewrite the
// declared ranges for workspace packages, keeping resolved versions/integrity
// untouched. npm ci requires these recorded ranges to match package.json.
for (const lockFile of lockCache.keys()) {
	const lock = loadLock(lockFile);
	const lockRoot = dirname(lockFile);
	const packages = lock.packages || {};
	let synced = 0;
	for (const file of pkgFiles) {
		if (findLockFor(file) !== lockFile) continue;
		const key = relative(lockRoot, dirname(file)).split("\\").join("/");
		const entry = packages[key];
		if (!entry) continue; // standalone dir not tracked as a workspace
		const pkg = JSON.parse(readFileSync(file, "utf8"));
		for (const section of ENFORCED_SECTIONS) {
			if (!pkg[section] || !entry[section]) continue;
			for (const name of Object.keys(entry[section])) {
				if (
					pkg[section][name] !== undefined &&
					entry[section][name] !== pkg[section][name]
				) {
					entry[section][name] = pkg[section][name];
					synced++;
				}
			}
		}
	}
	if (synced > 0) {
		const indent = lockIndent.get(lockFile) || "\t";
		writeFileSync(lockFile, `${JSON.stringify(lock, null, indent)}\n`);
		console.log(
			`Synced ${synced} recorded range(s) in ${relative(ROOT, lockFile)}`,
		);
	}
}
