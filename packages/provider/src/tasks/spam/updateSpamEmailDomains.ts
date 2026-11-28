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
import fs from "node:fs";
import type { Logger } from "@prosopo/logger";
import { ScheduledTaskNames, ScheduledTaskStatus } from "@prosopo/types";
import type {
	IProviderDatabase,
	StoredSpamEmailDomain,
} from "@prosopo/types-database";
import { validateDomain } from "@prosopo/util";
import { cacheFile } from "@prosopo/util/node";

import { planSpamEmailDomainSync } from "./planSpamEmailDomainSync.js";
import type { SpamEmailDomainSyncPlan } from "./planSpamEmailDomainSync.js";

const CACHE_FILE_TYPE = ".txt";

export type UpdateSpamEmailDomainsOptions = {
	blocklistUrls: string[];
	allowlistUrls: string[];
	expiryDays: number;
	dryRun?: boolean;
	cacheDir?: string;
	now?: Date;
};

const parseDomainList = (text: string): Set<string> => {
	const domains = new Set<string>();
	for (const line of text.split("\n")) {
		const domain = line.trim().toLowerCase();
		if (
			domain &&
			!domain.startsWith("#") &&
			!domain.startsWith("//") &&
			validateDomain(domain)
		) {
			domains.add(domain);
		}
	}
	return domains;
};

const downloadDomainList = async (
	url: string,
	cacheFilePrefix: `${string}-`,
	cacheDir: string,
	logger: Logger,
): Promise<Set<string>> => {
	const filePath = await cacheFile(
		cacheDir,
		url,
		logger,
		cacheFilePrefix,
		CACHE_FILE_TYPE,
	);
	return parseDomainList(fs.readFileSync(filePath, "utf-8"));
};

const summarise = (plan: SpamEmailDomainSyncPlan) => ({
	domainsBefore: plan.storedCount,
	domainsAfter: plan.countAfter,
	domainsAdded: plan.inserts.length,
	domainsUpdated: plan.updates.length,
	domainsAllowlisted: plan.allowlisted,
	domainsExpired: plan.expired,
	domainsMissing: plan.missing,
	shrunkBlocklists: plan.shrunkBlocklists,
});

export const updateSpamEmailDomains = async (
	db: IProviderDatabase,
	logger: Logger,
	{
		blocklistUrls,
		allowlistUrls,
		expiryDays,
		dryRun = false,
		cacheDir = "./spam-cache",
		now = new Date(),
	}: UpdateSpamEmailDomainsOptions,
): Promise<SpamEmailDomainSyncPlan> => {
	const taskID = dryRun
		? undefined
		: await db.createScheduledTaskStatus(
				ScheduledTaskNames.UpdateSpamEmailDomains,
				ScheduledTaskStatus.Running,
			);

	try {
		const blocklists = new Map<string, Set<string>>();
		for (const [index, url] of blocklistUrls.entries()) {
			blocklists.set(
				url,
				await downloadDomainList(
					url,
					`spam-email-domains-${index.toString()}-`,
					cacheDir,
					logger,
				),
			);
		}
		const allowlist = new Set<string>();
		for (const [index, url] of allowlistUrls.entries()) {
			const domains = await downloadDomainList(
				url,
				`spam-email-allowlist-${index.toString()}-`,
				cacheDir,
				logger,
			);
			for (const domain of domains) {
				allowlist.add(domain);
			}
		}

		const stored: StoredSpamEmailDomain[] = [];
		for await (const row of db.getAllSpamEmailDomains()) {
			stored.push(row);
		}
		const plan = planSpamEmailDomainSync({
			stored,
			blocklists,
			allowlist,
			now,
			expiryDays,
		});
		const summary = summarise(plan);

		if (plan.shrunkBlocklists.length > 0) {
			logger.warn(() => ({
				msg: "Spam email blocklist shrank sharply; skipping expiry this run",
				data: { shrunkBlocklists: plan.shrunkBlocklists },
			}));
		}

		if (taskID !== undefined) {
			await db.writeSpamEmailDomainChanges(plan);
			await db.updateScheduledTaskStatus(
				taskID,
				ScheduledTaskStatus.Completed,
				{ data: summary },
			);
		}

		logger.info(() => ({
			msg: dryRun
				? "Spam email domains dry run: no changes written."
				: "Successfully updated spam email domains.",
			data: summary,
		}));
		return plan;
	} catch (error) {
		logger.error(() => ({
			msg: "Error updating spam email domains.",
			error,
		}));

		if (taskID !== undefined) {
			await db.updateScheduledTaskStatus(taskID, ScheduledTaskStatus.Failed, {
				error: error instanceof Error ? error.message : String(error),
			});
		}

		throw error;
	}
};
