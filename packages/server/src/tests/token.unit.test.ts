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

// These tests live in @prosopo/server rather than @prosopo/types because
// @prosopo/types has no vitest setup, and @prosopo/server is the primary
// consumer of the token codec — the puzzle-server-verify bug (0/N puzzle
// tokens ever hitting serverChecked=true in mongo) was caused by the token
// carrying no captchaType discriminant. These tests lock in the v2 codec
// shape and the v1 fallback so that regression can't come back.

import { hexToU8a } from "@polkadot/util";
import {
	ApiParams,
	CaptchaType,
	ProcaptchaOutputSchema,
	type ProcaptchaOutput,
	ProcaptchaTokenCodec,
	ProcaptchaTokenCodecV1,
	decodeProcaptchaOutput,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import { u8aToHex } from "@prosopo/util";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

const baseOutput = (): ProcaptchaOutput => ({
	[ApiParams.providerUrl]: "https://pronode1.example",
	[ApiParams.dapp]: "5C1cs9CfxYQfNi3ARtprMDzR7BFRWFVSoDaLb1JytkiXwq5m",
	[ApiParams.user]: "5CFHA8d3S1XXkZuBwGqiuA6SECTzfoucq397YL34FuPAH89G",
	[ApiParams.challenge]: "challenge-string",
	[ApiParams.timestamp]: "1710000000000",
	[ApiParams.signature]: {
		[ApiParams.provider]: {
			[ApiParams.challenge]: "provider-sig",
		},
		[ApiParams.user]: {
			[ApiParams.timestamp]: "user-sig",
		},
	},
});

describe("procaptcha token codec — round trip", () => {
	for (const captchaType of [
		CaptchaType.pow,
		CaptchaType.image,
		CaptchaType.puzzle,
		CaptchaType.frictionless,
	]) {
		it(`preserves captchaType=${captchaType}`, () => {
			const output = { ...baseOutput(), [ApiParams.captchaType]: captchaType };
			const token = encodeProcaptchaOutput(output);
			const decoded = decodeProcaptchaOutput(token);
			expect(decoded[ApiParams.captchaType]).toBe(captchaType);
			expect(decoded[ApiParams.dapp]).toBe(output[ApiParams.dapp]);
			expect(decoded[ApiParams.user]).toBe(output[ApiParams.user]);
			expect(decoded[ApiParams.challenge]).toBe(output[ApiParams.challenge]);
		});
	}

	it("preserves captchaType=undefined (opt-out path)", () => {
		const output = baseOutput();
		const token = encodeProcaptchaOutput(output);
		const decoded = decodeProcaptchaOutput(token);
		expect(decoded[ApiParams.captchaType]).toBeUndefined();
	});

	it("image-shape token (no challenge, has commitmentId) round-trips with captchaType", () => {
		const output: ProcaptchaOutput = {
			[ApiParams.providerUrl]: "https://pronode1.example",
			[ApiParams.dapp]: "5C1cs9CfxYQfNi3ARtprMDzR7BFRWFVSoDaLb1JytkiXwq5m",
			[ApiParams.user]: "5CFHA8d3S1XXkZuBwGqiuA6SECTzfoucq397YL34FuPAH89G",
			[ApiParams.commitmentId]: "0xdeadbeef",
			[ApiParams.timestamp]: "1710000000000",
			[ApiParams.signature]: {
				[ApiParams.provider]: {
					[ApiParams.requestHash]: "req-hash",
				},
				[ApiParams.user]: {
					[ApiParams.timestamp]: "user-sig",
				},
			},
			[ApiParams.captchaType]: CaptchaType.image,
		};
		const decoded = decodeProcaptchaOutput(encodeProcaptchaOutput(output));
		expect(decoded[ApiParams.captchaType]).toBe(CaptchaType.image);
		expect(decoded[ApiParams.commitmentId]).toBe("0xdeadbeef");
		expect(decoded[ApiParams.challenge]).toBeUndefined();
	});
});

describe("procaptcha token codec — legacy v1 fallback", () => {
	// The whole point of the fallback: tokens minted by client bundles that
	// shipped before captchaType was added must still decode via the current
	// SDK. Simulate one by encoding with the frozen v1 codec directly, then
	// prove the public decode helper returns a valid output with
	// captchaType: undefined.

	const encodeV1 = (output: ProcaptchaOutput): string => {
		return u8aToHex(
			ProcaptchaTokenCodecV1.enc({
				[ApiParams.commitmentId]: undefined,
				[ApiParams.providerUrl]: undefined,
				[ApiParams.challenge]: undefined,
				[ApiParams.nonce]: undefined,
				...output,
				signature: {
					provider: {
						challenge:
							output.signature.provider?.challenge || undefined,
						requestHash:
							output.signature.provider?.requestHash || undefined,
					},
					user: {
						timestamp: output.signature.user?.timestamp || undefined,
						requestHash:
							output.signature.user?.requestHash || undefined,
					},
				},
			}),
		);
	};

	it("decodes a legacy v1-encoded pow-shape token as captchaType=undefined", () => {
		const legacyToken = encodeV1(baseOutput());
		const decoded = decodeProcaptchaOutput(legacyToken);
		expect(decoded[ApiParams.captchaType]).toBeUndefined();
		expect(decoded[ApiParams.challenge]).toBe("challenge-string");
		expect(decoded[ApiParams.dapp]).toBe(
			"5C1cs9CfxYQfNi3ARtprMDzR7BFRWFVSoDaLb1JytkiXwq5m",
		);
	});

	it("decodes a legacy v1-encoded image-shape token as captchaType=undefined", () => {
		const legacyToken = encodeV1({
			[ApiParams.providerUrl]: "https://pronode1.example",
			[ApiParams.dapp]: "5C1cs9CfxYQfNi3ARtprMDzR7BFRWFVSoDaLb1JytkiXwq5m",
			[ApiParams.user]: "5CFHA8d3S1XXkZuBwGqiuA6SECTzfoucq397YL34FuPAH89G",
			[ApiParams.commitmentId]: "0xcafebabe",
			[ApiParams.timestamp]: "1710000000000",
			[ApiParams.signature]: {
				[ApiParams.provider]: {
					[ApiParams.requestHash]: "req-hash",
				},
				[ApiParams.user]: {
					[ApiParams.timestamp]: "user-sig",
				},
			},
		});
		const decoded = decodeProcaptchaOutput(legacyToken);
		expect(decoded[ApiParams.captchaType]).toBeUndefined();
		expect(decoded[ApiParams.challenge]).toBeUndefined();
		expect(decoded[ApiParams.commitmentId]).toBe("0xcafebabe");
	});

	it("legacy tokens do not carry the captchaType byte on the wire", () => {
		// v1 encoding must be a strict prefix of what v2 would produce with
		// captchaType: undefined — length-differs-by-one-byte proves the byte
		// layout stayed additive.
		const output = baseOutput();
		const v1Bytes = hexToU8a(encodeV1(output));
		const v2Bytes = hexToU8a(encodeProcaptchaOutput(output));
		expect(v2Bytes.length).toBe(v1Bytes.length + 1);
		expect(Array.from(v2Bytes.slice(0, v1Bytes.length))).toEqual(
			Array.from(v1Bytes),
		);
		// The trailing byte is the Option(str) None discriminant (0x00).
		expect(v2Bytes[v2Bytes.length - 1]).toBe(0);
	});
});

describe("procaptcha token codec — rejection paths", () => {
	it("throws on truncated hex input", () => {
		expect(() => decodeProcaptchaOutput("0x00")).toThrow();
	});

	it("throws on non-hex input", () => {
		expect(() => decodeProcaptchaOutput("not-a-hex-token")).toThrow();
	});

	it("rejects unknown captchaType strings via zod", () => {
		// Force-encode with a string the enum does not know about, then confirm
		// the public decoder throws a ZodError rather than silently accepting
		// a bogus type that the server SDK would then dispatch on.
		const bogusHex = u8aToHex(
			ProcaptchaTokenCodec.enc({
				[ApiParams.commitmentId]: undefined,
				[ApiParams.providerUrl]: "https://pronode1.example",
				[ApiParams.challenge]: "c",
				[ApiParams.nonce]: undefined,
				[ApiParams.dapp]: "5C1cs9CfxYQfNi3ARtprMDzR7BFRWFVSoDaLb1JytkiXwq5m",
				[ApiParams.user]: "5CFHA8d3S1XXkZuBwGqiuA6SECTzfoucq397YL34FuPAH89G",
				[ApiParams.timestamp]: "1710000000000",
				[ApiParams.signature]: {
					provider: { challenge: "s", requestHash: undefined },
					user: { timestamp: "s", requestHash: undefined },
				},
				[ApiParams.captchaType]: "bogus-captcha-type",
			}),
		);
		let error: unknown;
		try {
			decodeProcaptchaOutput(bogusHex);
		} catch (e) {
			error = e;
		}
		expect(error).toBeInstanceOf(ZodError);
	});

	it("ProcaptchaOutputSchema rejects unknown captchaType directly", () => {
		expect(() =>
			ProcaptchaOutputSchema.parse({
				...baseOutput(),
				[ApiParams.captchaType]: "not-a-real-type",
			}),
		).toThrow(ZodError);
	});
});
