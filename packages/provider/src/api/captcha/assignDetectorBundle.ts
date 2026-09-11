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

import { createHmac } from "node:crypto";
import { ApiParams, type AssignDetectorBundleResponse } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import type { AugmentedRequest } from "../../express.js";
import { getAssignSecret } from "../../tasks/detection/assignSecret.js";
import {
	getDetectorBundlePool,
	getDetectorBundlePoolDir,
} from "../../tasks/detection/bundlePool.js";
import { Tasks } from "../../tasks/index.js";
import { normalizeRequestIp } from "../../utils/normalizeRequestIp.js";

/** Pool position for this caller: a keyed hash of their address. */
const clientIndex = (ip: string, secret: Buffer): number =>
	createHmac("sha256", secret).update(ip).digest().readUIntBE(0, 6);

/**
 * Assigns a precomputed detector bundle for this detection session.
 *
 * The bundle is derived from the caller's address and this provider's secret,
 * so a repeat caller keeps getting the same one with nothing stored and nothing
 * to expire. Any bundle detects equally well, so this is not visible to users.
 *
 * The `detectorSessionId → bundleId` binding is still written to Redis; the
 * decrypt side resolves the session's bundle from it on the next hop.
 *
 * Returns `useProviderBundle: false` when there is no pool, no secret, or Redis
 * could not store that binding. There is NO bundled detector to fall back to —
 * the client sends an empty token on the frictionless hop and the provider
 * decides what to serve.
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
			if (!pool || pool.size() === 0) {
				return res.json(noBundle);
			}

			const secret = getAssignSecret(getDetectorBundlePoolDir(), {
				info: (msg, data) => req.logger.info(() => ({ msg, data })),
				warn: (msg, data) => req.logger.warn(() => ({ msg, data })),
			});

			const { bundleId, bundle } = pool.at(
				clientIndex(normalizeRequestIp(req.ip, req.logger), secret),
			);
			const detectorSessionId = `det-${uuidv4()}`;

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
