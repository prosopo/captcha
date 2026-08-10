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
import http from "node:http";
import type { Server } from "node:http";
import https from "node:https";
import type { ServerOptions } from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ProsopoEnvError } from "@prosopo/common";
import { loadEnv } from "@prosopo/dotenv";
import { getLogger } from "@prosopo/logger";
import { getServerConfig } from "@prosopo/server";
import type { ProsopoServerConfigOutput } from "@prosopo/types";
import { at, isMain } from "@prosopo/util";
import cors from "cors";
import express from "express";
import routesFactory from "./routes/routes.js";
import connectionFactory from "./utils/connection.js";
import memoryServerSetup from "./utils/database.js";

export enum ProsopoVerificationType {
	api = "api",
	local = "local",
}

const logger = getLogger("info", "client-example-server:app");

/**
 * The siteverify endpoint the deployment talks to. Non-production
 * environments get their name as a subdomain prefix. An unset NODE_ENV is
 * treated as production: prefixing it produced `undefined-api.prosopo.io`,
 * a host that does not exist.
 */
export const resolveVerifyEndpoint = (): string => {
	const environment = process.env.NODE_ENV;
	const apiPrefix =
		!environment || environment === "production" ? "" : `${environment}-`;
	return (
		process.env.PROSOPO_VERIFY_ENDPOINT ||
		`https://${apiPrefix}api.prosopo.io/siteverify`
	);
};

/** Anything the enum doesn't name falls back to the hosted API. */
export const resolveVerifyType = (): ProsopoVerificationType =>
	Object.keys(ProsopoVerificationType).includes(
		process.env.PROSOPO_VERIFICATION_TYPE as string,
	)
		? (process.env.PROSOPO_VERIFICATION_TYPE as ProsopoVerificationType)
		: ProsopoVerificationType.api;

export const isDevelopmentOrTest = (): boolean =>
	process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

/** The express app, minus the routes, which need a database connection. */
export const createApp = (): express.Express => {
	const app = express();

	// https://express-rate-limit.mintlify.app/guides/troubleshooting-proxy-issues
	app.set("trust proxy", 1);

	app.use(cors({ origin: true, credentials: true }));

	app.use(express.urlencoded({ extended: true }));

	app.use(express.json());

	app.use((_, res, next) => {
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader(
			"Access-Control-Allow-Methods",
			"GET, POST, PUT, PATCH, DELETE",
		);
		res.setHeader(
			"Access-Control-Allow-Headers",
			"Origin, Content-Type, X-Auth-Token, Authorization",
		);
		next();
	});

	// No explicit OPTIONS handler: cors() above already answers preflight
	// requests with a 204 and never calls through, so the handler that used to
	// sit here could not run.

	return app;
};

export const DEFAULT_PORT = 9228;

/**
 * The port is the last segment of the configured server URL. A URL without
 * one used to yield NaN, which node turns into an arbitrary free port — the
 * server came up on an address nothing was configured to talk to.
 */
export const resolvePort = (config: ProsopoServerConfigOutput): number => {
	if (!config.serverUrl) return DEFAULT_PORT;
	const segments = config.serverUrl.split(":");
	if (segments.length < 3) return DEFAULT_PORT;
	const port = Number.parseInt(at(segments, 2));
	return Number.isNaN(port) ? DEFAULT_PORT : port;
};

/**
 * HTTPS in development/test when the repo's certificates exist, plain HTTP
 * otherwise — in production Caddy terminates TLS.
 */
export const startServer = (
	app: express.Express,
	port: number,
	dirname: string = path.dirname(fileURLToPath(import.meta.url)),
): Server => {
	if (isDevelopmentOrTest()) {
		const certsDir = path.resolve(dirname, "../../../certs");

		const keyPath = path.join(certsDir, "server.key");
		const certPath = path.join(certsDir, "server.crt");

		if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
			const httpsOptions: ServerOptions = {
				key: fs.readFileSync(keyPath),
				cert: fs.readFileSync(certPath),
			};

			return https.createServer(httpsOptions, app).listen(port, () => {
				logger.info(() => ({ msg: `HTTPS server started on port ${port}` }));
			});
		}
		logger.warn(() => ({
			msg: "Certificates not found, starting HTTP server instead. Run ./setup_certs.sh to enable HTTPS in development.",
		}));
		return http.createServer(app).listen(port, () => {
			logger.info(() => ({ msg: `HTTP server started on port ${port}` }));
		});
	}
	return http.createServer(app).listen(port, () => {
		logger.info(() => ({
			msg: `HTTP server started on port ${port} (TLS handled by reverse proxy)`,
		}));
	});
};

export async function main(): Promise<Server> {
	loadEnv();

	const verifyEndpoint = resolveVerifyEndpoint();

	logger.info(() => ({ data: { verifyEndpoint } }));

	const verifyType = resolveVerifyType();

	const app = createApp();

	if (!process.env.MONGO_URI && !isDevelopmentOrTest()) {
		throw new Error(
			"Cannot run mongo memory when NODE_ENV is neither development nor test",
		);
	}
	logger.info(() => ({ msg: process.env.MONGO_URI }));
	const uri = process.env.MONGO_URI || (await memoryServerSetup());
	logger.info(() => ({ msg: "mongo uri", data: { uri } }));
	const mongoose = connectionFactory(uri);
	if (!process.env.PROSOPO_SITE_PRIVATE_KEY) {
		const mnemonicError = new ProsopoEnvError("GENERAL.MNEMONIC_UNDEFINED", {
			context: { missingParams: ["PROSOPO_SITE_PRIVATE_KEY"] },
			logger,
		});

		logger.error(() => ({ err: mnemonicError }));
	}

	const config = getServerConfig();

	logger.info(() => ({ msg: "Config", data: { config } }));

	app.use(routesFactory(mongoose, config, verifyEndpoint, verifyType));

	const port = resolvePort(config);

	logger.info(() => ({ msg: "Listening on port", data: { port } }));

	return startServer(app, port);
}

// Only boot when run as a binary: importing this module (a test, or another
// entrypoint reusing createApp) must not open a port or spin up mongo.
if (isMain(import.meta.url)) {
	main()
		.then(() => {
			logger.info(() => ({ msg: "Server started" }));
		})
		.catch((err) => {
			logger.error(() => ({ err }));
			// Non-zero, so a boot failure is visible to whatever supervises the
			// process rather than reading as a clean shutdown.
			process.exit(1);
		});
}
