import child_process from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import { ProsopoEnvError, getLogger } from "@prosopo/common";
import { at } from "@prosopo/util";
// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { Glob } from "glob";
import type { ProjectReference } from "typescript";

const logger = getLogger("Info", "config.dependencies.js");
const exec = util.promisify(child_process.exec);
// find a tScOnFiG.json file
const tsConfigRegex = /\/[A-Za-z.]*\.json$/;
const peerDepsRegex = /UNMET\sOPTIONAL\sDEPENDENCY\s+(@*[\w\-/.]+)@/;
const depsRegex = /\s+(@*[\w\-/.]+)@/;

async function getPackageDir(packageName: string): Promise<string> {
	let pkg = packageName;
	if (packageName && !packageName.startsWith("@prosopo/")) {
		pkg = `@prosopo/${packageName}`;
	}
	const pkgCommand = `npm list ${pkg} -ap`;
	logger.info(`Running command ${pkgCommand}`);
	// get package directory
	const { stdout: packageDir, stderr } = await exec(pkgCommand);
	if (stderr) {
		throw new ProsopoEnvError("CONFIG.INVALID_PACKAGE_DIR", {
			context: { stderr },
		});
	}
	return packageDir.trim() || path.resolve();
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
		initialTsConfigPath.replace(tsConfigRegex, ""),
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
			const refTSConfigPath = getReferenceTsConfigPath(tsConfigPath, reference);

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
	logger.debug("tsConfigPaths", tsConfigPaths);
	const promises: Promise<string>[] = [];
	for (const refTsConfigPath of tsConfigPaths) {
		const packageJsonPath = path.resolve(
			refTsConfigPath.replace(tsConfigRegex, ""),
			"package.json",
		);
		promises.push(
			new Promise((resolve, reject) => {
				// if package.json exists, read it and get the package name
				fs.stat(packageJsonPath, (err) => {
					if (err) {
						reject(err);
					}
					fs.readFile(
						new URL(packageJsonPath, import.meta.url),
						(err, buffer) => {
							if (err) {
								reject(err);
							} else {
								const packageJson = JSON.parse(buffer.toString());
								const pkg = packageJson.name;
								resolve(pkg);
							}
						},
					);
				});
			}),
		);
	}
	const externals = await Promise.all(promises);
	logger.debug("externals", externals);
	return externals;
}

/**
 * Get the dependencies for a package
 * @param packageName
 * @param production
 */
export async function getDependencies(
	packageName?: string,
	production?: boolean,
): Promise<{ dependencies: string[]; optionalPeerDependencies: string[] }> {
	let cmd = production ? "npm ls -a --omit=dev" : "npm ls -a";

	if (packageName) {
		const packageDir = await getPackageDir(packageName);
		cmd = `cd ${packageDir.trim()} && ${cmd}`;
		logger.info(`Running command ${cmd} in ${packageDir}`);
	}

	const { stdout, stderr } = await exec(cmd);
	if (stderr) {
		throw new ProsopoEnvError("CONFIG.INVALID_PACKAGE_DIR", {
			context: { stderr },
		});
	}
	const deps: string[] = [];
	const peerDeps: string[] = [];
	// for each line, check if there is an unmet optional dependency
	for (const line of stdout.split("\n")) {
		if (line.includes("UNMET OPTIONAL DEPENDENCY")) {
			//  │ │ │   ├── UNMET OPTIONAL DEPENDENCY bufferutil@^4.0.1
			const parts = line.match(peerDepsRegex);
			if (parts && parts.length > 1) {
				peerDeps.push(at(parts, 1));
			}
		} else {
			//  │ │ │ ├─┬ mongodb-memory-server-core@8.15.1
			const parts = line.match(depsRegex);
			if (parts && parts.length > 1) {
				deps.push(at(parts, 1));
			}
		}
	}
	// dedupe and return deps and peer deps
	return {
		dependencies: deps.filter((x, i) => i === deps.indexOf(x)),
		optionalPeerDependencies: peerDeps.filter(
			(x, i) => i === peerDeps.indexOf(x),
		),
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

/** Takes an array of partial module directories, finds the full path, and returns an array containing the file paths
 * of the files contained within the matching module directories [ filePath, filePath, ... ]
 * @param startDir
 * @param includePatterns
 * @param excludePatterns
 * @returns
 * @example
 * const includePatterns = ['kusama.js', 'westend.js']
 * const excludePatterns = ['bytes.js']
 * const startDir = path.resolve(__dirname, '../../node_modules/@polkadot')
 * const files = getFilesInDirs(startDir, includePatterns, excludePatterns)
 * console.log(files)
 * // [ '/home/.../node_modules/@polkadot/types/interfaces/bytes/bytes.js',
 * // '/home/.../node_modules/@polkadot/types/interfaces/bytes/bytes.d.ts']
 * */
export function getFilesInDirs(
	startDir: string,
	includePatterns: string[] = [],
	excludePatterns: string[] = [],
) {
	const files: string[] = [];
	logger.info(
		`getFilesInDirs: ${startDir} excluding ${includePatterns} including ${excludePatterns}`,
	);
	const ignorePatterns = excludePatterns.map(
		(pattern) => `${startDir}/**/${pattern}`,
	);
	for (const searchPattern of includePatterns) {
		// get matching module directories
		const globPattern = `${startDir}/**/${searchPattern}${searchPattern.indexOf(".") > -1 ? "" : "/*"}`;
		const globResult = new Glob(globPattern, {
			recursive: true,
			ignore: ignorePatterns,
		}).walkSync();
		for (const filePath of globResult) {
			files.push(filePath);
		}
	}
	return files;
}
