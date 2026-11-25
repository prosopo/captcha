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
	ApiParams,
	ClientApiPaths,
	type ProcaptchaToken,
	Tier,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { u8aToHex } from "@prosopo/util";
import express, {
	type NextFunction,
	type Request,
	type Response,
} from "express";
import i18next from "i18next";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { CaptchaManager } from "../../../tasks/captchaManager.js";

const state = vi.hoisted(
	(): { alwaysPass: boolean; verified: boolean; tasks: unknown } => ({
		alwaysPass: false,
		verified: false,
		tasks: undefined,
	}),
);

vi.mock("../../../api/admin/apiToggleMaintenanceModeEndpoint.js", () => ({
	getMaintenanceMode: (): boolean => false,
	isSiteKeyInMaintenanceMode: (): boolean => false,
}));

vi.mock("../../../tasks/tasks.js", () => ({
	Tasks: vi.fn().mockImplementation(function (): unknown {
		return state.tasks;
	}),
}));

import { prosopoVerifyRouter } from "../../../api/verify.js";

const TIMESTAMP = "1700000000000";
const SCORE = 0.9;
const REASON = "CAPTCHA_INVALID_SOLUTION";

const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
let baseUrl = "";
let token: ProcaptchaToken = "0x";
let validSignature = "";
let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;

const logger = getLogger("fatal", "verifyAlwaysPass.test");
const i18n = i18next.createInstance();

const realVerdict = async (): Promise<{
	verified: boolean;
	score: number;
	reason: string;
	status: string;
	sessionId: string;
	commitmentId: string;
}> => ({
	verified: state.verified,
	score: SCORE,
	reason: REASON,
	status: REASON,
	sessionId: "session-1",
	commitmentId: "0x01",
});

const manager = (): {
	serverVerifyInteractiveCaptchaSolution: typeof realVerdict;
	getVerificationResponse: CaptchaManager["getVerificationResponse"];
} => ({
	serverVerifyInteractiveCaptchaSolution: realVerdict,
	getVerificationResponse: CaptchaManager.prototype.getVerificationResponse,
});

beforeAll(async () => {
	await i18n.init({ lng: "en", resources: {} });
	const dappPair = keyring.addFromUri("//Alice");
	const userPair = keyring.addFromUri("//Bob");
	validSignature = u8aToHex(dappPair.sign(TIMESTAMP));
	token = encodeProcaptchaOutput({
		dapp: dappPair.address,
		user: userPair.address,
		timestamp: TIMESTAMP,
		commitmentId: "0x01",
		challenge: "challenge",
		signature: { provider: {}, user: {} },
	});
	state.tasks = {
		db: {
			getClientRecord: async () => ({
				account: dappPair.address,
				tier: Tier.Professional,
				settings: { alwaysPass: state.alwaysPass },
			}),
		},
		imgCaptchaManager: {
			verifyImageCaptchaSolution: realVerdict,
			getVerificationResponse: CaptchaManager.prototype.getVerificationResponse,
		},
		powCaptchaManager: {
			serverVerifyPowCaptchaSolution: realVerdict,
			getVerificationResponse: CaptchaManager.prototype.getVerificationResponse,
		},
		puzzleCaptchaManager: manager(),
		iconOrderCaptchaManager: manager(),
		audioCaptchaManager: manager(),
	};

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

const verify = async (
	path: ClientApiPaths,
	{
		alwaysPass,
		verified,
		dappSignature = validSignature,
	}: { alwaysPass: boolean; verified: boolean; dappSignature?: string },
): Promise<{ status: number; body: Record<string, unknown> }> => {
	state.alwaysPass = alwaysPass;
	state.verified = verified;
	const res = await fetch(`${baseUrl}${path}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ token, dappSignature }),
	});
	return {
		status: res.status,
		body: (await res.json()) as Record<string, unknown>,
	};
};

const routes: [string, ClientApiPaths][] = [
	["image", ClientApiPaths.VerifyImageCaptchaSolutionDapp],
	["pow", ClientApiPaths.VerifyPowCaptchaSolution],
	["puzzle", ClientApiPaths.VerifyPuzzleCaptchaSolution],
	["iconOrder", ClientApiPaths.VerifyIconOrderCaptchaSolution],
	["audio", ClientApiPaths.VerifyAudioCaptchaSolution],
];

describe("verify routes on an alwaysPass site key", () => {
	for (const [name, path] of routes) {
		it(`${name}: a failed solve verifies, with no score or reason`, async () => {
			const failed = await verify(path, { alwaysPass: true, verified: false });
			const passed = await verify(path, { alwaysPass: true, verified: true });
			expect(failed.status).toBe(200);
			expect(failed.body[ApiParams.verified]).toBe(true);
			expect(failed.body).not.toHaveProperty(ApiParams.score);
			expect(failed.body).not.toHaveProperty(ApiParams.reason);
			expect(failed.body).toEqual(passed.body);
		});

		it(`${name}: the flag off returns the real verdict`, async () => {
			const failed = await verify(path, {
				alwaysPass: false,
				verified: false,
			});
			expect(failed.body[ApiParams.verified]).toBe(false);
			expect(failed.body[ApiParams.score]).toBe(SCORE);
		});

		it(`${name}: a bad dapp signature is still rejected`, async () => {
			const { status } = await verify(path, {
				alwaysPass: true,
				verified: true,
				dappSignature: `0x${"11".repeat(64)}`,
			});
			expect(status).toBe(400);
		});
	}
});
