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
import { LogLevel, type Logger, getLogger } from "@prosopo/logger";
import {
	DEFAULT_DETECTOR_POOL_DIR,
	filterPoolBundles,
	persistDetectorBundlePool,
} from "@prosopo/provider";
import {
	type KeyringPair,
	type ProsopoConfigOutput,
	ReplaceDetectorPoolBody,
} from "@prosopo/types";
import type { Argv } from "yargs";

const readStdin = async (): Promise<string> => {
	const chunks: Buffer[] = [];
	for await (const chunk of process.stdin) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks).toString("utf8");
};

/**
 * Writes a detector pool to this node's pool directory. The pool is read from
 * stdin rather than a path so it can be piped into a container
 * (`docker compose exec -T provider ... < detector-pool.json`): a file copied
 * in would be owned by root, and the provider image does not run as root.
 */
export default (
	_pair: KeyringPair,
	_config: ProsopoConfigOutput,
	cmdArgs?: { logger?: Logger },
) => {
	const logger =
		cmdArgs?.logger || getLogger(LogLevel.enum.info, "cli.detector_pool_set");

	return {
		command: "detector_pool_set",
		describe:
			"Replace the detector pool with one read from stdin. Restart the provider to load it.",
		builder: (yargs: Argv) => yargs,
		handler: async () => {
			try {
				const body = ReplaceDetectorPoolBody.parse(
					JSON.parse(await readStdin()),
				);
				const bundles = filterPoolBundles(
					new Map(Object.entries(body.bundles)),
					{ warn: (msg, data) => logger.warn(() => ({ msg, data })) },
				);
				if (bundles.size === 0) {
					throw new Error("none of the bundles can be loaded on this node");
				}
				const dir =
					process.env.PROSOPO_DETECTOR_POOL_DIR ?? DEFAULT_DETECTOR_POOL_DIR;
				persistDetectorBundlePool(bundles, dir);
				logger.info(() => ({
					data: { count: bundles.size, dir },
					msg: "Detector pool written. Restart the provider to load it.",
				}));
			} catch (err) {
				logger.error(() => ({ err, msg: "Error writing detector pool" }));
				process.exitCode = 1;
			}
		},
		middlewares: [],
	};
};
