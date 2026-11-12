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

import { isHex } from "@polkadot/util/is";
import { isProsopoError } from "@prosopo/common";
import type { Logger } from "@prosopo/logger";
import type { IProviderDatabase } from "@prosopo/types-database";

type DatasetLookup = Pick<IProviderDatabase, "getDatasetDetails">;

// A datasetId that is not a stored dataset is a normal outcome, not a server
// fault. Any other lookup failure (e.g. the database being down) is rethrown
// so it still surfaces as a 500.
export const isStoredDataset = async (
	db: DatasetLookup,
	datasetId: string | number[],
): Promise<boolean> => {
	if (typeof datasetId !== "string" || !isHex(datasetId)) {
		return false;
	}
	try {
		await db.getDatasetDetails(datasetId);
		return true;
	} catch (err) {
		if (isProsopoError(err, "RECORD_NOT_FOUND")) {
			return false;
		}
		throw err;
	}
};

// Every pronode behind DNS has to hold a site key's dataset for that key to be
// served it. One that does not yet serves the provider default instead of
// failing the challenge, so a dataset can be rolled out a node at a time.
export const resolveSiteDatasetId = async ({
	db,
	siteDatasetId,
	defaultDatasetId,
	siteKey,
	logger,
}: {
	db: DatasetLookup;
	siteDatasetId: string | undefined;
	defaultDatasetId: string | number[];
	siteKey: string;
	logger: Logger;
}): Promise<string | number[]> => {
	if (!siteDatasetId || siteDatasetId === defaultDatasetId) {
		return defaultDatasetId;
	}
	if (await isStoredDataset(db, siteDatasetId)) {
		return siteDatasetId;
	}
	logger.warn(() => ({
		msg: "Site key dataset is not stored on this provider, serving the default",
		data: { siteKey, siteDatasetId, defaultDatasetId },
	}));
	return defaultDatasetId;
};
