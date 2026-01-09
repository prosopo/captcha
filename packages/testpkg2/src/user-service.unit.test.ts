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

import { describe, expect, test, beforeEach, vi } from "vitest";
import { UserService, ValidationError } from "./index.js";

describe("UserService", () => {
	let userService: UserService;
	let mockUser: any;

	beforeEach(() => {
		// Create a fresh UserService instance for each test
		userService = new UserService();

		// Mock user data for testing
		mockUser = {
			name: "John Doe",
			email: "john@example.com",
			age: 30,
		};
	});

	describe("User Creation", () => {
		test("creates user successfully with valid data", async () => {
			// Test successful user creation with valid input
			const createdUser = await userService.createUser(mockUser);

			expect(createdUser).toMatchObject({
				...mockUser,
				id: expect.any(String),
				createdAt: expect.any(Date),
			});
			expect(createdUser.id).toBeDefined();
			expect(createdUser.createdAt).toBeInstanceOf(Date);
		});

	test("throws ValidationError for invalid user data", async () => {
		// Test that invalid user data throws ValidationError
		const invalidUser = {
			name: "",
			email: "invalid-email",
			age: -5,
		};

		await expect(userService.createUser(invalidUser)).rejects.toThrow("Invalid user data");
	});

		test("generates unique IDs for different users", async () => {
			// Test that different users get unique IDs
			const user1 = await userService.createUser(mockUser);
			const user2 = await userService.createUser({
				name: "Jane Doe",
				email: "jane@example.com",
				age: 25,
			});

			expect(user1.id).not.toBe(user2.id);
		});
	});

	describe("User Retrieval", () => {
		test("retrieves user by ID after creation", async () => {
			// Test retrieving a user that was just created
			const createdUser = await userService.createUser(mockUser);
			const retrievedUser = await userService.getUserById(createdUser.id);

			expect(retrievedUser).toEqual(createdUser);
		});

		test("returns null for non-existent user", async () => {
			// Test that non-existent user returns null
			const retrievedUser = await userService.getUserById("non-existent-id");
			expect(retrievedUser).toBeNull();
		});
	});

	describe("User Updates", () => {
		test("updates user successfully with valid data", async () => {
			// Test successful user update
			const createdUser = await userService.createUser(mockUser);
			const updates = { name: "John Smith", age: 31 };

			const updatedUser = await userService.updateUser(createdUser.id, updates);

			expect(updatedUser).toMatchObject({
				...createdUser,
				...updates,
			});
		});

	test("throws ValidationError for invalid update data", async () => {
		// Test that invalid update data throws ValidationError
		const createdUser = await userService.createUser(mockUser);
		const invalidUpdates = { email: "invalid-email" };

		await expect(userService.updateUser(createdUser.id, invalidUpdates)).rejects.toThrow("Invalid update data");
	});

		test("returns null when updating non-existent user", async () => {
			// Test updating a user that doesn't exist
			const updates = { name: "New Name" };
			const result = await userService.updateUser("non-existent-id", updates);

			expect(result).toBeNull();
		});
	});

	describe("User Deletion", () => {
		test("deletes existing user successfully", async () => {
			// Test successful deletion of existing user
			const createdUser = await userService.createUser(mockUser);
			const deleted = await userService.deleteUser(createdUser.id);

			expect(deleted).toBe(true);

			// Verify user is no longer retrievable
			const retrievedUser = await userService.getUserById(createdUser.id);
			expect(retrievedUser).toBeNull();
		});

		test("returns false when deleting non-existent user", async () => {
			// Test deletion of non-existent user
			const deleted = await userService.deleteUser("non-existent-id");
			expect(deleted).toBe(false);
		});
	});

	describe("User Listing", () => {
		test("returns all users", async () => {
			// Test retrieving all users
			const user1 = await userService.createUser(mockUser);
			const user2 = await userService.createUser({
				name: "Jane Doe",
				email: "jane@example.com",
				age: 25,
			});

			const allUsers = await userService.getAllUsers();

			expect(allUsers).toHaveLength(2);
			expect(allUsers).toEqual(expect.arrayContaining([user1, user2]));
		});

		test("returns empty array when no users exist", async () => {
			// Test that empty user list returns empty array
			const allUsers = await userService.getAllUsers();
			expect(allUsers).toEqual([]);
		});
	});

	describe("User Status Filtering", () => {
		test("filters users by status correctly", async () => {
			// Test filtering users by status (active/inactive/suspended)
			const recentUser = await userService.createUser(mockUser);

			// Create a user that appears "inactive" (created long ago)
			const oldUserData = {
				name: "Old User",
				email: "old@example.com",
				age: 40,
			};
			const oldUser = await userService.createUser(oldUserData);
			// Manually set createdAt to make it appear old
			Object.defineProperty(oldUser, 'createdAt', {
				value: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
				writable: true,
			});

			const activeUsers = await userService.getUsersByStatus("active");
			const inactiveUsers = await userService.getUsersByStatus("inactive");

			expect(activeUsers).toContain(recentUser);
			expect(inactiveUsers).toContain(oldUser);
		});
	});

	describe("Database Configuration", () => {
		test("accepts database configuration", () => {
			// Test that UserService accepts database configuration
			const dbConfig = {
				host: "localhost",
				port: 27017,
				database: "test",
				username: "test",
				password: "test",
			};

			const serviceWithDb = new UserService(dbConfig);
			expect(serviceWithDb).toBeInstanceOf(UserService);
		});

		test("works without database configuration", () => {
			// Test that UserService works without database config
			const serviceWithoutDb = new UserService();
			expect(serviceWithoutDb).toBeInstanceOf(UserService);
		});
	});
});