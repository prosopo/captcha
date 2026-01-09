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

import { ScheduledTaskStatus } from "@prosopo/types";
import type { KeyringPair } from "@prosopo/types";
import type { ProsopoConfigOutput } from "@prosopo/types";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ProviderEnvironment } from "./provider.js";
import {
	createTestConfig,
	setupTestContainers,
} from "./tests/test-setup.integration.js";

describe("ProviderEnvironment Integration Tests", () => {
	let config: ProsopoConfigOutput;
	let testPair: KeyringPair;

	beforeAll(async () => {
		// Setup test containers for real database testing
		const { mongoContainer, redisContainer } = await setupTestContainers();

		const mongoUrl = `mongodb://root:root@localhost:${mongoContainer.getMappedPort(27017)}/prosopo?authSource=admin`;
		const redisUrl = `redis://localhost:${redisContainer.getMappedPort(6379)}`;

		config = createTestConfig(mongoUrl, redisUrl);

		// Create a test keyring pair for authentication
		const { getPair } = await import("@prosopo/keyring");
		testPair = getPair(config.account.secret);
	}, 60000); // 60 second timeout for container startup

	describe("Provider Environment Lifecycle", () => {
		it("should initialize provider environment with full database access", async () => {
			// Test: Create provider environment with real databases
			const env = new ProviderEnvironment(config, testPair);

			expect(env.config).toBe(config);
			expect(env.defaultEnvironment).toBe("development");
			expect(env.pair).toBe(testPair);

			// Test: Should be able to initialize and connect to databases
			await env.isReady();
			expect(env.ready).toBe(true);

			// Test: Database should be accessible
			const db = env.getDb();
			expect(db).toBeDefined();
			expect(db.connected).toBe(true);

			// Test: Should be able to perform database operations
			const collections = await db.connection!.db!.listCollections().toArray();
			expect(Array.isArray(collections)).toBe(true);
		}, 30000);

		it("should handle cleanup of scheduled tasks", async () => {
			// Test: Provider environment should be able to cleanup scheduled tasks
			const env = new ProviderEnvironment(config, testPair);
			await env.isReady();

			const db = env.getDb();

			// Test: Insert some mock scheduled tasks to clean up
			const scheduledTasksCollection =
				db.connection!.db!.collection("scheduledtasks");
			await scheduledTasksCollection.insertMany([
				{
					taskId: "test-task-1",
					status: ScheduledTaskStatus.Running,
					createdAt: new Date(),
				},
				{
					taskId: "test-task-2",
					status: ScheduledTaskStatus.Pending,
					createdAt: new Date(),
				},
			]);

			// Verify tasks were inserted
			const runningTasksBefore = await scheduledTasksCollection
				.find({ status: ScheduledTaskStatus.Running })
				.toArray();
			expect(runningTasksBefore.length).toBe(1);

			// Test: Cleanup should remove running tasks
			// Note: cleanup() doesn't await the promise, so we need to wait
			env.cleanup();
			await new Promise((resolve) => setTimeout(resolve, 200)); // Wait longer for cleanup to complete

			// Verify running tasks were cleaned up
			const runningTasksAfter = await scheduledTasksCollection
				.find({ status: ScheduledTaskStatus.Running })
				.toArray();
			expect(runningTasksAfter.length).toBe(0);

			// Pending tasks should remain
			const pendingTasks = await scheduledTasksCollection
				.find({ status: ScheduledTaskStatus.Pending })
				.toArray();
			expect(pendingTasks.length).toBe(1);
		}, 30000);

		it("should handle cleanup errors gracefully", async () => {
			// Test: Provider environment should handle cleanup errors without crashing
			const env = new ProviderEnvironment(config, testPair);
			await env.isReady();

			// Mock the database cleanup method to throw an error
			const db = env.getDb();
			const originalCleanup = db.cleanupScheduledTaskStatus;
			db.cleanupScheduledTaskStatus = vi
				.fn()
				.mockRejectedValue(new Error("Cleanup failed"));

			// Spy on logger to verify error is logged
			const loggerSpy = vi.spyOn(env.logger, "error");

			// Test: Cleanup should not throw even when database operation fails
			expect(() => env.cleanup()).not.toThrow();

			// Test: Error should be logged (wait for the async operation)
			await new Promise((resolve) => setTimeout(resolve, 200)); // Wait for async cleanup
			expect(loggerSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					msg: "Failed to cleanup running scheduled tasks",
				}),
			);

			// Restore original method
			db.cleanupScheduledTaskStatus = originalCleanup;
		}, 30000);

		it("should inherit all Environment functionality", async () => {
			// Test: ProviderEnvironment should have all Environment methods
			const env = new ProviderEnvironment(config, testPair);

			// Test: Should have Environment methods
			expect(typeof env.getSigner).toBe("function");
			expect(typeof env.getDb).toBe("function");
			expect(typeof env.getAssetsResolver).toBe("function");
			expect(typeof env.getPair).toBe("function");
			expect(typeof env.isReady).toBe("function");
			expect(typeof env.importDatabase).toBe("function");

			// Test: Should have ProviderEnvironment specific methods
			expect(typeof env.cleanup).toBe("function");

			// Test: Full lifecycle should work
			await env.isReady();
			expect(env.ready).toBe(true);

			const signer = await env.getSigner();
			expect(signer).toBe(testPair);

			const db = env.getDb();
			expect(db.connected).toBe(true);
		}, 30000);
	});
});
