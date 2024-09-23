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
type File = { path: string, content: any }

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const readJson = (filePath: string): any => {
	return JSON.parse(fs.readFileSync(filePath, "utf8"))
}

const readFile = (filePath: string): File => {
	return {
		path: filePath,
		content: readJson(filePath),
	}
}

const findWs = (pkgJson: File): File => {
	let filePath = pkgJson.path;
	while(filePath !== '/package.json') {
		if (fs.existsSync(filePath)) {
			const file = readFile(filePath);
			if(file.content.workspaces) {
				return file;
			}
		}
		// go up a directory discovering package.json files until we find one
		filePath = path.resolve(path.dirname(filePath), '..', 'package.json');
	}
	throw new Error(`Could not find workspace for ${pkgJson.path}`);
}

const getPkgJsonPaths = (wsPkgJson: File) => {
	// get the workspace globs
	const globs = z.string().array().catch([]).parse(wsPkgJson.content.workspaces).map(g => `${path.dirname(wsPkgJson.path)}/${g}/package.json`);
	// glob the workspace paths
	// add package.json to the dirs and filter out any that don't exist (e.g. packages/* may match packages/some-dir but if some-dir doesn't have a package.json we don't want it)
	const pkgJsons = globs.map((g) => fg.globSync(g)).reduce((acc, val) => acc.concat(val), []);
	return pkgJsons;
}

const getDeps = (pkgJson: File) => {
	const deps = Object.keys(z.record(z.string()).catch({}).parse(pkgJson.content.dependencies));
	const devDeps = Object.keys(z.record(z.string()).catch({}).parse(pkgJson.content.devDependencies));
	return [...new Set([...deps, ...devDeps])];
}

const getPkgJsonPath = (wsPkgJson: File, pkgName: string) => {
	// get package dirs from the workspace
	const pkgJsonPaths = getPkgJsonPaths(wsPkgJson);
	// go through all the package dirs and match the package name to the one in the package.json
	for(const pkgJsonPath of pkgJsonPaths) {
		const pkgJson = readFile(pkgJsonPath);
		const name = z.string().parse(pkgJson.content.name);
		if(name === pkgName) {
			return pkgJsonPath;
		}
	}
	throw new Error(`Could not find package ${pkgName} in workspace ${wsPkgJson.content.name}`);
}

const getWsPkgNames = (wsPkgJsons: string[]) => {
	const wsPkgNames = wsPkgJsons.map((p) => z.string().parse(readFile(p).content.name));
	return wsPkgNames;
}

const main = async (args: {
	pkgJson: File;
	wsPkgNames?: string[];
}) => {
	// pkgJsonPath points to the package.json file
	const pkgJson = args.pkgJson;
	console.log("processing", pkgJson.path);
	const pkgDir = path.dirname(pkgJson.path);
	
	// if the workspace package json hasn't been passed in, try to find it
	const wsPkgJson = findWs(pkgJson);

	// if this package is the workspace, decend into the packages in the workspace
	if(wsPkgJson.path === pkgJson.path) {
		// get all the package.json files in the workspace
		const wsPkgJsonPaths = getPkgJsonPaths(wsPkgJson);
		// list all the pkgs in the workspace if the package belongs to a workspace
		const wsPkgNames = getWsPkgNames(wsPkgJsonPaths);
		// recurse into each package
		for(const wsPkgJson of wsPkgJsonPaths) {
			main({
				pkgJson: readFile(wsPkgJson),
				wsPkgNames,
			});
		}
	} else {
		// this pkg is a member of the workspace, check the deps/refs
		// get the deps for this package
		// filter deps to those in the workspace
		let wsPkgNames = args.wsPkgNames;
		if(!wsPkgNames) {
			// get all the package.json files in the workspace
			const wsPkgJsonPaths = getPkgJsonPaths(wsPkgJson);
			// list all the pkgs in the workspace if the package belongs to a workspace
			wsPkgNames = getWsPkgNames(wsPkgJsonPaths);
		}
		const deps = getDeps(pkgJson).filter(d => {
			return wsPkgNames.includes(d);
		});
		console.log('deps', deps)
	
		// find all tsconfig files in the same dir as the package.json
		const tsconfigPaths = fg.globSync(`${pkgDir}/tsconfig{,.cjs}.json`);
		for(const tsconfigPath of tsconfigPaths) {
			console.log('tsconfigPath', tsconfigPath)
			// read the tsconfig json
			const tsconfigJson = readJson(tsconfigPath);
			// get the tsconfig references
			const refs = z.array(z.record(z.string())).catch([]).parse(tsconfigJson.references);
			// convert them to package names, e.g. ../common => @prosopo/common
			const refPkgNames = refs.map((r) => get(r, "path")).map(p => {
				const pkgJson = readFile(`${pkgDir}/${p}/package.json`);
				return z.string().parse(pkgJson.content.name);
			})
			console.log('refPkgNames', refPkgNames)
			// check all the refs are in the deps
			for(const refPkgName of refPkgNames) {
				if(!deps.includes(refPkgName)) {
					throw new Error(`Reference ${refPkgName} not in deps`);
				}
			}
			// check all the deps are in the refs
			for(const dep of deps) {
				if(!refPkgNames.includes(dep)) {
					throw new Error(`Dep ${dep} not in refs`);
				}
			}
		}
	}
	
};

process.argv = ['', '', '/home/geopro/bench/captcha5/packages/provider/package.json'];
main({
	pkgJson: {
		path: at(process.argv, 2),
		content: readJson(at(process.argv, 2)),
	},
});
