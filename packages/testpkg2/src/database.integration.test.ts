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

import { describe, expect, test, beforeAll, afterAll, beforeEach } from "vitest";
import { DatabaseService } from "./database.js";
import { startTestContainers, stopTestContainers } from "./test-setup.js";

describe("DatabaseService Integration Tests", () => {
	let databaseService: DatabaseService;
	let mongoUrl: string;
	let redisUrl: string;

	beforeAll(async () => {
		// Start test containers before all tests
		const containers = await startTestContainers();
		mongoUrl = containers.mongoUrl;
		redisUrl = containers.redisUrl;
	}, 60000); // 60 second timeout for container startup

	afterAll(async () => {
		// Stop test containers after all tests
		await stopTestContainers();
	}, 30000);

	beforeEach(async () => {
		// Create a fresh database service instance for each test
		databaseService = new DatabaseService();
		await databaseService.connect(mongoUrl, redisUrl);
	});

	afterEach(async () => {
		// Clean up database after each test
		if (databaseService) {
			await databaseService.close();
		}
	});

	describe("Database Connection", () => {
		test("connects to MongoDB and Redis successfully", async () => {
			// Test that database service can connect to both databases
			expect(databaseService).toBeDefined();

			// Verify connection by checking if we can get user count (should be 0 initially)
			const userCount = await databaseService.getUserCount();
			expect(userCount).toBe(0);
		});

		test("handles connection errors gracefully", async () => {
			// Test error handling for invalid connections
			const invalidService = new DatabaseService();

			await expect(invalidService.createUser({
				id: "test",
				name: "Test",
				email: "test@example.com",
				createdAt: new Date(),
			})).rejects.toThrow("Database not connected");
		});
	});

	describe("User CRUD Operations", () => {
		test("creates and retrieves user successfully", async () => {
			// Test full create and retrieve cycle with real databases
			const testUser = {
				id: "test-user-1",
				name: "Integration Test User",
				email: "integration@example.com",
				age: 28,
				createdAt: new Date(),
			};

			// Create user
			await databaseService.createUser(testUser);

			// Retrieve user
			const retrievedUser = await databaseService.getUserById(testUser.id);

			expect(retrievedUser).toEqual(testUser);

			// Verify user count increased
			const userCount = await databaseService.getUserCount();
			expect(userCount).toBe(1);
		});

		test("updates user successfully", async () => {
			// Test user update functionality
			const originalUser = {
				id: "test-user-2",
				name: "Original Name",
				email: "original@example.com",
				age: 25,
				createdAt: new Date(),
			};

			// Create user
			await databaseService.createUser(originalUser);

			// Update user
			const updates = {
				name: "Updated Name",
				age: 26,
			};

			const updatedUser = await databaseService.updateUser(originalUser.id, updates);

			expect(updatedUser).toMatchObject({
				...originalUser,
				...updates,
			});
		});

		test("deletes user successfully", async () => {
			// Test user deletion
			const testUser = {
				id: "test-user-3",
				name: "Delete Test User",
				email: "delete@example.com",
				createdAt: new Date(),
			};

			// Create user
			await databaseService.createUser(testUser);

			// Verify user exists
			let retrievedUser = await databaseService.getUserById(testUser.id);
			expect(retrievedUser).toEqual(testUser);

			// Delete user
			const deleted = await databaseService.deleteUser(testUser.id);
			expect(deleted).toBe(true);

			// Verify user no longer exists
			retrievedUser = await databaseService.getUserById(testUser.id);
			expect(retrievedUser).toBeNull();

			// Verify user count decreased
			const userCount = await databaseService.getUserCount();
			expect(userCount).toBe(0);
		});

		test("handles non-existent user operations", async () => {
			// Test operations on users that don't exist
			const nonExistentId = "non-existent-user";

			// Try to get non-existent user
			const retrievedUser = await databaseService.getUserById(nonExistentId);
			expect(retrievedUser).toBeNull();

			// Try to update non-existent user
			const updatedUser = await databaseService.updateUser(nonExistentId, { name: "New Name" });
			expect(updatedUser).toBeNull();

			// Try to delete non-existent user
			const deleted = await databaseService.deleteUser(nonExistentId);
			expect(deleted).toBe(false);
		});
	});

	describe("User Listing and Search", () => {
		test("retrieves all users", async () => {
			// Test retrieving all users
			const users = [
				{
					id: "list-user-1",
					name: "Alice Johnson",
					email: "alice@example.com",
					age: 30,
					createdAt: new Date(),
				},
				{
					id: "list-user-2",
					name: "Bob Smith",
					email: "bob@example.com",
					age: 25,
					createdAt: new Date(),
				},
			];

			// Create users
			for (const user of users) {
				await databaseService.createUser(user);
			}

			// Retrieve all users
			const allUsers = await databaseService.getAllUsers();

			expect(allUsers).toHaveLength(2);
			expect(allUsers).toEqual(expect.arrayContaining(users));
		});

		test("searches users by name", async () => {
			// Test user search functionality
			const users = [
				{
					id: "search-user-1",
					name: "John Doe",
					email: "john@example.com",
					createdAt: new Date(),
				},
				{
					id: "search-user-2",
					name: "Jane Smith",
					email: "jane@example.com",
					createdAt: new Date(),
				},
				{
					id: "search-user-3",
					name: "Bob Johnson",
					email: "bob@example.com",
					createdAt: new Date(),
				},
			];

			// Create users
			for (const user of users) {
				await databaseService.createUser(user);
			}

			// Search for users with "John" in name
			const johnUsers = await databaseService.searchUsersByName("John");
			expect(johnUsers).toHaveLength(2);
			expect(johnUsers.map(u => u.name)).toEqual(expect.arrayContaining(["John Doe", "Bob Johnson"]));

			// Search for users with "Jane" in name
			const janeUsers = await databaseService.searchUsersByName("Jane");
			expect(janeUsers).toHaveLength(1);
			expect(janeUsers[0].name).toBe("Jane Smith");

			// Search for non-existent name
			const noResults = await databaseService.searchUsersByName("NonExistent");
			expect(noResults).toHaveLength(0);
		});
	});

	describe("Caching Behavior", () => {
		test("caches user data in Redis", async () => {
			// Test that Redis caching works correctly
			const testUser = {
				id: "cache-user-1",
				name: "Cache Test User",
				email: "cache@example.com",
				createdAt: new Date(),
			};

			// Create user
			await databaseService.createUser(testUser);

			// First retrieval should cache the user
			let retrievedUser = await databaseService.getUserById(testUser.id);
			expect(retrievedUser).toEqual(testUser);

			// Second retrieval should come from cache
			retrievedUser = await databaseService.getUserById(testUser.id);
			expect(retrievedUser).toEqual(testUser);
		});

		test("invalidates cache on user update", async () => {
			// Test that cache is invalidated when user is updated
			const testUser = {
				id: "cache-update-user",
				name: "Original Name",
				email: "original@example.com",
				createdAt: new Date(),
			};

			// Create user
			await databaseService.createUser(testUser);

			// Retrieve to cache
			await databaseService.getUserById(testUser.id);

			// Update user
			const updates = { name: "Updated Name" };
			await databaseService.updateUser(testUser.id, updates);

			// Retrieve again - should get updated data
			const retrievedUser = await databaseService.getUserById(testUser.id);
			expect(retrievedUser?.name).toBe("Updated Name");
		});

		test("removes from cache on user deletion", async () => {
			// Test that cache is cleared when user is deleted
			const testUser = {
				id: "cache-delete-user",
				name: "Delete Cache User",
				email: "delete-cache@example.com",
				createdAt: new Date(),
			};

			// Create user
			await databaseService.createUser(testUser);

			// Retrieve to cache
			await databaseService.getUserById(testUser.id);

			// Delete user
			await databaseService.deleteUser(testUser.id);

			// Try to retrieve - should be null
			const retrievedUser = await databaseService.getUserById(testUser.id);
			expect(retrievedUser).toBeNull();
		});
	});

	describe("Data Persistence", () => {
		test("persists data across service instances", async () => {
			// Test that data persists across different service instances
			const testUser = {
				id: "persistence-user",
				name: "Persistence Test",
				email: "persistence@example.com",
				createdAt: new Date(),
			};

			// Create user with first service instance
			await databaseService.createUser(testUser);
			await databaseService.close();

			// Create new service instance and verify data persists
			const newService = new DatabaseService();
			await newService.connect(mongoUrl, redisUrl);

			const retrievedUser = await newService.getUserById(testUser.id);
			expect(retrievedUser).toEqual(testUser);

			await newService.close();
		});
	});
});