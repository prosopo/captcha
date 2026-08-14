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

import type { Logger } from "@prosopo/logger";
import {
	CaptchaType,
	type CounterSpec,
	type RoutingMachineBaseline,
} from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DecisionMachineRunner } from "../../../../tasks/decisionMachine/decisionMachineRunner.js";
import {
	type RoutingContext,
	applyRouter,
} from "../../../../tasks/frictionless/routingMachine.js";
import type { UsageCounters } from "../../../../util/usageCounters.js";

const buildLogger = (): Logger =>
	({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}) as unknown as Logger;

const buildCtx = (overrides: Partial<RoutingContext> = {}): RoutingContext => ({
	dappAccount: "5GCP...",
	userAccount: "0xuser",
	ip: "1.2.3.4",
	countryCode: "GB",
	score: 0.4,
	platform: { isApple: false, isWebView: false, isMobile: false },
	raw: { headers: {}, userAgent: "Mozilla/5.0" },
	...overrides,
});

const baseline: RoutingMachineBaseline = {
	captchaType: CaptchaType.pow,
	powDifficulty: 1000,
};

interface MockRunner {
	getRequiredCounters: ReturnType<typeof vi.fn>;
	route: ReturnType<typeof vi.fn>;
}

const buildRunner = (): MockRunner => ({
	getRequiredCounters: vi.fn().mockResolvedValue([]),
	route: vi.fn().mockResolvedValue(undefined),
});

interface MockCounters {
	batchGet: ReturnType<typeof vi.fn>;
}

const buildCounters = (): MockCounters => ({
	batchGet: vi.fn().mockResolvedValue({}),
});

