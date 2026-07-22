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

import { ProsopoContractError, ProsopoEnvError } from "@prosopo/common";
import { describe, expect, it } from "vitest";
import type { ArgumentsCamelCase } from "yargs";
import {
	validateAddress,
	validateScheduleExpression,
	validateSiteKey,
	validateValue,
} from "../../commands/validators.js";

// Well-formed Substrate SS58 test address (Alice's dev key). `encodeStringAddress`
// round-trips this through util-crypto's decode+encode, so a valid input maps to
// a canonical SS58 string.
const VALID_SS58_ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
// Corresponding public-key hex.
const VALID_HEX_ADDRESS =
	"0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d";
const INVALID_ADDRESS = "not-a-real-address";

// Minimal ArgumentsCamelCase-shaped object. Yargs adds `_` and `$0`; the
// validators only touch the specific keys they care about, so keeping this
// object tight isolates the field-under-test.
const argv = (extras: Record<string, unknown>): ArgumentsCamelCase => ({
	_: [],
	$0: "test",
	...extras,
});

describe("validateAddress", () => {
	it("returns the encoded SS58 form of a valid SS58 input", () => {
		const { address } = validateAddress(argv({ address: VALID_SS58_ADDRESS }));
		expect(typeof address).toBe("string");
		// Same key, so re-encoded output matches the input.
		expect(address).toBe(VALID_SS58_ADDRESS);
	});

	it("returns the encoded SS58 form when given a hex address", () => {
		const { address } = validateAddress(argv({ address: VALID_HEX_ADDRESS }));
		// Hex input for the same public key round-trips to the same SS58 string.
		expect(address).toBe(VALID_SS58_ADDRESS);
	});

	it("throws ProsopoContractError with INVALID_ADDRESS code on garbage input", () => {
		expect(() => validateAddress(argv({ address: INVALID_ADDRESS }))).toThrow(
			ProsopoContractError,
		);
		expect(() => validateAddress(argv({ address: INVALID_ADDRESS }))).toThrow(
			"CONTRACT.INVALID_ADDRESS",
		);
	});
});

describe("validateSiteKey", () => {
	it("returns the encoded SS58 form of a valid SS58 input", () => {
		const { sitekey } = validateSiteKey(argv({ sitekey: VALID_SS58_ADDRESS }));
		expect(sitekey).toBe(VALID_SS58_ADDRESS);
	});

	it("returns the encoded SS58 form when given a hex site key", () => {
		const { sitekey } = validateSiteKey(argv({ sitekey: VALID_HEX_ADDRESS }));
		expect(sitekey).toBe(VALID_SS58_ADDRESS);
	});

	it("throws ProsopoContractError with INVALID_ADDRESS code on garbage input", () => {
		expect(() => validateSiteKey(argv({ sitekey: INVALID_ADDRESS }))).toThrow(
			ProsopoContractError,
		);
		expect(() => validateSiteKey(argv({ sitekey: INVALID_ADDRESS }))).toThrow(
			"CONTRACT.INVALID_ADDRESS",
		);
	});
});

describe("validateValue", () => {
	it("returns the numeric value wrapped as Compact<u128> when input is a number", () => {
		const result = validateValue(argv({ value: 42 }));
		// The validator casts through unknown without normalising, so the value
		// object is the same reference we passed in.
		expect(result.value).toBe(42);
	});

	it("accepts zero", () => {
		const result = validateValue(argv({ value: 0 }));
		expect(result.value).toBe(0);
	});

	it("throws ProsopoEnvError with PARAMETER_ERROR on string input", () => {
		expect(() => validateValue(argv({ value: "42" }))).toThrow(ProsopoEnvError);
		expect(() => validateValue(argv({ value: "42" }))).toThrow(
			"CLI.PARAMETER_ERROR",
		);
	});

	it("throws ProsopoEnvError on undefined value", () => {
		expect(() => validateValue(argv({}))).toThrow(ProsopoEnvError);
	});

	it("throws ProsopoEnvError on boolean / object / null inputs", () => {
		expect(() => validateValue(argv({ value: true }))).toThrow(ProsopoEnvError);
		expect(() => validateValue(argv({ value: null }))).toThrow(ProsopoEnvError);
		expect(() => validateValue(argv({ value: {} }))).toThrow(ProsopoEnvError);
	});
});

describe("validateScheduleExpression", () => {
	it("returns the cron string when it parses cleanly", () => {
		const result = validateScheduleExpression(argv({ schedule: "0 0 * * *" }));
		expect(result.schedule).toBe("0 0 * * *");
	});

	it("returns null schedule when argv.schedule is not a string", () => {
		expect(validateScheduleExpression(argv({}))).toEqual({ schedule: null });
		expect(validateScheduleExpression(argv({ schedule: 42 }))).toEqual({
			schedule: null,
		});
		expect(validateScheduleExpression(argv({ schedule: undefined }))).toEqual({
			schedule: null,
		});
	});

	it("accepts a variety of valid cron expressions", () => {
		const valid = ["*/5 * * * *", "30 3 * * 1", "0 12 1 * *", "15 14 1 * *"];
		for (const expr of valid) {
			expect(
				validateScheduleExpression(argv({ schedule: expr })).schedule,
				`cron expression ${expr} should parse`,
			).toBe(expr);
		}
	});
});
