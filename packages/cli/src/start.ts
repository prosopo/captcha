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
	authMiddleware,
	createApiExpressDefaultEndpointAdapter,
	requestLoggerMiddleware,
} from "@prosopo/api-express-router";
import { parseLogLevel } from "@prosopo/common";
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
	robotsMiddleware,
	setClientEntropy,
	storeCaptchasExternally,
} from "@prosopo/provider";
import { blockMiddleware, ja4Middleware } from "@prosopo/provider";
import {
	AdminApiPaths,
	ClientApiPaths,
	type CombinedApiPaths,
	type KeyringPair,
} from "@prosopo/types";
import {
	AccessRuleApiRoutes,
	getExpressApiRuleRateLimits,
} from "@prosopo/user-access-policy/api";
import type { JWT } from "@prosopo/util-crypto";
import cors from "cors";
import express from "express";
import type { Request } from "express";
import rateLimit from "express-rate-limit";
import { getDB, getSecret } from "./process.env.js";
import getConfig from "./prosopo.config.js";

const getClientApiPathsExcludingVerify = () => {
	const paths = Object.values(ClientApiPaths).filter(
		(path) => path.indexOf("verify") === -1,
	);
	return paths as ClientApiPaths[];
};

// Extract authenticated user address from JWT for rate limiting
const getUserFromJWT = (req: Request): string | undefined => {
	try {
		const authHeader = req.headers.Authorization || req.headers.authorization;
		if (!authHeader || typeof authHeader !== "string") {
			return undefined;
		}
		const jwt = authHeader.replace("Bearer ", "") as JWT;
		if (!jwt) {
			return undefined;
		}
		// We don't need to verify the signature here, just extract the subject
		// The actual verification happens in authMiddleware
		const parts = jwt.split(".");
		if (parts.length !== 3 || !parts[1]) {
			return undefined;
		}
		const payload = JSON.parse(
			Buffer.from(parts[1], "base64url").toString("utf-8"),
		);
		return payload.sub as string | undefined;
	} catch (e) {
		return undefined;
	}
};

async function startApi(
	env: ProviderEnvironment,
	admin = false,
	port?: number,
): Promise<Server> {
	env.logger.info(() => ({ msg: "Starting Prosopo API" }));

	const apiApp = express();
	const apiPort = port || env.config.server?.port;

	const apiEndpointAdapter = createApiExpressDefaultEndpointAdapter(
		parseLogLevel(env.config.logLevel),
	);
	const apiRuleRoutesProvider = new AccessRuleApiRoutes(
		env.getDb().getUserAccessRulesStorage(),
		env.logger,
	);
	const apiAdminRoutesProvider = createApiAdminRoutesProvider(env);

	const clientPathsExcludingVerify = getClientApiPathsExcludingVerify();

	env.logger.debug(() => ({
		msg: "Adding headerCheckMiddleware",
		paths: clientPathsExcludingVerify,
	}));

	// https://express-rate-limit.mintlify.app/guides/troubleshooting-proxy-issues
	apiApp.set("trust proxy", 1);

	apiApp.use(cors());
	apiApp.use(express.json({ limit: "50mb" }));

	// Put this first so that no middleware runs on it
	apiApp.use(publicRouter(env));

	// Rate limiting
	const configRateLimits = env.config.rateLimits;
	const rateLimits = { ...configRateLimits, ...getExpressApiRuleRateLimits() };
	const adminPaths = Object.values(AdminApiPaths);
	for (const [path, limit] of Object.entries(rateLimits)) {
		const enumPath = path as CombinedApiPaths;
		// For admin paths, key by authenticated user instead of IP
		// This prevents tests (and legitimate users) from interfering with each other
		if (adminPaths.includes(enumPath as AdminApiPaths)) {
			apiApp.use(
				enumPath,
				rateLimit({
					...limit,
					keyGenerator: (req) => {
						const user = getUserFromJWT(req);
						// Fall back to IP if no user found (shouldn't happen for admin routes with auth)
						return user || req.ip || "unknown";
					},
				}),
			);
		} else {
			apiApp.use(enumPath, rateLimit(limit));
		}
	}

	const i18Middleware = await i18nMiddleware({});
	apiApp.use(robotsMiddleware());
	apiApp.use(ignoreMiddleware());
	apiApp.use(requestLoggerMiddleware(env));
	apiApp.use(i18Middleware);
	apiApp.use(ja4Middleware(env));

	// Run Header check middleware on all client routes
	apiApp.use(clientPathsExcludingVerify, headerCheckMiddleware(env));

	// Specify verify router before the blocking middlewares
	apiApp.use(prosopoVerifyRouter(env));

	//  Admin routes - do not put after block middleware as this can block admin requests
	env.logger.info(() => ({ msg: "Enabling admin auth middleware" }));
	apiApp.use(
		"/v1/prosopo/provider/admin",
		authMiddleware(env.pair, env.authAccount),
	);
	const userAccessRuleRoutes = apiRuleRoutesProvider.getRoutes();
	for (const userAccessRuleRoute in userAccessRuleRoutes) {
		apiApp.use(userAccessRuleRoute, authMiddleware(env.pair, env.authAccount));
	}
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
			createApiExpressDefaultEndpointAdapter(
				parseLogLevel(env.config.logLevel),
				400,
			),
		),
	);

	// Blocking middleware will run on any routes defined after this point
	apiApp.use(blockMiddleware(env));

	// Domain middleware will run on any routes beginning with "/v1/prosopo/provider/client/" past this point
	apiApp.use("/v1/prosopo/provider/client/", domainMiddleware(env));
	apiApp.use(prosopoRouter(env));

	return apiApp.listen(apiPort, () => {
		env.logger.info(() => ({
			data: { apiPort },
			msg: "Prosopo app listening",
		}));
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
		let authAccount: KeyringPair | undefined;
		if (config.authAccount) {
			authAccount = getPair(undefined, config.authAccount.address);
		}
		env = new ProviderEnvironment(config, pair, authAccount);
	} else {
		env.logger.debug(() => ({
			msg: "Env already defined",
			data: {
				config: env?.config,
			},
		}));
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

		const cronClientEntropySetter =
			env.config.scheduledTasks?.clientEntropyScheduler?.schedule;
		if (cronClientEntropySetter) {
			setClientEntropy(env.pair, cronClientEntropySetter, env.config).catch(
				(err) => {
					env.logger.error(() => ({
						msg: "Failed to start client entropy scheduler",
						err,
						context: { failedFuncName: setClientEntropy.name },
					}));
				},
			);
		}
	}

	return startApi(env, admin, port);
}
