import { LogLevel, type getLogger } from "@prosopo/common";
import type { KeyringPair } from "@prosopo/types";
import type { ProsopoConfigOutput } from "@prosopo/types";
import { beforeEach, describe, expect, test, vi } from "vitest";
import commandProviderSetDataset from "../../commands/providerSetDataset.js";

// Mock dependencies
vi.mock("@prosopo/env", () => ({
	ProviderEnvironment: vi.fn().mockImplementation(() => ({
		isReady: vi.fn().mockResolvedValue(undefined),
	})),
}));

vi.mock("@prosopo/provider", () => ({
	Tasks: vi.fn().mockImplementation(() => ({
		datasetManager: {
			providerSetDatasetFromFile: vi.fn().mockResolvedValue(undefined),
		},
	})),
}));

vi.mock("../../files.js", () => ({
	loadJSONFile: vi.fn().mockReturnValue({ test: "data" }),
}));

describe("providerSetDataset command", () => {
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
		const command = commandProviderSetDataset(mockPair, mockConfig);
		expect(command).toHaveProperty("command");
		expect(command).toHaveProperty("describe");
		expect(command).toHaveProperty("handler");
		expect(command).toHaveProperty("builder");
		expect(command.command).toBe("provider_set_data_set");
		expect(command.describe).toBe("Add a dataset as a Provider");
		expect(typeof command.handler).toBe("function");
		expect(typeof command.builder).toBe("function");
	});

	test("should use provided logger", async () => {
		const command = commandProviderSetDataset(mockPair, mockConfig, {
			logger: mockLogger,
		});
		const argv = { file: "/path/to/file.json" };
		await command.handler(argv as any);
		expect(mockLogger.info).toHaveBeenCalled();
	});

	test("should create default logger when not provided", async () => {
		const command = commandProviderSetDataset(mockPair, mockConfig);
		const argv = { file: "/path/to/file.json" };
		await expect(command.handler(argv as any)).resolves.not.toThrow();
	});

	test("should load JSON file and call providerSetDatasetFromFile", async () => {
		const { loadJSONFile } = await import("../../files.js");
		const { Tasks } = await import("@prosopo/provider");
		const command = commandProviderSetDataset(mockPair, mockConfig);
		const argv = { file: "/path/to/file.json" };
		await command.handler(argv as any);

		expect(loadJSONFile).toHaveBeenCalledWith("/path/to/file.json");
		const tasksInstance = (Tasks as ReturnType<typeof vi.fn>).mock.results[0]
			.value;
		expect(
			tasksInstance.datasetManager.providerSetDatasetFromFile,
		).toHaveBeenCalledWith({
			test: "data",
		});
	});

	test("should handle errors gracefully", async () => {
		const { loadJSONFile } = await import("../../files.js");
		const mockError = new Error("File not found");
		(loadJSONFile as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
			throw mockError;
		});

		const command = commandProviderSetDataset(mockPair, mockConfig, {
			logger: mockLogger,
		});
		const argv = { file: "/path/to/invalid.json" };
		await command.handler(argv as any);
		expect(mockLogger.error).toHaveBeenCalled();
	});

	test("should log info messages during execution", async () => {
		const command = commandProviderSetDataset(mockPair, mockConfig, {
			logger: mockLogger,
		});
		const argv = { file: "/path/to/file.json" };
		await command.handler(argv as any);
		expect(mockLogger.info).toHaveBeenCalledTimes(2);
	});

	test("builder should configure file option", () => {
		const command = commandProviderSetDataset(mockPair, mockConfig);
		const mockYargs = {
			option: vi.fn().mockReturnThis(),
		};
		command.builder(mockYargs as any);
		expect(mockYargs.option).toHaveBeenCalledWith("file", {
			type: "string",
			demand: true,
			desc: "The file path of a JSON dataset file",
		});
	});
});
