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

import { ProviderDatabase } from "@prosopo/database";
import { getPair } from "@prosopo/keyring";
import { LogLevel, getLogger } from "@prosopo/logger";
import {
	CaptchaType,
	type IIPValidationRules,
	IPValidationRulesSchema,
	type ProsopoConfigOutput,
	ProsopoConfigSchema,
} from "@prosopo/types";
import type { IIpInfoService } from "@prosopo/types-env";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getCompositeIpAddress } from "../../compositeIpAddress.js";
import { FrictionlessManager } from "../../tasks/frictionless/frictionlessTasks.js";

const CONCURRENCY = 16;
const SESSION_IP = "192.0.2.10";
const SECRET =
	"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant";

// Lookups are only reached for a differing IP with forceConsistentIp off,
// which no case here exercises.
const ipInfoService: IIpInfoService = {
	initialize: vi.fn<IIpInfoService["initialize"]>(),
	lookup: vi.fn<IIpInfoService["lookup"]>(),
	country: vi.fn<IIpInfoService["country"]>(),
	accountSighting: vi.fn<IIpInfoService["accountSighting"]>(),
	isAvailable: vi.fn<IIpInfoService["isAvailable"]>(),
};

const STRICT_IP_VALIDATION: IIPValidationRules = IPValidationRulesSchema.parse({
	enabled: true,
	forceConsistentIp: true,
	actions: {},
});

class MongoOnlyProviderDatabase extends ProviderDatabase {
	protected override async setupRedis(): Promise<void> {}
}

// PROSOPO_TEST_MONGO_URL points the suite at an already running mongod
// instead of starting a throwaway container.
const startMongo = async (): Promise<{
	url: string;
	container?: StartedTestContainer;
}> => {
	const external = process.env.PROSOPO_TEST_MONGO_URL;
	if (external) {
		return { url: external };
	}
	const container = await new GenericContainer("mongo:6.0.28")
		.withExposedPorts(27017)
		.withEnvironment({
			MONGO_INITDB_ROOT_USERNAME: "root",
			MONGO_INITDB_ROOT_PASSWORD: "root",
		})
		.start();
	return {
		url: `mongodb://root:root@${container.getHost()}:${container.getMappedPort(27017)}`,
		container,
	};
};

describe("authenticated session verify is single-use under concurrency", () => {
	let container: StartedTestContainer | undefined;
	let db: MongoOnlyProviderDatabase;
	let manager: FrictionlessManager;

	beforeAll(async () => {
		const mongo = await startMongo();
		container = mongo.container;
		db = new MongoOnlyProviderDatabase({
			mongo: {
				url: mongo.url,
				dbname: `prosopo_authenticated_claim_${Date.now()}`,
				authSource: "admin",
			},
			logger: getLogger(LogLevel.enum.error, "authenticatedVerifyClaim"),
		});
		await db.connect();
		const config: ProsopoConfigOutput = ProsopoConfigSchema.parse({
			defaultEnvironment: "development",
			host: "http://localhost",
			account: { secret: SECRET },
			authAccount: { secret: SECRET },
		});
		manager = new FrictionlessManager({ db, pair: getPair(SECRET), config });
	}, 180_000);

	afterAll(async () => {
		await db?.getConnection()?.dropDatabase();
		await db?.close();
		await container?.stop();
	}, 60_000);

	it(`verifies exactly one of ${CONCURRENCY} simultaneous verifies of one token`, async () => {
		const session = await manager.createAuthenticatedSession({
			token: "token",
			ipAddress: getCompositeIpAddress(SESSION_IP),
			webBotAuthAgent: "agent.example",
			siteKey: "siteKey",
		});

		const results: { verified: boolean; status: string }[] = await Promise.all(
			Array.from({ length: CONCURRENCY }, () =>
				manager.verifyAuthenticatedSession({
					sessionId: session.sessionId,
					ip: SESSION_IP,
					clientSessionId: undefined,
					ipValidationRules: undefined,
					ipInfoService,
				}),
			),
		);

		expect(results.filter((result) => result.verified)).toHaveLength(1);
		expect(
			results.filter(
				(result) =>
					!result.verified && result.status === "API.USER_ALREADY_VERIFIED",
			),
		).toHaveLength(CONCURRENCY - 1);
		const stored = await db.getSessionRecordBySessionId(session.sessionId);
		expect(stored?.serverChecked).toBe(true);
		expect(stored?.captchaType).toBe(CaptchaType.authenticated);
	});

	it("leaves the token redeemable after a rejected verify", async () => {
		const session = await manager.createAuthenticatedSession({
			token: "token-2",
			ipAddress: getCompositeIpAddress(SESSION_IP),
			webBotAuthAgent: "agent.example",
			siteKey: "siteKey",
		});

		const wrongIp = await manager.verifyAuthenticatedSession({
			sessionId: session.sessionId,
			ip: "192.0.2.99",
			clientSessionId: undefined,
			ipValidationRules: STRICT_IP_VALIDATION,
			ipInfoService,
		});
		const rightIp = await manager.verifyAuthenticatedSession({
			sessionId: session.sessionId,
			ip: SESSION_IP,
			clientSessionId: undefined,
			ipValidationRules: STRICT_IP_VALIDATION,
			ipInfoService,
		});

		expect(wrongIp).toEqual({
			verified: false,
			status: "API.FAILED_IP_VALIDATION",
		});
		expect(rightIp).toEqual({ verified: true, status: "API.USER_VERIFIED" });
	});
});
