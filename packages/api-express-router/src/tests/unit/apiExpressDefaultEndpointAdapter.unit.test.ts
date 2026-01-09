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

import type { ApiEndpoint } from "@prosopo/api-route";
import { type Logger, ProsopoApiError, getLogger } from "@prosopo/common";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import { ApiExpressDefaultEndpointAdapter } from "../../endpointAdapter/apiExpressDefaultEndpointAdapter.js";
import type { ApiExpressEndpointAdapter } from "../../endpointAdapter/apiExpressEndpointAdapter.js";

describe("ApiExpressDefaultEndpointAdapter", () => {
    describe("constructor", () => {
        it("should create instance with logLevel and errorStatusCode", () => {
            const adapter = new ApiExpressDefaultEndpointAdapter("info", 500);
            expect(adapter).toBeDefined();
        });

        it("should accept different log levels", () => {
            const levels = ["debug", "info", "warn", "error"] as const;
            for (const level of levels) {
                const adapter = new ApiExpressDefaultEndpointAdapter(level, 500);
                expect(adapter).toBeDefined();
            }
        });

        it("should accept custom error status codes", () => {
            const adapter = new ApiExpressDefaultEndpointAdapter("info", 400);
            expect(adapter).toBeDefined();
        });
    });

    describe("handleRequest", () => {
        it("should process request with valid schema", async () => {
            const schema = z.object({
                name: z.string(),
                age: z.number(),
            });

            const mockEndpoint: ApiEndpoint<typeof schema> = {
                getRequestArgsSchema: () => schema,
                processRequest: async (args) => {
                    expectTypeOf(args).toMatchTypeOf<z.infer<typeof schema>>();
                    return {
                        status: "success",
                        data: { message: `Hello ${args.name}, age ${args.age}` },
                    };
                },
            };

            const mockRequest = {
                body: { name: "Test", age: 25 },
                logger: getLogger("info", "test") as Logger,
            } as unknown as Request;

            const mockResponse = {
                json: vi.fn(),
                status: vi.fn().mockReturnThis(),
                send: vi.fn(),
                set: vi.fn().mockReturnThis(),
            } as unknown as Response;

            const mockNext = vi.fn() as unknown as NextFunction;

            const adapter = new ApiExpressDefaultEndpointAdapter("info", 500);
            await adapter.handleRequest(
                mockEndpoint,
                mockRequest,
                mockResponse,
                mockNext,
            );

            expect(mockResponse.json).toHaveBeenCalledWith({
                status: "success",
                data: { message: "Hello Test, age 25" },
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it("should handle request without schema", async () => {
            const mockEndpoint: ApiEndpoint<undefined> = {
                getRequestArgsSchema: () => undefined,
                processRequest: async () => {
                    return {
                        status: "success",
                        data: { result: "no args" },
                    };
                },
            };

            const mockRequest = {
                body: {},
                logger: getLogger("info", "test") as Logger,
            } as unknown as Request;

            const mockResponse = {
                json: vi.fn(),
                status: vi.fn().mockReturnThis(),
                send: vi.fn(),
                set: vi.fn().mockReturnThis(),
            } as unknown as Response;

            const mockNext = vi.fn() as unknown as NextFunction;

            const adapter = new ApiExpressDefaultEndpointAdapter("info", 500);
            await adapter.handleRequest(
                mockEndpoint,
                mockRequest,
                mockResponse,
                mockNext,
            );

            expect(mockResponse.json).toHaveBeenCalledWith({
                status: "success",
                data: { result: "no args" },
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it("should call next with ProsopoApiError on schema validation failure", async () => {
            const schema = z.object({
                name: z.string(),
                age: z.number(),
            });

            const mockEndpoint: ApiEndpoint<typeof schema> = {
                getRequestArgsSchema: () => schema,
                processRequest: async () => ({
                    status: "success",
                    data: {},
                }),
            };

            const mockRequest = {
                body: { name: "Test", age: "not-a-number" },
                logger: getLogger("info", "test") as Logger,
            } as unknown as Request;

            const mockResponse = {
                json: vi.fn(),
                status: vi.fn().mockReturnThis(),
                send: vi.fn(),
                set: vi.fn().mockReturnThis(),
            } as unknown as Response;

            const mockNext = vi.fn() as unknown as NextFunction;

            const adapter = new ApiExpressDefaultEndpointAdapter("info", 500);
            await adapter.handleRequest(
                mockEndpoint,
                mockRequest,
                mockResponse,
                mockNext,
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(expect.any(ProsopoApiError));
            expect(mockResponse.json).not.toHaveBeenCalled();
        });

        it("should handle BigInt in response data", async () => {
            const mockEndpoint: ApiEndpoint<undefined> = {
                getRequestArgsSchema: () => undefined,
                processRequest: async () => {
                    return {
                        status: "success",
                        data: { bigValue: BigInt("12345678901234567890") },
                    };
                },
            };

            const mockRequest = {
                body: {},
                logger: getLogger("info", "test") as Logger,
            } as unknown as Request;

            const mockResponse = {
                json: vi.fn(),
                status: vi.fn().mockReturnThis(),
                send: vi.fn(),
                set: vi.fn().mockReturnThis(),
            } as unknown as Response;

            const mockNext = vi.fn() as unknown as NextFunction;

            const adapter = new ApiExpressDefaultEndpointAdapter("info", 500);
            await adapter.handleRequest(
                mockEndpoint,
                mockRequest,
                mockResponse,
                mockNext,
            );

            expect(mockResponse.json).toHaveBeenCalled();
            const callArgs = mockResponse.json.mock.calls[0][0];
            expect(callArgs.data.bigValue).toBe("12345678901234567890");
            expect(typeof callArgs.data.bigValue).toBe("string");
        });

        it("should handle errors during processRequest", async () => {
            const mockEndpoint: ApiEndpoint<undefined> = {
                getRequestArgsSchema: () => undefined,
                processRequest: async () => {
                    throw new Error("Processing failed");
                },
            };

            const mockLogger = {
                error: vi.fn(),
            } as unknown as Logger;

            const mockRequest = {
                body: {},
                logger: mockLogger,
            } as unknown as Request;

            const mockResponse = {
                json: vi.fn(),
                status: vi.fn().mockReturnThis(),
                send: vi.fn(),
                set: vi.fn().mockReturnThis(),
            } as unknown as Response;

            const mockNext = vi.fn() as unknown as NextFunction;

            const adapter = new ApiExpressDefaultEndpointAdapter("info", 500);
            await adapter.handleRequest(
                mockEndpoint,
                mockRequest,
                mockResponse,
                mockNext,
            );

            expect(mockLogger.error).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.send).toHaveBeenCalledWith(
                "An internal server error occurred.",
            );
            expect(mockNext).not.toHaveBeenCalled();
        });

		it("should use custom error status code on processRequest error", async () => {
			const mockEndpoint: ApiEndpoint<undefined> = {
                getRequestArgsSchema: () => undefined,
                processRequest: async () => {
                    throw new Error("Processing failed");
                },
            };

            const mockLogger = {
                error: vi.fn(),
            } as unknown as Logger;

            const mockRequest = {
                body: {},
                logger: mockLogger,
            } as unknown as Request;

            const mockResponse = {
                json: vi.fn(),
                status: vi.fn().mockReturnThis(),
                send: vi.fn(),
                set: vi.fn().mockReturnThis(),
            } as unknown as Response;

            const mockNext = vi.fn() as unknown as NextFunction;

            const adapter = new ApiExpressDefaultEndpointAdapter("info", 503);
            await adapter.handleRequest(
                mockEndpoint,
                mockRequest,
                mockResponse,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(503);
        });

        it("should pass logger to processRequest", async () => {
            const mockLogger = getLogger("info", "test") as Logger;
            const processRequestSpy = vi.fn().mockResolvedValue({
                status: "success",
                data: {},
            });

            const mockEndpoint: ApiEndpoint<undefined> = {
                getRequestArgsSchema: () => undefined,
                processRequest: processRequestSpy,
            };

            const mockRequest = {
                body: {},
                logger: mockLogger,
            } as unknown as Request;

            const mockResponse = {
                json: vi.fn(),
                status: vi.fn().mockReturnThis(),
                send: vi.fn(),
                set: vi.fn().mockReturnThis(),
            } as unknown as Response;

            const mockNext = vi.fn() as unknown as NextFunction;

            const adapter = new ApiExpressDefaultEndpointAdapter("info", 500);
            await adapter.handleRequest(
                mockEndpoint,
                mockRequest,
                mockResponse,
                mockNext,
            );

            expect(processRequestSpy).toHaveBeenCalledWith(undefined, mockLogger);
        });

        it("should handle nested objects with BigInt", async () => {
            const mockEndpoint: ApiEndpoint<undefined> = {
                getRequestArgsSchema: () => undefined,
                processRequest: async () => {
                    return {
                        status: "success",
                        data: {
                            nested: {
                                value: BigInt("999"),
                                other: "string",
                            },
                        },
                    };
                },
            };

            const mockRequest = {
                body: {},
                logger: getLogger("info", "test") as Logger,
            } as unknown as Request;

            const mockResponse = {
                json: vi.fn(),
                status: vi.fn().mockReturnThis(),
                send: vi.fn(),
                set: vi.fn().mockReturnThis(),
            } as unknown as Response;

            const mockNext = vi.fn() as unknown as NextFunction;

            const adapter = new ApiExpressDefaultEndpointAdapter("info", 500);
            await adapter.handleRequest(
                mockEndpoint,
                mockRequest,
                mockResponse,
                mockNext,
            );

            expect(mockResponse.json).toHaveBeenCalledWith({
                status: "success",
                data: {
                    nested: {
                        value: "999",
                        other: "string",
                    },
                },
            });
        });
    });

    describe("type tests", () => {
        it("should implement ApiExpressEndpointAdapter interface", () => {
            const adapter = new ApiExpressDefaultEndpointAdapter("info", 500);

            // Type test: verify adapter implements the interface
            expectTypeOf(adapter).toMatchTypeOf<ApiExpressEndpointAdapter>();
        });

        it("should have correct handleRequest signature", () => {
            const adapter = new ApiExpressDefaultEndpointAdapter("info", 500);

            // Type test: verify handleRequest accepts correct parameters
            expectTypeOf(adapter.handleRequest)
                .parameter(0)
                .toMatchTypeOf<ApiEndpoint<z.ZodType | undefined>>();
            expectTypeOf(adapter.handleRequest).parameter(1).toMatchTypeOf<Request>();
            expectTypeOf(adapter.handleRequest)
                .parameter(2)
                .toMatchTypeOf<Response>();
            expectTypeOf(adapter.handleRequest)
                .parameter(3)
                .toMatchTypeOf<NextFunction>();

            // Type test: verify return type
            expectTypeOf(adapter.handleRequest).returns.toMatchTypeOf<
                Promise<void>
            >();
        });
    });
});
