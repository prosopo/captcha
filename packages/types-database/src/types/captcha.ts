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

import type { PoWCaptcha, UserCommitment } from "@prosopo/types";
import { type RootFilterQuery, Schema } from "mongoose";
import type { IDatabase } from "./mongo.js";
import {
	type PoWCaptchaRecord,
	PoWCaptchaRecordSchema,
	type SessionRecord,
	SessionRecordSchema,
	type UserCommitmentRecord,
	UserCommitmentRecordSchema,
} from "./provider.js";

// StoredSession is now the same as SessionRecord since we merged the schemas
export type StoredSession = SessionRecord;

export const StoredSessionRecordSchema: Schema = SessionRecordSchema;

export const StoredUserCommitmentRecordSchema: Schema = new Schema({
	...UserCommitmentRecordSchema.obj,
});
StoredUserCommitmentRecordSchema.index({ sessionId: 1 });

export const StoredPoWCaptchaRecordSchema: Schema = new Schema({
	...PoWCaptchaRecordSchema.obj,
});
StoredPoWCaptchaRecordSchema.index({ sessionId: 1 });

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
