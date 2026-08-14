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

	// createSession positional signature — captured here so any reorder of
	// its arguments (see the call in buildEscalation) forces these tests to
	// be updated in lockstep. Indices match `newSession = await tasks
	// .frictionlessManager.createSession(...)` in submitPoWCaptchaSolution.ts.
	const CAPTCHA_TYPE_IDX = 5;
	const SITE_KEY_IDX = 6;
	const SIMD_READINGS_IDX = 19;
	const BUNDLE_ID_IDX = 24;
	const ORIGIN_SESSION_ID_IDX = 31;

	it("passes captchaType=image and the origin sessionId when escalating to image", async () => {
		env.spies.getPowCaptchaRecordByChallenge.mockResolvedValue({
			sessionId: "origin-id",
			dappAccount: "dapp",
		});
		env.spies.getSessionRecordBySessionId.mockResolvedValue(
			makeOriginSession(),
		);

		await buildEscalation(
			env.tasks,
			{ verified: true, routingOutput: { captchaType: CaptchaType.image } },
			"challenge",
		);

		expect(env.spies.createSession).toHaveBeenCalledTimes(1);
		const args = env.spies.createSession.mock.calls[0];
		expect(args[CAPTCHA_TYPE_IDX]).toBe(CaptchaType.image);
		expect(args[ORIGIN_SESSION_ID_IDX]).toBe("origin-id");
		// siteKey resolves from the origin session, not from the pow record's
		// dappAccount (the origin's siteKey is the source of truth if set).
		expect(args[SITE_KEY_IDX]).toBe("site");
	});

	it("passes captchaType=puzzle and the origin sessionId when escalating to puzzle", async () => {
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

		expect(env.spies.createSession).toHaveBeenCalledTimes(1);
		const args = env.spies.createSession.mock.calls[0];
		expect(args[CAPTCHA_TYPE_IDX]).toBe(CaptchaType.puzzle);
		expect(args[ORIGIN_SESSION_ID_IDX]).toBe("origin-id");
	});

	it("carries the origin's simdReadings onto the image escalation at creation time (so the DM verify path doesn't have to lean on chain fallback for the common case)", async () => {
		const originSimd = {
			supported: true,
			schema: 1,
			timerResolutionMs: 0.005,
			runsPerOp: 500,
			durationMs: 42,
			ops: [{ name: "f32x4_add", category: "arith", bestNs: 1.1, medianNs: 1.2, iters: 100, resultLane: 0 }],
		};
		const origin = {
			...makeOriginSession(),
			simdReadings: originSimd,
		};
		env.spies.getPowCaptchaRecordByChallenge.mockResolvedValue({
			sessionId: "origin-id",
			dappAccount: "dapp",
		});
		env.spies.getSessionRecordBySessionId.mockResolvedValue(origin);

		await buildEscalation(
			env.tasks,
			{ verified: true, routingOutput: { captchaType: CaptchaType.image } },
			"challenge",
		);

		const args = env.spies.createSession.mock.calls[0];
		expect(args[SIMD_READINGS_IDX]).toBe(originSimd);
	});

	it("carries the origin's simdReadings onto the puzzle escalation at creation time", async () => {
		const originSimd = {
			supported: true,
			schema: 1,
			timerResolutionMs: 0.005,
			runsPerOp: 500,
			durationMs: 42,
			ops: [{ name: "i32x4_add", category: "arith", bestNs: 0.9, medianNs: 1.0, iters: 100, resultLane: 0 }],
		};
		const origin = {
			...makeOriginSession(),
			simdReadings: originSimd,
		};
		env.spies.getPowCaptchaRecordByChallenge.mockResolvedValue({
			sessionId: "origin-id",
			dappAccount: "dapp",
		});
		env.spies.getSessionRecordBySessionId.mockResolvedValue(origin);

		await buildEscalation(
			env.tasks,
			{ verified: true, routingOutput: { captchaType: CaptchaType.puzzle } },
			"challenge",
		);

		const args = env.spies.createSession.mock.calls[0];
		expect(args[SIMD_READINGS_IDX]).toBe(originSimd);
	});

	it("carries the origin's bundleId onto the image escalation so the (same-origin) behavioural payload can be decrypted at solve time", async () => {
		const origin = {
			...makeOriginSession(),
			bundleId: "bundle-42",
		};
		env.spies.getPowCaptchaRecordByChallenge.mockResolvedValue({
			sessionId: "origin-id",
			dappAccount: "dapp",
		});
		env.spies.getSessionRecordBySessionId.mockResolvedValue(origin);

		await buildEscalation(
			env.tasks,
			{ verified: true, routingOutput: { captchaType: CaptchaType.image } },
			"challenge",
		);

		const args = env.spies.createSession.mock.calls[0];
		expect(args[BUNDLE_ID_IDX]).toBe("bundle-42");
	});

	it("carries the origin's bundleId onto the puzzle escalation for the same reason", async () => {
		const origin = {
			...makeOriginSession(),
			bundleId: "bundle-17",
		};
		env.spies.getPowCaptchaRecordByChallenge.mockResolvedValue({
			sessionId: "origin-id",
			dappAccount: "dapp",
		});
		env.spies.getSessionRecordBySessionId.mockResolvedValue(origin);

		await buildEscalation(
			env.tasks,
			{ verified: true, routingOutput: { captchaType: CaptchaType.puzzle } },
			"challenge",
		);

		const args = env.spies.createSession.mock.calls[0];
		expect(args[BUNDLE_ID_IDX]).toBe("bundle-17");
	});

	// Behavioural data (the decrypted BDP struct produced from the pow-solve
	// payload) is NOT persisted anywhere and consequently never appears on
	// the escalation record. buildEscalation deliberately doesn't try to
	// copy it forward — this test documents that so any future change that
	// starts persisting BDP has to update this assertion in lockstep.
	it("does NOT carry behavioural data (BDP) onto the escalation session — BDP lives only in the pow-solve request payload", async () => {
		// Attach an off-schema behavioural field on origin to prove it
		// doesn't leak into createSession's arguments.
		const origin = {
			...makeOriginSession(),
			behavioralDataPacked: {
				c1: [{ t: 1, x: 2, y: 3 }],
				c2: [],
				c3: [],
			},
		} as unknown as Session;
		env.spies.getPowCaptchaRecordByChallenge.mockResolvedValue({
			sessionId: "origin-id",
			dappAccount: "dapp",
		});
		env.spies.getSessionRecordBySessionId.mockResolvedValue(origin);

		await buildEscalation(
			env.tasks,
			{ verified: true, routingOutput: { captchaType: CaptchaType.image } },
			"challenge",
		);

		const args = env.spies.createSession.mock.calls[0];
		// No positional arg equals the origin's BDP — nothing was copied.
		expect(
			args.some(
				(a: unknown) =>
					a ===
					(origin as unknown as { behavioralDataPacked: unknown })
						.behavioralDataPacked,
			),
		).toBe(false);
	});
});
