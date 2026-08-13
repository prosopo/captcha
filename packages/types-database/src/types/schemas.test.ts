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

import {
	CaptchaType,
	ScheduledTaskNames,
	ScheduledTaskStatus,
	Tier,
	captchaTypeDefault,
	domainsDefault,
	powDifficultyDefault,
} from "@prosopo/types";
import { Long } from "bson";
import mongoose, { type IndexDefinition, type Schema } from "mongoose";
import { describe, expect, it } from "vitest";
import { BannedDomainRecordSchema } from "./bannedDomain.js";
import {
	StoredPoWCaptchaRecordSchema,
	StoredPuzzleCaptchaRecordSchema,
	StoredSessionRecordSchema,
	StoredUserCommitmentRecordSchema,
} from "./captcha.js";
import { UserDataSchema, UserSettingsSchema } from "./client.js";
import {
	CaptchaRecordSchema,
	ClientRecordSchema,
	CompositeIpAddressRecordSchemaObj,
	PoWCaptchaRecordSchema,
	ScheduledTaskRecordSchema,
	ScheduledTaskSchema,
	SessionRecordSchema,
	UserSolutionRecordSchema,
} from "./provider.js";
import { SpamEmailDomainRecordSchema } from "./spamEmailDomain.js";

/** Every index declared on a schema, as (fields, options) pairs. */
const indexesOf = (
	schema: Schema,
): [IndexDefinition, Record<string, unknown>][] => schema.indexes();

const hasIndexOn = (schema: Schema, field: string): boolean =>
	indexesOf(schema).some(([fields]) => field in fields);

const indexOptions = (
	schema: Schema,
	field: string,
): Record<string, unknown> | undefined =>
	indexesOf(schema).find(([fields]) => field in fields)?.[1];

/** Validate a plain object against a schema without touching a database. */
const validate = (
	schema: Schema,
	doc: Record<string, unknown>,
	// biome-ignore lint/suspicious/noExplicitAny: mongoose models are generic over the document
): any => {
	// Model names must be unique per connection, so derive one per call.
	const name = `T${modelCounter++}`;
	const model = mongoose.model(name, schema.clone());
	const instance = new model(doc);
	return instance;
};

let modelCounter = 0;

const errorPaths = (error: mongoose.Error.ValidationError | null): string[] =>
	Object.keys(error?.errors ?? {}).sort();

describe("BannedDomainRecordSchema", () => {
	it("requires a domain", () => {
		expect(
			errorPaths(validate(BannedDomainRecordSchema, {}).validateSync()),
		).toEqual(["domain"]);
	});

	it("accepts a domain", () => {
		expect(
			validate(BannedDomainRecordSchema, {
				domain: "bad.example",
			}).validateSync(),
		).toBeUndefined();
	});

	it("indexes the domain exactly once, via the unique constraint", () => {
		// `unique: true` already builds the index; a second `.index()` call
		// made mongoose warn about a duplicate on every process start.
		expect(BannedDomainRecordSchema.path("domain").options.unique).toBe(true);
		expect(indexesOf(BannedDomainRecordSchema)).toEqual([
			[{ domain: 1 }, { unique: true, background: true }],
		]);
	});

	it("rejects an empty domain only if the string is absent, not blank", () => {
		// Mongoose treats "" as missing for a required String path, which is
		// what stops a blank row from being inserted.
		expect(
			errorPaths(
				validate(BannedDomainRecordSchema, { domain: "" }).validateSync(),
			),
		).toEqual(["domain"]);
	});
});

describe("SpamEmailDomainRecordSchema", () => {
	it("mirrors the banned-domain schema", () => {
		expect(
			errorPaths(validate(SpamEmailDomainRecordSchema, {}).validateSync()),
		).toEqual(["domain"]);
		expect(SpamEmailDomainRecordSchema.path("domain").options.unique).toBe(
			true,
		);
		expect(indexesOf(SpamEmailDomainRecordSchema)).toHaveLength(1);
	});
});

describe("ClientRecordSchema", () => {
	it("requires a tier drawn from the Tier enum", () => {
		expect(errorPaths(validate(ClientRecordSchema, {}).validateSync())).toEqual(
			["tier"],
		);
		expect(
			errorPaths(
				validate(ClientRecordSchema, { tier: "platinum" }).validateSync(),
			),
		).toEqual(["tier"]);
		expect(
			validate(ClientRecordSchema, { tier: Tier.Free }).validateSync(),
		).toBeUndefined();
	});

	it("indexes the account", () => {
		expect(hasIndexOn(ClientRecordSchema, "account")).toBe(true);
	});
});

