import { describe, expect, test, vi, beforeEach } from "vitest";
import type { KeyringPair } from "@prosopo/types";
import type { ProsopoConfigOutput } from "@prosopo/types";
import { processArgs } from "../argv.js";

// Mock the commands module
vi.mock("../commands/index.js", () => ({
	commandEnsureIndexes: vi.fn(() => ({
		command: "ensure_indexes",
		describe: "Ensure indexes",
		handler: vi.fn(),
	})),
	commandEnsureExternalIndexes: vi.fn(() => ({
		command: "ensure_external_indexes",
		describe: "Ensure external indexes",
		handler: vi.fn(),
	})),
	commandProviderSetDataset: vi.fn(() => ({
		command: "provider_set_data_set",
		describe: "Set dataset",
		handler: vi.fn(),
	})),
	commandStoreCaptchasExternally: vi.fn(() => ({
		command: "store_captchas_externally",
		describe: "Store captchas",
		handler: vi.fn(),
	})),
	commandSiteKeyRegister: vi.fn(() => ({
		command: "site_key_register",
		describe: "Register site key",
		handler: vi.fn(),
	})),
	commandSiteKeyRegisterApi: vi.fn(() => ({
		command: "site_key_register_api",
		describe: "Register site key API",
		handler: vi.fn(),
	})),
	commandVersion: vi.fn(() => ({
		command: "version",
		describe: "Version",
		handler: vi.fn(),
	})),
}));

describe("argv", () => {
	let mockPair: KeyringPair;
	let mockAuthAccount: KeyringPair;
	let mockConfig: ProsopoConfigOutput;
	let mockYargs: any;

	beforeEach(() => {
		mockPair = {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
		} as KeyringPair;

		mockAuthAccount = {
			address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
		} as KeyringPair;

		mockConfig = {
			logLevel: "info",
		} as ProsopoConfigOutput;

		// Mock yargs
		mockYargs = {
			usage: vi.fn().mockReturnThis(),
			option: vi.fn().mockReturnThis(),
			command: vi.fn().mockReturnThis(),
			parse: vi.fn().mockResolvedValue({
				api: false,
				adminApi: false,
				_: [],
				$0: "test",
			}),
		};

		vi.doMock("yargs", () => ({
			default: vi.fn(() => mockYargs),
		}));
	});

	test("should process args with default api false", async () => {
		const args = ["node", "cli.js"];
		const result = await processArgs(args, mockPair, mockAuthAccount, mockConfig);
		expect(result).toHaveProperty("api");
		expect(result).toHaveProperty("_");
		expect(result).toHaveProperty("$0");
	});

	test("should process args with api flag", async () => {
		const args = ["node", "cli.js", "--api"];
		const result = await processArgs(args, mockPair, mockAuthAccount, mockConfig);
		expect(result).toHaveProperty("api");
	});

	test("should process args with adminApi flag", async () => {
		const args = ["node", "cli.js", "--adminApi"];
		const result = await processArgs(args, mockPair, mockAuthAccount, mockConfig);
		expect(result).toHaveProperty("adminApi");
	});

	test("should process args with command", async () => {
		const args = ["node", "cli.js", "version"];
		const result = await processArgs(args, mockPair, mockAuthAccount, mockConfig);
		expect(result).toHaveProperty("_");
	});
});
