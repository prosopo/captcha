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

import { type Dirent, existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Every errorSites.ts in the workspace, so an errorId names exactly one throw.
const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const WORKSPACES = ["packages", "demos", "dev"];
const SITE = /^[A-Z0-9]+-[1-9][0-9]*$/;
const DECLARED = /"([^"]+)":\s*true/g;
const SKIPPED_DIRS = new Set(["node_modules", "dist", "tests"]);

interface SiteFile {
	readonly file: string;
	readonly sites: readonly string[];
}

const findFiles = (dir: string, matches: (name: string) => boolean): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry: Dirent) => {
		const full = join(dir, entry.name);
		if (entry.isDirectory())
			return SKIPPED_DIRS.has(entry.name) ? [] : findFiles(full, matches);
		return matches(entry.name) ? [full] : [];
	});

const packageDirs = (): string[] =>
	WORKSPACES.map((ws: string) => join(ROOT, ws))
		.filter((dir: string) => existsSync(dir))
		.flatMap((dir: string) =>
			readdirSync(dir, { withFileTypes: true })
				.filter((entry: Dirent) => entry.isDirectory())
				.map((entry: Dirent) => join(dir, entry.name)),
		);

const siteFiles = (): SiteFile[] =>
	packageDirs().flatMap((dir: string) =>
		findFiles(dir, (name: string) => name === "errorSites.ts").map(
			(file: string) => ({
				file,
				sites: [...readFileSync(file, "utf8").matchAll(DECLARED)].map(
					(match: RegExpMatchArray) => match[1] ?? "",
				),
			}),
		),
	);

const isSource = (name: string): boolean =>
	/\.tsx?$/.test(name) &&
	name !== "errorSites.ts" &&
	!/\.(test|test-d|spec)\.tsx?$/.test(name) &&
	!name.endsWith(".d.ts");

const usesIn = (dir: string, site: string): number =>
	findFiles(dir, isSource).reduce(
		(count: number, file: string) =>
			count + readFileSync(file, "utf8").split(`"${site}"`).length - 1,
		0,
	);

const prefixOf = (site: string): string => site.split("-")[0] ?? "";

describe("error sites", () => {
	const files = siteFiles();

	it("finds the workspace's site declarations", () => {
		expect(files.length).toBeGreaterThan(10);
	});

	it("names every site PREFIX-N", () => {
		const malformed = files.flatMap(({ sites }: SiteFile) =>
			sites.filter((site: string) => !SITE.test(site)),
		);
		expect(malformed).toEqual([]);
	});

	it("gives each declaring file a prefix of its own", () => {
		const owners = new Map<string, string>();
		const clashes: string[] = [];
		for (const { file, sites } of files) {
			for (const prefix of new Set(sites.map(prefixOf))) {
				const owner = owners.get(prefix);
				if (owner !== undefined && owner !== file)
					clashes.push(
						`${prefix}: ${relative(ROOT, owner)}, ${relative(ROOT, file)}`,
					);
				owners.set(prefix, file);
			}
		}
		expect(clashes).toEqual([]);
	});

	it("declares each site once", () => {
		const all = files.flatMap(({ sites }: SiteFile) => sites);
		const repeated = all.filter(
			(site: string, i: number) => all.indexOf(site) !== i,
		);
		expect(repeated).toEqual([]);
	});

	it("uses each declared site exactly once in its package's source", () => {
		const misused = files.flatMap(({ file, sites }: SiteFile) => {
			const dir = dirname(file);
			return sites
				.map((site: string) => ({ site, uses: usesIn(dir, site) }))
				.filter(({ uses }: { uses: number }) => uses !== 1)
				.map(
					({ site, uses }: { site: string; uses: number }) =>
						`${site} used ${uses}x in ${relative(ROOT, dir)}`,
				);
		});
		expect(misused).toEqual([]);
	});
});
