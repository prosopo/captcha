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
import https from "node:https";
import type { ServerOptions } from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ProsopoEnvError, getLogger } from "@prosopo/common";
import { loadEnv } from "@prosopo/dotenv";
import { getServerConfig } from "@prosopo/server";
import { at } from "@prosopo/util";
import cors from "cors";
import express from "express";
import routesFactory from "./routes/routes.js";
import connectionFactory from "./utils/connection.js";
import memoryServerSetup from "./utils/database.js";

loadEnv();

enum ProsopoVerificationType {
	api = "api",
	local = "local",
}

const logger = getLogger("info", import.meta.url);

async function main() {
	loadEnv();

	const apiPrefix =
		process.env.NODE_ENV && process.env.NODE_ENV === "production"
			? ""
			: `${process.env.NODE_ENV}-`;
	const verifyEndpoint =
		process.env.PROSOPO_VERIFY_ENDPOINT ||
		`https://${apiPrefix}api.prosopo.io/siteverify`;

	logger.info(() => ({ data: { verifyEndpoint } }));

	const verifyType: ProsopoVerificationType = Object.keys(
		ProsopoVerificationType,
	).includes(process.env.PROSOPO_VERIFICATION_TYPE as string)
		? (process.env.PROSOPO_VERIFICATION_TYPE as ProsopoVerificationType)
		: ProsopoVerificationType.api;

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

	app.options("/*", (_, res) => {
		res.sendStatus(200);
	});

	if (
		!process.env.MONGO_URI &&
		process.env.NODE_ENV !== "development" &&
		process.env.NODE_ENV !== "test"
	) {
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

	const port = config.serverUrl
		? Number.parseInt(at(config.serverUrl.split(":"), 2))
		: 9228;

	logger.info(() => ({ msg: "Listening on port", data: { port } }));

	// Use HTTPS only in development/test when we have certificates
	// In production, use HTTP because Caddy handles TLS termination
	const isDev =
		process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

	if (isDev) {
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);
		const certsDir = path.resolve(__dirname, "../../../certs");

		const keyPath = path.join(certsDir, "server.key");
		const certPath = path.join(certsDir, "server.crt");

		if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
			const httpsOptions: ServerOptions = {
				key: fs.readFileSync(keyPath),
				cert: fs.readFileSync(certPath),
			};

			https.createServer(httpsOptions, app).listen(port, () => {
				logger.info(() => ({ msg: `HTTPS server started on port ${port}` }));
			});
		} else {
			logger.warn(() => ({
				msg: "Certificates not found, starting HTTP server instead. Run ./setup_certs.sh to enable HTTPS in development.",
			}));
			http.createServer(app).listen(port, () => {
				logger.info(() => ({ msg: `HTTP server started on port ${port}` }));
			});
		}
	} else {
		// Production: use plain HTTP, Caddy handles TLS
		http.createServer(app).listen(port, () => {
			logger.info(() => ({
				msg: `HTTP server started on port ${port} (TLS handled by reverse proxy)`,
			}));
		});
	}
}

main()
	.then(() => {
		logger.info(() => ({ msg: "Server started" }));
	})
	.catch((err) => {
		logger.error(() => ({ err }));
		process.exit();
	});
