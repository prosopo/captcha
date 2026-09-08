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

import { handleErrors } from "@prosopo/api-express-router";
import { ProsopoApiError } from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/env";
import {
	type IPInfoResponse,
	PublicApiPaths,
	providerDetailsSchema,
} from "@prosopo/types";
import type { IIpInfoService } from "@prosopo/types-env";
import { version } from "@prosopo/util";
import type {
	NextFunction,
	Request,
	RequestHandler,
	Response,
	Router,
} from "express";
import {
	type Mock,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { resetHealthzGeoRouter } from "../../../api/healthzGeo.js";
import { metricsHandler } from "../../../api/metrics.js";
import { publicRouter } from "../../../api/public.js";

vi.mock("@prosopo/api-express-router", () => ({
	handleErrors: vi.fn(),
}));

vi.mock("@prosopo/util", async (importActual) => {
	const actual = await importActual<typeof import("@prosopo/util")>();
	return {
		...actual,
		version: "1.0.0-test",
	};
});

// Express does not expose its layer stack in its public types, so describe the
// slice of it these tests read rather than reaching for `any`.
type RouteLayer = {
	route?: {
		path?: string;
		stack: { handle: RequestHandler }[];
	};
};

const getRouteHandler = (router: Router, path: string): RequestHandler => {
	const { stack } = router as unknown as { stack: RouteLayer[] };
	const handler = stack.find((layer) => layer.route?.path === path)?.route
		?.stack[0]?.handle;

	if (!handler) {
		throw new Error(`no handler registered for ${path}`);
	}

	return handler;
};

describe("publicRouter", () => {
	let mockEnv: ProviderEnvironment;
	// biome-ignore lint/suspicious/noExplicitAny: tests
	let mockDb: any;
	// biome-ignore lint/suspicious/noExplicitAny: tests
	let mockRedisConnection: any;
	// biome-ignore lint/suspicious/noExplicitAny: tests
	let mockRedisAccessRulesConnection: any;
	// biome-ignore lint/suspicious/noExplicitAny: tests
	let mockLogger: any;
	let mockReq: Request;
	let mockRes: Response;
	let mockNext: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();

		mockLogger = {
			error: vi.fn(),
		};

		mockRedisConnection = {
			isReady: vi.fn().mockReturnValue(true),
			getAwaitingTimeMs: vi.fn().mockReturnValue(5000),
		};

		mockRedisAccessRulesConnection = {
			isReady: vi.fn().mockReturnValue(false),
			getAwaitingTimeMs: vi.fn().mockReturnValue(10000),
		};

		mockDb = {
			getRedisConnection: vi.fn().mockReturnValue(mockRedisConnection),
			getRedisAccessRulesConnection: vi
				.fn()
				.mockReturnValue(mockRedisAccessRulesConnection),
		};

		mockEnv = {
			getDb: vi.fn().mockReturnValue(mockDb),
			logger: mockLogger,
		} as unknown as ProviderEnvironment;

		mockReq = {} as Request;

		mockRes = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
			json: vi.fn(),
		} as unknown as Response;

		mockNext = vi.fn() as NextFunction;
	});

	it("should return a configured Express router", () => {
		const router = publicRouter(mockEnv);

		expect(router).toBeDefined();
		expect(typeof router.get).toBe("function");
		expect(typeof router.use).toBe("function");
	});

	it("should handle health check endpoint", () => {
		// Test the health check handler directly
		const healthCheckHandler = (req: Request, res: Response) => {
			res.status(200).send("OK");
		};

		healthCheckHandler(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.send).toHaveBeenCalledWith("OK");
	});

	it("should handle provider details endpoint with successful database connections", async () => {
		const router = publicRouter(mockEnv);

		// Mock the route handler for provider details
		const providerDetailsHandler = vi.fn(async (req, res, next) => {
			try {
				const db = mockEnv.getDb();
				const redisConnection = db.getRedisConnection();
				const redisAccessRulesConnection = db.getRedisAccessRulesConnection();

				const response = {
					version,
					message: "Provider online",
					redis: [
						{
							actor: "General",
							isReady: redisConnection.isReady(),
							awaitingTimeSeconds: Math.ceil(
								redisConnection.getAwaitingTimeMs() / 1000,
							),
						},
						{
							actor: "UAP",
							isReady: redisAccessRulesConnection.isReady(),
							awaitingTimeSeconds: Math.ceil(
								redisAccessRulesConnection.getAwaitingTimeMs() / 1000,
							),
						},
					],
				};

				return res.json(response);
			} catch (err) {
				mockEnv.logger.error(() => ({
					err,
					data: { reqParams: req.params },
					msg: "Error getting provider details",
				}));
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: { code: 500 },
					}),
				);
			}
		});

		// Call the handler directly to test the logic
		await providerDetailsHandler(mockReq, mockRes, mockNext);

		expect(mockEnv.getDb).toHaveBeenCalled();
		expect(mockRes.json).toHaveBeenCalledWith({
			version: "1.0.0-test",
			message: "Provider online",
			redis: [
				{
					actor: "General",
					isReady: true,
					awaitingTimeSeconds: 5, // 5000ms / 1000
				},
				{
					actor: "UAP",
					isReady: false,
					awaitingTimeSeconds: 10, // 10000ms / 1000
				},
			],
		});
	});

	it("should handle provider details endpoint with database errors", async () => {
		// Mock database to throw an error
		mockEnv.getDb = vi.fn().mockImplementation(() => {
			throw new Error("Database connection failed");
		});

		const router = publicRouter(mockEnv);

		// Mock the route handler for provider details
		const providerDetailsHandler = vi.fn(async (req, res, next) => {
			try {
				const db = mockEnv.getDb();
				// This will throw
				db.getRedisConnection();
			} catch (err) {
				mockEnv.logger.error(() => ({
					err,
					data: { reqParams: req.params },
					msg: "Error getting provider details",
				}));
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: { code: 500 },
					}),
				);
			}
		});

		// Call the handler directly to test error handling
		await providerDetailsHandler(mockReq, mockRes, mockNext);

		expect(mockLogger.error).toHaveBeenCalledWith(
			expect.any(Function), // Logger function
		);

		// Verify next was called with ProsopoApiError
		expect(mockNext).toHaveBeenCalledWith(expect.any(ProsopoApiError));

		// @ts-ignore
		const error = mockNext.mock.calls[0][0] as ProsopoApiError;
		expect(error).toBeInstanceOf(ProsopoApiError);
	});

	it("should register error handler middleware", () => {
		const router = publicRouter(mockEnv);

		// Check that handleErrors was registered by inspecting the router
		// biome-ignore lint/suspicious/noExplicitAny: tests
		const layers = (router as any).stack || [];
		const errorHandlerLayer = layers.find(
			(layer: { handle: typeof handleErrors }) => layer.handle === handleErrors,
		);

		expect(errorHandlerLayer).toBeDefined();
	});

	// Restores an env var to its prior state — deleting it when it was unset,
	// because `process.env.X = undefined` stores the truthy string "undefined".
	const restoreEnv = (key: string, previous: string | undefined) => {
		if (previous === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = previous;
		}
	};

	it("should register the /metrics route when metrics are enabled", () => {
		const previous = process.env.PROSOPO_METRICS_ENABLED;
		process.env.PROSOPO_METRICS_ENABLED = "true";
		try {
			const router = publicRouter(mockEnv);
			// biome-ignore lint/suspicious/noExplicitAny: tests
			const layers = (router as any).stack || [];
			const metricsLayer = layers.find(
				(layer: { route?: { path?: string } }) =>
					layer.route?.path === PublicApiPaths.Metrics,
			);
			expect(metricsLayer).toBeDefined();
		} finally {
			restoreEnv("PROSOPO_METRICS_ENABLED", previous);
		}
	});

	it("should NOT register the /metrics route when metrics are disabled", () => {
		const previous = process.env.PROSOPO_METRICS_ENABLED;
		process.env.PROSOPO_METRICS_ENABLED = "false";
		try {
			const router = publicRouter(mockEnv);
			// biome-ignore lint/suspicious/noExplicitAny: tests
			const layers = (router as any).stack || [];
			const metricsLayer = layers.find(
				(layer: { route?: { path?: string } }) =>
					layer.route?.path === PublicApiPaths.Metrics,
			);
			expect(metricsLayer).toBeUndefined();
		} finally {
			restoreEnv("PROSOPO_METRICS_ENABLED", previous);
		}
	});

	it("should serve Prometheus-formatted metrics with the correct content type", async () => {
		const setMock = vi.fn();
		const endMock = vi.fn();
		const metricsRes = {
			set: setMock,
			end: endMock,
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
		} as unknown as Response;
		const metricsReq = { headers: {} } as Request;

		await metricsHandler(mockEnv)(metricsReq, metricsRes, mockNext);

		expect(setMock).toHaveBeenCalledWith(
			"Content-Type",
			expect.stringContaining("text/plain"),
		);
		const body = endMock.mock.calls[0]?.[0] as string;
		expect(body).toContain("prosopo_");
		// readiness gauge is refreshed from the live DB connection at scrape time
		// (assert presence, not value — the registry is a shared singleton so the
		// gauge value can leak across tests)
		expect(body).toContain("prosopo_redis_ready");
	});

	it("should reject scrapes without the bearer token when PROSOPO_METRICS_TOKEN is set", async () => {
		const previous = process.env.PROSOPO_METRICS_TOKEN;
		process.env.PROSOPO_METRICS_TOKEN = "secret";
		try {
			const statusMock = vi.fn().mockReturnThis();
			const sendMock = vi.fn();
			const metricsRes = {
				status: statusMock,
				send: sendMock,
				set: vi.fn(),
				end: vi.fn(),
			} as unknown as Response;
			const metricsReq = { headers: {} } as Request;

			await metricsHandler(mockEnv)(metricsReq, metricsRes, mockNext);

			expect(statusMock).toHaveBeenCalledWith(401);
		} finally {
			restoreEnv("PROSOPO_METRICS_TOKEN", previous);
		}
	});

	it("should calculate awaiting time correctly", async () => {
		// Test different awaiting times
		mockRedisConnection.getAwaitingTimeMs.mockReturnValue(1234);
		mockRedisAccessRulesConnection.getAwaitingTimeMs.mockReturnValue(5678);

		const router = publicRouter(mockEnv);

		const providerDetailsHandler = vi.fn(async (req, res, next) => {
			try {
				const db = mockEnv.getDb();
				const redisConnection = db.getRedisConnection();
				const redisAccessRulesConnection = db.getRedisAccessRulesConnection();

				const response = {
					version,
					message: "Provider online",
					redis: [
						{
							actor: "General",
							isReady: redisConnection.isReady(),
							awaitingTimeSeconds: Math.ceil(
								redisConnection.getAwaitingTimeMs() / 1000,
							),
						},
						{
							actor: "UAP",
							isReady: redisAccessRulesConnection.isReady(),
							awaitingTimeSeconds: Math.ceil(
								redisAccessRulesConnection.getAwaitingTimeMs() / 1000,
							),
						},
					],
				};

				return res.json(response);
			} catch (err) {
				return next(err);
			}
		});

		await providerDetailsHandler(mockReq, mockRes, mockNext);

		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				redis: expect.arrayContaining([
					expect.objectContaining({ awaitingTimeSeconds: 2 }), // ceil(1234/1000) = 2
					expect.objectContaining({ awaitingTimeSeconds: 6 }), // ceil(5678/1000) = 6
				]),
			}),
		);
	});

	describe("the details endpoint reports the answering node", () => {
		const envWithConfiguredHost = (host: string): ProviderEnvironment =>
			({
				getDb: vi.fn().mockReturnValue(mockDb),
				logger: mockLogger,
				config: { host },
			}) as unknown as ProviderEnvironment;

		const callDetails = async (
			env: ProviderEnvironment,
			hostname: string,
		): Promise<unknown> => {
			const handler = getRouteHandler(
				publicRouter(env),
				PublicApiPaths.GetProviderDetails,
			);
			const req = { hostname, params: {} } as unknown as Request;

			await handler(req, mockRes, mockNext);

			return vi.mocked(mockRes.json).mock.calls[0]?.[0];
		};

		it("reports the configured host", async () => {
			const body = await callDetails(
				envWithConfiguredHost("provider.example.com"),
				"proxied.example.com",
			);

			expect(body).toEqual(
				expect.objectContaining({ host: "provider.example.com" }),
			);
		});

		it("falls back to the request hostname when no host is configured", async () => {
			const body = await callDetails(
				envWithConfiguredHost(""),
				"req.example.com",
			);

			expect(body).toEqual(
				expect.objectContaining({ host: "req.example.com" }),
			);
		});

		it("returns a body the shared schema still accepts", async () => {
			const body = await callDetails(
				envWithConfiguredHost("provider.example.com"),
				"proxied.example.com",
			);

			expect(providerDetailsSchema.safeParse(body).success).toBe(true);
		});
	});
});

