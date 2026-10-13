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
import { handleErrors } from "@prosopo/api-express-router";
import { type LogRecord, type LogRecordFn, getLogger } from "@prosopo/logger";
import { ClientApiPaths } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import express, {
	type NextFunction,
	type Request,
	type RequestHandler,
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

vi.mock("../../../tasks/tasks.js", () => ({
	Tasks: vi.fn().mockImplementation(function (): object {
		return {};
	}),
}));

import submitPuzzleCaptchaSolution from "../../../api/captcha/submitPuzzleCaptchaSolution.js";
import {
	MAX_PREVIEW_CHARS,
	summariseRequestBody,
} from "../../../api/requestBodySummary.js";
import { prosopoVerifyRouter } from "../../../api/verify.js";

const SECRET = "SECRET_VALUE_THAT_MUST_NOT_BE_LOGGED";
const LOG_LINE_LIMIT = 8_000;

describe("summariseRequestBody", () => {
	it("redacts signature, token and secret fields at any depth", () => {
		const summary = summariseRequestBody({
			headers: {},
			body: {
				dapp: "site-key",
				token: SECRET,
				dappSignature: SECRET,
				secret: SECRET,
				signature: { user: { timestamp: SECRET } },
				nested: { procaptchaToken: SECRET, fingerprintProof: SECRET },
			},
		});
		expect(summary.preview).not.toContain(SECRET);
		expect(summary.preview).toContain("site-key");
		expect(summary.keys).toEqual([
			"dapp",
			"token",
			"dappSignature",
			"secret",
			"signature",
			"nested",
		]);
		expect(summary.keyCount).toBe(6);
	});

	it("bounds huge strings, arrays and key counts", () => {
		const body: Record<string, unknown> = {
			long: "x".repeat(900_000),
			events: Array.from({ length: 150_000 }, () => null),
			deep: { a: { b: { c: { d: SECRET } } } },
		};
		for (let i = 0; i < 1000; i++) {
			body[`k${i}`] = i;
		}
		const summary = summariseRequestBody({
			headers: { "content-length": "987654" },
			body,
		});
		expect(summary.bytes).toBe(987654);
		expect(summary.keyCount).toBe(1003);
		expect(summary.keys).toHaveLength(20);
		expect(summary.preview.length).toBeLessThanOrEqual(MAX_PREVIEW_CHARS);
		expect(summary.preview).toContain("(+899936 chars)");
		expect(summary.preview).toContain("(+149995 items)");
		expect(summary.preview).not.toContain(SECRET);
		expect(JSON.stringify(summary).length).toBeLessThan(2_000);
	});

	it("summarises non-object bodies", () => {
		expect(summariseRequestBody({ headers: {}, body: undefined })).toEqual({
			type: "undefined",
			preview: "",
		});
		expect(summariseRequestBody({ headers: {}, body: null })).toEqual({
			type: "null",
			preview: "null",
		});
		expect(
			summariseRequestBody({ headers: {}, body: ["a", 1, "b".repeat(100)] }),
		).toEqual({
			type: "array",
			preview: `["a",1,"${"b".repeat(64)}...(+36 chars)"]`,
		});
		expect(
			summariseRequestBody({
				headers: { "content-length": "not-a-number" },
				body: "text",
			}),
		).toEqual({ type: "string", preview: '"text"' });
	});
});

describe("parse-failure logs on client routes", () => {
	const records: LogRecord[] = [];
	const logger = getLogger("fatal", "requestBodySummary.test");
	const capture = (fn: LogRecordFn): void => {
		records.push(fn());
	};
	const i18n = i18next.createInstance();
	let baseUrl = "";
	let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;

	beforeAll(async () => {
		await i18n.init({ lng: "en", resources: {} });
		vi.spyOn(logger, "error").mockImplementation(capture);
		vi.spyOn(logger, "info").mockImplementation(capture);
		vi.spyOn(logger, "debug").mockImplementation(capture);
		vi.spyOn(logger, "warn").mockImplementation(capture);

		const env = { logger } as ProviderEnvironment;
		const app = express();
		app.use(express.json({ limit: "1mb" }));
		app.use((req: Request, _res: Response, next: NextFunction) => {
			req.i18n = { t: i18n.t };
			req.logger = logger;
			next();
		});
		const puzzle = submitPuzzleCaptchaSolution(env);
		const puzzleHandler: RequestHandler = (req, res, next) => {
			puzzle(req, res, next).catch(next);
		};
		app.post("/puzzle", puzzleHandler);
		app.use(prosopoVerifyRouter(env));
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

	beforeEach(() => {
		records.length = 0;
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

	const padding = "p".repeat(900_000);

	const cases: [string, string, object][] = [
		[
			"image verify",
			ClientApiPaths.VerifyImageCaptchaSolutionDapp,
			{ token: 1, dappSignature: SECRET, padding },
		],
		[
			"pow verify",
			ClientApiPaths.VerifyPowCaptchaSolution,
			{ token: 1, dappSignature: SECRET, padding },
		],
		[
			"puzzle submit",
			"/puzzle",
			{
				challenge: 1,
				signature: { user: { timestamp: SECRET } },
				padding,
			},
		],
	];

	for (const [name, path, body] of cases) {
		it(`${name}: logs a bounded, redacted body summary`, async () => {
			expect(await post(path, body)).toBe(400);
			expect(records.length).toBeGreaterThan(0);
			for (const record of records) {
				const line = JSON.stringify(record);
				expect(line.length).toBeLessThan(LOG_LINE_LIMIT);
				expect(line).not.toContain(SECRET);
			}
			expect(JSON.stringify(records)).toContain('"keys":[');
		});
	}
});
