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
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fetchWithETag } from "../fetchWithEtag.js";

describe("fetchWithEtag integration", () => {
	let server: { close: () => void };
	let baseUrl: string;

	beforeAll(() => {
		return new Promise<void>((resolve) => {
			const http = await import("node:http");
			server = http.createServer((req, res) => {
				const etag = req.headers["if-none-match"];
			if (etag === '"test-etag"') {
				res.writeHead(304, { "ETag": '"test-etag"' });
				res.end();
			} else {
				res.writeHead(200, {
					"Content-Type": "text/plain",
					"ETag": '"test-etag"',
				});
				res.end("test content");
			}
		});
		server.listen(0, () => {
			const address = server.address();
			if (address && typeof address === "object") {
				baseUrl = `http://localhost:${address.port}`;
			}
			resolve();
		});
	});
	});

	afterAll(() => {
		return new Promise<void>((resolve) => {
			server.close(() => {
				resolve();
			});
		});
	});

	it("fetches content without etag", async () => {
		const result = await fetchWithETag(`${baseUrl}/test`, null);
		expect(result.content).toBe("test content");
		expect(result.etag).toBe("test-etag");
		expect(result.notModified).toBe(false);
	});

	it("returns notModified when etag matches", async () => {
		const result = await fetchWithETag(`${baseUrl}/test`, "test-etag");
		expect(result.content).toBe(null);
		expect(result.etag).toBe(null);
		expect(result.notModified).toBe(true);
	});

	it("fetches content when etag does not match", async () => {
		const result = await fetchWithETag(`${baseUrl}/test`, "different-etag");
		expect(result.content).toBe("test content");
		expect(result.etag).toBe("test-etag");
		expect(result.notModified).toBe(false);
	});
});


