import { describe, expect, test, vi, beforeEach } from "vitest";
import { LogLevel, getLogger } from "@prosopo/common";
import { Tier } from "@prosopo/types";
import type { KeyringPair } from "@prosopo/types";
import type { ProsopoConfigOutput } from "@prosopo/types";
import commandSiteKeyRegister from "../../commands/siteKeyRegister.js";

// Mock dependencies
vi.mock("@prosopo/env", () => ({
	ProviderEnvironment: vi.fn().mockImplementation(() => ({
		isReady: vi.fn().mockResolvedValue(undefined),
		config: {},
	})),
}));

vi.mock("@prosopo/provider", () => ({
	Tasks: vi.fn().mockImplementation(() => ({
		clientTaskManager: {
			registerSiteKey: vi.fn().mockResolvedValue(undefined),
		},
	})),
}));

vi.mock("../../commands/validators.js", () => ({
	validateSiteKey: vi.fn((argv) => ({ sitekey: argv.sitekey })),
}));

describe("siteKeyRegister command", () => {
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
		const command = commandSiteKeyRegister(mockPair, mockConfig);
		expect(command).toHaveProperty("command");
		expect(command).toHaveProperty("describe");
		expect(command).toHaveProperty("handler");
		expect(command).toHaveProperty("builder");
		expect(command).toHaveProperty("middlewares");
		expect(command.command).toBe("site_key_register <sitekey> <tier>");
		expect(command.describe).toBe("Register a Site Key");
		expect(typeof command.handler).toBe("function");
		expect(typeof command.builder).toBe("function");
		expect(Array.isArray(command.middlewares)).toBe(true);
	});

		test("should use provided logger", async () => {
			const command = commandSiteKeyRegister(mockPair, mockConfig, {
				logger: mockLogger,
			});
			const argv = {
				sitekey: "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
				tier: Tier.Free,
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
			const command = commandSiteKeyRegister(mockPair, mockConfig);
			const argv = {
				sitekey: "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
				tier: Tier.Free,
				captcha_type: "image",
				frictionless_threshold: 0.5,
				pow_difficulty: 10,
				domains: ["example.com"],
				image_threshold: 0.8,
			};
			await expect(command.handler(argv as any)).resolves.not.toThrow();
		});

		test("should call registerSiteKey with correct parameters", async () => {
			const { Tasks } = await import("@prosopo/provider");
			const command = commandSiteKeyRegister(mockPair, mockConfig);
			const argv = {
				sitekey: "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
				tier: Tier.Free,
				captcha_type: "image",
				frictionless_threshold: 0.5,
				pow_difficulty: 10,
				domains: ["example.com"],
				image_threshold: 0.8,
			};
			await command.handler(argv as any);

			const tasksInstance = (Tasks as ReturnType<typeof vi.fn>).mock.results[0].value;
			expect(tasksInstance.clientTaskManager.registerSiteKey).toHaveBeenCalledWith(
				argv.sitekey,
				argv.tier,
				expect.objectContaining({
					captchaType: expect.anything(),
					frictionlessThreshold: 0.5,
					domains: ["example.com"],
					powDifficulty: 10,
					imageThreshold: 0.8,
				}),
			);
		});

		test("should handle errors gracefully", async () => {
			const { Tasks } = await import("@prosopo/provider");
			const mockError = new Error("Registration failed");
			(Tasks as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
				clientTaskManager: {
					registerSiteKey: vi.fn().mockRejectedValue(mockError),
				},
			}));

			const command = commandSiteKeyRegister(mockPair, mockConfig, {
				logger: mockLogger,
			});
			const argv = {
				sitekey: "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
				tier: Tier.Free,
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
		const command = commandSiteKeyRegister(mockPair, mockConfig);
		const mockYargs = {
			positional: vi.fn().mockReturnThis(),
			option: vi.fn().mockReturnThis(),
		};
		command.builder(mockYargs as any);
		expect(mockYargs.positional).toHaveBeenCalledWith("sitekey", expect.any(Object));
		expect(mockYargs.option).toHaveBeenCalledWith("tier", expect.any(Object));
		expect(mockYargs.option).toHaveBeenCalledWith("captcha_type", expect.any(Object));
		expect(mockYargs.option).toHaveBeenCalledWith("domains", expect.any(Object));
		expect(mockYargs.option).toHaveBeenCalledWith("frictionless_threshold", expect.any(Object));
		expect(mockYargs.option).toHaveBeenCalledWith("pow_difficulty", expect.any(Object));
		expect(mockYargs.option).toHaveBeenCalledWith("image_threshold", expect.any(Object));
	});
});

