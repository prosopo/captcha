import { describe, expect, it } from "vitest";
import { Pairs } from "./pairs.js";
import { createTestPairs } from "./testingPairs.js";

describe("Pairs", () => {
	describe("add", () => {
		it("adds a pair to the collection", () => {
			const pairs = new Pairs();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const added = pairs.add(testPairs.alice);
			expect(added).toBe(testPairs.alice);
			expect(pairs.all()).toHaveLength(1);
			expect(pairs.all()[0]).toBe(testPairs.alice);
		});

		it("returns the added pair", () => {
			const pairs = new Pairs();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			const returned = pairs.add(testPairs.alice);
			expect(returned).toBe(testPairs.alice);
		});

		it("replaces pair with same address", () => {
			const pairs = new Pairs();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			pairs.add(testPairs.alice);
			const newPair = createTestPairs({ type: "sr25519" }, false).alice;
			pairs.add(newPair);
			expect(pairs.all()).toHaveLength(1);
			expect(pairs.all()[0]).toBe(newPair);
		});
	});

	describe("all", () => {
		it("returns empty array when no pairs", () => {
			const pairs = new Pairs();
			expect(pairs.all()).toEqual([]);
		});

		it("returns all pairs", () => {
			const pairs = new Pairs();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			pairs.add(testPairs.alice);
			pairs.add(testPairs.bob);
			const all = pairs.all();
			expect(all).toHaveLength(2);
			expect(all).toContain(testPairs.alice);
			expect(all).toContain(testPairs.bob);
		});
	});

	describe("get", () => {
		it("retrieves pair by address string", () => {
			const pairs = new Pairs();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			pairs.add(testPairs.alice);
			const retrieved = pairs.get(testPairs.alice.address);
			expect(retrieved).toBe(testPairs.alice);
		});

		it("retrieves pair by address Uint8Array", () => {
			const pairs = new Pairs();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			pairs.add(testPairs.alice);
			const retrieved = pairs.get(testPairs.alice.publicKey);
			expect(retrieved).toBe(testPairs.alice);
		});

		it("retrieves pair by hex string", () => {
			const pairs = new Pairs();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			pairs.add(testPairs.alice);
			const hexAddress = `0x${Array.from(testPairs.alice.publicKey)
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("")}`;
			const retrieved = pairs.get(hexAddress);
			expect(retrieved).toBe(testPairs.alice);
		});

		it("throws error for non-existent address", () => {
			const pairs = new Pairs();
			expect(() => {
				pairs.get("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY");
			}).toThrow(/Unable to retrieve keypair/);
		});

		it("throws error with hex address in message", () => {
			const pairs = new Pairs();
			const hexAddress = `0x${"00".repeat(32)}`;
			expect(() => {
				pairs.get(hexAddress);
			}).toThrow(/Unable to retrieve keypair/);
		});
	});

	describe("remove", () => {
		it("removes pair by address string", () => {
			const pairs = new Pairs();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			pairs.add(testPairs.alice);
			expect(pairs.all()).toHaveLength(1);
			pairs.remove(testPairs.alice.address);
			expect(pairs.all()).toHaveLength(0);
		});

		it("removes pair by address Uint8Array", () => {
			const pairs = new Pairs();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			pairs.add(testPairs.alice);
			expect(pairs.all()).toHaveLength(1);
			pairs.remove(testPairs.alice.publicKey);
			expect(pairs.all()).toHaveLength(0);
		});

		it("removes pair by hex string", () => {
			const pairs = new Pairs();
			const testPairs = createTestPairs({ type: "sr25519" }, false);
			pairs.add(testPairs.alice);
			const hexAddress = `0x${Array.from(testPairs.alice.publicKey)
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("")}`;
			expect(pairs.all()).toHaveLength(1);
			pairs.remove(hexAddress);
			expect(pairs.all()).toHaveLength(0);
		});

		it("does not throw error when removing non-existent pair", () => {
			const pairs = new Pairs();
			expect(() => {
				pairs.remove("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY");
			}).not.toThrow();
		});
	});
});
