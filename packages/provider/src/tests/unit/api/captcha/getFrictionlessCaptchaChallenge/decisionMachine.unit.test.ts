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

import { ContextType } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { hashUserAgentMock, timestampTooOldMock, timestampDecayMock } =
	vi.hoisted(() => ({
		hashUserAgentMock: vi.fn((ua: string) => `hashed:${ua}`),
		timestampTooOldMock: vi.fn(() => false),
		timestampDecayMock: vi.fn(() => 2),
	}));

vi.mock("../../../../../utils/hashUserAgent.js", () => ({
	hashUserAgent: hashUserAgentMock,
}));

vi.mock("../../../../../tasks/frictionless/frictionlessTasks.js", () => ({
	FrictionlessManager: { timestampTooOld: timestampTooOldMock },
	FrictionlessReason: {
		USER_AGENT_MISMATCH: "USER_AGENT_MISMATCH",
		CONTEXT_AWARE_VALIDATION_FAILED: "CONTEXT_AWARE_VALIDATION_FAILED",
		WEBVIEW_DETECTED: "WEBVIEW_DETECTED",
		OLD_TIMESTAMP: "OLD_TIMESTAMP",
		BOT_SCORE_ABOVE_THRESHOLD: "BOT_SCORE_ABOVE_THRESHOLD",
		AUTO_BAN_SCORE: "AUTO_BAN_SCORE",
	},
}));

vi.mock("../../../../../tasks/frictionless/frictionlessTasksUtils.js", () => ({
	timestampDecayFunction: timestampDecayMock,
}));

vi.mock("../../../contextAwareValidation.js", () => ({
	determineContextType: (webView: boolean) =>
		webView ? ContextType.Webview : ContextType.Default,
	getContextThreshold: () => 0.5,
}));

import { runDecisionMachine } from "../../../../../api/captcha/getFrictionlessCaptchaChallenge/decisionMachine.js";

const buildInput = (overrides: Partial<Record<string, unknown>> = {}) => ({
	tasks: {
		logger: { info: vi.fn() },
		frictionlessManager: {
			sendImageCaptcha: vi.fn().mockResolvedValue({ kind: "image" }),
			sendPowCaptcha: vi.fn().mockResolvedValue({ kind: "pow" }),
			scoreIncreaseWebView: vi.fn((_bs, score, sc) => ({
				score,
				scoreComponents: sc,
			})),
			scoreIncreaseTimestamp: vi.fn((_t, _bs, score, sc) => ({
				score,
				scoreComponents: sc,
			})),
			updateScore: vi.fn(),
			getClientContextEntropy: vi.fn().mockResolvedValue(undefined),
			registerBlockedSession: vi.fn().mockResolvedValue(undefined),
		},
	},
	env: { config: { captchas: { solved: { count: 4 } } } },
	clientRecord: {
		settings: {
			imageMaxRounds: 8,
			disallowWebView: false,
			contextAware: undefined,
		},
	},
	dapp: "dapp",
	user: "user",
	userSitekeyIpHash: "hash",
	flatHeaders: {},
	ipInfo: undefined,
	timestamp: Date.now(),
	decryptionFailed: false,
	userAgent: "hashed:ua",
	userId: "uid",
	webView: false,
	decryptedHeadHash: "",
	baseBotScore: 0,
	botScore: 0.1,
	scoreComponents: { baseScore: 0 },
	token: "tok",
	botThreshold: 0.5,
	...overrides,
});

const buildHandle = (uaHeader = "ua", prosopoUser = "uid") => {
	const req = {
		headers: { "user-agent": uaHeader, "prosopo-user": prosopoUser },
		logger: { info: vi.fn() },
		requestId: "rid",
		i18n: { t: (s: string) => s },
	};
	const res = {
		json: vi.fn().mockReturnValue("done"),
		status: vi.fn().mockReturnThis(),
	};
	const next = vi.fn();
	return { req, res, next, handle: { req, res, next } };
};

