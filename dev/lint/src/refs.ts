// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import { inspect } from "node:util";
import { get } from "@prosopo/util";
import fg from "fast-glob";
import ts from "typescript";
import type { Argv } from "yargs";
import z from "zod";

// covers both package.json and tsconfig.json fields
const packageConfigSchema = z.object({
	name: z.string().optional(),
	version: z.string().optional(),
	dependencies: z.record(z.string()).optional(),
	devDependencies: z.record(z.string()).optional(),
	peerDependencies: z.record(z.string()).optional(),
	optionalDependencies: z.record(z.string()).optional(),
	workspaces: z.array(z.string()).optional(),
	references: z.array(z.record(z.string())).optional(),
});

type PackageConfig = z.infer<typeof packageConfigSchema>;

// file consists of a path to the file or the content of the file if already read
type File = { path: string; content: PackageConfig };

const parsePackageConfig = (filePath: string): PackageConfig =>
	packageConfigSchema.parse(JSON.parse(fs.readFileSync(filePath, "utf8")));

const loadPackageConfig = (filePath: string): File => ({
	path: filePath,
	content: parsePackageConfig(filePath),
});

const loadPackageConfigWithErrorContext = (
	filePath: string,
	errorContext: string,
): File => {
	try {
		return loadPackageConfig(filePath);
	} catch (err) {
		throw new Error(`Failed to read file ${filePath}: ${errorContext}`);
	}
};

const findWorkspacePackageJsons = (workspacePackageJson: File) =>
	// get the workspace globs
	z
		.string()
		.array()
		.catch([])
		.parse(workspacePackageJson.content.workspaces)
		.map(
			(pattern) =>
				`${path.dirname(workspacePackageJson.path)}/${pattern}/package.json`,
		)
		// glob the workspace paths
		// add package.json to the dirs and filter out any that don't exist (e.g. packages/* may match packages/some-dir but if some-dir doesn't have a package.json we don't want it)

		.map((pattern) => fg.globSync(pattern))
		.reduce((acc, val) => acc.concat(val), []);

const getDevDependencies = (packageJson: File) => {
	const developmentDependencies = Object.keys(
		z.record(z.string()).catch({}).parse(packageJson.content.devDependencies),
	);
	return developmentDependencies;
};

const getAllDependencies = (packageJson: File) => {
	const regularDependencies = Object.keys(
		z.record(z.string()).catch({}).parse(packageJson.content.dependencies),
	);
	const developmentDependencies = getDevDependencies(packageJson);
	const peerDependencies = Object.keys(
		z.record(z.string()).catch({}).parse(packageJson.content.peerDependencies),
	);
	const optionalDependencies = Object.keys(
		z
			.record(z.string())
			.catch({})
			.parse(packageJson.content.optionalDependencies),
	);
	return [
		...new Set([
			...regularDependencies,
			...developmentDependencies,
			...peerDependencies,
			...optionalDependencies,
		]),
	];
};

const getWorkspacePackageNames = (workspacePackagePaths: string[]) =>
	workspacePackagePaths.map((packagePath) =>
		z.string().parse(loadPackageConfig(packagePath).content.name),
	);

const getTsConfigReferences = (tsConfigJson: File) =>
	z
		.array(z.record(z.string()))
		.catch([])
		.parse(tsConfigJson.content.references)
		.map((reference) => get(reference, "path"))
		.map((referencePath) =>
			// ref paths can point at a tsconfig OR a dir containing a tsconfig. If it's a dir, add /tsconfig.json
			referencePath.endsWith(".json")
				? referencePath
				: `${referencePath}/tsconfig.json`,
		);

const getPackageName = (packageJson: File) =>
	z.string().parse(packageJson.content.name);

interface InvalidPackage {
	packageJsonPath: string;
	invalidTsConfigs: InvalidTsConfig[];
}