describe("CompositeIpAddressRecordSchemaObj", () => {
	const ipSchema = new mongoose.Schema(CompositeIpAddressRecordSchemaObj);

	it("requires the lower half but not the upper", () => {
		// IPv4 addresses only occupy the lower half, so `upper` has to stay
		// optional or every v4 record would fail validation.
		expect(ipSchema.path("lower").isRequired).toBe(true);
		expect(ipSchema.path("upper").isRequired).toBeFalsy();
	});

	it("stringifies a bigint so Decimal128 does not lose precision", () => {
		const doc = validate(ipSchema, {
			lower: 2n ** 63n + 1n,
			type: "v6",
		});
		expect(doc.lower.toString()).toBe((2n ** 63n + 1n).toString());
	});

	it("unpacks a BSON Long into its unsigned decimal string", () => {
		const doc = validate(ipSchema, {
			lower: Long.fromString("18446744073709551615", true),
			type: "v6",
		});
		expect(doc.lower.toString()).toBe("18446744073709551615");
	});

	it("passes a plain number straight through", () => {
		const doc = validate(ipSchema, { lower: 3232235777, type: "v4" });
		expect(doc.lower.toString()).toBe("3232235777");
	});

	it("passes a decimal string straight through", () => {
		const doc = validate(ipSchema, { lower: "3232235777", type: "v4" });
		expect(doc.lower.toString()).toBe("3232235777");
	});

	it("requires the address type", () => {
		expect(errorPaths(validate(ipSchema, { lower: 1 }).validateSync())).toEqual(
			["type"],
		);
	});
});

describe("CaptchaRecordSchema", () => {
	const captcha = {
		captchaId: "id",
		captchaContentId: "content",
		datasetId: "dataset",
		datasetContentId: "datasetContent",
		solved: true,
		target: "bus",
		salt: "0x01",
		items: [{ hash: "h", data: "d", type: "image" }],
	};

	it("accepts a fully populated captcha", () => {
		expect(
			validate(CaptchaRecordSchema, captcha).validateSync(),
		).toBeUndefined();
	});

	it("names every missing required field at once", () => {
		expect(
			errorPaths(validate(CaptchaRecordSchema, {}).validateSync()),
		).toEqual([
			"captchaContentId",
			"captchaId",
			"datasetContentId",
			"datasetId",
			"salt",
			"solved",
			"target",
		]);
	});

	it("treats the asset URI and the random key as optional", () => {
		// randomKey is backfilled by a scheduled job, so pre-existing rows have
		// none and must still validate.
		expect(CaptchaRecordSchema.path("assetURI").isRequired).toBeFalsy();
		expect(CaptchaRecordSchema.path("randomKey").isRequired).toBeFalsy();
	});

	it("requires every field of an embedded item", () => {
		const doc = validate(CaptchaRecordSchema, {
			...captcha,
			items: [{ hash: "h" }],
		});
		expect(errorPaths(doc.validateSync())).toEqual([
			"items.0.data",
			"items.0.type",
		]);
	});

	it("accepts an empty item list", () => {
		expect(
			validate(CaptchaRecordSchema, { ...captcha, items: [] }).validateSync(),
		).toBeUndefined();
	});

	it("gives embedded items no id of their own", () => {
		const doc = validate(CaptchaRecordSchema, captcha);
		expect(doc.items[0]._id).toBeUndefined();
	});

	it("carries the compound index that powers random sampling", () => {
		// getRandomCaptcha range-scans this index rather than running $sample
		// over the whole matched set.
		const compound = indexesOf(CaptchaRecordSchema).find(
			([fields]) =>
				"datasetId" in fields && "solved" in fields && "randomKey" in fields,
		);
		expect(compound).toBeDefined();
	});
});

describe("UserSolutionRecordSchema", () => {
	const solution = {
		captchaId: "id",
		captchaContentId: "content",
		salt: "0x01",
		solution: ["a", "b"],
		processed: false,
		checked: false,
		commitmentId: "commitment",
	};

	it("accepts a complete solution", () => {
		expect(
			validate(UserSolutionRecordSchema, solution).validateSync(),
		).toBeUndefined();
	});

	it("stamps createdAt so the TTL has something to expire", () => {
		const doc = validate(UserSolutionRecordSchema, solution);
		expect(doc.createdAt).toBeInstanceOf(Date);
	});

	it("expires solutions after four weeks", () => {
		expect(UserSolutionRecordSchema.path("createdAt").options.expires).toBe(
			60 * 60 * 24 * 7 * 4,
		);
	});

	it("is embedded, so it carries no id", () => {
		const doc = validate(UserSolutionRecordSchema, solution);
		expect(doc._id).toBeUndefined();
	});
});

