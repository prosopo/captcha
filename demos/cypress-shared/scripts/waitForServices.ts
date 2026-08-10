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

import https from "node:https";

export interface Service {
	name: string;
	url: string;
}

export interface ServiceStatus extends Service {
	ready: boolean;
}

export const defaultServices: Service[] = [
	{ name: "Admin API", url: "https://localhost:9229/healthz" },
	{ name: "Bundle Server", url: "https://localhost:9269/procaptcha.bundle.js" },
	{ name: "Client Bundle", url: "https://localhost:9232" },
	{ name: "Example Server", url: "https://localhost:9228/health" },
];

/**
 * True for URLs pointing at this machine. An unparseable URL counts as remote so
 * the safe branch is the fallback.
 */
export function isLoopback(url: string): boolean {
	try {
		const { hostname } = new URL(url);
		return (
			hostname === "localhost" ||
			hostname === "127.0.0.1" ||
			hostname === "[::1]" ||
			hostname === "::1"
		);
	} catch {
		return false;
	}
}

/**
 * A single reachability probe. Never rejects: a connection error, a non-200
 * status and a timeout are all just "not ready yet", because the whole point is
 * to poll services that are still coming up.
 */
export async function checkService(
	url: string,
	timeoutMs = 2000,
): Promise<boolean> {
	return new Promise((resolve) => {
		// The dev stack serves self-signed certs, so validation has to be off for
		// the probe to connect at all - but only ever for loopback. Anything else
		// keeps the default verification, so a mistyped or remote URL can never
		// silently downgrade to an unauthenticated connection.
		const rejectUnauthorized = !isLoopback(url);
		// codeql[js/disabling-certificate-validation]
		const req = https.get(url, { rejectUnauthorized }, (res) => {
			resolve(res.statusCode === 200 || res.statusCode === 304);
		});
		req.on("error", () => resolve(false));
		req.setTimeout(timeoutMs, () => {
			req.destroy();
			resolve(false);
		});
	});
}

export interface WaitOptions {
	maxWait?: number;
	pollInterval?: number;
	services?: Service[];
	check?: (url: string) => Promise<boolean>;
	now?: () => number;
	sleep?: (ms: number) => Promise<void>;
	log?: (message: string) => void;
}

/**
 * Poll every service until they are all ready, or throw once maxWait elapses.
 * The clock, the sleep and the probe are injectable so the polling behaviour can
 * be tested without waiting on real timers or real sockets.
 */
export async function waitForServices({
	maxWait = 120000,
	pollInterval = 2000,
	services = defaultServices,
	check = checkService,
	now = Date.now,
	sleep = (ms: number): Promise<void> =>
		new Promise((resolve) => setTimeout(resolve, ms)),
	log = console.log,
}: WaitOptions = {}): Promise<ServiceStatus[]> {
	const startTime = now();
	log("🔍 Waiting for services to be ready...\n");

	while (now() - startTime < maxWait) {
		const results: ServiceStatus[] = await Promise.all(
			services.map(async (service) => ({
				...service,
				ready: await check(service.url),
			})),
		);

		log("🔍 Service Status:\n");
		for (const result of results) {
			log(`${result.ready ? "✅" : "⏳"} ${result.name} - ${result.url}`);
		}

		// an empty service list is vacuously ready — nothing to wait for
		if (results.every((result) => result.ready)) {
			log("\n✅ All services are ready!");
			return results;
		}

		const elapsed = Math.floor((now() - startTime) / 1000);
		log(`\n⏱️  Elapsed: ${elapsed}s / ${maxWait / 1000}s`);

		await sleep(pollInterval);
	}

	throw new Error("❌ Services did not become ready in time");
}
