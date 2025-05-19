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
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import {
	DEFAULT_JA4,
	getJA4,
	ja4Middleware,
} from "../../../api/ja4Middleware.js";

describe("ja4Middleware", () => {
	it("should return default JA4 if an error occurs", async () => {
		const mockReq: {
			ja4?: string;
			logger?: {
				error: (message: string) => void;
			};
		} & Request = {
			headers: {},
			logger: {
				error: vi.fn(),
			},
		} as unknown as Request;

		const mockRes = {} as unknown as Response;
		const mockNext = vi.fn() as unknown as NextFunction;

		const ja4MiddlewareInstance = ja4Middleware({} as ProviderEnvironment);
		await ja4MiddlewareInstance(mockReq, mockRes, mockNext);

		expect(mockReq.ja4).toBe(DEFAULT_JA4);
	});
});

describe("getJA4", () => {
	it("should return default JA4 in development mode", async () => {
		const mockHeaders = {
			"x-tls-clienthello": "test",
			"x-tls-version": "test",
			"x-tls-server-name": "test",
		};

		const ja4 = await getJA4(mockHeaders);

		expect(ja4.ja4PlusFingerprint).toBe(DEFAULT_JA4);
	});

	it("should return the correct JA4 for a known ClientHello", async () => {
		const mockHeaders = {
			"x-tls-clienthello":
				"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",
			"x-tls-proto": "h2",
			"x-tls-proto-mutual": "true",
			"x-tls-public-key": "",
			"x-tls-public-key-sha256": "",
			"x-tls-resumed": "false",
			"x-tls-server-name": "pronode7.prosopo.io",
			"x-tls-version": "tls1.3",
		};
		const ja4 = await getJA4(mockHeaders);
		expect(ja4.ja4PlusFingerprint).toBe("t13d1516h2_8daaf6152771_8eba31f8906f");
	});
});
