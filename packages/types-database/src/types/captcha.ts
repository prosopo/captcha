import { Schema } from "mongoose";
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

import type { IDatabase } from "./mongo.js";
import {
	FrictionlessTokenId,
	type PoWCaptchaRecord,
	type ScoreComponents,
	type SessionRecord,
	SessionRecordSchema,
	type UserCommitmentRecord,
} from "./provider.js";

export type StoredSession = SessionRecord & {
	score: number;
	scoreComponents: ScoreComponents;
	threshold: number;
};

export const StoredSessionRecordSchema = new Schema<StoredSession>({
	score: { type: Number, required: true },
	scoreComponents: {
		type: new Schema<ScoreComponents>({
			[Symbol.for("scoreComponents")]: {
				type: Object,
				required: true,
			},
		}),
		required: true,
	},
	threshold: { type: Number, required: true },
}).add(SessionRecordSchema.obj);

export interface ICaptchaDatabase extends IDatabase {
	saveCaptchas(
		sessionEvents: StoredSession[],
		imageCaptchaEvents: UserCommitmentRecord[],
		powCaptchaEvents: PoWCaptchaRecord[],
	): Promise<void>;
}
