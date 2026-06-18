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
	IPValidationAction,
	type IUserSettings,
	ProsopoConfigSchema,
	Tier,
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
		},
	},
	trafficFilter: {
		blockVpn: true,
		blockProxy: true,
		blockTor: true,
		blockAbuser: true,
		abuserScoreThreshold: 0.33,
		blockDatacenter: true,
		datacenterNameAllowlist: ["iCloud Private Relay"],
		blockMobile: false,
		blockSatellite: true,
		blockCrawler: true,
	},
	storeMetadata: true,
} satisfies IUserSettings;

describe("Client settings Mongo persistence", () => {
	let mongoContainer: StartedTestContainer;
	let env: ProviderEnvironment;

	beforeAll(async () => {
		mongoContainer = await new GenericContainer("mongo:6.0.17")
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
		expect(stored.trafficFilter).toMatchObject(
			FULLY_POPULATED_SETTINGS.trafficFilter,
		);
	}, 60_000);
});
