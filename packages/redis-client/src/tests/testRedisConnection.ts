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

import type { Logger } from "@prosopo/common";
import { RedisContainer, StartedRedisContainer } from "@testcontainers/redis";
import { type RedisConnection, connectToRedis } from "../redisClient.js";

const mockLogger = new Proxy(
	{},
	{
		get: () => () => {},
	},
) as unknown as Logger;

let container: StartedRedisContainer | undefined;
let containerPromise: Promise<StartedRedisContainer> | undefined;

export const startTestRedisContainer = async (): Promise<StartedRedisContainer> => {
	if (container) {
		return container;
	}
	if (containerPromise) {
		return containerPromise;
	}
	containerPromise = new RedisContainer("redis:7-alpine")
		.withCommand(["--requirepass", "root"])
		.start();
	container = await containerPromise;
	return container;
};

export const stopTestRedisContainer = async (): Promise<void> => {
	if (container) {
		await container.stop();
		container = undefined;
		containerPromise = undefined;
	}
};

export const createTestRedisConnection = async (
	logger?: Logger,
): Promise<RedisConnection> => {
	const redisContainer = await startTestRedisContainer();
	const connectionUrl = redisContainer.getConnectionUrl();
	return connectToRedis({
		url: connectionUrl,
		password: "root",
		logger: logger || mockLogger,
	});
};
