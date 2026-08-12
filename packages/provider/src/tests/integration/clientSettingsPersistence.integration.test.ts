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

// Why this test exists:
//
// `updateClientRecords` performs a Mongoose `$set` against `UserSettingsSchema`.
// Strict mode silently drops fields that aren't declared on the schema, which
// is how `autoBanScoreThreshold` shipped to portal + API but never actually
// reached the provider's client record (see PR prosopo/captcha#2599).
//
// Mocked-DB tests don't catch this — only a real Mongo round-trip does. This
// suite registers a site key with **every** field on `ClientSettingsSchema`
// populated, reads the record back, and asserts each field survived the
// write. A future addition to `ClientSettingsSchema` that forgets the
// Mongoose-schema counterpart will fail this test on the affected field
// instead of silently dropping in production.

import { ProviderEnvironment } from "@prosopo/env";
import { Tasks } from "@prosopo/provider";
import {
	CaptchaType,
	ContextType,
	DatabaseTypes,
	EncodingType,
	IPValidationAction,
	type IUserSettings,
	ProsopoConfigSchema,
	Tier,
	TrafficFilterAction,
} from "@prosopo/types";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// `satisfies` (rather than a `: IUserSettings` annotation) so TypeScript
// keeps the narrow literal type — every nested sub-document is known to
// be present, so the assertions below don't need `!` non-null assertions.
const FULLY_POPULATED_SETTINGS = {
	captchaType: CaptchaType.frictionless,
	domains: ["example.com", "*.example.com"],
	frictionlessThreshold: 0.42,
	powDifficulty: 6,
	imageThreshold: 0.81,
	imageMaxRounds: 12,
	autoBanScoreThreshold: 0.95,
	verifiedTimeout: 120000,
	solutionTimeout: 60000,
	puzzleTolerance: 20,
	disallowWebView: true,
	contextAware: {
		enabled: true,
		contexts: {
			[ContextType.Default]: {
				type: ContextType.Default,
				threshold: 0.72,
			},
			[ContextType.Webview]: {
				type: ContextType.Webview,
				threshold: 0.68,
			},
		},
	},
	ipValidationRules: {
		enabled: true,
		actions: {
			countryChangeAction: IPValidationAction.Reject,
			cityChangeAction: IPValidationAction.Flag,
			ispChangeAction: IPValidationAction.Allow,
			distanceExceedAction: IPValidationAction.Reject,
			abuseScoreExceedAction: IPValidationAction.Reject,
		},
		distanceThresholdKm: 750,
		abuseScoreThreshold: 0.25,
		requireAllConditions: true,
		forceConsistentIp: true,
		// Per-country overrides. Stored as a Map in Mongoose; comes back
		// as a plain object via `.lean()`. Each override field is itself
		// optional in `IPValidationSchema` so this entry sets every one.
		countryOverrides: {
			DE: {
				actions: {
					countryChangeAction: IPValidationAction.Flag,
					cityChangeAction: IPValidationAction.Allow,
					ispChangeAction: IPValidationAction.Reject,
					distanceExceedAction: IPValidationAction.Allow,
					abuseScoreExceedAction: IPValidationAction.Reject,
				},
				distanceThresholdKm: 500,
				abuseScoreThreshold: 0.4,
				requireAllConditions: false,
			},
		},
	},
	spamEmailDomainCheckEnabled: true,
	spamFilter: {
		enabled: true,
		emailRules: {
			enabled: true,
			maxLocalPartDots: 3,
			normaliseGmail: true,
			useDefaultPatterns: true,
			customRegexBlocklist: ["^test\\+spam@", "^throwaway-"],
			maxEmailSubmissionCount: 5,
		},
	},
	trafficFilter: {
		vpn: { action: TrafficFilterAction.Block },
		proxy: { action: TrafficFilterAction.Block },
		tor: { action: TrafficFilterAction.Block },
		abuser: { action: TrafficFilterAction.Block },
		abuserScoreThreshold: 0.33,
		datacenter: {
			action: TrafficFilterAction.Challenge,
			captchaType: CaptchaType.image,
			solvedImagesCount: 5,
		},
		datacenterNameAllowlist: ["iCloud Private Relay"],
		datacenterNameDenylist: ["ScrapyIPLeaser"],
		skipExtrasOnValidDnsPath: true,
		satellite: { action: TrafficFilterAction.Block },
		crawler: {
			action: TrafficFilterAction.Challenge,
			captchaType: CaptchaType.pow,
			powDifficulty: 8,
		},
	},
	storeMetadata: true,
	honeypot: {
		enabled: true,
		question: "What is 2 + 2?",
		encodingType: EncodingType.semaphore,
	},
} satisfies IUserSettings;

