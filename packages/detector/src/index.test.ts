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

// src/index.js in this package is a committed, obfuscated build artifact — the
// readable source lives in captcha-private's catcher package, which carries the
// behavioural suite. What is NOT covered there is the shape of the artifact that
// actually ships: a regenerated bundle that drops an export, changes an arity or
// resolves at a different path breaks every consumer while catcher's own tests
// stay green. These tests pin that contract.
import detect, { encryptData } from "./index.js";
import { describe, expect, it } from "vitest";

describe("@prosopo/detector bundle contract", () => {
	it("exports the detect entry point as the default export", () => {
		expect(typeof detect).toBe("function");
	});

	it("keeps the detect signature at three parameters", () => {
		// container, restart, accountGenerator — matching `DetectorType` in
		// procaptcha-frictionless/src/detectorLoader.ts, which is the real
		// consumer contract. Consumers call this positionally, so a drop here is
		// a silent breakage.
		//
		// This asserted five until the bundle was regenerated: `env` and
		// `randomProviderSelectorFn` were dropped when the detector moved to
		// provider-served pool bundles, but src/index.js had not been rebuilt
		// since, so the committed artifact still carried the pre-pool arity.
		expect(detect).toHaveLength(3);
	});

	it("exports encryptData as a single-parameter function", () => {
		expect(typeof encryptData).toBe("function");
		expect(encryptData).toHaveLength(1);
	});

	it("exposes no exports beyond detect and encryptData", async () => {
		const module: Record<string, unknown> = await import("./index.js");
		expect(Object.keys(module).sort()).toStrictEqual([
			"default",
			"encryptData",
		]);
	});
});

describe("encryptData when web crypto is unavailable", () => {
	// The widget runs in whatever browser the site owner's visitors bring, and on
	// insecure origins subtle crypto is simply absent. The contract that matters
	// is that the promise settles: a hang would leave the captcha spinning.
	it("rejects rather than hanging", async () => {
		await expect(encryptData("payload")).rejects.toThrow();
	});

	it("rejects for the empty string too", async () => {
		await expect(encryptData("")).rejects.toThrow();
	});

	it("settles promptly instead of waiting on a timeout", async () => {
		const settled = await Promise.race([
			encryptData("payload").then(
				() => "resolved",
				() => "rejected",
			),
			new Promise<string>((resolve) => {
				setTimeout(() => resolve("timed-out"), 1000);
			}),
		]);
		expect(settled).toBe("rejected");
	});

	it("rejects with an Error, not a bare string", async () => {
		await expect(encryptData("payload")).rejects.toBeInstanceOf(Error);
	});
});
