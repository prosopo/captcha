import { describe, expect, test, vi, beforeEach } from "vitest";
import { LogLevel, getLogger } from "@prosopo/common";
import type { KeyringPair } from "@prosopo/types";
import type { ProsopoConfigOutput } from "@prosopo/types";
import commandEnsureExternalIndexes from "../../commands/ensureExternalIndexes.js";

// Mock dependencies
vi.mock("@prosopo/env", () => ({
	ProviderEnvironment: vi.fn().mockImplementation(() => ({
		isReady: vi.fn().mockResolvedValue(undefined),
		config: {
			mongoCaptchaUri: "mongodb://localhost:27017/captcha",
		},
		logger: {
			error: vi.fn(),
		},
	})),
}));

vi.mock("@prosopo/provider", () => ({
	Tasks: vi.fn().mockImplementation(() => ({
		clientTaskManager: {
			getCaptchaDB: vi.fn().mockReturnValue({
				ensureIndexes: vi.fn().mockResolvedValue(undefined),
			}),
		},
	})),
}));

describe("ensureExternalIndexes command", () => {
	let mockPair: KeyringPair;
	let mockConfig: ProsopoConfigOutput;
	let mockLogger: ReturnType<typeof getLogger>;

	beforeEach(() => {
		mockPair = {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
		} as KeyringPair;

		mockConfig = {
			logLevel: LogLevel.enum.info,
			mongoCaptchaUri: "mongodb://localhost:27017/captcha",
		} as ProsopoConfigOutput;

		mockLogger = {
			info: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
			warn: vi.fn(),
		} as any;

		vi.clearAllMocks();
	});

	test("should return command structure with correct properties", () => {
		const command = commandEnsureExternalIndexes(mockPair, mockConfig);
		expect(command).toHaveProperty("command");
		expect(command).toHaveProperty("describe");
		expect(command).toHaveProperty("handler");
		expect(command.command).toBe("ensure_external_indexes");
		expect(command.describe).toBe("Ensure indexes for external database");
		expect(typeof command.handler).toBe("function");
	});

	test("should use provided logger", async () => {
		const command = commandEnsureExternalIndexes(mockPair, mockConfig, {
			logger: mockLogger,
		});
		await command.handler();
		expect(mockLogger.error).not.toHaveBeenCalled();
	});

	test("should create default logger when not provided", async () => {
		const command = commandEnsureExternalIndexes(mockPair, mockConfig);
		await expect(command.handler()).resolves.not.toThrow();
	});

	test("should call ensureIndexes on external database when handler is executed", async () => {
		const { Tasks } = await import("@prosopo/provider");
		const command = commandEnsureExternalIndexes(mockPair, mockConfig);
		await command.handler();
		const tasksInstance = (Tasks as ReturnType<typeof vi.fn>).mock.results[0].value;
		expect(tasksInstance.clientTaskManager.getCaptchaDB).toHaveBeenCalledWith(
			"mongodb://localhost:27017/captcha",
		);
		const captchaDB = tasksInstance.clientTaskManager.getCaptchaDB();
		expect(captchaDB.ensureIndexes).toHaveBeenCalled();
	});

	test("should handle errors gracefully", async () => {
		const { Tasks } = await import("@prosopo/provider");
		const mockError = new Error("Database error");
		(Tasks as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			clientTaskManager: {
				getCaptchaDB: vi.fn().mockReturnValue({
					ensureIndexes: vi.fn().mockRejectedValue(mockError),
				}),
			},
		}));

		const command = commandEnsureExternalIndexes(mockPair, mockConfig, {
			logger: mockLogger,
		});
		await command.handler();
		// Error should be caught and logged by env.logger
	});

	test("should throw error when mongoCaptchaUri is not set", async () => {
		const { ProviderEnvironment } = await import("@prosopo/env");
		(ProviderEnvironment as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			isReady: vi.fn().mockResolvedValue(undefined),
			config: {
				mongoCaptchaUri: undefined,
			},
			logger: {
				error: vi.fn(),
			},
		}));

		const command = commandEnsureExternalIndexes(mockPair, mockConfig, {
			logger: mockLogger,
		});
		await command.handler();
		expect(mockLogger.error).toHaveBeenCalled();
	});
});

