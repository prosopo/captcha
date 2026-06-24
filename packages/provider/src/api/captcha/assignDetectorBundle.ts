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

import { ApiParams, type AssignDetectorBundleResponse } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import type { AugmentedRequest } from "../../express.js";
import { getDetectorBundlePool } from "../../tasks/detection/bundlePool.js";
import { Tasks } from "../../tasks/index.js";

/**
 * Assigns a precomputed detector bundle for this detection session.
 *
 * When the provider has a non-empty pool it picks a random bundle, records the
 * (short-TTL) `detectorSessionId → bundleId` binding in Redis, and returns the
 * obfuscated detector script inline. When no pool is loaded (dev / not yet
 * provisioned) it returns `useProviderBundle: false` so the client falls back
 * to the bundled detector and the legacy key-pool decryption path — keeping the
 * flow working everywhere without a pool.
 */
export default (env: ProviderEnvironment) =>
	async (
		req: Request & AugmentedRequest,
		res: Response,
		_next: NextFunction,
	): Promise<Response> => {
		try {
			const noBundle: AssignDetectorBundleResponse = {
				[ApiParams.useProviderBundle]: false,
				status: "ok",
			};

			const pool = getDetectorBundlePool();
			// DEBUG(detector-pool): remove. Observe assign decisions.
			req.logger.info(() => ({
				msg: `[POOL-DEBUG] assign requested — pool ${pool ? `size=${pool.size()}` : "NOT INITIALISED (no dir) → legacy"}`,
			}));
			if (!pool || pool.size() === 0) {
				req.logger.info(() => ({
					msg: "[POOL-DEBUG] assign → useProviderBundle=false (bundled detector fallback)",
				}));
				return res.json(noBundle);
			}

			const { bundleId, bundle } = pool.pickRandom();
			const detectorSessionId = `det-${uuidv4()}`;
			// DEBUG(detector-pool): remove.
			req.logger.info(() => ({
				msg: `[POOL-DEBUG] assign picked bundleId=${bundleId} for detectorSessionId=${detectorSessionId} (script ${bundle.js.length} bytes)`,
			}));

			// Persist the ephemeral session→bundle binding. If Redis is
			// unavailable we cannot guarantee the decrypt side can resolve the
			// bundle, so we fall back to the bundled detector rather than handing
			// out a binding that would later fail closed.
			const tasks = new Tasks(env, req.logger);
			const writeQueue = tasks.frictionlessManager.writeQueue;
			if (!writeQueue) {
				return res.json(noBundle);
			}
			const cached = await writeQueue.cacheDetectorBundle(
				detectorSessionId,
				bundleId,
			);
			if (!cached) {
				return res.json(noBundle);
			}

			// DEBUG(detector-pool): remove.
			req.logger.info(() => ({
				msg: `[POOL-DEBUG] assign → useProviderBundle=true, served bundleId=${bundleId}, binding stored (TTL ~60s)`,
			}));
			const response: AssignDetectorBundleResponse = {
				[ApiParams.useProviderBundle]: true,
				[ApiParams.detectorSessionId]: detectorSessionId,
				[ApiParams.detectorScript]: bundle.js,
				status: "ok",
			};
			return res.json(response);
		} catch (err) {
			// Any failure (e.g. DB-down Tasks construction) degrades to the
			// bundled detector rather than breaking the widget.
			req.logger.warn(() => ({
				msg: "assignDetectorBundle failed; falling back to bundled detector",
				err,
			}));
			return res.json({
				[ApiParams.useProviderBundle]: false,
				status: "ok",
			} satisfies AssignDetectorBundleResponse);
		}
	};
