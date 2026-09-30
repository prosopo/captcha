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

import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { getPair } from "@prosopo/keyring";
import type { KeyringPair } from "@prosopo/types";
import express, { type Request, type Response } from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { detectorPoolBodyParser } from "../../../api/detectorPoolBodyParser.js";

const PATH = "/v1/prosopo/provider/admin/detector-pool";

describe("detectorPoolBodyParser", () => {
	let server: Server;
	let baseUrl: string;
	let admin: KeyringPair;
	let stranger: KeyringPair;
	let parsedBytes: number | undefined;

	beforeAll(async () => {
		admin = getPair(
			"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			undefined,
			"sr25519",
			42,
		);
		stranger = getPair("//Bob", undefined, "sr25519", 42);

		// Same layering as the provider: the large parser on the pool path, then
		// the small default parser for everything, then the (here, stubbed) route.
		const app = express();
		app.use(PATH, detectorPoolBodyParser("4mb", admin, undefined));
		app.use(express.json({ limit: "1kb" }));
		app.post(PATH, (req: Request, res: Response) => {
			parsedBytes = JSON.stringify(req.body).length;
			res.json({ ok: true });
		});
		server = app.listen(0, "127.0.0.1");
		await new Promise<void>((resolve) => server.once("listening", resolve));
		const address: AddressInfo | string | null = server.address();
		if (address === null || typeof address === "string")
			throw new Error("test server has no TCP address");
		baseUrl = `http://127.0.0.1:${address.port}`;
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	const push = (authorization?: string): Promise<globalThis.Response> => {
		parsedBytes = undefined;
		return fetch(`${baseUrl}${PATH}`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				...(authorization ? { authorization } : {}),
			},
			body: JSON.stringify({ pool: "x".repeat(64 * 1024) }),
		});
	};

	it("parses a large pool body for a valid admin JWT", async () => {
		const res = await push(`Bearer ${admin.jwtIssue()}`);
		expect(res.status).toBe(200);
		expect(parsedBytes).toBeGreaterThan(64 * 1024);
	});

	it("does not parse a large body for a request without a JWT", async () => {
		const res = await push();
		expect(res.status).toBe(413);
		expect(parsedBytes).toBeUndefined();
	});

	it("does not parse a large body for a JWT from another key", async () => {
		const res = await push(`Bearer ${stranger.jwtIssue()}`);
		expect(res.status).toBe(413);
		expect(parsedBytes).toBeUndefined();
	});

	it("does not parse a large body for a malformed JWT", async () => {
		const res = await push("Bearer not-a-jwt");
		expect(res.status).toBe(413);
		expect(parsedBytes).toBeUndefined();
	});
});
