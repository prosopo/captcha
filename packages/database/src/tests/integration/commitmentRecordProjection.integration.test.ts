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
	IpAddressType,
} from "@prosopo/types";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ProviderDatabase } from "../../databases/provider.js";

// Regression guard for the same class of bug as #3107
// (`getSessionRecordBySessionId` missing tcp-probe fields), this time on
// the two commitment fetchers used by `verifyImageCaptchaSolution`.
//
// Both `getDappUserCommitmentById` and `getDappUserCommitmentByAccount`
// project a subset of the record; the verify path then reads fields off
// the returned `solution`. If a field the verify path reads is absent
// from the projection it lands as `undefined`, silently degrading
// downstream behaviour.
//
// Fix: both methods now share `DAPP_USER_COMMITMENT_PROJECTION`, which
// enumerates every field the verify path reads from `solution`.
//
// Guard: persist a full commitment, fetch via both methods, assert every
// field the verify path reads round-trips. A future projection narrowing
// that drops any of them re-introduces the silent degradation.

const logger = getLogger(
	LogLevel.enum.error,
	"commitmentRecordProjection.test",
);

// Stub Redis: none of the commitment-read code path touches it.
class TestProviderDatabase extends ProviderDatabase {
	protected override async setupRedis(): Promise<void> {
		// intentionally empty
	}
}

const ipv4Composite = (lower: bigint): CompositeIpAddress => ({
	lower,
	type: IpAddressType.v4,
});

const commitmentIdOf = (suffix: string): string =>
	`commitment-projection-${suffix}`;

const c1Event = (t: number) => ({
	x: 720 + t,
	y: 500,
	timestamp: 1_787_567_678_500 + t,
	velocity: 0,
});

const c3Event = (t: number) => ({
	x: 500,
	y: 400,
	timestamp: 1_787_567_668_000 + t * 100,
	eventType: "click",
	button: 0,
	targetElement: "IMG",
	ctrlKey: false,
	shiftKey: false,
	altKey: false,
});

const buildCommitment = (id: string) => ({
	id,
	userAccount: "user-projection",
	dappAccount: "dapp-projection",
	providerAccount: "provider-projection",
	datasetId: "dataset-projection",
	result: { status: CaptchaStatus.approved },
	userSignature: "sig-projection",
	ipAddress: ipv4Composite(1n),
	headers: {
		host: "example.com",
		"user-agent": "Mozilla/5.0",
	},
	ja4: "ja4-projection",
	userSubmitted: true,
	serverChecked: false,
	requestedAtTimestamp: new Date(),
	submittedAtTimestamp: new Date(),
	pending: false,
	salt: "salt-projection",
	requestHash: "0xdeadbeef",
	deadlineTimestamp: new Date(Date.now() + 60_000),
	threshold: 0.5,
	sessionId: "session-projection",
	ipInfo: {
		ip: "203.0.113.1",
		isValid: true as const,
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
		abuserScore: 0,
		companyAbuserScore: 0,
	},
	coords: [
		[
			[723, 766],
			[536, 450],
		],
	] as [number, number][][],
	deviceCapability: "desktop",
	behavioralDataPacked: {
		c1: [c1Event(0), c1Event(1), c1Event(2)],
		c2: [] as unknown[],
		c3: [c3Event(0), c3Event(1)],
		d: "desktop",
	},
});

