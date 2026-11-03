// Copyright 2021-2026 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import type { ProjectReference } from "typescript";
import { parse } from "yaml";

const getTsconfigDir = (tsConfigPath: string): string =>
	".json" === path.extname(tsConfigPath)
		? path.dirname(tsConfigPath)
		: tsConfigPath;

interface Manifest {
	name?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

const readManifest = (dir: string): Manifest =>
	JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));

/**
 * The directory `name` resolves to from `fromDir`, following node's lookup up
 * the node_modules chain. Symlinks are resolved, so a pnpm package's own
 * dependencies are then looked up beside it in the virtual store.
 */
const resolvePackageDir = (
	name: string,
	fromDir: string,
): string | undefined => {
	let dir = fromDir;
	for (;;) {
		const candidate = path.join(dir, "node_modules", name);
		if (fs.existsSync(path.join(candidate, "package.json"))) {
			return fs.realpathSync(candidate);
		}
		const parent = path.dirname(dir);
		if (parent === dir) {
			return undefined;
		}
		dir = parent;
	}
};

/** The outermost pnpm workspace containing `from`, as npm's workspace root was. */
const findWorkspaceRoot = (from: string): string | undefined => {
	let root: string | undefined;
	for (let dir = from; ; dir = path.dirname(dir)) {
		if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
			root = dir;
		}
		if (path.dirname(dir) === dir) {
			return root;
		}
	}
};

const findWorkspacePackageDir = (
	name: string,
	from: string,
): string | undefined => {
	const root = findWorkspaceRoot(from);
	if (root === undefined) {
		return undefined;
	}
	const manifest: { packages?: string[] } = parse(
		fs.readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8"),
	);
	const globs = manifest.packages ?? [];
	const match = fg
		.globSync(
			globs.map((glob) =>
				glob.startsWith("!")
					? `!${glob.slice(1)}/package.json`
					: `${glob}/package.json`,
			),
			{ cwd: root, ignore: ["**/node_modules/**"] },
		)
		.find(
			(manifestPath) =>
				readManifest(path.join(root, path.dirname(manifestPath))).name === name,
		);
	return match === undefined ? undefined : path.join(root, path.dirname(match));
};

/**
 * The directory of the named workspace package, or cwd when there is none, so
 * a config naming a bundle rather than a package reads the package it runs in.
 */
function getPackageDir(packageName: string): string {
	const pkg = packageName.startsWith("@prosopo/")
		? packageName
		: `@prosopo/${packageName}`;
	const cwd = path.resolve();
	if (readManifest(cwd).name === pkg) {
		return cwd;
	}
	return findWorkspacePackageDir(pkg, cwd) ?? cwd;
}

/**
 * Resolve the tsconfig path for a reference using the initial tsconfig path and the reference path. If the reference
 * does not contain a tsconfig filename, `tsconfig.json` will be appended to the path.
 * @param initialTsConfigPath
 * @param reference
 */
function getReferenceTsConfigPath(
	initialTsConfigPath: string,
	reference: ProjectReference,
) {
	// remove tsconfig.*.json from the path and get the path to the new directory via the reference path
	let refTSConfigPath = path.resolve(
		getTsconfigDir(initialTsConfigPath),
		reference.path,
	);
	if (!refTSConfigPath.endsWith(".json")) {
		refTSConfigPath = path.resolve(refTSConfigPath, "tsconfig.json");
	}
	return refTSConfigPath;
}

/**
 * Get the tsconfig paths for a package
 * @param tsConfigPath the tsconfig path to start with
 * @param ignorePatterns the patterns to ignore
 * @param tsConfigPaths the tsconfig paths to add to
 * @param includeInitialTsConfig return the initial tsconfig path in the returned array
 */
export function getTsConfigs(
	tsConfigPath: string,
	ignorePatterns: RegExp[] = [],
	tsConfigPaths: string[] = [],
	includeInitialTsConfig = true,
): string[] {
	let tsConfigs = [...tsConfigPaths];
	//TODO use dynamic import with JSON assertion (TS complains that resolveJsonModule is not set)
	const references = JSON.parse(
		fs.readFileSync(tsConfigPath).toString(),
	).references;
	if (!tsConfigs.includes(tsConfigPath)) {
		if (references) {
			const ignore =
				ignorePatterns && ignorePatterns.length > 0
					? new RegExp(`${ignorePatterns.join("|")}`)
					: undefined;
			if (includeInitialTsConfig) {
				tsConfigs.push(tsConfigPath);
			}

			// ignore the packages we don't want to bundle
			const filteredReferences = references.filter(
				(reference: ProjectReference) =>
					ignore ? !ignore.test(reference.path) : false,
			);
			// for each reference, get the tsconfig paths - recursively calling this function
			for (const reference of filteredReferences) {
				// remove tsconfig.*.json from the path and get the path to the new directory via the reference path
				const refTSConfigPath = getReferenceTsConfigPath(
					tsConfigPath,
					reference,
				);

				// take the reference TS config path (refTSConfigPath) and get the tsconfig paths for it (newTsConfigs),
				// adding both to a distinct list, as there may be duplicates
				const newTsConfigs = getTsConfigs(
					refTSConfigPath,
					ignorePatterns,
					tsConfigs,
				);
				if (newTsConfigs.length > 0) {
					const distinctTsConfigPaths = new Set(tsConfigs.concat(newTsConfigs));
					tsConfigs = [...distinctTsConfigPaths];
				}
			}
		}
	}
	return tsConfigs;
}

