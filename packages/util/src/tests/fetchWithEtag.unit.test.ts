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

import { afterEach, describe, expect, test, vi } from "vitest";
import { fetchWithETag } from "../fetchWithEtag.js";

const respond = (headers: Record<string, string>) =>
	vi
		.spyOn(globalThis, "fetch")
		.mockResolvedValue(new Response("body", { status: 200, headers }));

describe("fetchWithETag content length", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("reads a well-formed content-length", async () => {
		respond({ "content-length": "42" });
		expect((await fetchWithETag("https://x.test", null)).contentLength).toBe(
			42,
		);
	});

	test.each(["12abc", "-1", "1.5", ""])(
		"ignores malformed content-length %s",
		async (value) => {
			respond({ "content-length": value });
			expect(
				(await fetchWithETag("https://x.test", null)).contentLength,
			).toBeUndefined();
		},
	);

	test("leaves content-length unset when the header is absent", async () => {
		respond({});
		expect(
			(await fetchWithETag("https://x.test", null)).contentLength,
		).toBeUndefined();
	});
});
