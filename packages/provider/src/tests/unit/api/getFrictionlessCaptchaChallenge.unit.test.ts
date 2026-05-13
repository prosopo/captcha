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

import { CaptchaType, ContextType } from "@prosopo/types";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";
import getHandler from "../../../api/captcha/getFrictionlessCaptchaChallenge.js";
import { FrictionlessReason } from "../../../tasks/frictionless/frictionlessTasks.js";

// Minimal typed mocks to avoid `any`
type MockFn = ReturnType<typeof vi.fn>;

type MockTasks = {
	frictionlessManager: {
		decryptPayload: MockFn;
		checkLangRules: MockFn;
		setSessionParams: MockFn;
		setRoutingContext: MockFn;
		getClientContextEntropy: MockFn;
		sendImageCaptcha: MockFn;
		sendPowCaptcha: MockFn;
		sendPuzzleCaptcha: MockFn;
		registerBlockedSession: MockFn;
		getPrioritisedAccessPolicies: MockFn;
		isValidRequest: MockFn;
		scoreIncreaseAccessPolicy: MockFn;
		scoreIncreaseWebView: MockFn;
		scoreIncreaseTimestamp: MockFn;
		scoreIncreaseUnverifiedHost: MockFn;
		updateScore: MockFn;
		hostVerified: MockFn;
	};
	db: {
		getSessionRecordByToken: MockFn;
		getSessionByuserSitekeyIpHash: MockFn;
		getClientRecord: MockFn;
	};
	logger: Record<string, unknown>;
};

const mockLogger: Record<string, MockFn | ((...args: unknown[]) => void)> = {
	info: vi.fn(),
	debug: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
};

type MockReq = {
	body: unknown;
	headers: Record<string, unknown>;
	ip: string;
	ja4: Record<string, unknown>;
	logger: Record<string, unknown>;
	i18n: { t: (s: string) => string };
	requestId?: string;
	path?: string;
	method?: string;
};

type MockRes = {
	json: (v: unknown) => Promise<unknown>;
	status: (code: number) => MockRes;
	on: (event: string, handler: () => void) => MockRes;
	statusCode?: number;
};

// Helper to build req/res/next
const buildReqRes = (body: unknown, ip = "127.0.0.1") => {
	const req: MockReq = {
		body,
		headers: { "prosopo-user": "u", "user-agent": "ua" },
		ip,
		ja4: {},
		logger: mockLogger,
		i18n: { t: (s: string) => s },
		requestId: "test-request-id",
		path: "/frictionless",
		method: "POST",
	};
	const res: MockRes = {
		json: vi.fn(async (v: unknown) => v),
		status: vi.fn().mockReturnThis(),
		on: vi.fn().mockReturnThis(),
		statusCode: 200,
	} as unknown as MockRes;
	const next = vi.fn();
	return { req, res, next };
};

// Mock the normalizeRequestIp utility
vi.mock("../../../utils/normalizeRequestIp.js", () => ({
	normalizeRequestIp: vi.fn((ip: unknown) => String(ip)),
}));

// Mock the hashUserAgent utility
vi.mock("../../../utils/hashUserAgent.js", () => ({
	hashUserAgent: vi.fn((ua: string) => "844bc172f032bdd2d0baae3536c1d66c"),
}));

// Mock the hashUserIp utility
vi.mock("../../../utils/hashUserIp.js", () => ({
	hashUserIp: vi.fn(
		(user: string, ip: string, sitekey: string) =>
			`hash-${user}-${ip}-${sitekey}`,
	),
}));

// Mock getMaintenanceMode
vi.mock("../../../api/admin/apiToggleMaintenanceModeEndpoint.js", () => ({
	getMaintenanceMode: vi.fn(() => false),
}));

// Mock getRequestUserScope
vi.mock("../../../api/blacklistRequestInspector.js", () => ({
	getRequestUserScope: vi.fn(() => ({})),
}));

// Mock getCompositeIpAddress
vi.mock("../../../compositeIpAddress.js", () => ({
	getCompositeIpAddress: vi.fn((ip: string) => ip),
}));

