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
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { handleErrors } from "./errorHandler.js";

export const headerCheckMiddleware = (env: ProviderEnvironment) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const user = req.headers["prosopo-user"] as string;
			const dapp = req.headers["prosopo-site-key"] as string;

			if (!user) {
				unauthorised(res);
				return;
			}
			if (!dapp) {
				unauthorised(res);
				return;
			}

			next();
		} catch (err) {
			unauthorised(res);
		}
	};
};

const unauthorised = (res: Response) =>
	res.status(401).json({ error: "Unauthorized", message: "Unauthorized" });
