// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { i18nMiddleware } from "@prosopo/common";
import { getPairAsync } from "@prosopo/contract";
import { loadEnv } from "@prosopo/dotenv";
import { ProviderEnvironment } from "@prosopo/env";
import {
	prosopoAdminRouter,
	prosopoRouter,
	prosopoVerifyRouter,
	storeCaptchasExternally,
} from "@prosopo/provider";
import type { CombinedApiPaths } from "@prosopo/types";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { getDB, getSecret } from "./process.env.js";
import getConfig from "./prosopo.config.js";

function startApi(env: ProviderEnvironment, admin = false, port?: number): Server {
	env.logger.info("Starting Prosopo API");
	const apiApp = express();
	const apiPort = port || env.config.server.port;
	// https://express-rate-limit.mintlify.app/guides/troubleshooting-proxy-issues
	apiApp.set(
		"trust proxy",
		env.config.proxyCount /* number of proxies between user and server */,
	);
	apiApp.use(cors());
	apiApp.use(express.json({ limit: "50mb" }));
	apiApp.use(i18nMiddleware({}));
	apiApp.use(prosopoRouter(env));
	apiApp.use(prosopoVerifyRouter(env));

	if (admin) {
		apiApp.use(prosopoAdminRouter(env));
	}

	// Rate limiting
	const rateLimits = env.config.rateLimits;
	for (const [path, limit] of Object.entries(rateLimits)) {
		const enumPath = path as CombinedApiPaths;
		apiApp.use(enumPath, rateLimit(limit));
	}

	return apiApp.listen(apiPort, () => {
		env.logger.info(`Prosopo app listening at http://localhost:${apiPort}`);
	});
}

export async function start(env?: ProviderEnvironment, admin?: boolean, port?: number) {
	if (!env) {
		loadEnv();

		// Fail to start api if db is not defined
		getDB();

		const secret = getSecret();
		const config = getConfig(undefined, undefined, {
			solved: { count: 2 },
			unsolved: { count: 0 },
		});

		const pair = await getPairAsync(secret, "");
		env = new ProviderEnvironment(config, pair);
	}

	await env.isReady();

	// Start the scheduled job
	if (env.pair) {
		storeCaptchasExternally(env.pair, env.config).catch((err) => {
			console.error("Failed to start scheduler:", err);
		});
	}

	return startApi(env, admin, port);
}

export async function startTwo(env?: ProviderEnvironment, admin?: boolean) {
  start(env, admin, 9238);
  return await start(env, admin);
}
