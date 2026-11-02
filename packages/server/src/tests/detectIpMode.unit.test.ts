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

// Locks in the ipMode-routing contract for `verifyCaptcha`.
//
// The provider list at https://provider-list.prosopo.io/ carries three
// concurrent views — dual-stack at the top level
// (`https://pronodeN.prosopo.io`), plus `ipv4` and `ipv6` sub-objects
// containing single-stack sub-zone URLs
// (`https://ipv4.pronodeN.prosopo.io`). A token whose session pinned
// itself to a sub-zone advertises the sub-zone URL on its
// `providerUrl` field; if the caller loads only the dual-stack default
// section, the exact-string `providers.find(p => p.url === providerUrl)`
// misses and the lambda emits `Provider not found`, leaving
// `serverChecked` on the mongo captcha record false.
//
// `detectIpMode` derives which section the token was minted from so
// the caller can ask the load-balancer for the matching one. The
// alternative — canonicalising URLs by stripping the label — would
// risk collapsing an ipv4-pinned lookup onto the dual-stack entry and
// silently hiding a misroute; keeping the sections separate keeps the
// equality check honest.

import { describe, expect, it } from "vitest";
import { detectIpMode } from "../server.js";

describe("detectIpMode", () => {
	// ── The regression itself ────────────────────────────────────────────

	it("detects ipv4 on a single-stack sub-zone URL", () => {
		expect(detectIpMode("https://ipv4.pronode15.prosopo.io")).toBe("ipv4");
	});

	it("detects ipv6 on a single-stack sub-zone URL", () => {
		expect(detectIpMode("https://ipv6.pronode15.prosopo.io")).toBe("ipv6");
	});

	it("returns undefined for a dual-stack URL", () => {
		expect(detectIpMode("https://pronode15.prosopo.io")).toBeUndefined();
	});

	// ── Path and trailing-slash tolerance ───────────────────────────────

	it("detects ipv4 with a trailing slash", () => {
		expect(detectIpMode("https://ipv4.pronode15.prosopo.io/")).toBe("ipv4");
	});

	it("detects ipv4 with a path", () => {
		expect(
			detectIpMode("https://ipv4.pronode15.prosopo.io/some/path?q=1"),
		).toBe("ipv4");
	});

	// ── Only the exact label prefix is stripped ─────────────────────────
	// `ipv4-shim.pronode15.prosopo.io` (hypothetical) is a different host
	// from `ipv4.pronode15.prosopo.io`; treating it as ipv4-pinned would
	// steer the lookup at the wrong section and silently look up the
	// wrong provider. The prefix match must be exact.

	it("does NOT treat an `ipv4-` prefix as ipv4", () => {
		expect(
			detectIpMode("https://ipv4-shim.pronode15.prosopo.io"),
		).toBeUndefined();
	});

	it("does NOT treat `ipv4` as a substring elsewhere in the hostname", () => {
		expect(
			detectIpMode("https://pronode15.ipv4-thing.prosopo.io"),
		).toBeUndefined();
	});

	// ── Scheme is irrelevant to the detection ──────────────────────────
	// The registry only carries HTTPS entries today, but `detectIpMode`
	// operates on the hostname alone so an HTTP URL would still be
	// steered correctly if that ever changed. That's the point of doing
	// the detection at the URL layer rather than by string prefix.

	it("detects ipv4 regardless of scheme", () => {
		expect(detectIpMode("http://ipv4.pronode15.prosopo.io")).toBe("ipv4");
	});

	// ── Malformed URLs ──────────────────────────────────────────────────
	// A token whose `providerUrl` field is unparseable can't route to any
	// section — return undefined and let `providers.find` return
	// undefined too, so the caller emits the normal `Provider not found`
	// path rather than throwing on the token.

	it("returns undefined for an unparseable URL", () => {
		expect(detectIpMode("not-a-url")).toBeUndefined();
	});

	it("returns undefined for an empty string", () => {
		expect(detectIpMode("")).toBeUndefined();
	});
});
