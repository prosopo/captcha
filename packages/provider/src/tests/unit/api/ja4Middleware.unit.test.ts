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

import type { IncomingHttpHeaders } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_JA4, getJA4 } from "../../../api/ja4Middleware.js";

vi.mock("@prosopo/util-crypto", () => ({
	randomAsHex: vi.fn().mockReturnValue("0123456789abcdef0123456789abcdef"),
}));

vi.mock("read-tls-client-hello", () => ({
	calculateJa4FromHelloData: vi.fn().mockReturnValue("ja4+1234567890abcdef"),
	readTlsClientHello: vi.fn().mockResolvedValue({}),
}));

describe("getJA4", () => {
	it("should return default JA4 in development mode", async () => {
		const originalNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "development";

		const headers = {} as IncomingHttpHeaders;
		const result = await getJA4(headers);

		expect(result.ja4PlusFingerprint).toMatch(/^ja4[0-9a-f]{4}$/);
		expect(result.ja4PlusFingerprint.startsWith(DEFAULT_JA4)).toBe(true);

		process.env.NODE_ENV = originalNodeEnv;
	});

	it("should return default JA4 when headers are invalid", async () => {
		// Ensure we're not in development mode
		const originalNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";

		const headers = {} as IncomingHttpHeaders;
		const result = await getJA4(headers);

		expect(result.ja4PlusFingerprint).toBe(DEFAULT_JA4);

		process.env.NODE_ENV = originalNodeEnv;
	});

	it("should return default JA4 when x-tls-clienthello is empty", async () => {
		const headers = {
			"x-tls-clienthello": "",
		} as IncomingHttpHeaders;

		const result = await getJA4(headers);

		expect(result.ja4PlusFingerprint).toBe(DEFAULT_JA4);
	});

	it("should return default JA4 when x-tls-clienthello is not base64", async () => {
		const headers = {
			"x-tls-clienthello": "not-base64!",
		} as IncomingHttpHeaders;

		const result = await getJA4(headers);

		expect(result.ja4PlusFingerprint).toBe(DEFAULT_JA4);
	});

	it("should return default JA4 when ClientHello first byte is not 0x01", async () => {
		// Create a buffer where the 6th byte (index 5) is not 0x01
		const invalidClientHello = Buffer.alloc(10);
		invalidClientHello[5] = 0x02; // Not 0x01

		const headers = {
			"x-tls-clienthello": invalidClientHello.toString("base64"),
		} as IncomingHttpHeaders;

		const result = await getJA4(headers);

		expect(result.ja4PlusFingerprint).toBe(DEFAULT_JA4);
	});

	it("should successfully parse valid ClientHello", async () => {
		// Create a buffer where the 6th byte (index 5) is 0x01
		const validClientHello = Buffer.alloc(10);
		validClientHello[5] = 0x01; // Valid first byte

		const headers = {
			"x-tls-clienthello": validClientHello.toString("base64"),
		} as IncomingHttpHeaders;

		const result = await getJA4(headers);

		expect(result.ja4PlusFingerprint).toBe("ja4+1234567890abcdef");
	});

	it("should handle x-tls-version header", async () => {
		const validClientHello = Buffer.alloc(10);
		validClientHello[5] = 0x01;

		const headers = {
			"x-tls-clienthello": validClientHello.toString("base64"),
			"x-tls-version": "TLS1.2",
		} as IncomingHttpHeaders;

		const result = await getJA4(headers);

		expect(result.ja4PlusFingerprint).toBe("ja4+1234567890abcdef");
	});

	it("should handle case insensitive x-tls-version", async () => {
		// Ensure we're not in development mode
		const originalNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";

		const validClientHello = Buffer.alloc(10);
		validClientHello[5] = 0x01;

		const headers = {
			"x-tls-clienthello": validClientHello.toString("base64"),
			"x-tls-version": "tls1.3",
		} as IncomingHttpHeaders;

		const result = await getJA4(headers);

		expect(result.ja4PlusFingerprint).toBe("ja4+1234567890abcdef");

		process.env.NODE_ENV = originalNodeEnv;
	});

	it("should handle non-string header values", async () => {
		// Ensure we're not in development mode
		const originalNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";

		const validClientHello = Buffer.alloc(10);
		validClientHello[5] = 0x01;

		const headers = {
			"x-tls-clienthello": validClientHello.toString("base64"),
			// biome-ignore lint/suspicious/noExplicitAny: tests
			"x-tls-version": 123 as any, // Non-string value
		} as IncomingHttpHeaders;

		const result = await getJA4(headers);

		expect(result.ja4PlusFingerprint).toBe("ja4+1234567890abcdef");

		process.env.NODE_ENV = originalNodeEnv;
	});

	it("should handle errors during TLS parsing", async () => {
		vi.mocked(
			await import("read-tls-client-hello"),
		).readTlsClientHello.mockRejectedValueOnce(new Error("Parse error"));

		const validClientHello = Buffer.alloc(10);
		validClientHello[5] = 0x01;

		const headers = {
			"x-tls-clienthello": validClientHello.toString("base64"),
		} as IncomingHttpHeaders;

		const result = await getJA4(headers);

		expect(result.ja4PlusFingerprint).toBe(DEFAULT_JA4);
	});

	it("should handle null or undefined headers", async () => {
		// Ensure we're not in development mode
		const originalNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";

		// biome-ignore lint/suspicious/noExplicitAny: tests
		const result = await getJA4(null as any);

		expect(result.ja4PlusFingerprint).toBe(DEFAULT_JA4);

		process.env.NODE_ENV = originalNodeEnv;
	});

	it("should accept custom logger", async () => {
		// Ensure we're not in development mode
		const originalNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";

		const mockLogger = { debug: vi.fn(), error: vi.fn() };
		const headers = {} as IncomingHttpHeaders;

		// @ts-ignore
		await getJA4(headers, mockLogger);

		// Even with empty headers, debug is called for first bytes
		expect(mockLogger.debug).toHaveBeenCalled();
		expect(mockLogger.error).not.toHaveBeenCalled();

		process.env.NODE_ENV = originalNodeEnv;
	});
});

describe("ja4Middleware", () => {
	it("should return a middleware function", async () => {
		const { ja4Middleware } = await import("../../../api/ja4Middleware.js");
		const mockEnv = {};

		// @ts-ignore
		const middleware = ja4Middleware(mockEnv);

		expect(typeof middleware).toBe("function");
	});
});
