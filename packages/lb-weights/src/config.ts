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
import { LogLevel } from "@prosopo/logger";
import { z } from "zod";

// Parse a comma/whitespace separated list into a trimmed, non-empty array.
const stringList = z
	.string()
	.transform((value) =>
		value
			.split(/[\s,]+/)
			.map((entry) => entry.trim())
			.filter((entry) => entry.length > 0),
	)
	.pipe(z.array(z.string()).min(1));

const booleanFromEnv = z
	.string()
	.transform((value) => value.trim().toLowerCase())
	.pipe(z.enum(["true", "false", "1", "0", "yes", "no"]))
	.transform((value) => value === "true" || value === "1" || value === "yes");

// Environment variable schema. Defaults keep the service safe by default:
// dry-run (readonly) is on unless explicitly disabled.
export const configSchema = z.object({
	// Bunny DNS API token used to read zones and set record weights.
	BUNNY_API_KEY: z.string().min(1),
	// Subdomains (record names) whose load-balancer pools we manage.
	LB_SUBDOMAINS: stringList,
	// Prometheus metric to drive weighting (lower usage => higher weight).
	LB_METRIC_NAME: z.string().min(1).default("cpu_usage_1m"),
	// How the per-node metrics endpoint is reached: <scheme>://<ip>:<port?><path>.
	LB_METRICS_SCHEME: z.enum(["http", "https"]).default("http"),
	LB_METRICS_PORT: z.coerce.number().int().positive().optional(),
	LB_METRICS_PATH: z.string().default("/metrics"),
	// Seconds between full recompute cycles.
	LB_INTERVAL_SECONDS: z.coerce.number().int().positive().default(15),
	// Readonly mode: compute + log weights but do not write them to Bunny.
	LB_DRY_RUN: booleanFromEnv.default("true"),
	// Optional override for the Bunny API base url (useful for tests).
	BUNNY_BASE_URL: z.string().url().optional(),
	// Logger verbosity.
	PROSOPO_LOG_LEVEL: LogLevel.default(LogLevel.enum.info),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
	return configSchema.parse(env);
}