describe("ScheduledTaskSchema", () => {
	const task = {
		processName: ScheduledTaskNames.BatchCommitment,
		datetime: new Date(),
		status: ScheduledTaskStatus.Running,
	};

	it("accepts a minimal task", () => {
		expect(ScheduledTaskSchema.safeParse(task).success).toBe(true);
	});

	it("rejects a process name outside the enum", () => {
		expect(
			ScheduledTaskSchema.safeParse({ ...task, processName: "nope" }).success,
		).toBe(false);
	});

	it("rejects a status outside the enum", () => {
		expect(
			ScheduledTaskSchema.safeParse({ ...task, status: "nope" }).success,
		).toBe(false);
	});

	it("rejects a datetime that is not a Date", () => {
		expect(
			ScheduledTaskSchema.safeParse({ ...task, datetime: Date.now() }).success,
		).toBe(false);
	});

	it("accepts an optional result carrying arbitrary data", () => {
		const parsed = ScheduledTaskSchema.safeParse({
			...task,
			updated: new Date(),
			result: { data: { rows: 3 }, error: "partial" },
		});
		expect(parsed.success).toBe(true);
	});

	it("accepts an empty result object", () => {
		expect(ScheduledTaskSchema.safeParse({ ...task, result: {} }).success).toBe(
			true,
		);
	});
});

describe("ScheduledTaskRecordSchema", () => {
	it("requires the process name and status", () => {
		expect(
			errorPaths(validate(ScheduledTaskRecordSchema, {}).validateSync()),
		).toEqual(["datetime", "processName", "status"]);
	});

	it("expires task records after a week", () => {
		expect(ScheduledTaskRecordSchema.path("datetime").options.expires).toBe(
			60 * 60 * 24 * 7,
		);
	});

	it("indexes the process name on its own and with the status", () => {
		const indexes = indexesOf(ScheduledTaskRecordSchema).map(([fields]) =>
			Object.keys(fields).join(","),
		);
		expect(indexes).toContain("processName");
		expect(indexes).toContain("processName,status");
	});
});

describe("PoWCaptchaRecordSchema", () => {
	it("requires the challenge and both accounts", () => {
		const paths = errorPaths(
			validate(PoWCaptchaRecordSchema, {}).validateSync(),
		);
		expect(paths).toContain("challenge");
		expect(paths).toContain("dappAccount");
		expect(paths).toContain("userAccount");
	});

	it("leaves every outcome timestamp optional, since they arrive later", () => {
		for (const field of [
			"submittedAtTimestamp",
			"verifiedAtTimestamp",
			"failedAtTimestamp",
			"lastUpdatedTimestamp",
		]) {
			expect(PoWCaptchaRecordSchema.path(field).isRequired).toBeFalsy();
		}
	});

	it("indexes the challenge for lookup by id", () => {
		expect(hasIndexOn(PoWCaptchaRecordSchema, "challenge")).toBe(true);
	});

	it("uses a partial index for the pending-stage sweep", () => {
		// A full index would carry every record; the sweep only ever queries
		// the handful with pendingStage set.
		expect(indexOptions(PoWCaptchaRecordSchema, "pendingStage")).toMatchObject({
			partialFilterExpression: { pendingStage: true },
		});
	});
});

describe("SessionRecordSchema", () => {
	it("requires the session id", () => {
		expect(
			errorPaths(validate(SessionRecordSchema, {}).validateSync()),
		).toContain("sessionId");
	});

	it("defaults the boolean flags rather than requiring them", () => {
		const doc = validate(SessionRecordSchema, {
			sessionId: "s",
			createdAt: new Date(),
		});
		expect(doc.webView).toBe(false);
		expect(doc.iFrame).toBe(false);
		expect(doc.decryptedHeadHash).toBe("");
	});

	it("constrains the session id to be unique", () => {
		expect(indexOptions(SessionRecordSchema, "sessionId")).toMatchObject({
			unique: true,
		});
	});

	it("keeps the analytics indexes sparse", () => {
		// Only a small subset of sessions carry these fields, so a dense index
		// would cost far more than it saves.
		expect(indexOptions(SessionRecordSchema, "isEscalation")).toMatchObject({
			sparse: true,
		});
		expect(indexOptions(SessionRecordSchema, "isProtect")).toMatchObject({
			sparse: true,
		});
		expect(indexOptions(SessionRecordSchema, "ruleHash")).toMatchObject({
			sparse: true,
		});
	});
});

