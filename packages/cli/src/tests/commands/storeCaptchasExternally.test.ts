import { LogLevel, type getLogger } from "@prosopo/common";
import type { KeyringPair } from "@prosopo/types";
import type { ProsopoConfigOutput } from "@prosopo/types";
import { beforeEach, describe, expect, test, vi } from "vitest";
import commandStoreCaptchasExternally from "../../commands/storeCaptchasExternally.js";

// Mock dependencies
vi.mock("@prosopo/env", () => ({
	ProviderEnvironment: vi.fn().mockImplementation(() => ({
		isReady: vi.fn().mockResolvedValue(undefined),
		logger: {
			error: vi.fn(),
		},
	})),
}));

vi.mock("@prosopo/provider", () => ({
	Tasks: vi.fn().mockImplementation(() => ({
		clientTaskManager: {
			storeCommitmentsExternal: vi.fn().mockResolvedValue(undefined),
		},
	})),
}));

describe("storeCaptchasExternally command", () => {
	let mockPair: KeyringPair;
	let mockConfig: ProsopoConfigOutput;
	let mockLogger: ReturnType<typeof getLogger>;

	beforeEach(() => {
		mockPair = {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
		} as KeyringPair;

		mockConfig = {
			logLevel: LogLevel.enum.info,
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
		const command = commandStoreCaptchasExternally(mockPair, mockConfig);
		expect(command).toHaveProperty("command");
		expect(command).toHaveProperty("describe");
		expect(command).toHaveProperty("handler");
		expect(command.command).toBe("store_captchas");
		expect(command.describe).toBe(
			"Store captcha records externally for billing purposes",
		);
		expect(typeof command.handler).toBe("function");
	});

	test("should use provided logger", async () => {
		const command = commandStoreCaptchasExternally(mockPair, mockConfig, {
			logger: mockLogger,
		});
		await command.handler();
		expect(mockLogger.error).not.toHaveBeenCalled();
	});

	test("should create default logger when not provided", async () => {
		const command = commandStoreCaptchasExternally(mockPair, mockConfig);
		await expect(command.handler()).resolves.not.toThrow();
	});

	test("should call storeCommitmentsExternal when handler is executed", async () => {
		const { Tasks } = await import("@prosopo/provider");
		const command = commandStoreCaptchasExternally(mockPair, mockConfig);
		await command.handler();
		const tasksInstance = (Tasks as ReturnType<typeof vi.fn>).mock.results[0]
			.value;
		expect(
			tasksInstance.clientTaskManager.storeCommitmentsExternal,
		).toHaveBeenCalled();
	});

	test("should handle errors gracefully", async () => {
		const { ProviderEnvironment } = await import("@prosopo/env");
		const { Tasks } = await import("@prosopo/provider");
		const mockError = new Error("Storage error");
		const mockEnvLogger = {
			error: vi.fn(),
		};
		(ProviderEnvironment as ReturnType<typeof vi.fn>).mockImplementationOnce(
			() => ({
				isReady: vi.fn().mockResolvedValue(undefined),
				logger: mockEnvLogger,
			}),
		);
		(Tasks as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			clientTaskManager: {
				storeCommitmentsExternal: vi.fn().mockRejectedValue(mockError),
			},
		}));

		const command = commandStoreCaptchasExternally(mockPair, mockConfig, {
			logger: mockLogger,
		});
		await command.handler();
		// Error should be caught and logged by env.logger
		expect(mockEnvLogger.error).toHaveBeenCalled();
	});
});
