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
import { getPair } from "@prosopo/keyring";
import { i18nMiddleware } from "@prosopo/locale";
import {
	createApiAdminRoutesProvider,
	domainMiddleware,
	getClientList,
	headerCheckMiddleware,
	ignoreMiddleware,
	prosopoRouter,
	prosopoVerifyRouter,
	publicRouter,
	requestLoggerMiddleware,
	robotsMiddleware,
	storeCaptchasExternally,
} from "@prosopo/provider";
import {
	authMiddleware,
	blockMiddleware,
	ja4Middleware,
} from "@prosopo/provider";
import { ClientApiPaths, type CombinedApiPaths } from "@prosopo/types";
import {
	createApiRuleRoutesProvider,
	getExpressApiRuleRateLimits,
} from "@prosopo/user-access-policy";
import { apiRulePaths } from "@prosopo/user-access-policy";
import cors from "cors";
import express, { type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { getDB, getSecret } from "./process.env.js";
import getConfig from "./prosopo.config.js";
import { parseLogLevel } from "@prosopo/common";

const getClientApiPathsExcludingVerify = () => {
	const paths = Object.values(ClientApiPaths).filter(
		(path) => path.indexOf("verify") === -1,
	);
	return paths as ClientApiPaths[];
};

async function startApi(
	env: ProviderEnvironment,
	admin = false,
	port?: number,
): Promise<Server> {
	env.logger.info(() => ({ msg: "Starting Prosopo API" }));

	const apiApp = express();
	const apiPort = port || env.config.server.port;

	const apiEndpointAdapter = createApiExpressDefaultEndpointAdapter(
		parseLogLevel(env.config.logLevel),
	);
	const apiRuleRoutesProvider = createApiRuleRoutesProvider(
		env.getDb().getUserAccessRulesStorage(),
	);
	const apiAdminRoutesProvider = createApiAdminRoutesProvider(env);

	const clientPathsExcludingVerify = getClientApiPathsExcludingVerify();

	env.logger.debug(() => ({
		msg: "Adding headerCheckMiddleware",
		paths: clientPathsExcludingVerify,
	}));

	// https://express-rate-limit.mintlify.app/guides/troubleshooting-proxy-issues
	apiApp.set(
		"trust proxy",
		env.config.proxyCount /* number of proxies between user and server */,
	);

	apiApp.use(cors());
	apiApp.use(express.json({ limit: "50mb" }));
	const i18Middleware = await i18nMiddleware({});
	apiApp.use(robotsMiddleware());
	apiApp.use(ignoreMiddleware());
	apiApp.use(requestLoggerMiddleware(env));
	apiApp.use(i18Middleware);
	apiApp.use(ja4Middleware(env));

	// Specify verify router before the blocking middlewares
	apiApp.use(prosopoVerifyRouter(env));

	// Blocking middleware will run on any routes defined after this point
	apiApp.use(blockMiddleware(env));

	// Header check middleware will run on any client routes excluding verify
	apiApp.use(clientPathsExcludingVerify, headerCheckMiddleware(env));

	// Domain middleware will run on any routes beginning with "/v1/prosopo/provider/client/" past this point
	apiApp.use("/v1/prosopo/provider/client/", domainMiddleware(env));
	apiApp.use(prosopoRouter(env));
	apiApp.use(publicRouter(env));

	// Admin routes
	env.logger.info(() => ({ msg: "Enabling admin auth middleware" }));
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
			createApiExpressDefaultEndpointAdapter(parseLogLevel(env.config.logLevel), 400),
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
		env.logger.info(() => ({ data: { apiPort }, msg: "Prosopo app listening" }));
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

		const pair = getPair(secret);
		const authAccount = getPair(undefined, config.authAccount.address);
		env = new ProviderEnvironment(config, pair, authAccount);
	} else {
		env.logger.debug(() => ({ msg: "Env already defined" }));
	}

	await env.isReady();

	// Get rid of any scheduled task records from previous runs
	env.cleanup();

	// Start the scheduled jobs if they are defined
	if (env.pair) {
		const cronScheduleStorage =
			env.config.scheduledTasks?.captchaScheduler?.schedule;
		if (cronScheduleStorage) {
			storeCaptchasExternally(env.pair, cronScheduleStorage, env.config).catch(
				(err) => {
					console.error("Failed to start scheduler:", err);
				},
			);
		}
		const cronScheduleClient =
			env.config.scheduledTasks?.clientListScheduler?.schedule;
		if (cronScheduleClient) {
			getClientList(env.pair, cronScheduleClient, env.config).catch((err) => {
				env.logger.error(() => ({
					msg: "Failed to start client list scheduler",
					err,
					context: { failedFuncName: getClientList.name },
				}));
			});
		}
	}

	return startApi(env, admin, port);
}

export async function startDev(env?: ProviderEnvironment, admin?: boolean) {
	//start(env, admin, 9238);
	return await start(env, admin);
}
