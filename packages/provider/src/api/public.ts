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

import { handleErrors } from "@prosopo/api-express-router";
import { ProsopoApiError } from "@prosopo/common";
import { ClientApiPaths, PublicApiPaths } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { version } from "@prosopo/util";
import express, { type Router } from "express";
import { Tasks } from "../tasks/tasks.js";

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 */
export function publicRouter(): Router {
	const router = express.Router();

	router.get(PublicApiPaths.Healthz, (req, res) => {
		res.status(200).send("OK");
	});

	/**
	 * Gets public details of the provider
	 */
	router.get(PublicApiPaths.GetProviderDetails, async (req, res, next) => {
		try {
			return res.json({ version, ...{ message: "Provider online" } });
		} catch (err) {
			req.logger.error(() => ({
				err,
				data: { reqParams: req.params },
				msg: "Error getting provider details",
			}));
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
