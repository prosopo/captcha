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
import { ApiPrefix, PublicApiPaths } from "@prosopo/types";
import type { NextFunction, Request, Response } from "express";

export function ignoreMiddleware() {
	return (req: Request, res: Response, next: NextFunction) => {
		if (req.originalUrl.indexOf(PublicApiPaths.Healthz) !== -1) {
			// If the request is for a health endpoint, we allow it to pass through
			return next();
		}

		// Ignore non-api routes
		if (req.originalUrl.indexOf(ApiPrefix) === -1) {
			res.statusCode = 404;
			res.send("Not Found");
			return;
		}
		next();
	};
}
