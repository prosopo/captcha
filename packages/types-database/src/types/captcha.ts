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

import type { PoWCaptcha } from "@prosopo/types";
import { type RootFilterQuery, Schema } from "mongoose";
import { applyStandardMiddleware } from "@prosopo/mongoose";
import type { IDatabase } from "./mongo.js";
import {
	type FrictionlessTokenRecord,
	FrictionlessTokenRecordSchema,
	type PoWCaptchaRecord,
	PoWCaptchaRecordSchema,
	type SessionRecord,
	SessionRecordSchema,
	type UserCommitment,
	type UserCommitmentRecord,
	UserCommitmentRecordSchema,
} from "./provider.js";

export type StoredSession = SessionRecord &
	Omit<FrictionlessTokenRecord, "token">;

export const StoredSessionRecordSchema: Schema = new Schema({
	...SessionRecordSchema.obj,
	...Object.fromEntries(
		Object.entries(FrictionlessTokenRecordSchema.obj).filter(
			([key]) => key !== "token",
		),
	),
});
// Apply standard middleware
applyStandardMiddleware(StoredSessionRecordSchema);

// Remove any index with 'sessionId' in its fields
const existingIndexes = StoredSessionRecordSchema.indexes();
const filteredIndexes = existingIndexes.filter(
	(idx: [Record<string, unknown>, Record<string, unknown>]) =>
		!("sessionId" in idx[0]) && !("createdAt" in idx[0]),
);
for (const [fields, options] of filteredIndexes) {
	StoredSessionRecordSchema.index(fields, options);
}

// Redefine the index for sessionId to make it non-unique (there were collisions)
StoredSessionRecordSchema.index({ tokenId: 1 });
StoredSessionRecordSchema.index({ sessionId: 1 }, { unique: false });
// Redefine the index for createdAt without a TTL
StoredSessionRecordSchema.index({ createdAt: -1 });

export const StoredUserCommitmentRecordSchema: Schema = new Schema({
	...UserCommitmentRecordSchema.obj,
});
// Apply standard middleware
applyStandardMiddleware(StoredUserCommitmentRecordSchema);
StoredUserCommitmentRecordSchema.index({ frictionlessTokenId: 1 });

export const StoredPoWCaptchaRecordSchema: Schema = new Schema({
	...PoWCaptchaRecordSchema.obj,
});
// Apply standard middleware
applyStandardMiddleware(StoredPoWCaptchaRecordSchema);
StoredPoWCaptchaRecordSchema.index({ frictionlessTokenId: 1 });

export interface ICaptchaDatabase extends IDatabase {
	saveCaptchas(
		sessionEvents: StoredSession[],
		imageCaptchaEvents: UserCommitmentRecord[],
		powCaptchaEvents: PoWCaptchaRecord[],
	): Promise<void>;
	getCaptchas(
		filter: RootFilterQuery<CaptchaProperties>,
		limit: number,
	): Promise<{
		userCommitmentRecords: UserCommitmentRecord[];
		powCaptchaRecords: PoWCaptchaRecord[];
	}>;
}

export interface CaptchaProperties
	extends Partial<UserCommitment & PoWCaptcha> {}
