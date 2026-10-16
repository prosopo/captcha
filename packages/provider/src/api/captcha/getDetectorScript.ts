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

import { ApiParams, GetDetectorScriptQuery } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { Request, Response } from "express";
import type { AugmentedRequest } from "../../express.js";
import { getAssignSecret } from "../../tasks/detection/assignSecret.js";
import {
	getDetectorBundlePool,
	getDetectorBundlePoolDir,
} from "../../tasks/detection/bundlePool.js";
import { bundleForClient } from "../../tasks/detection/clientBundle.js";
import { Tasks } from "../../tasks/index.js";
import { normalizeRequestIp } from "../../utils/normalizeRequestIp.js";

const notFound = (res: Response): Response => res.status(404).end();

/**
 * Serves the bundle bound to a detectorSessionId as a module script, so the
 * widget can load it with `<script type="module" src>` instead of importing
 * the inline copy from a `blob:` or `data:` URL.
 *
 * Only a caller whose address maps to the bound bundle gets it. That is the
 * same bundle its own assign call would hand out, so a session id passed
 * around cannot be used to collect bundles beyond what each address can
 * already get. Every refusal is a bare 404; the widget falls back to inline.
 */
export default (env: ProviderEnvironment) =>
	async (req: Request & AugmentedRequest, res: Response): Promise<Response> => {
		try {
			const query = GetDetectorScriptQuery.safeParse(req.query);
			if (!query.success) {
				return notFound(res);
			}
			const detectorSessionId = query.data[ApiParams.detectorSessionId];

			const pool = getDetectorBundlePool();
			if (!pool || pool.size() === 0) {
				return notFound(res);
			}

			const writeQueue = new Tasks(env, req.logger).frictionlessManager
				.writeQueue;
			const bundleId = await writeQueue?.getDetectorBundle(detectorSessionId);
			const bundle = bundleId ? pool.get(bundleId) : undefined;
			if (!bundleId || !bundle) {
				return notFound(res);
			}

			const secret = getAssignSecret(getDetectorBundlePoolDir(), {
				info: (msg, data) => req.logger.info(() => ({ msg, data })),
				warn: (msg, data) => req.logger.warn(() => ({ msg, data })),
			});
			const callerBundle = bundleForClient(
				pool,
				normalizeRequestIp(req.ip, req.logger),
				secret,
			);
			if (callerBundle.bundleId !== bundleId) {
				req.logger.info(() => ({
					msg: "detector script refused: caller maps to a different bundle",
					data: { detectorSessionId },
				}));
				return notFound(res);
			}

			return res
				.status(200)
				.set({
					"Content-Type": "text/javascript; charset=utf-8",
					"Cache-Control": "no-store",
				})
				.send(bundle.js);
		} catch (err) {
			req.logger.warn(() => ({ msg: "getDetectorScript failed", err }));
			return notFound(res);
		}
	};
