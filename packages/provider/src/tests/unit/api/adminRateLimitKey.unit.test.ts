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
import rateLimit from "express-rate-limit";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminRateLimitKey } from "../../../api/adminJwt.js";

const PATH = "/v1/prosopo/provider/admin/sitekey/register";

const unsignedToken = (sub: unknown): string =>
	`x.${Buffer.from(JSON.stringify({ sub })).toString("base64url")}.y`;

describe("adminRateLimitKey", () => {
	let server: Server;
	let baseUrl: string;
	let admin: KeyringPair;
	let stranger: KeyringPair;

	beforeAll(async () => {
		admin = getPair(
			"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			undefined,
			"sr25519",
			42,
		);
		stranger = getPair("//Bob", undefined, "sr25519", 42);

		const app = express();
		app.use(
			PATH,
			rateLimit({
				windowMs: 60_000,
				limit: 2,
				keyGenerator: adminRateLimitKey(admin, undefined),
				validate: false,
			}),
		);
		app.post(PATH, (_req: Request, res: Response) => {
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

	const post = (token: string): Promise<globalThis.Response> =>
		fetch(`${baseUrl}${PATH}`, {
			method: "POST",
			headers: { authorization: `Bearer ${token}` },
		});

	it("counts unverified tokens against the caller's IP whatever subject they claim", async () => {
		const statuses: number[] = [];
		for (const sub of ["alice", "bob", 5, { nested: true }]) {
			statuses.push((await post(unsignedToken(sub))).status);
		}
		statuses.push((await post(stranger.jwtIssue())).status);

		expect(statuses).toEqual([200, 200, 429, 429, 429]);
	});

	it("gives a token signed by an admin key its own counter", async () => {
		const res = await post(admin.jwtIssue());

		expect(res.status).toBe(200);
	});
});
