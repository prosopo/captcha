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
import { u8aToHex } from "@prosopo/util";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { CaptchaType } from "../client/captchaType/captchaType.js";
import {
	type ProcaptchaOutput,
	ProcaptchaOutputSchema,
	ProcaptchaTokenCodec,
	ProcaptchaTokenCodecV1,
	ProcaptchaTokenSpec,
	decodeProcaptchaOutput,
	encodeProcaptchaOutput,
} from "./token.js";

const minimal: ProcaptchaOutput = {
	dapp: "5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw",
	user: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
	timestamp: "1700000000000",
	signature: { provider: {}, user: {} },
};

const full: ProcaptchaOutput = {
	...minimal,
	commitmentId: "0xcommitment",
	providerUrl: "https://provider.example",
	challenge: "a___b___c",
	nonce: 42,
	captchaType: CaptchaType.pow,
	signature: {
		provider: { challenge: "pc", requestHash: "pr" },
		user: { timestamp: "ut", requestHash: "ur" },
	},
};

describe("ProcaptchaTokenSpec", () => {
	it("accepts a hex string", () => {
		expect(ProcaptchaTokenSpec.safeParse("0xabc").success).toBe(true);
	});

	it("rejects a string with no hex prefix", () => {
		expect(ProcaptchaTokenSpec.safeParse("abc").success).toBe(false);
	});

	it("rejects an empty string", () => {
		expect(ProcaptchaTokenSpec.safeParse("").success).toBe(false);
	});
});

describe("encodeProcaptchaOutput", () => {
	it("produces a hex token", () => {
		expect(encodeProcaptchaOutput(minimal)).toMatch(/^0x[0-9a-f]+$/);
	});

	it("is deterministic", () => {
		expect(encodeProcaptchaOutput(full)).toBe(encodeProcaptchaOutput(full));
	});

	it("produces different tokens for different outputs", () => {
		expect(encodeProcaptchaOutput(minimal)).not.toBe(
			encodeProcaptchaOutput(full),
		);
	});

	it("encodes an absent optional field as none, not as an empty string", () => {
		const withEmpty = encodeProcaptchaOutput({
			...minimal,
			signature: { provider: { challenge: "" }, user: {} },
		});
		// the encoder maps a falsy signature part to undefined
		expect(withEmpty).toBe(encodeProcaptchaOutput(minimal));
	});

	it("drops fields the codec does not model", () => {
		const withExtra: ProcaptchaOutput & { extra: string } = {
			...minimal,
			extra: "ignored",
		};
		expect(decodeProcaptchaOutput(encodeProcaptchaOutput(withExtra))).toEqual(
			minimal,
		);
	});
});

describe("decodeProcaptchaOutput", () => {
	it("round trips a minimal output", () => {
		expect(decodeProcaptchaOutput(encodeProcaptchaOutput(minimal))).toEqual(
			minimal,
		);
	});

	it("round trips every optional field", () => {
		expect(decodeProcaptchaOutput(encodeProcaptchaOutput(full))).toEqual(full);
	});

	it("round trips a zero nonce", () => {
		const output: ProcaptchaOutput = { ...minimal, nonce: 0 };
		expect(decodeProcaptchaOutput(encodeProcaptchaOutput(output))).toEqual(
			output,
		);
	});

	it("round trips each captcha type", () => {
		for (const captchaType of Object.values(CaptchaType)) {
			const output: ProcaptchaOutput = { ...minimal, captchaType };
			expect(
				decodeProcaptchaOutput(encodeProcaptchaOutput(output)).captchaType,
			).toBe(captchaType);
		}
	});

	it("round trips unicode in a string field", () => {
		const output: ProcaptchaOutput = { ...minimal, challenge: "日本語 ✅" };
		expect(decodeProcaptchaOutput(encodeProcaptchaOutput(output))).toEqual(
			output,
		);
	});

	it("falls back to the v1 layout for a legacy token", () => {
		const legacy = u8aToHex(
			ProcaptchaTokenCodecV1.enc({
				commitmentId: undefined,
				providerUrl: undefined,
				dapp: minimal.dapp,
				user: minimal.user,
				challenge: undefined,
				nonce: undefined,
				timestamp: minimal.timestamp,
				signature: {
					provider: { challenge: undefined, requestHash: undefined },
					user: { timestamp: undefined, requestHash: undefined },
				},
			}),
		);
		expect(decodeProcaptchaOutput(legacy)).toEqual(minimal);
	});

	it("leaves captchaType undefined on a legacy token", () => {
		const legacy = u8aToHex(
			ProcaptchaTokenCodecV1.enc({
				commitmentId: "c",
				providerUrl: "u",
				dapp: minimal.dapp,
				user: minimal.user,
				challenge: "ch",
				nonce: 1,
				timestamp: minimal.timestamp,
				signature: {
					provider: { challenge: "pc", requestHash: "pr" },
					user: { timestamp: "ut", requestHash: "ur" },
				},
			}),
		);
		expect(decodeProcaptchaOutput(legacy).captchaType).toBeUndefined();
	});

	it("throws for a token that decodes under neither layout", () => {
		expect(() => decodeProcaptchaOutput("0x00")).toThrow();
	});

	it("throws for an empty token", () => {
		expect(() => decodeProcaptchaOutput("0x")).toThrow();
	});

	it("surfaces a schema failure rather than silently falling back", () => {
		// a structurally valid v2 token carrying an unknown captcha type must
		// fail the zod parse, not be re-read as v1
		const token = u8aToHex(
			ProcaptchaTokenCodec.enc({
				commitmentId: undefined,
				providerUrl: undefined,
				dapp: minimal.dapp,
				user: minimal.user,
				challenge: undefined,
				nonce: undefined,
				timestamp: minimal.timestamp,
				signature: {
					provider: { challenge: undefined, requestHash: undefined },
					user: { timestamp: undefined, requestHash: undefined },
				},
				captchaType: "not-a-captcha-type",
			}),
		);
		expect(() => decodeProcaptchaOutput(token)).toThrow(ZodError);
	});
});

describe("ProcaptchaOutputSchema", () => {
	it("accepts the minimal shape", () => {
		expect(ProcaptchaOutputSchema.safeParse(minimal).success).toBe(true);
	});

	it("requires the dapp account", () => {
		const { dapp: _dapp, ...rest } = minimal;
		expect(ProcaptchaOutputSchema.safeParse(rest).success).toBe(false);
	});

	it("requires the user account", () => {
		const { user: _user, ...rest } = minimal;
		expect(ProcaptchaOutputSchema.safeParse(rest).success).toBe(false);
	});

	it("requires the timestamp", () => {
		const { timestamp: _timestamp, ...rest } = minimal;
		expect(ProcaptchaOutputSchema.safeParse(rest).success).toBe(false);
	});

	it("requires the signature envelope", () => {
		const { signature: _signature, ...rest } = minimal;
		expect(ProcaptchaOutputSchema.safeParse(rest).success).toBe(false);
	});

	it("requires the timestamp to be a string, not a number", () => {
		expect(
			ProcaptchaOutputSchema.safeParse({ ...minimal, timestamp: 1 }).success,
		).toBe(false);
	});

	it("requires the nonce to be a number, not a string", () => {
		expect(
			ProcaptchaOutputSchema.safeParse({ ...minimal, nonce: "1" }).success,
		).toBe(false);
	});

	it("rejects an unknown captcha type", () => {
		expect(
			ProcaptchaOutputSchema.safeParse({ ...minimal, captchaType: "nope" })
				.success,
		).toBe(false);
	});
});
