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

import { ProsopoError } from "@prosopo/common";
import { getLogger } from "@prosopo/logger";
import { CaptchaTypes, type DatasetBase } from "@prosopo/types";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveSiteDatasetId } from "../../../../api/captcha/imageDataset.js";

declare module "@prosopo/common" {
	interface ErrorSites {
		"DBSE-17": true;
	}
}

const DEFAULT_DATASET = `0x${"aa".repeat(32)}`;
const DEMO_DATASET = `0x${"bb".repeat(32)}`;
const ABSENT_DATASET = `0x${"cc".repeat(32)}`;
const SITE_KEY = "site-key";

const logger = getLogger("fatal", "imageDataset.test");

let getDatasetDetails: Mock<(datasetId: string) => Promise<DatasetBase>>;

beforeEach(() => {
	getDatasetDetails = vi.fn(async (datasetId: string): Promise<DatasetBase> => {
		if (datasetId === DEFAULT_DATASET || datasetId === DEMO_DATASET) {
			return { datasetId, format: CaptchaTypes.SelectAll };
		}
		throw new ProsopoError({
			code: "RECORD_NOT_FOUND",
			errorSite: "DBSE-17",
			context: { datasetId },
		});
	});
});

const resolve = (
	siteDatasetId: string | undefined,
): Promise<string | number[]> =>
	resolveSiteDatasetId({
		db: { getDatasetDetails },
		siteDatasetId,
		defaultDatasetId: DEFAULT_DATASET,
		siteKey: SITE_KEY,
		logger,
	});

describe("resolveSiteDatasetId", () => {
	it("serves the default when the site key names no dataset", async () => {
		expect(await resolve(undefined)).toBe(DEFAULT_DATASET);
		expect(getDatasetDetails).not.toHaveBeenCalled();
	});

	it("serves the default when the site key's dataset is cleared", async () => {
		expect(await resolve("")).toBe(DEFAULT_DATASET);
		expect(getDatasetDetails).not.toHaveBeenCalled();
	});

	it("does not look up a site dataset that is the default", async () => {
		expect(await resolve(DEFAULT_DATASET)).toBe(DEFAULT_DATASET);
		expect(getDatasetDetails).not.toHaveBeenCalled();
	});

	it("serves the site key's dataset when this provider holds it", async () => {
		expect(await resolve(DEMO_DATASET)).toBe(DEMO_DATASET);
		expect(getDatasetDetails).toHaveBeenCalledWith(DEMO_DATASET);
	});

	it("falls back to the default when this provider lacks the site key's dataset", async () => {
		expect(await resolve(ABSENT_DATASET)).toBe(DEFAULT_DATASET);
	});

	it("still surfaces a database fault", async () => {
		getDatasetDetails.mockRejectedValueOnce(new Error("connection reset"));
		await expect(resolve(DEMO_DATASET)).rejects.toThrow("connection reset");
	});
});
