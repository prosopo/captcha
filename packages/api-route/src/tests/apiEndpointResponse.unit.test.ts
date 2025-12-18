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

import { describe, expect, expectTypeOf, it } from "vitest";
import type { ApiEndpointResponse } from "../endpoint/apiEndpointResponse.js";
import { ApiEndpointResponseStatus } from "../endpoint/apiEndpointResponseStatus.js";

describe("ApiEndpointResponse", () => {
	describe("success responses", () => {
		it("should create response with SUCCESS status", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
			};

			expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
			expect(response.data).toBeUndefined();
			expect(response.error).toBeUndefined();
		});

		it("should create response with SUCCESS status and data", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { message: "Operation completed" },
			};

			expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
			expect(response.data).toEqual({ message: "Operation completed" });
			expect(response.error).toBeUndefined();
		});

		it("should create response with complex data object", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: {
					user: { id: 1, name: "John" },
					metadata: { timestamp: 123456789 },
					items: ["a", "b", "c"],
				},
			};

			expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
			expect(response.data).toEqual({
				user: { id: 1, name: "John" },
				metadata: { timestamp: 123456789 },
				items: ["a", "b", "c"],
			});
		});

		it("should create response with nested objects in data", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: {
					level1: {
						level2: {
							level3: {
								value: "deep",
							},
						},
					},
				},
			};

			expect(response.data).toHaveProperty("level1.level2.level3.value", "deep");
		});
	});

	describe("failure responses", () => {
		it("should create response with FAIL status and error", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.FAIL,
				error: "Something went wrong",
			};

			expect(response.status).toBe(ApiEndpointResponseStatus.FAIL);
			expect(response.error).toBe("Something went wrong");
			expect(response.data).toBeUndefined();
		});

		it("should create response with FAIL status without error message", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.FAIL,
			};

			expect(response.status).toBe(ApiEndpointResponseStatus.FAIL);
			expect(response.error).toBeUndefined();
		});

		it("should create response with FAIL status, error, and data", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.FAIL,
				error: "Validation failed",
				data: { field: "email", reason: "invalid format" },
			};

			expect(response.status).toBe(ApiEndpointResponseStatus.FAIL);
			expect(response.error).toBe("Validation failed");
			expect(response.data).toEqual({ field: "email", reason: "invalid format" });
		});

		it("should create response with different error messages", () => {
			const errors = [
				"Network error",
				"Timeout",
				"Invalid input",
				"Unauthorized",
				"Not found",
			];

			for (const errorMsg of errors) {
				const response: ApiEndpointResponse = {
					status: ApiEndpointResponseStatus.FAIL,
					error: errorMsg,
				};

				expect(response.error).toBe(errorMsg);
			}
		});
	});

	describe("processing responses", () => {
		it("should create response with PROCESSING status", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.PROCESSING,
			};

			expect(response.status).toBe(ApiEndpointResponseStatus.PROCESSING);
			expect(response.data).toBeUndefined();
			expect(response.error).toBeUndefined();
		});

		it("should create response with PROCESSING status and data", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.PROCESSING,
				data: { taskId: "task-123", estimatedTime: 5000 },
			};

			expect(response.status).toBe(ApiEndpointResponseStatus.PROCESSING);
			expect(response.data).toEqual({ taskId: "task-123", estimatedTime: 5000 });
		});

		it("should create response with PROCESSING status and progress info", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.PROCESSING,
				data: { progress: 50, total: 100, message: "Half way there" },
			};

			expect(response.data).toEqual({
				progress: 50,
				total: 100,
				message: "Half way there",
			});
		});
	});

	describe("JSON serialization", () => {
		it("should serialize success response to JSON", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { value: "test" },
			};

			const json = JSON.stringify(response);
			const parsed = JSON.parse(json);

			expect(parsed).toEqual(response);
			expect(parsed.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		});

		it("should serialize failure response to JSON", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.FAIL,
				error: "Error message",
			};

			const json = JSON.stringify(response);
			const parsed = JSON.parse(json);

			expect(parsed).toEqual(response);
			expect(parsed.error).toBe("Error message");
		});

		it("should serialize processing response to JSON", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.PROCESSING,
				data: { taskId: "task-456" },
			};

			const json = JSON.stringify(response);
			const parsed = JSON.parse(json);

			expect(parsed).toEqual(response);
			expect(parsed.status).toBe(ApiEndpointResponseStatus.PROCESSING);
		});

		it("should handle JSON serialization with complex data", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: {
					nested: { value: 123 },
					array: [1, 2, 3],
					boolean: true,
					null: null,
				},
			};

			const json = JSON.stringify(response);
			const parsed = JSON.parse(json);

			expect(parsed).toEqual(response);
		});

		it("should maintain response structure through serialization roundtrip", () => {
			const original: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { items: ["a", "b", "c"], count: 3 },
			};

			const json = JSON.stringify(original);
			const restored: ApiEndpointResponse = JSON.parse(json);

			expect(restored.status).toBe(original.status);
			expect(restored.data).toEqual(original.data);
		});
	});

	describe("response patterns", () => {
		it("should support checking status with equality", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
			};

			expect(response.status === ApiEndpointResponseStatus.SUCCESS).toBe(true);
			expect(response.status === ApiEndpointResponseStatus.FAIL).toBe(false);
		});

		it("should support switch-case pattern", () => {
			const responses: ApiEndpointResponse[] = [
				{ status: ApiEndpointResponseStatus.SUCCESS },
				{ status: ApiEndpointResponseStatus.FAIL, error: "Error" },
				{ status: ApiEndpointResponseStatus.PROCESSING },
			];

			const results = responses.map((response) => {
				switch (response.status) {
					case ApiEndpointResponseStatus.SUCCESS:
						return "success";
					case ApiEndpointResponseStatus.FAIL:
						return "fail";
					case ApiEndpointResponseStatus.PROCESSING:
						return "processing";
				}
			});

			expect(results).toEqual(["success", "fail", "processing"]);
		});

		it("should support conditional handling based on status", () => {
			const handleResponse = (
				response: ApiEndpointResponse,
			): { handled: boolean; message: string } => {
				if (response.status === ApiEndpointResponseStatus.SUCCESS) {
					return { handled: true, message: "Success" };
				}
				if (response.status === ApiEndpointResponseStatus.FAIL) {
					return { handled: true, message: response.error || "Unknown error" };
				}
				return { handled: false, message: "Processing" };
			};

			const successResult = handleResponse({
				status: ApiEndpointResponseStatus.SUCCESS,
			});
			expect(successResult).toEqual({ handled: true, message: "Success" });

			const failResult = handleResponse({
				status: ApiEndpointResponseStatus.FAIL,
				error: "Test error",
			});
			expect(failResult).toEqual({ handled: true, message: "Test error" });

			const processingResult = handleResponse({
				status: ApiEndpointResponseStatus.PROCESSING,
			});
			expect(processingResult).toEqual({ handled: false, message: "Processing" });
		});
	});

	describe("response with optional fields", () => {
		it("should allow response with only status", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
			};

			expect(response).toHaveProperty("status");
			expect(response.data).toBeUndefined();
			expect(response.error).toBeUndefined();
		});

		it("should allow response with status and data", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { result: "value" },
			};

			expect(response).toHaveProperty("status");
			expect(response).toHaveProperty("data");
			expect(response.error).toBeUndefined();
		});

		it("should allow response with status and error", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.FAIL,
				error: "Error occurred",
			};

			expect(response).toHaveProperty("status");
			expect(response).toHaveProperty("error");
			expect(response.data).toBeUndefined();
		});

		it("should allow response with all fields", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.FAIL,
				data: { context: "additional info" },
				error: "Error occurred",
			};

			expect(response).toHaveProperty("status");
			expect(response).toHaveProperty("data");
			expect(response).toHaveProperty("error");
		});
	});

	describe("response data types", () => {
		it("should support empty object as data", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: {},
			};

			expect(response.data).toEqual({});
		});

		it("should support array-like structures in data", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { items: [1, 2, 3], index: 0 },
			};

			expect(response.data).toHaveProperty("items");
			expect(Array.isArray((response.data as any).items)).toBe(true);
		});

		it("should support numeric values in data", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { count: 42, percentage: 85.5 },
			};

			expect((response.data as any).count).toBe(42);
			expect((response.data as any).percentage).toBe(85.5);
		});

		it("should support boolean values in data", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { success: true, verified: false },
			};

			expect((response.data as any).success).toBe(true);
			expect((response.data as any).verified).toBe(false);
		});

		it("should support null values in data", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { value: null, optional: null },
			};

			expect((response.data as any).value).toBeNull();
			expect((response.data as any).optional).toBeNull();
		});
	});

	describe("response immutability patterns", () => {
		it("should allow creating new response from existing", () => {
			const original: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { value: "original" },
			};

			const updated: ApiEndpointResponse = {
				...original,
				data: { value: "updated" },
			};

			expect(original.data).toEqual({ value: "original" });
			expect(updated.data).toEqual({ value: "updated" });
		});

		it("should allow updating status while preserving data", () => {
			const original: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.PROCESSING,
				data: { taskId: "task-789" },
			};

			const completed: ApiEndpointResponse = {
				...original,
				status: ApiEndpointResponseStatus.SUCCESS,
			};

			expect(completed.status).toBe(ApiEndpointResponseStatus.SUCCESS);
			expect(completed.data).toEqual({ taskId: "task-789" });
		});

		it("should allow merging data objects", () => {
			const base: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { field1: "value1" },
			};

			const enhanced: ApiEndpointResponse = {
				...base,
				data: { ...base.data, field2: "value2" },
			};

			expect(enhanced.data).toEqual({ field1: "value1", field2: "value2" });
		});
	});

	describe("response validation patterns", () => {
		it("should allow checking if response has data", () => {
			const withData: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { value: "test" },
			};

			const withoutData: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
			};

			expect(withData.data).toBeDefined();
			expect(withoutData.data).toBeUndefined();
		});

		it("should allow checking if response has error", () => {
			const withError: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.FAIL,
				error: "Error message",
			};

			const withoutError: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
			};

			expect(withError.error).toBeDefined();
			expect(withoutError.error).toBeUndefined();
		});

		it("should support checking for specific data properties", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { userId: 123, userName: "John" },
			};

			expect(response.data).toHaveProperty("userId");
			expect(response.data).toHaveProperty("userName");
			expect(response.data).not.toHaveProperty("email");
		});

		it("should allow validating response structure", () => {
			const validateResponse = (
				response: ApiEndpointResponse,
			): { valid: boolean; reason?: string } => {
				if (!response.status) {
					return { valid: false, reason: "Status is required" };
				}

				if (
					response.status === ApiEndpointResponseStatus.FAIL &&
					!response.error
				) {
					return { valid: false, reason: "Error message expected for FAIL" };
				}

				return { valid: true };
			};

			const valid = validateResponse({
				status: ApiEndpointResponseStatus.SUCCESS,
			});
			expect(valid.valid).toBe(true);

			const validWithError = validateResponse({
				status: ApiEndpointResponseStatus.FAIL,
				error: "Error",
			});
			expect(validWithError.valid).toBe(true);

			const invalidFail = validateResponse({
				status: ApiEndpointResponseStatus.FAIL,
			});
			expect(invalidFail.valid).toBe(false);
		});
	});

	describe("type safety", () => {
		// Minimal type test for structure
		it("should type response properties correctly", () => {
			const response: ApiEndpointResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { value: "test" },
			};

			expectTypeOf(response.status).toMatchTypeOf<ApiEndpointResponseStatus>();
			expectTypeOf(response.data).toMatchTypeOf<object | undefined>();
			expectTypeOf(response.error).toMatchTypeOf<string | undefined>();
		});
	});
});
