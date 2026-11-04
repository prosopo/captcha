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

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadJSONFile, writeJSONFile } from "../files.js";

describe("writeJSONFile", () => {
	let dir: string;

	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-files-"));
	});

	afterEach(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	it("round-trips through loadJSONFile", async () => {
		const file = path.join(dir, "out.json");
		await writeJSONFile(file, { a: [1, "b"] });
		expect(loadJSONFile(file)).toEqual({ a: [1, "b"] });
	});

	it("writes bigints as decimal strings instead of throwing", async () => {
		const file = path.join(dir, "big.json");
		await writeJSONFile(file, { n: 12345678901234567890n });
		expect(loadJSONFile(file)).toEqual({ n: "12345678901234567890" });
	});

	it("rejects a cycle without creating the file", async () => {
		const file = path.join(dir, "cyclic.json");
		const cyclic: Record<string, unknown> = {};
		cyclic.self = cyclic;
		await expect(writeJSONFile(file, cyclic)).rejects.toThrow(/stringify/);
		expect(fs.existsSync(file)).toBe(false);
	});
});

describe("loadJSONFile", () => {
	it("throws a FILE_ERROR for invalid JSON", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-files-"));
		try {
			const file = path.join(dir, "bad.json");
			fs.writeFileSync(file, "{not json");
			expect(() => loadJSONFile(file)).toThrow(
				expect.objectContaining({ code: "FILE_ERROR" }),
			);
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});
});
