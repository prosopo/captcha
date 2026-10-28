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
	ClientApiPaths,
	type ProcaptchaToken,
	type VerificationResponse,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import express, {
	type NextFunction,
	type Request,
	type Response,
} from "express";
import i18next from "i18next";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

vi.mock("../../../api/admin/apiToggleMaintenanceModeEndpoint.js", () => ({
	getMaintenanceMode: (): boolean => false,
	isSiteKeyInMaintenanceMode: (): boolean => false,
}));

type ServerVerifyResult = {
	verified: boolean;
	score?: number;
	sessionId?: string;
};

const serverVerifyPowCaptchaSolution = vi.fn(
	async (): Promise<ServerVerifyResult> => ({
		verified: true,
		score: 0.9,
		sessionId: "provider-session",
	}),
);
const verifyImageCaptchaSolution = vi.fn(
	async (
		..._args: unknown[]
	): Promise<ServerVerifyResult & { status: string }> => ({
		status: "ok",
		verified: true,
		sessionId: "provider-session",
	}),
);
const toVerificationResponse = (
	verified: boolean,
	_clientRecord: unknown,
	_t: unknown,
	score?: number,
	_reason?: string,
	sessionId?: string,
): VerificationResponse => ({
	status: "API.HUMAN",
	verified,
	...(score !== undefined && { score }),
	...(sessionId !== undefined && { sessionId }),
});

vi.mock("../../../tasks/tasks.js", () => ({
	Tasks: vi.fn().mockImplementation(function () {
		return {
			db: { getClientRecord: vi.fn(async () => ({ settings: {} })) },
			powCaptchaManager: {
				serverVerifyPowCaptchaSolution,
				getVerificationResponse: toVerificationResponse,
			},
			imgCaptchaManager: {
				verifyImageCaptchaSolution,
				getVerificationResponse: (
					verified: boolean,
					clientRecord: unknown,
					t: unknown,
					score?: number,
					_commitmentId?: string,
					_status?: string,
					sessionId?: string,
				): VerificationResponse =>
					toVerificationResponse(
						verified,
						clientRecord,
						t,
						score,
						undefined,
						sessionId,
					),
			},
		};
	}),
}));

import { prosopoVerifyRouter } from "../../../api/verify.js";

const SITE_SECRET = "//SiteVerifyDapp";
const OTHER_SECRET = "//SomeoneElse";
const TIMESTAMP = Date.now().toString();

const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
const sitePair = keyring.addFromUri(SITE_SECRET);
const userPair = keyring.addFromUri("//SiteVerifyUser");

const tokenFor = (
	dapp: string,
	captchaType: CaptchaType,
	challenge?: string,
): ProcaptchaToken =>
	encodeProcaptchaOutput({
		dapp,
		user: userPair.address,
		timestamp: TIMESTAMP,
		commitmentId: "0x01",
		challenge,
		captchaType,
		signature: { provider: {}, user: {} },
	});

let baseUrl = "";
let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;
const logger = getLogger("fatal", "siteVerify.test");
const i18n = i18next.createInstance();

beforeAll(async () => {
	await i18n.init({ lng: "en", resources: {} });
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
	await new Promise<void>((resolve) => {
		server = app.listen(0, "127.0.0.1", () => resolve());
	});
	const address = server?.address() as AddressInfo;
	baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
	await new Promise<void>((resolve) => server?.close(() => resolve()));
});

beforeEach(() => {
	serverVerifyPowCaptchaSolution.mockClear();
	verifyImageCaptchaSolution.mockClear();
});

const siteVerify = async (
	body: Record<string, unknown>,
): Promise<{ status: number; json: Partial<VerificationResponse> }> => {
	const res = await fetch(`${baseUrl}${ClientApiPaths.SiteVerify}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	return { status: res.status, json: await res.json() };
};

describe("siteverify", () => {
	it("verifies a PoW token with the site's secret and hides the provider session id", async () => {
		const { status, json } = await siteVerify({
			token: tokenFor(sitePair.address, CaptchaType.pow, "challenge"),
			secret: SITE_SECRET,
		});
		expect(status).toBe(200);
		expect(json).toEqual({ status: "ok", verified: true, score: 0.9 });
		expect(serverVerifyPowCaptchaSolution).toHaveBeenCalledTimes(1);
	});

	it("routes an image token to the image verify route with the caller's cached timeout", async () => {
		const { status, json } = await siteVerify({
			token: tokenFor(sitePair.address, CaptchaType.image),
			secret: SITE_SECRET,
			timeouts: { image: { cachedTimeout: 12345 } },
		});
		expect(status).toBe(200);
		expect(json).toEqual({ status: "ok", verified: true });
		expect(verifyImageCaptchaSolution).toHaveBeenCalledTimes(1);
		expect(verifyImageCaptchaSolution.mock.calls[0]?.[4]).toBe(12345);
	});

	it("accepts the legacy //1 derivation of the site's secret", async () => {
		const { status, json } = await siteVerify({
			token: tokenFor(sitePair.address, CaptchaType.pow, "challenge"),
			secret: `${SITE_SECRET}//1`,
		});
		expect(status).toBe(200);
		expect(json.verified).toBe(true);
	});

	it("rejects a secret that does not belong to the token's site key", async () => {
		const { status, json } = await siteVerify({
			token: tokenFor(sitePair.address, CaptchaType.pow, "challenge"),
			secret: OTHER_SECRET,
		});
		expect(status).toBe(400);
		expect(json.error?.errorId).toBe("SITE_KEY_INVALID:PROV-97");
		expect(serverVerifyPowCaptchaSolution).not.toHaveBeenCalled();
	});

	it("rejects a secret that is not a key at all", async () => {
		const { status } = await siteVerify({
			token: tokenFor(sitePair.address, CaptchaType.pow, "challenge"),
			secret: "not a secret",
		});
		expect(status).toBe(400);
	});

	it("rejects a request with no secret", async () => {
		const { status, json } = await siteVerify({
			token: tokenFor(sitePair.address, CaptchaType.pow, "challenge"),
		});
		expect(status).toBe(400);
		expect(json.error?.errorId).toBe("INVALID_REQUEST:PROV-96");
	});

	it("answers an undecodable token as not verified", async () => {
		const { status, json } = await siteVerify({
			token: "0xnotatoken",
			secret: SITE_SECRET,
		});
		expect(status).toBe(200);
		expect(json).toEqual({ status: "ok", verified: false });
	});

	it("forces the verdict for reserved test site keys without a secret", async () => {
		const pass = await siteVerify({
			token: tokenFor(ALWAYS_PASS_SITE_KEY, CaptchaType.pow, "challenge"),
		});
		const fail = await siteVerify({
			token: tokenFor(ALWAYS_FAIL_SITE_KEY, CaptchaType.pow, "challenge"),
		});
		expect(pass.json).toEqual({ status: "ok", verified: true });
		expect(fail.json).toEqual({ status: "ok", verified: false });
	});
});
