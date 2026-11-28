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
import { Keyring } from "@prosopo/keyring";
import {
	ClientApiPaths,
	type ProcaptchaToken,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import { u8aToHex } from "@prosopo/util";
import express, { type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getServerVerifyPaths } from "../../../api/startProviderApi.js";
import { verifyRateLimitKey } from "../../../api/verifyRateLimitKey.js";

const TIMESTAMP = "1700000000000";
const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
const sitePair = keyring.addFromUri("//Alice");
const attackerPair = keyring.addFromUri("//Charlie");
const userPair = keyring.addFromUri("//Bob");

const tokenFor = (dapp: string): ProcaptchaToken =>
	encodeProcaptchaOutput({
		dapp,
		user: userPair.address,
		timestamp: TIMESTAMP,
		commitmentId: "0x01",
		challenge: "challenge",
		signature: { provider: {}, user: {} },
	});

const siteToken = tokenFor(sitePair.address);
const siteSignature = u8aToHex(sitePair.sign(TIMESTAMP));
const attackerSignature = u8aToHex(attackerPair.sign(TIMESTAMP));

const requestWith = (body: unknown): Pick<Request, "body" | "ip"> => ({
	body,
	ip: "203.0.113.7",
});

describe("verifyRateLimitKey", () => {
	it("keys a correctly signed request on its site key", () => {
		expect(
			verifyRateLimitKey(
				requestWith({ token: siteToken, dappSignature: siteSignature }),
			),
		).toBe(`site:${sitePair.address}`);
	});

	const unauthenticated: [string, unknown][] = [
		["no body", undefined],
		["no signature", { token: siteToken }],
		[
			"signature by another key",
			{ token: siteToken, dappSignature: attackerSignature },
		],
		["undecodable token", { token: "0xzz", dappSignature: siteSignature }],
		["non-hex signature", { token: siteToken, dappSignature: "zz" }],
		["non-string fields", { token: 1, dappSignature: 2 }],
	];
	for (const [label, body] of unauthenticated) {
		it(`falls back to the IP: ${label}`, () => {
			expect(verifyRateLimitKey(requestWith(body))).toBe("ip:203.0.113.7");
		});
	}

	it("covers every verify route", () => {
		expect(new Set(getServerVerifyPaths())).toEqual(
			new Set([
				ClientApiPaths.VerifyPowCaptchaSolution,
				ClientApiPaths.VerifyImageCaptchaSolutionDapp,
				ClientApiPaths.VerifyPuzzleCaptchaSolution,
				ClientApiPaths.VerifyAudioCaptchaSolution,
				ClientApiPaths.VerifyIconOrderCaptchaSolution,
				ClientApiPaths.VerifyAuthenticatedSession,
			]),
		);
	});
});

describe("verify rate limit", () => {
	let baseUrl = "";
	let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;

	beforeAll(async () => {
		const app = express();
		app.use(express.json());
		app.use(
			rateLimit({
				windowMs: 60_000,
				limit: 1,
				keyGenerator: verifyRateLimitKey,
			}),
		);
		app.post("/verify", (_req: Request, res: Response) => {
			res.json({ ok: true });
		});
		await new Promise<void>((resolve) => {
			server = app.listen(0, "127.0.0.1", () => resolve());
		});
		const address = server?.address() as AddressInfo;
		baseUrl = `http://127.0.0.1:${address.port}`;
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => server?.close(() => resolve()));
	});

	const post = async (dappSignature: string): Promise<number> => {
		const res = await fetch(`${baseUrl}/verify`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"prosopo-site-key": sitePair.address,
			},
			body: JSON.stringify({ token: siteToken, dappSignature }),
		});
		await res.text();
		return res.status;
	};

	it("a client naming a site key cannot use up that site's allowance", async () => {
		expect(await post(attackerSignature)).toBe(200);
		expect(await post(attackerSignature)).toBe(429);
		expect(await post(siteSignature)).toBe(200);
		expect(await post(siteSignature)).toBe(429);
	});
});
