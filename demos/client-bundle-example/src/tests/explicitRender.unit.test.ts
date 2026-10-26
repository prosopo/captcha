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
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// `render()` resolves to the widget id; a demo that uses its return value
// without awaiting it prints "[object Promise]" instead of the id.
const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const pagesCallingRender: string[] = fs
	.readdirSync(srcDir)
	.filter((file: string) => file.endsWith(".html"))
	.filter((file: string) =>
		/\brender\(/.test(fs.readFileSync(path.join(srcDir, file), "utf8")),
	);

describe("explicit-render demo pages", () => {
	it("finds pages to check", () => {
		expect(pagesCallingRender.length).toBeGreaterThan(0);
	});

	it.each(pagesCallingRender)("%s awaits render()", (file: string) => {
		const html = fs.readFileSync(path.join(srcDir, file), "utf8");
		const unawaited: string[] = html
			.split("\n")
			.filter(
				(line: string) =>
					/(?<![.\w])render\(/.test(line) &&
					!/await\s+render\(/.test(line) &&
					!/function\s+render\(/.test(line),
			)
			.map((line: string) => line.trim());
		expect(unawaited).toEqual([]);
	});
});
