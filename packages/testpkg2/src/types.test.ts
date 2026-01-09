// Copyright 2021-2026 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { describe, expect, test } from "vitest";
import type {
	User,
	DatabaseConfig,
	ValidationResult,
	UserStatus,
	DatabaseConnection
} from "./index.js";
import {
	UserService,
	DatabaseService,
	validateEmail,
	validateUser,
	sanitizeString,
	generateId,
	calculateAge,
	delay,
	ValidationError,
	DatabaseError,
	withRetry,
	memoize
} from "./index.js";

describe("Type Tests", () => {
	describe("User Interface", () => {
		test("User interface has correct required properties", () => {
			// Test that User interface requires id, name, email, and createdAt
			const user: User = {
				id: "test-id",
				name: "Test User",
				email: "test@example.com",
				createdAt: new Date(),
				age: 25, // optional
			};

			expect(user.id).toBe("test-id");
			expect(user.name).toBe("Test User");
			expect(user.email).toBe("test@example.com");
			expect(user.createdAt).toBeInstanceOf(Date);
			expect(user.age).toBe(25);
		});

		test("User interface allows optional age property", () => {
			// Test that age is optional in User interface
			const userWithoutAge: User = {
				id: "test-id-2",
				name: "Test User 2",
				email: "test2@example.com",
				createdAt: new Date(),
			};

			expect(userWithoutAge.age).toBeUndefined();
		});
	});

	describe("DatabaseConfig Interface", () => {
		test("DatabaseConfig interface has all required properties", () => {
			// Test that DatabaseConfig requires all connection properties
			const config: DatabaseConfig = {
				host: "localhost",
				port: 27017,
				database: "testdb",
				username: "testuser",
				password: "testpass",
			};

			expect(config.host).toBe("localhost");
			expect(config.port).toBe(27017);
			expect(config.database).toBe("testdb");
			expect(config.username).toBe("testuser");
			expect(config.password).toBe("testpass");
		});
	});

	describe("ValidationResult Interface", () => {
		test("ValidationResult interface structure", () => {
			// Test ValidationResult interface structure
			const validResult: ValidationResult = {
				isValid: true,
				errors: [],
			};

			const invalidResult: ValidationResult = {
				isValid: false,
				errors: ["Email is required", "Name is required"],
			};

			expect(validResult.isValid).toBe(true);
			expect(validResult.errors).toEqual([]);

			expect(invalidResult.isValid).toBe(false);
			expect(invalidResult.errors).toHaveLength(2);
		});
	});

	describe("UserStatus Union Type", () => {
		test("UserStatus accepts valid values", () => {
			// Test that UserStatus union type accepts valid string literals
			const active: UserStatus = "active";
			const inactive: UserStatus = "inactive";
			const suspended: UserStatus = "suspended";

			expect(active).toBe("active");
			expect(inactive).toBe("inactive");
			expect(suspended).toBe("suspended");
		});
	});

	describe("DatabaseConnection Interface", () => {
		test("DatabaseConnection provides access to database clients", () => {
			// Test that DatabaseConnection interface is properly typed
			// This test ensures the interface can be used in function parameters
			function useDatabaseConnection(connection: DatabaseConnection) {
				expect(connection.mongoClient).toBeDefined();
				expect(connection.mongoDb).toBeDefined();
				expect(connection.redisClient).toBeDefined();
				expect(connection.usersCollection).toBeDefined();
				return connection;
			}

			// Mock connection object for type testing
			const mockConnection = {
				mongoClient: {} as any,
				mongoDb: {} as any,
				redisClient: {} as any,
				usersCollection: {} as any,
			};

			expect(() => useDatabaseConnection(mockConnection)).not.toThrow();
		});
	});

	describe("Class Method Signatures", () => {
		test("UserService methods have correct signatures", async () => {
			// Test that UserService methods have correct type signatures
			const service = new UserService();

			// Test createUser method signature
			const createResult: Promise<User> = service.createUser({
				name: "Test",
				email: "test@example.com",
			});

			expect(createResult).toBeInstanceOf(Promise);

			// Test getUserById method signature
			const getResult: Promise<User | null> = service.getUserById("test-id");
			expect(getResult).toBeInstanceOf(Promise);

			// Test updateUser method signature
			const updateResult: Promise<User | null> = service.updateUser("test-id", {
				name: "Updated Name",
			});
			expect(updateResult).toBeInstanceOf(Promise);

			// Test deleteUser method signature
			const deleteResult: Promise<boolean> = service.deleteUser("test-id");
			expect(deleteResult).toBeInstanceOf(Promise);

			// Test getAllUsers method signature
			const getAllResult: Promise<User[]> = service.getAllUsers();
			expect(getAllResult).toBeInstanceOf(Promise);

			// Test getUsersByStatus method signature
			const getByStatusResult: Promise<User[]> = service.getUsersByStatus("active");
			expect(getByStatusResult).toBeInstanceOf(Promise);
		});

		test("DatabaseService methods have correct signatures", async () => {
			// Test that DatabaseService methods have correct type signatures
			const service = new DatabaseService();

			// Test that we can't call methods without connecting first
			await expect(service.createUser({} as any)).rejects.toThrow();

			// Note: We don't actually connect here since we're only testing types,
			// but this ensures the method signatures are correct
		});
	});

	describe("Function Parameter Types", () => {
	test("validateEmail accepts string and returns ValidationResult", () => {
		// Test function signature
		const result: ValidationResult = validateEmail("test@example.com");
		expect(typeof result.isValid).toBe("boolean");
		expect(Array.isArray(result.errors)).toBe(true);
	});

	test("validateUser accepts partial User and returns ValidationResult", () => {
		// Test function signature
		const partialUser: Partial<User> = {
			name: "Test",
			email: "test@example.com",
		};

		const result: ValidationResult = validateUser(partialUser);
		expect(typeof result.isValid).toBe("boolean");
		expect(Array.isArray(result.errors)).toBe(true);
	});

	test("sanitizeString accepts and returns string", () => {
		// Test function signature
		const result: string = sanitizeString("<script>test</script>");
		expect(typeof result).toBe("string");
	});

	test("generateId returns string", () => {
		// Test function signature
		const result: string = generateId();
		expect(typeof result).toBe("string");
	});

	test("calculateAge accepts Date and returns number", () => {
		// Test function signature
		const birthDate = new Date(2000, 0, 1);
		const result: number = calculateAge(birthDate);
		expect(typeof result).toBe("number");
	});

	test("delay accepts number and returns Promise<void>", async () => {
		// Test function signature
		const result: Promise<void> = delay(100);
		expect(result).toBeInstanceOf(Promise);

		// Actually await to ensure it resolves to void
		await result;
	});
	});

	describe("Error Classes", () => {
	test("ValidationError extends Error and has errors property", () => {
		// Test error classes
		const validationError = new ValidationError("Validation failed", ["Field is required"]);
		expect(validationError).toBeInstanceOf(Error);
		expect(validationError.message).toBe("Validation failed");
		expect(validationError.errors).toEqual(["Field is required"]);

		const dbError = new DatabaseError("Connection failed", "ECONNREFUSED");
		expect(dbError).toBeInstanceOf(Error);
		expect(dbError.message).toBe("Connection failed");
		expect(dbError.code).toBe("ECONNREFUSED");
	});
	});

	describe("Higher-Order Functions", () => {
	test("withRetry function signature", async () => {
		// Test withRetry higher-order function signature
		async function testFunction(param: string): Promise<string> {
			return `result-${param}`;
		}

		const retriedFunction = withRetry(testFunction, 3, 100);

		const result: Promise<string> = retriedFunction("test");
		expect(result).toBeInstanceOf(Promise);

		const actualResult = await result;
		expect(actualResult).toBe("result-test");
	});

	test("memoize function signature", () => {
		// Test memoize higher-order function signature
		function add(a: number, b: number): number {
			return a + b;
		}

		const memoizedAdd = memoize(add);

		const result: number = memoizedAdd(2, 3);
		expect(result).toBe(5);

		// Second call should return cached result
		const cachedResult: number = memoizedAdd(2, 3);
		expect(cachedResult).toBe(5);
	});
	});
});