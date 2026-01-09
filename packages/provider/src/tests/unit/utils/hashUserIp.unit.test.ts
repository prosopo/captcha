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
import { hashUserIp } from "../../../utils/hashUserIp.js";

describe("hashUserIp", () => {
	it("returns a 64-character hex string", () => {
		const result = hashUserIp("user123", "192.168.1.1", "sitekey456");
		expect(result).toHaveLength(64);
		expect(result).toMatch(/^[0-9a-f]{64}$/);
	});

	it("returns consistent hash for same inputs", () => {
		const hash1 = hashUserIp("user123", "192.168.1.1", "sitekey456");
		const hash2 = hashUserIp("user123", "192.168.1.1", "sitekey456");
		expect(hash1).toBe(hash2);
	});

	it("returns different hash for different user", () => {
		const hash1 = hashUserIp("user123", "192.168.1.1", "sitekey456");
		const hash2 = hashUserIp("user456", "192.168.1.1", "sitekey456");
		expect(hash1).not.toBe(hash2);
	});

	it("returns different hash for different IP", () => {
		const hash1 = hashUserIp("user123", "192.168.1.1", "sitekey456");
		const hash2 = hashUserIp("user123", "192.168.1.2", "sitekey456");
		expect(hash1).not.toBe(hash2);
	});

	it("returns different hash for different sitekey", () => {
		const hash1 = hashUserIp("user123", "192.168.1.1", "sitekey456");
		const hash2 = hashUserIp("user123", "192.168.1.1", "sitekey789");
		expect(hash1).not.toBe(hash2);
	});

	it("handles empty strings", () => {
		const result = hashUserIp("", "", "");
		expect(result).toHaveLength(64);
		expect(result).toMatch(/^[0-9a-f]{64}$/);
	});

	it("handles IPv6 addresses", () => {
		const result = hashUserIp(
			"user123",
			"2001:0db8:85a3:0000:0000:8a2e:0370:7334",
			"sitekey456",
		);
		expect(result).toHaveLength(64);
		expect(result).toMatch(/^[0-9a-f]{64}$/);
	});

	it("includes all three parameters in hash", () => {
		const hash1 = hashUserIp("user", "ip", "sitekey");
		const hash2 = hashUserIp("user:ip:sitekey", "", "");
		expect(hash1).not.toBe(hash2);
	});
});

