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

import { Address4 } from "ip-address";
import { describe, expect, it } from "vitest";
import { userScopeInput } from "#policy/ruleInput/userScopeInput.js";

describe("userScopeInput", () => {
	it("should parse valid user scope with numeric IP", () => {
		const result = userScopeInput.parse({
			numericIp: BigInt(2130706433), // 127.0.0.1
		});

		expect(result.numericIp).toBe(BigInt(2130706433));
	});

	it("should parse valid user scope with string IP", () => {
		const result = userScopeInput.parse({
			ip: "127.0.0.1",
		});

		expect(result.numericIp).toBe(new Address4("127.0.0.1").bigInt());
	});

	it("should parse valid user scope with IP mask", () => {
		const result = userScopeInput.parse({
			ipMask: "127.0.0.0/24",
		});

		const ipObject = new Address4("127.0.0.0/24");
		expect(result.numericIpMaskMin).toBe(ipObject.startAddress().bigInt());
		expect(result.numericIpMaskMax).toBe(ipObject.endAddress().bigInt());
	});

	it("should parse valid user scope with numeric IP mask", () => {
		const result = userScopeInput.parse({
			numericIpMaskMin: BigInt(100),
			numericIpMaskMax: BigInt(200),
		});

		expect(result.numericIpMaskMin).toBe(BigInt(100));
		expect(result.numericIpMaskMax).toBe(BigInt(200));
	});

	it("should hash user agent string", () => {
		const result = userScopeInput.parse({
			userAgent: "Mozilla/5.0",
		});

		expect(result.userAgentHash).toBeDefined();
		expect(typeof result.userAgentHash).toBe("string");
		expect(result.userAgentHash.length).toBe(64); // SHA256 hex length
	});

	it("should parse user attributes", () => {
		const result = userScopeInput.parse({
			userId: "user1",
			ja4Hash: "ja4hash",
			headersHash: "headershash",
			headHash: "headhash",
			coords: "[[[100,200]]]",
		});

		expect(result.userId).toBe("user1");
		expect(result.ja4Hash).toBe("ja4hash");
		expect(result.headersHash).toBe("headershash");
		expect(result.headHash).toBe("headhash");
		expect(result.coords).toBe("[[[100,200]]]");
	});

	it("should coerce user attributes to strings", () => {
		const result = userScopeInput.parse({
			userId: 123,
			ja4Hash: 456,
		});

		expect(result.userId).toBe("123");
		expect(result.ja4Hash).toBe("456");
	});

	it("should parse empty user scope", () => {
		const result = userScopeInput.parse({});

		expect(result).toBeDefined();
	});

	it("should prioritize numeric IP over string IP", () => {
		const result = userScopeInput.parse({
			ip: "127.0.0.1",
			numericIp: BigInt(2130706433),
		});

		expect(result.numericIp).toBe(BigInt(2130706433));
	});

	it("should prioritize numeric IP mask over string IP mask", () => {
		const result = userScopeInput.parse({
			ipMask: "127.0.0.0/24",
			numericIpMaskMin: BigInt(100),
			numericIpMaskMax: BigInt(200),
		});

		expect(result.numericIpMaskMin).toBe(BigInt(100));
		expect(result.numericIpMaskMax).toBe(BigInt(200));
	});

	it("should handle userAgentHash directly", () => {
		const result = userScopeInput.parse({
			userAgentHash: "directhash",
		});

		expect(result.userAgentHash).toBe("directhash");
	});

	it("should prioritize userAgentHash over userAgent", () => {
		const result = userScopeInput.parse({
			userAgent: "Mozilla/5.0",
			userAgentHash: "directhash",
		});

		expect(result.userAgentHash).toBe("directhash");
	});
});
