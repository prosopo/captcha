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

import { type Logger, getLogger } from "@prosopo/common";
import type {
	PoWCaptchaRecord,
	StoredSession,
	UserCommitmentRecord,
} from "@prosopo/types-database";
import { CaptchaDatabase } from "./captcha.js";

/**
 * Fire-and-forget streamer that sends captcha records to a central database
 * in real-time. Errors are logged but never thrown, so local operations
 * are never blocked or disrupted.
 *
 * Unlike the batch `saveCaptchas()` method on CaptchaDatabase, this maintains
 * a persistent connection and upserts individual records as they arrive.
 */
export class CentralDbStreamer {
	private db: CaptchaDatabase;
	private logger: Logger;
	private connectPromise: Promise<void> | undefined;

	constructor(mongoCaptchaUri: string, logger?: Logger) {
		this.logger = logger || getLogger("info", "CentralDbStreamer");
		this.db = new CaptchaDatabase(
			mongoCaptchaUri,
			undefined,
			undefined,
			this.logger,
		);
	}

	private ensureConnected(): Promise<void> {
		if (!this.connectPromise) {
			this.connectPromise = this.db.connect().catch((err: unknown) => {
				this.logger.error(() => ({
					err,
					msg: "CentralDbStreamer failed to connect",
				}));
				this.connectPromise = undefined;
				throw err;
			});
		}
		return this.connectPromise;
	}

	/**
	 * Stream a PoW captcha record (create or update) to the central DB.
	 * Fire-and-forget: errors are logged, never thrown.
	 */
	streamPowRecord(record: PoWCaptchaRecord): void {
		this.ensureConnected()
			.then(() => {
				const { _id, ...safeDoc } = record;
				return this.db.tables.powcaptcha.updateOne(
					{ challenge: safeDoc.challenge },
					{ $set: safeDoc },
					{ upsert: true },
				);
			})
			.catch((err: unknown) => {
				this.logger.error(() => ({
					err,
					msg: "Failed to stream PoW record to central DB",
				}));
			});
	}

	/**
	 * Stream a partial PoW update by fetching the full record first, then upserting.
	 */
	streamPowUpdate(getFullRecord: () => Promise<PoWCaptchaRecord | null>): void {
		getFullRecord()
			.then((record) => {
				if (record) {
					this.streamPowRecord(record);
				}
			})
			.catch((err: unknown) => {
				this.logger.error(() => ({
					err,
					msg: "Failed to fetch PoW record for central DB streaming",
				}));
			});
	}

	/**
	 * Stream an image captcha commitment record to the central DB.
	 * Fire-and-forget: errors are logged, never thrown.
	 */
	streamImageRecord(record: UserCommitmentRecord): void {
		this.ensureConnected()
			.then(() => {
				const { _id, ...safeDoc } = record;
				return this.db.tables.commitment.updateOne(
					{ id: safeDoc.id },
					{ $set: safeDoc },
					{ upsert: true },
				);
			})
			.catch((err: unknown) => {
				this.logger.error(() => ({
					err,
					msg: "Failed to stream image record to central DB",
				}));
			});
	}

	/**
	 * Stream an image captcha update by fetching the full record first.
	 */
	streamImageUpdate(
		getFullRecord: () => Promise<UserCommitmentRecord | null>,
	): void {
		getFullRecord()
			.then((record) => {
				if (record) {
					this.streamImageRecord(record);
				}
			})
			.catch((err: unknown) => {
				this.logger.error(() => ({
					err,
					msg: "Failed to fetch image record for central DB streaming",
				}));
			});
	}

	/**
	 * Stream a session record to the central DB.
	 * Fire-and-forget: errors are logged, never thrown.
	 */
	streamSessionRecord(record: StoredSession): void {
		this.ensureConnected()
			.then(() => {
				const { _id, ...safeDoc } = record;
				return this.db.tables.session.updateOne(
					{ sessionId: safeDoc.sessionId },
					{ $set: safeDoc },
					{ upsert: true },
				);
			})
			.catch((err: unknown) => {
				this.logger.error(() => ({
					err,
					msg: "Failed to stream session record to central DB",
				}));
			});
	}
}
