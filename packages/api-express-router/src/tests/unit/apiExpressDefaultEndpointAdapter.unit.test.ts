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

import type { ApiEndpoint } from "@prosopo/api-route";
import { ProsopoApiError, ProsopoEnvError } from "@prosopo/common";
import { loadI18next } from "@prosopo/locale";
import type { Logger } from "@prosopo/logger";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import type { ZodType } from "zod";
import { ApiExpressDefaultEndpointAdapter } from "../../endpointAdapter/apiExpressDefaultEndpointAdapter.js";

describe("ApiExpressDefaultEndpointAdapter.handleRequest", async () => {
	const i18n = await loadI18next(true);
	await i18n.changeLanguage("en");

	const ERROR_STATUS_CODE = 500;

	const makeLogger = (): Logger =>
		({
			error: vi.fn(),
			info: vi.fn(),
			debug: vi.fn(),
			warn: vi.fn(),
		}) as unknown as Logger;

	const makeRequest = (): Request =>
		({ i18n, logger: makeLogger(), body: {} }) as unknown as Request;

	const makeResponse = (): Response =>
		({
			json: vi.fn().mockReturnThis(),
			status: vi.fn().mockReturnThis(),
			statusMessage: "",
		}) as unknown as Response;

	const makeEndpoint = (
		processRequest: () => Promise<unknown>,
	): ApiEndpoint<ZodType | undefined> =>
		({
			getRequestArgsSchema: () => undefined,
			processRequest,
		}) as unknown as ApiEndpoint<ZodType | undefined>;

	it("surfaces a ProsopoApiError's own code and JSON error envelope", async () => {
		const adapter = new ApiExpressDefaultEndpointAdapter(
			"info",
			ERROR_STATUS_CODE,
		);
		const error = new ProsopoApiError("CONTRACT.INVALID_DATA_FORMAT", {
			context: { code: 400 },
			i18n,
			silent: true,
		});
		const endpoint = makeEndpoint(() => Promise.reject(error));
		const response = makeResponse();

		await adapter.handleRequest(
			endpoint,
			makeRequest(),
			response,
			vi.fn() as unknown as NextFunction,
		);

		expect(response.status).toHaveBeenCalledWith(400);
		expect(response.json).toHaveBeenCalledWith({
			error: {
				code: 400,
				key: "CONTRACT.INVALID_DATA_FORMAT",
				message: "Invalid data format",
			},
		});
	});

	it("maps non-Prosopo errors to errorStatusCode with the API.UNKNOWN envelope", async () => {
		const adapter = new ApiExpressDefaultEndpointAdapter(
			"info",
			ERROR_STATUS_CODE,
		);
		const endpoint = makeEndpoint(() =>
			Promise.reject(new Error("boom from processRequest")),
		);
		const response = makeResponse();

		await adapter.handleRequest(
			endpoint,
			makeRequest(),
			response,
			vi.fn() as unknown as NextFunction,
		);

		expect(response.status).toHaveBeenCalledWith(ERROR_STATUS_CODE);
		expect(response.json).toHaveBeenCalledWith({
			error: {
				code: ERROR_STATUS_CODE,
				key: "API.UNKNOWN",
				message: i18n.t("API.UNKNOWN"),
			},
		});
	});

	it("maps a base error without a status code to errorStatusCode (does not leak a 400)", async () => {
		const adapter = new ApiExpressDefaultEndpointAdapter(
			"info",
			ERROR_STATUS_CODE,
		);
		const envError = new ProsopoEnvError("GENERAL.ENVIRONMENT_NOT_READY", {
			i18n,
			silent: true,
		});
		const endpoint = makeEndpoint(() => Promise.reject(envError));
		const response = makeResponse();

		await adapter.handleRequest(
			endpoint,
			makeRequest(),
			response,
			vi.fn() as unknown as NextFunction,
		);

		expect(response.status).toHaveBeenCalledWith(ERROR_STATUS_CODE);
		expect(response.json).toHaveBeenCalledWith({
			error: {
				code: ERROR_STATUS_CODE,
				key: "API.UNKNOWN",
				message: i18n.t("API.UNKNOWN"),
			},
		});
	});
});
