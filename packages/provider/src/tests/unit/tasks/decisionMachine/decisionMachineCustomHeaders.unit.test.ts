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
	DecisionMachineDecision,
	DecisionMachineRuntime,
	DecisionMachineScope,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DecisionMachineRunner } from "../../../../tasks/decisionMachine/decisionMachineRunner.js";

describe("Decision Machine - Header and Behavioral Data Test", () => {
	let db: IProviderDatabase;
	let runner: DecisionMachineRunner;

	const decisionMachineSource = `
/**
 * Decision machine for evaluating requests based on headers and behavioral data
 */

function checkHeadersAndBehavior(headers, behavioralDataPacked) {
	// Check for specific header pattern
	const headerValue =
		"x-custom-header" in headers ? headers["x-custom-header"] : "";

	// Check if header matches pattern
	const hasSpecificHeader = headerValue.toLowerCase().includes("test-value");

	const hasNoBehavioralData =
		!behavioralDataPacked || behavioralDataPacked === "0";

	if (hasSpecificHeader && hasNoBehavioralData) {
		return {
			decision: "deny",
			reason: "Request blocked due to policy violation",
			score: 0,
			tags: ["blocked"],
		};
	}

	return null;
}

module.exports = (input) => {
	const {
		userAccount,
		dappAccount,
		captchaResult,
		headers,
		captchaType,
		countryCode,
		behavioralDataPacked,
	} = input;

	const headerCheck = checkHeadersAndBehavior(
		headers,
		behavioralDataPacked,
	);
	if (headerCheck) {
		return headerCheck;
	}

	// If all checks pass, allow the captcha
	if (captchaResult === "passed") {
		return {
			decision: "allow",
			reason: "Captcha verification successful",
			score: 100,
			tags: [\`captcha-type:\${captchaType || "unknown"}\`],
		};
	}

	// Default deny if captcha failed
	return {
		decision: "deny",
		reason: "Captcha verification failed",
		score: 0,
		tags: ["blocked"],
	};
};
`;

	beforeEach(() => {
		db = {
			getDecisionMachineArtifact: vi.fn(),
		} as unknown as IProviderDatabase;
		runner = new DecisionMachineRunner(db);
	});

	it("should deny when specific header is present and no behavioral data", async () => {
		const dappAccount = "5DAppAccount1234567890TestAccount12345678";
		const now = new Date();
		const artifact: DecisionMachineArtifact = {
			scope: DecisionMachineScope.Dapp,
			dappAccount,
			runtime: DecisionMachineRuntime.Node,
			source: decisionMachineSource,
			createdAt: now,
			updatedAt: now,
		};

		(db.getDecisionMachineArtifact as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(artifact)
			.mockResolvedValueOnce(undefined);

		const result = await runner.decide({
			userAccount: "5UserAccount1234567890TestUser123456789",
			dappAccount,
			captchaResult: "passed",
			headers: {
				"x-custom-header": "test-value",
				"user-agent": "TestAgent/1.0",
			},
			captchaType: CaptchaType.pow,
			// behavioralDataPacked is undefined (not provided)
		});

		expect(result.decision).toBe(DecisionMachineDecision.Deny);
		expect(result.reason).toBe("Request blocked due to policy violation");
		expect(result.score).toBe(0);
		expect(result.tags).toContain("blocked");
	});

	it("should allow when specific header is present but behavioral data exists", async () => {
		const dappAccount = "5DAppAccount1234567890TestAccount12345678";
		const now = new Date();
		const artifact: DecisionMachineArtifact = {
			scope: DecisionMachineScope.Dapp,
			dappAccount,
			runtime: DecisionMachineRuntime.Node,
			source: decisionMachineSource,
			createdAt: now,
			updatedAt: now,
		};

		(db.getDecisionMachineArtifact as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(artifact)
			.mockResolvedValueOnce(undefined);

		const result = await runner.decide({
			userAccount: "5UserAccount1234567890TestUser123456789",
			dappAccount,
			captchaResult: "passed",
			headers: {
				"x-custom-header": "test-value",
				"user-agent": "TestAgent/1.0",
			},
			captchaType: CaptchaType.pow,
			behavioralDataPacked: {
				c1: [1, 2, 3],
				c2: [4, 5, 6],
				c3: [7, 8, 9],
				d: "test-device",
			},
		});

		expect(result.decision).toBe(DecisionMachineDecision.Allow);
		expect(result.reason).toBe("Captcha verification successful");
	});

	it("should allow when behavioral data is missing but specific header is not present", async () => {
		const dappAccount = "5DAppAccount1234567890TestAccount12345678";
		const now = new Date();
		const artifact: DecisionMachineArtifact = {
			scope: DecisionMachineScope.Dapp,
			dappAccount,
			runtime: DecisionMachineRuntime.Node,
			source: decisionMachineSource,
			createdAt: now,
			updatedAt: now,
		};

		(db.getDecisionMachineArtifact as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(artifact)
			.mockResolvedValueOnce(undefined);

		const result = await runner.decide({
			userAccount: "5UserAccount1234567890TestUser123456789",
			dappAccount,
			captchaResult: "passed",
			headers: {
				"user-agent": "TestAgent/1.0",
				accept: "application/json",
			},
			captchaType: CaptchaType.pow,
			// behavioralDataPacked is undefined
		});

		expect(result.decision).toBe(DecisionMachineDecision.Allow);
		expect(result.reason).toBe("Captcha verification successful");
	});

	it("should handle case-insensitive header checks", async () => {
		const dappAccount = "5DAppAccount1234567890TestAccount12345678";
		const now = new Date();
		const artifact: DecisionMachineArtifact = {
			scope: DecisionMachineScope.Dapp,
			dappAccount,
			runtime: DecisionMachineRuntime.Node,
			source: decisionMachineSource,
			createdAt: now,
			updatedAt: now,
		};

		(db.getDecisionMachineArtifact as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(artifact)
			.mockResolvedValueOnce(undefined);

		const result = await runner.decide({
			userAccount: "5UserAccount1234567890TestUser123456789",
			dappAccount,
			captchaResult: "passed",
			headers: {
				"x-custom-header": "Test-Value", // Mixed case
				"user-agent": "TestAgent/1.0",
			},
			captchaType: CaptchaType.pow,
		});

		expect(result.decision).toBe(DecisionMachineDecision.Deny);
		expect(result.reason).toBe("Request blocked due to policy violation");
	});

	it("should allow when no decision machine is configured", async () => {
		const dappAccount = "5DAppAccount1234567890TestAccount12345678";

		// No artifact configured
		(db.getDecisionMachineArtifact as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce(undefined);

		const result = await runner.decide({
			userAccount: "5UserAccount1234567890TestUser123456789",
			dappAccount,
			captchaResult: "passed",
			headers: {
				"x-custom-header": "test-value",
				"user-agent": "TestAgent/1.0",
			},
			captchaType: CaptchaType.pow,
		});

		// Should default to allow when no decision machine is configured
		expect(result.decision).toBe(DecisionMachineDecision.Allow);
	});
});
