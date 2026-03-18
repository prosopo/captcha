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
import { promises as dnsPromises } from "node:dns";
import * as https from "node:https";

export const checkForCname = async (
	domain: string,
): Promise<string[] | null> => {
	try {
		const addresses = await dnsPromises.resolveCname(domain);
		return addresses;
	} catch (err) {
		return null;
	}
};

export const checkForARecord = async (
	domain: string,
): Promise<string[] | null> => {
	// Try both callback and promises approaches
	return new Promise((resolve, reject) => {
		dns.resolve4(domain, (err, addresses) => {
			if (err) {
				resolve(null);
			} else {
				resolve(addresses);
			}
		});
	});
};

export const checkForRedirect = (
	url: string,
): Promise<{ domain?: string; tlsError?: boolean }> => {
	return new Promise((resolve) => {
		https
			.get(url, (res) => {
				if (
					res.statusCode &&
					res.statusCode >= 300 &&
					res.statusCode < 400 &&
					res.headers.location
				) {
					resolve({ domain: res.headers.location });
				} else {
					resolve({});
				}
			})
			.on("error", (e) => {
				console.error(`Error: ${e.message}`);
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

export const runDnsChecks = async (domain: string) => {
	// Set DNS servers to use system resolver
	dns.setServers(["127.0.0.53", "8.8.8.8", "1.1.1.1"]);

	try {
		const [cnameResult, aRecordResult, redirectResult] = await Promise.all([
			checkForCname(domain),
			checkForARecord(domain),
			checkForRedirect(`https://${domain}`),
		]);

		return {
			cnameResult,
			aRecordResult,
			redirectResult,
		};
	} catch (e) {
		throw new Error(`Error during DNS checks: ${(e as Error).toString()}`);
	}
};
