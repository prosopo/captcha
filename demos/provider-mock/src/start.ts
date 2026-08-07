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

import { handleErrors } from "@prosopo/api-express-router";
import { i18nMiddleware } from "@prosopo/locale";
import { LogLevel, type Logger, getLogger } from "@prosopo/logger";
import cors from "cors";
import express, { type Express, type RequestHandler } from "express";
import { type RouterDeps, prosopoRouter } from "./api.js";
import { isMain } from "./isMain.js";

export const DEFAULT_API_PORT = 9229;

type Router = ReturnType<typeof prosopoRouter>;

export interface StartDeps {
	createApp: () => Express;
	i18n: () => Promise<RequestHandler>;
	router: (deps?: RouterDeps) => Router;
	logger: Logger;
	port: number;
	exit: (code: number) => void;
}

export const defaultStartDeps = (
	env: NodeJS.ProcessEnv = process.env,
): StartDeps => ({
	createApp: express,
	i18n: () => i18nMiddleware({}),
	router: prosopoRouter,
	logger: getLogger(LogLevel.enum.info, "prosopo:provider-mock:start.ts"),
	port: readPort(env),
	exit: (code: number): void => {
		process.exit(code);
	},
});

/**
 * The port to listen on.
 *
 * The port used to be the string "9229" with no way to change it, so the mock
 * could not be run twice on one machine. A value that is not a usable port is
 * ignored rather than passed to listen, where it would either throw or — for a
 * number out of range — bind somewhere unexpected.
 */
export const readPort = (env: NodeJS.ProcessEnv): number => {
	const raw = env.PROVIDER_MOCK_PORT;
	if (raw === undefined || raw.trim() === "") {
		return DEFAULT_API_PORT;
	}
	const port = Number(raw);
	if (!Number.isInteger(port) || port < 0 || port > 65535) {
		return DEFAULT_API_PORT;
	}
	return port;
};

export const startApi = async (
	deps: StartDeps = defaultStartDeps(),
): Promise<Express> => {
	const apiApp = deps.createApp();

	apiApp.use(cors());
	apiApp.use(express.json());
	apiApp.use(await deps.i18n());
	apiApp.use(deps.router());
	apiApp.use(handleErrors);

	apiApp.listen(deps.port, () => {
		deps.logger.info(() => ({
			msg: `Prosopo app listening at http://localhost:${deps.port}`,
		}));
	});

	return apiApp;
};

export const main = async (
	deps: StartDeps = defaultStartDeps(),
): Promise<void> => {
	try {
		await startApi(deps);
	} catch (error) {
		deps.logger.error(() => ({
			err: error instanceof Error ? error : new Error(String(error)),
			msg: "Failed to start API",
		}));
		deps.exit(1);
	}
};

if (isMain(import.meta.url)) {
	// Not awaited: a top-level await cannot be emitted in the cjs build, and
	// main() already handles its own failures rather than rejecting.
	void main();
}
