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

import { IpAddressType } from "@prosopo/types";
import { Long } from "mongodb";
import mongoose, { Schema } from "mongoose";
import { describe, expect, test } from "vitest";
import { CompositeIpAddressRecordSchemaObj } from "../types/provider.js";

const model = mongoose.model(
	"test-composite-ip",
	new Schema(CompositeIpAddressRecordSchemaObj),
);

/**
 * An IPv6 address is stored as two 64-bit halves. The halves arrive from three
 * different places — application code (bigint), the mongo driver on read-back
 * (BSON Long), and JSON (string) — and every one of them has to land on the
 * same Decimal128, or the same address stops matching itself across writes.
 */
const store = (lower: bigint | number | string | Long): string | undefined =>
	new model({ lower, type: IpAddressType.v6 }).get("lower")?.toString();

describe("storing the halves of an ip address", () => {
	test("keeps a bigint exact instead of rounding it through a double", () => {
		// 2^64-1 is beyond Number.MAX_SAFE_INTEGER; the naive path would lose
		// the low bits and collapse distinct addresses onto one another.
		expect(store(18446744073709551615n)).toBe("18446744073709551615");
	});

	test("keeps zero as zero rather than dropping the required field", () => {
		expect(store(0n)).toBe("0");
	});

	test("reads a BSON Long back as the unsigned value it was written as", () => {
		// Long.fromBits defaults to signed, so the top-bit-set case is where a
		// missing `unsigned` flag shows up: it would come back negative.
		expect(store(Long.fromString("18446744073709551615", true))).toBe(
			"18446744073709551615",
		);
	});

	test("recognises a Long from a different bson copy by its _bsontype", () => {
		// The driver may deserialise with its own bundled bson, so an
		// instanceof check would silently skip normalisation. This stand-in has
		// the right shape and brand but no shared class identity.
		const foreign = { _bsontype: "Long", low: -1, high: -1 };
		expect(
			new model({ lower: foreign, type: IpAddressType.v6 })
				.get("lower")
				?.toString(),
		).toBe("18446744073709551615");
	});

	test("passes a decimal string straight through", () => {
		expect(store("12345678901234567890")).toBe("12345678901234567890");
	});

	test("passes a small number through unharmed", () => {
		expect(store(3232235777)).toBe("3232235777");
	});

	test("treats an object that merely looks like a Long as an ordinary value", () => {
		// Without the _bsontype brand it is handed to the Decimal128 cast as-is,
		// which rejects it — better than silently storing the wrong number.
		const notLong = { low: 1, high: 0 };
		expect(
			new model({ lower: notLong, type: IpAddressType.v6 }).validateSync()
				?.errors.lower,
		).toBeDefined();
	});
});

describe("what a composite ip record has to carry", () => {
	test("insists on the lower half and the address type", () => {
		const errors = new model({}).validateSync()?.errors;
		expect(errors?.lower).toBeDefined();
		expect(errors?.type).toBeDefined();
	});

	test("leaves the upper half optional, since v4 has only one", () => {
		const doc = new model({ lower: 3232235777n, type: IpAddressType.v4 });
		expect(doc.validateSync()).toBeUndefined();
		expect(doc.get("upper")).toBeUndefined();
	});

	test("normalises the upper half the same way as the lower", () => {
		const doc = new model({
			lower: 0n,
			upper: Long.fromString("18446744073709551615", true),
			type: IpAddressType.v6,
		});
		expect(doc.get("upper")?.toString()).toBe("18446744073709551615");
	});

	test("rejects an address type outside the known set", () => {
		expect(
			new model({ lower: 1n, type: "v5" }).validateSync()?.errors.type,
		).toBeDefined();
	});

	test("accepts every address type the shared enum defines", () => {
		for (const type of Object.values(IpAddressType)) {
			expect(new model({ lower: 1n, type }).validateSync()).toBeUndefined();
		}
	});
});
