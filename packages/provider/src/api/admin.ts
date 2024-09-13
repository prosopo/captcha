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
import {
	AdminApiPaths,
	type ApiResponse,
	VerifyPowCaptchaSolutionBody,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { Router } from "express";
import { Tasks } from "../index.js";
import { authMiddleware } from "./authMiddleware.js";

export function prosopoAdminRouter(env: ProviderEnvironment): Router {
	const router = Router();
	const tasks = new Tasks(env);

	// Use the authMiddleware for all routes in this router
	router.use(authMiddleware(env));

	router.post(AdminApiPaths.UpdateDataset, async (req, res, next) => {
		try {
			const result = await tasks.datasetManager.providerSetDataset(req.body);

			console.info(`Dataset update complete: ${result}`);
			res.status(200).send(result);
		} catch (err) {
			tasks.logger.error(err);
			res.status(500).send(err);
		}
	});

	router.post(AdminApiPaths.SiteKeyRegister, async (req, res, next) => {
		try {
			const parsed = VerifyPowCaptchaSolutionBody.parse(req.body);
			await tasks.clientTaskManager.registerSiteKey(parsed.siteKey);
			const response: ApiResponse = {
				status: "success",
			};
			res.json(response);
		} catch (err) {
			tasks.logger.error(err);
			res.status(500).send(err);
		}
	});

	return router;
}
