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

// Writes padding-vectors.json: tarpitPadding.ts behind a real express app, answering bodies
// with `res.locals.padBytes` set to every kind of value. The pad itself is random, so what is
// recorded is the shape a client sees: the headers, the members' exact text in order, and the
// pad that precedes each. Run on Node 24.
import { writeFileSync } from "node:fs";
import { request } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { MAX_PAD_BYTES } from "@prosopo/types";
import express from "express";
import { padResponseMiddleware } from "../../src/utils/tarpitPadding.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(
		`this generator must run on Node 24 (the production runtime), not ${process.version}`,
	);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const bodies: Json[] = [
	{
		status: "ok",
		challenge: "0x1234",
		difficulty: 9,
		timestamp: "1764000000000",
	},
	{},
	{ b: 1, "2": { z: 1, "1": 2 }, a: [1, "x", null], "1": null, "01": true },
	{ s: 'é"\\\n 😀\u0000' },
	{ n: 1e21, f: 0.1, small: 0.000001, neg: -42, big: 12345678901234567000 },
	{ nested: { deeper: { deepest: [[[]]] } } },
	["a", "b"],
	"text",
];

const padBytesValues: (number | undefined)[] = [
	undefined,
	0,
	-1,
	Number.NaN,
	0.5,
	1,
	1.9,
	64,
	4096,
	Number.POSITIVE_INFINITY,
	MAX_PAD_BYTES * 10,
];

const app = express();
app.use(express.json());
app.post("/pad", padResponseMiddleware, (req, res) => {
	const { body, padBytes } = req.body as {
		body: Json;
		padBytes: number | string | null;
	};
	res.locals.padBytes =
		padBytes === null
			? undefined
			: typeof padBytes === "string"
				? Number(padBytes)
				: padBytes;
	res.json(body);
});
const server = app.listen(0);
await new Promise((resolve) => server.once("listening", resolve));
const { port } = server.address() as AddressInfo;

const post = (
	payload: string,
): Promise<{ headers: Record<string, unknown>; text: string }> =>
	new Promise((resolve, reject) => {
		const req = request(
			{
				port,
				method: "POST",
				path: "/pad",
				headers: { "content-type": "application/json" },
			},
			(res) => {
				const chunks: Buffer[] = [];
				res.on("data", (chunk: Buffer) => chunks.push(chunk));
				res.on("end", () =>
					resolve({
						headers: res.headers,
						text: Buffer.concat(chunks).toString("utf8"),
					}),
				);
			},
		);
		req.on("error", reject);
		req.end(payload);
	});

/** The members as JSON.stringify writes them, in the order they arrive on the wire, and the pads. */
const shape = (text: string, body: Json): Json => {
	if (typeof body !== "object" || body === null || Array.isArray(body))
		return { raw: text };
	const parsed = JSON.parse(text) as Record<string, Json>;
	const members = JSON.parse(JSON.stringify(body)) as Record<string, Json>;
	const encoded = Object.keys(members).map(
		(key) => `${JSON.stringify(key)}:${JSON.stringify(parsed[key])}`,
	);
	const pads = Object.keys(parsed)
		.filter((key) => !(key in members))
		.map((key) => (parsed[key] as string).length);
	return {
		members: encoded.sort((a, b) => text.indexOf(a) - text.indexOf(b)),
		pads: pads.length,
		total: pads.reduce((sum, pad) => sum + pad, 0),
	};
};

const cases: Json[] = [];
for (const body of bodies) {
	for (const padBytes of padBytesValues) {
		const wire =
			padBytes === undefined
				? null
				: Number.isFinite(padBytes)
					? padBytes
					: String(padBytes);
		const { headers, text } = await post(
			JSON.stringify({ body, padBytes: wire }),
		);
		cases.push({
			body,
			padBytes: wire,
			contentType: (headers["content-type"] as string | undefined) ?? null,
			chunked: headers["transfer-encoding"] === "chunked",
			etag: "etag" in headers,
			contentLength: "content-length" in headers,
			shape: shape(text, body),
		});
	}
}
server.close();

const out = fileURLToPath(new URL("padding-vectors.json", import.meta.url));
writeFileSync(
	out,
	`${JSON.stringify({ maxPadBytes: MAX_PAD_BYTES, cases }, null, "\t")}\n`,
);
console.log(`wrote ${cases.length} cases to ${out}`);
