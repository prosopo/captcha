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

import type { AddressInfo } from "node:net";
import { Keyring } from "@prosopo/keyring";
import { getLogger } from "@prosopo/logger";
import {
	ALWAYS_FAIL_SITE_KEY,
	ALWAYS_PASS_SITE_KEY,
	CaptchaType,
	type ProcaptchaToken,
	type VerificationResponse,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import express, {
	type Express,
	type NextFunction,
	type Request,
	type Response,
} from "express";
import i18next from "i18next";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from "vitest";

vi.mock("../../../api/admin/apiToggleMaintenanceModeEndpoint.js", () => ({
	getMaintenanceMode: (): boolean => false,
	isSiteKeyInMaintenanceMode: (): boolean => false,
}));

type ServerVerifyArgs = {
	dappAccount: string;
	challenge: string;
	ip?: string;
	email?: string;
	clientSessionId?: string;
};

type ImageVerifyArgs = {
	dappAccount: string;
	commitmentId: string;
	maxVerifiedTime?: number;
	ip?: string;
};

type VerifyOutcome = { verified: boolean; score?: number };

// What the per-type routes send: a translated status and the provider's own
// session id, neither of which siteverify passes on.
const internalResponse = ({
	verified,
	score,
}: VerifyOutcome): VerificationResponse => ({
	status: verified ? "User verified" : "User not verified",
	verified,
	...(score !== undefined && { score }),
	sessionId: "provider-session",
});

const powVerify = vi.fn<(args: ServerVerifyArgs) => Promise<VerifyOutcome>>();
const puzzleVerify =
	vi.fn<(args: ServerVerifyArgs) => Promise<VerifyOutcome>>();
const imageVerify = vi.fn<(args: ImageVerifyArgs) => Promise<VerifyOutcome>>();

vi.mock("../../../tasks/tasks.js", () => ({
	Tasks: vi.fn().mockImplementation(function () {
		return {
			db: {
				getClientRecord: vi.fn(async () => ({ settings: {} })),
			},
			powCaptchaManager: {
				serverVerifyPowCaptchaSolution: powVerify,
				getVerificationResponse: internalResponse,
			},
			puzzleCaptchaManager: {
				serverVerifyInteractiveCaptchaSolution: puzzleVerify,
				getVerificationResponse: internalResponse,
			},
			imgCaptchaManager: {
				verifyImageCaptchaSolution: imageVerify,
				getVerificationResponse: internalResponse,
			},
		};
	}),
}));

import {
	SITEVERIFY_DEADLINE_MS,
	siteverifyRateLimit,
} from "../../../api/siteverify.js";
import { prosopoVerifyRouter } from "../../../api/verify.js";

const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
const SITE_SECRET = "//Alice";
const OTHER_SECRET = "//Charlie";
const sitePair = keyring.addFromUri(SITE_SECRET);
const userPair = keyring.addFromUri("//Bob");

const logger = getLogger("fatal", "siteverify.test");
const i18n = i18next.createInstance();

type Running = {
	baseUrl: string;
	close: () => Promise<void>;
};

const listen = async (app: Express): Promise<Running> => {
	const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
		const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
	});
	const address = server.address() as AddressInfo;
	return {
		baseUrl: `http://127.0.0.1:${address.port}`,
		close: () => new Promise<void>((resolve) => server.close(() => resolve())),
	};
};

const start = async (siteverifyEnabled: boolean): Promise<Running> => {
	vi.stubEnv("PROSOPO_SITEVERIFY_ENABLED", siteverifyEnabled ? "1" : "");
	const env: Pick<ProviderEnvironment, "keyring" | "logger"> = {
		keyring,
		logger,
	};
	const app = express();
	app.use(express.json());
	app.use((req: Request, _res: Response, next: NextFunction) => {
		req.i18n = i18n;
		req.logger = logger;
		next();
	});
	app.use(prosopoVerifyRouter(env as ProviderEnvironment));
	vi.unstubAllEnvs();
	return listen(app);
};

const makeToken = ({
	dapp = sitePair.address,
	captchaType,
	timestamp = Date.now(),
	challenge = "challenge",
	commitmentId,
}: {
	dapp?: string;
	captchaType?: CaptchaType;
	timestamp?: number;
	challenge?: string;
	commitmentId?: string;
}): ProcaptchaToken =>
	encodeProcaptchaOutput({
		dapp,
		user: userPair.address,
		timestamp: timestamp.toString(),
		challenge,
		commitmentId,
		captchaType,
		signature: { provider: {}, user: {} },
	});

