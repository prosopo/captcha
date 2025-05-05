// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { ProsopoApiError, ProsopoEnvError } from "@prosopo/common";
import { loadI18next } from "@prosopo/locale";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { handleErrors } from "../../errorHandler.js";

describe("handleErrors", async () => {
	const i18n = await loadI18next(true);
	await i18n.changeLanguage("en");

	it("should handle ProsopoApiError", async () => {
		const mockRequest = { i18n } as unknown as Request;
		const mockResponse = {
			writeHead: vi.fn().mockReturnThis(),
			set: vi.fn().mockReturnThis(),
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
			end: vi.fn(),
		} as unknown as Response;
		const mockNext = vi.fn() as unknown as NextFunction;

		const error = new ProsopoApiError("CONTRACT.INVALID_DATA_FORMAT", {
			context: { code: 400 },
			i18n,
		});
		console.log(error);

		handleErrors(error, mockRequest, mockResponse, mockNext);

		expect(mockResponse.set).toHaveBeenCalledWith(
			"content-type",
			"application/json",
		);
		expect(mockResponse.send).toHaveBeenCalledWith({
			error: {
				code: 400,
				key: "CONTRACT.INVALID_DATA_FORMAT",
				message: "Invalid data format",
			},
		});
		expect(mockResponse.status).toHaveBeenCalledWith(400);
		expect(mockResponse.end).toHaveBeenCalled();
	});

	it("should handle SyntaxError", async () => {
		const mockRequest = { i18n } as unknown as Request;
		const mockResponse = {
			writeHead: vi.fn().mockReturnThis(),
			set: vi.fn().mockReturnThis(),
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
			end: vi.fn(),
		} as unknown as Response;
		const mockNext = vi.fn() as unknown as NextFunction;

		const [len, max] = [100, 50];
		const message = `Input length: ${len}, exceeds maximum allowed length: ${max}`;
		const error = new SyntaxError(message);

		handleErrors(error, mockRequest, mockResponse, mockNext);

		expect(mockResponse.set).toHaveBeenCalledWith(
			"content-type",
			"application/json",
		);
		expect(mockResponse.status).toHaveBeenCalledWith(400);
		expect(mockResponse.send).toHaveBeenCalledWith({
			error: {
				message,
				code: 400,
			},
		});
		expect(mockResponse.end).toHaveBeenCalled();
	});

	it("should handle ZodError", () => {
		const mockRequest = { i18n } as unknown as Request;
		const mockResponse = {
			writeHead: vi.fn().mockReturnThis(),
			set: vi.fn().mockReturnThis(),
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
			end: vi.fn(),
		} as unknown as Response;
		const mockNext = vi.fn() as unknown as NextFunction;

		const zodError = {
			code: "custom" as const,
			message: "Invalid input",
			path: ["some", "variable"],
		};
		const error = new ZodError([zodError]);

		handleErrors(error, mockRequest, mockResponse, mockNext);

		expect(mockResponse.set).toHaveBeenCalledWith(
			"content-type",
			"application/json",
		);
		expect(mockResponse.status).toHaveBeenCalledWith(400);
		expect(mockResponse.send).toHaveBeenCalledWith({
			error: { code: 400, message: [zodError] },
		});
		expect(mockResponse.end).toHaveBeenCalled();
	});

	it("should unwrap nested ProsopoBaseError", async () => {
		const mockRequest = { i18n } as unknown as Request;
		const mockResponse = {
			writeHead: vi.fn().mockReturnThis(),
			set: vi.fn().mockReturnThis(),
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
			end: vi.fn(),
		} as unknown as Response;
		const mockNext = vi.fn() as unknown as NextFunction;

		const envError = new ProsopoEnvError("GENERAL.ENVIRONMENT_NOT_READY", {
			i18n,
		});
		const apiError = new ProsopoApiError(envError);

		handleErrors(apiError, mockRequest, mockResponse, mockNext);

		expect(mockResponse.set).toHaveBeenCalledWith(
			"content-type",
			"application/json",
		);
		expect(mockResponse.status).toHaveBeenCalledWith(500);
		expect(mockResponse.send).toHaveBeenCalledWith({
			error: {
				code: 500,
				key: "GENERAL.ENVIRONMENT_NOT_READY",
				message: "Environment not ready",
			},
		});
		expect(mockResponse.end).toHaveBeenCalled();
	});

	it("should unwrap nested ProsopoBaseErrors but not an Error that is nested inside them", async () => {
		const mockRequest = { i18n } as unknown as Request;
		const mockResponse = {
			writeHead: vi.fn().mockReturnThis(),
			set: vi.fn().mockReturnThis(),
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
			end: vi.fn(),
		} as unknown as Response;
		const mockNext = vi.fn() as unknown as NextFunction;
		const code = 400;
		const key = "API.UNKNOWN";

		const error = new Error("Some error");
		const apiError = new ProsopoApiError(key, {
			context: { code, error },
			i18n,
		});

		handleErrors(apiError, mockRequest, mockResponse, mockNext);

		expect(mockResponse.set).toHaveBeenCalledWith(
			"content-type",
			"application/json",
		);
		expect(mockResponse.status).toHaveBeenCalledWith(code);
		expect(mockResponse.send).toHaveBeenCalledWith({
			error: {
				code,
				key,
				message: "Unknown API error",
			},
		});
		expect(mockResponse.end).toHaveBeenCalled();
	});
});
