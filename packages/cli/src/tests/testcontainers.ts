// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { GenericContainer, type StartedTestContainer } from "testcontainers";

/**
 * Test container setup for integration tests using real databases
 * instead of mocks or in-memory servers
 */
export class TestContainers {
	private static mongoContainer: StartedTestContainer | null = null;
	private static redisContainer: StartedTestContainer | null = null;

	/**
	 * Start a MongoDB test container
	 * @returns Promise resolving to the started container
	 */
	static async startMongoDB(): Promise<StartedTestContainer> {
		if (this.mongoContainer) {
			return this.mongoContainer;
		}

		this.mongoContainer = await new GenericContainer("mongo:7.0")
			.withExposedPorts(27017)
			.withEnvironment({
				MONGO_INITDB_ROOT_USERNAME: "testuser",
				MONGO_INITDB_ROOT_PASSWORD: "testpass",
				MONGO_INITDB_DATABASE: "testdb",
			})
			.start();

		return this.mongoContainer;
	}

	/**
	 * Start a Redis test container
	 * @returns Promise resolving to the started container
	 */
	static async startRedis(): Promise<StartedTestContainer> {
		if (this.redisContainer) {
			return this.redisContainer;
		}

		this.redisContainer = await new GenericContainer("redis:7.2-alpine")
			.withExposedPorts(6379)
			.withEnvironment({
				REDIS_PASSWORD: "testpass",
			})
			.start();

		return this.redisContainer;
	}

	/**
	 * Get MongoDB connection string from running container
	 * @returns MongoDB connection string
	 */
	static getMongoDBConnectionString(): string {
		if (!this.mongoContainer) {
			throw new Error("MongoDB container not started. Call startMongoDB() first.");
		}
		const host = this.mongoContainer.getHost();
		const port = this.mongoContainer.getMappedPort(27017);
		return `mongodb://testuser:testpass@${host}:${port}/testdb?authSource=admin`;
	}

	/**
	 * Get Redis connection string from running container
	 * @returns Redis connection string
	 */
	static getRedisConnectionString(): string {
		if (!this.redisContainer) {
			throw new Error("Redis container not started. Call startRedis() first.");
		}
		const host = this.redisContainer.getHost();
		const port = this.redisContainer.getMappedPort(6379);
		return `redis://:${"testpass"}@${host}:${port}`;
	}

	/**
	 * Stop all running test containers
	 */
	static async stopAll(): Promise<void> {
		const promises = [];
		if (this.mongoContainer) {
			promises.push(this.mongoContainer.stop());
		}
		if (this.redisContainer) {
			promises.push(this.redisContainer.stop());
		}
		await Promise.all(promises);
		this.mongoContainer = null;
		this.redisContainer = null;
	}
}

/**
 * Global setup for integration tests - start containers before all tests
 */
export async function setupTestContainers(): Promise<void> {
	await TestContainers.startMongoDB();
	await TestContainers.startRedis();
}

/**
 * Global teardown for integration tests - stop containers after all tests
 */
export async function teardownTestContainers(): Promise<void> {
	await TestContainers.stopAll();
}