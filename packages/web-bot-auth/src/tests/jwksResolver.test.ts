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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type JwksFetch,
	clearJwksCache,
	jwksCacheSize,
	resolveJwksFromSignatureAgent,
} from "../jwksResolver.js";

const JWKS_BODY = JSON.stringify({
	keys: [{ kty: "OKP", crv: "Ed25519", kid: "k", x: "AAAA" }],
});

const okFetch =
	(headers: Record<string, string> = {}): JwksFetch =>
	async () =>
		new Response(JWKS_BODY, { status: 200, headers });

describe("resolveJwksFromSignatureAgent", () => {
	beforeEach(() => clearJwksCache());
	afterEach(() => {
		clearJwksCache();
		vi.useRealTimers();
	});

	it("fetches the directory of an https signer", async () => {
		const seen: string[] = [];
		const keys = await resolveJwksFromSignatureAgent(
			"https://signer.example.com",
			{
				fetch: async (url: string, init?: RequestInit) => {
					seen.push(url);
					return okFetch()(url, init);
				},
			},
		);
		expect(keys).toHaveLength(1);
		expect(seen).toEqual([
			"https://signer.example.com/.well-known/http-message-signatures-directory",
		]);
	});

	// The signer URL comes straight from a request header, so it must not be
	// usable to make the provider issue requests into its own network.
	it.each([
		"http://signer.example.com",
		"https://127.0.0.1",
		"https://10.0.0.5:6379",
		"https://169.254.169.254",
		"https://[::1]",
		"https://localhost",
		"https://redis.localhost",
	])("refuses to fetch from %s", async (signerUrl: string) => {
		let fetched = false;
		await expect(
			resolveJwksFromSignatureAgent(signerUrl, {
				fetch: async (url: string, init?: RequestInit) => {
					fetched = true;
					return okFetch()(url, init);
				},
			}),
		).rejects.toThrow();
		expect(fetched).toBe(false);
	});

	it("allows a local http signer only when asked to", async () => {
		const keys = await resolveJwksFromSignatureAgent("http://localhost:1234", {
			fetch: okFetch(),
			allowLocalSigners: true,
		});
		expect(keys).toHaveLength(1);
	});

	it("gives up on a directory that never answers", async () => {
		const hang: JwksFetch = (_url: string, init?: RequestInit) =>
			new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener("abort", () =>
					reject(new Error("aborted")),
				);
			});
		await expect(
			resolveJwksFromSignatureAgent("https://slow.example.com", {
				fetch: hang,
				timeoutMs: 20,
			}),
		).rejects.toThrow();
	});

	it("refuses an oversized directory body", async () => {
		const huge = JSON.stringify({ keys: [], pad: "x".repeat(200_000) });
		await expect(
			resolveJwksFromSignatureAgent("https://big.example.com", {
				fetch: async () => new Response(huge, { status: 200 }),
			}),
		).rejects.toThrow();
	});

	it("keeps the cache bounded when every request names a new signer", async () => {
		for (let i = 0; i < 1500; i++) {
			await resolveJwksFromSignatureAgent(`https://s${i}.example.com`, {
				fetch: okFetch(),
			});
		}
		expect(jwksCacheSize()).toBeLessThanOrEqual(1000);
	});

	it("caps a signer-supplied max-age at 24 hours", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
		let calls = 0;
		const fetch: JwksFetch = async (url: string, init?: RequestInit) => {
			calls++;
			return okFetch({ "cache-control": "max-age=999999999" })(url, init);
		};
		await resolveJwksFromSignatureAgent("https://s.example.com", { fetch });
		vi.setSystemTime(new Date("2026-01-02T00:00:01Z"));
		await resolveJwksFromSignatureAgent("https://s.example.com", { fetch });
		expect(calls).toBe(2);
	});
});
