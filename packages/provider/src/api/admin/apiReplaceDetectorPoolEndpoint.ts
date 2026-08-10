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
import { ReplaceDetectorPoolBody } from "@prosopo/types";
import type { z } from "zod";
import {
	type PoolBundle,
	replaceDetectorBundlePool,
} from "../../tasks/detection/bundlePool.js";

type ReplaceDetectorPoolBodyType = typeof ReplaceDetectorPoolBody;

/**
 * Hot-swaps the in-memory detector bundle pool with a freshly-pushed set of
 * bundles. The emergency rotation channel — lets the cycle script swap the pool
 * without a provider redeploy. Bundles never touch disk here; they live only in
 * process memory.
 */
class ApiReplaceDetectorPoolEndpoint
	implements ApiEndpoint<ReplaceDetectorPoolBodyType>
{
	async processRequest(
		args: z.infer<ReplaceDetectorPoolBodyType>,
		logger?: Logger,
	): Promise<ApiEndpointResponse> {
		logger = logger || getLogger("info", "");
		try {
			const bundles = new Map<string, PoolBundle>(Object.entries(args.bundles));
			const activeLogger = logger;
			const { count, persisted } = replaceDetectorBundlePool(bundles, {
				warn: (msg, data) => activeLogger.warn(() => ({ msg, data })),
				info: (msg, data) => activeLogger.info(() => ({ msg, data })),
			});
			logger.info(() => ({
				msg: "Detector bundle pool replaced",
				count,
				// false ⇒ the pool is live but only in memory; it will be lost on
				// the next restart and the node will fall back to whatever is on
				// disk (possibly nothing). Worth alarming on.
				persisted,
			}));
			return {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { count, persisted },
			};
		} catch (error) {
			logger.error(() => ({
				msg: "Error replacing detector bundle pool",
				err: error,
			}));
			return {
				status: ApiEndpointResponseStatus.FAIL,
				error: (error as ProsopoApiError).message,
			};
		}
	}

	public getRequestArgsSchema(): ReplaceDetectorPoolBodyType {
		return ReplaceDetectorPoolBody;
	}
}

export { ApiReplaceDetectorPoolEndpoint };
