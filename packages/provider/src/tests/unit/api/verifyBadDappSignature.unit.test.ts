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
// WITHOUT WARRANTIES OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { AddressInfo } from "node:net";
import { Keyring } from "@prosopo/keyring";
import { getLogger } from "@prosopo/logger";
import {
	ClientApiPaths,
	type ProcaptchaToken,
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

vi.mock("../../../api/admin/apiToggleMaintenanceModeEndpoint.js", () => ({
	getMaintenanceMode: (): boolean => false,
}));

// Only the client-record lookup is stubbed: anything the handlers reach after
// the signature check is missing, so getting past it surfaces as a 500.
vi.mock("../../../tasks/tasks.js", () => ({
	Tasks: vi.fn().mockImplementation(function () {
		return {
			db: {
				getClientRecord: vi.fn(async () => ({ settings: {} })),
			},
		};
	}),
}));

import { prosopoVerifyRouter } from "../../../api/verify.js";

const TIMESTAMP = "1700000000000";

const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
let baseUrl = "";
let token: ProcaptchaToken = "0x";
let validSignature = "";
let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;

const logger = getLogger("fatal", "verifyBadDappSignature.test");
const i18n = i18next.createInstance();

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

	const env: Pick<ProviderEnvironment, "keyring" | "logger"> = {
		keyring,
		logger,
	};
	const app = express();
	app.use(express.json());
	app.use((req: Request, _res: Response, next: NextFunction) => {
		req.i18n = { t: i18n.t };
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

const post = async (
	path: ClientApiPaths,
	dappSignature: string,
): Promise<number> => {
	const res = await fetch(`${baseUrl}${path}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ token, dappSignature }),
	});
	await res.text();
	return res.status;
};

const routes: [string, ClientApiPaths][] = [
	["image", ClientApiPaths.VerifyImageCaptchaSolutionDapp],
	["pow", ClientApiPaths.VerifyPowCaptchaSolution],
	["puzzle", ClientApiPaths.VerifyPuzzleCaptchaSolution],
	["authenticated", ClientApiPaths.VerifyAuthenticatedSession],
];

const badSignatures: [string, () => string][] = [
	["not hex", () => "0xzz"],
	["wrong length", () => "0x00"],
	["valid shape, wrong key", () => `0x${"11".repeat(64)}`],
	["signature over another message", () => `${validSignature.slice(0, -2)}00`],
];

describe("verify routes reject a bad dapp signature as a client error", () => {
	for (const [name, path] of routes) {
		for (const [label, signature] of badSignatures) {
			it(`${name}: ${label} -> 400`, async () => {
				expect(await post(path, signature())).toBe(400);
			});
		}

		it(`${name}: a valid signature still reaches the verify step`, async () => {
			// The stubbed Tasks has no captcha managers, so reaching the step
			// after the signature check is a genuine server fault: still 500.
			expect(await post(path, validSignature)).toBe(500);
		});
	}
});
