import { describe, expect, test, vi, beforeEach } from "vitest";
import { LogLevel, getLogger } from "@prosopo/common";
import type { KeyringPair } from "@prosopo/types";
import type { ProsopoConfigOutput } from "@prosopo/types";
import commandEnsureIndexes from "../../commands/ensureIndexes.js";

// Mock dependencies
vi.mock("@prosopo/env", () => ({
	ProviderEnvironment: vi.fn().mockImplementation(() => ({
		isReady: vi.fn().mockResolvedValue(undefined),
		config: {
			mongoCaptchaUri: "mongodb://localhost:27017/captcha",
		},
	})),
}));

vi.mock("@prosopo/provider", () => ({
	Tasks: vi.fn().mockImplementation(() => ({
		db: {
			ensureIndexes: vi.fn().mockResolvedValue(undefined),
		},
	})),
}));

describe("ensureIndexes command", () => {
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
		const command = commandEnsureIndexes(mockPair, mockConfig);
		expect(command).toHaveProperty("command");
		expect(command).toHaveProperty("describe");
		expect(command).toHaveProperty("handler");
		expect(command.command).toBe("ensure_indexes");
		expect(command.describe).toBe("Ensure indexes for internal database");
		expect(typeof command.handler).toBe("function");
	});

	test("should use provided logger", async () => {
		const command = commandEnsureIndexes(mockPair, mockConfig, {
			logger: mockLogger,
		});
		await command.handler();
		// Handler should not error, but may or may not call logger
		expect(mockLogger.error).not.toHaveBeenCalled();
	});

	test("should create default logger when not provided", async () => {
		const command = commandEnsureIndexes(mockPair, mockConfig);
		await expect(command.handler()).resolves.not.toThrow();
	});

	test("should call ensureIndexes when handler is executed", async () => {
		const { Tasks } = await import("@prosopo/provider");
		const command = commandEnsureIndexes(mockPair, mockConfig);
		await command.handler();
		const tasksInstance = (Tasks as ReturnType<typeof vi.fn>).mock.results[0].value;
		expect(tasksInstance.db.ensureIndexes).toHaveBeenCalled();
	});

	test("should handle errors gracefully", async () => {
		const { Tasks } = await import("@prosopo/provider");
		const mockError = new Error("Database error");
		(Tasks as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			db: {
				ensureIndexes: vi.fn().mockRejectedValue(mockError),
			},
		}));

		const command = commandEnsureIndexes(mockPair, mockConfig, {
			logger: mockLogger,
		});
		await command.handler();
		expect(mockLogger.error).toHaveBeenCalled();
	});

	test("should throw error when mongoCaptchaUri is not set", async () => {
		const { ProviderEnvironment } = await import("@prosopo/env");
		(ProviderEnvironment as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			isReady: vi.fn().mockResolvedValue(undefined),
			config: {
				mongoCaptchaUri: undefined,
			},
		}));

		const command = commandEnsureIndexes(mockPair, mockConfig, {
			logger: mockLogger,
		});
		await command.handler();
		expect(mockLogger.error).toHaveBeenCalled();
	});
});