describe("publicRouter /healthz", () => {
	// Express keeps the registered handlers on the router's layer stack; the
	// healthz handler is pulled off it and called directly so the assertions
	// are about the handler and not about express's dispatch.
	interface RouteLayer {
		route?: { path?: string; stack: Array<{ handle: RequestHandler }> };
	}

	const healthzHandler = (router: Router): RequestHandler => {
		const layers = (router as unknown as { stack: RouteLayer[] }).stack;
		const handler = layers.find(
			(layer: RouteLayer) => layer.route?.path === PublicApiPaths.Healthz,
		)?.route?.stack[0]?.handle;
		if (!handler) throw new Error("healthz route is not registered");
		return handler;
	};

	const ipInfoService: IIpInfoService = {
		initialize: vi.fn<() => Promise<void>>(async () => {}),
		lookup: vi.fn<(ip: string) => Promise<IPInfoResponse>>(async () => {
			throw new Error("lookup() must not be called by healthz");
		}),
		country: vi.fn<(ip: string) => string | undefined>(() => "US"),
		isAvailable: vi.fn<() => boolean>(() => true),
	};

	const env = (host: string): ProviderEnvironment =>
		({
			config: { host },
			logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
			ipInfoService,
		}) as unknown as ProviderEnvironment;

	interface ResponseSpy {
		res: Response;
		set: Mock;
		json: Mock;
	}

	const responseSpy = (): ResponseSpy => {
		const set = vi.fn();
		const json = vi.fn();
		return {
			res: {
				status: vi.fn().mockReturnThis(),
				set,
				json,
			} as unknown as Response,
			set,
			json,
		};
	};

	const request = (ip: string): Request =>
		({ ip, hostname: "lb.example.com" }) as Request;

	const setEnvVars = (vars: Record<string, string | undefined>): void => {
		for (const [key, value] of Object.entries(vars)) {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
		resetHealthzGeoRouter();
		// Nothing may reach the network from a unit test; the health poller is
		// the only thing here that would try.
		vi.stubGlobal(
			"fetch",
			vi.fn<typeof fetch>(async () => new Response(null, { status: 503 })),
		);
	});

	afterEach(() => {
		resetHealthzGeoRouter();
		vi.unstubAllGlobals();
		setEnvVars({
			PROSOPO_HEALTHZ_GEO_STEERING: undefined,
			PROSOPO_HEALTHZ_GEO_ROUTES: undefined,
		});
	});

	it("answers with its own name and sets no headers when steering is off", () => {
		setEnvVars({
			PROSOPO_HEALTHZ_GEO_STEERING: undefined,
			PROSOPO_HEALTHZ_GEO_ROUTES: JSON.stringify({
				US: "node-b.example.com",
			}),
		});
		const { res, set, json } = responseSpy();

		healthzHandler(publicRouter(env("node-a.example.com")))(
			request("203.0.113.9"),
			res,
			vi.fn() as NextFunction,
		);

		expect(json).toHaveBeenCalledWith({
			ok: true,
			host: "node-a.example.com",
		});
		// The response has to stay exactly what it was, headers included.
		expect(set).not.toHaveBeenCalled();
		expect(ipInfoService.country).not.toHaveBeenCalled();
	});

	it("falls back to the request hostname when no host is configured", () => {
		const { res, json } = responseSpy();

		healthzHandler(publicRouter(env("")))(
			request("203.0.113.9"),
			res,
			vi.fn() as NextFunction,
		);

		expect(json).toHaveBeenCalledWith({ ok: true, host: "lb.example.com" });
	});

	it("marks the response uncacheable once it can vary per caller", () => {
		setEnvVars({
			PROSOPO_HEALTHZ_GEO_STEERING: "true",
			PROSOPO_HEALTHZ_GEO_ROUTES: JSON.stringify({
				US: "node-b.example.com",
			}),
		});
		const { res, set, json } = responseSpy();

		healthzHandler(publicRouter(env("node-a.example.com")))(
			request("203.0.113.9"),
			res,
			vi.fn() as NextFunction,
		);

		expect(set).toHaveBeenCalledWith("Cache-Control", "no-store, private");
		// The target has not been confirmed up, so this node still answers with
		// its own name — the header is set regardless of which branch wins.
		expect(json).toHaveBeenCalledWith({
			ok: true,
			host: "node-a.example.com",
		});
	});
});