/**
 * Get the workspace externals for a package
 * @param tsConfigPath
 * @param ignorePatterns
 */
export async function getExternalsFromReferences(
	tsConfigPath: string,
	ignorePatterns: RegExp[] = [],
): Promise<string[]> {
	const tsConfigPaths = getTsConfigs(tsConfigPath, ignorePatterns, [], false);
	console.debug({ tsConfigPaths });
	const promises: Promise<string>[] = [];
	for (const refTsConfigPath of tsConfigPaths) {
		const packageJsonPath = path.resolve(
			getTsconfigDir(refTsConfigPath),
			"package.json",
		);
		promises.push(
			new Promise((resolve, reject) => {
				// if package.json exists, read it and get the package name
				fs.stat(packageJsonPath, (err) => {
					if (err) {
						reject(err);
					}
					fs.readFile(packageJsonPath, (err, buffer) => {
						if (err) {
							reject(err);
						} else {
							const packageJson = JSON.parse(buffer.toString());
							const pkg = packageJson.name;
							resolve(pkg);
						}
					});
				});
			}),
		);
	}
	const externals = await Promise.all(promises);
	console.debug({ externals });
	return externals;
}

/**
 * Get every package installed beneath a package, walking the installed tree
 * rather than asking a package manager, so the answer is the same under any
 * node_modules layout. Optional dependencies and optional peers that are not
 * installed are reported separately so bundlers can leave them external.
 * @param packageName the package to start from; defaults to the one in cwd
 * @param production leave out the starting package's devDependencies
 */
export async function getDependencies(
	packageName?: string,
	production?: boolean,
): Promise<{ dependencies: string[]; optionalPeerDependencies: string[] }> {
	const rootDir = packageName ? getPackageDir(packageName) : path.resolve();
	// The package itself is listed too, as `npm ls` in a workspace listed it,
	// so the configs' name filters still see it (a package named *aws* stays
	// external to its own bundle).
	const rootName = readManifest(rootDir).name;
	const dependencies = new Set<string>(rootName ? [rootName] : []);
	const optionalPeerDependencies = new Set<string>();
	const visited = new Set<string>([rootDir]);
	const queue: { dir: string; includeDev: boolean }[] = [
		{ dir: rootDir, includeDev: !production },
	];

	for (let next = queue.shift(); next; next = queue.shift()) {
		const manifest = readManifest(next.dir);
		const optional = new Set([
			...Object.keys(manifest.optionalDependencies ?? {}),
			...Object.entries(manifest.peerDependenciesMeta ?? {})
				.filter(([, meta]) => meta.optional)
				.map(([name]) => name),
		]);
		const names = new Set([
			...Object.keys(manifest.dependencies ?? {}),
			...Object.keys(manifest.optionalDependencies ?? {}),
			...Object.keys(manifest.peerDependencies ?? {}),
			...(next.includeDev ? Object.keys(manifest.devDependencies ?? {}) : []),
		]);
		for (const name of names) {
			const dir = resolvePackageDir(name, next.dir);
			if (dir === undefined) {
				(optional.has(name) ? optionalPeerDependencies : dependencies).add(
					name,
				);
				continue;
			}
			dependencies.add(name);
			if (!visited.has(dir)) {
				visited.add(dir);
				queue.push({ dir, includeDev: false });
			}
		}
	}

	return {
		dependencies: [...dependencies],
		optionalPeerDependencies: [...optionalPeerDependencies],
	};
}

/**
 * Filter out the dependencies we don't want
 * @param deps
 * @param filters
 */
export function filterDependencies(
	deps: string[],
	filters: string[],
): { internal: string[]; external: string[] } {
	const depsDeduped = deps.filter((x, i) => i === deps.indexOf(x));
	const depsWithLength = depsDeduped.filter((dep) => dep.length > 0).sort();
	const exclude = new RegExp(`${filters.join("|")}`);
	// filter out the deps we don't want
	const internal: string[] = [];
	const external: string[] = [];
	for (const dep of depsWithLength) {
		if (exclude.test(dep)) {
			external.push(dep);
		} else {
			internal.push(dep);
		}
	}
	return { internal, external };
}
