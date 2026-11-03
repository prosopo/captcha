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

import type { AddressInfo } from "node:net";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assetDocumentRouter } from "../../../api/assetDocument.js";

let origin: string;
let server: ReturnType<express.Express["listen"]>;

beforeAll(async () => {
	const app = express();
	app.use(assetDocumentRouter());
	app.use((_req, res) => {
		res.status(404).send("fell through");
	});
	await new Promise<void>((resolve) => {
		server = app.listen(0, "127.0.0.1", () => resolve());
	});
	const address = server.address() as AddressInfo;
	origin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
	await new Promise<void>((resolve) => server.close(() => resolve()));
});

const get = async (
	query: string,
): Promise<{ status: number; body: string }> => {
	const res = await fetch(`${origin}/whatever-path${query}`);
	return { status: res.status, body: await res.text() };
};

describe("assetDocumentRouter", () => {
	it("serves the document on any path when the query matches", async () => {
		const res = await get("?m=n&u=https%3A%2F%2Fexample.com%2Fa&i=abc123");
		expect(res.status).toBe(200);
		expect(res.body).toContain('f.src="https://example.com/a"');
		expect(res.body).toContain('i:"abc123"');
	});

	it("falls through when the query does not match", async () => {
		expect((await get("")).status).toBe(404);
		expect((await get("?m=n")).status).toBe(404);
		expect((await get("?m=x&u=https%3A%2F%2Fexample.com%2Fa")).status).toBe(
			404,
		);
	});

	it("refuses a non-http inner url", async () => {
		expect((await get("?m=n&u=javascript%3Aalert(1)")).status).toBe(404);
		expect((await get("?m=n&u=data%3Atext%2Fhtml%2Chi")).status).toBe(404);
	});

	it("does not let the probe id break out of the script", async () => {
		const res = await get(
			"?m=n&u=https%3A%2F%2Fexample.com%2Fa&i=%3C%2Fscript%3E%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E",
		);
		expect(res.status).toBe(200);
		expect(res.body).not.toContain("</script><img");
		expect(res.body).not.toContain("onerror");
		expect(res.body).toContain('i:""');
	});

	it("does not let the inner url break out of the script", async () => {
		const res = await get(
			"?m=n&u=https%3A%2F%2Fexample.com%2F%3C%2Fscript%3E%3Cimg%20src%3Dx%3E&i=abc",
		);
		expect(res.status).toBe(200);
		expect(res.body).not.toContain("</script><img");
		expect(res.body.split("</script>").length).toBe(2);
	});
});
