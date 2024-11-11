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
import { ProsopoApiError } from "@prosopo/common";
import { ApiPaths } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { version } from "@prosopo/util";
import express, { type Router } from "express";
import { Tasks } from "../tasks/tasks.js";
import { handleErrors } from "./errorHandler.js";

const NO_IP_ADDRESS = "NO_IP_ADDRESS" as const;
const DEFAULT_FRICTIONLESS_THRESHOLD = 0.5;

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 * @param {Environment} env - The Prosopo environment
 */
export function publicRouter(env: ProviderEnvironment): Router {
	const router = express.Router();
	const tasks = new Tasks(env);

	/**
	 * Gets public details of the provider
	 */
	router.get(ApiPaths.GetProviderDetails, async (req, res, next) => {
		try {
			return res.json({ version, ...{ message: "Provider online" } });
		} catch (err) {
			tasks.logger.error({ err, params: req.params });
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: { code: 500 },
				}),
			);
		}
	});

	// Your error handler should always be at the end of your application stack. Apparently it means not only after all
	// app.use() but also after all your app.get() and app.post() calls.
	// https://stackoverflow.com/a/62358794/1178971
	router.use(handleErrors);

	return router;
}