describe("runDecisionMachine", () => {
	beforeEach(() => {
		hashUserAgentMock.mockClear();
		timestampTooOldMock.mockReturnValue(false);
		timestampDecayMock.mockClear();
		timestampDecayMock.mockReturnValue(2);
	});

	it("returns image captcha on user-agent mismatch", async () => {
		const input = buildInput();
		const { res, handle } = buildHandle("differentUA", "uid");
		await runDecisionMachine(input as never, handle as never);
		expect(input.tasks.frictionlessManager.sendImageCaptcha).toHaveBeenCalled();
		expect(
			input.tasks.frictionlessManager.sendPowCaptcha,
		).not.toHaveBeenCalled();
		expect(res.json).toHaveBeenCalled();
	});

	it("returns image captcha when webview detected and disallowed", async () => {
		const input = buildInput({
			clientRecord: {
				settings: { imageMaxRounds: 8, disallowWebView: true },
			},
			webView: true,
		});
		const { res, handle } = buildHandle();
		await runDecisionMachine(input as never, handle as never);
		expect(input.tasks.frictionlessManager.sendImageCaptcha).toHaveBeenCalled();
		const args =
			input.tasks.frictionlessManager.sendImageCaptcha.mock.calls[0]?.[0];
		expect(args.reason).toBe("WEBVIEW_DETECTED");
	});

	it("returns image captcha when token timestamp is too old", async () => {
		timestampTooOldMock.mockReturnValueOnce(true);
		const input = buildInput();
		const { handle } = buildHandle();
		await runDecisionMachine(input as never, handle as never);
		expect(input.tasks.frictionlessManager.sendImageCaptcha).toHaveBeenCalled();
		const args =
			input.tasks.frictionlessManager.sendImageCaptcha.mock.calls[0]?.[0];
		expect(args.reason).toBe("OLD_TIMESTAMP");
	});

	it("returns image captcha when bot score exceeds threshold", async () => {
		const input = buildInput({ botScore: 0.95, botThreshold: 0.5 });
		const { handle } = buildHandle();
		await runDecisionMachine(input as never, handle as never);
		expect(input.tasks.frictionlessManager.sendImageCaptcha).toHaveBeenCalled();
		const args =
			input.tasks.frictionlessManager.sendImageCaptcha.mock.calls[0]?.[0];
		expect(args.reason).toBe("BOT_SCORE_ABOVE_THRESHOLD");
	});

	it("returns pow captcha when nothing trips (default path)", async () => {
		const input = buildInput();
		const { handle } = buildHandle();
		await runDecisionMachine(input as never, handle as never);
		expect(input.tasks.frictionlessManager.sendPowCaptcha).toHaveBeenCalled();
		expect(
			input.tasks.frictionlessManager.sendImageCaptcha,
		).not.toHaveBeenCalled();
	});

	describe("auto-ban threshold (post-penalty)", () => {
		it("fires when webView penalty pushes the score over the threshold", async () => {
			const input = buildInput({
				botScore: 1.0,
				baseBotScore: 1.0,
				botThreshold: 0.5,
				webView: true,
				clientRecord: {
					settings: {
						imageMaxRounds: 8,
						disallowWebView: true,
						autoBanScoreThreshold: 1.1,
					},
				},
			});
			input.tasks.frictionlessManager.scoreIncreaseWebView.mockImplementationOnce(
				(_bs, score, sc) => ({ score: score + 0.3, scoreComponents: sc }),
			);
			const { res, handle } = buildHandle();
			await runDecisionMachine(input as never, handle as never);

			expect(
				input.tasks.frictionlessManager.registerBlockedSession,
			).toHaveBeenCalledWith(
				expect.objectContaining({ reason: "AUTO_BAN_SCORE" }),
			);
			expect(res.status).toHaveBeenCalledWith(401);
			expect(
				input.tasks.frictionlessManager.sendImageCaptcha,
			).not.toHaveBeenCalled();
		});

		it("fires when timestamp_too_old penalty pushes the score over the threshold", async () => {
			timestampTooOldMock.mockReturnValueOnce(true);
			const input = buildInput({
				botScore: 1.0,
				baseBotScore: 1.0,
				botThreshold: 0.5,
				clientRecord: {
					settings: { imageMaxRounds: 8, autoBanScoreThreshold: 1.1 },
				},
			});
			input.tasks.frictionlessManager.scoreIncreaseTimestamp.mockImplementationOnce(
				(_t, _bs, score, sc) => ({ score: score + 0.5, scoreComponents: sc }),
			);
			const { res, handle } = buildHandle();
			await runDecisionMachine(input as never, handle as never);

			expect(
				input.tasks.frictionlessManager.registerBlockedSession,
			).toHaveBeenCalledWith(
				expect.objectContaining({ reason: "AUTO_BAN_SCORE" }),
			);
			expect(res.status).toHaveBeenCalledWith(401);
			expect(
				input.tasks.frictionlessManager.sendImageCaptcha,
			).not.toHaveBeenCalled();
		});

		it("fires when the pre-penalty score already exceeds the threshold (no penalties needed)", async () => {
			const input = buildInput({
				botScore: 1.2,
				baseBotScore: 1.0,
				clientRecord: {
					settings: { imageMaxRounds: 8, autoBanScoreThreshold: 1.1 },
				},
			});
			const { res, handle } = buildHandle();
			await runDecisionMachine(input as never, handle as never);

			expect(
				input.tasks.frictionlessManager.registerBlockedSession,
			).toHaveBeenCalledWith(
				expect.objectContaining({ reason: "AUTO_BAN_SCORE" }),
			);
			expect(res.status).toHaveBeenCalledWith(401);
		});

		it("when both webView and autoBan would trip, autoBan wins", async () => {
			const input = buildInput({
				botScore: 1.0,
				baseBotScore: 1.0,
				botThreshold: 0.5,
				webView: true,
				clientRecord: {
					settings: {
						imageMaxRounds: 8,
						disallowWebView: true,
						autoBanScoreThreshold: 1.1,
					},
				},
			});
			input.tasks.frictionlessManager.scoreIncreaseWebView.mockImplementationOnce(
				(_bs, score, sc) => ({ score: score + 0.2, scoreComponents: sc }),
			);
			const { handle } = buildHandle();
			await runDecisionMachine(input as never, handle as never);

			expect(
				input.tasks.frictionlessManager.registerBlockedSession,
			).toHaveBeenCalled();
			expect(
				input.tasks.frictionlessManager.sendImageCaptcha,
			).not.toHaveBeenCalled();
		});
	});
});