vi.mock("../../../tasks/index.js", async () => {
	const actual = await vi.importActual("../../../tasks/index.js");
	return {
		...(actual as Record<string, unknown>),
		Tasks: vi.fn().mockImplementation(
			(): MockTasks => ({
				frictionlessManager: {
					decryptPayload: vi.fn(),
					checkLangRules: vi.fn().mockReturnValue(0),
					setSessionParams: vi.fn(),
					setRoutingContext: vi.fn(),
					getClientContextEntropy: vi.fn(),
					sendImageCaptcha: vi.fn().mockResolvedValue({ type: "image" }),
					sendPowCaptcha: vi.fn().mockResolvedValue({ type: "pow" }),
					sendPuzzleCaptcha: vi.fn().mockResolvedValue({ type: "puzzle" }),
					registerBlockedSession: vi.fn(),
					getPrioritisedAccessPolicies: vi.fn().mockResolvedValue([]),
					isValidRequest: vi.fn().mockResolvedValue({ valid: true }),
					scoreIncreaseAccessPolicy: vi.fn(
						(p: unknown, bs: number, score: number, sc: unknown) => ({
							score,
							scoreComponents: sc,
						}),
					),
					scoreIncreaseWebView: vi.fn(
						(bs: number, score: number, sc: unknown) => ({
							score,
							scoreComponents: sc,
						}),
					),
					scoreIncreaseTimestamp: vi.fn(
						(t: number, bs: number, score: number, sc: unknown) => ({
							score,
							scoreComponents: sc,
						}),
					),
					scoreIncreaseUnverifiedHost: vi.fn(
						(d: unknown, bs: number, score: number, sc: unknown) => ({
							score,
							scoreComponents: sc,
						}),
					),
					updateScore: vi.fn(),
					hostVerified: vi
						.fn()
						.mockResolvedValue({ verified: true, domain: "example.com" }),
				},
				db: {
					getSessionRecordByToken: vi.fn().mockResolvedValue(null),
					getSessionByuserSitekeyIpHash: vi.fn().mockResolvedValue(null),
					getClientRecord: vi.fn(),
				},
				logger: mockLogger as unknown as Record<string, unknown>,
			}),
		),
	};
});

import { Tasks } from "../../../tasks/index.js";

