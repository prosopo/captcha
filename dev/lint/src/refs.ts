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
import z from "zod";

// covers both package.json and tsconfig.json fields
const packageConfigSchema = z.object({
	name: z.string().optional(),
	version: z.string().optional(),
	dependencies: z.record(z.string()).optional(),
	devDependencies: z.record(z.string()).optional(),
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

const getAllDependencies = (packageJson: File) => {
	const regularDependencies = Object.keys(
		z.record(z.string()).catch({}).parse(packageJson.content.dependencies),
	);
	const developmentDependencies = Object.keys(
		z.record(z.string()).catch({}).parse(packageJson.content.devDependencies),
	);
	return [...new Set([...regularDependencies, ...developmentDependencies])];
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

	// for each package in the workspace, check their version matches the workspace version
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
		const invalidTsConfigs = await validateDependencies({
			packageJson: loadPackageConfig(packagePath),
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
	unnecessaryReferences: string[];
	missingReferences: string[];
}

const validateDependencies = async (args: {
	packageJson: File;
	workspacePackageNames: string[];
}): Promise<InvalidTsConfig[]> => {
	const packageJson = args.packageJson;
	const workspacePackageNames = args.workspacePackageNames;
	const packageDirectory = path.dirname(packageJson.path);

	// get the dependencies for this package that are in the workspace
	const workspaceDependencies = getAllDependencies(packageJson)
		.filter((dependency) => workspacePackageNames.includes(dependency))
		// ignore @prosopo/config package because of circular dependency
		.filter((dependency) => dependency !== "@prosopo/config");

	const wrongTsConfigs: InvalidTsConfig[] = [];

	// find all tsconfig files in the same directory as the package.json
	const tsConfigPaths = fg.globSync(`${packageDirectory}/tsconfig{,.cjs}.json`);
	for (const tsConfigPath of tsConfigPaths) {
		const tsConfigJson = loadPackageConfig(tsConfigPath);
		const tsConfigReferences = getTsConfigReferences(tsConfigJson);

		// convert references to package names, e.g. ../common => @prosopo/common
		const referencedPackageNames = tsConfigReferences
			.map((referencePath) => {
				const referenceDirectory = path.dirname(referencePath);
				const referencedPackage = loadPackageConfigWithErrorContext(
					`${packageDirectory}/${referenceDirectory}/package.json`,
					`specified in ${tsConfigPath}`,
				);
				return getPackageName(referencedPackage);
			})
			// ignore @prosopo/config package because of circular dependency
			.filter((packageName) => packageName !== "@prosopo/config");

		// validate references against dependencies
		const unnecessaryReferences: string[] = referencedPackageNames.filter(
			(ref) => !workspaceDependencies.includes(ref),
		);
		const missingReferences: string[] = workspaceDependencies.filter(
			(dep) => !referencedPackageNames.includes(dep),
		);

		if (0 === unnecessaryReferences.length && 0 === missingReferences.length)
			continue;

		wrongTsConfigs.push({
			tsConfigPath: tsConfigPath,
			unnecessaryReferences: unnecessaryReferences,
			missingReferences: missingReferences,
		});
	}

	return wrongTsConfigs;
};

validateWorkspace({
	packageJsonPath: z.string().parse(process.argv[2]),
});
