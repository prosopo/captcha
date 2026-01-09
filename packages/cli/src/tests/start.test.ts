import type { Server } from "node:net";
import { ProviderEnvironment } from "@prosopo/env";
import type { KeyringPair } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { start } from "../start.js";

// Mock dependencies
vi.mock("../process.env.js", () => ({
	getDB: vi.fn().mockReturnValue("localhost"),
	getSecret: vi.fn().mockReturnValue("test-secret"),
}));

vi.mock("../prosopo.config.js", () => ({
	default: vi.fn().mockReturnValue({
		logLevel: "info",
		server: { port: 9229 },
		authAccount: {
			address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
		},
	}),
}));

vi.mock("@prosopo/dotenv", () => ({
	loadEnv: vi.fn(),
}));

vi.mock("@prosopo/keyring", () => ({
	getPair: vi.fn().mockReturnValue({
		address: "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
	}),
}));

vi.mock("@prosopo/env", () => ({
	ProviderEnvironment: vi.fn().mockImplementation(() => ({
		isReady: vi.fn().mockResolvedValue(undefined),
		cleanup: vi.fn(),
		config: {
			scheduledTasks: {},
		},
		pair: {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
		},
		logger: {
			info: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		},
		getDb: vi.fn().mockReturnValue({
			getUserAccessRulesStorage: vi.fn().mockReturnValue({}),
		}),
	})),
}));

vi.mock("@prosopo/provider", () => ({
	storeCaptchasExternally: vi.fn().mockResolvedValue(undefined),
	getClientList: vi.fn().mockResolvedValue(undefined),
	setClientEntropy: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("express", () => {
	const mockApp = {
		set: vi.fn(),
		use: vi.fn(),
		listen: vi.fn((port, callback) => {
			if (callback) callback();
			return {
				close: vi.fn((callback) => {
					if (callback) callback();
				}),
			} as Server;
		}),
	};
	const express = vi.fn(() => mockApp);
	express.json = vi.fn(() => vi.fn());
	return {
		default: express,
	};
});

vi.mock("@prosopo/api-express-router", () => ({
	apiExpressRouterFactory: {
		createRouter: vi.fn().mockReturnValue(vi.fn()),
	},
	authMiddleware: vi.fn().mockReturnValue(vi.fn()),
	requestLoggerMiddleware: vi.fn().mockReturnValue(vi.fn()),
	createApiExpressDefaultEndpointAdapter: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock("@prosopo/locale", async () => {
	const actual = await vi.importActual("@prosopo/locale");
	return {
		...actual,
		i18nMiddleware: vi.fn().mockResolvedValue(vi.fn()),
	};
});

vi.mock("@prosopo/provider", async () => {
	const actual = await vi.importActual("@prosopo/provider");
	return {
		...actual,
		prosopoRouter: vi.fn().mockReturnValue(vi.fn()),
		prosopoVerifyRouter: vi.fn().mockReturnValue(vi.fn()),
		publicRouter: vi.fn().mockReturnValue(vi.fn()),
		headerCheckMiddleware: vi.fn().mockReturnValue(vi.fn()),
		domainMiddleware: vi.fn().mockReturnValue(vi.fn()),
		blockMiddleware: vi.fn().mockReturnValue(vi.fn()),
		ja4Middleware: vi.fn().mockReturnValue(vi.fn()),
		ignoreMiddleware: vi.fn().mockReturnValue(vi.fn()),
		robotsMiddleware: vi.fn().mockReturnValue(vi.fn()),
		createApiAdminRoutesProvider: vi.fn().mockReturnValue({
			getRoutes: vi.fn().mockReturnValue({}),
		}),
		storeCaptchasExternally: vi.fn().mockResolvedValue(undefined),
		getClientList: vi.fn().mockResolvedValue(undefined),
		setClientEntropy: vi.fn().mockResolvedValue(undefined),
	};
});

vi.mock("@prosopo/user-access-policy/api", () => ({
	AccessRuleApiRoutes: vi.fn().mockImplementation(() => ({
		getRoutes: vi.fn().mockReturnValue({}),
		getUserAccessRulesStorage: vi.fn().mockReturnValue({}),
	})),
	getExpressApiRuleRateLimits: vi.fn().mockReturnValue({}),
}));

vi.mock("cors", () => ({
	default: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock("express-rate-limit", () => ({
	default: vi.fn().mockReturnValue(vi.fn()),
}));

describe("start", () => {
	let mockEnv: ProviderEnvironment;

	beforeEach(() => {
		vi.clearAllMocks();
		mockEnv = new ProviderEnvironment({} as any, {} as KeyringPair);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	test("should start API with provided environment", async () => {
		const server = await start(mockEnv);
		expect(server).toBeDefined();
		expect(mockEnv.isReady).toHaveBeenCalled();
		expect(mockEnv.cleanup).toHaveBeenCalled();
	});

	test("should start API with admin flag", async () => {
		const server = await start(mockEnv, true);
		expect(server).toBeDefined();
	});

	test("should start API with custom port", async () => {
		const server = await start(mockEnv, false, 8080);
		expect(server).toBeDefined();
	});

	test("should create environment when not provided", async () => {
		const { loadEnv } = await import("@prosopo/dotenv");
		const { getDB } = await import("../process.env.js");
		const { getSecret } = await import("../process.env.js");
		const getConfig = await import("../prosopo.config.js");
		const { getPair } = await import("@prosopo/keyring");

		const server = await start();
		expect(server).toBeDefined();
		expect(loadEnv).toHaveBeenCalled();
		expect(getDB).toHaveBeenCalled();
		expect(getSecret).toHaveBeenCalled();
		expect(getConfig.default).toHaveBeenCalled();
		expect(getPair).toHaveBeenCalled();
	});

	test("should start scheduled tasks when configured", async () => {
		const { storeCaptchasExternally, getClientList, setClientEntropy } =
			await import("@prosopo/provider");
		mockEnv.config = {
			scheduledTasks: {
				captchaScheduler: { schedule: "0 0 * * *" },
				clientListScheduler: { schedule: "0 */6 * * *" },
				clientEntropyScheduler: { schedule: "0 12 * * *" },
			},
		} as any;

		await start(mockEnv);
		expect(storeCaptchasExternally).toHaveBeenCalled();
		expect(getClientList).toHaveBeenCalled();
		expect(setClientEntropy).toHaveBeenCalled();
	});

	test("should not start scheduled tasks when not configured", async () => {
		const { storeCaptchasExternally, getClientList, setClientEntropy } =
			await import("@prosopo/provider");
		mockEnv.config = {
			scheduledTasks: {},
		} as any;

		await start(mockEnv);
		expect(storeCaptchasExternally).not.toHaveBeenCalled();
		expect(getClientList).not.toHaveBeenCalled();
		expect(setClientEntropy).not.toHaveBeenCalled();
	});

	test("should handle errors in scheduled tasks gracefully", async () => {
		const { storeCaptchasExternally } = await import("@prosopo/provider");
		const mockError = new Error("Scheduler error");
		(storeCaptchasExternally as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			mockError,
		);

		mockEnv.config = {
			scheduledTasks: {
				captchaScheduler: { schedule: "0 0 * * *" },
			},
		} as any;

		await expect(start(mockEnv)).resolves.toBeDefined();
	});

	test("should return Server instance", async () => {
		const server = await start(mockEnv);
		expect(server).toBeDefined();
		expect(typeof server.close).toBe("function");
	});
});
