import { describe, expect, it } from "vitest";
import { createTestPairs } from "../keyring/testingPairs.js";
import { getPair } from "./getPair.js";

const DEV_PHRASE =
	"bottom drive obey lake curtain smoke basket hold race lonely fit walk";

describe("getPair", () => {
	describe("with account only", () => {
		it("creates pair from address string", () => {
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const pair = getPair(undefined, testPairs.alice.address);
			expect(pair.address).toBe(testPairs.alice.address);
		});

		it("creates pair from address Uint8Array", () => {
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const pair = getPair(undefined, testPairs.alice.publicKey);
			expect(pair.publicKey).toEqual(testPairs.alice.publicKey);
		});
	});

	describe("with mnemonic string", () => {
		it("creates pair from valid mnemonic", () => {
			const pair = getPair(DEV_PHRASE);
			expect(pair).toBeDefined();
			expect(pair.address).toBeDefined();
		});

		it("creates pair from mnemonic with account", () => {
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const pair = getPair(DEV_PHRASE, testPairs.alice.address);
			expect(pair).toBeDefined();
		});

		it("creates pair from mnemonic with pairType", () => {
			const pair = getPair(DEV_PHRASE, undefined, "sr25519");
			expect(pair.type).toBe("sr25519");
		});

		it("creates pair from mnemonic with ss58Format", () => {
			const pair = getPair(DEV_PHRASE, undefined, "sr25519", 42);
			expect(pair).toBeDefined();
		});
	});

	describe("with hex seed string", () => {
		it("creates pair from hex seed", () => {
			const hexSeed = `0x${"00".repeat(32)}`;
			const pair = getPair(hexSeed);
			expect(pair).toBeDefined();
			expect(pair.address).toBeDefined();
		});

		it("creates pair from hex seed with account", () => {
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const hexSeed = `0x${"00".repeat(32)}`;
			const pair = getPair(hexSeed, testPairs.alice.address);
			expect(pair).toBeDefined();
		});
	});

	describe("with URI string", () => {
		it("creates pair from URI with path", () => {
			const pair = getPair(`${DEV_PHRASE}//test`);
			expect(pair).toBeDefined();
			expect(pair.address).toBeDefined();
		});

		it("creates pair from hard derivation path", () => {
			const pair = getPair("//test");
			expect(pair).toBeDefined();
		});
	});

	describe("with JSON string", () => {
		it("creates pair from JSON string", () => {
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const json = testPairs.alice.toJson();
			const jsonString = JSON.stringify(json);
			const pair = getPair(jsonString);
			expect(pair.address).toBe(testPairs.alice.address);
		});

		it("creates pair from JSON string with encrypted encoding", async () => {
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const json = testPairs.alice.toJson("testpass");
			const jsonString = JSON.stringify(json);
			const pair = getPair(jsonString);
			expect(pair.address).toBe(testPairs.alice.address);
		}, 30000);
	});

	describe("with JSON object", () => {
		it("creates pair from KeyringPair$Json", () => {
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const json = testPairs.alice.toJson();
			const pair = getPair(json);
			expect(pair.address).toBe(testPairs.alice.address);
		});

		it("creates pair from KeyringPair$Json with encrypted encoding", async () => {
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const json = testPairs.alice.toJson("testpass");
			const pair = getPair(json);
			expect(pair.address).toBe(testPairs.alice.address);
		}, 30000);
	});

	describe("error cases", () => {
		it("throws error when no secret and no account", () => {
			expect(() => {
				getPair();
			}).toThrow(/GENERAL.MISSING_SECRET_KEY/);
		});

		it("throws error for invalid JSON string", () => {
			expect(() => {
				getPair("invalid json");
			}).toThrow(/GENERAL.MISSING_SECRET_KEY/);
		});

		it("throws error for invalid object type", () => {
			expect(() => {
				// @ts-expect-error - Testing invalid object type
				getPair({});
			}).toThrow();
		});
	});

	describe("default parameters", () => {
		it("uses default pairType sr25519", () => {
			const pair = getPair(DEV_PHRASE);
			expect(pair.type).toBe("sr25519");
		});

		it("uses default ss58Format 42", () => {
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const pair = getPair(undefined, testPairs.alice.address);
			expect(pair).toBeDefined();
		});
	});
});
