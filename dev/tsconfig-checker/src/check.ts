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

const getWsPkgNames = (wsPkgJsons: string[]) => {
	const wsPkgNames = wsPkgJsons.map((p) => z.string().parse(readFile(p).content.name));
	return wsPkgNames;
}

const getRefs = (tsconfigJson: File) => {
	const refs = z.array(z.record(z.string())).catch([]).parse(tsconfigJson.content.references);
	return refs.map((r) => get(r, "path")).map(p => {
		// ref paths can point at a tsconfig OR a dir containing a tsconfig. If it's a dir, add /tsconfig.json
		if(p.endsWith('.json')) {
			return p;
		}
		return `${p}/tsconfig.json`;
	});
}

const getPkgName = (pkgJson: File) => {
	return z.string().parse(pkgJson.content.name);
}

const main = async (args: {
	pkgJson: File;
	wsPkgNames?: string[];
}) => {
	// pkgJsonPath points to the package.json file
	const pkgJson = args.pkgJson;
	// console.log("pkgJson", pkgJson.path);
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
		// console.log('deps', deps)
	
		// find all tsconfig files in the same dir as the package.json
		const tsconfigPaths = fg.globSync(`${pkgDir}/tsconfig{,.cjs}.json`);
		for(const tsconfigPath of tsconfigPaths) {
			console.log()
			// console.log('tsconfigPath', tsconfigPath)
			// read the tsconfig json
			const tsconfigJson = readFile(tsconfigPath);
			// get the tsconfig references
			const refs = getRefs(tsconfigJson);
			// convert them to package names, e.g. ../common => @prosopo/common
			const refPkgNames = refs.map(p => {
				// get the dir for the package
				const refPath = path.dirname(p);
				// read the package.json in the dir
				const pkgJson = readFile(`${pkgDir}/${refPath}/package.json`);
				return getPkgName(pkgJson);
			})
			// console.log('refPkgNames', refPkgNames)
			// check all the refs are in the deps
			// e.g. a dep might be in the pkg json but not specified in the tsconfig
			const missingRefs: string[]= refPkgNames.filter((r) => !deps.includes(r))
			// check all the deps are in the refs
			// e.g. a ref might be in the tsconfig but not in the pkg json
			const missingDeps: string[] = deps.filter((d) => !refPkgNames.includes(d))
			for(const missingRef of missingRefs) {
				console.log(`${missingRef} ref in ${tsconfigPath} but not in ${pkgJson.path}`);
			}
			for(const missingDep of missingDeps) {
				console.log(`${missingDep} dep in ${pkgJson.path} but not in ${tsconfigPath}`);
			}
			if(missingRefs.length === 0 && missingDeps.length === 0) {
				console.log(`Refs and deps in sync for ${tsconfigPath} and ${pkgJson.path}`);
			} else {
				throw new Error(`Refs and deps not in sync in ${tsconfigPath} and ${pkgJson.path}`);
			}
		}
		console.log()
	}
	
};

process.argv = ['', '', '/home/geopro/bench/captcha5/packages/provider/package.json'];
main({
	pkgJson: {
		path: at(process.argv, 2),
		content: readJson(at(process.argv, 2)),
	},
});
