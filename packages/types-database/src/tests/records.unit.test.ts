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

import { CaptchaStatus, ScheduledTaskStatus } from "@prosopo/types";
import type { IndexDefinition, IndexOptions, Schema } from "mongoose";
import mongoose from "mongoose";
import { describe, expect, test } from "vitest";
import { BannedDomainRecordSchema } from "../types/bannedDomain.js";
import {
	StoredPoWCaptchaRecordSchema,
	StoredPuzzleCaptchaRecordSchema,
	StoredSessionRecordSchema,
	StoredUserCommitmentRecordSchema,
} from "../types/captcha.js";
import {
	DecisionMachineArtifactRecordSchema,
	DetectorRecordSchema,
	PoWCaptchaRecordSchema,
	ScheduledTaskRecordSchema,
	SessionRecordSchema,
	UserSolutionRecordSchema,
} from "../types/provider.js";
import { SpamEmailDomainRecordSchema } from "../types/spamEmailDomain.js";

type IndexEntry = [IndexDefinition, IndexOptions];

const indexes = (schema: Schema): IndexEntry[] =>
	schema.indexes() as IndexEntry[];

const findIndex = (
	schema: Schema,
	keys: Record<string, number>,
): IndexEntry | undefined =>
	indexes(schema).find(
		([definition]) => JSON.stringify(definition) === JSON.stringify(keys),
	);

describe("indexes that exist for a specific query", () => {
	test("the pending-stage sweep scans only pending rows", () => {
		// A full index here would make the sweep touch every powcaptcha ever
		// written; the partial filter keeps it to the small rolling set.
		const entry = findIndex(PoWCaptchaRecordSchema, { pendingStage: 1 });
		expect(entry?.[1].partialFilterExpression).toEqual({ pendingStage: true });
	});

	test("the backfill sweeps index the whole field, not a partial", () => {
		// These serve `{ $exists: false }`, which a partial filter cannot
		// express, so the index has to include documents missing the field.
		for (const field of ["ipInfo", "parsedUserAgentInfo"]) {
			const entry = findIndex(PoWCaptchaRecordSchema, { [field]: 1 });
			expect(entry).toBeDefined();
			expect(entry?.[1].partialFilterExpression).toBeUndefined();
		}
	});

	test("both halves of the composite ip are searchable independently", () => {
		expect(
			findIndex(PoWCaptchaRecordSchema, { "ipAddress.lower": 1 }),
		).toBeDefined();
		expect(
			findIndex(PoWCaptchaRecordSchema, { "ipAddress.upper": 1 }),
		).toBeDefined();
	});

	test("expired detector keys are removed by mongo rather than by a job", () => {
		const entry = findIndex(DetectorRecordSchema, { expiresAt: 1 });
		expect(entry?.[1].expireAfterSeconds).toBe(0);
	});

	test("only one decision machine artifact may exist per scope", () => {
		const entry = findIndex(DecisionMachineArtifactRecordSchema, {
			scope: 1,
			dappAccount: 1,
			kind: 1,
		});
		expect(entry?.[1].unique).toBe(true);
	});

	test("a domain cannot be banned twice", () => {
		expect(BannedDomainRecordSchema.path("domain").options.unique).toBe(true);
		expect(SpamEmailDomainRecordSchema.path("domain").options.unique).toBe(
			true,
		);
	});
});

describe("records that expire on their own", () => {
	test("a user solution is dropped four weeks after it is created", () => {
		const path = UserSolutionRecordSchema.path("createdAt");
		expect(path.options.expires).toBe(28 * 24 * 60 * 60);
		expect(path.options.default).toBe(Date.now);
	});

	test("a scheduled task record is dropped after a week", () => {
		expect(ScheduledTaskRecordSchema.path("datetime").options.expires).toBe(
			7 * 24 * 60 * 60,
		);
	});

	test("a captcha record only expires once it has been stored", () => {
		// `storedAtTimestamp` is unset until the record is staged, and mongo's
		// TTL monitor ignores documents whose indexed field is missing — so an
		// unstaged record is never silently deleted.
		const path = PoWCaptchaRecordSchema.path("storedAtTimestamp");
		expect(path.options.required).toBe(false);
		expect(path.options.expires).toBe(28 * 24 * 60 * 60);
	});
});

