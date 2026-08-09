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

import { CaptchaType } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runConfiguredCaptchaTypeShortCircuit } from "../../../../../api/captcha/getFrictionlessCaptchaChallenge/shortCircuit.js";

const buildInput = (
	overrides: Partial<Record<string, unknown>> = {},
	{
		resolvedBundleId,
	}: { resolvedBundleId?: string } = {},
) => {
	const tasks = {
		frictionlessManager: {
			sendImageCaptcha: vi.fn().mockResolvedValue({ kind: "image" }),
			sendPowCaptcha: vi.fn().mockResolvedValue({ kind: "pow" }),
			sendPuzzleCaptcha: vi.fn().mockResolvedValue({ kind: "puzzle" }),
			resolveBundleByDetectorSession: vi
				.fn()
				.mockResolvedValue(
					resolvedBundleId
						? { bundleId: resolvedBundleId, key: "k", innerConfig: "c" }
						: undefined,
				),
		},
	};
	const env = {
		config: { captchas: { solved: { count: 4 } } },
	};
	return {
		tasks,
		env,
		input: {
			tasks,
			env,
			clientRecord: {
				settings: {
					imageMaxRounds: 10,
					captchaType: CaptchaType.pow,
				},
			},
			token: "tok",
			dapp: "dapp",
			ipAddress: { lower: 0n, type: "v4" } as never,
			ipInfo: undefined,
			flatHeaders: {},
			sessionMode: undefined,
			userSitekeyIpHash: "hash",
			logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
			...overrides,
		},
	};
};

const buildRes = () => ({
	json: vi.fn().mockReturnValue("response"),
});

describe("runConfiguredCaptchaTypeShortCircuit", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns null (no short-circuit) when sitekey is frictionless", async () => {
		const { input } = buildInput();
		input.clientRecord = {
			settings: { imageMaxRounds: 10, captchaType: CaptchaType.frictionless },
		};
		const res = buildRes();
		const r = await runConfiguredCaptchaTypeShortCircuit(
			input as never,
			res as never,
		);
		expect(r).toBeNull();
	});

	it("returns null when captchaType is unset", async () => {
		const { input } = buildInput();
		input.clientRecord = { settings: { imageMaxRounds: 10 } } as never;
		const res = buildRes();
		const r = await runConfiguredCaptchaTypeShortCircuit(
			input as never,
			res as never,
		);
		expect(r).toBeNull();
	});

	it("dispatches to sendImageCaptcha for image sitekeys", async () => {
		const { tasks, input } = buildInput();
		input.clientRecord = {
			settings: { imageMaxRounds: 3, captchaType: CaptchaType.image },
		};
		const res = buildRes();
		await runConfiguredCaptchaTypeShortCircuit(input as never, res as never);
		expect(tasks.frictionlessManager.sendImageCaptcha).toHaveBeenCalled();
		// Solved-count is clamped to imageMaxRounds=3.
		const args = tasks.frictionlessManager.sendImageCaptcha.mock.calls[0]?.[0];
		expect(args.solvedImagesCount).toBe(3);
	});

	it("dispatches to sendPowCaptcha for pow sitekeys", async () => {
		const { tasks, input } = buildInput();
		const res = buildRes();
		await runConfiguredCaptchaTypeShortCircuit(input as never, res as never);
		expect(tasks.frictionlessManager.sendPowCaptcha).toHaveBeenCalled();
	});

	it("dispatches to sendPuzzleCaptcha for puzzle sitekeys", async () => {
		const { tasks, input } = buildInput();
		input.clientRecord = {
			settings: { imageMaxRounds: 10, captchaType: CaptchaType.puzzle },
		};
		const res = buildRes();
		await runConfiguredCaptchaTypeShortCircuit(input as never, res as never);
		expect(tasks.frictionlessManager.sendPuzzleCaptcha).toHaveBeenCalled();
	});

	it("throws when the sitekey carries an unknown captchaType", async () => {
		const { input } = buildInput();
		input.clientRecord = {
			settings: { imageMaxRounds: 10, captchaType: "unknown" },
		} as never;
		const res = buildRes();
		await expect(
			runConfiguredCaptchaTypeShortCircuit(input as never, res as never),
		).rejects.toThrow(/Unhandled configured captchaType/);
	});

	describe("bundleId promotion (regression)", () => {
		it("promotes bundleId onto pow bypass session when client sent a detectorSessionId", async () => {
			const { tasks, input } = buildInput(
				{ detectorSessionId: "det-abc" },
				{ resolvedBundleId: "bundle-7" },
			);
			const res = buildRes();
			await runConfiguredCaptchaTypeShortCircuit(input as never, res as never);
			expect(
				tasks.frictionlessManager.resolveBundleByDetectorSession,
			).toHaveBeenCalledWith("det-abc");
			const args = tasks.frictionlessManager.sendPowCaptcha.mock.calls[0]?.[0];
			expect(args.bundleId).toBe("bundle-7");
		});

		it("promotes bundleId onto image bypass session", async () => {
			const { tasks, input } = buildInput(
				{ detectorSessionId: "det-img" },
				{ resolvedBundleId: "bundle-3" },
			);
			input.clientRecord = {
				settings: { imageMaxRounds: 3, captchaType: CaptchaType.image },
			};
			const res = buildRes();
			await runConfiguredCaptchaTypeShortCircuit(input as never, res as never);
			const args =
				tasks.frictionlessManager.sendImageCaptcha.mock.calls[0]?.[0];
			expect(args.bundleId).toBe("bundle-3");
		});

		it("promotes bundleId onto puzzle bypass session", async () => {
			const { tasks, input } = buildInput(
				{ detectorSessionId: "det-puz" },
				{ resolvedBundleId: "bundle-99" },
			);
			input.clientRecord = {
				settings: { imageMaxRounds: 10, captchaType: CaptchaType.puzzle },
			};
			const res = buildRes();
			await runConfiguredCaptchaTypeShortCircuit(input as never, res as never);
			const args =
				tasks.frictionlessManager.sendPuzzleCaptcha.mock.calls[0]?.[0];
			expect(args.bundleId).toBe("bundle-99");
		});

		it("omits bundleId when detectorSessionId is absent (empty-pool fallback)", async () => {
			const { tasks, input } = buildInput({}, { resolvedBundleId: "bundle-1" });
			// no detectorSessionId set
			const res = buildRes();
			await runConfiguredCaptchaTypeShortCircuit(input as never, res as never);
			expect(
				tasks.frictionlessManager.resolveBundleByDetectorSession,
			).not.toHaveBeenCalled();
			const args = tasks.frictionlessManager.sendPowCaptcha.mock.calls[0]?.[0];
			expect(args.bundleId).toBeUndefined();
		});

		it("omits bundleId when Redis binding has expired", async () => {
			// resolveBundleByDetectorSession returns undefined (no binding)
			const { tasks, input } = buildInput({
				detectorSessionId: "det-expired",
			});
			const res = buildRes();
			await runConfiguredCaptchaTypeShortCircuit(input as never, res as never);
			const args = tasks.frictionlessManager.sendPowCaptcha.mock.calls[0]?.[0];
			expect(args.bundleId).toBeUndefined();
		});
	});
});
