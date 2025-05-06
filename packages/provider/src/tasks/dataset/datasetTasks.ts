import type { KeyringPair } from "@polkadot/keyring/types";
import type { Logger } from "@prosopo/common";
// Copyright 2021-2025 Prosopo (UK) Ltd.
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
	DatasetRaw,
	ProsopoCaptchaCountConfigSchemaOutput,
	ProsopoConfigOutput,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { SliderCaptchaManager } from "../sliderCaptcha/sliderTasks.js";
import { providerValidateDataset } from "./datasetTasksUtils.js";

export class DatasetManager {
	config: ProsopoConfigOutput;
	logger: Logger;
	captchaConfig: ProsopoCaptchaCountConfigSchemaOutput;
	db: IProviderDatabase;
	private sliderCaptchaManager?: SliderCaptchaManager;

	constructor(
		config: ProsopoConfigOutput,
		logger: Logger,
		captchaConfig: ProsopoCaptchaCountConfigSchemaOutput,
		db: IProviderDatabase,
		sliderCaptchaManager?: SliderCaptchaManager,
	) {
		this.config = config;
		this.logger = logger;
		this.captchaConfig = captchaConfig;
		this.db = db;
		this.sliderCaptchaManager = sliderCaptchaManager;
	}

	/**
	 * Create a slider captcha manager if needed
	 * @param pair The provider's key pair
	 * @returns A slider captcha manager instance
	 */
	private getSliderCaptchaManager(pair: KeyringPair): SliderCaptchaManager {
		if (!this.sliderCaptchaManager) {
			this.sliderCaptchaManager = new SliderCaptchaManager(
				this.db,
				pair,
				this.logger,
			);
		}
		return this.sliderCaptchaManager;
	}

	/**
	 * @description Set the provider dataset from a file
	 *
	 * @param file JSON of the captcha dataset
	 * @param pair The provider's key pair (needed for slider captcha)
	 */
	async providerSetDatasetFromFile(
		file: JSON,
		pair?: KeyringPair,
	): Promise<void> {
		const datasetRaw = parseCaptchaDataset(file);

		// Check if this is a slider captcha dataset
		if (datasetRaw.datasetType === "slider") {
			if (!pair) {
				throw new Error(
					"Provider key pair is required for loading slider captcha datasets",
				);
			}
			this.logger.info("Detected slider captcha dataset");

			// Process as a slider captcha dataset
			const sliderManager = this.getSliderCaptchaManager(pair);
			await sliderManager.loadDatasetFromJson(datasetRaw);
			return;
		}

		// Otherwise handle as a regular image captcha dataset
		this.logger.info("Processing image captcha dataset");
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
