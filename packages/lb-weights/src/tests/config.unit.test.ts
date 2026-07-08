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
import { describe, expect, it } from "vitest";
import { loadConfig } from "../config.js";

describe("loadConfig", () => {
	it("applies safe defaults (dry-run on, 15s, cpu_usage_1m)", () => {
		const config = loadConfig({
			BUNNY_API_KEY: "token",
			LB_SUBDOMAINS: "pronode, staging.pronode",
		});
		expect(config.LB_SUBDOMAINS).toEqual(["pronode", "staging.pronode"]);
		expect(config.LB_METRIC_NAME).toBe("cpu_usage_1m");
		expect(config.LB_INTERVAL_SECONDS).toBe(15);
		expect(config.LB_DRY_RUN).toBe(true);
		expect(config.LB_METRICS_SCHEME).toBe("http");
		expect(config.LB_METRICS_PATH).toBe("/metrics");
		expect(config.PROSOPO_LOG_LEVEL).toBe(LogLevel.enum.info);
	});

	it("parses overrides including dry-run false", () => {
		const config = loadConfig({
			BUNNY_API_KEY: "token",
			LB_SUBDOMAINS: "pronode",
			LB_METRIC_NAME: "load_1m",
			LB_INTERVAL_SECONDS: "30",
			LB_DRY_RUN: "false",
			LB_METRICS_SCHEME: "https",
			LB_METRICS_PORT: "9100",
		});
		expect(config.LB_DRY_RUN).toBe(false);
		expect(config.LB_INTERVAL_SECONDS).toBe(30);
		expect(config.LB_METRIC_NAME).toBe("load_1m");
		expect(config.LB_METRICS_SCHEME).toBe("https");
		expect(config.LB_METRICS_PORT).toBe(9100);
	});

	it("requires BUNNY_API_KEY", () => {
		expect(() => loadConfig({ LB_SUBDOMAINS: "pronode" })).toThrow();
	});

	it("requires at least one subdomain", () => {
		expect(() =>
			loadConfig({ BUNNY_API_KEY: "token", LB_SUBDOMAINS: "  " }),
		).toThrow();
	});
});
