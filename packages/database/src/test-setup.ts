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

import { MongoDBContainer, type StartedMongoDBContainer } from "testcontainers";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { beforeAll, afterAll } from "vitest";

declare global {
	var mongoContainer: StartedMongoDBContainer;
	var redisContainer: StartedTestContainer;
}

// Start containers before all tests
beforeAll(async () => {
	// Start MongoDB container
	global.mongoContainer = await new MongoDBContainer("mongo:7.0")
		.withExposedPorts(27017)
		.start();

	// Start Redis container
	global.redisContainer = await new GenericContainer("redis:7.2")
		.withExposedPorts(6379)
		.start();

	// Set environment variables for tests
	process.env.MONGODB_URL = global.mongoContainer.getConnectionString();
	process.env.REDIS_URL = `redis://${global.redisContainer.getHost()}:${global.redisContainer.getMappedPort(6379)}`;
}, 60000); // 60 second timeout for container startup

// Stop containers after all tests
afterAll(async () => {
	await global.mongoContainer?.stop();
	await global.redisContainer?.stop();
}, 30000); // 30 second timeout for container shutdown