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

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	DetectorLoaderFromScript,
	type DetectorType,
	type ModuleImporter,
} from "../detectorLoader.js";

const SCRIPT = "export default () => ({ token: 'x' });";

const detector = (() => undefined) as unknown as DetectorType;

describe("DetectorLoaderFromScript", () => {
	const created: string[] = [];
	const revoked: string[] = [];

	beforeEach(() => {
		created.length = 0;
		revoked.length = 0;
		let counter = 0;
		URL.createObjectURL = vi.fn((): string => {
			const url = `blob:https://example.test/${counter++}`;
			created.push(url);
			return url;
		});
		URL.revokeObjectURL = vi.fn((url: string): void => {
			revoked.push(url);
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("uses a blob URL when the import succeeds", async () => {
		const seen: string[] = [];
		const importer: ModuleImporter = async (url) => {
			seen.push(url);
			return { default: detector };
		};

		await expect(DetectorLoaderFromScript(SCRIPT, importer)).resolves.toBe(
			detector,
		);

		expect(seen).toHaveLength(1);
		expect(seen[0]).toMatch(/^blob:/);
		expect(revoked).toEqual(created);
	});

	it("falls back to a data URL when the blob import is blocked by CSP", async () => {
		const seen: string[] = [];
		const importer: ModuleImporter = async (url) => {
			seen.push(url);
			if (url.startsWith("blob:")) {
				// What Chrome throws when script-src omits blob:
				throw new TypeError("Failed to fetch dynamically imported module");
			}
			return { default: detector };
		};

		await expect(DetectorLoaderFromScript(SCRIPT, importer)).resolves.toBe(
			detector,
		);

		expect(seen).toHaveLength(2);
		expect(seen[0]).toMatch(/^blob:/);
		expect(seen[1]).toMatch(/^data:text\/javascript;charset=utf-8,/);
		expect(decodeURIComponent(seen[1]?.split(",")[1] ?? "")).toBe(SCRIPT);
	});

	it("revokes the blob URL even when its import fails", async () => {
		const importer: ModuleImporter = async (url) => {
			if (url.startsWith("blob:")) throw new Error("blocked");
			return { default: detector };
		};

		await DetectorLoaderFromScript(SCRIPT, importer);

		expect(revoked).toEqual(created);
	});

	it("rethrows the last error when both schemes are blocked", async () => {
		const importer: ModuleImporter = async (url) => {
			throw new Error(`blocked: ${url.slice(0, 5)}`);
		};

		await expect(DetectorLoaderFromScript(SCRIPT, importer)).rejects.toThrow(
			"blocked: data:",
		);
		expect(revoked).toEqual(created);
	});
});
