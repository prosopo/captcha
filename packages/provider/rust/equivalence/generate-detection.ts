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

// Writes detection-vectors.json: bundlePool.ts loading directories built to be awkward (bundles
// without secrets, bad JSON, dotfiles, other extensions, directories named like bundles,
// invalid UTF-8, release stamps of every kind, ids whose UTF-8 and UTF-16 orders differ), and
// persisting pools over directories that already hold files. Entries are logged in directory
// order, which the filesystem decides, so the Rust compares the logs as a set; a failed load is
// recorded without its error text, which is the parser's. Run on Node 24.
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	DetectorBundlePool,
	type PoolBundle,
	persistDetectorBundlePool,
} from "../../src/tasks/detection/bundlePool.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(
		`this generator must run on Node 24 (the production runtime), not ${process.version}`,
	);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** A file as hex, so invalid UTF-8 survives, or a directory. */
type Entry = { hex: string } | { dir: true };

const text = (value: string): Entry => ({
	hex: Buffer.from(value, "utf8").toString("hex"),
});
const json = (value: Json): Entry => text(JSON.stringify(value));
const bytes = (value: number[]): Entry => ({
	hex: Buffer.from(value).toString("hex"),
});
const directory: Entry = { dir: true };

const writeTree = (dir: string, entries: Record<string, Entry>): void => {
	for (const [name, entry] of Object.entries(entries)) {
		if ("dir" in entry) {
			mkdirSync(join(dir, name));
		} else {
			writeFileSync(join(dir, name), Buffer.from(entry.hex, "hex"));
		}
	}
};

const bundle = (
	id: string,
	secrets: Json,
	js = `JS-${id}`,
): Record<string, Entry> => ({
	[`${id}.js`]: text(js),
	[`${id}.json`]: json(secrets),
});

const loadTrees: { name: string; entries: Record<string, Entry> }[] = [
	{
		name: "paired, orphaned and malformed",
		entries: {
			...bundle("bundle-0", { privateKey: "PK0", innerConfig: "C0" }),
			...bundle("bundle-1", { privateKey: "PK1", innerConfig: "C1" }),
			"orphan.js": text("JS"),
			...bundle("bad-shape", { privateKey: "PK" }),
			"bad-json.js": text("JS"),
			"bad-json.json": text("{not json"),
			"manifest.json": json({ count: 1 }),
		},
	},
	{
		name: "names and extensions",
		entries: {
			...bundle(".hidden", { privateKey: "PK", innerConfig: "C" }),
			".js": text("dotfile named .js"),
			".json": json({ privateKey: "PK", innerConfig: "C" }),
			"UPPER.JS": text("JS"),
			"UPPER.json": json({ privateKey: "PK", innerConfig: "C" }),
			...bundle("a.b", { privateKey: "PK", innerConfig: "C" }),
			"dir.js": directory,
			"dir.json": json({ privateKey: "PK", innerConfig: "C" }),
			...bundle("json-dir", { privateKey: "PK", innerConfig: "C" }),
			"plain.txt": text("not a bundle"),
			noext: text("JS"),
		},
	},
	{
		name: "id ordering",
		entries: {
			...bundle("z", { privateKey: "PK", innerConfig: "C" }),
			...bundle("A", { privateKey: "PK", innerConfig: "C" }),
			...bundle("a", { privateKey: "PK", innerConfig: "C" }),
			...bundle("ü", { privateKey: "PK", innerConfig: "C" }),
			...bundle("ﬁ", { privateKey: "PK", innerConfig: "C" }),
			...bundle("😀", { privateKey: "PK", innerConfig: "C" }),
			...bundle("10", { privateKey: "PK", innerConfig: "C" }),
			...bundle("9", { privateKey: "PK", innerConfig: "C" }),
			...bundle("-", { privateKey: "PK", innerConfig: "C" }),
		},
	},
	{
		name: "secrets of every shape",
		entries: {
			...bundle("empty-strings", { privateKey: "", innerConfig: "" }),
			...bundle("numeric-key", { privateKey: 7, innerConfig: "C" }),
			...bundle("null-config", { privateKey: "PK", innerConfig: null }),
			...bundle("all-fields", {
				privateKey: "PK",
				innerConfig: "C",
				release: "3.6.64",
				payloadLayout: "TFY=",
				keyMap: "S00=",
				extra: { nested: true },
			}),
			...bundle("empty-optionals", {
				privateKey: "PK",
				innerConfig: "C",
				release: "",
				payloadLayout: "",
				keyMap: "",
			}),
			...bundle("numeric-optionals", {
				privateKey: "PK",
				innerConfig: "C",
				release: 3.6,
				payloadLayout: 1,
				keyMap: false,
			}),
			...bundle("stale", {
				privateKey: "PK",
				innerConfig: "C",
				release: "3.6.10",
			}),
			...bundle("unstamped", { privateKey: "PK", innerConfig: "C" }),
			"array.js": text("JS"),
			"array.json": json(["PK", "C"]),
			"null.js": text("JS"),
			"null.json": text("null"),
			"string.js": text("JS"),
			"string.json": json("PK"),
			"bom.js": text("JS"),
			"bom.json": text(
				`﻿${JSON.stringify({ privateKey: "PK", innerConfig: "C" })}`,
			),
			"duplicate.js": text("JS"),
			"duplicate.json": text(
				'{"privateKey":"first","innerConfig":"C","privateKey":"second"}',
			),
			"escapes.js": text("JS"),
			"escapes.json": text(
				'{"privateKey":"P\\u004b\\n\\"\\\\","innerConfig":"\\u00e9"}',
			),
		},
	},
	{
		name: "file contents",
		entries: {
			"invalid-utf8.js": bytes([
				0x4a, 0xff, 0x53, 0xc3, 0x28, 0xed, 0xa0, 0x80,
			]),
			"invalid-utf8.json": json({ privateKey: "PK", innerConfig: "C" }),
			"bom-js.js": text("﻿JS with a BOM"),
			"bom-js.json": json({ privateKey: "PK", innerConfig: "C" }),
			"empty.js": text(""),
			"empty.json": json({ privateKey: "PK", innerConfig: "C" }),
			"unicode.js": text("é€😀\r\n\u0000"),
			"unicode.json": json({ privateKey: "PK", innerConfig: "C" }),
		},
	},
];

