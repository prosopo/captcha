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
import { describe, expect, it, vi } from "vitest";
import {
	fetchNodeMetric,
	metricsUrl,
	parsePrometheusMetric,
} from "../metrics.js";

const SAMPLE = `# HELP cpu_usage_1m CPU usage
# TYPE cpu_usage_1m gauge
cpu_usage_1m 0.42
memory_usage 128
cpu_usage_1m{core="0"} 0.9
`;

describe("parsePrometheusMetric", () => {
	it("extracts a simple metric value", () => {
		expect(parsePrometheusMetric(SAMPLE, "cpu_usage_1m")).toBe(0.42);
	});

	it("returns null for an absent metric", () => {
		expect(parsePrometheusMetric(SAMPLE, "not_there")).toBeNull();
	});

	it("ignores comments and unrelated metrics", () => {
		expect(parsePrometheusMetric(SAMPLE, "memory_usage")).toBe(128);
	});

	it("does not match a metric that is only a prefix", () => {
		expect(parsePrometheusMetric("cpu_usage_1m_total 5\n", "cpu_usage_1m")).toBeNull();
	});
});

describe("metricsUrl", () => {
	it("builds an ipv4 url", () => {
		expect(
			metricsUrl("10.0.0.1", { scheme: "http", path: "/metrics" }),
		).toBe("http://10.0.0.1/metrics");
	});

	it("brackets ipv6 and adds a port", () => {
		expect(
			metricsUrl("2001:db8::1", {
				scheme: "https",
				port: 9100,
				path: "metrics",
			}),
		).toBe("https://[2001:db8::1]:9100/metrics");
	});
});

describe("fetchNodeMetric", () => {
	it("returns the metric value on success", async () => {
		const fetchFn = vi.fn<typeof fetch>(async () =>
			new Response(SAMPLE, { status: 200 }),
		);
		const value = await fetchNodeMetric("10.0.0.1", "cpu_usage_1m", {
			scheme: "http",
			path: "/metrics",
			fetchFn,
		});
		expect(value).toBe(0.42);
	});

	it("returns null on a non-ok response", async () => {
		const fetchFn = vi.fn<typeof fetch>(async () =>
			new Response("", { status: 500 }),
		);
		const value = await fetchNodeMetric("10.0.0.1", "cpu_usage_1m", {
			scheme: "http",
			path: "/metrics",
			fetchFn,
		});
		expect(value).toBeNull();
	});

	it("returns null when fetch throws", async () => {
		const fetchFn = vi.fn<typeof fetch>(async () => {
			throw new Error("connection refused");
		});
		const value = await fetchNodeMetric("10.0.0.1", "cpu_usage_1m", {
			scheme: "http",
			path: "/metrics",
			fetchFn,
		});
		expect(value).toBeNull();
	});
});
