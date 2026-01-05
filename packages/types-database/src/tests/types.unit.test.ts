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

import { describe, expectTypeOf, it } from "vitest";
import type {
	CompositeIpAddress,
	MongooseCompositeIpAddress,
} from "../types/provider.js";
import {
	IpAddressType,
	parseMongooseCompositeIpAddress,
} from "../types/provider.js";

describe("type tests", () => {
	describe("parseMongooseCompositeIpAddress", () => {
		it("should accept MongooseCompositeIpAddress parameter", () => {
			const input: MongooseCompositeIpAddress = {
				lower: { $numberDecimal: "123" },
				type: IpAddressType.v4,
			};
			expectTypeOf(input).toMatchTypeOf<MongooseCompositeIpAddress>();
			parseMongooseCompositeIpAddress(input);
		});

		it("should return CompositeIpAddress", () => {
			const input: MongooseCompositeIpAddress = {
				lower: { $numberDecimal: "123" },
				type: IpAddressType.v4,
			};
			const result = parseMongooseCompositeIpAddress(input);
			expectTypeOf(result).toMatchTypeOf<CompositeIpAddress>();
		});

		it("should return correct type structure", () => {
			const input: MongooseCompositeIpAddress = {
				lower: { $numberDecimal: "123" },
				upper: { $numberDecimal: "456" },
				type: IpAddressType.v6,
			};
			const result = parseMongooseCompositeIpAddress(input);
			expectTypeOf(result.lower).toEqualTypeOf<number | bigint>();
			expectTypeOf(result.upper).toEqualTypeOf<number | bigint | undefined>();
			expectTypeOf(result.type).toEqualTypeOf<IpAddressType>();
		});
	});
});
