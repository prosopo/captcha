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

import { GenericContainer, StartedTestContainer } from "testcontainers";

export interface TestContainers {
	mongoContainer: StartedTestContainer;
	redisContainer: StartedTestContainer;
	mongoUrl: string;
	redisUrl: string;
}

let containers: TestContainers | null = null;

export async function startTestContainers(): Promise<TestContainers> {
	if (containers) {
		return containers;
	}

	console.log("Starting test containers...");

	// Start MongoDB container
	const mongoContainer = await new GenericContainer("mongo:7.0")
		.withExposedPorts(27017)
		.withEnvironment({
			MONGO_INITDB_ROOT_USERNAME: "test",
			MONGO_INITDB_ROOT_PASSWORD: "testpassword",
		})
		.start();

	// Start Redis container
	const redisContainer = await new GenericContainer("redis:7.2-alpine")
		.withExposedPorts(6379)
		.start();

	const mongoUrl = `mongodb://test:testpassword@${mongoContainer.getHost()}:${mongoContainer.getMappedPort(27017)}`;
	const redisUrl = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;

	containers = {
		mongoContainer,
		redisContainer,
		mongoUrl,
		redisUrl,
	};

	console.log("Test containers started successfully");
	return containers;
}

export async function stopTestContainers(): Promise<void> {
	if (containers) {
		console.log("Stopping test containers...");
		await containers.redisContainer.stop();
		await containers.mongoContainer.stop();
		containers = null;
		console.log("Test containers stopped");
	}
}

// Global setup for vitest
export async function setup(): Promise<void> {
	await startTestContainers();
}

export async function teardown(): Promise<void> {
	await stopTestContainers();
}