import type { KeyringPair$Json, KeyringPair$Meta } from "@prosopo/types";
import { sr25519FromSeed } from "@prosopo/util-crypto";
import { describe, expect, it } from "vitest";
import { Keyring } from "./keyring.js";
import { createTestPairs } from "./testingPairs.js";

const DEV_PHRASE =
	"bottom drive obey lake curtain smoke basket hold race lonely fit walk";

describe("Keyring", () => {
	describe("constructor", () => {
		it("creates keyring with default options", () => {
			const keyring = new Keyring();
			expect(keyring.type).toBe("sr25519");
			expect(keyring.getPairs()).toHaveLength(0);
		});

		it("creates keyring with explicit sr25519 type", () => {
			const keyring = new Keyring({ type: "sr25519" });
			expect(keyring.type).toBe("sr25519");
		});

		it("creates keyring with ss58Format", () => {
			const keyring = new Keyring({ ss58Format: 42 });
			expect(keyring.type).toBe("sr25519");
		});

		it("throws error for unsupported keyring type", () => {
			expect(() => {
				// @ts-expect-error - Testing invalid type
				new Keyring({ type: "ed25519" });
			}).toThrow(/Expected a keyring type of either 'sr25519'/);
		});

		it("defaults to sr25519 when type is undefined", () => {
			// @ts-expect-error - Testing undefined type
			const keyring = new Keyring({ type: undefined });
			expect(keyring.type).toBe("sr25519");
		});
	});

	describe("getters", () => {
		it("returns type", () => {
			const keyring = new Keyring();
			expect(keyring.type).toBe("sr25519");
		});

		it("returns pairs via getter", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(DEV_PHRASE);
			expect(keyring.pairs).toHaveLength(1);
			expect(keyring.pairs[0]).toBe(pair);
		});

		it("returns publicKeys via getter", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(DEV_PHRASE);
			expect(keyring.publicKeys).toHaveLength(1);
			expect(keyring.publicKeys[0]).toEqual(pair.publicKey);
		});
	});

	describe("addPair", () => {
		it("adds a pair to the keyring", () => {
			const keyring = new Keyring();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const pair = keyring.addPair(testPairs.alice);
			expect(pair).toBe(testPairs.alice);
			expect(keyring.getPairs()).toHaveLength(1);
			expect(keyring.getPair(testPairs.alice.address)).toBe(testPairs.alice);
		});

		it("returns the added pair", () => {
			const keyring = new Keyring();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const returned = keyring.addPair(testPairs.alice);
			expect(returned).toBe(testPairs.alice);
		});
	});

	describe("addFromAddress", () => {
		it("adds pair from address string", () => {
			const keyring = new Keyring();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const address = testPairs.alice.address;
			const pair = keyring.addFromAddress(address);
			expect(keyring.getPairs()).toHaveLength(1);
			expect(pair.address).toBe(address);
		});

		it("adds pair from address Uint8Array", () => {
			const keyring = new Keyring();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const publicKey = testPairs.alice.publicKey;
			const pair = keyring.addFromAddress(publicKey);
			expect(keyring.getPairs()).toHaveLength(1);
			expect(pair.publicKey).toEqual(publicKey);
		});

		it("adds pair with metadata", () => {
			const keyring = new Keyring();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const address = testPairs.alice.address;
			const meta: KeyringPair$Meta = { name: "test" };
			const pair = keyring.addFromAddress(address, meta);
			expect(pair.meta.name).toBe("test");
		});

		it("adds pair with encoded data", () => {
			const keyring = new Keyring();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const address = testPairs.alice.address;
			const encoded = testPairs.alice.encodePkcs8();
			const pair = keyring.addFromAddress(address, {}, encoded);
			expect(pair).toBeDefined();
		});

		it("adds pair with explicit type", () => {
			const keyring = new Keyring();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const address = testPairs.alice.address;
			const pair = keyring.addFromAddress(address, {}, null, "sr25519");
			expect(pair.type).toBe("sr25519");
		});
	});

	describe("addFromJson", () => {
		it("adds pair from JSON", () => {
			const keyring = new Keyring();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const json = testPairs.alice.toJson();
			const pair = keyring.addFromJson(json);
			expect(keyring.getPairs()).toHaveLength(1);
			expect(pair.address).toBe(testPairs.alice.address);
		});

		it("adds pair from JSON with passphrase", async () => {
			const keyring = new Keyring();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const json = testPairs.alice.toJson("testpass");
			const pair = keyring.addFromJson(json);
			expect(keyring.getPairs()).toHaveLength(1);
			expect(pair.address).toBe(testPairs.alice.address);
		}, 30000);
	});

	describe("addFromMnemonic", () => {
		it("adds pair from mnemonic", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(DEV_PHRASE);
			expect(keyring.getPairs()).toHaveLength(1);
			expect(pair).toBeDefined();
			expect(pair.address).toBeDefined();
		});

		it("adds pair from mnemonic with metadata", () => {
			const keyring = new Keyring();
			const meta: KeyringPair$Meta = { name: "test" };
			const pair = keyring.addFromMnemonic(DEV_PHRASE, meta);
			expect(pair.meta.name).toBe("test");
		});

		it("adds pair from mnemonic with explicit type", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(DEV_PHRASE, {}, "sr25519");
			expect(pair.type).toBe("sr25519");
		});
	});

	describe("addFromPair", () => {
		it("adds pair from keypair", () => {
			const keyring = new Keyring();
			const seed = new Uint8Array(32).fill(1);
			const keypair = sr25519FromSeed(seed);
			const pair = keyring.addFromPair(keypair);
			expect(keyring.getPairs()).toHaveLength(1);
			expect(pair.publicKey).toEqual(keypair.publicKey);
		});

		it("adds pair from keypair with metadata", () => {
			const keyring = new Keyring();
			const seed = new Uint8Array(32).fill(1);
			const keypair = sr25519FromSeed(seed);
			const meta: KeyringPair$Meta = { name: "test" };
			const pair = keyring.addFromPair(keypair, meta);
			expect(pair.meta.name).toBe("test");
		});
	});

	describe("addFromSeed", () => {
		it("adds pair from seed", () => {
			const keyring = new Keyring();
			const seed = new Uint8Array(32).fill(1);
			const pair = keyring.addFromSeed(seed);
			expect(keyring.getPairs()).toHaveLength(1);
			expect(pair).toBeDefined();
		});

		it("adds pair from seed with metadata", () => {
			const keyring = new Keyring();
			const seed = new Uint8Array(32).fill(1);
			const meta: KeyringPair$Meta = { name: "test" };
			const pair = keyring.addFromSeed(seed, meta);
			expect(pair.meta.name).toBe("test");
		});

		it("adds pair from seed with explicit type", () => {
			const keyring = new Keyring();
			const seed = new Uint8Array(32).fill(1);
			const pair = keyring.addFromSeed(seed, {}, "sr25519");
			expect(pair.type).toBe("sr25519");
		});
	});

	describe("addFromUri", () => {
		it("adds pair from URI", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromUri(DEV_PHRASE);
			expect(keyring.getPairs()).toHaveLength(1);
			expect(pair).toBeDefined();
		});

		it("adds pair from URI with path", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromUri(`${DEV_PHRASE}//test`);
			expect(keyring.getPairs()).toHaveLength(1);
			expect(pair).toBeDefined();
		});

		it("adds pair from URI with hard derivation", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromUri("//test");
			expect(keyring.getPairs()).toHaveLength(1);
			expect(pair).toBeDefined();
		});

		it("adds pair from URI with metadata", () => {
			const keyring = new Keyring();
			const meta: KeyringPair$Meta = { name: "test" };
			const pair = keyring.addFromUri(DEV_PHRASE, meta);
			expect(pair.meta.name).toBe("test");
		});

		it("adds pair from hex seed URI", () => {
			const keyring = new Keyring();
			const hexSeed = `0x${"00".repeat(32)}`;
			const pair = keyring.addFromUri(hexSeed);
			expect(keyring.getPairs()).toHaveLength(1);
			expect(pair).toBeDefined();
		});

		it("adds pair from short string seed", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromUri("short");
			expect(keyring.getPairs()).toHaveLength(1);
			expect(pair).toBeDefined();
		});

		it("throws error for invalid phrase length", () => {
			const keyring = new Keyring();
			const longPhrase = "a".repeat(33);
			expect(() => {
				keyring.addFromUri(longPhrase);
			}).toThrow(/specified phrase is not a valid mnemonic/);
		});
	});

	describe("createFromJson", () => {
		it("creates pair from JSON with version 3", () => {
			const keyring = new Keyring();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const json = testPairs.alice.toJson();
			const pair = keyring.createFromJson(json);
			expect(pair.address).toBe(testPairs.alice.address);
		});

		it("creates pair from JSON with hex address", () => {
			const keyring = new Keyring();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const json = testPairs.alice.toJson();
			const hexAddress = `0x${Array.from(testPairs.alice.publicKey)
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("")}`;
			const jsonWithHex: KeyringPair$Json = {
				...json,
				address: hexAddress,
			};
			const pair = keyring.createFromJson(jsonWithHex);
			expect(pair).toBeDefined();
		});

		it("creates pair from JSON with hex encoded", () => {
			const keyring = new Keyring();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const encoded = testPairs.alice.encodePkcs8();
			const hexEncoded = `0x${Array.from(encoded)
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("")}`;
			const json: KeyringPair$Json = {
				address: testPairs.alice.address,
				encoded: hexEncoded,
				encoding: {
					content: ["pkcs8", "sr25519"],
					type: ["none"],
					version: "3",
				},
				meta: {},
			};
			const pair = keyring.createFromJson(json);
			expect(pair).toBeDefined();
		});

		it("creates pair from JSON with version 0", () => {
			const keyring = new Keyring();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const json: KeyringPair$Json = {
				address: testPairs.alice.address,
				encoded: "",
				encoding: {
					content: "pkcs8",
					type: "none",
					version: "0",
				},
				meta: {},
			};
			const pair = keyring.createFromJson(json);
			expect(pair).toBeDefined();
		});

		it("creates pair from JSON with array type", () => {
			const keyring = new Keyring();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const json = testPairs.alice.toJson();
			const pair = keyring.createFromJson(json);
			expect(pair).toBeDefined();
		});

		it("throws error for version 3 with non-pkcs8 content", () => {
			const keyring = new Keyring();
			const json: KeyringPair$Json = {
				address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				encoded: "",
				encoding: {
					content: ["other", "sr25519"],
					type: ["none"],
					version: "3",
				},
				meta: {},
			};
			expect(() => {
				keyring.createFromJson(json);
			}).toThrow(/Unable to decode non-pkcs8 type/);
		});

		it("throws error for unknown crypto type", () => {
			const keyring = new Keyring();
			const json: KeyringPair$Json = {
				address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				encoded: "",
				encoding: {
					content: ["pkcs8", "ed25519"],
					type: ["none"],
					version: "3",
				},
				meta: {},
			};
			expect(() => {
				keyring.createFromJson(json);
			}).toThrow(/Unknown crypto type/);
		});

		it("throws error when cryptoType is undefined in version 0", () => {
			const keyring = new Keyring();
			const json: KeyringPair$Json = {
				address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				encoded: "",
				encoding: {
					content: "pkcs8",
					type: "none",
					version: "0",
				},
				meta: {},
			};
			expect(() => {
				keyring.createFromJson(json);
			}).toThrow(/cryptoType is undefined/);
		});

		it("throws error for ethereum type in URI", () => {
			const keyring = new Keyring();
			expect(() => {
				keyring.addFromUri(DEV_PHRASE, {}, "ethereum");
			}).toThrow(/Not implemented - Prosopo Keyring supports sr25519 only/);
		});
	});

	describe("createFromPair", () => {
		it("creates pair from keypair", () => {
			const keyring = new Keyring();
			const seed = new Uint8Array(32).fill(1);
			const keypair = sr25519FromSeed(seed);
			const pair = keyring.createFromPair(keypair);
			expect(pair.publicKey).toEqual(keypair.publicKey);
			expect(pair.type).toBe("sr25519");
		});

		it("creates pair from keypair with metadata", () => {
			const keyring = new Keyring();
			const seed = new Uint8Array(32).fill(1);
			const keypair = sr25519FromSeed(seed);
			const meta: KeyringPair$Meta = { name: "test" };
			const pair = keyring.createFromPair(keypair, meta);
			expect(pair.meta.name).toBe("test");
		});

		it("creates pair from keypair with explicit type", () => {
			const keyring = new Keyring();
			const seed = new Uint8Array(32).fill(1);
			const keypair = sr25519FromSeed(seed);
			const pair = keyring.createFromPair(keypair, {}, "sr25519");
			expect(pair.type).toBe("sr25519");
		});
	});

	describe("createFromUri", () => {
		it("creates pair from URI", () => {
			const keyring = new Keyring();
			const pair = keyring.createFromUri(DEV_PHRASE);
			expect(pair).toBeDefined();
			expect(pair.address).toBeDefined();
		});

		it("creates pair from URI with path", () => {
			const keyring = new Keyring();
			const pair = keyring.createFromUri(`${DEV_PHRASE}//test`);
			expect(pair).toBeDefined();
		});

		it("creates pair from hard derivation path", () => {
			const keyring = new Keyring();
			const pair = keyring.createFromUri("//test");
			expect(pair).toBeDefined();
		});

		it("creates pair from URI with metadata", () => {
			const keyring = new Keyring();
			const meta: KeyringPair$Meta = { name: "test" };
			const pair = keyring.createFromUri(DEV_PHRASE, meta);
			expect(pair.meta.name).toBe("test");
		});
	});

	describe("encodeAddress", () => {
		it("encodes address from Uint8Array", () => {
			const keyring = new Keyring();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const encoded = keyring.encodeAddress(testPairs.alice.publicKey);
			expect(encoded).toBe(testPairs.alice.address);
		});

		it("encodes address from string", () => {
			const keyring = new Keyring();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const encoded = keyring.encodeAddress(testPairs.alice.address);
			expect(encoded).toBe(testPairs.alice.address);
		});

		it("encodes address with custom ss58Format", () => {
			const keyring = new Keyring({ ss58Format: 0 });
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const encoded = keyring.encodeAddress(testPairs.alice.publicKey, 0);
			expect(encoded).toBeDefined();
		});

		it("uses instance ss58Format when not provided", () => {
			const keyring = new Keyring({ ss58Format: 42 });
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const encoded = keyring.encodeAddress(testPairs.alice.publicKey);
			expect(encoded).toBeDefined();
		});
	});

	describe("getPair", () => {
		it("retrieves pair by address string", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(DEV_PHRASE);
			const retrieved = keyring.getPair(pair.address);
			expect(retrieved).toBe(pair);
		});

		it("retrieves pair by address Uint8Array", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(DEV_PHRASE);
			const retrieved = keyring.getPair(pair.publicKey);
			expect(retrieved).toBe(pair);
		});

		it("throws error for non-existent address", () => {
			const keyring = new Keyring();
			expect(() => {
				keyring.getPair("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY");
			}).toThrow(/Unable to retrieve keypair/);
		});
	});

	describe("getPairs", () => {
		it("returns empty array when no pairs", () => {
			const keyring = new Keyring();
			expect(keyring.getPairs()).toEqual([]);
		});

		it("returns all pairs", () => {
			const keyring = new Keyring();
			const pair1 = keyring.addFromMnemonic(DEV_PHRASE);
			const pair2 = keyring.addFromMnemonic(
				"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			);
			const pairs = keyring.getPairs();
			expect(pairs).toHaveLength(2);
			expect(pairs).toContain(pair1);
			expect(pairs).toContain(pair2);
		});
	});

	describe("getPublicKeys", () => {
		it("returns empty array when no pairs", () => {
			const keyring = new Keyring();
			expect(keyring.getPublicKeys()).toEqual([]);
		});

		it("returns all public keys", () => {
			const keyring = new Keyring();
			const pair1 = keyring.addFromMnemonic(DEV_PHRASE);
			const pair2 = keyring.addFromMnemonic(
				"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			);
			const publicKeys = keyring.getPublicKeys();
			expect(publicKeys).toHaveLength(2);
			expect(publicKeys).toContainEqual(pair1.publicKey);
			expect(publicKeys).toContainEqual(pair2.publicKey);
		});
	});

	describe("removePair", () => {
		it("removes pair by address string", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(DEV_PHRASE);
			expect(keyring.getPairs()).toHaveLength(1);
			keyring.removePair(pair.address);
			expect(keyring.getPairs()).toHaveLength(0);
		});

		it("removes pair by address Uint8Array", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(DEV_PHRASE);
			expect(keyring.getPairs()).toHaveLength(1);
			keyring.removePair(pair.publicKey);
			expect(keyring.getPairs()).toHaveLength(0);
		});

		it("removes pair without error if not exists", () => {
			const keyring = new Keyring();
			expect(() => {
				keyring.removePair("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY");
			}).not.toThrow();
		});
	});

	describe("setSS58Format", () => {
		it("sets ss58 format", () => {
			const keyring = new Keyring();
			keyring.setSS58Format(0);
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const encoded = keyring.encodeAddress(testPairs.alice.publicKey);
			expect(encoded).toBeDefined();
		});
	});

	describe("toJson", () => {
		it("returns JSON for pair without passphrase", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(DEV_PHRASE);
			const json = keyring.toJson(pair.address);
			expect(json.address).toBe(pair.address);
			expect(json.meta).toBeDefined();
			expect(json.encoded).toBeDefined();
			expect(json.encoding).toBeDefined();
		});

		it("returns JSON for pair with passphrase", async () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(DEV_PHRASE);
			const json = keyring.toJson(pair.address, "testpass");
			expect(json.address).toBe(pair.address);
			expect(json.encoding.type).toContain("scrypt");
		}, 30000);

		it("throws error for non-existent address", () => {
			const keyring = new Keyring();
			expect(() => {
				keyring.toJson("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY");
			}).toThrow(/Unable to retrieve keypair/);
		});
	});

	describe("decodeAddress", () => {
		it("decodes address string", () => {
			const keyring = new Keyring();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const decoded = keyring.decodeAddress(testPairs.alice.address);
			expect(decoded).toEqual(testPairs.alice.publicKey);
		});

		it("decodes address Uint8Array", () => {
			const keyring = new Keyring();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const decoded = keyring.decodeAddress(testPairs.alice.publicKey);
			expect(decoded).toEqual(testPairs.alice.publicKey);
		});
	});
});
