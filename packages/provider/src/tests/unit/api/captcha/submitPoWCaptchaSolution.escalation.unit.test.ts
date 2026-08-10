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

import { CaptchaType, type Session } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildEscalation } from "../../../../api/captcha/submitPoWCaptchaSolution.js";

// Minimal Tasks-shape required by `buildEscalation`. The function only
// reaches for: tasks.db.getPowCaptchaRecordByChallenge,
// tasks.db.getSessionRecordBySessionId,
// tasks.frictionlessManager.createSession, and tasks.writeQueue.cacheSessionEscalation.
// Everything else can be left undefined.
const makeTasks = () => {
	const cacheSessionEscalation = vi.fn().mockResolvedValue(true);
	const createSession = vi.fn().mockImplementation(async () => ({
		sessionId: "escalation-id",
	}));
	const getPowCaptchaRecordByChallenge = vi.fn();
	const getSessionRecordBySessionId = vi.fn();

	const tasks = {
		db: {
			getPowCaptchaRecordByChallenge,
			getSessionRecordBySessionId,
		},
		frictionlessManager: {
			createSession,
		},
		writeQueue: {
			cacheSessionEscalation,
		},
	} as unknown as Parameters<typeof buildEscalation>[0];

	return {
		tasks,
		spies: {
			cacheSessionEscalation,
			createSession,
			getPowCaptchaRecordByChallenge,
			getSessionRecordBySessionId,
		},
	};
};

const makeOriginSession = (): Session =>
	({
		sessionId: "origin-id",
		token: "origin-token",
		score: 0.2,
		threshold: 0.5,
		scoreComponents: { baseScore: 0.2 },
		ipAddress: { lower: 0n, type: "v4" },
		captchaType: CaptchaType.pow,
		siteKey: "site",
		userSitekeyIpHash: "hash-xyz",
		webView: false,
		iFrame: false,
		decryptedHeadHash: "headhash",
		ipInfo: undefined,
		headers: undefined,
		mode: undefined,
		simdReadings: undefined,
	}) as unknown as Session;

describe("submitPoWCaptchaSolution.buildEscalation", () => {
	let env: ReturnType<typeof makeTasks>;

	beforeEach(() => {
		env = makeTasks();
	});

	it("returns undefined when no routing output was supplied (no escalation)", async () => {
		const out = await buildEscalation(
			env.tasks,
			{ verified: true, routingOutput: undefined },
			"challenge",
		);
		expect(out).toBeUndefined();
		expect(env.spies.cacheSessionEscalation).not.toHaveBeenCalled();
		expect(env.spies.createSession).not.toHaveBeenCalled();
	});

	it("returns undefined when PoW didn't verify (route() shouldn't fire if PoW failed)", async () => {
		const out = await buildEscalation(
			env.tasks,
			{
				verified: false,
				routingOutput: { captchaType: CaptchaType.image },
			},
			"challenge",
		);
		expect(out).toBeUndefined();
		expect(env.spies.cacheSessionEscalation).not.toHaveBeenCalled();
	});

	it("returns undefined when the router kept the user on PoW (no escalation needed)", async () => {
		const out = await buildEscalation(
			env.tasks,
			{ verified: true, routingOutput: { captchaType: CaptchaType.pow } },
			"challenge",
		);
		expect(out).toBeUndefined();
		expect(env.spies.cacheSessionEscalation).not.toHaveBeenCalled();
	});

	it("writes an origin → escalation mapping to Redis when escalating to image", async () => {
		env.spies.getPowCaptchaRecordByChallenge.mockResolvedValue({
			sessionId: "origin-id",
			dappAccount: "dapp",
		});
		env.spies.getSessionRecordBySessionId.mockResolvedValue(
			makeOriginSession(),
		);

		const out = await buildEscalation(
			env.tasks,
			{ verified: true, routingOutput: { captchaType: CaptchaType.image } },
			"challenge",
		);

		expect(out).toEqual({
			captchaType: CaptchaType.image,
			sessionId: "escalation-id",
		});
		// The whole point of this PR: the mapping must be written
		// alongside the new session so a /captcha/* request carrying the
		// original sessionId can be resolved forward.
		expect(env.spies.cacheSessionEscalation).toHaveBeenCalledWith(
			"origin-id",
			"escalation-id",
		);
	});

	it("writes the mapping when escalating to puzzle as well as image", async () => {
		env.spies.getPowCaptchaRecordByChallenge.mockResolvedValue({
			sessionId: "origin-id",
			dappAccount: "dapp",
		});
		env.spies.getSessionRecordBySessionId.mockResolvedValue(
			makeOriginSession(),
		);

		await buildEscalation(
			env.tasks,
			{ verified: true, routingOutput: { captchaType: CaptchaType.puzzle } },
			"challenge",
		);

		expect(env.spies.cacheSessionEscalation).toHaveBeenCalledWith(
			"origin-id",
			"escalation-id",
		);
	});

	it("is a no-op on the cache write when writeQueue is null (Redis not configured)", async () => {
		// Some deployments run without Redis. The escalation must still
		// be returned to the client; the cache write just doesn't happen
		// — those deployments accept that the widget has to handle the
		// escalation correctly on its own.
		env.spies.getPowCaptchaRecordByChallenge.mockResolvedValue({
			sessionId: "origin-id",
			dappAccount: "dapp",
		});
		env.spies.getSessionRecordBySessionId.mockResolvedValue(
			makeOriginSession(),
		);
		(env.tasks as unknown as { writeQueue: unknown }).writeQueue = null;

		const out = await buildEscalation(
			env.tasks,
			{ verified: true, routingOutput: { captchaType: CaptchaType.image } },
			"challenge",
		);

		expect(out).toEqual({
			captchaType: CaptchaType.image,
			sessionId: "escalation-id",
		});
		// `cacheSessionEscalation` was never on the null writeQueue so
		// the original spy can never have been called.
		expect(env.spies.cacheSessionEscalation).not.toHaveBeenCalled();
	});

	it("does not write a mapping when the PoW record lookup fails (no origin to map from)", async () => {
		env.spies.getPowCaptchaRecordByChallenge.mockResolvedValue(null);

		const out = await buildEscalation(
			env.tasks,
			{ verified: true, routingOutput: { captchaType: CaptchaType.image } },
			"challenge",
		);

		expect(out).toBeUndefined();
		expect(env.spies.cacheSessionEscalation).not.toHaveBeenCalled();
		expect(env.spies.createSession).not.toHaveBeenCalled();
	});

	it("does not write a mapping when the origin session is gone (race against checkAndRemove)", async () => {
		env.spies.getPowCaptchaRecordByChallenge.mockResolvedValue({
			sessionId: "origin-id",
			dappAccount: "dapp",
		});
		env.spies.getSessionRecordBySessionId.mockResolvedValue(undefined);

		const out = await buildEscalation(
			env.tasks,
			{ verified: true, routingOutput: { captchaType: CaptchaType.image } },
			"challenge",
		);

		expect(out).toBeUndefined();
		expect(env.spies.cacheSessionEscalation).not.toHaveBeenCalled();
		expect(env.spies.createSession).not.toHaveBeenCalled();
	});
});
