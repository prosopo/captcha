import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { ProsopoEnvError } from "@prosopo/common";
import { getAddress, getPassword, getSecret, getDB } from "../process.env.js";

describe("process.env", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// Reset process.env for each test
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("getAddress", () => {
		test("should return address for default PROVIDER", () => {
			process.env.PROSOPO_PROVIDER_ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8";
			const result = getAddress();
			expect(result).toBe("5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8");
		});

		test("should return address for specified who parameter", () => {
			process.env.PROSOPO_ADMIN_ADDRESS = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";
			const result = getAddress("admin");
			expect(result).toBe("5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty");
		});

		test("should handle uppercase who parameter", () => {
			process.env.PROSOPO_USER_ADDRESS = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJpX9pVb9Yj";
			const result = getAddress("USER");
			expect(result).toBe("5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJpX9pVb9Yj");
		});

		test("should handle lowercase who parameter", () => {
			process.env.PROSOPO_CLIENT_ADDRESS = "5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY";
			const result = getAddress("client");
			expect(result).toBe("5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY");
		});

		test("should return undefined when address is not set", () => {
			delete process.env.PROSOPO_PROVIDER_ADDRESS;
			const result = getAddress();
			expect(result).toBeUndefined();
		});
	});

	describe("getPassword", () => {
		test("should return password for default PROVIDER", () => {
			process.env.PROSOPO_PROVIDER_ACCOUNT_PASSWORD = "test-password";
			const result = getPassword();
			expect(result).toBe("test-password");
		});

		test("should return password for specified who parameter", () => {
			process.env.PROSOPO_ADMIN_ACCOUNT_PASSWORD = "admin-password";
			const result = getPassword("admin");
			expect(result).toBe("admin-password");
		});

		test("should handle uppercase who parameter", () => {
			process.env.PROSOPO_USER_ACCOUNT_PASSWORD = "user-password";
			const result = getPassword("USER");
			expect(result).toBe("user-password");
		});

		test("should return undefined when password is not set", () => {
			delete process.env.PROSOPO_PROVIDER_ACCOUNT_PASSWORD;
			const result = getPassword();
			expect(result).toBeUndefined();
		});
	});

	describe("getSecret", () => {
		test("should return mnemonic for default PROVIDER", () => {
			process.env.PROSOPO_PROVIDER_MNEMONIC = "test mnemonic phrase";
			const result = getSecret();
			expect(result).toBe("test mnemonic phrase");
		});

		test("should return seed when mnemonic is not set", () => {
			delete process.env.PROSOPO_PROVIDER_MNEMONIC;
			process.env.PROSOPO_PROVIDER_SEED = "test seed";
			const result = getSecret();
			expect(result).toBe("test seed");
		});

		test("should return URI when mnemonic and seed are not set", () => {
			delete process.env.PROSOPO_PROVIDER_MNEMONIC;
			delete process.env.PROSOPO_PROVIDER_SEED;
			process.env.PROSOPO_PROVIDER_URI = "//Alice";
			const result = getSecret();
			expect(result).toBe("//Alice");
		});

		test("should return JSON when mnemonic, seed, and URI are not set", () => {
			delete process.env.PROSOPO_PROVIDER_MNEMONIC;
			delete process.env.PROSOPO_PROVIDER_SEED;
			delete process.env.PROSOPO_PROVIDER_URI;
			process.env.PROSOPO_PROVIDER_JSON = '{"encoded":"test"}';
			const result = getSecret();
			expect(result).toBe('{"encoded":"test"}');
		});

		test("should prioritize mnemonic over seed", () => {
			process.env.PROSOPO_PROVIDER_MNEMONIC = "mnemonic";
			process.env.PROSOPO_PROVIDER_SEED = "seed";
			const result = getSecret();
			expect(result).toBe("mnemonic");
		});

		test("should prioritize seed over URI", () => {
			delete process.env.PROSOPO_PROVIDER_MNEMONIC;
			process.env.PROSOPO_PROVIDER_SEED = "seed";
			process.env.PROSOPO_PROVIDER_URI = "//Alice";
			const result = getSecret();
			expect(result).toBe("seed");
		});

		test("should return undefined when no secret is set", () => {
			delete process.env.PROSOPO_PROVIDER_MNEMONIC;
			delete process.env.PROSOPO_PROVIDER_SEED;
			delete process.env.PROSOPO_PROVIDER_URI;
			delete process.env.PROSOPO_PROVIDER_JSON;
			const result = getSecret();
			expect(result).toBeUndefined();
		});

		test("should handle specified who parameter", () => {
			process.env.PROSOPO_ADMIN_MNEMONIC = "admin mnemonic";
			const result = getSecret("admin");
			expect(result).toBe("admin mnemonic");
		});
	});

	describe("getDB", () => {
		test("should return database host when set", () => {
			process.env.PROSOPO_DATABASE_HOST = "mongodb://localhost:27017";
			const result = getDB();
			expect(result).toBe("mongodb://localhost:27017");
		});

		test("should throw ProsopoEnvError when database host is not set", () => {
			delete process.env.PROSOPO_DATABASE_HOST;
			expect(() => getDB()).toThrow(ProsopoEnvError);
			expect(() => getDB()).toThrow("DATABASE_HOST_UNDEFINED");
		});

		test("should throw ProsopoEnvError when set to empty string", () => {
			process.env.PROSOPO_DATABASE_HOST = "";
			expect(() => getDB()).toThrow(ProsopoEnvError);
			expect(() => getDB()).toThrow("DATABASE_HOST_UNDEFINED");
		});
	});
});





