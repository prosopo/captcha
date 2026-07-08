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

/**
 * Parse a single metric's value out of a Prometheus text exposition payload.
 *
 * Handles the common `name value` and `name{labels} value` line forms, ignores
 * `#` comment/HELP/TYPE lines, and returns the value of the first sample whose
 * metric name matches exactly. Returns null if the metric is absent or the
 * value is not a finite number.
 */
export function parsePrometheusMetric(
	body: string,
	metricName: string,
): number | null {
	for (const rawLine of body.split("\n")) {
		const line = rawLine.trim();
		if (line.length === 0 || line.startsWith("#")) {
			continue;
		}
		// name may be followed by `{labels}` and then whitespace + value.
		const braceIndex = line.indexOf("{");
		const spaceIndex = line.search(/\s/);
		const nameEnd =
			braceIndex >= 0 && (spaceIndex < 0 || braceIndex < spaceIndex)
				? braceIndex
				: spaceIndex;
		if (nameEnd <= 0) {
			continue;
		}
		const name = line.slice(0, nameEnd);
		if (name !== metricName) {
			continue;
		}
		// The value is the last whitespace-separated token on the line.
		const tokens = line.split(/\s+/);
		const valueToken = tokens[tokens.length - 1];
		if (valueToken === undefined) {
			continue;
		}
		const value = Number(valueToken);
		if (Number.isFinite(value)) {
			return value;
		}
	}
	return null;
}

export interface MetricsFetchOptions {
	scheme: "http" | "https";
	port?: number;
	path: string;
	fetchFn?: typeof fetch;
	timeoutMs?: number;
}

/** Build the metrics URL for a node IP. */
export function metricsUrl(ip: string, options: MetricsFetchOptions): string {
	const host = ip.includes(":") ? `[${ip}]` : ip; // bracket IPv6
	const authority = options.port ? `${host}:${options.port}` : host;
	const path = options.path.startsWith("/")
		? options.path
		: `/${options.path}`;
	return `${options.scheme}://${authority}${path}`;
}

/**
 * Fetch a node's Prometheus metrics endpoint and extract a single metric value.
 * Returns null when the endpoint is unreachable, errors, or lacks the metric.
 */
export async function fetchNodeMetric(
	ip: string,
	metricName: string,
	options: MetricsFetchOptions,
): Promise<number | null> {
	const fetchFn = options.fetchFn ?? fetch;
	const url = metricsUrl(ip, options);
	const controller = new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		options.timeoutMs ?? 5000,
	);
	try {
		const response = await fetchFn(url, { signal: controller.signal });
		if (!response.ok) {
			return null;
		}
		const body = await response.text();
		return parsePrometheusMetric(body, metricName);
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}
