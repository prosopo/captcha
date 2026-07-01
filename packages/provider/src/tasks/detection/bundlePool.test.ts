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

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	DetectorBundlePool,
	getDetectorBundlePool,
	initDetectorBundlePool,
} from "./bundlePool.js";

const writeBundle = (
	dir: string,
	id: string,
	js: string,
	secrets: { privateKey?: string; innerConfig?: string } | string,
): void => {
	writeFileSync(join(dir, `${id}.js`), js);
	writeFileSync(
		join(dir, `${id}.json`),
		typeof secrets === "string" ? secrets : JSON.stringify(secrets),
	);
};

describe("DetectorBundlePool", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "pool-"));
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("loads paired js/json bundles", () => {
		writeBundle(dir, "bundle-0", "JS0", {
			privateKey: "PK0",
			innerConfig: "C0",
		});
		writeBundle(dir, "bundle-1", "JS1", {
			privateKey: "PK1",
			innerConfig: "C1",
		});

		const pool = new DetectorBundlePool();
		pool.loadFromDir(dir);

		expect(pool.size()).toBe(2);
		expect(pool.get("bundle-0")).toEqual({
			js: "JS0",
			privateKey: "PK0",
			innerConfig: "C0",
		});
		expect(pool.get("bundle-1")?.js).toBe("JS1");
		expect(pool.get("missing")).toBeUndefined();
	});

	it("skips a js file with no json sibling", () => {
		writeFileSync(join(dir, "orphan.js"), "JS");
		writeBundle(dir, "ok", "JS", { privateKey: "PK", innerConfig: "C" });

		const pool = new DetectorBundlePool();
		pool.loadFromDir(dir);

		expect(pool.size()).toBe(1);
		expect(pool.get("ok")).toBeDefined();
		expect(pool.get("orphan")).toBeUndefined();
	});

	it("skips malformed secrets and invalid json", () => {
		writeBundle(dir, "bad-shape", "JS", { privateKey: "PK" }); // missing innerConfig
		writeBundle(dir, "bad-json", "JS", "{not json");
		writeBundle(dir, "good", "JS", { privateKey: "PK", innerConfig: "C" });

		const pool = new DetectorBundlePool();
		pool.loadFromDir(dir);

		expect(pool.size()).toBe(1);
		expect(pool.get("good")).toBeDefined();
	});

	it("ignores non-js files", () => {
		writeFileSync(join(dir, "manifest.json"), JSON.stringify({ count: 1 }));
		writeBundle(dir, "b", "JS", { privateKey: "PK", innerConfig: "C" });

		const pool = new DetectorBundlePool();
		pool.loadFromDir(dir);
		expect(pool.size()).toBe(1);
	});

	it("yields an empty pool for a missing directory", () => {
		const pool = new DetectorBundlePool();
		pool.loadFromDir(join(dir, "does-not-exist"));
		expect(pool.size()).toBe(0);
		expect(() => pool.pickRandom()).toThrow(/empty/);
	});

	it("pickRandom returns valid pool members and covers the pool over many draws", () => {
		for (let i = 0; i < 5; i++) {
			writeBundle(dir, `bundle-${i}`, `JS${i}`, {
				privateKey: `PK${i}`,
				innerConfig: `C${i}`,
			});
		}
		const pool = new DetectorBundlePool();
		pool.loadFromDir(dir);

		const seen = new Set<string>();
		for (let i = 0; i < 500; i++) {
			const { bundleId, bundle } = pool.pickRandom();
			expect(pool.get(bundleId)).toBe(bundle);
			seen.add(bundleId);
		}
		// With 5 bundles over 500 uniform draws every id should appear.
		expect(seen.size).toBe(5);
	});

	it("replace hot-swaps the pool", () => {
		writeBundle(dir, "old", "JS", { privateKey: "PK", innerConfig: "C" });
		const pool = new DetectorBundlePool();
		pool.loadFromDir(dir);
		expect(pool.get("old")).toBeDefined();

		pool.replace(
			new Map([["new", { js: "NJS", privateKey: "NPK", innerConfig: "NC" }]]),
		);
		expect(pool.get("old")).toBeUndefined();
		expect(pool.get("new")?.js).toBe("NJS");
		expect(pool.size()).toBe(1);
	});

	it("initialises and exposes the global singleton", () => {
		writeBundle(dir, "b", "JS", { privateKey: "PK", innerConfig: "C" });
		const pool = initDetectorBundlePool(dir);
		expect(getDetectorBundlePool()).toBe(pool);
		expect(getDetectorBundlePool()?.size()).toBe(1);
	});
});
