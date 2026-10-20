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

import { ProsopoError } from "@prosopo/common";
import { type Logger, getLogger } from "@prosopo/logger";
import type { NextFunction } from "express";
import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { handleErrors } from "../../errorHandler.js";
import { type ErrorResponse, logUnhandledError } from "../../errorResponse.js";

const mockResponse = () => {
	const response = {
		status: vi.fn<ErrorResponse["status"]>(),
		json: vi.fn<ErrorResponse["json"]>(),
	};
	response.status.mockReturnValue(response);
	return response;
};

const spiedLogger = () => {
	const logger: Logger = getLogger("debug", "errorHandler.test");
	return {
		logger,
		error: vi.spyOn(logger, "error").mockImplementation(() => undefined),
		debug: vi.spyOn(logger, "debug").mockImplementation(() => undefined),
	};
};

const next: NextFunction = vi.fn();

describe("handleErrors", () => {
	it("sends a public error's code, message and errorId", () => {
		const response = mockResponse();
		const error = new ProsopoError({
			code: "SITE_KEY_INVALID",
			errorSite: "APIX-1",
			context: { siteKey: "secret" },
		});

		handleErrors(error, {}, response, next);

		expect(response.status).toHaveBeenCalledWith(400);
		expect(response.json).toHaveBeenCalledWith({
			error: {
				code: "SITE_KEY_INVALID",
				errorId: "SITE_KEY_INVALID:APIX-1",
				status: 400,
				message: "Invalid site key",
			},
		});
	});

	it("hides a non-public error behind the backend origin", () => {
		const response = mockResponse();
		const error = new ProsopoError({
			code: "UNEXPECTED",
			errorSite: "APIX-1",
			cause: new ProsopoError({
				code: "SERVICE_NOT_READY",
				errorSite: "APIX-2",
			}),
		});

		handleErrors(error, {}, response, next);

		expect(response.status).toHaveBeenCalledWith(500);
		expect(response.json).toHaveBeenCalledWith({
			error: {
				code: "BACKEND_ERROR",
				errorId: "BACKEND_ERROR:APIX-1",
				status: 500,
			},
		});
	});

	it("turns a SyntaxError into an invalid request", () => {
		const response = mockResponse();

		handleErrors(new SyntaxError("Unexpected token"), {}, response, next);

		expect(response.status).toHaveBeenCalledWith(400);
		expect(response.json).toHaveBeenCalledWith({
			error: {
				code: "INVALID_REQUEST",
				errorId: "INVALID_REQUEST:APIX-7",
				status: 400,
				message: "Invalid request",
			},
		});
	});

	it("reports a ZodError's issues as data", () => {
		const response = mockResponse();
		const issue = {
			code: "custom" as const,
			message: "Invalid input",
			path: ["some", "variable"],
		};

		handleErrors(new ZodError([issue]), {}, response, next);

		expect(response.status).toHaveBeenCalledWith(400);
		expect(response.json).toHaveBeenCalledWith({
			error: {
				code: "INVALID_REQUEST",
				errorId: "INVALID_REQUEST:APIX-7",
				status: 400,
				message: "Invalid request",
				data: { issueCount: 1, issues: [issue] },
			},
		});
	});

	it("never sends an unknown error's message", () => {
		const response = mockResponse();

		handleErrors(new Error("password=hunter2"), {}, response, next);

		expect(JSON.stringify(response.json.mock.calls)).not.toContain("hunter2");
		expect(response.status).toHaveBeenCalledWith(500);
	});

	it("logs through the request logger", () => {
		const response = mockResponse();
		const { logger, error } = spiedLogger();

		handleErrors(new Error("boom"), { logger }, response, next);

		expect(error).toHaveBeenCalledOnce();
	});
});

describe("logUnhandledError", () => {
	it("logs a 5xx error at error level with the errorId", () => {
		const { logger, error, debug } = spiedLogger();
		const err = new ProsopoError({ code: "UNEXPECTED", errorSite: "APIX-1" });

		logUnhandledError(logger, err);

		expect(debug).not.toHaveBeenCalled();
		const record = error.mock.calls[0]?.[0]?.();
		expect(record?.msg).toBe("UNEXPECTED:APIX-1");
	});

	it("logs a 4xx error at debug level", () => {
		const { logger, error, debug } = spiedLogger();

		logUnhandledError(
			logger,
			new ProsopoError({ code: "FORBIDDEN", errorSite: "APIX-1" }),
		);

		expect(error).not.toHaveBeenCalled();
		expect(debug).toHaveBeenCalledOnce();
	});

	it("tolerates a missing logger", () => {
		expect(() =>
			logUnhandledError(
				undefined,
				new ProsopoError({ code: "UNEXPECTED", errorSite: "APIX-1" }),
			),
		).not.toThrow();
	});
});
