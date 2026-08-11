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

import { RedisWriteQueue } from "@prosopo/database";
import { type ProsopoConfigOutput, ScheduledTaskStatus } from "@prosopo/types";
import { Environment, isMaintenanceMode } from "./env.js";

export class ProviderEnvironment extends Environment {
	declare config: ProsopoConfigOutput;

	cleanup(): void {
		// Maintenance mode (or any startup that failed to bring the DB up) means
		// neither Mongo collections nor Redis connections are wired. Skip both
		// cleanup tasks — they'd throw synchronously and crash boot.
		const dbConnected = this.db?.connected ?? false;
		if (!dbConnected || isMaintenanceMode()) {
			this.logger.warn(() => ({
				msg: "Skipping startup cleanup — DB not connected (maintenance mode or boot-time DB failure)",
			}));
			return;
		}

		const errorLog = this.logger.with({ failedFuncName: this.cleanup.name });

		this.db
			?.cleanupScheduledTaskStatus(ScheduledTaskStatus.Running)
			.catch((err) => {
				errorLog.error(() => ({
					msg: "Failed to cleanup running scheduled tasks",
					err,
				}));
			});

		// Wipe any Redis session keys carried over from an earlier (possibly
		// crashed) provider run. A stale hash → sessionId mapping can
		// resurrect a Mongo-deleted session and break the next captcha
		// attempt for that user+IP+sitekey.
		try {
			const redisConnection = this.getDb().getRedisConnection();
			const writeQueue = new RedisWriteQueue(redisConnection, this.logger);
			writeQueue.clearAllSessionRecords().catch((err) => {
				errorLog.error(() => ({
					msg: "Failed to clear Redis session records at startup",
					err,
				}));
			});
		} catch (err) {
			this.logger.warn(() => ({
				msg: "Skipped Redis session cleanup — no Redis connection",
				err,
			}));
		}
	}
}
