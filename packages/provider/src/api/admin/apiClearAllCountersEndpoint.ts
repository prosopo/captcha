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
import { type Logger, type ProsopoApiError, getLogger } from "@prosopo/common";
import { ClearAllCountersBody, ClearAllCountersResponse } from "@prosopo/types";
import type { z } from "zod";
import type { UsageCounters } from "../../util/usageCounters.js";

type ClearAllCountersBodyType = typeof ClearAllCountersBody;

/**
 * Admin endpoint: delete every per-sitekey usage counter (optionally scoped
 * to a single dappAccount). Intended for manual integration testing and
 * staging-environment resets — not part of the hot path. Returns the number
 * of Redis keys deleted.
 */
class ApiClearAllCountersEndpoint
	implements ApiEndpoint<ClearAllCountersBodyType>
{
	public constructor(private readonly usageCounters: UsageCounters | null) {}

	async processRequest(
		args: z.infer<ClearAllCountersBodyType>,
		logger?: Logger,
	): Promise<ApiEndpointResponse> {
		logger = logger || getLogger("info", "");
		const dappAccount = args.dapp;
		const scope = dappAccount ?? "all";
		try {
			logger.info(() => ({
				msg: "Clearing usage counters",
				data: { scope },
			}));

			if (!this.usageCounters) {
				return {
					status: ApiEndpointResponseStatus.FAIL,
					error: "Usage counters not available (Redis unreachable)",
				};
			}

			const deleted = await this.usageCounters.clearAll(dappAccount);
			if (deleted === null) {
				return {
					status: ApiEndpointResponseStatus.FAIL,
					error: "Counter clear failed",
				};
			}

			logger.info(() => ({
				msg: "Usage counters cleared",
				data: { scope, deletedCount: deleted },
			}));

			return {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: ClearAllCountersResponse.parse({
					success: true,
					deletedCount: deleted,
					scope,
				}),
			};
		} catch (error) {
			logger.error(() => ({
				msg: "Error clearing usage counters",
				err: error,
			}));
			return {
				status: ApiEndpointResponseStatus.FAIL,
				error: (error as ProsopoApiError).message,
			};
		}
	}

	public getRequestArgsSchema(): ClearAllCountersBodyType {
		return ClearAllCountersBody;
	}
}

export { ApiClearAllCountersEndpoint };
