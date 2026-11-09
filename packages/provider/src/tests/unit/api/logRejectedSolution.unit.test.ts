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
import { type LogRecord, type LogRecordFn, getLogger } from "@prosopo/logger";
import { ClientApiPaths, INPUT_LIMITS } from "@prosopo/types";
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
}));

vi.mock("../../../tasks/index.js", () => ({
	Tasks: vi.fn().mockImplementation(function (): object {
		return {};
	}),
}));

import { prosopoRouter } from "../../../api/captcha.js";

const USER = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";
const DAPP = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

const imageAnswer = (behavioralData: string): object => ({
	user: USER,
	dapp: DAPP,
	captchas: [],
	requestHash: "0x04",
	timestamp: "1700000000000",
	signature: { user: { timestamp: "0x01" }, provider: { requestHash: "0x02" } },
	behavioralData,
});

describe("rejected captcha solutions", () => {
	const infoRecords: LogRecord[] = [];
	const logger = getLogger("fatal", "logRejectedSolution.test");
	const i18n = i18next.createInstance();
	let baseUrl = "";
	let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;

	beforeAll(async () => {
		await i18n.init({ lng: "en", resources: {} });
		vi.spyOn(logger, "info").mockImplementation((fn: LogRecordFn): void => {
			infoRecords.push(fn());
		});

		const env = { logger } as ProviderEnvironment;
		const app = express();
		app.use(express.json({ limit: "1mb" }));
		app.use((req: Request, _res: Response, next: NextFunction) => {
			req.i18n = i18n;
			req.logger = logger;
			next();
		});
		app.use(prosopoRouter(env));
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
		infoRecords.length = 0;
	});

	const post = async (path: string, body: object): Promise<number> => {
		const res = await fetch(`${baseUrl}${path}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		});
		await res.text();
		return res.status;
	};

	const rejections = (): LogRecord[] =>
		infoRecords.filter((record) => record.msg === "Captcha solution rejected");

	it("logs the error site and field lengths at info", async () => {
		const oversized = "b".repeat(INPUT_LIMITS.BEHAVIOURAL_DATA + 1);
		expect(
			await post(
				ClientApiPaths.SubmitImageCaptchaSolution,
				imageAnswer(oversized),
			),
		).toBe(400);

		const [record] = rejections();
		const line = JSON.stringify(record);
		expect(line).toContain("INVALID_REQUEST:PROV-24");
		expect(line).toContain(`"behavioralData":${oversized.length}`);
		expect(line).not.toContain("b".repeat(100));
	});

	it("logs nothing for a route that is not a solution", async () => {
		expect(
			await post(ClientApiPaths.GetImageCaptchaChallenge, { user: 1 }),
		).toBe(400);
		expect(rejections()).toHaveLength(0);
	});
});