describe("getDappUserCommitment{ById,ByAccount} projection", () => {
	let mongod: MongoMemoryServer;
	let db: TestProviderDatabase;

	beforeAll(async () => {
		mongod = await MongoMemoryServer.create();
		db = new TestProviderDatabase({
			mongo: { url: mongod.getUri(), dbname: "captchastorage" },
			logger,
		});
		await db.connect();
	});

	afterAll(async () => {
		await db.close();
		await mongod.stop();
	});

	// Core guard: behavioralDataPacked must survive the ById fetch.
	it("returns behavioralDataPacked when the record on disk carries a payload", async () => {
		const id = commitmentIdOf("bdp-by-id");
		await db.tables.commitment.create(buildCommitment(id));

		const got = await db.getDappUserCommitmentById(id);
		if (!got) throw new Error("commitment not returned");

		expect(got.behavioralDataPacked).toBeDefined();
		expect(got.behavioralDataPacked?.c1.length).toBe(3);
		expect(got.behavioralDataPacked?.c2.length).toBe(0);
		expect(got.behavioralDataPacked?.c3.length).toBe(2);
		expect(got.behavioralDataPacked?.d).toBe("desktop");
	});

	// Every field the verify path reads off `solution`. A missing one
	// here means the verify path sees `undefined`. Enumerated explicitly
	// so a diff on any single field points straight at the projection
	// line to add.
	it("returns every field the verify path reads from solution (by-id)", async () => {
		const id = commitmentIdOf("verify-reads-by-id");
		await db.tables.commitment.create(buildCommitment(id));

		const got = await db.getDappUserCommitmentById(id);
		if (!got) throw new Error("commitment not returned");

		expect(got.userAccount).toBe("user-projection");
		expect(got.dappAccount).toBe("dapp-projection");
		expect(got.headers).toBeDefined();
		expect(got.deviceCapability).toBe("desktop");
		expect(got.ipInfo).toBeDefined();
		expect(got.ipInfo?.isValid).toBe(true);
		expect(got.coords).toBeDefined();
		expect(got.coords?.[0]?.[0]).toEqual([723, 766]);
		expect(got.serverChecked).toBe(false);
		expect(got.sessionId).toBe("session-projection");
		expect(got.result?.status).toBe(CaptchaStatus.approved);
		expect(got.ipAddress).toBeDefined();
		expect(got.submittedAtTimestamp).toBeInstanceOf(Date);
	});

	// The by-account path used to project only {_id: 0, result: 1}, so
	// anything downstream reading `solution.<X>` for X ≠ result got
	// `undefined`. Same round-trip guarantee as by-id after the fix.
	it("by-account fallback returns behavioralDataPacked (was {_id:0, result:1})", async () => {
		const id = commitmentIdOf("bdp-by-account");
		await db.tables.commitment.create(buildCommitment(id));

		const docs = await db.getDappUserCommitmentByAccount(
			"user-projection",
			"dapp-projection",
		);
		expect(docs.length).toBeGreaterThanOrEqual(1);
		const got = docs[0];
		if (!got) throw new Error("commitment not returned");

		expect(got.behavioralDataPacked?.c1.length).toBe(3);
		expect(got.behavioralDataPacked?.c3.length).toBe(2);
		expect(got.userAccount).toBe("user-projection");
		expect(got.dappAccount).toBe("dapp-projection");
		expect(got.headers).toBeDefined();
		expect(got.ipInfo?.isValid).toBe(true);
		expect(got.coords?.[0]?.[0]).toEqual([723, 766]);
	});

	// Both methods must project the same set — they're the two branches
	// of the same conditional in `imgCaptchaTasks.verifyImageCaptchaSolution`
	// (`commitmentId ? getById : getByAccount`). Divergence silently
	// degrades the by-account branch.
	it("by-id and by-account return the same shape of verify-path fields", async () => {
		const id = commitmentIdOf("parity");
		await db.tables.commitment.create(buildCommitment(id));

		const byId = await db.getDappUserCommitmentById(id);
		const byAccountDocs = await db.getDappUserCommitmentByAccount(
			"user-projection",
			"dapp-projection",
		);
		const byAccount = byAccountDocs.find((d) => d.id === id);
		if (!byId || !byAccount) throw new Error("commitment not returned");

		const verifyPathReads = [
			"userAccount",
			"dappAccount",
			"headers",
			"behavioralDataPacked",
			"deviceCapability",
			"ipInfo",
			"coords",
			"sessionId",
			"serverChecked",
			"result",
			"ipAddress",
			"submittedAtTimestamp",
		] as const;

		for (const key of verifyPathReads) {
			expect(
				byAccount[key],
				`field '${key}' present via by-id but missing via by-account — projections have diverged`,
			).toBeDefined();
			expect(byId[key]).toBeDefined();
		}
	});
});
