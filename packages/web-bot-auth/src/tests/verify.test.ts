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

// End-to-end round trip against `@noble/curves/ed25519`: generate a
// keypair, sign a signature base, construct the wire headers by hand, and
// hand the whole thing to `verifyWebBotAuth`. If any of the parser, base
// construction, or verification stages drift out of step this test breaks.

import { ed25519 } from "@noble/curves/ed25519";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearJwksCache, type JwksFetch } from "../jwksResolver.js";
import { buildSignatureBase } from "../signatureBase.js";
import { verifyWebBotAuth } from "../verify.js";

// Encode raw bytes as base64 without depending on Node's Buffer type in
// the test file signature — atob/btoa work in Node 18+ too.
const toBase64 = (bytes: Uint8Array): string => {
	let bin = "";
	for (let i = 0; i < bytes.length; i++)
		bin += String.fromCharCode(bytes[i] as number);
	return btoa(bin);
};
const toBase64Url = (bytes: Uint8Array): string =>
	toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const KEY_ID = "test-key-1";
const SIGNER_URL = "https://signer.example.com";
const AUTHORITY = "target.example.com";
const REQUEST_URL = `https://${AUTHORITY}/api/thing`;
const SIGNATURE_AGENT_HEADER = `"${SIGNER_URL}"`;

const buildSignedRequest = (
	privateKey: Uint8Array,
	publicKey: Uint8Array,
	expiresSeconds: number,
): {
	fetch: JwksFetch;
	request: {
		method: string;
		url: string;
		headers: Record<string, string>;
	};
} => {
	const created = Math.floor(Date.now() / 1000);
	const params = `("@authority" "signature-agent");created=${created};expires=${expiresSeconds};keyid="${KEY_ID}";alg="ed25519";tag="web-bot-auth"`;
	const base = buildSignatureBase(
		["@authority", "signature-agent"],
		{ authority: AUTHORITY, signatureAgent: SIGNATURE_AGENT_HEADER },
		params,
	);
	const signature = ed25519.sign(new TextEncoder().encode(base), privateKey);
	const jwks = {
		keys: [
			{
				kty: "OKP",
				crv: "Ed25519",
				alg: "EdDSA",
				kid: KEY_ID,
				x: toBase64Url(publicKey),
			},
		],
	};
	const fetch: JwksFetch = async () =>
		new Response(JSON.stringify(jwks), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	return {
		fetch,
		request: {
			method: "GET",
			url: REQUEST_URL,
			headers: {
				"signature-agent": SIGNATURE_AGENT_HEADER,
				"signature-input": `sig1=${params}`,
				signature: `sig1=:${toBase64(signature)}:`,
			},
		},
	};
};

describe("verifyWebBotAuth", () => {
	beforeEach(() => clearJwksCache());
	afterEach(() => clearJwksCache());

	it("verifies a fresh, correctly-signed request", async () => {
		const priv = ed25519.utils.randomPrivateKey();
		const pub = ed25519.getPublicKey(priv);
		const { request, fetch } = buildSignedRequest(
			priv,
			pub,
			Math.floor(Date.now() / 1000) + 60,
		);

		const result = await verifyWebBotAuth(request, { fetch });
		expect(result).toEqual({
			verified: true,
			signerUrl: SIGNER_URL,
			keyid: KEY_ID,
		});
	});

	it("rejects when signature bytes are flipped", async () => {
		const priv = ed25519.utils.randomPrivateKey();
		const pub = ed25519.getPublicKey(priv);
		const { request, fetch } = buildSignedRequest(
			priv,
			pub,
			Math.floor(Date.now() / 1000) + 60,
		);
		// Corrupt the signature body — decode, flip one byte, re-encode.
		const orig = request.headers.signature ?? "";
		const b64 = orig.slice("sig1=:".length, -1);
		const bin = atob(b64);
		const bytes = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
		bytes[0] = ((bytes[0] as number) ^ 0xff) & 0xff;
		let corrupted = "";
		for (let i = 0; i < bytes.length; i++)
			corrupted += String.fromCharCode(bytes[i] as number);
		request.headers.signature = `sig1=:${btoa(corrupted)}:`;

		const result = await verifyWebBotAuth(request, { fetch });
		expect(result).toEqual({ verified: false, reason: "bad-signature" });
	});

	it("rejects an expired signature before touching JWKS", async () => {
		const priv = ed25519.utils.randomPrivateKey();
		const pub = ed25519.getPublicKey(priv);
		const past = Math.floor(Date.now() / 1000) - 60;
		const { request } = buildSignedRequest(priv, pub, past);

		let fetched = false;
		const result = await verifyWebBotAuth(request, {
			fetch: async () => {
				fetched = true;
				return new Response("{}", { status: 200 });
			},
		});
		expect(result).toEqual({ verified: false, reason: "expired" });
		expect(fetched).toBe(false);
	});

	it("rejects when the JWKS has no matching kid", async () => {
		const priv = ed25519.utils.randomPrivateKey();
		const pub = ed25519.getPublicKey(priv);
		const { request } = buildSignedRequest(
			priv,
			pub,
			Math.floor(Date.now() / 1000) + 60,
		);
		const jwks = {
			keys: [
				{
					kty: "OKP",
					crv: "Ed25519",
					kid: "some-other-kid",
					x: toBase64Url(pub),
				},
			],
		};
		const fetch: JwksFetch = async () =>
			new Response(JSON.stringify(jwks), { status: 200 });

		const result = await verifyWebBotAuth(request, { fetch });
		expect(result).toEqual({ verified: false, reason: "no-matching-key" });
	});

	it("returns no-signature-headers when the request is unsigned", async () => {
		const result = await verifyWebBotAuth({
			method: "GET",
			url: REQUEST_URL,
			headers: {},
		});
		expect(result).toEqual({
			verified: false,
			reason: "no-signature-headers",
		});
	});
});
