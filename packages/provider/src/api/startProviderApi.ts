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

import fs from "node:fs";
import https from "node:https";
import type { Server } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	apiExpressRouterFactory,
	authMiddleware,
	createApiExpressDefaultEndpointAdapter,
	requestLoggerMiddleware,
} from "@prosopo/api-express-router";
import { parseLogLevel } from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/env";
import { i18nMiddleware } from "@prosopo/locale";
import {
	AdminApiPaths,
	ClientApiPaths,
	type CombinedApiPaths,
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
import { createApiAdminRoutesProvider } from "./admin/createApiAdminRoutesProvider.js";
import { blockMiddleware } from "./block.js";
import { prosopoRouter } from "./captcha.js";
import { domainMiddleware } from "./domainMiddleware.js";
import { headerCheckMiddleware } from "./headerCheckMiddleware.js";
import { ignoreMiddleware } from "./ignoreMiddleware.js";
import { ja4Middleware } from "./ja4Middleware.js";
import { publicRouter } from "./public.js";
import { robotsMiddleware } from "./robotsMiddleware.js";
import { prosopoVerifyRouter } from "./verify.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certPath = path.resolve(__dirname, "../../../../certs");
const keyPath = path.join(certPath, "server.key");
const crtPath = path.join(certPath, "server.crt");

/**
 * Get client API paths excluding verify endpoints
 * @returns Array of ClientApiPaths excluding verify routes
 */
export const getClientApiPathsExcludingVerify = (): ClientApiPaths[] => {
	const paths = Object.values(ClientApiPaths).filter(
		(path) => path.indexOf("verify") === -1,
	);
	return paths as ClientApiPaths[];
};

/**
 * Extract authenticated user address from JWT for rate limiting
 * @param req Express request object
 * @returns User address from JWT or undefined
 */
export const getUserFromJWT = (req: Request): string | undefined => {
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

/**
 * Start the Prosopo Provider API server
 *
 * This function creates and configures an Express server with all necessary middleware
 * for the Prosopo Provider API, including:
 * - CORS support
 * - Rate limiting (disabled in test/development environments)
 * - Authentication and authorization
 * - Request validation (headers, domains, etc.)
 * - Blocking and security middleware
 * - Admin and client API routes
 * - Access rule management
 *
 * @param env - The ProviderEnvironment containing configuration and database connections
 * @param admin - Whether to enable admin mode (currently unused, kept for compatibility)
 * @param port - Optional port override. If not provided, uses env.config.server.port
 * @returns Promise<Server> - The Node.js HTTP server instance
 *
 * @example
 * ```typescript
 * const env = new ProviderEnvironment(config);
 * await env.isReady();
 * const server = await startProviderApi(env);
 * ```
 */
export async function startProviderApi(
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
	// In test environments, disable rate limiting to allow parallel tests
	const isTestOrDevelopmentEnv =
		process.env.NODE_ENV === "test" ||
		env.config.defaultEnvironment === "development";

	if (!isTestOrDevelopmentEnv) {
		const configRateLimits = env.config.rateLimits;
		const rateLimits = {
			...configRateLimits,
			...getExpressApiRuleRateLimits(),
		};
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
			} else if (
				path === ClientApiPaths.VerifyImageCaptchaSolutionDapp ||
				path === ClientApiPaths.VerifyPowCaptchaSolution
			) {
				// For verify, key on site key to prevent rate limiting API calls from lambdas
				apiApp.use(
					enumPath,
					rateLimit({
						...limit,
						keyGenerator: (req) => {
							const siteKey = req.headers["prosopo-site-key"] as string;
							// Fall back to IP if no site key found (shouldn't happen for verify routes with headerCheckMiddleware)
							return siteKey || req.ip || "unknown";
						},
					}),
				);
			} else {
				apiApp.use(enumPath, rateLimit(limit));
			}
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

	// Check if certificates exist and create HTTPS server if available
	const useTls = fs.existsSync(keyPath) && fs.existsSync(crtPath);

	if (useTls) {
		env.logger.info(() => ({ msg: "Starting Provider API with HTTPS" }));
		const httpsOptions = {
			key: fs.readFileSync(keyPath),
			cert: fs.readFileSync(crtPath),
		};
		const httpsServer = https.createServer(httpsOptions, apiApp);
		return httpsServer.listen(apiPort, () => {
			env.logger.info(() => ({
				data: { apiPort, protocol: "https" },
				msg: "Prosopo app listening with HTTPS",
			}));
		});
	}

	return apiApp.listen(apiPort, () => {
		env.logger.info(() => ({
			data: { apiPort },
			msg: "Prosopo app listening",
		}));
	});
}
