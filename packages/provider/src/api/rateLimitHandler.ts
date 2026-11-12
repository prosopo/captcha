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

import { sendProsopoError } from "@prosopo/api-express-router";
import { ProsopoError } from "@prosopo/common";
import type { Logger } from "@prosopo/logger";
import type { Options } from "express-rate-limit";

// Logs 429s so operators can alarm on sustained rate limiting.
export const rateLimitHandler =
	(logger: Logger, path: string): Options["handler"] =>
	(req, res, _next, options) => {
		logger.warn(() => ({
			msg: "Rate limit exceeded",
			data: {
				path,
				ip: req.ip,
				siteKey: req.headers["prosopo-site-key"],
			},
		}));
		sendProsopoError(
			res,
			new ProsopoError({
				code: "RATE_LIMITED",
				errorSite: "PROV-93",
				status: options.statusCode,
			}),
		);
	};
