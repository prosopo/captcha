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

import { IpAddressType } from "@prosopo/types-database";
import { Address4, Address6 } from "ip-address";
import { describe, expect, it } from "vitest";
import {
	getCompositeIpAddress,
	getIpAddressFromComposite,
} from "../../compositeIpAddress.js";

describe("compositeIpAddress", () => {
	it("returns default if ip is invalid", () => {
		const compositeIpAddress = getCompositeIpAddress("wrong");

		expect(compositeIpAddress).toEqual({
			lower: 0n,
			type: IpAddressType.v4,
		});
	});

	describe("v4", () => {
		const ip = {
			asString: "127.0.0.1",
			asNumeric: 2130706433n,
		};

		it("writes ip string to lower field as numeric", () => {
			const compositeIpAddress = getCompositeIpAddress(ip.asString);

			expect(compositeIpAddress).toEqual({
				lower: ip.asNumeric,
				type: IpAddressType.v4,
			});
		});

		it("writes ip object to lower field as numeric", () => {
			const ipAddress = new Address4(ip.asString);
			const compositeIpAddress = getCompositeIpAddress(ipAddress);

			expect(compositeIpAddress).toEqual({
				lower: ip.asNumeric,
				type: IpAddressType.v4,
			});
		});

		it("gets ip object from composite", async () => {
			const compositeIpAddress = getIpAddressFromComposite({
				lower: ip.asNumeric,
				type: IpAddressType.v4,
			});

			expect(compositeIpAddress).instanceof(Address4);
			expect(compositeIpAddress.isCorrect).toBeTruthy();
			expect(compositeIpAddress.address).toEqual(ip.asString);
			expect(compositeIpAddress.bigInt()).toEqual(ip.asNumeric);
		});
	});

	describe("v6", () => {
		const ip = {
			asString: "2001:0db8:1234:5678:abcd:ef01:2345:6789",
			asNumeric: 42540766416916595525814786279296296841n,
			lower: 12379813738877118345n,
			upper: 2306139568420968056n,
		};

		it("writes ip string to both fields as numeric", () => {
			const compositeIpAddress = getCompositeIpAddress(ip.asString);

			expect(compositeIpAddress).toEqual({
				lower: ip.lower,
				upper: ip.upper,
				type: IpAddressType.v6,
			});
		});

		it("writes ip object to both fields as numeric", () => {
			const ipAddress = new Address6(ip.asString);
			const compositeIpAddress = getCompositeIpAddress(ipAddress);

			expect(compositeIpAddress).toEqual({
				lower: ip.lower,
				upper: ip.upper,
				type: IpAddressType.v6,
			});
		});

		it("writes wrong format ip string as proper numbers", () => {
			const wrongFormatComposite = getCompositeIpAddress("::ffff:127.0.0.1");
			const rightFormatComposite = getCompositeIpAddress("::ffff:7f00:1");

			expect(wrongFormatComposite).toEqual(rightFormatComposite);
		});

		it("gets ip object from composite", async () => {
			const compositeIpAddress = getIpAddressFromComposite({
				lower: ip.lower,
				upper: ip.upper,
				type: IpAddressType.v6,
			});

			expect(compositeIpAddress).instanceof(Address6);
			expect(compositeIpAddress.isCorrect).toBeTruthy();
			expect(compositeIpAddress.address).toEqual(ip.asString);
			expect(compositeIpAddress.bigInt()).toEqual(ip.asNumeric);
		});
	});
});
