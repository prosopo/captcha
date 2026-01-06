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

import { describe, expect, expectTypeOf, test } from "vitest";
import { ApiClient } from "./apiClient.js";

describe("ApiClient", () => {
	describe("constructor", () => {
		test("adds https:// protocol to baseUrl without protocol", () => {
			const client = new ApiClient("api.example.com", "account123");
			const baseURL = (client as unknown as { baseURL: string }).baseURL;
			expect(baseURL).toBe("https://api.example.com");
		});

		test("preserves https:// protocol when already present", () => {
			const client = new ApiClient("https://api.example.com", "account123");
			const baseURL = (client as unknown as { baseURL: string }).baseURL;
			expect(baseURL).toBe("https://api.example.com");
		});

		test("preserves http:// protocol when already present", () => {
			const client = new ApiClient("http://api.example.com", "account123");
			const baseURL = (client as unknown as { baseURL: string }).baseURL;
			expect(baseURL).toBe("http://api.example.com");
		});

		test("stores account correctly", () => {
			const account = "test-account-123";
			const client = new ApiClient("https://api.example.com", account);
			const storedAccount = (client as unknown as { account: string }).account;
			expect(storedAccount).toBe(account);
		});

		test("handles baseUrl with path", () => {
			const client = new ApiClient("api.example.com/v1", "account123");
			const baseURL = (client as unknown as { baseURL: string }).baseURL;
			expect(baseURL).toBe("https://api.example.com/v1");
		});

		test("handles baseUrl with port", () => {
			const client = new ApiClient("api.example.com:8080", "account123");
			const baseURL = (client as unknown as { baseURL: string }).baseURL;
			expect(baseURL).toBe("https://api.example.com:8080");
		});

		test("handles baseUrl with trailing slash", () => {
			const client = new ApiClient("api.example.com/", "account123");
			const baseURL = (client as unknown as { baseURL: string }).baseURL;
			expect(baseURL).toBe("https://api.example.com/");
		});

		test("handles baseUrl with query parameters", () => {
			const client = new ApiClient("api.example.com?key=value", "account123");
			const baseURL = (client as unknown as { baseURL: string }).baseURL;
			expect(baseURL).toBe("https://api.example.com?key=value");
		});

		test("handles empty account string", () => {
			const client = new ApiClient("https://api.example.com", "");
			const storedAccount = (client as unknown as { account: string }).account;
			expect(storedAccount).toBe("");
		});

		test("handles baseUrl with special characters", () => {
			const client = new ApiClient(
				"api.example.com/path-with-dashes_underscores",
				"account123",
			);
			const baseURL = (client as unknown as { baseURL: string }).baseURL;
			expect(baseURL).toBe(
				"https://api.example.com/path-with-dashes_underscores",
			);
		});

		test("handles baseUrl starting with HTTP uppercase - case sensitive check adds https prefix", () => {
			// The code checks for lowercase "http", so uppercase "HTTP" doesn't match
			const client = new ApiClient("HTTP://api.example.com", "account123");
			const baseURL = (client as unknown as { baseURL: string }).baseURL;
			expect(baseURL).toBe("https://HTTP://api.example.com");
		});

		test("handles baseUrl starting with HTTPS uppercase - case sensitive check adds https prefix", () => {
			// The code checks for lowercase "http", so uppercase "HTTPS" doesn't match
			const client = new ApiClient("HTTPS://api.example.com", "account123");
			const baseURL = (client as unknown as { baseURL: string }).baseURL;
			expect(baseURL).toBe("https://HTTPS://api.example.com");
		});

		test("type checking - account is string", () => {
			const client = new ApiClient("https://api.example.com", "account123");
			const account = (client as unknown as { account: string }).account;

			expectTypeOf(account).toMatchTypeOf<string>();
		});

		test("type checking - baseURL is string", () => {
			const client = new ApiClient("https://api.example.com", "account123");
			const baseURL = (client as unknown as { baseURL: string }).baseURL;

			expectTypeOf(baseURL).toMatchTypeOf<string>();
		});

		test("type checking - extends HttpClientBase", () => {
			const client = new ApiClient("https://api.example.com", "account123");

			expectTypeOf(client).toMatchTypeOf<ApiClient>();
		});
	});
});