const validateWorkspace = async (args: {
	packageJsonPath: string;
	ignore: string[];
}) => {
	const workspacePackagePath = args.packageJsonPath;
	const workspacePackage = loadPackageConfig(workspacePackagePath);

	// check the package json is a workspace
	if (workspacePackage.content.workspaces === undefined) {
		throw new Error(`${workspacePackage.path} is not a workspace`);
	}

	// list all the packages in the workspace
	const workspacePackageNames = getWorkspacePackageNames(
		findWorkspacePackageJsons(workspacePackage),
	);

	const packagePatterns = [
		workspacePackagePath, // include the workspace package.json
		...z
			.string()
			.array()
			.parse(workspacePackage.content.workspaces)
			.map(
				(pattern) =>
					`${path.dirname(workspacePackagePath)}/${pattern}/package.json`,
			),
	];
	const packagePaths = fg.globSync(packagePatterns);

	const invalidPackages: InvalidPackage[] = [];

	for (const packagePath of packagePaths) {
		const packageJson = loadPackageConfig(packagePath);

		if (args.ignore.includes(getPackageName(packageJson))) {
			continue;
		}

		const invalidTsConfigs = await validateDependencies({
			packageJson,
			workspacePackageNames,
		});

		if (invalidTsConfigs.length > 0) {
			invalidPackages.push({
				packageJsonPath: packagePath,
				invalidTsConfigs: invalidTsConfigs,
			});
		}
	}

	if (0 === invalidPackages.length) {
		return;
	}

	console.log(
		"Found invalid packages",
		inspect(invalidPackages, {
			depth: null,
			colors: true,
		}),
	);

	throw new Error(
		"References and dependencies are not in sync - see above for details",
	);
};

interface InvalidTsConfig {
	tsConfigPath: string;
	packageJsonPath: string;
	unnecessaryReferences: string[];
	missingReferences: string[];
	missingDependencies: string[];
	unnecessaryDependencies: string[];
}

/**
 * Extracts all import paths from a TypeScript file.
 * Handles static and dynamic imports.
 */
export function getImportsFromTsFile(filePath: string): string[] {
	const code = fs.readFileSync(filePath, "utf-8");
	const sourceFile = ts.createSourceFile(
		path.basename(filePath),
		code,
		ts.ScriptTarget.Latest,
		true,
	);

	const imports: string[] = [];

	function visit(node: ts.Node) {
		// Static imports: import ... from '...'
		if (ts.isImportDeclaration(node)) {
			if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
				imports.push(node.moduleSpecifier.text);
			}
		}

		// Side-effect imports: import '...'
		else if (ts.isImportEqualsDeclaration(node)) {
			if (
				ts.isExternalModuleReference(node.moduleReference) &&
				ts.isStringLiteral(node.moduleReference.expression)
			) {
				imports.push(node.moduleReference.expression.text);
			}
		}

		// Dynamic imports: import('...')
		else if (
			ts.isCallExpression(node) &&
			node.expression.kind === ts.SyntaxKind.ImportKeyword &&
			node.arguments.length === 1 &&
			ts.isStringLiteral(node.arguments[0] as ts.Node)
		) {
			imports.push((node.arguments[0] as ts.StringLiteral).text);
		}

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return imports;
}

