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
import type { Logger } from "@prosopo/common";
import { ScheduledTaskNames, ScheduledTaskStatus } from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { cacheFile, validateDomain } from "@prosopo/util";

const CACHE_FILE_PREFIX = "spam-email-domains";
const CACHE_FILE_TYPE = ".txt";

export const updateSpamEmailDomains = async (
	db: IProviderDatabase,
	logger: Logger,
	spamEmailDomainsUrls: string[],
	cacheDir = "./spam-cache",
): Promise<void> => {
	const taskID = await db.createScheduledTaskStatus(
		ScheduledTaskNames.UpdateSpamEmailDomains,
		ScheduledTaskStatus.Running,
	);

	try {
		const domainsSet = new Set<string>();
		for (const [index, url] of spamEmailDomainsUrls.entries()) {
			const filePath = await cacheFile(
				cacheDir,
				url,
				logger,
				`${CACHE_FILE_PREFIX}-${index.toString()}-`,
				CACHE_FILE_TYPE,
			);
			const text = fs.readFileSync(filePath, "utf-8");
			const domains = text.trim().split("\n");
			for (const domain of domains) {
				const trimmedDomain = domain.trim().toLowerCase();
				// Skip empty lines and comment lines (starting with # or //)
				if (
					trimmedDomain &&
					!trimmedDomain.startsWith("#") &&
					!trimmedDomain.startsWith("//") &&
					validateDomain(trimmedDomain)
				) {
					domainsSet.add(trimmedDomain);
				}
			}
		}

		const ops = Array.from(domainsSet).map((domain) => ({
			filter: { domain: domain.trim() },
			update: { domain: domain.trim() },
		}));
		await db.bulkUpdateSpamEmailDomains(ops, true);

		await db.updateScheduledTaskStatus(taskID, ScheduledTaskStatus.Completed, {
			data: {
				domainsProcessed: domainsSet.size,
			},
		});

		logger.info(() => ({
			msg: "Successfully updated spam email domains.",
			data: { domainsProcessed: domainsSet.size },
		}));
	} catch (error) {
		logger.error(() => ({
			msg: "Error updating spam email domains.",
			error,
		}));

		await db.updateScheduledTaskStatus(taskID, ScheduledTaskStatus.Failed, {
			error: error instanceof Error ? error.message : String(error),
		});

		throw error;
	}
};
