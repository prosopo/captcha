import { describe, expect, test, vi, beforeEach } from "vitest";
import { LogLevel, getLogger } from "@prosopo/common";
import type { KeyringPair } from "@prosopo/types";
import type { ProsopoConfigOutput } from "@prosopo/types";
import commandVersion from "../commands/version.js";

describe("version command", () => {
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
	});

	test("should return command structure with correct properties", () => {
		const command = commandVersion(mockPair, mockConfig);
		expect(command).toHaveProperty("command");
		expect(command).toHaveProperty("describe");
		expect(command).toHaveProperty("handler");
		expect(command.command).toBe("version");
		expect(command.describe).toBe("Return the version of the software");
		expect(typeof command.handler).toBe("function");
	});

	test("should use provided logger", () => {
		const command = commandVersion(mockPair, mockConfig, {
			logger: mockLogger,
		});
		command.handler();
		expect(mockLogger.info).toHaveBeenCalled();
	});

	test("should create default logger when not provided", () => {
		const command = commandVersion(mockPair, mockConfig);
		expect(() => command.handler()).not.toThrow();
	});

	test("should log version information", () => {
		const command = commandVersion(mockPair, mockConfig, {
			logger: mockLogger,
		});
		command.handler();
		expect(mockLogger.info).toHaveBeenCalledWith(
			expect.any(Function),
		);
		const logCall = mockLogger.info as ReturnType<typeof vi.fn>;
		const logFn = logCall.mock.calls[0][0];
		const result = logFn();
		expect(result).toHaveProperty("data");
		expect(result.data).toHaveProperty("version");
		expect(typeof result.data.version).toBe("string");
	});
});
