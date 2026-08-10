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
import debug from "debug";
import { type BuildOptions, type BuildResult, build } from "esbuild";
import fg from "fast-glob";
import ts from "typescript";
import type { Plugin } from "vite";

type TsConfigPath = string;

type PackageDirPath = string;

type FilePath = string;

type ExternalFile<Key extends PropertyKey, Value, AdditionalInfo> = [
	Key,
	Value,
	AdditionalInfo,
];

export type ExternalFiles = Record<FilePath, [TsConfigPath, PackageDirPath]>;

export type VitePluginWatchExternalOptions = {
	// path
	workspaceRoot: string;
	// path or glob
	currentPackage: string;
	format: "esm" | "cjs";
	// file types to build
	fileTypes?: string[];
	// glob patterns to ignore
	ignorePaths?: string[];
};

/**
 * A tsconfig as read off disk. Only `extends` and `compilerOptions` are
 * consulted, and both may be absent or any shape — this is a user-authored
 * file, not something the plugin controls.
 */
export interface TsConfigLike {
	extends?: unknown;
	compilerOptions?: {
		rootDir?: unknown;
		outDir?: unknown;
	};
}

/**
 * The ambient state the plugin reads.
 *
 * Injected so the file discovery and build path can be driven against a
 * synthetic workspace. The alternative — replacing `node:fs`, `fast-glob`,
 * `typescript` and `esbuild` for the whole run — would leave the test asserting
 * against mocks of four third-party modules rather than against this plugin.
 */
export interface WatchWorkspaceDeps {
	readFile: (target: string) => string;
	readDir: (target: string) => string[];
	isDirectory: (target: string) => boolean;
	glob: (pattern: string, options: { ignore: string[] }) => Promise<string[]>;
	readTsConfig: (filename: string) => TsConfigLike | undefined;
	build: (options: BuildOptions) => Promise<BuildResult>;
	now: () => number;
}

export const defaultDeps: WatchWorkspaceDeps = {
	readFile: (target: string): string => fs.readFileSync(target, "utf8"),
	readDir: (target: string): string[] => fs.readdirSync(target),
	isDirectory: (target: string): boolean => fs.lstatSync(target).isDirectory(),
	glob: (pattern: string, options: { ignore: string[] }): Promise<string[]> =>
		fg(pattern, options),
	readTsConfig: (filename: string): TsConfigLike | undefined => {
		// readConfigFile reports a missing or malformed file through `error` and
		// still returns `config: {}`. Passing that empty object on would look
		// like a valid tsconfig with every option defaulted, so an unreadable
		// file silently became "rootDir '.', outDir 'dist'" — plausible, and
		// wrong for most packages. Collapse it to undefined instead.
		const { config, error } = ts.readConfigFile(filename, ts.sys.readFile);
		return error ? undefined : config;
	},
	build: (options: BuildOptions): Promise<BuildResult> => build(options),
	now: (): number => Date.now(),
};

const log = debug("vite-plugin-watch-workspace");

const FILE_TYPES = ["ts", "tsx"];

const RELATIVE_PATH_REGEX = /^(\.+\/)+/;

/**
 * How many `extends` links are followed before giving up.
 *
 * A tsconfig that extends itself, directly or through a cycle, would otherwise
 * recurse until the stack overflows — and the resulting RangeError says nothing
 * about which file is at fault.
 */
export const MAX_TSCONFIG_EXTENDS_DEPTH = 32;

/**
 * Read a tsconfig, merging in whatever it extends.
 *
 * `rootDir` is the directory that a relative `extends` is resolved against. It
 * defaults to the directory of `filename` rather than the process cwd: a
 * tsconfig's `extends` is specified relative to the tsconfig itself, so
 * resolving the top-level call against cwd found the wrong file (or no file)
 * whenever the plugin ran from anywhere other than the package directory.
 */
