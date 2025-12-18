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

import { describe, expect, expectTypeOf, it, vi } from "vitest";
import type { Logger } from "@prosopo/common";
import { z } from "zod";
import type { ApiEndpoint } from "../endpoint/apiEndpoint.js";
import type { ApiEndpointResponse } from "../endpoint/apiEndpointResponse.js";
import { ApiEndpointResponseStatus } from "../endpoint/apiEndpointResponseStatus.js";

describe("ApiEndpoint", () => {
	describe("endpoints with schemas", () => {
		it("should process request with simple object schema", async () => {
			const Schema = z.object({
				name: z.string(),
				age: z.number(),
			});

			class UserEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(
					args: z.infer<typeof Schema>,
				): Promise<ApiEndpointResponse> {
					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: { user: args },
					};
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new UserEndpoint();
			const result = await endpoint.processRequest({ name: "John", age: 30 });

			expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
			expect(result.data).toEqual({ user: { name: "John", age: 30 } });
		});

		it("should process request with nested object schema", async () => {
			const Schema = z.object({
				user: z.object({
					name: z.string(),
					email: z.string().email(),
				}),
				metadata: z.object({
					timestamp: z.number(),
				}),
			});

			class NestedEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(
					args: z.infer<typeof Schema>,
				): Promise<ApiEndpointResponse> {
					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: {
							processed: true,
							userName: args.user.name,
							time: args.metadata.timestamp,
						},
					};
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new NestedEndpoint();
			const result = await endpoint.processRequest({
				user: { name: "Alice", email: "alice@example.com" },
				metadata: { timestamp: 1234567890 },
			});

			expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
			expect(result.data).toEqual({
				processed: true,
				userName: "Alice",
				time: 1234567890,
			});
		});

		it("should process request with array schema", async () => {
			const Schema = z.object({
				items: z.array(z.string()),
			});

			class ArrayEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(
					args: z.infer<typeof Schema>,
				): Promise<ApiEndpointResponse> {
					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: { count: args.items.length, items: args.items },
					};
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new ArrayEndpoint();
			const result = await endpoint.processRequest({
				items: ["apple", "banana", "cherry"],
			});

			expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
			expect(result.data).toEqual({
				count: 3,
				items: ["apple", "banana", "cherry"],
			});
		});

		it("should process request with optional fields", async () => {
			const Schema = z.object({
				required: z.string(),
				optional: z.string().optional(),
			});

			class OptionalFieldsEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(
					args: z.infer<typeof Schema>,
				): Promise<ApiEndpointResponse> {
					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: {
							hasOptional: args.optional !== undefined,
							values: args,
						},
					};
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new OptionalFieldsEndpoint();

			const resultWithOptional = await endpoint.processRequest({
				required: "value",
				optional: "optional-value",
			});
			expect(resultWithOptional.data).toEqual({
				hasOptional: true,
				values: { required: "value", optional: "optional-value" },
			});

			const resultWithoutOptional = await endpoint.processRequest({
				required: "value",
			});
			expect(resultWithoutOptional.data).toEqual({
				hasOptional: false,
				values: { required: "value" },
			});
		});

		it("should process request with union types", async () => {
			const Schema = z.object({
				value: z.union([z.string(), z.number()]),
			});

			class UnionEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(
					args: z.infer<typeof Schema>,
				): Promise<ApiEndpointResponse> {
					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: {
							type: typeof args.value,
							value: args.value,
						},
					};
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new UnionEndpoint();

			const stringResult = await endpoint.processRequest({ value: "hello" });
			expect(stringResult.data).toEqual({ type: "string", value: "hello" });

			const numberResult = await endpoint.processRequest({ value: 42 });
			expect(numberResult.data).toEqual({ type: "number", value: 42 });
		});
	});

	describe("endpoints without schemas", () => {
		it("should process request without arguments", async () => {
			class NoArgsEndpoint implements ApiEndpoint<undefined> {
				async processRequest(): Promise<ApiEndpointResponse> {
					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: { message: "No arguments needed" },
					};
				}

				getRequestArgsSchema(): undefined {
					return undefined;
				}
			}

			const endpoint = new NoArgsEndpoint();
			const result = await endpoint.processRequest();

			expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
			expect(result.data).toEqual({ message: "No arguments needed" });
			expect(endpoint.getRequestArgsSchema()).toBeUndefined();
		});

		it("should process request with logger only", async () => {
			const mockLogger: Logger = {
				info: vi.fn(),
				error: vi.fn(),
				warn: vi.fn(),
				debug: vi.fn(),
			} as unknown as Logger;

			class LoggerOnlyEndpoint implements ApiEndpoint<undefined> {
				async processRequest(logger?: Logger): Promise<ApiEndpointResponse> {
					logger?.info("Processing request");
					return { status: ApiEndpointResponseStatus.SUCCESS };
				}

				getRequestArgsSchema(): undefined {
					return undefined;
				}
			}

			const endpoint = new LoggerOnlyEndpoint();
			await endpoint.processRequest(mockLogger);

			expect(mockLogger.info).toHaveBeenCalledWith("Processing request");
		});
	});

	describe("response status handling", () => {
		it("should return SUCCESS status", async () => {
			const Schema = z.object({ value: z.string() });

			class SuccessEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(): Promise<ApiEndpointResponse> {
					return { status: ApiEndpointResponseStatus.SUCCESS };
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new SuccessEndpoint();
			const result = await endpoint.processRequest({ value: "test" });

			expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
			expect(result.error).toBeUndefined();
		});

		it("should return FAIL status with error message", async () => {
			const Schema = z.object({ value: z.string() });

			class FailingEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(
					args: z.infer<typeof Schema>,
				): Promise<ApiEndpointResponse> {
					if (args.value === "fail") {
						return {
							status: ApiEndpointResponseStatus.FAIL,
							error: "Value cannot be 'fail'",
						};
					}
					return { status: ApiEndpointResponseStatus.SUCCESS };
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new FailingEndpoint();

			const failResult = await endpoint.processRequest({ value: "fail" });
			expect(failResult.status).toBe(ApiEndpointResponseStatus.FAIL);
			expect(failResult.error).toBe("Value cannot be 'fail'");

			const successResult = await endpoint.processRequest({ value: "ok" });
			expect(successResult.status).toBe(ApiEndpointResponseStatus.SUCCESS);
			expect(successResult.error).toBeUndefined();
		});

		it("should return PROCESSING status", async () => {
			const Schema = z.object({ taskId: z.string() });

			class ProcessingEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(
					args: z.infer<typeof Schema>,
				): Promise<ApiEndpointResponse> {
					return {
						status: ApiEndpointResponseStatus.PROCESSING,
						data: { taskId: args.taskId, message: "Task is being processed" },
					};
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new ProcessingEndpoint();
			const result = await endpoint.processRequest({ taskId: "task-123" });

			expect(result.status).toBe(ApiEndpointResponseStatus.PROCESSING);
			expect(result.data).toEqual({
				taskId: "task-123",
				message: "Task is being processed",
			});
		});
	});

	describe("logger integration", () => {
		it("should log information during processing", async () => {
			const mockLogger: Logger = {
				info: vi.fn(),
				error: vi.fn(),
				warn: vi.fn(),
				debug: vi.fn(),
			} as unknown as Logger;

			const Schema = z.object({ operation: z.string() });

			class LoggingEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(
					args: z.infer<typeof Schema>,
					logger?: Logger,
				): Promise<ApiEndpointResponse> {
					logger?.info(`Starting operation: ${args.operation}`);
					logger?.debug("Processing...");
					logger?.info("Operation completed");
					return { status: ApiEndpointResponseStatus.SUCCESS };
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new LoggingEndpoint();
			await endpoint.processRequest({ operation: "test" }, mockLogger);

			expect(mockLogger.info).toHaveBeenCalledWith("Starting operation: test");
			expect(mockLogger.debug).toHaveBeenCalledWith("Processing...");
			expect(mockLogger.info).toHaveBeenCalledWith("Operation completed");
		});

		it("should log errors", async () => {
			const mockLogger: Logger = {
				info: vi.fn(),
				error: vi.fn(),
				warn: vi.fn(),
				debug: vi.fn(),
			} as unknown as Logger;

			const Schema = z.object({ value: z.string() });

			class ErrorLoggingEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(
					args: z.infer<typeof Schema>,
					logger?: Logger,
				): Promise<ApiEndpointResponse> {
					if (args.value === "error") {
						logger?.error("Invalid value provided");
						return {
							status: ApiEndpointResponseStatus.FAIL,
							error: "Invalid value",
						};
					}
					return { status: ApiEndpointResponseStatus.SUCCESS };
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new ErrorLoggingEndpoint();
			await endpoint.processRequest({ value: "error" }, mockLogger);

			expect(mockLogger.error).toHaveBeenCalledWith("Invalid value provided");
		});

		it("should log warnings", async () => {
			const mockLogger: Logger = {
				info: vi.fn(),
				error: vi.fn(),
				warn: vi.fn(),
				debug: vi.fn(),
			} as unknown as Logger;

			const Schema = z.object({ value: z.number() });

			class WarningEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(
					args: z.infer<typeof Schema>,
					logger?: Logger,
				): Promise<ApiEndpointResponse> {
					if (args.value < 0) {
						logger?.warn("Negative value provided");
					}
					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: { value: Math.abs(args.value) },
					};
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new WarningEndpoint();
			await endpoint.processRequest({ value: -5 }, mockLogger);

			expect(mockLogger.warn).toHaveBeenCalledWith("Negative value provided");
		});

		it("should work without logger provided", async () => {
			const Schema = z.object({ value: z.string() });

			class OptionalLoggerEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(
					args: z.infer<typeof Schema>,
					logger?: Logger,
				): Promise<ApiEndpointResponse> {
					logger?.info("This will not throw if logger is undefined");
					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: { value: args.value },
					};
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new OptionalLoggerEndpoint();
			// Should not throw when logger is not provided
			const result = await endpoint.processRequest({ value: "test" });

			expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
			expect(result.data).toEqual({ value: "test" });
		});
	});

	describe("data transformations", () => {
		it("should transform input data", async () => {
			const Schema = z.object({
				firstName: z.string(),
				lastName: z.string(),
			});

			class TransformEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(
					args: z.infer<typeof Schema>,
				): Promise<ApiEndpointResponse> {
					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: { fullName: `${args.firstName} ${args.lastName}` },
					};
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new TransformEndpoint();
			const result = await endpoint.processRequest({
				firstName: "John",
				lastName: "Doe",
			});

			expect(result.data).toEqual({ fullName: "John Doe" });
		});

		it("should perform calculations on input", async () => {
			const Schema = z.object({
				numbers: z.array(z.number()),
			});

			class CalculationEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(
					args: z.infer<typeof Schema>,
				): Promise<ApiEndpointResponse> {
					const sum = args.numbers.reduce((a, b) => a + b, 0);
					const avg = sum / args.numbers.length;

					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: { sum, average: avg, count: args.numbers.length },
					};
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new CalculationEndpoint();
			const result = await endpoint.processRequest({
				numbers: [10, 20, 30, 40],
			});

			expect(result.data).toEqual({ sum: 100, average: 25, count: 4 });
		});

		it("should filter and map data", async () => {
			const Schema = z.object({
				items: z.array(
					z.object({
						id: z.number(),
						name: z.string(),
						active: z.boolean(),
					}),
				),
			});

			class FilterMapEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(
					args: z.infer<typeof Schema>,
				): Promise<ApiEndpointResponse> {
					const activeItems = args.items
						.filter((item) => item.active)
						.map((item) => item.name);

					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: { activeItems },
					};
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new FilterMapEndpoint();
			const result = await endpoint.processRequest({
				items: [
					{ id: 1, name: "Item1", active: true },
					{ id: 2, name: "Item2", active: false },
					{ id: 3, name: "Item3", active: true },
				],
			});

			expect(result.data).toEqual({ activeItems: ["Item1", "Item3"] });
		});
	});

	describe("async operations", () => {
		it("should handle async operations with delays", async () => {
			const Schema = z.object({ delay: z.number() });

			class AsyncDelayEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(
					args: z.infer<typeof Schema>,
				): Promise<ApiEndpointResponse> {
					await new Promise((resolve) => setTimeout(resolve, args.delay));
					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: { delayed: args.delay },
					};
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new AsyncDelayEndpoint();
			const startTime = Date.now();
			const result = await endpoint.processRequest({ delay: 100 });
			const endTime = Date.now();

			expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
			expect(result.data).toEqual({ delayed: 100 });
			expect(endTime - startTime).toBeGreaterThanOrEqual(100);
		});

		it("should handle multiple async operations in sequence", async () => {
			const Schema = z.object({ operations: z.array(z.string()) });

			class SequentialEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(
					args: z.infer<typeof Schema>,
				): Promise<ApiEndpointResponse> {
					const results: string[] = [];

					for (const op of args.operations) {
						// Simulate async operation
						await new Promise((resolve) => setTimeout(resolve, 10));
						results.push(`processed-${op}`);
					}

					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: { results },
					};
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new SequentialEndpoint();
			const result = await endpoint.processRequest({
				operations: ["op1", "op2", "op3"],
			});

			expect(result.data).toEqual({
				results: ["processed-op1", "processed-op2", "processed-op3"],
			});
		});

		it("should handle parallel async operations", async () => {
			const Schema = z.object({ tasks: z.array(z.string()) });

			class ParallelEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(
					args: z.infer<typeof Schema>,
				): Promise<ApiEndpointResponse> {
					const promises = args.tasks.map(async (task) => {
						await new Promise((resolve) => setTimeout(resolve, 10));
						return `completed-${task}`;
					});

					const results = await Promise.all(promises);

					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: { results },
					};
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new ParallelEndpoint();
			const result = await endpoint.processRequest({
				tasks: ["task1", "task2", "task3"],
			});

			expect(result.data).toEqual({
				results: ["completed-task1", "completed-task2", "completed-task3"],
			});
		});
	});

	describe("stateful endpoints", () => {
		it("should maintain state across multiple requests", async () => {
			const Schema = z.object({ value: z.number() });

			class StatefulEndpoint implements ApiEndpoint<typeof Schema> {
				private counter = 0;

				async processRequest(
					args: z.infer<typeof Schema>,
				): Promise<ApiEndpointResponse> {
					this.counter += args.value;
					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: { total: this.counter },
					};
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new StatefulEndpoint();

			const result1 = await endpoint.processRequest({ value: 5 });
			expect(result1.data).toEqual({ total: 5 });

			const result2 = await endpoint.processRequest({ value: 10 });
			expect(result2.data).toEqual({ total: 15 });

			const result3 = await endpoint.processRequest({ value: 3 });
			expect(result3.data).toEqual({ total: 18 });
		});

		it("should maintain separate state for different instances", async () => {
			const Schema = z.object({ increment: z.number() });

			class CounterEndpoint implements ApiEndpoint<typeof Schema> {
				private count = 0;

				async processRequest(
					args: z.infer<typeof Schema>,
				): Promise<ApiEndpointResponse> {
					this.count += args.increment;
					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: { count: this.count },
					};
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint1 = new CounterEndpoint();
			const endpoint2 = new CounterEndpoint();

			await endpoint1.processRequest({ increment: 5 });
			await endpoint2.processRequest({ increment: 10 });

			const result1 = await endpoint1.processRequest({ increment: 2 });
			const result2 = await endpoint2.processRequest({ increment: 3 });

			expect(result1.data).toEqual({ count: 7 });
			expect(result2.data).toEqual({ count: 13 });
		});
	});

	describe("type safety", () => {
		// Minimal type tests for parameter and return types
		it("should type processRequest parameters correctly", () => {
			const Schema = z.object({ value: z.string() });

			class TypedEndpoint implements ApiEndpoint<typeof Schema> {
				async processRequest(
					args: z.infer<typeof Schema>,
				): Promise<ApiEndpointResponse> {
					return { status: ApiEndpointResponseStatus.SUCCESS };
				}

				getRequestArgsSchema(): typeof Schema {
					return Schema;
				}
			}

			const endpoint = new TypedEndpoint();

			expectTypeOf(endpoint.processRequest).parameter(0).toMatchTypeOf<{
				value: string;
			}>();
			expectTypeOf(endpoint.processRequest).returns.resolves.toMatchTypeOf<
				ApiEndpointResponse
			>();
		});

		it("should type processRequest with undefined schema correctly", () => {
			class NoSchemaEndpoint implements ApiEndpoint<undefined> {
				async processRequest(): Promise<ApiEndpointResponse> {
					return { status: ApiEndpointResponseStatus.SUCCESS };
				}

				getRequestArgsSchema(): undefined {
					return undefined;
				}
			}

			const endpoint = new NoSchemaEndpoint();

			expectTypeOf(endpoint.processRequest).returns.resolves.toMatchTypeOf<
				ApiEndpointResponse
			>();
			expectTypeOf(endpoint.getRequestArgsSchema).returns.toBeUndefined();
		});
	});
});
