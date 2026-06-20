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
	type DecisionMachineArtifact,
	type DecisionMachineCaptchaType,
	DecisionMachineDecision,
	DecisionMachineRuntime,
	DecisionMachineScope,
	FrictionlessReason,
	type RoutingMachineInput,
	type RoutingMachineInputBase,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DecisionMachineRunner } from "../../../../tasks/decisionMachine/decisionMachineRunner.js";

const stubLogger = (): Logger => {
	const noop = (): void => {};
	const logger: Partial<Logger> = {
		setLogLevel: noop,
		getLogLevel: () => "info",
		getScope: () => "test",
		info: vi.fn(),
		debug: vi.fn(),
		trace: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		fatal: vi.fn(),
		log: vi.fn(),
		getPretty: () => false,
		setPretty: noop,
		getPrintStack: () => false,
		setPrintStack: noop,
		getFormat: () => "json",
		setFormat: noop,
	};
	logger.with = () => logger as Logger;
	return logger as Logger;
};

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

	it("forwards session-derived fields verbatim to the artifact", async () => {
		// Echo back every session-derived field as a tag so we can assert the
		// runner doesn't strip or rename anything en route to the artifact.
		const artifact = buildArtifact(
			`module.exports = {
				decide: (input) => ({
					decision: "deny",
					reason: "echo",
					tags: [
						"score:" + (input.score ?? "u"),
						"threshold:" + (input.threshold ?? "u"),
						"sc.base:" + (input.scoreComponents && input.scoreComponents.baseScore !== undefined ? input.scoreComponents.baseScore : "u"),
						"sc.unverifiedHost:" + (input.scoreComponents && input.scoreComponents.unverifiedHost !== undefined ? input.scoreComponents.unverifiedHost : "u"),
						"sc.dnsAsymmetry:" + (input.scoreComponents && input.scoreComponents.dnsAsymmetry !== undefined ? input.scoreComponents.dnsAsymmetry : "u"),
						"headHash:" + (input.decryptedHeadHash ?? "u"),
						"userSitekeyIpHash:" + (input.userSitekeyIpHash ?? "u"),
						"providerSelectEntropy:" + (input.providerSelectEntropy ?? "u"),
						"simdSupported:" + (input.simdReadings && input.simdReadings.supported !== undefined ? input.simdReadings.supported : "u"),
						"frictionlessReason:" + (input.frictionlessReason ?? "u"),
						"ruleType:" + (input.ruleType ? input.ruleType.join(",") : "u"),
						"webView:" + (input.webView === undefined ? "u" : input.webView),
						"iFrame:" + (input.iFrame === undefined ? "u" : input.iFrame),
					],
				}),
			};`,
			DecisionMachineScope.Dapp,
			"dapp",
		);
		(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(artifact)
			.mockResolvedValueOnce(undefined);

		const result = await runner.decide({
			userAccount: "user",
			dappAccount: "dapp",
			captchaResult: "passed",
			headers: {},
			score: 1.2,
			threshold: 0.27,
			scoreComponents: {
				baseScore: 1,
				unverifiedHost: 0.2,
				dnsAsymmetry: 0.5,
				triggeredDetectors: [27],
				shadowDomPenalty: false,
			},
			decryptedHeadHash: "0".repeat(128),
			userSitekeyIpHash: "abc123",
			providerSelectEntropy: 891,
			simdReadings: {
				supported: true,
				schema: 1,
				timerResolutionMs: 0.1,
				runsPerOp: 3,
				durationMs: 200,
				ops: [],
			},
			frictionlessReason: FrictionlessReason.BOT_SCORE_ABOVE_THRESHOLD,
			ruleType: ["ja4Hash"],
			webView: false,
			iFrame: true,
		});

		expect(result.decision).toBe(DecisionMachineDecision.Deny);
		expect(result.tags).toEqual([
			"score:1.2",
			"threshold:0.27",
			"sc.base:1",
			"sc.unverifiedHost:0.2",
			"sc.dnsAsymmetry:0.5",
			`headHash:${"0".repeat(128)}`,
			"userSitekeyIpHash:abc123",
			"providerSelectEntropy:891",
			"simdSupported:true",
			`frictionlessReason:${FrictionlessReason.BOT_SCORE_ABOVE_THRESHOLD}`,
			"ruleType:ja4Hash",
			"webView:false",
			"iFrame:true",
		]);
	});

	it("treats omitted session fields as undefined (back-compat)", async () => {
		// Sanity check: minimal verify input still routes cleanly through
		// the artifact, none of the new fields are required.
		const artifact = buildArtifact(
			`module.exports = (input) => ({
				decision: input.score === undefined ? "allow" : "deny",
				reason: "min",
			});`,
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

		it("returns undefined without logging an error for a decide-only artifact", async () => {
			// Mirrors the in-prod shape: a bare default function intended for
			// decide(). route() should silently fall back to baseline rather
			// than log "Decision machine must export one of: route" per request.
			const artifact = buildArtifact(
				'module.exports = () => ({ decision: "allow" });',
				DecisionMachineScope.Global,
			);
			(db.getDecisionMachineArtifact as unknown as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(artifact);

			const logger = stubLogger();
			const result = await runner.route(routeInput(), logger);
			expect(result).toBeUndefined();
			expect(logger.error).not.toHaveBeenCalled();
			expect(logger.warn).not.toHaveBeenCalled();
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
});
