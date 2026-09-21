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

import {
	type ApiEndpoint,
	type ApiEndpointResponse,
	ApiEndpointResponseStatus,
} from "@prosopo/api-route";
import type { ProsopoApiError } from "@prosopo/common";
import { type Logger, getLogger } from "@prosopo/logger";
import { GetSessionBody } from "@prosopo/types";
import type { z } from "zod";
import type { Tasks } from "../../tasks/index.js";

type GetSessionBodyType = typeof GetSessionBody;

/**
 * Diagnostic-only. Reads a session record from both Mongo (authoritative)
 * and Redis (fast-path cache) and returns both views verbatim so tests
 * can assert `captchaType`, `bundleId`, `deleted`, `originSessionId` etc.
 * agree between the two stores at each stage of a captcha flow.
 *
 * Deliberately does not touch either store. Not called from any client-
 * facing widget path; the cypress consistency suite is the only current
 * consumer.
 */
class ApiGetSessionEndpoint implements ApiEndpoint<GetSessionBodyType> {
	public constructor(private readonly tasks: Tasks) {}

	async processRequest(
		args: z.infer<GetSessionBodyType>,
		logger?: Logger,
	): Promise<ApiEndpointResponse> {
		logger = logger
			? logger.with({}, "admin:session:get")
			: getLogger("info", "provider:admin:session:get");
		try {
			const { sessionId } = args;
			logger.info(() => ({
				msg: "Getting session state from Mongo and Redis",
				data: { sessionId },
			}));

			// Mongo: authoritative view. Uses the same read the provider
			// uses on every hop so field projection matches what the DM /
			// verify path actually sees.
			const mongo = await this.tasks.db.getSessionRecordBySessionId(sessionId);

			// Redis: cache view. Independent of Mongo; may or may not
			// exist depending on TTL and prior invalidations. `undefined`
			// here maps to `null` on the wire so consumers can distinguish
			// "no cache entry" from "cache entry with empty object".
			const cached = this.tasks.writeQueue
				? await this.tasks.writeQueue.getCachedSession(sessionId)
				: undefined;

			return {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: {
					mongo: (mongo ?? null) as Record<string, unknown> | null,
					redis: (cached ?? null) as Record<string, unknown> | null,
				},
			};
		} catch (error) {
			logger.error(() => ({
				msg: "Error reading session state",
				err: error,
			}));
			return {
				status: ApiEndpointResponseStatus.FAIL,
				error: (error as ProsopoApiError).message,
			};
		}
	}

	public getRequestArgsSchema(): GetSessionBodyType {
		return GetSessionBody;
	}
}

export { ApiGetSessionEndpoint };
