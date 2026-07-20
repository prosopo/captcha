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
	CaptchaType,
	type CompositeIpAddress,
	IpAddressType,
} from "@prosopo/types";
import { SessionRecordSchema } from "@prosopo/types-database";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ProviderDatabase } from "../../databases/provider.js";

// Regression guard for the production bug observed on pronode11 (and other
// nodes) on 2026-06-16, the day routing machines were enabled for edge.
//
// Symptom: every PoW submission that the post-PoW routing machine escalated
// to image/puzzle failed with `DATABASE.SESSION_STORE_FAILED`. The wrapped
// Mongoose `ValidationError` listed `token`, `score`, `threshold`,
// `ipAddress.lower`, and `ipAddress.type` as missing required fields.
//
// Root cause: `submitPoWCaptchaSolution.buildEscalation` fetches the
// originating session via `ProviderDatabase.getSessionRecordBySessionId`
// and forwards its fields (token / score / threshold / ipAddress / …)
// into `frictionlessManager.createSession`, which `Session.create()`s a
// new record. `getSessionRecordBySessionId` had been narrowed in
// PR #2393 to a six-field Mongoose projection that excluded every one of
// those fields. They came back `undefined`, the new session document
// failed schema validation, and the escalation 500'd — breaking the
// captcha flow for any user who triggered a routing escalation.
//
// Fix: widen the projection to cover every field a caller of this function
// actually reads — but keep it a projection (not a full document fetch).
// `headers` is enumerated key-by-key via dotted projection rather than
// pulled whole: the persisted blob can contain `headers.x-tls-clienthello`,
// a base64-encoded TLS ClientHello (multi-KB per session) that's only
// consumed at the frictionless entry by ja4Middleware reading
// `req.headers` directly. Dotted projection avoids the read cost without
// needing a `path collision`-prone mixed inclusion/exclusion.
//
// This test guards both ends:
//   1. Every top-level field `buildEscalation` (and the other readers)
//      forwards is still returned — re-narrowing re-introduces the
//      production bug.
//   2. Standard browser/protocol header keys round-trip via
//      `headers.<key>`, and `headers.x-tls-clienthello` does NOT — a
//      future projection that pulls `headers` whole would re-introduce
//      the multi-KB read on every session lookup.

const logger = getLogger(LogLevel.enum.error, "sessionRecordProjection.test");

// Stub out Redis so we can exercise the real ProviderDatabase methods
// against MongoMemory without standing up a Redis sidecar. None of the
// session-read code path touches Redis.
class TestProviderDatabase extends ProviderDatabase {
	protected override async setupRedis(): Promise<void> {
		// intentionally empty
	}
}

const ipv4Composite = (lower: bigint): CompositeIpAddress => ({
	lower,
	type: IpAddressType.v4,
});

