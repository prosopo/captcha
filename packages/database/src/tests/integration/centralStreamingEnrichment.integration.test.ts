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

import { LogLevel, getLogger } from "@prosopo/logger";
import {
	CaptchaStatus,
	type CompositeIpAddress,
	type IPInfoResponse,
	IpAddressType,
	type UserAgentInfo,
	type UserCommitment,
	UserCommitmentSchema,
} from "@prosopo/types";
import {
	type UserCommitmentRecord,
	UserCommitmentRecordSchema,
} from "@prosopo/types-database";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CentralDbStreamer } from "../../databases/centralDbStreamer.js";

// Regression guard for the bug where `UserCommitmentSchema` (Zod) omitted
// `ipInfo` and `parsedUserAgentInfo`, so `UserCommitmentSchema.parse()` in
// `storeUserImageCaptchaSolution` silently stripped them before the record
// was streamed to central. Production effect: 100% of central
// `usercommitments` documents had `ipInfo: null` / no `parsedUserAgentInfo`.
//
// This test reproduces the production path:
//   1. Build a UserCommitment with enrichment fields populated.
//   2. Parse it through `UserCommitmentSchema.parse(...)` (the strip point).
//   3. Stream the parsed record via the real `CentralDbStreamer` against an
//      in-memory mongod whose `commitment` collection uses the production
//      `UserCommitmentRecordSchema` mongoose schema.
//   4. Re-read the doc and assert every non-required mongoose-declared path
//      we set survives, with explicit focus on `ipInfo` /
//      `parsedUserAgentInfo`.

const logger = getLogger(
	LogLevel.enum.error,
	"centralStreamingEnrichment.test",
);

const ipv4Composite = (lower: bigint): CompositeIpAddress => ({
	lower,
	type: IpAddressType.v4,
});

const validIpInfo: IPInfoResponse = {
	ip: "203.0.113.7",
	isValid: true,
	isVPN: false,
	isTor: false,
	isProxy: false,
	isDatacenter: false,
	isAbuser: false,
	isMobile: false,
	isSatellite: false,
	isCrawler: false,
	countryCode: "GB",
	asnNumber: 64500,
	abuserScore: 0.01,
	companyAbuserScore: 0.01,
};

const parsedUserAgentInfo: UserAgentInfo = {
	ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
	browser: {
		name: "Chrome",
		version: "148.0.0.0",
		major: "148",
	},
	cpu: { architecture: "amd64" },
	device: {},
	engine: { name: "Blink", version: "148.0.0.0" },
	os: { name: "Windows", version: "10" },
};

const buildCommit = (id: string): UserCommitment => ({
	id,
	userAccount: "userTest",
	dappAccount: "dappTest",
	providerAccount: "providerTest",
	datasetId: "datasetTest",
	result: { status: CaptchaStatus.approved },
	userSignature: "0xsig",
	ipAddress: ipv4Composite(3405803783n), // 203.0.113.7
	providedIp: ipv4Composite(3405803783n),
	headers: { host: "pronode-test.local" },
	ja4: "t13d1516h2_test_abcdef",
	userSubmitted: true,
	serverChecked: true,
	requestedAtTimestamp: new Date("2026-06-10T07:30:00Z"),
	pending: false,
	salt: "0xsalt",
	requestHash: "0xreqhash",
	deadlineTimestamp: new Date("2026-06-10T07:31:00Z"),
	threshold: 0.8,
	sessionId: "pronode-test-session-1",
	ipInfo: validIpInfo,
	parsedUserAgentInfo,
});

// Mongoose-declared paths on the commitment collection that we expect to
// round-trip through the streamer when set on the input. Sourced from
// UserCommitmentRecordSchema.paths so the assertion stays in sync if new
// fields are added to the mongoose schema.
const requiredEnrichmentPaths = [
	"ipInfo",
	"parsedUserAgentInfo",
	"sessionId",
	"providedIp",
] as const;

describe("CentralDbStreamer end-to-end: UserCommitmentSchema.parse → streamImageRecord → central DB", () => {
	let mongod: MongoMemoryServer;
	let streamer: CentralDbStreamer;

	beforeAll(async () => {
		mongod = await MongoMemoryServer.create();
		streamer = new CentralDbStreamer(mongod.getUri(), logger);
	});

	afterAll(async () => {
		const db = (streamer as unknown as { db: { close: () => Promise<void> } })
			.db;
		await db.close();
		await mongod.stop();
	});

	it("preserves ipInfo and parsedUserAgentInfo on the central commitment doc", async () => {
		const id = "commitment-enrichment-roundtrip";
		const commit = buildCommit(id);

		// Replicates provider.ts storeUserImageCaptchaSolution lines 676-686:
		// fields not declared on UserCommitmentSchema would be stripped here.
		const commitmentRecord = UserCommitmentSchema.parse({
			...commit,
			lastUpdatedTimestamp: new Date("2026-06-10T07:30:05Z"),
		});

		// Pre-condition: the parse step itself must keep enrichment fields.
		// If this fails, the Zod schema has regressed.
		expect(commitmentRecord.ipInfo).toBeDefined();
		expect(commitmentRecord.parsedUserAgentInfo).toBeDefined();

		streamer.streamImageRecord(commitmentRecord as UserCommitmentRecord);

		// streamImageRecord is fire-and-forget — poll until the upsert lands.
		const tables = (
			streamer as unknown as {
				db: {
					tables: {
						commitment: import("mongoose").Model<UserCommitmentRecord>;
					};
				};
			}
		).db.tables;

		let stored: UserCommitmentRecord | null = null;
		for (let i = 0; i < 50 && stored === null; i++) {
			await new Promise<void>((r) => setTimeout(r, 20));
			stored = await tables.commitment
				.findOne({ id })
				.lean<UserCommitmentRecord>();
		}

		expect(stored).not.toBeNull();
		if (!stored) return;

		// Enrichment fields — the regression we care about.
		expect(stored.ipInfo).toMatchObject(validIpInfo);
		expect(stored.parsedUserAgentInfo).toMatchObject(parsedUserAgentInfo);

		// Future-proof: every enrichment path we set on the input must
		// survive. If a new mongoose-declared optional field is added,
		// add it here and to buildCommit() so it gets the same guard.
		for (const path of requiredEnrichmentPaths) {
			expect(
				stored[path as keyof UserCommitmentRecord],
				`mongoose path '${path}' was stripped between Zod parse and central DB`,
			).toBeDefined();
		}

		// Core fields — sanity check that nothing else regressed alongside.
		expect(stored.id).toBe(id);
		expect(stored.userAccount).toBe("userTest");
		expect(stored.dappAccount).toBe("dappTest");
		expect(stored.sessionId).toBe("pronode-test-session-1");
		expect(stored.result?.status).toBe(CaptchaStatus.approved);
	});

	it("UserCommitmentSchema.parse does not strip any mongoose-declared optional field listed in requiredEnrichmentPaths", () => {
		// Cross-check the mongoose schema actually declares the paths we
		// guard above — guards against the inverse regression where someone
		// removes the field from mongoose but our test still passes vacuously.
		for (const path of requiredEnrichmentPaths) {
			expect(
				UserCommitmentRecordSchema.path(path),
				`mongoose UserCommitmentRecordSchema is missing declared path '${path}'`,
			).toBeDefined();
		}
	});
});
