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

import type { ProsopoConfigOutput } from "@prosopo/types";
import { GenericContainer, type StartedTestContainer } from "testcontainers";

let mongoContainer: StartedTestContainer;
let redisContainer: StartedTestContainer;

/**
 * Sets up test containers for MongoDB and Redis
 * This provides real database instances for integration testing
 */
export async function setupTestContainers() {
	if (!mongoContainer) {
		mongoContainer = await new GenericContainer("mongo:6.0.17")
			.withEnvironment({
				MONGO_INITDB_ROOT_USERNAME: "root",
				MONGO_INITDB_ROOT_PASSWORD: "root",
				MONGO_INITDB_DATABASE: "prosopo",
			})
			.withExposedPorts(27017)
			.start();
	}

	if (!redisContainer) {
		redisContainer = await new GenericContainer("redis/redis-stack:latest")
			.withEnvironment({
				REDIS_ARGS: "--requirepass root",
			})
			.withExposedPorts(6379)
			.start();
	}

	return { mongoContainer, redisContainer };
}

/**
 * Creates a test configuration that connects to the test containers
 */
export function createTestConfig(
	mongoUrl: string,
	redisUrl: string,
): ProsopoConfigOutput {
	return {
		logLevel: "info",
		defaultEnvironment: "development",
		account: {
			secret:
				"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
		},
		host: "http://localhost:9229",
		ipApi: {
			apiKey: "test-key",
			baseUrl: "https://api.test.com",
		},
		redisConnection: {
			url: redisUrl,
			password: "root",
		},
		database: {
			development: {
				type: "mongo",
				endpoint: mongoUrl,
				dbname: "prosopo",
				authSource: "admin",
			},
		},
	} as ProsopoConfigOutput;
}

/**
 * Tears down test containers
 * Note: In Vitest, containers are typically cleaned up automatically,
 * but this function is provided for manual cleanup if needed
 */
export async function teardownTestContainers() {
	try {
		if (mongoContainer) {
			await mongoContainer.stop();
		}
	} catch (error) {
		console.warn("Error stopping MongoDB container:", error);
	}
	try {
		if (redisContainer) {
			await redisContainer.stop();
		}
	} catch (error) {
		console.warn("Error stopping Redis container:", error);
	}
}
