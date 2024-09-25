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

import fs, { read } from "node:fs";
import path from "node:path";
import { at, get } from "@prosopo/util";
import fg from "fast-glob";
import z from "zod";

// file consists of a path to the file or the content of the file if already read
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type File = { path: string; content: any };

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const readJson = (filePath: string): any => {
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const readFile = (filePath: string): File => {
	return {
		path: filePath,
		content: readJson(filePath),
	};
};

const readFileWhy = (filePath: string, msg: string): File => {
	try {
		return readFile(filePath);
	} catch (err) {
		throw new Error(`Failed to read file ${filePath}: ${msg}`);
	}
};

const getPkgJsonPaths = (wsPkgJson: File) => {
	// get the workspace globs
	const globs = z
		.string()
		.array()
		.catch([])
		.parse(wsPkgJson.content.workspaces)
		.map((g) => `${path.dirname(wsPkgJson.path)}/${g}/package.json`);
	// glob the workspace paths
	// add package.json to the dirs and filter out any that don't exist (e.g. packages/* may match packages/some-dir but if some-dir doesn't have a package.json we don't want it)
	const pkgJsons = globs
		.map((g) => fg.globSync(g))
		.reduce((acc, val) => acc.concat(val), []);
	return pkgJsons;
};

const getDeps = (pkgJson: File) => {
	const deps = Object.keys(
		z.record(z.string()).catch({}).parse(pkgJson.content.dependencies),
	);
	const devDeps = Object.keys(
		z.record(z.string()).catch({}).parse(pkgJson.content.devDependencies),
	);
	return [...new Set([...deps, ...devDeps])];
};

const getWsPkgNames = (wsPkgJsons: string[]) => {
	const wsPkgNames = wsPkgJsons.map((p) =>
		z.string().parse(readFile(p).content.name),
	);
	return wsPkgNames;
};

const getRefs = (tsconfigJson: File) => {
	const refs = z
		.array(z.record(z.string()))
		.catch([])
		.parse(tsconfigJson.content.references);
	return refs
		.map((r) => get(r, "path"))
		.map((p) => {
			// ref paths can point at a tsconfig OR a dir containing a tsconfig. If it's a dir, add /tsconfig.json
			if (p.endsWith(".json")) {
				return p;
			}
			return `${p}/tsconfig.json`;
		});
};

const getPkgName = (pkgJson: File) => {
	return z.string().parse(pkgJson.content.name);
};

const main = async (args: {
	pkgJsonPath: string;
}) => {
	// pkgJsonPath points to the package.json file
	const pkgJsonPath = args.pkgJsonPath;
	const pkgJson = readFile(pkgJsonPath);

	// check the pkg json is a workspace
	if (pkgJson.content.workspaces === undefined) {
		throw new Error(`${pkgJson.path} is not a workspace`);
	}

	// list all the pkgs in the workspace
	const wsPkgNames = getWsPkgNames(getPkgJsonPaths(pkgJson));

	// for each package in the workspace, check their version matches the workspace version
	const globs = [
		pkgJsonPath, // include the workspace package.json
		...z
			.string()
			.array()
			.parse(pkgJson.content.workspaces)
			.map((g) => `${path.dirname(pkgJsonPath)}/${g}/package.json`),
	];
	const pths = fg.globSync(globs);
	let ok = true;
	for (const pth of pths) {
		const result = await check({
			pkgJson: readFile(pth),
			wsPkgNames,
		});
		ok = ok && result;
	}
	if (!ok) {
		throw new Error("Refs and deps not in sync");
	}
};

const check = async (args: {
	pkgJson: File;
	wsPkgNames: string[];
}) => {
	const pkgJson = args.pkgJson;
	const wsPkgNames = args.wsPkgNames;
	const pkgDir = path.dirname(pkgJson.path);
	// get the deps for this package
	// filter deps to those in the workspace
	const deps = getDeps(pkgJson)
		.filter((d) => {
			return wsPkgNames.includes(d);
		})
		.filter((d) => {
			// ignore @prosopo/config pkg bc circular dep
			return d !== "@prosopo/config";
		});
	// console.log('deps', deps)

	let ok = true;
	// find all tsconfig files in the same dir as the package.json
	const tsconfigPaths = fg.globSync(`${pkgDir}/tsconfig{,.cjs}.json`);
	for (const tsconfigPath of tsconfigPaths) {
		console.log(`Checking ${tsconfigPath} against ${pkgJson.path}`);
		// read the tsconfig json
		const tsconfigJson = readFile(tsconfigPath);
		// get the tsconfig references
		const refs = getRefs(tsconfigJson);
		// convert them to package names, e.g. ../common => @prosopo/common
		const refPkgNames = refs
			.map((p) => {
				// get the dir for the package
				const refPath = path.dirname(p);
				// read the package.json in the dir
				const pkgJson = readFileWhy(
					`${pkgDir}/${refPath}/package.json`,
					`specified in ${tsconfigPath}`,
				);
				return getPkgName(pkgJson);
			})
			.filter((p) => {
				// ignore @prosopo/config pkg bc circular dep
				return p !== "@prosopo/config";
			});
		// console.log('refPkgNames', refPkgNames)
		// check all the refs are in the deps
		// e.g. a dep might be in the pkg json but not specified in the tsconfig
		const missingRefs: string[] = refPkgNames.filter((r) => !deps.includes(r));
		// check all the deps are in the refs
		// e.g. a ref might be in the tsconfig but not in the pkg json
		const missingDeps: string[] = deps.filter((d) => !refPkgNames.includes(d));
		for (const missingRef of missingRefs) {
			console.log(`${missingRef} ref not needed in ${tsconfigPath}`);
		}
		for (const missingDep of missingDeps) {
			console.log(`${missingDep} ref missing from ${tsconfigPath}`);
		}
		ok = ok && missingRefs.length === 0 && missingDeps.length === 0;
	}
	if (!ok) {
		console.log();
	}
	return ok;
};

main({
	pkgJsonPath: z.string().parse(process.argv[2]),
});
