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
	DecisionMachineDecision,
	DecisionMachineRuntime,
	DecisionMachineScope,
} from "@prosopo/types";
import type {
	DecisionMachineArtifact,
	IProviderDatabase,
} from "@prosopo/types-database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DecisionMachineRunner } from "../../../../tasks/decisionMachine/decisionMachineRunner.js";

const buildArtifact = (
	source: string,
	scope: DecisionMachineScope,
	dappAccount?: string,
	captchaType?: CaptchaType,
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
});