describe("getSessionRecordBySessionId projection", () => {
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

	it("round-trips every field buildEscalation forwards into createSession", async () => {
		const sessionId = "session-projection-roundtrip";
		const createdAt = new Date();
		const ipAddress = ipv4Composite(16843009n);

		await db.tables.session.create({
			sessionId,
			createdAt,
			token: "tok-roundtrip",
			score: 0.42,
			threshold: 0.5,
			scoreComponents: { baseScore: 0.42, lScore: 0.1 },
			ipAddress,
			captchaType: CaptchaType.pow,
			mode: undefined,
			solvedImagesCount: 3,
			userSitekeyIpHash: "hash-abc",
			webView: true,
			iFrame: false,
			decryptedHeadHash: "head-hash-xyz",
			siteKey: "site-key-1",
			reason: "user-passed",
			currentUrl: "https://example.com/checkout",
			iframeUrl: "https://widget.example.com/embed",
			headers: {
				"user-agent": "Mozilla/5.0",
				"accept-language": "en-GB",
				// Heavy field — base64-encoded TLS ClientHello (multi-KB in
				// production). Excluded from the projection.
				"x-tls-clienthello": "AAAAAAAAAAAAAA==".repeat(200),
			},
		});

		const got = await db.getSessionRecordBySessionId(sessionId);

		expect(got).toBeDefined();
		if (!got) throw new Error("session not returned");

		// Fields the Mongoose schema marks `required: true` — these are
		// the exact ones that came back undefined in production and
		// triggered the schema ValidationError on the escalation insert.
		expect(got.token).toBe("tok-roundtrip");
		expect(got.score).toBe(0.42);
		expect(got.threshold).toBe(0.5);
		expect(got.ipAddress).toBeDefined();
		expect(got.ipAddress?.type).toBe(IpAddressType.v4);
		expect(got.ipAddress?.lower).toBeDefined();

		// Optional fields that `buildEscalation` still forwards — a future
		// projection narrowing that drops any of these would silently
		// degrade the escalated session's risk profile / cache key /
		// routing behaviour, so guard them too.
		expect(got.siteKey).toBe("site-key-1");
		expect(got.solvedImagesCount).toBe(3);
		expect(got.userSitekeyIpHash).toBe("hash-abc");
		expect(got.scoreComponents?.baseScore).toBe(0.42);
		expect(got.webView).toBe(true);
		expect(got.iFrame).toBe(false);
		expect(got.decryptedHeadHash).toBe("head-hash-xyz");
		expect(got.reason).toBe("user-passed");
		// currentUrl / iframeUrl are forwarded onto the escalation session so
		// downstream analytics (attack attribution, per-URL routing) survive
		// the PoW → image/puzzle hop. Missed on the original projection
		// (2026-07-09): 100% of escalation sessions were storing
		// `currentUrl: undefined` in prod.
		expect(got.currentUrl).toBe("https://example.com/checkout");
		expect(got.iframeUrl).toBe("https://widget.example.com/embed");

		// Headers come back so `buildEscalation` can forward them onto the
		// escalation session, but the multi-KB `x-tls-clienthello` is
		// dropped via nested-field exclusion.
		expect(got.headers?.["user-agent"]).toBe("Mozilla/5.0");
		expect(got.headers?.["accept-language"]).toBe("en-GB");
		expect(got.headers?.["x-tls-clienthello"]).toBeUndefined();
	});

	// Reproduces the production failure path end-to-end: read an origin
	// session via getSessionRecordBySessionId, then persist a new session
	// populated from that read (mirroring what `buildEscalation` +
	// `frictionlessManager.createSession` do). With a too-narrow projection
	// the new session insert fails with the exact ValidationError seen in
	// prod ("token is required", "ipAddress.lower is required", ...). With
	// the correct projection it succeeds. This guards the projection
	// against the specific buildEscalation contract.
	it("a session read via getSessionRecordBySessionId can be re-persisted as a new escalation session", async () => {
		const originSessionId = "session-escalation-origin";
		await db.tables.session.create({
			sessionId: originSessionId,
			createdAt: new Date(),
			token: "tok-escalation",
			score: 0.6,
			threshold: 0.5,
			scoreComponents: { baseScore: 0.6 },
			ipAddress: ipv4Composite(16843009n),
			captchaType: CaptchaType.pow,
			webView: false,
			iFrame: false,
			decryptedHeadHash: "head-escalation",
			siteKey: "site-key-escalation",
		});

		const origin = await db.getSessionRecordBySessionId(originSessionId);
		if (!origin) throw new Error("origin session not returned");

		// Mirror frictionlessManager.createSession: a fresh sessionId +
		// createdAt, forwarded risk profile from the origin, escalated
		// captchaType from the routing machine. The original production
		// failure was here — required-field ValidationError on .create().
		await expect(
			db.tables.session.create({
				sessionId: "session-escalation-new",
				createdAt: new Date(),
				token: origin.token,
				score: origin.score,
				threshold: origin.threshold,
				scoreComponents: origin.scoreComponents,
				ipAddress: origin.ipAddress,
				captchaType: CaptchaType.image,
				webView: origin.webView,
				iFrame: origin.iFrame,
				decryptedHeadHash: origin.decryptedHeadHash,
				siteKey: origin.siteKey,
			}),
		).resolves.toBeDefined();
	});

	// Schema-contract guard: any field marked `required: true` on
	// SessionRecordSchema must be present in the projection — otherwise
	// callers like buildEscalation that forward the field into a new
	// `.create()` will get a ValidationError. This test fails the next
	// time someone adds a required field to the Session schema without
	// also extending the projection in `getSessionRecordBySessionId`.
	it("every required Session schema field is included in the projection", async () => {
		// Defaults (`required: true, default: <value>`) cover themselves;
		// the production bug was about fields with no default. Filter
		// those out so the assertion is specific.
		const requiredPathsWithoutDefault = Object.entries(
			SessionRecordSchema.paths,
		)
			.filter(([, pathSchema]) => {
				const p = pathSchema as {
					isRequired?: boolean;
					defaultValue?: unknown;
				};
				return p.isRequired === true && p.defaultValue === undefined;
			})
			.map(([name]) => name);

		// Sanity: production-failure paths are in this list.
		expect(requiredPathsWithoutDefault).toEqual(
			expect.arrayContaining(["token", "score", "threshold"]),
		);

		const sessionId = "session-required-fields";
		await db.tables.session.create({
			sessionId,
			createdAt: new Date(),
			token: "tok-required",
			score: 0.1,
			threshold: 0.2,
			scoreComponents: { baseScore: 0.1 },
			ipAddress: ipv4Composite(16843009n),
			captchaType: CaptchaType.pow,
			webView: false,
			iFrame: false,
		});

		const got = await db.getSessionRecordBySessionId(sessionId);
		if (!got) throw new Error("session not returned");

		// `createdAt`/`captchaType` are regenerated/overridden on the new
		// escalation session, so they don't need to round-trip through this
		// function. Every other required-without-default field, however, is
		// forwarded by `buildEscalation` from origin to new session and must
		// come back from the read.
		const forwardedRequiredFields = requiredPathsWithoutDefault.filter(
			(p) => p !== "createdAt" && p !== "captchaType" && p !== "sessionId",
		);

		const gotRecord = got as unknown as Record<string, unknown>;
		for (const path of forwardedRequiredFields) {
			// Top-level fields only; nested required leaves (e.g.
			// `ipAddress.lower`) are guarded by Mongoose returning the
			// subdoc as a single object.
			const top = path.split(".")[0] ?? path;
			expect(
				gotRecord[top],
				`required Session field '${top}' (from schema path '${path}') was missing from the projection — extend getSessionRecordBySessionId`,
			).toBeDefined();
		}
	});
});
