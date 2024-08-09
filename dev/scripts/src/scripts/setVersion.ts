import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "@iarna/toml";
import { loadEnv } from "@prosopo/cli";
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
import { getLogLevel, getLogger } from "@prosopo/common";
import { getRootDir } from "@prosopo/config";

// We have to load env here if we're importing this file from cli/index.ts, otherwise, the env is loaded after the
// logger is created
loadEnv();
const logLevel = getLogLevel();
const log = getLogger(logLevel, "setVersion");
log.info("Log level:", logLevel);

const parseVersion = (version: string) => {
	try {
		const parts = version.split(".");
		if (parts.length !== 3) {
			throw new Error();
		}
		let [major, minor, patch] = parts;
		major = Number.parseInt(major ?? "").toString();
		minor = Number.parseInt(minor ?? "").toString();
		patch = Number.parseInt(patch ?? "").toString();
		if (major === "NaN" || minor === "NaN" || patch === "NaN") {
			throw new Error();
		}
		return `${major}.${minor}.${patch}`;
	} catch (e) {
		throw new Error("Version must be in the format of x.y.z");
	}
};

const find = (pth: string, filter: (pth: string) => boolean): string[] => {
	const files = fs.readdirSync(pth);
	const results: string[] = [];
	for (const file of files) {
		const fullPath = path.join(pth, file);
		if (filter(fullPath)) {
			results.push(fullPath);
		}
		try {
			if (fs.statSync(fullPath).isDirectory()) {
				results.push(...find(fullPath, filter));
			}
		} catch (e) {
			log.debug("Not a directory: {fullPath}");
		}
	}
	return results;
};

export default async function setVersion(versionIn: string, ignore?: string[]) {
	log.info("Setting version to ", versionIn);
	const version = parseVersion(versionIn);
	const root = getRootDir();
	const ignorePaths = ["node_modules", "cargo-cache", ...(ignore ?? [])];
	log.debug("Ignoring paths: ", ignorePaths);
	// walk through all files finding .json or .toml
	const files = find(root, (pth) => {
		// ignore node_modules and any user specified paths
		if (ignorePaths.some((ignorePath) => pth.includes(ignorePath))) {
			return false;
		}
		const basename = path.basename(pth);
		return basename === "package.json" || basename === "Cargo.toml";
	});
	// split into json and toml
	// biome-ignore lint/complexity/noForEach: TODO fix
	files
		.filter((pth) => path.extname(pth) === ".json")
		.forEach((pth) => {
			log.debug("setting version in", pth);
			const content = fs.readFileSync(pth, "utf8");
			// replace version in all json files
			const jsonContent = JSON.parse(content);
			if (jsonContent.version) {
				// only replace if version is set
				jsonContent.version = version;
			}
			// go through dependencies
			for (const obj of [
				jsonContent.dependencies ?? {},
				jsonContent.devDependencies ?? {},
				jsonContent.peerDependencies ?? {},
			]) {
				// detect any prosopo dependencies
				for (const key of Object.keys(obj)) {
					if (key.startsWith("@prosopo") && !key.includes("typechain")) {
						// and replace version
						log.debug(`setting ${key} to ${version} in ${pth}`);
						obj[key] = version;
					}
				}
			}
			fs.writeFileSync(pth, `${JSON.stringify(jsonContent, null, 4)}\n`);
		});

	// replace version in tomls
	// biome-ignore lint/complexity/noForEach: TODO fix
	files
		.filter((pth) => path.extname(pth) === ".toml")
		.filter((pth) => {
			// ignore node_modules and any user specified paths
			return !ignorePaths.some((ignorePath) => pth.includes(ignorePath));
		})
		.forEach((pth) => {
			log.debug("setting version in", pth);
			const content = fs.readFileSync(pth, "utf8");
			// replace version in all toml files
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			const tomlContent: any = parse(content);
			if (tomlContent.workspace) {
				// biome-ignore lint/suspicious/noExplicitAny: TODO fix
				if ((tomlContent.workspace as any).version) {
					// biome-ignore lint/suspicious/noExplicitAny: TODO fix
					(tomlContent.workspace as any).version = version;
				}
			} else {
				// replace dependency versions in all toml files
				tomlContent.package.version = version;
			}
			fs.writeFileSync(pth, `${stringify(tomlContent)}\n`);
		});

	// go through tomls again now versions have updated and update the version field for dependencies with paths set, as we can follow the path to get the version
	// biome-ignore lint/complexity/noForEach: TODO fix
	files
		.filter((pth) => path.extname(pth) === ".toml")
		.forEach((pth) => {
			log.debug("setting dependency versions in", pth);
			const content = fs.readFileSync(pth, "utf8");
			// replace version in all toml files
			const tomlContent = parse(content);
			if (tomlContent.workspace) {
				// biome-ignore lint/suspicious/noExplicitAny: TODO fix
				if ((tomlContent.workspace as any).version) {
					// biome-ignore lint/suspicious/noExplicitAny: TODO fix
					(tomlContent.workspace as any).version = version;
				}
			} else {
				for (const obj of [
					tomlContent.dependencies ?? {},
					tomlContent["dev-dependencies"] ?? {},
				]) {
					// detect any prosopo dependencies
					for (const [key, value] of Object.entries(obj)) {
						if (value.path) {
							// trace path to get version
							path.join(value.path, "Cargo.toml");
							const depContent = fs.readFileSync(pth, "utf8");
							const depTomlContent = parse(depContent);
							value.version = depTomlContent.version;
						}
					}
				}
			}
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			fs.writeFileSync(pth, `${stringify(tomlContent as any)}\n`);
		});
}
