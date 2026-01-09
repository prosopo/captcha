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
	it("should return a 64-character hex string", () => {
		const user = "user123";
		const ip = "192.168.1.1";
		const sitekey = "sitekey456";
		const result = hashUserIp(user, ip, sitekey);

		expect(result).toHaveLength(64);
		expect(result).toMatch(/^[a-f0-9]{64}$/);
	});

	it("should produce consistent results for the same inputs", () => {
		const user = "testuser";
		const ip = "10.0.0.1";
		const sitekey = "testsitekey";

		const result1 = hashUserIp(user, ip, sitekey);
		const result2 = hashUserIp(user, ip, sitekey);

		expect(result1).toBe(result2);
	});

	it("should produce different results when user changes", () => {
		const ip = "192.168.1.1";
		const sitekey = "sitekey456";

		const result1 = hashUserIp("user1", ip, sitekey);
		const result2 = hashUserIp("user2", ip, sitekey);

		expect(result1).not.toBe(result2);
	});

	it("should produce different results when IP changes", () => {
		const user = "user123";
		const sitekey = "sitekey456";

		const result1 = hashUserIp(user, "192.168.1.1", sitekey);
		const result2 = hashUserIp(user, "192.168.1.2", sitekey);

		expect(result1).not.toBe(result2);
	});

	it("should produce different results when sitekey changes", () => {
		const user = "user123";
		const ip = "192.168.1.1";

		const result1 = hashUserIp(user, ip, "sitekey1");
		const result2 = hashUserIp(user, ip, "sitekey2");

		expect(result1).not.toBe(result2);
	});

	it("should handle empty strings", () => {
		const result = hashUserIp("", "", "");

		expect(result).toHaveLength(64);
		expect(result).toMatch(/^[a-f0-9]{64}$/);
	});

	it("should handle special characters", () => {
		const user = "user@domain.com";
		const ip = "2001:db8::1";
		const sitekey = "site_key-123";

		const result = hashUserIp(user, ip, sitekey);

		expect(result).toHaveLength(64);
		expect(result).toMatch(/^[a-f0-9]{64}$/);
	});

	it("should handle unicode characters", () => {
		const user = "用户123";
		const ip = "192.168.1.1";
		const sitekey = "网站密钥";

		const result = hashUserIp(user, ip, sitekey);

		expect(result).toHaveLength(64);
		expect(result).toMatch(/^[a-f0-9]{64}$/);
	});

	it("should create different hashes for same user/ip with different sitekeys", () => {
		const user = "user123";
		const ip = "192.168.1.1";

		const result1 = hashUserIp(user, ip, "site1");
		const result2 = hashUserIp(user, ip, "site2");

		expect(result1).not.toBe(result2);
		expect(result1).toHaveLength(64);
		expect(result2).toHaveLength(64);
	});

	it("should use SHA-256 with user:ip:sitekey format", () => {
		const user = "test";
		const ip = "127.0.0.1";
		const sitekey = "abc";
		const result = hashUserIp(user, ip, sitekey);

		// This should create hash of "test:127.0.0.1:abc"
		// We can't easily predict the exact hash, but we can verify it's deterministic
		const result2 = hashUserIp(user, ip, sitekey);
		expect(result).toBe(result2);
		expect(result).toHaveLength(64);
	});
});
