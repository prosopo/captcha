#!/usr/bin/env node
// One-shot helper used to introduce exact pinning: rewrites every floating
// (^, ~, range, *, latest) specifier in dependencies/devDependencies/
// optionalDependencies to the exact version that pnpm-lock.yaml already
// resolved it to. Because the lockfile is the source of truth for
// `pnpm install --frozen-lockfile`, this does NOT change what gets installed —
// it only makes package.json declare the version explicitly. peerDependencies
// are left untouched.
//
// Resolution: the lockfile's `importers` section records, per workspace
// package, the version each declared dependency resolved to.

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { DEP_SECTIONS, parsePnpmLock } from "./pnpm-lockfile.mjs";

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
const ENFORCED_SECTIONS = new Set(DEP_SECTIONS);
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
	if (v.startsWith("workspace:")) {
		const rest = v.slice(10);
		return rest === "*" || EXACT_SEMVER.test(rest);
	}
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

// Find the pnpm-lock.yaml that governs a given package.json (nearest ancestor).
function findLockFor(pkgFile) {
	let dir = dirname(pkgFile);
	for (;;) {
		const lock = join(dir, "pnpm-lock.yaml");
		try {
			statSync(lock);
			return lock;
		} catch {}
		const parent = dirname(dir);
		if (parent === dir || !dir.startsWith(ROOT)) return null;
		dir = parent;
	}
}

const lockCache = new Map();
function loadLock(lockFile) {
	if (!lockCache.has(lockFile)) {
		lockCache.set(lockFile, parsePnpmLock(readFileSync(lockFile, "utf8")));
	}
	return lockCache.get(lockFile);
}

function importerKey(lockFile, pkgDir) {
	return relative(dirname(lockFile), pkgDir).split("\\").join("/") || ".";
}

// Resolved version of dep `name` for a workspace, as a pinned specifier. The
// lockfile appends peer context in parentheses, and records an npm: alias as
// `realname@version`.
function resolveVersion(importer, section, name, spec) {
	const version = importer.get(section)?.get(name)?.version;
	if (!version) return null;
	const bare = version.replace(/\(.*$/, "");
	if (spec.startsWith("npm:")) {
		const at = bare.lastIndexOf("@");
		return at > 0 && EXACT_SEMVER.test(bare.slice(at + 1))
			? `npm:${bare}`
			: null;
	}
	return EXACT_SEMVER.test(bare) ? bare : null;
}

function yamlScalar(value) {
	const plain =
		/^[\w@.\/^~-][\w@.\/:+^~*<>=| -]*$/.test(value) &&
		!/: |:$| #|^- |^[~-]$|^\d+(?:\.\d+)?$/.test(value);
	return plain ? value : `'${value.replaceAll("'", "''")}'`;
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

	// Only resolve a version from the lockfile when this package.json is an
	// importer in it. Standalone dirs (not installed as workspaces) have no
	// entry, so we floor-strip their range instead.
	const importer = lock.importers.get(importerKey(lockFile, pkgDir));

	// Collect replacements: section -> name -> newVersion
	const targets = {};
	for (const section of ENFORCED_SECTIONS) {
		const deps = pkg[section];
		if (!deps) continue;
		for (const [name, spec] of Object.entries(deps)) {
			if (isPinned(String(spec))) continue;
			let v = importer
				? resolveVersion(importer, section, name, String(spec).trim())
				: null;
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

// Sync the recorded specifiers inside each lockfile's importers so they mirror
// the now-pinned package.json. We do NOT re-resolve the tree (which would drop
// entries for any uninitialised submodule workspace) — we only rewrite the
// `specifier:` lines, keeping resolved versions and integrity untouched.
// `pnpm install --frozen-lockfile` requires these to match package.json.
for (const [lockFile, lock] of lockCache) {
	let synced = 0;
	for (const file of pkgFiles) {
		if (findLockFor(file) !== lockFile) continue;
		const importer = lock.importers.get(importerKey(lockFile, dirname(file)));
		if (!importer) continue; // standalone dir not tracked as a workspace
		const pkg = JSON.parse(readFileSync(file, "utf8"));
		for (const [section, deps] of importer) {
			for (const [name, dep] of deps) {
				const declared = pkg[section]?.[name];
				if (declared === undefined || declared === dep.specifier) continue;
				const line = lock.lines[dep.specifierLine];
				lock.lines[dep.specifierLine] =
					`${line.slice(0, line.indexOf("specifier:"))}specifier: ${yamlScalar(declared)}`;
				synced++;
			}
		}
	}
	if (synced > 0) {
		writeFileSync(lockFile, lock.lines.join("\n"));
		console.log(
			`Synced ${synced} recorded specifier(s) in ${relative(ROOT, lockFile)}`,
		);
	}
}
