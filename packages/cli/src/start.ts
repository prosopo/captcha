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

import type { Server } from "node:net";
import {
	apiExpressRouterFactory,
	createApiExpressDefaultEndpointAdapter,
} from "@prosopo/api-express-router";
import { loadEnv } from "@prosopo/dotenv";
import { ProviderEnvironment } from "@prosopo/env";
import { getPairAsync } from "@prosopo/keyring";
import { i18nMiddleware } from "@prosopo/locale";
import {
	createApiAdminRoutesProvider,
	domainMiddleware,
	getClientList,
	headerCheckMiddleware,
	prosopoRouter,
	prosopoVerifyRouter,
	publicRouter,
	storeCaptchasExternally,
} from "@prosopo/provider";
import { authMiddleware, blockMiddleware } from "@prosopo/provider";
import type { CombinedApiPaths } from "@prosopo/types";
import {
	createApiRuleRoutesProvider,
	getExpressApiRuleRateLimits,
} from "@prosopo/user-access-policy";
import { apiRulePaths } from "@prosopo/user-access-policy";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { getDB, getSecret } from "./process.env.js";
import getConfig from "./prosopo.config.js";

async function startApi(
	env: ProviderEnvironment,
	admin = false,
	port?: number,
): Promise<Server> {
	env.logger.info("Starting Prosopo API");

	const apiApp = express();
	const apiPort = port || env.config.server.port;

	const apiEndpointAdapter = createApiExpressDefaultEndpointAdapter(env.logger);
	const apiRuleRoutesProvider = createApiRuleRoutesProvider(
		env.getDb().getUserAccessRulesStorage(),
	);
	const apiAdminRoutesProvider = createApiAdminRoutesProvider(env);

	// https://express-rate-limit.mintlify.app/guides/troubleshooting-proxy-issues
	apiApp.set(
		"trust proxy",
		env.config.proxyCount /* number of proxies between user and server */,
	);
	apiApp.use(cors());
	apiApp.use(express.json({ limit: "50mb" }));
	apiApp.use(await i18nMiddleware({}));
	apiApp.use("/v1/prosopo/provider/client/", headerCheckMiddleware(env));
	// Blocking middleware will run on any routes defined after this point
	apiApp.use(blockMiddleware(env));
	apiApp.use(prosopoVerifyRouter(env));
	apiApp.use("/v1/prosopo/provider/client/", domainMiddleware(env));
	apiApp.use(prosopoRouter(env));

	apiApp.use(publicRouter(env));

	// Admin routes
	env.logger.info("Enabling admin auth middleware");
	apiApp.use("/v1/prosopo/provider/admin", authMiddleware(env));
	apiApp.use(apiRulePaths.INSERT_MANY, authMiddleware(env));
	apiApp.use(apiRulePaths.DELETE_MANY, authMiddleware(env));
	apiApp.use(
		apiExpressRouterFactory.createRouter(
			apiRuleRoutesProvider,
			apiEndpointAdapter,
		),
	);
	apiApp.use(
		apiExpressRouterFactory.createRouter(
			apiAdminRoutesProvider,
			// unlike the default one, it should have errorStatusCode as 400
			createApiExpressDefaultEndpointAdapter(env.logger, 400),
		),
	);

	// Rate limiting
	const configRateLimits = env.config.rateLimits;
	const rateLimits = { ...configRateLimits, ...getExpressApiRuleRateLimits() };
	for (const [path, limit] of Object.entries(rateLimits)) {
		const enumPath = path as CombinedApiPaths;
		apiApp.use(enumPath, rateLimit(limit));
	}

	return apiApp.listen(apiPort, () => {
		env.logger.info(`Prosopo app listening at http://localhost:${apiPort}`);
	});
}

export async function start(
	env?: ProviderEnvironment,
	admin?: boolean,
	port?: number,
) {
	if (!env) {
		loadEnv();

		// Fail to start api if db is not defined
		getDB();

		const secret = getSecret();
		const config = getConfig(undefined, {
			solved: { count: 2 },
			unsolved: { count: 0 },
		});

		const pair = await getPairAsync(secret);
		const authAccount = await getPairAsync(
			undefined,
			config.authAccount.address,
		);
		env = new ProviderEnvironment(config, pair, authAccount);
	} else {
		env.logger.debug("Env already defined");
	}

	await env.isReady();

	// Get rid of any scheduled task records from previous runs
	env.cleanup();

	//Start the scheduled jobs
	if (env.pair) {
		storeCaptchasExternally(env.pair, env.config).catch((err) => {
			console.error("Failed to start scheduler:", err);
		});
		getClientList(env.pair, env.config).catch((err) => {
			console.error("Failed to get client list:", err);
		});
	}

	return startApi(env, admin, port);
}

export async function startDev(env?: ProviderEnvironment, admin?: boolean) {
	//start(env, admin, 9238);
	return await start(env, admin);
}
