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
import { CaptchaType } from "../client/captchaType/captchaType.js";
import {
	COUNTER_CAPTCHA_ANY,
	COUNTER_DIMENSIONS,
	COUNTER_KINDS,
	COUNTER_WINDOWS,
	COUNTER_WINDOW_SECONDS,
	type CounterSpec,
	CounterSpecSchema,
	RoutingMachineOutputSchema,
	encodeCounterKey,
} from "./index.js";

const spec: CounterSpec = {
	kind: "served",
	captchaType: CaptchaType.pow,
	dimension: "ip",
	window: "1h",
};

describe("counter windows", () => {
	it("has a duration for every window", () => {
		for (const window of COUNTER_WINDOWS) {
			expect(COUNTER_WINDOW_SECONDS[window]).toBeGreaterThan(0);
		}
	});

	it("declares no durations beyond the known windows", () => {
		expect(Object.keys(COUNTER_WINDOW_SECONDS).sort()).toEqual(
			[...COUNTER_WINDOWS].sort(),
		);
	});

	it("orders the windows from shortest to longest", () => {
		const seconds = COUNTER_WINDOWS.map((w) => COUNTER_WINDOW_SECONDS[w]);
		expect(seconds).toEqual([...seconds].sort((a, b) => a - b));
	});

	it("matches the durations the window names claim", () => {
		expect(COUNTER_WINDOW_SECONDS["1m"]).toBe(60);
		expect(COUNTER_WINDOW_SECONDS["10m"]).toBe(10 * 60);
		expect(COUNTER_WINDOW_SECONDS["1h"]).toBe(60 * 60);
		expect(COUNTER_WINDOW_SECONDS["24h"]).toBe(24 * 60 * 60);
	});
});

describe("encodeCounterKey", () => {
	it("builds a colon separated redis key", () => {
		expect(encodeCounterKey("dapp", spec, "1.2.3.4")).toBe(
			"cnt:dapp:served:pow:ip:1.2.3.4:1h",
		);
	});

	it("puts the window last, so a scan can strip it", () => {
		expect(encodeCounterKey("dapp", spec, "v").endsWith(":1h")).toBe(true);
	});

	it("distinguishes kinds", () => {
		expect(encodeCounterKey("d", spec, "v")).not.toBe(
			encodeCounterKey("d", { ...spec, kind: "solved" }, "v"),
		);
	});

	it("distinguishes dimensions", () => {
		expect(encodeCounterKey("d", spec, "v")).not.toBe(
			encodeCounterKey("d", { ...spec, dimension: "peerIp" }, "v"),
		);
	});

	it("distinguishes dapps", () => {
		expect(encodeCounterKey("a", spec, "v")).not.toBe(
			encodeCounterKey("b", spec, "v"),
		);
	});

	it("encodes the wildcard captcha type verbatim", () => {
		expect(
			encodeCounterKey("d", { ...spec, captchaType: COUNTER_CAPTCHA_ANY }, "v"),
		).toBe("cnt:d:served:any:ip:v:1h");
	});

	it("produces a distinct key for every window", () => {
		const keys = COUNTER_WINDOWS.map((window) =>
			encodeCounterKey("d", { ...spec, window }, "v"),
		);
		expect(new Set(keys).size).toBe(COUNTER_WINDOWS.length);
	});

	it("passes an empty value straight through", () => {
		expect(encodeCounterKey("d", spec, "")).toBe("cnt:d:served:pow:ip::1h");
	});

	it("does not escape colons in the value, so an ipv6 address widens the key", () => {
		// documented as-is: the value is not escaped, so a colon-bearing value
		// produces extra segments
		expect(encodeCounterKey("d", spec, "::1")).toBe(
			"cnt:d:served:pow:ip:::1:1h",
		);
	});
});

describe("CounterSpecSchema", () => {
	it("accepts a well formed spec", () => {
		expect(CounterSpecSchema.safeParse(spec).success).toBe(true);
	});

	it("accepts every declared kind, dimension and window", () => {
		for (const kind of COUNTER_KINDS) {
			for (const dimension of COUNTER_DIMENSIONS) {
				for (const window of COUNTER_WINDOWS) {
					expect(
						CounterSpecSchema.safeParse({ ...spec, kind, dimension, window })
							.success,
					).toBe(true);
				}
			}
		}
	});

	it("accepts each challengeable captcha type and the wildcard", () => {
		for (const captchaType of [
			CaptchaType.pow,
			CaptchaType.image,
			CaptchaType.puzzle,
			COUNTER_CAPTCHA_ANY,
		]) {
			expect(
				CounterSpecSchema.safeParse({ ...spec, captchaType }).success,
			).toBe(true);
		}
	});

	it("rejects the frictionless type, which is never counted directly", () => {
		expect(
			CounterSpecSchema.safeParse({
				...spec,
				captchaType: CaptchaType.frictionless,
			}).success,
		).toBe(false);
	});

	it("rejects an unknown window", () => {
		expect(CounterSpecSchema.safeParse({ ...spec, window: "2h" }).success).toBe(
			false,
		);
	});

	it("rejects a missing field", () => {
		const { kind: _kind, ...rest } = spec;
		expect(CounterSpecSchema.safeParse(rest).success).toBe(false);
	});
});

describe("RoutingMachineOutputSchema", () => {
	it("accepts a bare captcha type", () => {
		expect(
			RoutingMachineOutputSchema.safeParse({ captchaType: CaptchaType.image })
				.success,
		).toBe(true);
	});

	it("rejects frictionless, which is not a routable outcome", () => {
		expect(
			RoutingMachineOutputSchema.safeParse({
				captchaType: CaptchaType.frictionless,
			}).success,
		).toBe(false);
	});

	it("requires a positive integer image count", () => {
		expect(
			RoutingMachineOutputSchema.safeParse({
				captchaType: CaptchaType.image,
				solvedImagesCount: 0,
			}).success,
		).toBe(false);
		expect(
			RoutingMachineOutputSchema.safeParse({
				captchaType: CaptchaType.image,
				solvedImagesCount: 1.5,
			}).success,
		).toBe(false);
		expect(
			RoutingMachineOutputSchema.safeParse({
				captchaType: CaptchaType.image,
				solvedImagesCount: 3,
			}).success,
		).toBe(true);
	});

	it("requires a positive pow difficulty but allows a fractional one", () => {
		expect(
			RoutingMachineOutputSchema.safeParse({
				captchaType: CaptchaType.pow,
				powDifficulty: 0,
			}).success,
		).toBe(false);
		expect(
			RoutingMachineOutputSchema.safeParse({
				captchaType: CaptchaType.pow,
				powDifficulty: 4.5,
			}).success,
		).toBe(true);
	});

	it("carries a free form reason", () => {
		const result = RoutingMachineOutputSchema.safeParse({
			captchaType: CaptchaType.pow,
			reason: "escalated on ip rate",
		});
		expect(result.success).toBe(true);
	});

	it("rejects a non-string reason", () => {
		expect(
			RoutingMachineOutputSchema.safeParse({
				captchaType: CaptchaType.pow,
				reason: 1,
			}).success,
		).toBe(false);
	});

	it("requires a captcha type", () => {
		expect(RoutingMachineOutputSchema.safeParse({}).success).toBe(false);
	});
});
