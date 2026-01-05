import { describe, expect, test, vi, beforeEach } from "vitest";
import { LogLevel, getLogger } from "@prosopo/common";
import { Tier } from "@prosopo/types";
import type { KeyringPair } from "@prosopo/types";
import type { ProsopoConfigOutput } from "@prosopo/types";
import commandSiteKeyRegisterApi from "../../commands/siteKeyRegisterApi.js";

// Mock dependencies
vi.mock("@prosopo/api", () => ({
	ProviderApi: vi.fn().mockImplementation(() => ({
		registerSiteKey: vi.fn().mockResolvedValue(undefined),
	})),
}));

vi.mock("@prosopo/env", () => ({
	ProviderEnvironment: vi.fn().mockImplementation(() => ({
		isReady: vi.fn().mockResolvedValue(undefined),
		config: {},
	})),
}));

vi.mock("@prosopo/util", () => ({
	u8aToHex: vi.fn((data) => `0x${data.toString()}`),
}));

vi.mock("../../commands/validators.js", () => ({
	validateSiteKey: vi.fn((argv) => ({ sitekey: argv.sitekey })),
}));

describe("siteKeyRegisterApi command", () => {
	let mockPair: KeyringPair;
	let mockAuthAccount: KeyringPair;
	let mockConfig: ProsopoConfigOutput;
	let mockLogger: ReturnType<typeof getLogger>;

	beforeEach(() => {
		mockPair = {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
		} as KeyringPair;

		mockAuthAccount = {
			address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
			sign: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
		} as any;

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
		const command = commandSiteKeyRegisterApi(mockPair, mockAuthAccount, mockConfig);
		expect(command).toHaveProperty("command");
		expect(command).toHaveProperty("describe");
		expect(command).toHaveProperty("handler");
		expect(command).toHaveProperty("builder");
		expect(command).toHaveProperty("middlewares");
		expect(command.command).toBe("site_key_register_api <sitekey> <url>");
		expect(command.describe).toBe("Register a Site Key");
		expect(typeof command.handler).toBe("function");
		expect(typeof command.builder).toBe("function");
		expect(Array.isArray(command.middlewares)).toBe(true);
	});

	test("should use provided logger", async () => {
		const command = commandSiteKeyRegisterApi(mockPair, mockAuthAccount, mockConfig, {
			logger: mockLogger,
		});
		const argv = {
			sitekey: "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
			tier: Tier.Free,
			url: "https://api.example.com",
			captcha_type: "image",
			frictionless_threshold: 0.5,
			pow_difficulty: 10,
			domains: ["example.com"],
			image_threshold: 0.8,
		};
		await command.handler(argv as any);
		expect(mockLogger.info).toHaveBeenCalled();
	});

	test("should create default logger when not provided", async () => {
		const command = commandSiteKeyRegisterApi(mockPair, mockAuthAccount, mockConfig);
		const argv = {
			sitekey: "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
			tier: Tier.Free,
			url: "https://api.example.com",
			captcha_type: "image",
			frictionless_threshold: 0.5,
			pow_difficulty: 10,
			domains: ["example.com"],
			image_threshold: 0.8,
		};
		await expect(command.handler(argv as any)).resolves.not.toThrow();
	});

	test("should create ProviderApi and call registerSiteKey", async () => {
		const { ProviderApi } = await import("@prosopo/api");
		const command = commandSiteKeyRegisterApi(mockPair, mockAuthAccount, mockConfig);
		const argv = {
			sitekey: "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
			tier: Tier.Free,
			url: "https://api.example.com",
			captcha_type: "image",
			frictionless_threshold: 0.5,
			pow_difficulty: 10,
			domains: ["example.com"],
			image_threshold: 0.8,
		};
		await command.handler(argv as any);

		expect(ProviderApi).toHaveBeenCalledWith("https://api.example.com", mockPair.address);
		const apiInstance = (ProviderApi as ReturnType<typeof vi.fn>).mock.results[0].value;
		expect(apiInstance.registerSiteKey).toHaveBeenCalled();
		expect(mockAuthAccount.sign).toHaveBeenCalled();
	});

	test("should handle errors gracefully", async () => {
		const { ProviderApi } = await import("@prosopo/api");
		const mockError = new Error("API registration failed");
		(ProviderApi as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			registerSiteKey: vi.fn().mockRejectedValue(mockError),
		}));

		const command = commandSiteKeyRegisterApi(mockPair, mockAuthAccount, mockConfig, {
			logger: mockLogger,
		});
		const argv = {
			sitekey: "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
			tier: Tier.Free,
			url: "https://api.example.com",
			captcha_type: "image",
			frictionless_threshold: 0.5,
			pow_difficulty: 10,
			domains: ["example.com"],
			image_threshold: 0.8,
		};
		await command.handler(argv as any);
		expect(mockLogger.error).toHaveBeenCalled();
	});

	test("builder should configure options correctly", () => {
		const command = commandSiteKeyRegisterApi(mockPair, mockAuthAccount, mockConfig);
		const mockYargs = {
			positional: vi.fn().mockReturnThis(),
			option: vi.fn().mockReturnThis(),
		};
		command.builder(mockYargs as any);
		expect(mockYargs.positional).toHaveBeenCalledWith("sitekey", expect.any(Object));
		expect(mockYargs.positional).toHaveBeenCalledWith("tier", expect.any(Object));
		expect(mockYargs.option).toHaveBeenCalledWith("url", expect.any(Object));
		expect(mockYargs.option).toHaveBeenCalledWith("captcha_type", expect.any(Object));
		expect(mockYargs.option).toHaveBeenCalledWith("domains", expect.any(Object));
		expect(mockYargs.option).toHaveBeenCalledWith("frictionless_threshold", expect.any(Object));
		expect(mockYargs.option).toHaveBeenCalledWith("pow_difficulty", expect.any(Object));
		expect(mockYargs.option).toHaveBeenCalledWith("image_threshold", expect.any(Object));
	});
});