const expectedReleases: (string | undefined)[] = [undefined, "", "3.6.64"];

type Logged = { level: string; msg: string; data: Json };

const recordingLogger = (dir: string, out: Logged[]) => {
	const scrub = (data: Record<string, unknown> | undefined): Json =>
		JSON.parse(
			JSON.stringify(data ?? null)
				.split(JSON.stringify(dir).slice(1, -1))
				.join("<dir>"),
		);
	return {
		info: (msg: string, data?: Record<string, unknown>) =>
			out.push({ level: "info", msg, data: scrub(data) }),
		warn: (msg: string, data?: Record<string, unknown>) =>
			out.push({ level: "warn", msg, data: scrub(data) }),
	};
};

const describePool = (pool: DetectorBundlePool): Json => {
	const bundles: Json[] = [];
	for (let i = 0; i < pool.size(); i++) {
		const { bundleId, bundle } = pool.at(i);
		bundles.push({
			id: bundleId,
			...(bundle as unknown as { [key: string]: Json }),
		});
	}
	return bundles;
};

const loads: Json[] = [];
for (const tree of loadTrees) {
	for (const expectedRelease of expectedReleases) {
		const dir = mkdtempSync(join(tmpdir(), "pool-vectors-"));
		writeTree(dir, tree.entries);
		const logs: Logged[] = [];
		const pool = new DetectorBundlePool();
		pool.loadFromDir(dir, recordingLogger(dir, logs), expectedRelease);
		loads.push({
			name: tree.name,
			entries: tree.entries as unknown as Json,
			expectedRelease: expectedRelease ?? null,
			pool: describePool(pool),
			logs: logs.map((log) =>
				log.msg.startsWith("failed to load")
					? {
							...log,
							data: { bundleId: (log.data as { bundleId: string }).bundleId },
						}
					: log,
			),
		});
		rmSync(dir, { recursive: true, force: true });
	}
}
{
	const logs: Logged[] = [];
	const missing = join(tmpdir(), "pool-vectors-does-not-exist");
	const pool = new DetectorBundlePool();
	pool.loadFromDir(missing, recordingLogger(missing, logs));
	loads.push({
		name: "missing directory",
		entries: null,
		expectedRelease: null,
		pool: describePool(pool),
		logs,
	});
}

const persistCases: {
	name: string;
	before: Record<string, Entry>;
	bundles: [string, PoolBundle][];
}[] = [
	{
		name: "into an empty directory",
		before: {},
		bundles: [["b", { js: "JS", privateKey: "PK", innerConfig: "C" }]],
	},
	{
		name: "over a previous pool and other files",
		before: {
			"old.js": text("OLD"),
			"old.json": json({ privateKey: "OPK", innerConfig: "OC" }),
			"manifest.json": json({ count: 1 }),
			"keep.txt": text("kept"),
			".hidden.json": json({}),
			".dotjs": text("kept"),
			"new.js": text("stale content of a bundle being rewritten"),
		},
		bundles: [
			["new", { js: "NJS", privateKey: "NPK", innerConfig: "NC" }],
			[
				"full",
				{
					js: "é€😀",
					privateKey: 'quote" backslash\\ newline\n tab\t nul\u0000 del\u007f',
					innerConfig: "  ",
					release: "3.6.64",
					payloadLayout: "TFY=",
					keyMap: "S00=",
				},
			],
			[
				"empties",
				{
					js: "",
					privateKey: "",
					innerConfig: "",
					release: "",
					payloadLayout: "",
					keyMap: "",
				},
			],
		],
	},
	{
		name: "an empty pool",
		before: {
			"old.js": text("OLD"),
			"old.json": json({ privateKey: "OPK", innerConfig: "OC" }),
		},
		bundles: [],
	},
];

const listing = (dir: string): Json =>
	readdirSync(dir)
		.sort()
		.map((name) => {
			const path = join(dir, name);
			const stat = statSync(path);
			return {
				name,
				mode: stat.mode & 0o777,
				...(stat.isDirectory()
					? { dir: true }
					: { hex: readFileSync(path).toString("hex") }),
			};
		});

const persists: Json[] = [];
for (const c of persistCases) {
	const dir = mkdtempSync(join(tmpdir(), "pool-persist-vectors-"));
	writeTree(dir, c.before);
	const inode = statSync(dir).ino;
	persistDetectorBundlePool(new Map(c.bundles), dir);
	persists.push({
		name: c.name,
		before: c.before as unknown as Json,
		bundles: c.bundles as unknown as Json,
		after: listing(dir),
		sameDirectory: statSync(dir).ino === inode,
	});
	rmSync(dir, { recursive: true, force: true });
}

const out = fileURLToPath(new URL("detection-vectors.json", import.meta.url));
writeFileSync(
	out,
	`${JSON.stringify({ umask: process.umask(), loads, persists }, null, "\t")}\n`,
);
console.log(
	`wrote ${loads.length} loads and ${persists.length} persists to ${out}`,
);