const validateDependencies = async (args: {
	packageJson: File;
	workspacePackageNames: string[];
}): Promise<InvalidTsConfig[]> => {
	const packageJson = args.packageJson;

	// skip workspaces
	if (packageJson.content.workspaces) {
		return [];
	}

	const workspacePackageNames = args.workspacePackageNames;
	const packageDirectory = path.dirname(packageJson.path);

	// get the dependencies for this package that are in the workspace
	const allDependencies = getAllDependencies(packageJson);
	const workspaceDependencies = allDependencies.filter((dependency) =>
		workspacePackageNames.includes(dependency),
	);

	const wrongTsConfigs: InvalidTsConfig[] = [];

	// find all tsconfig files in the same directory as the package.json
	const tsConfigPaths = fg.globSync(`${packageDirectory}/tsconfig{,.cjs}.json`);
	for (const tsConfigPath of tsConfigPaths) {
		const tsConfigJson = loadPackageConfig(tsConfigPath);
		const tsConfigReferences = getTsConfigReferences(tsConfigJson);

		// convert references to package names, e.g. ../common => @prosopo/common
		const referencedPackageNames = tsConfigReferences.map((referencePath) => {
			const referenceDirectory = path.dirname(referencePath);
			const referencedPackage = loadPackageConfigWithErrorContext(
				`${packageDirectory}/${referenceDirectory}/package.json`,
				`specified in ${tsConfigPath}`,
			);
			return getPackageName(referencedPackage);
		});

		// validate references against dependencies
		const unnecessaryReferences: string[] = referencedPackageNames.filter(
			(ref) => !workspaceDependencies.includes(ref),
		);
		const missingReferences: string[] = workspaceDependencies.filter(
			(dep) => !referencedPackageNames.includes(dep),
		);

		// grep the source code for imports
		// there may be imports, e.g. @prosopo/util, that are not in the package.json or tsconfig.json
		const srcFiles = fg.globSync(
			`${packageDirectory}/**/*.{ts,tsx,js,jsx,vue,mjs,cjs,svelte}`,
			{
				ignore: [
					`${packageDirectory}/node_modules/**`,
					`${packageDirectory}/dist/**`,
				],
			},
		);
		const allImports = new Set<string>();
		for (const srcFile of srcFiles) {
			let imports = getImportsFromTsFile(srcFile);
			// if there's node:XYZ imports then remove them, add node types lib instead
			const hasNodeImports = imports.some((importPath) =>
				importPath.startsWith("node:"),
			);
			if (hasNodeImports) {
				imports = imports.filter(
					(importPath) => !importPath.startsWith("node:"),
				);
				imports.push("@types/node");
			}

			// Process imports to extract package names and handle relative imports
			imports = imports.flatMap((importPath) => {
				// Handle relative imports (./ or ../)
				if (importPath.startsWith(".")) {
					// Resolve the absolute path of the import relative to the source file
					const resolvedPath = path.resolve(path.dirname(srcFile), importPath);
					// Check if the resolved path is inside the current package directory
					if (resolvedPath.startsWith(packageDirectory)) {
						// It's a file in the current package, filter it out
						return [];
					}
					// It's outside the current package, try to find the package it belongs to
					// Walk up from the resolvedPath to find a package.json
					let dir = resolvedPath;
					let found = false;
					let pkgName: string | undefined = undefined;
					while (dir !== path.dirname(dir)) {
						const pkgJsonPath = path.join(dir, "package.json");
						if (fs.existsSync(pkgJsonPath)) {
							try {
								const pkg = loadPackageConfig(pkgJsonPath);
								pkgName = pkg.content.name;
								found = true;
								break;
							} catch {
								// ignore parse errors
							}
						}
						dir = path.dirname(dir);
					}
					if (found && pkgName) {
						return [pkgName];
					}
					// If no package.json found, ignore
					return [];
				}

				// Handle non-relative imports (package imports and sub-imports)
				// Extract the base package name from sub-imports like 'svelte/elements' -> 'svelte'
				if (importPath.startsWith("@")) {
					// Scoped packages, so we need the first two parts
					const parts = importPath.split("/");
					return [parts.slice(0, 2).join("/")];
				}
				// Non-scoped packages, take the first part
				const parts = importPath.split("/");
				return [parts[0] || importPath];
			});

			// filter any imports that begin with #, these are shorthand internal imports
			imports = imports.filter((importPath) => !importPath.startsWith("#"));

			for (const importPath of imports) {
				allImports.add(importPath);
			}
		}

		// eliminate self import, e.g. @prosopo/types containing import from @prosopo/types
		allImports.delete(getPackageName(packageJson));

		// record all the imports that are not in the package.json or tsconfig.json
		const missingDependencies = Array.from(allImports).filter(
			(importPath) => !allDependencies.includes(importPath),
		);

		// record all the dependencies that are not imported, unless specified as devDependencies
		const devDependencies = getDevDependencies(packageJson);
		const unnecessaryDependencies = allDependencies.filter(
			(dependency) =>
				!allImports.has(dependency) && !devDependencies.includes(dependency),
		);

		if (
			0 === unnecessaryReferences.length &&
			0 === missingReferences.length &&
			0 === missingDependencies.length &&
			0 === unnecessaryDependencies.length
		)
			continue;

		wrongTsConfigs.push({
			tsConfigPath,
			packageJsonPath: packageJson.path,
			unnecessaryReferences,
			missingReferences,
			missingDependencies,
			unnecessaryDependencies,
		});
	}

	return wrongTsConfigs;
};

export const buildRefsCommand = () => {
	return {
		command: "refs",
		describe: "Check the references in the workspace",
		builder: (yargs: Argv) => {
			return yargs
				.option("pkg", {
					alias: "p",
				})
				.option("ignore", {
					alias: "i",
					describe: "Ignore specified dependency or reference (can be specified multiple times)",
					type: "string",
					array: true,
					default: [],
				});
		},
		handler: async (argv: unknown) => {
			const args = z
				.object({
					pkg: z.string(),
					ignore: z.array(z.string()).default([]),
				})
				.parse(argv);
			await validateWorkspace({
				packageJsonPath: args.pkg,
				ignore: args.ignore,
			});
		},
	};
};