type SiteverifyBody = {
	verified?: boolean;
	status?: string;
	score?: number;
	error?: { code?: string; errorId?: string };
};

type SiteverifyResult = { status: number; body: SiteverifyBody };

const postJson = async (
	baseUrl: string,
	body: Record<string, unknown>,
): Promise<SiteverifyResult> => {
	const res = await fetch(`${baseUrl}/siteverify`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	return { status: res.status, body: await res.json() };
};

const postForm = async (
	baseUrl: string,
	body: Record<string, string>,
): Promise<SiteverifyResult> => {
	const res = await fetch(`${baseUrl}/siteverify`, {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams(body).toString(),
	});
	return { status: res.status, body: await res.json() };
};

let enabled: Running;
let disabled: Running;

beforeAll(async () => {
	await i18n.init({ lng: "en", resources: {} });
	enabled = await start(true);
	disabled = await start(false);
});

afterAll(async () => {
	await enabled.close();
	await disabled.close();
});

afterEach(() => {
	powVerify.mockReset();
	puzzleVerify.mockReset();
	imageVerify.mockReset();
});

describe("POST /siteverify", () => {
	it("is not served unless PROSOPO_SITEVERIFY_ENABLED=1", async () => {
		const res = await fetch(`${disabled.baseUrl}/siteverify`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				token: makeToken({ captchaType: CaptchaType.pow }),
				secret: SITE_SECRET,
			}),
		});
		expect(res.status).toBe(404);
	});

	it("rejects a request without a secret", async () => {
		const { status, body } = await postJson(enabled.baseUrl, {
			token: makeToken({ captchaType: CaptchaType.pow }),
		});
		expect(status).toBe(400);
		expect(body.error?.errorId).toBe("INVALID_REQUEST:PROV-100");
	});

	it("rejects a request without a token", async () => {
		const { status, body } = await postJson(enabled.baseUrl, {
			secret: SITE_SECRET,
		});
		expect(status).toBe(400);
		expect(body.error?.errorId).toBe("INVALID_REQUEST:PROV-99");
	});

	it("answers an unreadable token as not verified, as the hosted API does", async () => {
		const { status, body } = await postJson(enabled.baseUrl, {
			token: "0xnot-a-token",
			secret: SITE_SECRET,
		});
		expect(status).toBe(200);
		expect(body).toEqual({ status: "ok", verified: false });
	});

	it("rejects a secret that is not a key", async () => {
		const { status, body } = await postJson(enabled.baseUrl, {
			token: makeToken({ captchaType: CaptchaType.pow }),
			secret: "not a secret",
		});
		expect(status).toBe(400);
		expect(body.error?.errorId).toBe("SITE_KEY_INVALID:PROV-101");
	});

	it("rejects the secret of a different site key", async () => {
		const { status, body } = await postJson(enabled.baseUrl, {
			token: makeToken({ captchaType: CaptchaType.pow }),
			secret: OTHER_SECRET,
		});
		expect(status).toBe(400);
		expect(body.error?.errorId).toBe("SITE_KEY_INVALID:PROV-101");
		expect(powVerify).not.toHaveBeenCalled();
	});

	it("verifies a pow token and answers with the hosted response fields only", async () => {
		powVerify.mockResolvedValue({ verified: true, score: 0.9 });
		const { status, body } = await postJson(enabled.baseUrl, {
			token: makeToken({ captchaType: CaptchaType.pow }),
			secret: SITE_SECRET,
			ip: "203.0.113.7",
			email: "user@example.com",
			clientSessionId: "session-1",
		});
		expect(status).toBe(200);
		expect(body).toEqual({ status: "ok", verified: true, score: 0.9 });
		expect(powVerify).toHaveBeenCalledWith(
			expect.objectContaining({
				dappAccount: sitePair.address,
				challenge: "challenge",
				ip: "203.0.113.7",
				email: "user@example.com",
				clientSessionId: "session-1",
			}),
		);
	});

	it("accepts the legacy //1 derivation of the site's secret", async () => {
		powVerify.mockResolvedValue({ verified: true });
		const { status, body } = await postJson(enabled.baseUrl, {
			token: makeToken({ captchaType: CaptchaType.pow }),
			secret: `${SITE_SECRET}//1`,
		});
		expect(status).toBe(200);
		expect(body.verified).toBe(true);
	});

	it("accepts a form-encoded body", async () => {
		powVerify.mockResolvedValue({ verified: false });
		const { status, body } = await postForm(enabled.baseUrl, {
			token: makeToken({ captchaType: CaptchaType.pow }),
			secret: SITE_SECRET,
		});
		expect(status).toBe(200);
		expect(body).toEqual({ status: "ok", verified: false });
		expect(powVerify).toHaveBeenCalledOnce();
	});

	it("forces the verdict for reserved test site keys without a secret", async () => {
		const pass = await postJson(enabled.baseUrl, {
			token: makeToken({
				dapp: ALWAYS_PASS_SITE_KEY,
				captchaType: CaptchaType.pow,
			}),
		});
		const fail = await postJson(enabled.baseUrl, {
			token: makeToken({
				dapp: ALWAYS_FAIL_SITE_KEY,
				captchaType: CaptchaType.pow,
			}),
		});
		expect(pass.body).toEqual({ status: "ok", verified: true });
		expect(fail.body).toEqual({ status: "ok", verified: false });
		expect(powVerify).not.toHaveBeenCalled();
	});

	it("dispatches a puzzle token to the puzzle verify route", async () => {
		puzzleVerify.mockResolvedValue({ verified: true });
		const { body } = await postJson(enabled.baseUrl, {
			token: makeToken({ captchaType: CaptchaType.puzzle }),
			secret: SITE_SECRET,
		});
		expect(body.verified).toBe(true);
		expect(puzzleVerify).toHaveBeenCalledOnce();
		expect(powVerify).not.toHaveBeenCalled();
	});

	it("dispatches an image token with the caller's image cache timeout", async () => {
		imageVerify.mockResolvedValue({ verified: true });
		const { body } = await postJson(enabled.baseUrl, {
			token: makeToken({
				captchaType: CaptchaType.image,
				challenge: "",
				commitmentId: "0x01",
			}),
			secret: SITE_SECRET,
			timeouts: { image: { cachedTimeout: 123_456 } },
		});
		expect(body.verified).toBe(true);
		expect(imageVerify).toHaveBeenCalledWith(
			expect.objectContaining({
				dappAccount: sitePair.address,
				commitmentId: "0x01",
				maxVerifiedTime: 123_456,
			}),
		);
	});

	it("does not verify an expired token", async () => {
		const { status, body } = await postJson(enabled.baseUrl, {
			token: makeToken({
				captchaType: CaptchaType.pow,
				timestamp: Date.now() - 24 * 60 * 60 * 1000,
			}),
			secret: SITE_SECRET,
		});
		expect(status).toBe(200);
		expect(body).toEqual({ status: "ok", verified: false });
		expect(powVerify).not.toHaveBeenCalled();
	});

	it(
		"answers verified when verification outlasts the deadline, as the hosted API does",
		async () => {
			let finish: (outcome: VerifyOutcome) => void = () => {};
			powVerify.mockImplementationOnce(
				() =>
					new Promise<VerifyOutcome>((resolve) => {
						finish = resolve;
					}),
			);
			const startedAt = Date.now();
			const { status, body } = await postJson(enabled.baseUrl, {
				token: makeToken({ captchaType: CaptchaType.pow }),
				secret: SITE_SECRET,
			});
			expect(Date.now() - startedAt).toBeGreaterThanOrEqual(
				SITEVERIFY_DEADLINE_MS - 50,
			);
			expect(status).toBe(200);
			expect(body).toEqual({
				status: "ok",
				verified: true,
				score: 0.5,
				timedOut: true,
			});
			finish({ verified: false });
		},
		SITEVERIFY_DEADLINE_MS + 5000,
	);
});

describe("siteverify rate limit", () => {
	it("limits per authenticated site key, otherwise per caller IP", async () => {
		vi.stubEnv("PROSOPO_SITE_VERIFY_LIMIT", "1");
		const app = express();
		app.use(express.json());
		app.use(siteverifyRateLimit(logger));
		app.post("/siteverify", (_req: Request, res: Response) => {
			res.json({ ok: true });
		});
		vi.unstubAllEnvs();
		const running = await listen(app);
		const token = makeToken({ captchaType: CaptchaType.pow });
		const call = async (
			secret: string,
			post: typeof postForm = postJson,
		): Promise<number> =>
			(await post(running.baseUrl, { token, secret })).status;
		const spoof = async (): Promise<number> => {
			const res = await fetch(`${running.baseUrl}/siteverify`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					"prosopo-site-key": sitePair.address,
				},
				body: JSON.stringify({ token, secret: OTHER_SECRET }),
			});
			await res.text();
			return res.status;
		};
		try {
			expect(await spoof()).toBe(200);
			expect(await spoof()).toBe(429);
			expect(await call(SITE_SECRET, postForm)).toBe(200);
			expect(await call(SITE_SECRET)).toBe(429);
		} finally {
			await running.close();
		}
	});
});