export const getTsConfigFollowExtends = (
	filename: string,
	rootDir?: string,
	deps: WatchWorkspaceDeps = defaultDeps,
	depth = 0,
): TsConfigLike => {
	const config = deps.readTsConfig(filename);
	if (!config) {
		// A missing or unparseable tsconfig used to throw on `config.extends`,
		// with a TypeError naming neither the file nor the plugin. An empty
		// config lets the caller fall back to its own defaults instead.
		log(`no tsconfig readable at ${filename}`);
		return { compilerOptions: {} };
	}

	let extendedConfig: TsConfigLike = {};
	if (typeof config.extends === "string") {
		if (depth >= MAX_TSCONFIG_EXTENDS_DEPTH) {
			throw new Error(
				`tsconfig 'extends' chain exceeded ${MAX_TSCONFIG_EXTENDS_DEPTH} levels at ${filename}; it is probably a cycle`,
			);
		}
		const base = rootDir ?? path.dirname(filename);
		const importPath = path.resolve(base, config.extends);
		extendedConfig = getTsConfigFollowExtends(
			importPath,
			path.dirname(importPath),
			deps,
			depth + 1,
		);
	} else if (config.extends !== undefined) {
		// TypeScript also accepts an array of base configs. Following them is out
		// of scope here, but silently ignoring the field would produce a config
		// missing the rootDir/outDir the caller depends on, so say so.
		log(`ignoring non-string 'extends' in ${filename}`);
	}

	return {
		...extendedConfig,
		...config,
		compilerOptions: {
			...extendedConfig.compilerOptions,
			...config.compilerOptions,
		},
	};
};

/** `rootDir`/`outDir` are user-authored; anything non-string is not usable. */
const stringOption = (value: unknown, fallback: string): string =>
	typeof value === "string" && value.length > 0 ? value : fallback;

export const getFilesAndTsConfigs = async (
	workspacePath: string,
	currentPackage: string,
	packageDir: string,
	fileTypes: string[],
	ignorePaths?: string[],
	deps: WatchWorkspaceDeps = defaultDeps,
): Promise<ExternalFile<FilePath, TsConfigPath, PackageDirPath>[]> => {
	const packagePath = path.resolve(workspacePath, packageDir);
	const tsConfigPath = path.resolve(packagePath, "tsconfig.json");
	// check whether the user has passed a glob
	const currentPackageGlob = currentPackage.includes("*")
		? currentPackage
		: `${currentPackage}/**/*`;
	const tsconfig = getTsConfigFollowExtends(tsConfigPath, undefined, deps);
	const rootDir = stringOption(tsconfig.compilerOptions?.rootDir, ".");
	// convertPathToPattern escapes glob metacharacters so that a *path* can be
	// used as a literal pattern. Passing the whole pattern through it escaped
	// the `**`, `*` and `(a|b)` as well, so on any platform where the path
	// needed no conversion the plugin matched nothing at all and watched an
	// empty file set. Convert only the directory, then append the glob.
	const searchRoot = fg.convertPathToPattern(
		path.resolve(packagePath, rootDir),
	);
	const files = await deps.glob(`${searchRoot}/**/*.(${fileTypes.join("|")})`, {
		ignore: ["**/node_modules/**", currentPackageGlob, ...(ignorePaths || [])],
	});
	// keep the tsconfig path beside each file to avoid looking for file ids in arrays later
	return files.map((file: string) => [file, tsConfigPath, packageDir]);
};

/** The single field of the workspace root package.json that is read. */
const readWorkspaces = (workspaceRoot: string, contents: string): string[] => {
	let parsed: { workspaces?: unknown };
	try {
		parsed = JSON.parse(contents);
	} catch (error) {
		throw new Error(
			// JSON.parse only ever throws a SyntaxError, so there is no non-Error
			// case to narrow for here.
			`could not parse ${path.resolve(workspaceRoot, "package.json")}: ${String(error)}`,
		);
	}
	const workspaces = parsed?.workspaces;
	// npm also accepts `{ "workspaces": { "packages": [...] } }`. Both shapes
	// reach here as-is; anything else used to fail as `undefined.map is not a
	// function`, which named neither the file nor the field.
	const list = Array.isArray(workspaces)
		? workspaces
		: Array.isArray(
					(workspaces as { packages?: unknown } | undefined)?.packages,
				)
			? (workspaces as { packages: unknown[] }).packages
			: undefined;
	if (!list) {
		throw new Error(
			`no 'workspaces' array in ${path.resolve(workspaceRoot, "package.json")}`,
		);
	}
	return list.filter((entry): entry is string => typeof entry === "string");
};

