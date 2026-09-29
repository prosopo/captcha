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

import { ed25519 } from "@noble/curves/ed25519.js";
import { decodeBase64Url } from "./base64.js";
import {
	type Jwk,
	type JwksResolverOptions,
	resolveJwksFromSignatureAgent,
} from "./jwksResolver.js";
import { parseSignatureAgentHeader } from "./parseSignatureAgent.js";
import { buildSignatureBase } from "./signatureBase.js";
import { parseSignature, parseSignatureInput } from "./structuredFields.js";

// Loose request shape — anything with method, url and header lookup works.
// We don't couple to a specific HTTP framework's Request type.
export type VerifiableRequest = {
	method: string;
	url: string;
	headers:
		| Record<string, string | string[] | undefined>
		| { get(name: string): string | null };
};

export type VerifyResult =
	| { verified: true; signerUrl: string; keyid: string }
	| { verified: false; reason: VerifyFailReason };

export type VerifyFailReason =
	| "no-signature-headers"
	| "unparseable-signature-agent"
	| "unparseable-signature-input"
	| "unparseable-signature"
	| "unsupported-alg"
	| "missing-keyid"
	| "expired"
	| "missing-created-or-expires"
	| "not-yet-valid"
	| "validity-too-long"
	| "wrong-tag"
	| "jwks-fetch-failed"
	| "no-matching-key"
	| "malformed-key"
	| "bad-signature";

const WEB_BOT_AUTH_TAG = "web-bot-auth";
const CLOCK_SKEW_SECONDS = 5;
// The draft recommends signers keep expiry within 24 hours.
const MAX_VALIDITY_SECONDS = 24 * 60 * 60;

const readHeader = (
	headers: VerifiableRequest["headers"],
	name: string,
): string | undefined => {
	if (typeof (headers as { get?: unknown }).get === "function") {
		const map = headers as { get: (n: string) => string | null };
		return map.get(name) ?? map.get(name.toLowerCase()) ?? undefined;
	}
	const record = headers as Record<string, string | string[] | undefined>;
	const raw = record[name] ?? record[name.toLowerCase()];
	if (typeof raw === "string") return raw;
	if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
	return undefined;
};

// JWK → 32-byte Ed25519 public key. Rejects anything that isn't an OKP
// Ed25519 key so a signer publishing an RSA / ECDSA key in the same
// directory (which is legal for other signature purposes) never matches
// a web-bot-auth-tagged signature.
const jwkToEd25519PublicKey = (jwk: Jwk): Uint8Array => {
	if (jwk.kty !== "OKP" || jwk.crv !== "Ed25519") {
		throw new Error("not an Ed25519 JWK");
	}
	if (typeof jwk.x !== "string") {
		throw new Error("Ed25519 JWK missing x parameter");
	}
	const bytes = decodeBase64Url(jwk.x);
	if (bytes.length !== 32) {
		throw new Error(`Ed25519 public key must be 32 bytes, got ${bytes.length}`);
	}
	return bytes;
};

export const verifyWebBotAuth = async (
	request: VerifiableRequest,
	options: JwksResolverOptions = {},
): Promise<VerifyResult> => {
	const signatureAgentRaw = readHeader(request.headers, "signature-agent");
	const signatureInputRaw = readHeader(request.headers, "signature-input");
	const signatureRaw = readHeader(request.headers, "signature");
	if (!signatureAgentRaw || !signatureInputRaw || !signatureRaw) {
		return { verified: false, reason: "no-signature-headers" };
	}

	const signerUrl = parseSignatureAgentHeader(signatureAgentRaw);
	if (!signerUrl) {
		return { verified: false, reason: "unparseable-signature-agent" };
	}

	const inputEntry = parseSignatureInput(signatureInputRaw);
	if (!inputEntry) {
		return { verified: false, reason: "unparseable-signature-input" };
	}

	// Web Bot Auth pins alg=ed25519. Reject anything else rather than
	// silently trying to verify against the wrong curve.
	const alg = inputEntry.params.alg;
	if (alg !== undefined && alg !== "ed25519") {
		return { verified: false, reason: "unsupported-alg" };
	}

	// Web Bot Auth requires `created`, `expires` and `tag="web-bot-auth"`
	// (draft-meunier-web-bot-auth-architecture §4.2). The signature covers
	// only the authority and the agent header, so the time window is the
	// only replay defence: without `expires` a captured signature would
	// verify forever.
	const { created, expires, tag } = inputEntry.params;
	if (tag !== WEB_BOT_AUTH_TAG) {
		return { verified: false, reason: "wrong-tag" };
	}
	if (typeof created !== "number" || typeof expires !== "number") {
		return { verified: false, reason: "missing-created-or-expires" };
	}
	const nowSeconds = Date.now() / 1000;
	if (expires < nowSeconds) {
		return { verified: false, reason: "expired" };
	}
	if (created > nowSeconds + CLOCK_SKEW_SECONDS) {
		return { verified: false, reason: "not-yet-valid" };
	}
	if (expires - created > MAX_VALIDITY_SECONDS) {
		return { verified: false, reason: "validity-too-long" };
	}

	const keyid = inputEntry.params.keyid;
	if (typeof keyid !== "string" || keyid.length === 0) {
		return { verified: false, reason: "missing-keyid" };
	}

	const signatureBytes = parseSignature(signatureRaw, inputEntry.label);
	if (!signatureBytes) {
		return { verified: false, reason: "unparseable-signature" };
	}

	let jwks: Jwk[];
	try {
		jwks = await resolveJwksFromSignatureAgent(signerUrl, options);
	} catch {
		return { verified: false, reason: "jwks-fetch-failed" };
	}

	const jwk = jwks.find((k) => k.kid === keyid);
	if (!jwk) return { verified: false, reason: "no-matching-key" };

	let publicKey: Uint8Array;
	try {
		publicKey = jwkToEd25519PublicKey(jwk);
	} catch {
		return { verified: false, reason: "malformed-key" };
	}

	let authority: string;
	try {
		authority = new URL(request.url).host.toLowerCase();
	} catch {
		return { verified: false, reason: "bad-signature" };
	}

	let signatureBase: string;
	try {
		signatureBase = buildSignatureBase(
			inputEntry.coveredComponents,
			{ authority, signatureAgent: signatureAgentRaw },
			inputEntry.serialisedValue,
		);
	} catch {
		return { verified: false, reason: "bad-signature" };
	}

	const message = new TextEncoder().encode(signatureBase);
	try {
		const ok = ed25519.verify(signatureBytes, message, publicKey);
		return ok
			? { verified: true, signerUrl, keyid }
			: { verified: false, reason: "bad-signature" };
	} catch {
		return { verified: false, reason: "bad-signature" };
	}
};
