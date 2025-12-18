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

import {
	afterEach,
	beforeEach,
	describe,
	expect,
	expectTypeOf,
	test,
	vi,
} from "vitest";
import HttpClientBase from "./HttpClientBase.js";
import { HttpError } from "./HttpError.js";

// Mock fetch globally
global.fetch = vi.fn();

// Test subclass to expose protected methods
class TestHttpClientBase extends HttpClientBase {
	public async testFetch<T>(
		input: RequestInfo,
		init?: RequestInit,
	): Promise<T> {
		return this.fetch<T>(input, init);
	}

	public async testPost<T, U>(
		input: RequestInfo,
		body: U,
		init?: RequestInit,
	): Promise<T> {
		return this.post<T, U>(input, body, init);
	}

	public async testResponseHandler<T>(response: Response): Promise<T> {
		return this.responseHandler<T>(response);
	}

	public testErrorHandler(error: Error): Promise<never> {
		return this.errorHandler(error);
	}
}

describe("HttpClientBase", () => {
	let client: TestHttpClientBase;
	const baseURL = "https://api.example.com";
	const prefix = "/v1";

	beforeEach(() => {
		client = new TestHttpClientBase(baseURL, prefix);
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("constructor", () => {
		test("constructs with baseURL and prefix", () => {
			const client = new HttpClientBase("https://api.example.com", "/v1");
			expect(client).toBeInstanceOf(HttpClientBase);
		});

		test("constructs with baseURL only", () => {
			const client = new HttpClientBase("https://api.example.com");
			expect(client).toBeInstanceOf(HttpClientBase);
		});

		test("baseURL is correctly combined with prefix", () => {
			// Access protected property via type assertion for testing
			const clientWithPrefix = new HttpClientBase(baseURL, prefix);
			expect((clientWithPrefix as unknown as { baseURL: string }).baseURL).toBe(
				"https://api.example.com/v1",
			);
		});
	});

	describe("fetch", () => {
		test("returns parsed JSON response on success", async () => {
			const mockResponse = { data: "test", count: 42 };
			const mockFetch = vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
				headers: new Headers({ "content-type": "application/json" }),
				url: `${baseURL}${prefix}/test`,
				status: 200,
				statusText: "OK",
				redirected: false,
				type: "basic" as ResponseType,
			} as unknown as Response);

			const result = await client.testFetch("/test");

			expect(mockFetch).toHaveBeenCalledWith(
				`${baseURL}${prefix}/test`,
				undefined,
			);
			expect(result).toEqual(mockResponse);
		});

		test("handles successful response with custom init", async () => {
			const mockResponse = { success: true };
			const init = {
				method: "GET",
				headers: { Authorization: "Bearer token" },
			};
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
				headers: new Headers({ "content-type": "application/json" }),
				url: `${baseURL}${prefix}/endpoint`,
				status: 200,
				statusText: "OK",
				redirected: false,
				type: "basic" as ResponseType,
			} as unknown as Response);

			const result = await client.testFetch("/endpoint", init);

			expect(global.fetch).toHaveBeenCalledWith(
				`${baseURL}${prefix}/endpoint`,
				init,
			);
			expect(result).toEqual(mockResponse);
		});

		test("does not throw HttpError for 400 status with JSON content-type", async () => {
			const mockResponse = { error: "Bad Request" };
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				statusText: "Bad Request",
				json: async () => mockResponse,
				headers: new Headers({ "content-type": "application/json" }),
				url: `${baseURL}${prefix}/test`,
				redirected: false,
				type: "basic" as ResponseType,
			} as unknown as Response);

			const result = await client.testFetch("/test");

			expect(result).toEqual(mockResponse);
		});

		test("does not throw HttpError for non-ok response with JSON content-type", async () => {
			const mockResponse = { error: "Server Error" };
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: async () => mockResponse,
				headers: new Headers({ "content-type": "application/json" }),
				url: `${baseURL}${prefix}/test`,
				redirected: false,
				type: "basic" as ResponseType,
			} as unknown as Response);

			const result = await client.testFetch("/test");

			expect(result).toEqual(mockResponse);
		});

		test("throws HttpError for non-ok response without JSON content-type", async () => {
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: "Not Found",
				headers: new Headers({ "content-type": "text/html" }),
				url: `${baseURL}${prefix}/test`,
				redirected: false,
				type: "basic" as ResponseType,
			} as unknown as Response);

			await expect(client.testFetch("/test")).rejects.toThrow(HttpError);
		});

		test("handles JSON parsing error", async () => {
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => {
					throw new Error("Invalid JSON");
				},
				headers: new Headers({ "content-type": "application/json" }),
				url: `${baseURL}${prefix}/test`,
				status: 200,
				statusText: "OK",
				redirected: false,
				type: "basic" as ResponseType,
			} as unknown as Response);

			await expect(client.testFetch("/test")).rejects.toThrow("Invalid JSON");
			expect(console.error).toHaveBeenCalled();
		});

		test("handles network errors", async () => {
			vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

			await expect(client.testFetch("/test")).rejects.toThrow("Network error");
			expect(console.error).toHaveBeenCalled();
		});

		test("type checking - returns correct generic type", async () => {
			const mockResponse = { id: 1, name: "test" };
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
				headers: new Headers({ "content-type": "application/json" }),
				url: `${baseURL}${prefix}/test`,
				status: 200,
				statusText: "OK",
				redirected: false,
				type: "basic" as ResponseType,
			} as unknown as Response);

			const result = await client.testFetch<{ id: number; name: string }>(
				"/test",
			);

			expectTypeOf(result).toMatchTypeOf<{ id: number; name: string }>();
			expectTypeOf(result.id).toMatchTypeOf<number>();
			expectTypeOf(result.name).toMatchTypeOf<string>();
		});
	});

	describe("post", () => {
		test("sends POST request with JSON body", async () => {
			const requestBody = { name: "test", value: 123 };
			const mockResponse = { success: true, id: 1 };
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
				headers: new Headers({ "content-type": "application/json" }),
				url: `${baseURL}${prefix}/create`,
				status: 200,
				statusText: "OK",
				redirected: false,
				type: "basic" as ResponseType,
			} as unknown as Response);

			const result = await client.testPost("/create", requestBody);

			expect(global.fetch).toHaveBeenCalledWith(
				`${baseURL}${prefix}/create`,
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify(requestBody),
					headers: expect.objectContaining({
						"Content-Type": "application/json",
					}),
				}),
			);
			expect(result).toEqual(mockResponse);
		});

		test("merges custom headers with Content-Type", async () => {
			const requestBody = { data: "test" };
			const mockResponse = { success: true };
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
				headers: new Headers({ "content-type": "application/json" }),
				url: `${baseURL}${prefix}/test`,
				status: 200,
				statusText: "OK",
				redirected: false,
				type: "basic" as ResponseType,
			} as unknown as Response);

			await client.testPost("/test", requestBody, {
				headers: { Authorization: "Bearer token", "X-Custom": "value" },
			});

			expect(global.fetch).toHaveBeenCalledWith(
				`${baseURL}${prefix}/test`,
				expect.objectContaining({
					headers: expect.objectContaining({
						"Content-Type": "application/json",
						Authorization: "Bearer token",
						"X-Custom": "value",
					}),
				}),
			);
		});

		test("does not throw HttpError for 400 status with JSON content-type", async () => {
			const requestBody = { invalid: true };
			const mockResponse = { error: "Validation failed" };
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				statusText: "Bad Request",
				json: async () => mockResponse,
				headers: new Headers({ "content-type": "application/json" }),
				url: `${baseURL}${prefix}/test`,
				redirected: false,
				type: "basic" as ResponseType,
			} as unknown as Response);

			const result = await client.testPost("/test", requestBody);

			expect(result).toEqual(mockResponse);
		});

		test("throws HttpError for non-ok response without JSON content-type", async () => {
			const requestBody = { data: "test" };
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				headers: new Headers({ "content-type": "text/plain" }),
				url: `${baseURL}${prefix}/test`,
				redirected: false,
				type: "basic" as ResponseType,
			} as unknown as Response);

			await expect(client.testPost("/test", requestBody)).rejects.toThrow(
				HttpError,
			);
		});

		test("handles JSON parsing error", async () => {
			const requestBody = { data: "test" };
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => {
					throw new Error("Invalid JSON");
				},
				headers: new Headers({ "content-type": "application/json" }),
				url: `${baseURL}${prefix}/test`,
				status: 200,
				statusText: "OK",
				redirected: false,
				type: "basic" as ResponseType,
			} as unknown as Response);

			await expect(client.testPost("/test", requestBody)).rejects.toThrow(
				"Invalid JSON",
			);
			expect(console.error).toHaveBeenCalled();
		});

		test("type checking - returns correct generic type", async () => {
			const requestBody = { input: "test" };
			const mockResponse = { output: "result", count: 5 };
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
				headers: new Headers({ "content-type": "application/json" }),
				url: `${baseURL}${prefix}/test`,
				status: 200,
				statusText: "OK",
				redirected: false,
				type: "basic" as ResponseType,
			} as unknown as Response);

			const result = await client.testPost<
				{ output: string; count: number },
				typeof requestBody
			>("/test", requestBody);

			expectTypeOf(result).toMatchTypeOf<{ output: string; count: number }>();
			expectTypeOf(result.output).toMatchTypeOf<string>();
			expectTypeOf(result.count).toMatchTypeOf<number>();
		});
	});

	describe("responseHandler", () => {
		test("parses JSON response correctly", async () => {
			const mockResponse = { data: "test" };
			const response = {
				json: async () => mockResponse,
				ok: true,
				status: 200,
				statusText: "OK",
				headers: new Headers(),
				url: "",
				redirected: false,
				type: "basic" as ResponseType,
			} as unknown as Response;

			const result = await client.testResponseHandler(response);

			expect(result).toEqual(mockResponse);
		});

		test("handles JSON parsing errors", async () => {
			const response = {
				json: async () => {
					throw new Error("Invalid JSON");
				},
				ok: true,
				status: 200,
				statusText: "OK",
				headers: new Headers(),
				url: "",
				redirected: false,
				type: "basic" as ResponseType,
			} as unknown as Response;

			await expect(client.testResponseHandler(response)).rejects.toThrow(
				"Invalid JSON",
			);
			expect(console.error).toHaveBeenCalled();
		});

		test("type checking - returns correct generic type", async () => {
			const mockResponse = { id: 1, name: "test" };
			const response = {
				json: async () => mockResponse,
				ok: true,
				status: 200,
				statusText: "OK",
				headers: new Headers(),
				url: "",
				redirected: false,
				type: "basic" as ResponseType,
			} as unknown as Response;

			const result = await client.testResponseHandler<{
				id: number;
				name: string;
			}>(response);

			expectTypeOf(result).toMatchTypeOf<{ id: number; name: string }>();
		});
	});

	describe("errorHandler", () => {
		test("rejects with HttpError", async () => {
			const error = new HttpError(404, "Not Found", "https://example.com/api");

			await expect(client.testErrorHandler(error)).rejects.toThrow(HttpError);
			expect(console.error).toHaveBeenCalledWith("HTTP error:", error);
		});

		test("rejects with generic Error", async () => {
			const error = new Error("Network error");

			await expect(client.testErrorHandler(error)).rejects.toThrow(
				"Network error",
			);
			expect(console.error).toHaveBeenCalledWith("API request error:", error);
		});

		test("type checking - returns Promise<never>", () => {
			const error = new Error("Test error");
			const result = client.testErrorHandler(error);

			// Type check the return value
			expectTypeOf(result).toMatchTypeOf<Promise<never>>();

			// Handle the rejection to avoid unhandled promise rejection
			result.catch(() => {});
		});
	});
});
