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

// Regression guard for the production bug observed on Twickets pre-go-live on
// 2026-08-24. Same failure mode as the tcp-probe projection bug fixed in
// #3107 for `getSessionRecordBySessionId`, this time on the two commitment
// fetchers used by `verifyImageCaptchaSolution`.
//
// Symptom: every no-cache POST captcha submission from a legit user with
// DevTools "Disable cache" enabled was disapproved with
// `no-cache request with no behavioural data`, even though the record on
// disk carried ~50 real c1 + c3 events.
//
// Root cause: `ProviderDatabase.getDappUserCommitmentById` projected 13
// fields but omitted `behavioralDataPacked`, `deviceCapability`, and
// `coords`. The sibling `getDappUserCommitmentByAccount` projected only
// `{_id: 0, result: 1}` — so on the by-account fallback path *every*
// field the verify code reads off the returned `solution` (userAccount,
// dappAccount, headers, ipInfo, sessionId, ipAddress, behavioralDataPacked,
// deviceCapability, coords) landed as `undefined` at the DM. In practice:
//
//   - `noCacheNoBdpRule` fires on every request that carries
//     `cache-control: no-cache` because
//     `hasBehaviouralData(undefined) === false` — so the guard denies
//     legit users whose browser (e.g. Brave with "Disable cache" on)
//     adds the header on captcha POSTs.
//   - `syntheticMouseTimingRule`, `clickBeforeMoveRule`, and every
//     other BDP-reading rule silently return `null` — no bot signal
//     was ever caught on this path.
//   - The by-account variant additionally strips `ipInfo`, `headers`,
//     `userAccount`, ... so IP-category rules, header-shape rules, and
//     the head-hash denylist all no-op there too.
//
// Fix: both methods now share `DAPP_USER_COMMITMENT_PROJECTION`, which
// enumerates every field the DM input builder in
// `imgCaptchaTasks.verifyImageCaptchaSolution` reads from `solution`.
//
// Guard: persist a full commitment (BDP + coords + deviceCapability +
// ipInfo), fetch via both methods, assert each field round-trips. A future
// projection narrowing that drops any of them re-introduces the silent
// no-op / false-positive deny.

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

const commitmentIdOf = (suffix: string): string => `commitment-projection-${suffix}`;

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
	ipAddress: ipv4Composite(1_378_604_724n),
	headers: {
		host: "example.com",
		"cache-control": "no-cache",
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
		ip: "82.43.214.180",
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
		asnNumber: 2856,
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

	// Core guard for the Twickets bug: BDP must survive the ById fetch.
	it("returns behavioralDataPacked so noCacheNoBdpRule sees the real payload", async () => {
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

	// Every field the DM input builder in verifyImageCaptchaSolution reads
	// off `solution`. A missing one here means whichever DM rule reads
	// `input.<field>` silently no-ops or trips the wrong way. Enumerated
	// explicitly rather than deep-equal so a diff on any single field
	// points straight at the projection line to add.
	it("returns every field the DM input builder reads from solution (by-id)", async () => {
		const id = commitmentIdOf("dm-inputs-by-id");
		await db.tables.commitment.create(buildCommitment(id));

		const got = await db.getDappUserCommitmentById(id);
		if (!got) throw new Error("commitment not returned");

		expect(got.userAccount).toBe("user-projection");
		expect(got.dappAccount).toBe("dapp-projection");
		expect(got.headers).toBeDefined();
		expect(got.headers?.["cache-control"]).toBe("no-cache");
		expect(got.deviceCapability).toBe("desktop");
		expect(got.ipInfo).toBeDefined();
		expect(got.ipInfo?.isValid).toBe(true);
		expect(got.coords).toBeDefined();
		expect(got.coords?.[0]?.[0]).toEqual([723, 766]);
		// Verify-path fields the caller also reads:
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
		expect(got.headers?.["cache-control"]).toBe("no-cache");
		expect(got.ipInfo?.isValid).toBe(true);
		expect(got.coords?.[0]?.[0]).toEqual([723, 766]);
	});

	// Both methods must project the same set — they're the two branches
	// of the same conditional in `imgCaptchaTasks.verifyImageCaptchaSolution`
	// (line 683-685: `commitmentId ? getById : getByAccount`). If they
	// diverge, the by-account branch silently degrades the DM. Assert
	// parity on the fields the caller actually reads.
	it("by-id and by-account return the same shape of DM-input fields", async () => {
		const id = commitmentIdOf("parity");
		await db.tables.commitment.create(buildCommitment(id));

		const byId = await db.getDappUserCommitmentById(id);
		const byAccountDocs = await db.getDappUserCommitmentByAccount(
			"user-projection",
			"dapp-projection",
		);
		const byAccount = byAccountDocs.find((d) => d.id === id);
		if (!byId || !byAccount) throw new Error("commitment not returned");

		const dmInputKeys = [
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

		for (const key of dmInputKeys) {
			expect(
				byAccount[key],
				`field '${key}' present via by-id but missing via by-account — projections have diverged`,
			).toBeDefined();
			expect(byId[key]).toBeDefined();
		}
	});
});
