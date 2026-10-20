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
import express, { type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	adminRateLimitKey,
	verifyRateLimiters,
} from "../../../api/rateLimitKeys.js";

const ADMIN = getPair("//Alice");
const OTHER = getPair("//Bob");

/** A token that claims `sub` of the admin but is signed by someone else. */
const forgedAdminToken = (): string => {
	const [header, , signature] = OTHER.jwtIssue().split(".");
	const payload = Buffer.from(
		JSON.stringify({
			sub: `0x${Buffer.from(ADMIN.publicKey).toString("hex")}`,
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + 300,
			rotate: Math.random().toString(),
		}),
	).toString("base64url");
	return `${header}.${payload}.${signature}`;
};

const listen = async (app: express.Express): Promise<[Server, string]> => {
	const server = app.listen(0, "127.0.0.1");
	await new Promise<void>((resolve) => server.once("listening", resolve));
	const address: AddressInfo | string | null = server.address();
	if (address === null || typeof address === "string")
		throw new Error("test server has no TCP address");
	return [server, `http://127.0.0.1:${address.port}`];
};

const status = async (
	url: string,
	headers: Record<string, string>,
): Promise<number> => (await fetch(url, { method: "POST", headers })).status;

describe("adminRateLimitKey", () => {
	const key = adminRateLimitKey([undefined, ADMIN]);
	const req = (authorization?: string, ip = "10.0.0.1"): Request => {
		const partial: Partial<Request> = {
			headers: authorization ? { authorization } : {},
			ip,
		};
		return partial as Request;
	};

	it("keys a verified admin token on the admin account", () => {
		const token = ADMIN.jwtIssue();
		expect(key(req(`Bearer ${token}`, "10.0.0.1"))).toBe(
			key(req(`Bearer ${ADMIN.jwtIssue()}`, "10.0.0.2")),
		);
		expect(key(req(`Bearer ${token}`))).toMatch(/^admin:/);
	});

	it("keys an unverified token on the IP, not its claimed sub", () => {
		expect(key(req(`Bearer ${forgedAdminToken()}`))).toBe("ip:10.0.0.1");
		expect(key(req(`Bearer ${OTHER.jwtIssue()}`))).toBe("ip:10.0.0.1");
		expect(key(req("Bearer not.a.jwt"))).toBe("ip:10.0.0.1");
		expect(key(req())).toBe("ip:10.0.0.1");
	});
});

describe("admin limiter", () => {
	let server: Server;
	let url: string;

	beforeAll(async () => {
		const app = express();
		app.use(
			"/admin",
			rateLimit({
				windowMs: 60_000,
				limit: 3,
				keyGenerator: adminRateLimitKey([ADMIN]),
			}),
		);
		app.post("/admin", (_req: Request, res: Response) => {
			res.status(401).end();
		});
		[server, url] = await listen(app);
		url = `${url}/admin`;
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	it("does not give a fresh budget to each forged sub", async () => {
		const codes: number[] = [];
		for (let i = 0; i < 5; i++) {
			// Each forged token claims a different random account.
			const [header, , signature] = OTHER.jwtIssue().split(".");
			const payload = Buffer.from(
				JSON.stringify({
					sub: `0x${i.toString(16).padStart(64, "0")}`,
					iat: 1,
					exp: 9_999_999_999,
				}),
			).toString("base64url");
			codes.push(
				await status(url, {
					authorization: `Bearer ${header}.${payload}.${signature}`,
				}),
			);
		}
		expect(codes).toEqual([401, 401, 401, 429, 429]);
	});
});

describe("verifyRateLimiters", () => {
	let server: Server;
	let url: string;

	beforeAll(async () => {
		const app = express();
		app.set("trust proxy", true);
		app.use(
			"/verify",
			verifyRateLimiters(
				{ windowMs: 60_000, limit: 2 },
				(_req, res, _next, options) => {
					res.status(options.statusCode).send(options.message);
				},
				2,
			),
		);
		app.post("/verify", (_req: Request, res: Response) => {
			res.status(200).end();
		});
		[server, url] = await listen(app);
		url = `${url}/verify`;
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	it("limits one IP that rotates the site key header", async () => {
		const codes: number[] = [];
		for (let i = 0; i < 6; i++) {
			codes.push(
				await status(url, {
					"x-forwarded-for": "198.51.100.1",
					"prosopo-site-key": `site-${i}`,
				}),
			);
		}
		expect(codes).toEqual([200, 200, 200, 200, 429, 429]);
	});

	it("keeps a per-site-key budget across IPs", async () => {
		const codes: number[] = [];
		for (let i = 0; i < 3; i++) {
			codes.push(
				await status(url, {
					"x-forwarded-for": `198.51.100.${10 + i}`,
					"prosopo-site-key": "shared-site",
				}),
			);
		}
		expect(codes).toEqual([200, 200, 429]);
	});
});
