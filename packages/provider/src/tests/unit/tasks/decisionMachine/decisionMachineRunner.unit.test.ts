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

import {
	CaptchaType,
	type DecisionMachineArtifact,
	type DecisionMachineCaptchaType,
	DecisionMachineDecision,
	DecisionMachineRuntime,
	DecisionMachineScope,
	type RoutingMachineInput,
	type RoutingMachineInputBase,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DecisionMachineRunner } from "../../../../tasks/decisionMachine/decisionMachineRunner.js";

const baseRouteInput = (
	overrides: Partial<RoutingMachineInputBase> = {},
): RoutingMachineInputBase => ({
	phase: "route",
	dappAccount: "dapp",
	userAccount: "user",
	ip: "1.2.3.4",
	baseline: { captchaType: CaptchaType.pow, powDifficulty: 1000 },
	score: 0.3,
	platform: { isApple: false, isWebView: false, isMobile: false },
	raw: { headers: {}, userAgent: "Mozilla/5.0" },
	...overrides,
});

const routeInput = (
	overrides: Partial<RoutingMachineInput> = {},
): RoutingMachineInput => ({
	...baseRouteInput(),
	counters: {},
	...overrides,
});

const buildArtifact = (
	source: string,
	scope: DecisionMachineScope,
	dappAccount?: string,
	captchaType?: DecisionMachineCaptchaType,
): DecisionMachineArtifact => {
	const now = new Date();
	return {
		scope,
		dappAccount,
		runtime: DecisionMachineRuntime.Node,
		source,
		captchaType,
		createdAt: now,
		updatedAt: now,
	};
};

