import type { KeyringPair } from "@polkadot/keyring/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { Address4 } from "ip-address";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FrictionlessManager } from "../../../../tasks/frictionless/frictionlessTasks.js";

describe("Frictionless Task Manager", () => {
	let db: IProviderDatabase;
	let pair: KeyringPair;
	// biome-ignore lint/suspicious/noExplicitAny: testing purposes
	let captchaConfig: any;
	let frictionlessTaskManager: FrictionlessManager;

	beforeEach(() => {
		db = {
			getIPBlockRuleRecord: vi.fn((ip: bigint) => {
				const ipBlockRules = [
					{
						_id: 1,
						ip: 16843009.0,
						dappAccount: "testDapp",
						global: false,
						hardBlock: false,
						type: "ipAddress",
					},
					{
						_id: 2,
						ip: 33686018.0,
						global: true,
						hardBlock: false,
						type: "ipAddress",
					},
				];

				return ipBlockRules.find((rule) => BigInt(rule.ip) === ip);
			}),

			getUserBlockRuleRecord: vi.fn((user: string, dapp: string) => {
				const userBlockRules = [
					{
						_id: 1,
						userAccount: "testUser1",
						dappAccount: "testDapp",
						global: false,
						hardBlock: false,
						type: "user",
					},
				];
				return userBlockRules.find(
					(rule) => rule.userAccount === user && rule.dappAccount === dapp,
				);
			}),
		} as unknown as IProviderDatabase;

		pair = {
			sign: vi.fn(),
			address: "testAddress",
		} as unknown as KeyringPair;

		captchaConfig = {
			solved: { count: 5 },
			unsolved: { count: 5 },
			lRules: { en: 1 },
		};

		frictionlessTaskManager = new FrictionlessManager(captchaConfig, pair, db);

		vi.clearAllMocks();
	});

	describe("checkIpRules", () => {
		it("should return true if an ip has a rule against it and a dapp", async () => {
			const result = await frictionlessTaskManager.checkIpRules(
				new Address4("1.1.1.1"), // 16843009.0
				"testDapp",
			);
			expect(result).toBe(true);
		});
		it("should return true if an ip has a rule against it but no dapp", async () => {
			const result = await frictionlessTaskManager.checkIpRules(
				new Address4("2.2.2.2"), // 33686018.0
				"testDapp",
			);
			expect(result).toBe(true);
		});
		it("should return false for an ip with no rule", async () => {
			const result = await frictionlessTaskManager.checkIpRules(
				new Address4("3.3.3.3"),
				"testDapp",
			);
			expect(result).toBe(false);
		});
	});

	describe("checkUserRules", () => {
		it("should return true if a user has a rule against it and a dapp", async () => {
			const result = await frictionlessTaskManager.checkUserRules(
				"testUser1",
				"testDapp",
			);
			expect(result).toBe(true);
		});
		it("should return true if a user has no rule against it", async () => {
			const result = await frictionlessTaskManager.checkUserRules(
				"testUser2",
				"testDapp",
			);
			expect(result).toBe(false);
		});
	});

	describe("checkLangRules", () => {
		it("should return an inflated score if a lang rule is set", async () => {
			const result = frictionlessTaskManager.checkLangRules("en");
			expect(result).toBe(captchaConfig.lRules.en);
		});
		it("should return zero score if a lang rule is not set", async () => {
			const result = frictionlessTaskManager.checkLangRules("de");
			expect(result).toBe(0);
		});
	});
});
