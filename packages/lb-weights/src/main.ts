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
import { getLogger } from "@prosopo/logger";
import { startBalancerLoop } from "./balancer.js";
import { BunnyDnsClient } from "./bunny.js";
import { loadConfig } from "./config.js";

async function main(): Promise<void> {
	const config = loadConfig();
	const logger = getLogger(config.PROSOPO_LOG_LEVEL, "@prosopo/lb-weights");

	const client = new BunnyDnsClient({
		accessKey: config.BUNNY_API_KEY,
		baseUrl: config.BUNNY_BASE_URL,
		logger,
	});

	const controller = new AbortController();
	for (const signal of ["SIGINT", "SIGTERM"] as const) {
		process.on(signal, () => {
			logger.info(() => ({ msg: "Shutting down", data: { signal } }));
			controller.abort();
		});
	}

	logger.info(() => ({
		msg: "Starting load-balancer weight updater",
		data: {
			subdomains: config.LB_SUBDOMAINS,
			metric: config.LB_METRIC_NAME,
			intervalSeconds: config.LB_INTERVAL_SECONDS,
			dryRun: config.LB_DRY_RUN,
		},
	}));

	await startBalancerLoop({ client, config, logger }, controller.signal);
}

main().catch((error: unknown) => {
	// Config/parse errors surface here before the logger exists.
	console.error("Fatal error in lb-weights:", error);
	process.exitCode = 1;
});
