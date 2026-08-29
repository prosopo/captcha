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

import { type CompositeIpAddress, IpAddressType } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { getCompositeIpAddress } from "../../../../compositeIpAddress.js";
import { ipMatchesSession } from "../../../../tasks/frictionless/ipMatch.js";

// IP-binding is the load-bearing replay defence for Web Bot Auth
// authenticated sessions. If this comparison silently accepts a mismatch
// (empty string, garbage, wrong-version IP, off-by-one bigint), a leaked
// token becomes a bearer credential. The failure mode is silent — so the
// tests here are worth their weight in outages avoided.

const composeV4 = (ip: string): CompositeIpAddress => getCompositeIpAddress(ip);
const composeV6 = (ip: string): CompositeIpAddress => getCompositeIpAddress(ip);

describe("ipMatchesSession", () => {
	describe("IPv4", () => {
		it("matches identical v4 addresses", () => {
			const session = composeV4("192.0.2.42");
			expect(ipMatchesSession("192.0.2.42", session)).toBe(true);
		});

		it("rejects off-by-one v4 addresses", () => {
			const session = composeV4("192.0.2.42");
			expect(ipMatchesSession("192.0.2.43", session)).toBe(false);
		});

		it("rejects the /24 neighbour", () => {
			const session = composeV4("192.0.2.42");
			expect(ipMatchesSession("192.0.3.42", session)).toBe(false);
		});
	});

	describe("IPv6", () => {
		it("matches identical v6 addresses", () => {
			const session = composeV6("2001:db8::1");
			expect(ipMatchesSession("2001:db8::1", session)).toBe(true);
		});

		it("matches equivalent v6 canonicalisations", () => {
			const session = composeV6("2001:db8:0:0:0:0:0:1");
			// Compressed form of the same address.
			expect(ipMatchesSession("2001:db8::1", session)).toBe(true);
		});

		it("rejects sibling v6 addresses", () => {
			const session = composeV6("2001:db8::1");
			expect(ipMatchesSession("2001:db8::2", session)).toBe(false);
		});

		it("rejects v6 addresses that only differ in the upper half", () => {
			// Same lower 64 bits, different upper 64 bits — would slip through
			// a lower-only comparison. This is why the function checks both.
			const session = composeV6("2001:db8::1");
			expect(ipMatchesSession("2001:db9::1", session)).toBe(false);
		});
	});

	describe("Cross-family", () => {
		it("rejects a v4 operator IP against a v6 session", () => {
			const session = composeV6("2001:db8::1");
			expect(ipMatchesSession("192.0.2.42", session)).toBe(false);
		});

		it("rejects a v6 operator IP against a v4 session", () => {
			const session = composeV4("192.0.2.42");
			expect(ipMatchesSession("2001:db8::1", session)).toBe(false);
		});
	});

	describe("Malformed input", () => {
		it("rejects an empty operator IP against any real session", () => {
			expect(ipMatchesSession("", composeV4("192.0.2.42"))).toBe(false);
			expect(ipMatchesSession("", composeV6("2001:db8::1"))).toBe(false);
		});

		it("rejects garbage operator IP against any real session", () => {
			expect(ipMatchesSession("not.an.ip", composeV4("192.0.2.42"))).toBe(
				false,
			);
			expect(ipMatchesSession("g:h:i", composeV6("2001:db8::1"))).toBe(false);
		});

		it("rejects the malformed-IP sentinel against a real v4 session", () => {
			// getCompositeIpAddress returns {lower: 0n, type: v4} for garbage.
			// A REAL v4 session with lower=0n would be 0.0.0.0 — never a
			// legitimate client IP in production. Guard against the corner
			// anyway by asserting the sentinel doesn't match a normal address.
			const realSession = composeV4("1.1.1.1");
			expect(ipMatchesSession("", realSession)).toBe(false);
		});
	});

	describe("Regression: the sentinel-v4 corner case", () => {
		it("sentinel {lower: 0n, type: v4} matches 0.0.0.0 (documented corner)", () => {
			// Documented: getCompositeIpAddress degrades to {lower: 0n, type: v4}
			// on parse failure. A session that was somehow issued with 0.0.0.0
			// would collide with any garbage operator IP. Not a realistic path
			// (real client IPs aren't 0.0.0.0) but recorded here so a future
			// change of the degradation sentinel is caught by test drift.
			const zeroSession: CompositeIpAddress = {
				lower: 0n,
				type: IpAddressType.v4,
			};
			expect(ipMatchesSession("", zeroSession)).toBe(true);
			expect(ipMatchesSession("not.an.ip", zeroSession)).toBe(true);
		});
	});
});
