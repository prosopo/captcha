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
import { readJsonFile } from "../utils/readJsonFile.js";

describe("readJsonFile", () => {
	let dir: string;

	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), "datasets-fs-json-"));
	});

	afterEach(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	const write = (name: string, text: string): string => {
		const file = path.join(dir, name);
		fs.writeFileSync(file, text);
		return file;
	};

	it("parses a JSON file", () => {
		expect(readJsonFile(write("ok.json", '{"items":[1]}'))).toEqual({
			items: [1],
		});
	});

	it("names the file when it is not JSON", () => {
		const file = write("bad.json", "{not json");
		expect(() => readJsonFile(file)).toThrow(file);
	});

	it("reads large integers as numbers, as the dataset schemas expect", () => {
		expect(readJsonFile(write("big.json", "[9007199254740993]"))).toEqual([
			9007199254740992,
		]);
	});
});
