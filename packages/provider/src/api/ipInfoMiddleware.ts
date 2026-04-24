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

import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";

export const ipInfoMiddleware = (env: ProviderEnvironment) => {
	return async (req: Request, _res: Response, next: NextFunction) => {
		try {
			const ip = req.ip;
			if (ip && env.ipInfoService.isAvailable()) {
				req.ipInfo = await env.ipInfoService.lookup(ip);
			}
			next();
		} catch (err) {
			// Permissive: log and continue without IP info
			req.logger?.warn?.(() => ({
				msg: "IP info middleware failed",
				err,
			}));
			next();
		}
	};
};