describe("DecisionMachineRunner", () => {
	let db: IProviderDatabase;
	let runner: DecisionMachineRunner;

	beforeEach(() => {
		DecisionMachineRunner.invalidateAllArtifactCache();
		db = {
			getDecisionMachineArtifact: vi.fn(),
		} as unknown as IProviderDatabase;
		runner = new DecisionMachineRunner(db);
	});

	it("returns allow when no artifact is configured", async () => {
		(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce(undefined);

		const result = await runner.decide({
			userAccount: "user",
			dappAccount: "dapp",
			captchaResult: "passed",
			headers: {},
		});

		expect(result.decision).toBe(DecisionMachineDecision.Allow);
	});

	it("prefers dapp-specific artifact over global", async () => {
		const dappArtifact = buildArtifact(
			'module.exports = () => ({ decision: "deny", reason: "dapp" });',
			DecisionMachineScope.Dapp,
			"dapp",
		);
		(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(dappArtifact)
			.mockResolvedValueOnce(undefined);

		const result = await runner.decide({
			userAccount: "user",
			dappAccount: "dapp",
			captchaResult: "passed",
			headers: {},
		});

		expect(result.decision).toBe(DecisionMachineDecision.Deny);
	});

	it("falls back to global artifact when dapp-specific is missing", async () => {
		const globalArtifact = buildArtifact(
			'module.exports = () => ({ decision: "deny", reason: "global" });',
			DecisionMachineScope.Global,
		);
		(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce(globalArtifact);

		const result = await runner.decide({
			userAccount: "user",
			dappAccount: "dapp",
			captchaResult: "passed",
			headers: {},
		});

		expect(result.decision).toBe(DecisionMachineDecision.Deny);
	});

	it("defaults to allow on invalid output", async () => {
		const artifact = buildArtifact(
			"module.exports = () => ({ nope: true });",
			DecisionMachineScope.Global,
		);
		(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce(artifact);

		const result = await runner.decide({
			userAccount: "user",
			dappAccount: "dapp",
			captchaResult: "passed",
			headers: {},
		});

		expect(result.decision).toBe(DecisionMachineDecision.Allow);
	});

	it("defaults to allow on timeout", async () => {
		const artifact = buildArtifact(
			"module.exports = () => new Promise(() => {});",
			DecisionMachineScope.Global,
		);
		(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce(artifact);

		const result = await runner.decide({
			userAccount: "user",
			dappAccount: "dapp",
			captchaResult: "passed",
			headers: {},
		});

		expect(result.decision).toBe(DecisionMachineDecision.Allow);
	}, 5000);

	it("runs decision machine without captchaType filter on any captcha type", async () => {
		const artifact = buildArtifact(
			'module.exports = () => ({ decision: "deny" });',
			DecisionMachineScope.Global,
			undefined,
			undefined, // no captchaType filter
		);
		(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce(artifact);

		const result = await runner.decide({
			userAccount: "user",
			dappAccount: "dapp",
			captchaResult: "passed",
			headers: {},
			captchaType: CaptchaType.pow,
		});

		expect(result.decision).toBe(DecisionMachineDecision.Deny);
	});

	it("runs decision machine with matching captchaType filter", async () => {
		const artifact = buildArtifact(
			'module.exports = () => ({ decision: "deny" });',
			DecisionMachineScope.Global,
			undefined,
			CaptchaType.image,
		);
		(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce(artifact);

		const result = await runner.decide({
			userAccount: "user",
			dappAccount: "dapp",
			captchaResult: "passed",
			headers: {},
			captchaType: CaptchaType.image,
		});

		expect(result.decision).toBe(DecisionMachineDecision.Deny);
	});

	it("skips decision machine with non-matching captchaType filter", async () => {
		const artifact = buildArtifact(
			'module.exports = () => ({ decision: "deny" });',
			DecisionMachineScope.Global,
			undefined,
			CaptchaType.pow,
		);
		(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce(artifact);

		const result = await runner.decide({
			userAccount: "user",
			dappAccount: "dapp",
			captchaResult: "passed",
			headers: {},
			captchaType: CaptchaType.image,
		});

		// Should default to allow because artifact doesn't match captcha type
		expect(result.decision).toBe(DecisionMachineDecision.Allow);
	});

	describe("route", () => {
		it("returns undefined when no artifact is configured", async () => {
			(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(undefined);

			const result = await runner.route(routeInput());
			expect(result).toBeUndefined();
		});

		it("calls module.exports.route with the input and returns its output", async () => {
			const artifact = buildArtifact(
				'module.exports.route = (input) => ({ captchaType: input.baseline.captchaType === "pow" ? "image" : "pow", solvedImagesCount: 2 });',
				DecisionMachineScope.Global,
			);
			(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(artifact);

			const result = await runner.route(routeInput());
			expect(result).toEqual({
				captchaType: CaptchaType.image,
				solvedImagesCount: 2,
			});
		});

		it("returns undefined on missing route export", async () => {
			const artifact = buildArtifact(
				'module.exports.somethingElse = () => ({ captchaType: "pow" });',
				DecisionMachineScope.Global,
			);
			(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(artifact);

			const result = await runner.route(routeInput());
			expect(result).toBeUndefined();
		});

		it("returns undefined on invalid output", async () => {
			const artifact = buildArtifact(
				'module.exports.route = () => ({ captchaType: "not-a-real-type" });',
				DecisionMachineScope.Global,
			);
			(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(artifact);

			const result = await runner.route(routeInput());
			expect(result).toBeUndefined();
		});

		it("returns undefined on machine throw", async () => {
			const artifact = buildArtifact(
				'module.exports.route = () => { throw new Error("boom"); };',
				DecisionMachineScope.Global,
			);
			(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(artifact);

			const result = await runner.route(routeInput());
			expect(result).toBeUndefined();
		});

		it("returns undefined on timeout", async () => {
			const artifact = buildArtifact(
				"module.exports.route = () => new Promise(() => {});",
				DecisionMachineScope.Global,
			);
			(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(artifact);

			const result = await runner.route(routeInput());
			expect(result).toBeUndefined();
		}, 5000);

		it("supports one artifact exporting both route and decide", async () => {
			const artifact = buildArtifact(
				`
				module.exports.route = (i) => ({ captchaType: "image" });
				module.exports.decide = (i) => ({ decision: "allow", reason: "ok" });
				`,
				DecisionMachineScope.Global,
			);
			(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(artifact)
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(artifact);

			const routeResult = await runner.route(routeInput());
			expect(routeResult?.captchaType).toBe(CaptchaType.image);
			const decideResult = await runner.decide({
				userAccount: "user",
				dappAccount: "dapp",
				captchaResult: "passed",
				headers: {},
			});
			expect(decideResult.decision).toBe(DecisionMachineDecision.Allow);
		});
	});

	describe("getRequiredCounters", () => {
		it("returns [] when no artifact is configured", async () => {
			(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(undefined);

			const result = await runner.getRequiredCounters(baseRouteInput());
			expect(result).toEqual([]);
		});

		it("returns [] when artifact does not export requiredCounters", async () => {
			const artifact = buildArtifact(
				'module.exports.route = () => ({ captchaType: "pow" });',
				DecisionMachineScope.Global,
			);
			(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(artifact);

			const result = await runner.getRequiredCounters(baseRouteInput());
			expect(result).toEqual([]);
		});

		it("returns the array of counter specs from the artifact", async () => {
			const artifact = buildArtifact(
				`module.exports.requiredCounters = () => [
					{ kind: "served", captchaType: "pow", dimension: "ip", window: "10m" },
					{ kind: "served", captchaType: "any", dimension: "userAccount", window: "6h" }
				];`,
				DecisionMachineScope.Global,
			);
			(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(artifact);

			const result = await runner.getRequiredCounters(baseRouteInput());
			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({
				kind: "served",
				captchaType: "pow",
				dimension: "ip",
				window: "10m",
			});
		});

		it("returns [] on invalid spec entries", async () => {
			const artifact = buildArtifact(
				'module.exports.requiredCounters = () => [{ window: "bogus" }];',
				DecisionMachineScope.Global,
			);
			(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(artifact);

			const result = await runner.getRequiredCounters(baseRouteInput());
			expect(result).toEqual([]);
		});

		it("returns [] on machine throw", async () => {
			const artifact = buildArtifact(
				'module.exports.requiredCounters = () => { throw new Error("nope"); };',
				DecisionMachineScope.Global,
			);
			(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(artifact);

			const result = await runner.getRequiredCounters(baseRouteInput());
			expect(result).toEqual([]);
		});
	});

	describe("invalidateArtifactCache", () => {
		it("forces the next call to re-fetch from the DB", async () => {
			const v1 = buildArtifact(
				'module.exports.route = () => ({ captchaType: "image" });',
				DecisionMachineScope.Global,
			);
			const v2 = buildArtifact(
				'module.exports.route = () => ({ captchaType: "puzzle" });',
				DecisionMachineScope.Global,
			);
			const getArtifact = db.getDecisionMachineArtifact as unknown as ReturnType<
				typeof vi.fn
			>;
			// First call: dapp=undefined, global=v1
			getArtifact.mockResolvedValueOnce(undefined).mockResolvedValueOnce(v1);
			const first = await runner.route(routeInput());
			expect(first?.captchaType).toBe(CaptchaType.image);

			// Without invalidation a second call should hit cache (no new DB call):
			const second = await runner.route(routeInput());
			expect(second?.captchaType).toBe(CaptchaType.image);
			expect(getArtifact).toHaveBeenCalledTimes(2); // not 4

			// Invalidate and reseed mocks to v2:
			runner.invalidateArtifactCache(DecisionMachineScope.Global);
			runner.invalidateArtifactCache(DecisionMachineScope.Dapp, "dapp");
			getArtifact.mockResolvedValueOnce(undefined).mockResolvedValueOnce(v2);
			const third = await runner.route(routeInput());
			expect(third?.captchaType).toBe(CaptchaType.puzzle);
			expect(getArtifact).toHaveBeenCalledTimes(4);
		});
	});
});