describe("applyRouter", () => {
	let logger: Logger;
	let runner: MockRunner;
	let counters: MockCounters;

	beforeEach(() => {
		logger = buildLogger();
		runner = buildRunner();
		counters = buildCounters();
	});

	const run = (
		ctx: RoutingContext = buildCtx(),
		base: RoutingMachineBaseline = baseline,
	) =>
		applyRouter(
			runner as unknown as DecisionMachineRunner,
			counters as unknown as UsageCounters,
			base,
			ctx,
			logger,
		);

	it("returns baseline when no machine is configured (route returns undefined)", async () => {
		const result = await run();
		expect(result).toEqual(baseline);
		expect(runner.route).toHaveBeenCalled();
	});

	it("returns the machine's output when route succeeds", async () => {
		runner.route.mockResolvedValueOnce({
			captchaType: CaptchaType.image,
			solvedImagesCount: 2,
		});
		const result = await run();
		expect(result).toEqual({
			captchaType: CaptchaType.image,
			solvedImagesCount: 2,
		});
	});

	// UA-based routing paths: the routing machine sees the widget's
	// userAgent verbatim on `ctx.raw.userAgent` and can route on it. These
	// tests exercise the machinery: they simulate a machine that returns
	// image (or puzzle) for a specific UA pattern, and assert that whatever
	// captchaType the machine emits is what the router returns. Per-DM
	// artifact logic (e.g. "iOS Safari 15 → image") lives in each sitekey's
	// DM module and is exercised by that machine's own tests.
	it("routes to image when the machine matches on userAgent (headless-style UA → image)", async () => {
		const headlessUa =
			"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/128.0.0.0 Safari/537.36";
		// A stand-in DM that reads userAgent and routes headless to image.
		runner.route.mockImplementation(
			async (input: {
				raw?: { userAgent?: string };
			}): Promise<{ captchaType: CaptchaType; solvedImagesCount?: number }> => {
				if ((input.raw?.userAgent ?? "").includes("HeadlessChrome")) {
					return { captchaType: CaptchaType.image, solvedImagesCount: 3 };
				}
				return { captchaType: CaptchaType.pow };
			},
		);

		const ctx = buildCtx({
			raw: { headers: {}, userAgent: headlessUa },
		});
		const result = await run(ctx);

		expect(result).toEqual({
			captchaType: CaptchaType.image,
			solvedImagesCount: 3,
		});
		// The routing runner sees the full userAgent, not a stripped
		// version — this is what per-DM artifacts rely on.
		// The routing runner receives the full userAgent verbatim in the
		// input's `raw` — per-DM artifacts rely on that.
		const call = runner.route.mock.calls[0];
		expect(call[0]).toEqual(
			expect.objectContaining({
				raw: expect.objectContaining({ userAgent: headlessUa }),
			}),
		);
	});

	it("routes to puzzle when the machine matches on userAgent (mobile-webview-style UA → puzzle)", async () => {
		const webviewUa =
			"Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.0.0 Mobile Safari/537.36 wv";
		runner.route.mockImplementation(
			async (input: {
				raw?: { userAgent?: string };
			}): Promise<{ captchaType: CaptchaType }> => {
				// UA ends in " wv" — Android WebView marker.
				if ((input.raw?.userAgent ?? "").endsWith(" wv")) {
					return { captchaType: CaptchaType.puzzle };
				}
				return { captchaType: CaptchaType.pow };
			},
		);

		const ctx = buildCtx({
			raw: { headers: {}, userAgent: webviewUa },
			platform: { isApple: false, isWebView: true, isMobile: true },
		});
		const result = await run(ctx);

		expect(result).toEqual({ captchaType: CaptchaType.puzzle });
		const call = runner.route.mock.calls[0];
		expect(call[0]).toEqual(
			expect.objectContaining({
				raw: expect.objectContaining({ userAgent: webviewUa }),
				platform: expect.objectContaining({ isWebView: true }),
			}),
		);
	});

	it("fetches counters only when the machine declares them", async () => {
		runner.getRequiredCounters.mockResolvedValueOnce([]);
		await run();
		expect(counters.batchGet).not.toHaveBeenCalled();

		const specs: CounterSpec[] = [
			{
				kind: "served",
				captchaType: CaptchaType.pow,
				dimension: "ip",
				window: "10m",
			},
		];
		runner.getRequiredCounters.mockResolvedValueOnce(specs);
		runner.route.mockResolvedValueOnce({ captchaType: CaptchaType.image });
		const result = await run();
		expect(counters.batchGet).toHaveBeenCalledTimes(1);
		expect(result.captchaType).toBe(CaptchaType.image);
	});

	it("maps declared counter dimensions to ip / userAccount values", async () => {
		const specs: CounterSpec[] = [
			{
				kind: "served",
				captchaType: CaptchaType.pow,
				dimension: "ip",
				window: "10m",
			},
			{
				kind: "solved",
				captchaType: CaptchaType.pow,
				dimension: "userAccount",
				window: "3h",
			},
		];
		runner.getRequiredCounters.mockResolvedValueOnce(specs);
		await run(buildCtx({ ip: "9.9.9.9", userAccount: "0xabc" }));
		const arg = counters.batchGet.mock.calls[0];
		if (!arg) throw new Error("expected batchGet to be called");
		const reads = arg[1] as Array<{ spec: CounterSpec; value: string }>;
		expect(reads).toHaveLength(2);
		expect(reads[0]?.value).toBe("9.9.9.9");
		expect(reads[1]?.value).toBe("0xabc");
	});

	it("falls back to baseline when batchGet returns null (Redis down)", async () => {
		runner.getRequiredCounters.mockResolvedValueOnce([
			{
				kind: "served",
				captchaType: CaptchaType.pow,
				dimension: "ip",
				window: "10m",
			},
		]);
		counters.batchGet.mockResolvedValueOnce(null);
		const result = await run();
		expect(result).toEqual(baseline);
		expect(runner.route).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalled();
	});

	it("falls back to baseline when route output is invalid (route returns undefined)", async () => {
		runner.route.mockResolvedValueOnce(undefined);
		const result = await run();
		expect(result).toEqual(baseline);
	});

	it("falls back to baseline when route rejects", async () => {
		runner.route.mockRejectedValueOnce(new Error("boom"));
		const result = await run();
		expect(result).toEqual(baseline);
		expect(logger.error).toHaveBeenCalled();
	});

	it("falls back to baseline when getRequiredCounters rejects", async () => {
		runner.getRequiredCounters.mockRejectedValueOnce(new Error("nope"));
		const result = await run();
		expect(result).toEqual(baseline);
		expect(logger.error).toHaveBeenCalled();
	});

	it("falls back to baseline when machine declares counters but UsageCounters is null", async () => {
		const specs: CounterSpec[] = [
			{
				kind: "served",
				captchaType: CaptchaType.pow,
				dimension: "ip",
				window: "10m",
			},
		];
		runner.getRequiredCounters.mockResolvedValueOnce(specs);
		const result = await applyRouter(
			runner as unknown as DecisionMachineRunner,
			null,
			baseline,
			buildCtx(),
			logger,
		);
		expect(result).toEqual(baseline);
		expect(runner.route).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalled();
	});

	it("passes the resolved counters into route() input", async () => {
		const specs: CounterSpec[] = [
			{
				kind: "served",
				captchaType: CaptchaType.pow,
				dimension: "ip",
				window: "10m",
			},
		];
		runner.getRequiredCounters.mockResolvedValueOnce(specs);
		counters.batchGet.mockResolvedValueOnce({
			"cnt:5GCP...:served:pow:ip:1.2.3.4:10m": 4,
		});
		runner.route.mockImplementationOnce(async (input) => ({
			captchaType:
				input.counters["cnt:5GCP...:served:pow:ip:1.2.3.4:10m"] >= 3
					? CaptchaType.image
					: CaptchaType.pow,
		}));
		const result = await run();
		expect(result.captchaType).toBe(CaptchaType.image);
	});
});
