// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import { describe, expect, it } from "vitest";
import { ApiParams } from "../api/params.js";
import {
	type ProcaptchaOutput,
	ProcaptchaOutputSchema,
	type ProcaptchaToken,
	ProcaptchaTokenSpec,
	decodeProcaptchaOutput,
	encodeProcaptchaOutput,
} from "./token.js";

describe("procaptcha token", () => {
	describe("encodeProcaptchaOutput", () => {
		it("encodes a complete procaptcha output to a hex token", () => {
			const output: ProcaptchaOutput = {
				[ApiParams.dapp]: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				[ApiParams.user]: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				[ApiParams.timestamp]: "1234567890",
				[ApiParams.signature]: {
					[ApiParams.provider]: {
						[ApiParams.challenge]: "0x1234",
						[ApiParams.requestHash]: "0x5678",
					},
					[ApiParams.user]: {
						[ApiParams.timestamp]: "1234567890",
						[ApiParams.requestHash]: "0x9abc",
					},
				},
			};

			const token = encodeProcaptchaOutput(output);
			expect(token).toMatch(/^0x[0-9a-f]+$/i);
			expect(typeof token).toBe("string");
		});

		it("encodes procaptcha output with optional fields", () => {
			const output: ProcaptchaOutput = {
				[ApiParams.dapp]: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				[ApiParams.user]: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				[ApiParams.timestamp]: "1234567890",
				[ApiParams.commitmentId]: "0xcommitment",
				[ApiParams.providerUrl]: "https://provider.example.com",
				[ApiParams.challenge]: "0xchallenge",
				[ApiParams.nonce]: 42,
				[ApiParams.signature]: {
					[ApiParams.provider]: {
						[ApiParams.challenge]: "0x1234",
						[ApiParams.requestHash]: "0x5678",
					},
					[ApiParams.user]: {
						[ApiParams.timestamp]: "1234567890",
						[ApiParams.requestHash]: "0x9abc",
					},
				},
			};

			const token = encodeProcaptchaOutput(output);
			expect(token).toMatch(/^0x[0-9a-f]+$/i);
		});

		it("encodes procaptcha output with partial signature fields", () => {
			const output: ProcaptchaOutput = {
				[ApiParams.dapp]: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				[ApiParams.user]: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				[ApiParams.timestamp]: "1234567890",
				[ApiParams.signature]: {
					[ApiParams.provider]: {},
					[ApiParams.user]: {
						[ApiParams.timestamp]: "1234567890",
					},
				},
			};

			const token = encodeProcaptchaOutput(output);
			expect(token).toMatch(/^0x[0-9a-f]+$/i);
		});

		it("produces consistent output for same input", () => {
			const output: ProcaptchaOutput = {
				[ApiParams.dapp]: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				[ApiParams.user]: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				[ApiParams.timestamp]: "1234567890",
				[ApiParams.signature]: {
					[ApiParams.provider]: {
						[ApiParams.challenge]: "0x1234",
					},
					[ApiParams.user]: {
						[ApiParams.timestamp]: "1234567890",
					},
				},
			};

			const token1 = encodeProcaptchaOutput(output);
			const token2 = encodeProcaptchaOutput(output);
			expect(token1).toBe(token2);
		});
	});

	describe("decodeProcaptchaOutput", () => {
		it("decodes a valid procaptcha token", () => {
			const output: ProcaptchaOutput = {
				[ApiParams.dapp]: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				[ApiParams.user]: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				[ApiParams.timestamp]: "1234567890",
				[ApiParams.signature]: {
					[ApiParams.provider]: {
						[ApiParams.challenge]: "0x1234",
						[ApiParams.requestHash]: "0x5678",
					},
					[ApiParams.user]: {
						[ApiParams.timestamp]: "1234567890",
						[ApiParams.requestHash]: "0x9abc",
					},
				},
			};

			const token = encodeProcaptchaOutput(output);
			const decoded = decodeProcaptchaOutput(token);

			expect(decoded[ApiParams.dapp]).toBe(output[ApiParams.dapp]);
			expect(decoded[ApiParams.user]).toBe(output[ApiParams.user]);
			expect(decoded[ApiParams.timestamp]).toBe(output[ApiParams.timestamp]);
		});

		it("round-trips encode and decode correctly", () => {
			const original: ProcaptchaOutput = {
				[ApiParams.dapp]: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				[ApiParams.user]: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				[ApiParams.timestamp]: "1234567890",
				[ApiParams.commitmentId]: "0xcommitment",
				[ApiParams.providerUrl]: "https://provider.example.com",
				[ApiParams.challenge]: "0xchallenge",
				[ApiParams.nonce]: 42,
				[ApiParams.signature]: {
					[ApiParams.provider]: {
						[ApiParams.challenge]: "0x1234",
						[ApiParams.requestHash]: "0x5678",
					},
					[ApiParams.user]: {
						[ApiParams.timestamp]: "1234567890",
						[ApiParams.requestHash]: "0x9abc",
					},
				},
			};

			const token = encodeProcaptchaOutput(original);
			const decoded = decodeProcaptchaOutput(token);

			expect(decoded[ApiParams.dapp]).toBe(original[ApiParams.dapp]);
			expect(decoded[ApiParams.user]).toBe(original[ApiParams.user]);
			expect(decoded[ApiParams.timestamp]).toBe(original[ApiParams.timestamp]);
		});

		it("throws error for invalid hex string", () => {
			const invalidToken = "not-a-hex-string" as ProcaptchaToken;
			expect(() => decodeProcaptchaOutput(invalidToken)).toThrow();
		});

		it("throws error for empty string", () => {
			const emptyToken = "" as ProcaptchaToken;
			expect(() => decodeProcaptchaOutput(emptyToken)).toThrow();
		});
	});

	describe("ProcaptchaTokenSpec", () => {
		it("validates token starts with 0x", () => {
			expect(() => ProcaptchaTokenSpec.parse("0x1234")).not.toThrow();
		});

		it("rejects token without 0x prefix", () => {
			expect(() => ProcaptchaTokenSpec.parse("1234")).toThrow();
		});

		it("rejects empty string", () => {
			expect(() => ProcaptchaTokenSpec.parse("")).toThrow();
		});
	});

	describe("ProcaptchaOutputSchema", () => {
		it("validates complete procaptcha output", () => {
			const output = {
				[ApiParams.dapp]: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				[ApiParams.user]: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				[ApiParams.timestamp]: "1234567890",
				[ApiParams.signature]: {
					[ApiParams.provider]: {
						[ApiParams.challenge]: "0x1234",
					},
					[ApiParams.user]: {
						[ApiParams.timestamp]: "1234567890",
					},
				},
			};

			expect(() => ProcaptchaOutputSchema.parse(output)).not.toThrow();
		});

		it("rejects output without required fields", () => {
			const invalidOutput = {
				[ApiParams.dapp]: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			};

			expect(() => ProcaptchaOutputSchema.parse(invalidOutput)).toThrow();
		});

		it("validates output with optional fields", () => {
			const output = {
				[ApiParams.dapp]: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				[ApiParams.user]: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				[ApiParams.timestamp]: "1234567890",
				[ApiParams.commitmentId]: "0xcommitment",
				[ApiParams.providerUrl]: "https://provider.example.com",
				[ApiParams.challenge]: "0xchallenge",
				[ApiParams.nonce]: 42,
				[ApiParams.signature]: {
					[ApiParams.provider]: {},
					[ApiParams.user]: {},
				},
			};

			expect(() => ProcaptchaOutputSchema.parse(output)).not.toThrow();
		});
	});
});