describe("UserSettingsSchema", () => {
	const settings = (
		overrides: Record<string, unknown> = {},
		// biome-ignore lint/suspicious/noExplicitAny: the document type is generated by mongoose
	): any => validate(UserSettingsSchema, overrides);

	it("applies the shared defaults when nothing is supplied", () => {
		const doc = settings();
		expect(doc.captchaType).toBe(captchaTypeDefault);
		expect(doc.powDifficulty).toBe(powDifficultyDefault);
		expect([...doc.domains]).toEqual(domainsDefault);
	});

	it("rejects a captcha type outside the enum", () => {
		expect(
			errorPaths(settings({ captchaType: "sudoku" }).validateSync()),
		).toEqual(["captchaType"]);
		expect(
			settings({ captchaType: CaptchaType.pow }).validateSync(),
		).toBeUndefined();
	});

	it("leaves every traffic-filter category unconfigured by default (submit-time abuser default is applied by resolveTrafficFilterCheck)", () => {
		const doc = settings();
		expect(doc.trafficFilter.vpn).toBeUndefined();
		expect(doc.trafficFilter.tor).toBeUndefined();
		expect(doc.trafficFilter.abuser).toBeUndefined();
		expect(doc.trafficFilter.skipExtrasOnValidDnsPath).toBe(true);
	});

	it("bounds the abuser score threshold to the unit interval", () => {
		expect(
			errorPaths(
				settings({
					trafficFilter: { abuserScoreThreshold: 1.5 },
				}).validateSync(),
			),
		).toEqual(["trafficFilter.abuserScoreThreshold"]);
		expect(
			errorPaths(
				settings({
					trafficFilter: { abuserScoreThreshold: -0.1 },
				}).validateSync(),
			),
		).toEqual(["trafficFilter.abuserScoreThreshold"]);
		expect(
			settings({ trafficFilter: { abuserScoreThreshold: 1 } }).validateSync(),
		).toBeUndefined();
	});

	it("rejects a negative auto-ban threshold", () => {
		expect(
			errorPaths(settings({ autoBanScoreThreshold: -1 }).validateSync()),
		).toEqual(["autoBanScoreThreshold"]);
	});

	it("defaults the honeypot to a disabled morse challenge", () => {
		const doc = settings();
		expect(doc.honeypot.enabled).toBe(false);
		expect(doc.honeypot.encodingType).toBe("morse");
	});

	it("allows only the two honeypot encodings", () => {
		expect(
			errorPaths(
				settings({ honeypot: { encodingType: "braille" } }).validateSync(),
			),
		).toEqual(["honeypot.encodingType"]);
		expect(
			settings({ honeypot: { encodingType: "semaphore" } }).validateSync(),
		).toBeUndefined();
	});

	it("defaults the spam filter and its email rules to off", () => {
		const doc = settings();
		expect(doc.spamFilter.enabled).toBe(false);
		expect(doc.spamFilter.emailRules.enabled).toBe(false);
		expect([...doc.spamFilter.emailRules.customRegexBlocklist]).toEqual([]);
	});

	it("seeds the context-aware thresholds for both contexts", () => {
		const doc = settings();
		expect(Object.keys(doc.contextAware.contexts).sort()).toEqual(
			Object.keys(doc.contextAware.contexts).sort(),
		);
		expect(doc.contextAware.enabled).toBe(false);
	});

	it("leaves the ip validation rules unset unless configured", () => {
		expect(settings().ipValidationRules).toBeUndefined();
	});

	it("applies the ip validation defaults once the block is present", () => {
		const doc = settings({ ipValidationRules: {} });
		expect(doc.ipValidationRules.enabled).toBe(false);
		expect(doc.ipValidationRules.forceConsistentIp).toBe(false);
		expect(doc.ipValidationRules.countryOverrides).toBeUndefined();
	});

	it("rejects a negative distance threshold", () => {
		expect(
			errorPaths(
				settings({
					ipValidationRules: { distanceThresholdKm: -1 },
				}).validateSync(),
			),
		).toEqual(["ipValidationRules.distanceThresholdKm"]);
	});
});

describe("UserDataSchema", () => {
	it("requires nothing, so partial signups can be persisted", () => {
		expect(validate(UserDataSchema, {}).validateSync()).toBeUndefined();
	});

	it("nests the user settings and applies their defaults", () => {
		const doc = validate(UserDataSchema, { settings: {} });
		expect(doc.settings.captchaType).toBe(captchaTypeDefault);
	});
});

describe("the stored-event schemas", () => {
	it("reuse the session schema verbatim", () => {
		expect(StoredSessionRecordSchema).toBe(SessionRecordSchema);
	});

	it("index the session id on every stored captcha type", () => {
		for (const schema of [
			StoredUserCommitmentRecordSchema,
			StoredPoWCaptchaRecordSchema,
			StoredPuzzleCaptchaRecordSchema,
		]) {
			expect(hasIndexOn(schema, "sessionId")).toBe(true);
		}
	});

	it("are copies, so indexing them does not touch the provider schemas", () => {
		// The provider and the event store are separate databases; adding a
		// sessionId index to one must not add it to the other.
		expect(StoredPoWCaptchaRecordSchema).not.toBe(PoWCaptchaRecordSchema);
		expect(hasIndexOn(PoWCaptchaRecordSchema, "sessionId")).toBe(false);
	});
});
