import type { Logger } from "@prosopo/common";
// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { parseCaptchaDataset } from "@prosopo/datasets";
import type {
	CaptchaConfig,
	DatasetRaw,
	ProsopoConfigOutput,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { providerValidateDataset } from "./datasetTasksUtils.js";

export class DatasetManager {
	config: ProsopoConfigOutput;
	logger: Logger;
	captchaConfig: CaptchaConfig;
	db: IProviderDatabase;

	constructor(
		config: ProsopoConfigOutput,
		logger: Logger,
		captchaConfig: CaptchaConfig,
		db: IProviderDatabase,
	) {
		this.config = config;
		this.logger = logger;
		this.captchaConfig = captchaConfig;
		this.db = db;
	}

	/**
	 * @description Set the provider dataset from a file
	 *
	 * @param file JSON of the captcha dataset
	 */
	async providerSetDatasetFromFile(file: JSON): Promise<void> {
		const datasetRaw = parseCaptchaDataset(file);
		return await this.providerSetDataset(datasetRaw);
	}

	async providerSetDataset(datasetRaw: DatasetRaw): Promise<void> {
		const dataset = await providerValidateDataset(
			datasetRaw,
			this.captchaConfig.solved.count,
			this.captchaConfig.unsolved.count,
		);

		await this.db?.storeDataset(dataset);
	}
}