describe("Client settings Mongo persistence", () => {
	let mongoContainer: StartedTestContainer;
	let env: ProviderEnvironment;

	beforeAll(async () => {
		mongoContainer = await new GenericContainer("mongo:6.0.28")
			.withExposedPorts(27017)
			.withEnvironment({
				MONGO_INITDB_ROOT_USERNAME: "root",
				MONGO_INITDB_ROOT_PASSWORD: "root",
				MONGO_INITDB_DATABASE: "prosopo_test",
			})
			.start();

		const mongoHost = mongoContainer.getHost();
		const mongoPort = mongoContainer.getMappedPort(27017);

		const config = ProsopoConfigSchema.parse({
			defaultEnvironment: "development",
			host: "http://localhost",
			account: {
				secret:
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			authAccount: {
				secret:
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			database: {
				development: {
					type: DatabaseTypes.enum.provider,
					endpoint: `mongodb://root:root@${mongoHost}:${mongoPort}`,
					dbname: "prosopo_test",
					authSource: "admin",
				},
			},
			ipApi: { baseUrl: "https://dummyUrl.com", apiKey: "dummyKey" },
			server: { baseURL: "http://localhost", port: 0 },
		});

		env = new ProviderEnvironment(config);
		await env.isReady();
	}, 120_000);

	afterAll(async () => {
		if (env) {
			try {
				await env.getDb().close();
			} catch (error) {
				console.error("Error closing database:", error);
			}
		}
		if (mongoContainer) {
			try {
				await mongoContainer.stop();
			} catch (error) {
				console.error("Error stopping mongo container:", error);
			}
		}
	}, 30_000);

	it("round-trips every populated field on IUserSettings", async () => {
		const tasks = new Tasks(env);
		// Random but valid SS58 account address
		const siteKey = "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV";

		await tasks.clientTaskManager.registerSiteKey(
			siteKey,
			Tier.Free,
			FULLY_POPULATED_SETTINGS,
		);

		const record = await env.getDb().getClientRecord(siteKey);
		expect(record).toBeDefined();
		expect(record?.account).toBe(siteKey);
		expect(record?.tier).toBe(Tier.Free);

		const stored = record?.settings as IUserSettings | undefined;
		expect(stored).toBeDefined();
		if (!stored) return;

		// Per-field assertions. The point of asserting each field individually
		// (rather than a single `toMatchObject`) is so that a future regression
		// where one field is dropped names the specific field in the failure
		// rather than dumping the whole settings diff.
		expect(stored.captchaType).toBe(FULLY_POPULATED_SETTINGS.captchaType);
		expect(stored.domains).toEqual(FULLY_POPULATED_SETTINGS.domains);
		expect(stored.frictionlessThreshold).toBe(
			FULLY_POPULATED_SETTINGS.frictionlessThreshold,
		);
		expect(stored.powDifficulty).toBe(FULLY_POPULATED_SETTINGS.powDifficulty);
		expect(stored.imageThreshold).toBe(FULLY_POPULATED_SETTINGS.imageThreshold);
		expect(stored.imageMaxRounds).toBe(FULLY_POPULATED_SETTINGS.imageMaxRounds);
		expect(stored.autoBanScoreThreshold).toBe(
			FULLY_POPULATED_SETTINGS.autoBanScoreThreshold,
		);
		expect(stored.puzzleTolerance).toBe(
			FULLY_POPULATED_SETTINGS.puzzleTolerance,
		);
		expect(stored.disallowWebView).toBe(
			FULLY_POPULATED_SETTINGS.disallowWebView,
		);
		expect(stored.spamEmailDomainCheckEnabled).toBe(
			FULLY_POPULATED_SETTINGS.spamEmailDomainCheckEnabled,
		);
		expect(stored.storeMetadata).toBe(FULLY_POPULATED_SETTINGS.storeMetadata);

		// Nested objects — compare wholesale so any nested drop also fails.
		expect(stored.contextAware).toMatchObject(
			FULLY_POPULATED_SETTINGS.contextAware,
		);
		expect(stored.ipValidationRules).toMatchObject(
			FULLY_POPULATED_SETTINGS.ipValidationRules,
		);
		expect(stored.spamFilter).toMatchObject(
			FULLY_POPULATED_SETTINGS.spamFilter,
		);
		// Per-field spam-filter asserts. Every new emailRules field must be
		// declared on the mongoose UserSettingsSchema or strict mode silently
		// drops it on the `$set`. Named individually so the drop names the
		// specific field in the failure.
		expect(stored.spamFilter?.emailRules?.maxLocalPartDots).toBe(
			FULLY_POPULATED_SETTINGS.spamFilter.emailRules.maxLocalPartDots,
		);
		expect(stored.spamFilter?.emailRules?.normaliseGmail).toBe(
			FULLY_POPULATED_SETTINGS.spamFilter.emailRules.normaliseGmail,
		);
		expect(stored.spamFilter?.emailRules?.useDefaultPatterns).toBe(
			FULLY_POPULATED_SETTINGS.spamFilter.emailRules.useDefaultPatterns,
		);
		expect(stored.spamFilter?.emailRules?.customRegexBlocklist).toEqual(
			FULLY_POPULATED_SETTINGS.spamFilter.emailRules.customRegexBlocklist,
		);
		expect(stored.spamFilter?.emailRules?.maxEmailSubmissionCount).toBe(
			FULLY_POPULATED_SETTINGS.spamFilter.emailRules.maxEmailSubmissionCount,
		);

		// trafficFilter — per-field rather than wholesale, since this is the
		// schema most frequently extended (each new opt-in / allowlist /
		// threshold lands here). Per-field asserts surface the dropped name
		// directly rather than dumping the whole nested object diff.
		const trafficFilter = stored.trafficFilter;
		expect(trafficFilter).toBeDefined();
		if (!trafficFilter) return;
		expect(trafficFilter.vpn).toEqual(FULLY_POPULATED_SETTINGS.trafficFilter.vpn);
		expect(trafficFilter.proxy).toEqual(
			FULLY_POPULATED_SETTINGS.trafficFilter.proxy,
		);
		expect(trafficFilter.tor).toEqual(FULLY_POPULATED_SETTINGS.trafficFilter.tor);
		expect(trafficFilter.abuser).toEqual(
			FULLY_POPULATED_SETTINGS.trafficFilter.abuser,
		);
		expect(trafficFilter.abuserScoreThreshold).toBe(
			FULLY_POPULATED_SETTINGS.trafficFilter.abuserScoreThreshold,
		);
		expect(trafficFilter.datacenter).toEqual(
			FULLY_POPULATED_SETTINGS.trafficFilter.datacenter,
		);
		expect(trafficFilter.datacenterNameAllowlist).toEqual(
			FULLY_POPULATED_SETTINGS.trafficFilter.datacenterNameAllowlist,
		);
		expect(trafficFilter.datacenterNameDenylist).toEqual(
			FULLY_POPULATED_SETTINGS.trafficFilter.datacenterNameDenylist,
		);
		expect(trafficFilter.skipExtrasOnValidDnsPath).toBe(
			FULLY_POPULATED_SETTINGS.trafficFilter.skipExtrasOnValidDnsPath,
		);
		expect(trafficFilter.mobile).toBeUndefined();
		expect(trafficFilter.satellite).toEqual(
			FULLY_POPULATED_SETTINGS.trafficFilter.satellite,
		);
		expect(trafficFilter.crawler).toEqual(
			FULLY_POPULATED_SETTINGS.trafficFilter.crawler,
		);

		// Honeypot — per-field, same rationale as trafficFilter.
		const honeypot = stored.honeypot;
		expect(honeypot).toBeDefined();
		if (!honeypot) return;
		expect(honeypot.enabled).toBe(FULLY_POPULATED_SETTINGS.honeypot.enabled);
		expect(honeypot.question).toBe(FULLY_POPULATED_SETTINGS.honeypot.question);
		expect(honeypot.encodingType).toBe(
			FULLY_POPULATED_SETTINGS.honeypot.encodingType,
		);

		// verifiedTimeout / solutionTimeout — asserted directly. Not covered
		// by any nested `toMatchObject` above, so an accidental drop from
		// the mongoose schema would otherwise be invisible here.
		expect(stored.verifiedTimeout).toBe(
			FULLY_POPULATED_SETTINGS.verifiedTimeout,
		);
		expect(stored.solutionTimeout).toBe(
			FULLY_POPULATED_SETTINGS.solutionTimeout,
		);
	}, 60_000);
});
