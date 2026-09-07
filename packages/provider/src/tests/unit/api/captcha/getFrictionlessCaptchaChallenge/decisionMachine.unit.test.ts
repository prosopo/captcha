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
		WEBVIEW_DETECTED: "WEBVIEW_DETECTED",
		OLD_TIMESTAMP: "OLD_TIMESTAMP",
		BOT_SCORE_ABOVE_THRESHOLD: "BOT_SCORE_ABOVE_THRESHOLD",
		BOT_SCORE_PUZZLE_BAND: "BOT_SCORE_PUZZLE_BAND",
		AUTO_BAN_SCORE: "AUTO_BAN_SCORE",
		MISSING_CURRENT_URL: "MISSING_CURRENT_URL",
		DECRYPTION_FAILED: "DECRYPTION_FAILED",
		MISSING_TOKEN: "MISSING_TOKEN",
		MISSING_HEAD_HASH: "MISSING_HEAD_HASH",
	},
}));

vi.mock("../../../../../tasks/frictionless/frictionlessTasksUtils.js", () => ({
	timestampDecayFunction: timestampDecayMock,
}));

import { runDecisionMachine } from "../../../../../api/captcha/getFrictionlessCaptchaChallenge/decisionMachine.js";

const buildInput = (overrides: Partial<Record<string, unknown>> = {}) => ({
	tasks: {
		logger: { info: vi.fn() },
		frictionlessManager: {
			sendImageCaptcha: vi.fn().mockResolvedValue({ kind: "image" }),
			sendPowCaptcha: vi.fn().mockResolvedValue({ kind: "pow" }),
			sendPuzzleCaptcha: vi.fn().mockResolvedValue({ kind: "puzzle" }),
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
	headHash: "0xhead",
	botThreshold: 0.5,
	botImageThreshold: 1,
	triggeredDetectors: undefined,
	currentUrl: "https://example.com/page",
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

	it("serves a 3-round image captcha when the client sent no token", async () => {
		const input = buildInput({ token: "" });
		const { res, handle } = buildHandle();
		await runDecisionMachine(input as never, handle as never);
		expect(
			input.tasks.frictionlessManager.sendImageCaptcha,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				solvedImagesCount: 3,
				reason: "MISSING_TOKEN",
			}),
		);
		expect(
			input.tasks.frictionlessManager.sendPowCaptcha,
		).not.toHaveBeenCalled();
		expect(res.json).toHaveBeenCalled();
	});

	it("never lets a missing token reach the frictionless PoW pass", async () => {
		// The client used to be able to declare its own detector unavailable and
		// be handed PoW for it. An absent payload must cost an image captcha.
		const input = buildInput({
			token: "",
			headHash: "",
			botScore: 0,
			currentUrl: "https://example.com/page",
		});
		const { handle } = buildHandle();
		await runDecisionMachine(input as never, handle as never);
		expect(
			input.tasks.frictionlessManager.sendPowCaptcha,
		).not.toHaveBeenCalled();
	});

	it("caps the missing-token rounds at the sitekey's imageMaxRounds", async () => {
		const input = buildInput({
			token: "",
			clientRecord: { settings: { imageMaxRounds: 1, disallowWebView: false } },
		});
		const { handle } = buildHandle();
		await runDecisionMachine(input as never, handle as never);
		expect(
			input.tasks.frictionlessManager.sendImageCaptcha,
		).toHaveBeenCalledWith(expect.objectContaining({ solvedImagesCount: 1 }));
	});

	it("serves a 2-round image captcha when a token arrived without a head hash", async () => {
		const input = buildInput({ headHash: "" });
		const { handle } = buildHandle();
		await runDecisionMachine(input as never, handle as never);
		expect(
			input.tasks.frictionlessManager.sendImageCaptcha,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				solvedImagesCount: 2,
				reason: "MISSING_HEAD_HASH",
			}),
		);
		expect(
			input.tasks.frictionlessManager.sendPowCaptcha,
		).not.toHaveBeenCalled();
	});

	it("prefers the missing-token reason when both are absent", async () => {
		const input = buildInput({ token: "", headHash: "" });
		const { handle } = buildHandle();
		await runDecisionMachine(input as never, handle as never);
		expect(
			input.tasks.frictionlessManager.sendImageCaptcha,
		).toHaveBeenCalledWith(
			expect.objectContaining({ reason: "MISSING_TOKEN" }),
		);
	});

	it("short-circuits to a 3-round image captcha when decryption failed", async () => {
		const input = buildInput({ decryptionFailed: true });
		const { res, handle } = buildHandle();
		await runDecisionMachine(input as never, handle as never);
		expect(
			input.tasks.frictionlessManager.sendImageCaptcha,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				solvedImagesCount: 3,
				reason: "DECRYPTION_FAILED",
			}),
		);
		expect(
			input.tasks.frictionlessManager.sendPowCaptcha,
		).not.toHaveBeenCalled();
		expect(res.json).toHaveBeenCalled();
	});

	it("caps the decryption-failed rounds at the sitekey's imageMaxRounds", async () => {
		const input = buildInput({
			decryptionFailed: true,
			clientRecord: { settings: { imageMaxRounds: 2, disallowWebView: false } },
		});
		const { handle } = buildHandle();
		await runDecisionMachine(input as never, handle as never);
		expect(
			input.tasks.frictionlessManager.sendImageCaptcha,
		).toHaveBeenCalledWith(expect.objectContaining({ solvedImagesCount: 2 }));
	});

	it("reports decryption failure as such, not as a user-agent mismatch", async () => {
		// decryptPayload leaves userAgent/userId undefined on failure, so the UA
		// check can never match — without the earlier short-circuit these land in
		// USER_AGENT_MISMATCH.
		const input = buildInput({
			decryptionFailed: true,
			userAgent: undefined,
			userId: undefined,
		});
		const { handle } = buildHandle();
		await runDecisionMachine(input as never, handle as never);
		expect(
			input.tasks.frictionlessManager.sendImageCaptcha,
		).toHaveBeenCalledWith(
			expect.objectContaining({ reason: "DECRYPTION_FAILED" }),
		);
	});

	it("never hard-blocks a failed decrypt, even under autoBanScoreThreshold", async () => {
		const input = buildInput({
			decryptionFailed: true,
			// what decryptPayload substitutes on failure
			baseBotScore: 1,
			botScore: 1,
			timestamp: 0,
			clientRecord: {
				settings: {
					imageMaxRounds: 8,
					disallowWebView: false,
					autoBanScoreThreshold: 0.8,
				},
			},
		});
		const { res, handle } = buildHandle();
		await runDecisionMachine(input as never, handle as never);
		expect(
			input.tasks.frictionlessManager.registerBlockedSession,
		).not.toHaveBeenCalled();
		expect(res.status).not.toHaveBeenCalledWith(401);
		expect(input.tasks.frictionlessManager.sendImageCaptcha).toHaveBeenCalled();
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
		const input = buildInput({
			botScore: 0.95,
			botThreshold: 0.5,
			botImageThreshold: 0.5,
		});
		const { handle } = buildHandle();
		await runDecisionMachine(input as never, handle as never);
		expect(input.tasks.frictionlessManager.sendImageCaptcha).toHaveBeenCalled();
		const args =
			input.tasks.frictionlessManager.sendImageCaptcha.mock.calls[0]?.[0];
		expect(args.reason).toBe("BOT_SCORE_ABOVE_THRESHOLD");
	});

	describe("score ladder", () => {
		// pow ≤ 0.35 < puzzle < 0.75 ≤ image
		const laddered = (overrides: Record<string, unknown> = {}) =>
			buildInput({ botThreshold: 0.35, botImageThreshold: 0.75, ...overrides });

		it("passes a clean score through to PoW", async () => {
			const input = laddered({ botScore: 0.2 });
			const { handle } = buildHandle();
			await runDecisionMachine(input as never, handle as never);
			expect(input.tasks.frictionlessManager.sendPowCaptcha).toHaveBeenCalled();
			expect(
				input.tasks.frictionlessManager.sendPuzzleCaptcha,
			).not.toHaveBeenCalled();
		});

		it("sends a puzzle for a score in the middle band", async () => {
			const input = laddered({ botScore: 0.5 });
			const { handle } = buildHandle();
			await runDecisionMachine(input as never, handle as never);
			expect(
				input.tasks.frictionlessManager.sendPuzzleCaptcha,
			).toHaveBeenCalledWith(
				expect.objectContaining({ reason: "BOT_SCORE_PUZZLE_BAND" }),
			);
			expect(
				input.tasks.frictionlessManager.sendImageCaptcha,
			).not.toHaveBeenCalled();
			expect(
				input.tasks.frictionlessManager.sendPowCaptcha,
			).not.toHaveBeenCalled();
		});

		it("sends an image captcha at the upper threshold", async () => {
			const input = laddered({ botScore: 0.75 });
			const { handle } = buildHandle();
			await runDecisionMachine(input as never, handle as never);
			expect(
				input.tasks.frictionlessManager.sendImageCaptcha,
			).toHaveBeenCalledWith(
				expect.objectContaining({ reason: "BOT_SCORE_ABOVE_THRESHOLD" }),
			);
			expect(
				input.tasks.frictionlessManager.sendPuzzleCaptcha,
			).not.toHaveBeenCalled();
		});

		it("hands the puzzle band a sitekey's image rounds for the no-renderer downgrade", async () => {
			// sendPuzzleCaptcha downgrades to image when this provider can't
			// render puzzles, and reads solvedImagesCount off the same params.
			const input = laddered({ botScore: 0.5, triggeredDetectors: [1, 2] });
			const { handle } = buildHandle();
			await runDecisionMachine(input as never, handle as never);
			expect(
				input.tasks.frictionlessManager.sendPuzzleCaptcha,
			).toHaveBeenCalledWith(
				// baseline 4 + 2 triggered detectors
				expect.objectContaining({ solvedImagesCount: 6 }),
			);
		});

		it("handles an upper band above 1, where the post-penalty scores live", async () => {
			// The detector's own score saturates at 1, so a band that has to
			// separate "saturated" from "saturated + access-rule penalty" can
			// only do it above 1. A saturated-but-unpenalised 1.0 must land in
			// the puzzle band, and a penalised 1.7 in image.
			const banded = (botScore: number) =>
				buildInput({
					botScore,
					botThreshold: 0.5,
					botImageThreshold: 1.2,
				});

			const puzzled = banded(1.0);
			await runDecisionMachine(puzzled as never, buildHandle().handle as never);
			expect(
				puzzled.tasks.frictionlessManager.sendPuzzleCaptcha,
			).toHaveBeenCalled();

			const imaged = banded(1.7);
			await runDecisionMachine(imaged as never, buildHandle().handle as never);
			expect(
				imaged.tasks.frictionlessManager.sendImageCaptcha,
			).toHaveBeenCalled();
			expect(
				imaged.tasks.frictionlessManager.sendPuzzleCaptcha,
			).not.toHaveBeenCalled();
		});

		it("collapses to the old two-outcome ladder when both rungs match", async () => {
			// A sitekey that puts both rungs on the same value must behave
			// exactly as it did before the middle band existed.
			const input = buildInput({
				botScore: 0.9,
				botThreshold: 0.35,
				botImageThreshold: 0.35,
			});
			const { handle } = buildHandle();
			await runDecisionMachine(input as never, handle as never);
			expect(
				input.tasks.frictionlessManager.sendImageCaptcha,
			).toHaveBeenCalled();
			expect(
				input.tasks.frictionlessManager.sendPuzzleCaptcha,
			).not.toHaveBeenCalled();
		});

		it("never inverts the ladder when the image rung is below the puzzle rung", async () => {
			// resolveScoreLadder clamps this, but the machine must not puzzle
			// everything above the image rung if a bad pair reaches it.
			const input = laddered({ botScore: 0.9, botImageThreshold: 0.35 });
			const { handle } = buildHandle();
			await runDecisionMachine(input as never, handle as never);
			expect(
				input.tasks.frictionlessManager.sendImageCaptcha,
			).toHaveBeenCalled();
			expect(
				input.tasks.frictionlessManager.sendPuzzleCaptcha,
			).not.toHaveBeenCalled();
		});
	});

	describe("image rounds scale with triggered signals", () => {
		it("serves the sitekey baseline when nothing fired", async () => {
			const input = buildInput({
				botScore: 0.95,
				botImageThreshold: 0.5,
				triggeredDetectors: [],
			});
			const { handle } = buildHandle();
			await runDecisionMachine(input as never, handle as never);
			expect(
				input.tasks.frictionlessManager.sendImageCaptcha,
			).toHaveBeenCalledWith(expect.objectContaining({ solvedImagesCount: 4 }));
		});

		it("adds a round per triggered signal", async () => {
			const input = buildInput({
				botScore: 0.95,
				botImageThreshold: 0.5,
				triggeredDetectors: [3, 9, 11],
			});
			const { handle } = buildHandle();
			await runDecisionMachine(input as never, handle as never);
			expect(
				input.tasks.frictionlessManager.sendImageCaptcha,
			).toHaveBeenCalledWith(expect.objectContaining({ solvedImagesCount: 7 }));
		});

		it("still clamps to the sitekey's imageMaxRounds", async () => {
			const input = buildInput({
				botScore: 0.95,
				botImageThreshold: 0.5,
				triggeredDetectors: [1, 2, 3, 4, 5, 6],
				clientRecord: { settings: { imageMaxRounds: 5 } },
			});
			const { handle } = buildHandle();
			await runDecisionMachine(input as never, handle as never);
			expect(
				input.tasks.frictionlessManager.sendImageCaptcha,
			).toHaveBeenCalledWith(expect.objectContaining({ solvedImagesCount: 5 }));
		});
	});

	it.each([undefined, ""])(
		"returns image captcha when currentUrl is missing (%s)",
		async (missing) => {
			const input = buildInput({ currentUrl: missing });
			const { res, handle } = buildHandle();
			await runDecisionMachine(input as never, handle as never);
			expect(
				input.tasks.frictionlessManager.sendImageCaptcha,
			).toHaveBeenCalled();
			const args =
				input.tasks.frictionlessManager.sendImageCaptcha.mock.calls[0]?.[0];
			expect(args.reason).toBe("MISSING_CURRENT_URL");
			expect(
				input.tasks.frictionlessManager.sendPowCaptcha,
			).not.toHaveBeenCalled();
			expect(res.json).toHaveBeenCalled();
		},
	);

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