export const getExternalFileLists = async (
	workspaceRoot: string,
	currentPackage: string,
	fileTypes: string[],
	ignorePaths?: string[],
	deps: WatchWorkspaceDeps = defaultDeps,
): Promise<ExternalFiles> => {
	const workspacePackageJson = path.resolve(workspaceRoot, "package.json");
	const workspaces = readWorkspaces(
		workspaceRoot,
		deps.readFile(workspacePackageJson),
	);
	log(workspaces);
	const externalFiles: ExternalFiles = {};
	const filesConfigs: ExternalFile<FilePath, TsConfigPath, PackageDirPath>[] = (
		await Promise.all(
			workspaces.map(async (workspace: string) => {
				if (workspace.indexOf("*") >= 0) {
					// get directories in each workspace
					const workspacePath = path.resolve(
						workspaceRoot,
						workspace.replace("*", ""),
					);
					log(workspacePath);
					// get directories in workSpacePath
					const packages = deps
						.readDir(workspacePath)
						.filter((dir) => deps.isDirectory(path.join(workspacePath, dir)));
					log(packages);
					// get files and tsconfigs in each package
					return await Promise.all(
						packages.map(
							async (packageDir: string) =>
								await getFilesAndTsConfigs(
									workspacePath,
									currentPackage,
									packageDir,
									fileTypes,
									ignorePaths,
									deps,
								),
						),
					);
				}
				// A workspace entry without a glob names one package directly.
				// Resolve it against the root here rather than passing the raw
				// entry down as if it were a directory.
				const packages = [path.resolve(workspaceRoot, workspace)];
				log("reading single package", workspace);
				return await Promise.all(
					packages.map(
						async (packageDir) =>
							await getFilesAndTsConfigs(
								workspaceRoot,
								currentPackage,
								packageDir,
								fileTypes,
								ignorePaths,
								deps,
							),
					),
				);
			}),
		)
	).flatMap((filesConfigs) => filesConfigs.flat());
	for (const [file, tsconfig, packageDir] of filesConfigs) {
		externalFiles[file] = [tsconfig, packageDir];
	}
	return externalFiles;
};

export type EsbuildLoader = "ts" | "tsx" | "js" | "jsx" | "css" | "json";

export type OutExtension = ".js" | ".css" | ".json";

export const getLoader = (fileExtension: string): EsbuildLoader => {
	switch (fileExtension) {
		case ".ts":
			return "ts";
		case ".tsx":
			return "tsx";
		case ".js":
			return "js";
		case ".jsx":
			return "jsx";
		case ".css":
			return "css";
		case ".json":
			return "json";
		default:
			return "ts";
	}
};

export const getOutExtension = (fileExtension: string): OutExtension => {
	switch (fileExtension) {
		case ".ts":
			return ".js";
		case ".tsx":
			return ".js";
		case ".js":
			return ".js";
		case ".jsx":
			return ".js";
		case ".css":
			return ".css";
		case ".json":
			return ".json";
		default:
			return ".js";
	}
};

/**
 * Replace the last occurrence of a path segment sequence.
 *
 * `String.prototype.replace` with a string replaces the *first* match anywhere
 * in the subject, including inside a longer segment. That is wrong for both
 * uses below: a checkout at `/home/src/repo/packages/cli/src` rewrote the
 * leading `/home/src` and emitted the build next to the user's home directory,
 * and a package named `cli` under `/home/cli/...` hit the same thing. Matching
 * whole segments from the right keeps the rewrite on the segment nearest the
 * file, which is the one that belongs to the package being built.
 */
