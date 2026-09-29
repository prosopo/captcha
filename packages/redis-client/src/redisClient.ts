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

import type { Logger } from "@prosopo/logger";
import { type RedisClientType, createClient } from "redis";
import { type RedisIndex, createRedisIndex } from "./redisIndex.js";

type RedisOptions = {
	url?: string;
	password?: string;
	logger: Logger;
	indexSetup?: (client: RedisClientType) => Promise<void>;
};

export type RedisConnection = {
	isReady: () => boolean;
	getClient: () => Promise<RedisClientType>;
	getAwaitingTimeMs: () => number;
};

// Credentials in the URL (`redis://user:password@host`) must never reach the
// logs, and an unparseable URL is logged as a placeholder rather than echoed.
export const redactRedisUrl = (url: string | undefined): string | undefined => {
	if (url === undefined) {
		return undefined;
	}
	try {
		const parsed = new URL(url);
		if (parsed.username) {
			parsed.username = "redacted";
		}
		if (parsed.password) {
			parsed.password = "redacted";
		}
		return parsed.toString();
	} catch {
		return "[unparseable redis url]";
	}
};

// pluggable redis client
export const connectToRedis = (options: RedisOptions): RedisConnection => {
	const timestamps = {
		initializedAt: Date.now(),
		connectedAt: 0,
	};

	let isReady = false;

	const masterClient = createClient({
		url: options.url,
		password: options.password,
		// redis v6 added a 5s default command timeout and raised the keep-alive
		// delay; keep the v5 values so large FT.AGGREGATE reads are not cut off.
		socket: { keepAliveInitialDelay: 5000 },
		commandOptions: { timeout: undefined },
	});

	masterClient.on("error", (error) => {
		// we listen for errors only after connection,
		// otherwise will be getting constant "connection refused" errors"
		if (isReady) {
			options.logger.error(() => ({
				err: error,
				msg: "Redis client error",
			}));
		}
	});

	const log = options.logger.with({ url: redactRedisUrl(options.url) });

	log.info(() => ({
		msg: "Connecting to Redis",
	}));

	const clientPromise = masterClient.connect().then(async (connectedClient) => {
		isReady = true;
		timestamps.connectedAt = Date.now();

		log.info(() => ({
			msg: "Redis connected",
			data: {
				awaitingTimeMs: timestamps.connectedAt - timestamps.initializedAt,
			},
		}));

		return connectedClient as RedisClientType;
	});
	// Nobody may call getClient() before the first connect fails; without a
	// handler that failure is an unhandled rejection, which kills the process
	// under Node's default --unhandled-rejections=throw. Callers still get the
	// rejection from getClient().
	clientPromise.catch((err: unknown) => {
		log.error(() => ({ err, msg: "Redis connection failed" }));
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

	const log = logger.with({ name: index.name });

	const clientPromise = connection.getClient().then(async (client) => {
		timestamps.initializedAt = Date.now();

		log.info(() => ({
			msg: "Setting up Redis index",
		}));

		await createRedisIndex(client, index);

		isReady = true;
		timestamps.setupAt = Date.now();

		log.info(() => ({
			msg: "Index setup",
			data: {
				awaitingTimeMs: timestamps.setupAt - timestamps.initializedAt,
			},
		}));

		return client;
	});
	clientPromise.catch((err: unknown) => {
		log.error(() => ({ err, msg: "Redis index setup failed" }));
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
