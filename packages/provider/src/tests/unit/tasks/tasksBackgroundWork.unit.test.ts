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

import { ProviderDatabase } from "@prosopo/database";
import { LogLevel, getLogger } from "@prosopo/logger";
import type { RedisConnection } from "@prosopo/redis-client";
import type { KeyringPair } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Tasks } from "../../../tasks/tasks.js";

describe("Tasks background work", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("does not poll Redis on a timer after construction", async () => {
		vi.useFakeTimers();
		const getClient = vi.fn<RedisConnection["getClient"]>(() =>
			Promise.reject(new Error("unexpected Redis call")),
		);
		const connection: RedisConnection = {
			isReady: () => true,
			getClient,
			getAwaitingTimeMs: () => 0,
		};
		const db = Object.create(ProviderDatabase.prototype) as ProviderDatabase;
		db.getRedisConnection = () => connection;
		const config = {
			logLevel: LogLevel.enum.error,
			captchas: { solved: { count: 1 }, unsolved: { count: 1 } },
		} as ProviderEnvironment["config"];
		const getDb: ProviderEnvironment["getDb"] = () => db;
		const env = {
			config,
			pair: { address: "provider" } as KeyringPair,
			getDb,
		} as ProviderEnvironment;

		new Tasks(env, getLogger(LogLevel.enum.error, "tasksBackgroundWork"));
		await vi.advanceTimersByTimeAsync(60_000);

		expect(getClient).not.toHaveBeenCalled();
	});
});
