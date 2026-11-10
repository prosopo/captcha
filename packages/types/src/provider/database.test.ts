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
import { describe, expect, it } from "vitest";
import {
	IpAddressType,
	SessionSchema,
	parseMongooseCompositeIpAddress,
} from "./database.js";

describe("parseMongooseCompositeIpAddress", () => {
	it("reads $numberDecimal strings exactly", () => {
		expect(
			parseMongooseCompositeIpAddress({
				lower: { $numberDecimal: "18446744073709551615" },
				upper: { $numberDecimal: "1" },
				type: IpAddressType.v6,
			}),
		).toEqual({
			lower: 18446744073709551615n,
			upper: 1n,
			type: IpAddressType.v6,
		});
	});

	it("reads a Decimal128-like value through its string form", () => {
		// The declared type promises $numberDecimal; a driver Decimal128 lacks it.
		const decimal: { $numberDecimal: string } = Object.create({
			toString: () => "3405803783",
		});
		expect(
			parseMongooseCompositeIpAddress({
				lower: decimal,
				type: IpAddressType.v4,
			}).lower,
		).toBe(3405803783n);
	});

	it("names the field when a value is not an integer", () => {
		expect(() =>
			parseMongooseCompositeIpAddress({
				lower: { $numberDecimal: "1.5E+3" },
				type: IpAddressType.v4,
			}),
		).toThrow(/composite IP address lower/);
	});
});

describe("SessionSchema tcp-probe timestamps", () => {
	const fields = ["synNs", "synackNs", "ackNs"] as const;

	it.each(fields)(
		"%s accepts nanosecond epochs above MAX_SAFE_INTEGER",
		(field) => {
			const nanos: number = 1_762_700_000_000_000_000;
			expect(nanos).toBeGreaterThan(Number.MAX_SAFE_INTEGER);
			expect(SessionSchema.shape[field].safeParse(nanos).success).toBe(true);
		},
	);

	it.each(fields)("%s rejects values beyond u64", (field) => {
		expect(SessionSchema.shape[field].safeParse(2 ** 65).success).toBe(false);
		expect(SessionSchema.shape[field].safeParse(-1).success).toBe(false);
	});
});
