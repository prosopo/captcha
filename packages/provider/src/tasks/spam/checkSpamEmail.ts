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

import type { Logger } from "@prosopo/common";
import type { ProsopoConfigOutput } from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { runDnsChecks } from "@prosopo/util";

/**
 * Extracts the domain from a URL or returns the input if it's already a domain
 */
function extractDomain(urlOrDomain: string): string {
	try {
		// Try to parse as URL
		const url = new URL(
			urlOrDomain.startsWith("http") ? urlOrDomain : `https://${urlOrDomain}`,
		);
		return url.hostname;
	} catch {
		// If parsing fails, assume it's already a domain
		return urlOrDomain;
	}
}
/**
 * Checks if an email domain is spam by checking against a spam list,
 * performing DNS checks, and validating IP reputation
 */
export async function checkSpamEmail(
	email: string,
	db: IProviderDatabase,
	config: ProsopoConfigOutput,
	logger: Logger,
): Promise<boolean> {
	// Trim whitespace
	const trimmedEmail = email.trim();
	if (!trimmedEmail) {
		return true; // Empty email is spam
	}
	// Extract domain from email
	let domain: string;
	if (trimmedEmail.includes("@")) {
		// Handle user@domain.com or @domain.com
		const parts = trimmedEmail.split("@");
		// Take the last part after @ (handles multiple @ signs)
		domain = parts[parts.length - 1] || "";
	} else {
		// Handle domain.com directly
		domain = trimmedEmail;
	}
	// Validate domain is not empty
	if (!domain || domain.trim() === "") {
		return true; // Invalid domain is spam
	}
	const normalizedDomain = domain.toLowerCase().trim();
	// Check if domain is in spam list
	try {
		const record = await db.getSpamEmailDomain(normalizedDomain);
		if (record !== null && record !== undefined) {
			return true;
		}
	} catch (error) {
		logger.warn(() => ({
			msg: "Failed to check spam email domain",
			error,
			email,
		}));
		return false;
	}
	// Domain not found in spam list, run DNS checks
	let dnsCheckResult: Awaited<ReturnType<typeof runDnsChecks>> | null = null;
	try {
		dnsCheckResult = await runDnsChecks(normalizedDomain, {
			dnsServers: config?.dnsServers,
		});
	} catch (error) {
		logger.warn(() => ({
			msg: "Failed to run DNS checks",
			error,
			email,
			domain: normalizedDomain,
		}));
		return false; // Allow if DNS check fails
	}
	// If TLS error detected, reject
	if (dnsCheckResult.redirectResult.tlsError) {
		logger.warn(() => ({
			msg: "Email domain has TLS error",
			email,
			domain: normalizedDomain,
		}));
		return true;
	}
	// If redirect domain found, check it in spam list
	if (dnsCheckResult.redirectResult.redirectUrl) {
		const redirectUrl = dnsCheckResult.redirectResult.redirectUrl;
		const redirectDomain = extractDomain(redirectUrl).toLowerCase().trim();
		logger.info(() => ({
			msg: "Email domain has HTTP redirect",
			email,
			domain: normalizedDomain,
			redirectDomain,
		}));
		try {
			const record = await db.getSpamEmailDomain(redirectDomain);
			if (record !== null && record !== undefined) {
				return true;
			}
		} catch (error) {
			logger.warn(() => ({
				msg: "Failed to check spam email domain for redirect",
				error,
				email,
				redirectDomain,
			}));
			return false;
		}
	}
	// If CNAME found, check it in spam list
	else if (
		dnsCheckResult.cnameResult &&
		dnsCheckResult.cnameResult.length > 0
	) {
		const firstCname = dnsCheckResult.cnameResult[0];
		if (!firstCname) {
			logger.warn(() => ({
				msg: "CNAME result array has undefined element",
				email,
				domain: normalizedDomain,
			}));
			return false;
		}
		// CNAME results may have trailing dots, remove them
		const cnameDomain = firstCname.replace(/\.$/, "").toLowerCase().trim();
		logger.info(() => ({
			msg: "Email domain has CNAME",
			email,
			domain: normalizedDomain,
			cnameDomain,
		}));
		try {
			const record = await db.getSpamEmailDomain(cnameDomain);
			if (record !== null && record !== undefined) {
				return true;
			}
		} catch (error) {
			logger.warn(() => ({
				msg: "Failed to check spam email domain for CNAME",
				error,
				email,
				cnameDomain,
			}));
			return false;
		}
	}
	// If MX record found, check the domain associated with it
	else if (
		dnsCheckResult.mxRecordResult &&
		dnsCheckResult.mxRecordResult.length > 0
	) {
		const firstMxRecord = dnsCheckResult.mxRecordResult[0];
		if (!firstMxRecord || !firstMxRecord.exchange) {
			logger.warn(() => ({
				msg: "MX record result array has undefined element or exchange",
				email,
				domain: normalizedDomain,
			}));
			return false;
		}
		// MX exchange may have trailing dots, remove them
		const mxDomain = firstMxRecord.exchange
			.replace(/\.$/, "")
			.toLowerCase()
			.trim();
		logger.info(() => ({
			msg: "Email domain has MX record",
			email,
			domain: normalizedDomain,
			mxDomain,
			priority: firstMxRecord.priority,
		}));
		try {
			const record = await db.getSpamEmailDomain(mxDomain);
			if (record !== null && record !== undefined) {
				logger.warn(() => ({
					msg: "Email domain MX record points to spam domain",
					email,
					domain: normalizedDomain,
					mxDomain,
				}));
				return true;
			}
		} catch (error) {
			logger.warn(() => ({
				msg: "Failed to check spam email domain for MX record",
				error,
				email,
				mxDomain,
			}));
			return false;
		}
	}
	// All checks passed
	return false;
}
