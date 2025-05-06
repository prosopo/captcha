import { existsSync } from "node:fs";
import { join } from "node:path";
import type { KeyringPair } from "@polkadot/keyring/types";
import { type Logger, ProsopoEnvError, getLogger } from "@prosopo/common";
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
import type {
	ProsopoCaptchaCountConfigSchemaOutput,
	ProsopoConfigOutput,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { ClientTaskManager } from "./client/clientTasks.js";
import { DatasetManager } from "./dataset/datasetTasks.js";
import { FrictionlessManager } from "./frictionless/frictionlessTasks.js";
import { ImgCaptchaManager } from "./imgCaptcha/imgCaptchaTasks.js";
import { PowCaptchaManager } from "./powCaptcha/powTasks.js";
import { SliderCaptchaManager } from "./sliderCaptcha/sliderTasks.js";

/**
 * @description Tasks that are shared by the API and CLI
 */
export class Tasks {
	db: IProviderDatabase;
	captchaConfig: ProsopoCaptchaCountConfigSchemaOutput;
	logger: Logger;
	config: ProsopoConfigOutput;
	pair: KeyringPair;
	powCaptchaManager: PowCaptchaManager;
	datasetManager: DatasetManager;
	imgCaptchaManager: ImgCaptchaManager;
	clientTaskManager: ClientTaskManager;
	frictionlessManager: FrictionlessManager;
	sliderCaptchaManager: SliderCaptchaManager;
	clientManager: ClientTaskManager;

	constructor(env: ProviderEnvironment) {
		this.config = env.config;
		this.db = env.getDb();
		this.captchaConfig = env.config.captchas;
		this.logger = getLogger(env.config.logLevel, "Tasks");
		if (!env.pair) {
			throw new ProsopoEnvError("DEVELOPER.MISSING_PROVIDER_PAIR", {
				context: { error: "No account was set" },
			});
		}
		this.pair = env.pair;

		// Create basic managers first
		this.frictionlessManager = new FrictionlessManager(
			this.db,
			this.pair,
			this.config,
			this.logger,
		);

		this.powCaptchaManager = new PowCaptchaManager(
			this.db,
			this.pair,
			this.logger,
		);

		this.clientTaskManager = new ClientTaskManager(
			this.config,
			this.logger,
			this.db,
		);

		// ClientManager is an alias of ClientTaskManager
		this.clientManager = this.clientTaskManager;

		// Create captcha-related managers
		this.imgCaptchaManager = new ImgCaptchaManager(
			this.db,
			this.pair,
			this.config,
			this.logger,
		);

		// Define paths for the slider captcha datasets
		const sliderDatasetPath = join(process.cwd(), "assets/slider-datasets");
		const sliderAssetPath = "/assets/slider-datasets";

		this.logger.info("Initializing SliderCaptchaManager", {
			sliderDatasetPath,
			sliderAssetPath,
		});

		// Initialize SliderCaptchaManager without requiring config flag
		// It will automatically detect available datasets in both database and filesystem
		this.sliderCaptchaManager = new SliderCaptchaManager(
			this.db,
			this.pair,
			this.logger,
			{
				datasetPath: sliderDatasetPath,
				assetPath: sliderAssetPath,
			},
		);

		// Initialize the DatasetManager with the SliderCaptchaManager instance
		// This allows the DatasetManager to handle slider captcha datasets
		this.datasetManager = new DatasetManager(
			this.config,
			this.logger,
			this.captchaConfig,
			this.db,
			this.sliderCaptchaManager,
		);
	}
}
