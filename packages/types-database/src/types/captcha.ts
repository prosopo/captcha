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
import type mongoose from "mongoose";
import { Schema } from "mongoose";
import type { IDatabase } from "./mongo.js";
import {
	FrictionlessTokenRecordSchema,
	type PoWCaptchaRecord,
	type ScoreComponents,
	type SessionRecord,
	SessionRecordSchema,
	type UserCommitmentRecord,
} from "./provider.js";

export type StoredSession = Pick<
	SessionRecord,
	"sessionId" | "createdAt" | "captchaType" | "deleted" | "tokenId"
> & {
	score: number;
	scoreComponents: ScoreComponents;
	threshold: number;
};

export const StoredSessionRecordSchema: Schema = new Schema({
	sessionId: SessionRecordSchema.obj.sessionId,
	createdAt: SessionRecordSchema.obj.createdAt,
	captchaType: SessionRecordSchema.obj.captchaType,
	tokenId: SessionRecordSchema.obj.tokenId,
	deleted: SessionRecordSchema.obj.deleted,
	score: FrictionlessTokenRecordSchema.obj.score,
	scoreComponents: FrictionlessTokenRecordSchema.obj.scoreComponents,
	threshold: FrictionlessTokenRecordSchema.obj.threshold,
});

export interface ICaptchaDatabase extends IDatabase {
	saveCaptchas(
		sessionEvents: StoredSession[],
		imageCaptchaEvents: UserCommitmentRecord[],
		powCaptchaEvents: PoWCaptchaRecord[],
	): Promise<void>;
}