describe("getFrictionlessCaptchaChallenge - context selection", () => {
	const mockEnv = {
		config: {
			captchas: {
				solved: { count: 5 },
			},
		},
	};
	// biome-ignore lint/suspicious/noExplicitAny: mock request
	const handler = getHandler(mockEnv as any, {} as any);

	let tasksInstance: MockTasks;

	const makeMockTasks = (): MockTasks => ({
		frictionlessManager: {
			decryptPayload: vi.fn(),
			checkLangRules: vi.fn().mockReturnValue(0),
			setSessionParams: vi.fn(),
			setRoutingContext: vi.fn(),
			getClientContextEntropy: vi.fn(),
			sendImageCaptcha: vi.fn().mockResolvedValue({ type: "image" }),
			sendPowCaptcha: vi.fn().mockResolvedValue({ type: "pow" }),
			sendPuzzleCaptcha: vi.fn().mockResolvedValue({ type: "puzzle" }),
			registerBlockedSession: vi.fn(),
			getPrioritisedAccessPolicies: vi.fn().mockResolvedValue([]),
			isValidRequest: vi.fn().mockResolvedValue({ valid: true }),
			scoreIncreaseAccessPolicy: vi.fn(
				(p: unknown, bs: number, score: number, sc: unknown) => ({
					score,
					scoreComponents: sc,
				}),
			),
			scoreIncreaseWebView: vi.fn((bs: number, score: number, sc: unknown) => ({
				score,
				scoreComponents: sc,
			})),
			scoreIncreaseTimestamp: vi.fn(
				(t: number, bs: number, score: number, sc: unknown) => ({
					score,
					scoreComponents: sc,
				}),
			),
			scoreIncreaseUnverifiedHost: vi.fn(
				(d: unknown, bs: number, score: number, sc: unknown) => ({
					score,
					scoreComponents: sc,
				}),
			),
			updateScore: vi.fn(),
			hostVerified: vi
				.fn()
				.mockResolvedValue({ verified: true, domain: "example.com" }),
		},
		db: {
			getSessionRecordByToken: vi.fn().mockResolvedValue(null),
			getSessionByuserSitekeyIpHash: vi.fn().mockResolvedValue(null),
			getClientRecord: vi.fn(),
		},
		logger: mockLogger as unknown as Record<string, unknown>,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		tasksInstance = makeMockTasks();
		(Tasks as unknown as Mock).mockImplementation(() => tasksInstance);
	});

	it("uses webview or default when both contexts exist", async () => {
		// Arrange: both contexts present
		const clientRecord = {
			account: "site1",
			settings: {
				contextAware: {
					enabled: true,
					contexts: {
						[ContextType.Default]: {
							type: ContextType.Default,
							threshold: 0.5,
						},
						[ContextType.Webview]: {
							type: ContextType.Webview,
							threshold: 0.5,
						},
					},
				},
				frictionlessThreshold: 0.5,
				disallowWebView: false,
			},
		};

		// stub db.getClientRecord
		tasksInstance.db.getClientRecord.mockResolvedValue(clientRecord);

		// decryptPayload returns webView true and a head hash
		tasksInstance.frictionlessManager.decryptPayload.mockResolvedValue({
			baseBotScore: 0,
			timestamp: Date.now(),
			providerSelectEntropy: 0,
			userId: "u",
			userAgent: "844bc172f032bdd2d0baae3536c1d66c",
			webView: true,
			iFrame: false,
			decryptedHeadHash: "abc",
			decryptionFailed: false,
		});

		// return entropy for Webview
		tasksInstance.frictionlessManager.getClientContextEntropy.mockResolvedValueOnce(
			"ent-web",
		);

		const body = { token: "t", headHash: "hh", dapp: "site1", user: "u" };
		const { req, res, next } = buildReqRes(body);

		// Act
		// biome-ignore lint/suspicious/noExplicitAny: mock request
		await handler(req as any, res as any, next);

		// Get the instance created by the handler and assert
		expect(
			tasksInstance.frictionlessManager.getClientContextEntropy,
		).toHaveBeenCalledWith("site1", ContextType.Webview);

		// Now test webView=false -> default
		tasksInstance.frictionlessManager.getClientContextEntropy.mockClear();
		tasksInstance.frictionlessManager.decryptPayload.mockResolvedValueOnce({
			baseBotScore: 0,
			timestamp: Date.now(),
			providerSelectEntropy: 0,
			userId: "u",
			userAgent: "844bc172f032bdd2d0baae3536c1d66c",
			webView: false,
			iFrame: false,
			decryptedHeadHash: "abc",
			decryptionFailed: false,
		});
		tasksInstance.frictionlessManager.getClientContextEntropy.mockResolvedValueOnce(
			"ent-def",
		);
		// biome-ignore lint/suspicious/noExplicitAny: mock request
		await handler(req as any, res as any, next);
		expect(
			tasksInstance.frictionlessManager.getClientContextEntropy,
		).toHaveBeenCalledWith("site1", ContextType.Default);
	});

	it("uses default when only default exists", async () => {
		const clientRecord = {
			account: "site2",
			settings: {
				contextAware: {
					enabled: true,
					contexts: {
						[ContextType.Default]: {
							type: ContextType.Default,
							threshold: 0.5,
						},
					},
				},
				frictionlessThreshold: 0.5,
				disallowWebView: false,
			},
		};
		tasksInstance.db.getClientRecord.mockResolvedValue(clientRecord);

		tasksInstance.frictionlessManager.decryptPayload.mockResolvedValue({
			baseBotScore: 0,
			timestamp: Date.now(),
			providerSelectEntropy: 0,
			userId: "u",
			userAgent: "844bc172f032bdd2d0baae3536c1d66c",
			webView: true, // even if webView true
			iFrame: false,
			decryptedHeadHash: "abc",
			decryptionFailed: false,
		});
		tasksInstance.frictionlessManager.getClientContextEntropy.mockResolvedValueOnce(
			"ent-def-only",
		);

		const body = { token: "t2", headHash: "hh2", dapp: "site2", user: "u" };
		const { req, res, next } = buildReqRes(body);
		// biome-ignore lint/suspicious/noExplicitAny: mock request
		await handler(req as any, res as any, next);

		expect(
			tasksInstance.frictionlessManager.getClientContextEntropy,
		).toHaveBeenCalledWith("site2", ContextType.Default);
	});

	it("uses webview when only webview exists", async () => {
		const clientRecord = {
			account: "site3",
			settings: {
				contextAware: {
					enabled: true,
					contexts: {
						[ContextType.Webview]: {
							type: ContextType.Webview,
							threshold: 0.5,
						},
					},
				},
				frictionlessThreshold: 0.5,
				disallowWebView: false,
			},
		};
		tasksInstance.db.getClientRecord.mockResolvedValue(clientRecord);

		tasksInstance.frictionlessManager.decryptPayload.mockResolvedValue({
			baseBotScore: 0,
			timestamp: Date.now(),
			providerSelectEntropy: 0,
			userId: "u",
			userAgent: "844bc172f032bdd2d0baae3536c1d66c",
			webView: false, // even if webView false
			iFrame: false,
			decryptedHeadHash: "abc",
			decryptionFailed: false,
		});
		tasksInstance.frictionlessManager.getClientContextEntropy.mockResolvedValueOnce(
			"ent-web-only",
		);

		const body = { token: "t3", headHash: "hh3", dapp: "site3", user: "u" };
		const { req, res, next } = buildReqRes(body);
		// biome-ignore lint/suspicious/noExplicitAny: mock request
		await handler(req as any, res as any, next);

		expect(
			tasksInstance.frictionlessManager.getClientContextEntropy,
		).toHaveBeenCalledWith("site3", ContextType.Webview);
	});

	it("returns 401 when blocked by access policy", async () => {
		const clientRecord = {
			account: "siteBlocked",
			settings: {
				frictionlessThreshold: 0.5,
				disallowWebView: false,
			},
		};
		tasksInstance.db.getClientRecord.mockResolvedValue(clientRecord);

		tasksInstance.frictionlessManager.decryptPayload.mockResolvedValue({
			baseBotScore: 0,
			timestamp: Date.now(),
			providerSelectEntropy: 0,
			userId: "u",
			userAgent: "844bc172f032bdd2d0baae3536c1d66c",
			webView: false,
			iFrame: false,
			decryptedHeadHash: "abc",
			decryptionFailed: false,
		});

		// Mock blocked policy
		tasksInstance.frictionlessManager.getPrioritisedAccessPolicies.mockResolvedValue(
			[
				{
					type: "block",
					captchaType: "image",
					solvedImagesCount: 2,
				},
			],
		);

		const body = {
			token: "tBlocked",
			headHash: "hhBlocked",
			dapp: "siteBlocked",
			user: "u",
		};
		const { req, res, next } = buildReqRes(body);

		// biome-ignore lint/suspicious/noExplicitAny: mock request
		await handler(req as any, res as any, next);

		// Check if next was called (which would indicate an error was thrown before success)
		if (next.mock.calls.length > 0) {
			console.error(
				"next called with:",
				JSON.stringify(next.mock.calls, null, 2),
			);
		}

		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({ error: "Unauthorized" }),
		);
		expect(
			tasksInstance.frictionlessManager.registerBlockedSession,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				siteKey: "siteBlocked",
				reason: FrictionlessReason.ACCESS_POLICY_BLOCK,
			}),
		);
	});

	describe("configured-captcha-type short-circuit", () => {
		it("calls sendImageCaptcha and skips the decision machine when settings.captchaType is image", async () => {
			tasksInstance.db.getClientRecord.mockResolvedValue({
				account: "siteImage",
				settings: {
					captchaType: CaptchaType.image,
					imageMaxRounds: 4,
					frictionlessThreshold: 0.5,
				},
			});

			const body = {
				token: "tImg",
				headHash: "hh",
				dapp: "siteImage",
				user: "u",
			};
			const { req, res, next } = buildReqRes(body);

			// biome-ignore lint/suspicious/noExplicitAny: mock request
			await handler(req as any, res as any, next);

			expect(next).not.toHaveBeenCalled();
			expect(
				tasksInstance.frictionlessManager.sendImageCaptcha,
			).toHaveBeenCalledWith(
				expect.objectContaining({
					token: "tImg",
					siteKey: "siteImage",
					solvedImagesCount: 4,
				}),
			);
			expect(
				tasksInstance.frictionlessManager.decryptPayload,
			).not.toHaveBeenCalled();
			expect(
				tasksInstance.frictionlessManager.sendPowCaptcha,
			).not.toHaveBeenCalled();
			expect(
				tasksInstance.frictionlessManager.sendPuzzleCaptcha,
			).not.toHaveBeenCalled();
		});

		it("calls sendPowCaptcha and skips the decision machine when settings.captchaType is pow", async () => {
			tasksInstance.db.getClientRecord.mockResolvedValue({
				account: "sitePow",
				settings: {
					captchaType: CaptchaType.pow,
					frictionlessThreshold: 0.5,
				},
			});

			const body = {
				token: "tPow",
				headHash: "hh",
				dapp: "sitePow",
				user: "u",
			};
			const { req, res, next } = buildReqRes(body);

			// biome-ignore lint/suspicious/noExplicitAny: mock request
			await handler(req as any, res as any, next);

			expect(next).not.toHaveBeenCalled();
			expect(
				tasksInstance.frictionlessManager.sendPowCaptcha,
			).toHaveBeenCalledWith(
				expect.objectContaining({
					token: "tPow",
					siteKey: "sitePow",
				}),
			);
			expect(
				tasksInstance.frictionlessManager.decryptPayload,
			).not.toHaveBeenCalled();
			expect(
				tasksInstance.frictionlessManager.sendImageCaptcha,
			).not.toHaveBeenCalled();
		});

		it("calls sendPuzzleCaptcha and skips the decision machine when settings.captchaType is puzzle", async () => {
			tasksInstance.db.getClientRecord.mockResolvedValue({
				account: "sitePuzzle",
				settings: {
					captchaType: CaptchaType.puzzle,
					frictionlessThreshold: 0.5,
				},
			});

			const body = {
				token: "tPuz",
				headHash: "hh",
				dapp: "sitePuzzle",
				user: "u",
			};
			const { req, res, next } = buildReqRes(body);

			// biome-ignore lint/suspicious/noExplicitAny: mock request
			await handler(req as any, res as any, next);

			expect(next).not.toHaveBeenCalled();
			expect(
				tasksInstance.frictionlessManager.sendPuzzleCaptcha,
			).toHaveBeenCalledWith(
				expect.objectContaining({
					token: "tPuz",
					siteKey: "sitePuzzle",
				}),
			);
			expect(
				tasksInstance.frictionlessManager.decryptPayload,
			).not.toHaveBeenCalled();
		});

		it("falls through to the decision machine when settings.captchaType is frictionless", async () => {
			tasksInstance.db.getClientRecord.mockResolvedValue({
				account: "siteFric",
				settings: {
					captchaType: CaptchaType.frictionless,
					imageMaxRounds: 5,
					frictionlessThreshold: 0.5,
					disallowWebView: false,
				},
			});

			tasksInstance.frictionlessManager.decryptPayload.mockResolvedValue({
				baseBotScore: 0,
				timestamp: Date.now(),
				providerSelectEntropy: 0,
				userId: "u",
				userAgent: "844bc172f032bdd2d0baae3536c1d66c",
				webView: false,
				iFrame: false,
				decryptedHeadHash: "abc",
				decryptionFailed: false,
			});

			const body = {
				token: "tFric",
				headHash: "hh",
				dapp: "siteFric",
				user: "u",
			};
			const { req, res, next } = buildReqRes(body);

			// biome-ignore lint/suspicious/noExplicitAny: mock request
			await handler(req as any, res as any, next);

			expect(next).not.toHaveBeenCalled();
			// Default decision when nothing else triggers is pow.
			expect(
				tasksInstance.frictionlessManager.decryptPayload,
			).toHaveBeenCalled();
			expect(
				tasksInstance.frictionlessManager.sendPowCaptcha,
			).toHaveBeenCalled();
			expect(
				tasksInstance.frictionlessManager.sendPuzzleCaptcha,
			).not.toHaveBeenCalled();
		});
	});
});
