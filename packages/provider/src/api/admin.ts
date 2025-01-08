import { Logger, logError } from "@prosopo/common";
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
	AddBlockRulesIPSpec,
	AddBlockRulesUserSpec,
	AdminApiPaths,
	type ApiResponse,
	BlockRuleIPAddBody,
	RegisterSitekeyBody,
	RemoveBlockRulesIPSpec,
	RemoveBlockRulesUserSpec,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { Router } from "express";
import { Tasks } from "../index.js";

export function prosopoAdminRouter(env: ProviderEnvironment): Router {
	const router = Router();
	const tasks = new Tasks(env);

	router.post(AdminApiPaths.SiteKeyRegister, async (req, res, next) => {
		try {
			tasks.logger.info("Registering site key, request body:");
			tasks.logger.info(req.body);
			const { siteKey, settings } = RegisterSitekeyBody.parse(req.body);
			const temp = settings || {};
			await tasks.clientTaskManager.registerSiteKey(siteKey, temp);
			const response: ApiResponse = {
				status: "success",
			};
			res.json(response);
		} catch (err) {
			logError(err, tasks.logger);
			res.status(500).send("An internal server error occurred.");
		}
	});

	router.post(AdminApiPaths.BlockRuleIPAdd, async (req, res, next) => {
		try {
			tasks.logger.info("Adding block rules");
			const parsed = AddBlockRulesIPSpec.parse(req.body);
			await tasks.clientTaskManager.addIPBlockRules(parsed);
			const response: ApiResponse = {
				status: "success",
			};
			res.json(response);
		} catch (err) {
			logError(err, tasks.logger);
			res.status(400).send("An internal server error occurred.");
		}
	});

	router.post(AdminApiPaths.BlockRuleIPRemove, async (req, res, next) => {
		try {
			tasks.logger.info("Removing block rules");
			const parsed = RemoveBlockRulesIPSpec.parse(req.body);
			await tasks.clientTaskManager.removeIPBlockRules(parsed);
			const response: ApiResponse = {
				status: "success",
			};
			res.json(response);
		} catch (err) {
			logError(err, tasks.logger);
			res.status(400).send("An internal server error occurred.");
		}
	});

	router.post(AdminApiPaths.BlocKRuleUserAdd, async (req, res, next) => {
		try {
			tasks.logger.info("Adding block rules");
			const parsed = AddBlockRulesUserSpec.parse(req.body);
			await tasks.clientTaskManager.addUserBlockRules(parsed);
			const response: ApiResponse = {
				status: "success",
			};
			res.json(response);
		} catch (err) {
			logError(err, tasks.logger);
			res.status(400).send("An internal server error occurred.");
		}
	});

	router.post(AdminApiPaths.BlockRuleUserRemove, async (req, res, next) => {
		try {
			tasks.logger.info("Removing block rules");
			const parsed = RemoveBlockRulesUserSpec.parse(req.body);
			await tasks.clientTaskManager.removeUserBlockRules(parsed);
			const response: ApiResponse = {
				status: "success",
			};
			res.json(response);
		} catch (err) {
			logError(err, tasks.logger);
			res.status(400).send("An internal server error occurred.");
		}
	});

	return router;
}