describe("validating a proof-of-work record", () => {
	const model = mongoose.model("test-pow", PoWCaptchaRecordSchema);

	const complete = (): Record<string, unknown> => ({
		challenge: "c",
		dappAccount: "d",
		userAccount: "u",
		requestedAtTimestamp: new Date(0),
		result: { status: CaptchaStatus.pending },
		difficulty: 4,
		ipAddress: { lower: 1n, type: "v4" },
		headers: {},
		ja4: "ja4",
		userSubmitted: false,
		serverChecked: false,
		providerSignature: "sig",
	});

	test("accepts a record carrying only the required fields", () => {
		expect(new model(complete()).validateSync()).toBeUndefined();
	});

	test("refuses a record with no signature from the provider", () => {
		const { providerSignature: _omitted, ...rest } = complete();
		expect(
			new model(rest).validateSync()?.errors.providerSignature,
		).toBeDefined();
	});

	test("refuses a status that is not a known captcha status", () => {
		expect(
			new model({ ...complete(), result: { status: "maybe" } }).validateSync()
				?.errors["result.status"],
		).toBeDefined();
	});

	test("does not currently restrict the failure reason to a translation key", () => {
		// The intent of `enum: TranslationKeysSchema.options` is to keep the
		// reason renderable, but that list comes back empty — `getLeafFieldPath`
		// in @prosopo/locale returns `[]` for a leaf, so every key is dropped
		// and the enum constrains nothing. Pinned as the current behaviour;
		// fixing it in locale would narrow the `TranslationKey` type from
		// `string` to a real union and is a change for that package to make.
		expect(PoWCaptchaRecordSchema.path("result.reason").options.enum).toEqual(
			[],
		);
		expect(
			new model({
				...complete(),
				result: { status: CaptchaStatus.disapproved, reason: "not.a.key" },
			}).validateSync(),
		).toBeUndefined();
	});

	test("leaves the label fields empty until a human labels the record", () => {
		const doc = new model(complete());
		expect(doc.get("label")).toBeUndefined();
		expect(doc.get("labelledBy")).toBeUndefined();
		expect(doc.get("labelledAt")).toBeUndefined();
	});

	test("refuses a label outside the known set", () => {
		expect(
			new model({ ...complete(), label: "spam" }).validateSync()?.errors.label,
		).toBeDefined();
	});
});

describe("validating a scheduled task record", () => {
	const model = mongoose.model(
		"test-scheduled-task",
		ScheduledTaskRecordSchema,
	);

	test("insists on a name, a time and a status", () => {
		const errors = new model({}).validateSync()?.errors;
		expect(errors?.processName).toBeDefined();
		expect(errors?.datetime).toBeDefined();
		expect(errors?.status).toBeDefined();
	});

	test("refuses a status the runner does not understand", () => {
		expect(
			new model({ status: "halfway" }).validateSync()?.errors.status,
		).toBeDefined();
	});

	test("accepts every status the runner emits", () => {
		for (const status of Object.values(ScheduledTaskStatus)) {
			expect(
				new model({ status }).validateSync()?.errors.status,
			).toBeUndefined();
		}
	});

	test("stores a result only once the task has produced one", () => {
		expect(new model({}).get("result")).toBeUndefined();
	});
});

describe("the stored copies of the captcha schemas", () => {
	test("a stored session is the very same schema as a live one", () => {
		// The two were merged; keeping them identical by reference is what
		// stops the stored copy drifting when the live one gains a field.
		expect(StoredSessionRecordSchema).toBe(SessionRecordSchema);
	});

	test("each stored copy carries every field of the record it stores", () => {
		expect(Object.keys(StoredPoWCaptchaRecordSchema.obj)).toEqual(
			Object.keys(PoWCaptchaRecordSchema.obj),
		);
	});

	test("each stored copy is indexed by the session that produced it", () => {
		for (const schema of [
			StoredPoWCaptchaRecordSchema,
			StoredPuzzleCaptchaRecordSchema,
			StoredUserCommitmentRecordSchema,
		]) {
			expect(findIndex(schema, { sessionId: 1 })).toBeDefined();
		}
	});

	test("a stored copy is a distinct schema, so its indexes stay separate", () => {
		expect(StoredPoWCaptchaRecordSchema).not.toBe(PoWCaptchaRecordSchema);
		expect(findIndex(PoWCaptchaRecordSchema, { sessionId: 1 })).toBeUndefined();
	});
});
