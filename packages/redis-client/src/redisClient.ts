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

import type { Logger } from "@prosopo/common";
import { type RedisClientType, createClient } from "redis";
import { type RedisIndex, createRedisIndex } from "./redisIndex.js";

type RedisOptions = {
	url?: string;
	password?: string;
	logger: Logger;
	indexSetup?: (client: RedisClientType) => Promise<void>;
};

type RedisConnection = {
	isReady: () => boolean;
	getClient: () => Promise<RedisClientType>;
	getAwaitingTimeMs: () => number;
};

// pluggable redis client
export const connectToRedis = (options: RedisOptions): RedisConnection => {
	const timestamps = {
		initializedAt: Date.now(),
		connectedAt: 0,
	};

	const masterClient = createClient({
		url: options.url,
		password: options.password,
	});

	let isReady = false;

	options.logger.info(() => ({
		msg: "Connecting to Redis",
	}));

	const clientPromise = masterClient.connect().then(async (connectedClient) => {
		isReady = true;
		timestamps.connectedAt = Date.now();

		options.logger.info(() => ({
			msg: "Redis connected",
			data: {
				awaitingTimeMs: timestamps.connectedAt - timestamps.initializedAt,
			},
		}));

		// we listen for errors only after connection,
		// otherwise will be getting constant "connection refused" errors"
		masterClient.on("error", (error) => {
			options.logger.error(() => ({
				err: error,
				msg: "Redis client error",
			}));
		});

		return connectedClient as RedisClientType;
	});

	return {
		isReady: () => isReady,
		getClient: () => clientPromise,
		getAwaitingTimeMs: () =>
			isReady
				? timestamps.connectedAt - timestamps.initializedAt
				: Date.now() - timestamps.initializedAt,
	};
};

export const setupRedisIndex = (
	connection: RedisConnection,
	index: RedisIndex,
	logger: Logger,
): RedisConnection => {
	const timestamps = {
		initializedAt: 0,
		setupAt: 0,
	};

	let isReady = false;

	const clientPromise = connection.getClient().then(async (client) => {
		logger.info(() => ({
			msg: "Setting up Redis index",
			data: {
				name: index.name,
			},
		}));

		await createRedisIndex(client, index);

		isReady = true;
		timestamps.setupAt = Date.now();

		logger.info(() => ({
			msg: "Index setup",
			data: {
				awaitingTimeMs: timestamps.setupAt - timestamps.initializedAt,
			},
		}));

		return client;
	});

	return {
		isReady: () => isReady,
		getClient: () => clientPromise,
		getAwaitingTimeMs: () =>
			isReady
				? timestamps.setupAt - timestamps.initializedAt
				: Date.now() - timestamps.initializedAt,
	};
};