export const replaceLastSegments = (
	dir: string,
	target: string,
	replacement: string,
): string => {
	const segments = dir.split(path.sep);
	const targetSegments = target.split(/[\\/]/).filter(Boolean);
	if (targetSegments.length === 0) {
		return dir;
	}
	for (
		let start = segments.length - targetSegments.length;
		start >= 0;
		start--
	) {
		const matches = targetSegments.every(
			(segment, offset) => segments[start + offset] === segment,
		);
		if (matches) {
			return [
				...segments.slice(0, start),
				...replacement.split(/[\\/]/).filter(Boolean),
				...segments.slice(start + targetSegments.length),
			].join(path.sep);
		}
	}
	// No match: the caller's assumption about the layout does not hold, so
	// leave the path alone rather than inventing one.
	return dir;
};

export const getOutDir = (
	file: string,
	tsconfig: TsConfigLike,
	packageDir: string,
): string => {
	const rootDir = stringOption(tsconfig.compilerOptions?.rootDir, ".");
	const outDir = stringOption(tsconfig.compilerOptions?.outDir, "dist");

	if (rootDir === ".") {
		return replaceLastSegments(
			path.dirname(file),
			packageDir,
			`${packageDir}/${outDir}`,
		);
	}
	const rootFolder = rootDir.replace(RELATIVE_PATH_REGEX, "");
	const outFolder = outDir.replace(RELATIVE_PATH_REGEX, "");
	return replaceLastSegments(path.dirname(file), rootFolder, outFolder);
};

export const getOutFile = (
	outdir: string,
	file: string,
	fileExtension: string,
): string => {
	const outExtension = getOutExtension(fileExtension);
	return path.resolve(
		outdir,
		path.basename(file).replace(fileExtension, outExtension),
	);
};

/**
 * Plugin to watch a workspace for changes and rebuild when detected using esbuild
 * @param config
 * The config contains the following parameters
 *  - workspaceRoot: path to the root of the workspace
 *  - currentPackage: path to the current package or glob. Will be transformed to a glob if a path is passed.
 *  - format: esm | cjs
 *  - fileTypes: ts | tsx | js | jsx | ... (optional)
 *  - ignorePaths: paths or globs to ignore (optional)
 * @constructor
 */
export const VitePluginWatchWorkspace = async (
	config: VitePluginWatchExternalOptions,
	deps: WatchWorkspaceDeps = defaultDeps,
	// biome-ignore lint/suspicious/noExplicitAny: matches vite's own Plugin default
): Promise<Plugin<any>> => {
	const externalFiles = await getExternalFileLists(
		config.workspaceRoot,
		config.currentPackage,
		config.fileTypes || FILE_TYPES,
		config.ignorePaths,
		deps,
	);
	return {
		name: "vite-plugin-watch-workspace",
		async buildStart() {
			for (const file of Object.keys(externalFiles)) {
				this.addWatchFile(file);
			}
		},
		async handleHotUpdate({ file, server }) {
			log(`File', ${file}`);

			const fileConfig = externalFiles[file];
			if (!fileConfig) {
				log(`tsconfigPath not found for file ${file}`);
				return;
			}
			const [tsconfigPath, packageDir] = fileConfig;

			const tsconfig = getTsConfigFollowExtends(tsconfigPath, undefined, deps);
			const fileExtension = path.extname(file);
			const loader = getLoader(fileExtension);
			const outdir = getOutDir(file, tsconfig, packageDir);
			const outfile = getOutFile(outdir, file, fileExtension);
			log(`Outfile ${outfile}, loader ${loader}`);
			const buildResult = await deps.build({
				tsconfig: tsconfigPath,
				stdin: {
					contents: deps.readFile(file),
					loader,
					resolveDir: path.dirname(file),
				},
				outfile,
				platform: config.format === "cjs" ? "node" : "neutral",
				// `format` is required by the options type, so there is no default
				// to fall back to.
				format: config.format,
			});
			log(`buildResult', ${JSON.stringify(buildResult)}`);

			server.ws.send({
				type: "update",
				updates: [
					{
						acceptedPath: file,
						type: "js-update",
						path: file,
						timestamp: deps.now(),
					},
				],
			});
		},
	};
};
