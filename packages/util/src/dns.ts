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

import * as dns from "node:dns";
import * as https from "node:https";
import { promisify } from "node:util";

/** Default DNS servers to use for lookups (Google and Cloudflare) */
const DEFAULT_DNS_SERVERS = ["8.8.8.8", "1.1.1.1"];

/** Default timeout for HTTPS requests in milliseconds */
const DEFAULT_HTTPS_TIMEOUT_MS = 1000;

/**
 * Creates an isolated DNS resolver instance that doesn't affect global DNS config.
 * Uses custom DNS servers by default for reliable lookups.
 */
const createResolver = (dnsServers?: string[]): dns.Resolver => {
	const resolver = new dns.Resolver();
	resolver.setServers(dnsServers ?? DEFAULT_DNS_SERVERS);
	return resolver;
};

export const checkForCname = async (
	domain: string,
	resolver?: dns.Resolver,
): Promise<string[] | null> => {
	try {
		const res = resolver ?? createResolver();
		const resolveCname = promisify(res.resolveCname.bind(res));
		return await resolveCname(domain);
	} catch (err) {
		return null;
	}
};

export const checkForARecord = async (
	domain: string,
	resolver?: dns.Resolver,
): Promise<string[] | null> => {
	try {
		const res = resolver ?? createResolver();
		const resolve4 = promisify(res.resolve4.bind(res));
		return await resolve4(domain);
	} catch (err) {
		return null;
	}
};

export const checkForMXRecord = async (
	domain: string,
	resolver?: dns.Resolver,
): Promise<dns.MxRecord[] | null> => {
	try {
		const res = resolver ?? createResolver();
		const resolveMx = promisify(res.resolveMx.bind(res));
		return await resolveMx(domain);
	} catch (err) {
		return null;
	}
};

export const checkForRedirect = (
	url: string,
	timeoutMs: number = DEFAULT_HTTPS_TIMEOUT_MS,
): Promise<{ redirectUrl?: string; tlsError?: boolean; timeout?: boolean }> => {
	return new Promise((resolve) => {
		const req = https
			.get(url, { timeout: timeoutMs }, (res) => {
				// Drain the response body to free up resources and prevent socket leaks
				res.resume();

				if (
					res.statusCode &&
					res.statusCode >= 300 &&
					res.statusCode < 400 &&
					res.headers.location
				) {
					// Resolve relative URLs against the request URL
					try {
						const absoluteUrl = new URL(res.headers.location, url).href;
						resolve({ redirectUrl: absoluteUrl });
					} catch {
						// If the Location header is not a valid URL, treat as non-redirect
						resolve({});
					}
				} else {
					resolve({});
				}
			})
			.on("timeout", () => {
				req.destroy();
				resolve({ timeout: true });
			})
			.on("error", (e) => {
				const isTlsError =
					e.message.includes("CERT") ||
					e.message.includes("SSL") ||
					e.message.includes("TLS") ||
					e.message.includes("certificate") ||
					e.message.includes("EPROTO");
				resolve({ tlsError: isTlsError });
			});
	});
};

export interface DnsCheckOptions {
	/** Optional DNS servers to use. If not provided, uses Google (8.8.8.8) and Cloudflare (1.1.1.1). */
	dnsServers?: string[];
}

export const runDnsChecks = async (
	domain: string,
	options?: DnsCheckOptions,
) => {
	// Create an isolated resolver - doesn't affect global DNS config
	const resolver = createResolver(options?.dnsServers);

	try {
		const [cnameResult, mxRecordResult, redirectResult] = await Promise.all([
			checkForCname(domain, resolver),
			checkForMXRecord(domain, resolver),
			checkForRedirect(`https://${domain}`),
		]);

		return {
			cnameResult,
			mxRecordResult,
			redirectResult,
		};
	} catch (e) {
		throw new Error(`Error during DNS checks: ${(e as Error).toString()}`);
	}
};
