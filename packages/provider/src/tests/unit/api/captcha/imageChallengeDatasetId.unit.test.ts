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
import { handleErrors } from "@prosopo/api-express-router";
import { ProsopoDBError } from "@prosopo/common";
import { getLogger } from "@prosopo/logger";
import { ClientApiPaths } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import express, {
	type NextFunction,
	type Request,
	type Response,
} from "express";
import i18next from "i18next";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../../../api/admin/apiToggleMaintenanceModeEndpoint.js", () => ({
	getMaintenanceMode: (): boolean => false,
}));

// Any request that gets past validation hits a DB fault on its first lookup,
// so reaching the handler's DB work surfaces as a 500.
vi.mock("../../../../tasks/index.js", () => ({
	Tasks: vi.fn().mockImplementation(function () {
		return {
			db: {
				getClientRecord: vi.fn(async () => {
					throw new ProsopoDBError("DATABASE.DATASET_GET_FAILED");
				}),
			},
		};
	}),
}));

import getImageCaptchaChallenge from "../../../../api/captcha/getImageCaptchaChallenge.js";

const DAPP = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const USER = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

const logger = getLogger("fatal", "imageChallengeDatasetId.test");
const i18n = i18next.createInstance();
let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;
let baseUrl = "";

beforeAll(async () => {
	await i18n.init({ lng: "en", resources: {} });
	const env: Pick<ProviderEnvironment, "logger"> = { logger };
	const accessRules: Partial<AccessRulesStorage> = {};
	const app = express();
	app.use(express.json());
	app.use((req: Request, _res: Response, next: NextFunction) => {
		req.i18n = { t: i18n.t };
		req.logger = logger;
		next();
	});
	const handler = getImageCaptchaChallenge(
		env as ProviderEnvironment,
		accessRules as AccessRulesStorage,
	);
	app.post(
		ClientApiPaths.GetImageCaptchaChallenge,
		(req: Request, res: Response, next: NextFunction) => {
			handler(req, res, next).catch(next);
		},
	);
	app.use(handleErrors);
	await new Promise<void>((resolve) => {
		server = app.listen(0, "127.0.0.1", () => resolve());
	});
	const address = server?.address() as AddressInfo;
	baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
	await new Promise<void>((resolve) => server?.close(() => resolve()));
});

const requestChallenge = async (datasetId: unknown): Promise<number> => {
	const res = await fetch(
		`${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`,
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ user: USER, dapp: DAPP, datasetId }),
		},
	);
	await res.text();
	return res.status;
};

describe("image challenge rejects a malformed client datasetId", () => {
	const malformed: [string, unknown][] = [
		["a non-hex string", "abc"],
		["an empty string", ""],
		["a byte array", [1, 2, 3]],
		["a large number array", Array.from({ length: 10000 }, () => 1)],
	];

	for (const [label, datasetId] of malformed) {
		it(`${label} -> 400`, async () => {
			expect(await requestChallenge(datasetId)).toBe(400);
		});
	}

	it("a hex datasetId still reaches the dataset lookup", async () => {
		expect(await requestChallenge("0x1234")).toBe(500);
	});
});
