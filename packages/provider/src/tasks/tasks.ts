import {
	type Logger,
	ProsopoEnvError,
	getLogger,
	parseLogLevel,
} from "@prosopo/common";
import type { KeyringPair } from "@prosopo/types";
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

	constructor(env: ProviderEnvironment, logger?: Logger) {
		this.config = env.config;
		this.db = env.getDb();
		this.captchaConfig = env.config.captchas;
		this.logger =
			logger || getLogger(parseLogLevel(env.config.logLevel), "Tasks");
		if (!env.pair) {
			throw new ProsopoEnvError("DEVELOPER.MISSING_PROVIDER_PAIR", {
				context: { failedFuncName: "Tasks.constructor" },
			});
		}
		this.pair = env.pair;

		this.powCaptchaManager = new PowCaptchaManager(
			this.db,
			this.pair,
			this.logger,
		);
		this.datasetManager = new DatasetManager(
			this.config,
			this.logger,
			this.captchaConfig,
			this.db,
		);
		this.imgCaptchaManager = new ImgCaptchaManager(
			this.db,
			this.pair,
			this.config,
			this.logger,
		);
		this.clientTaskManager = new ClientTaskManager(
			this.config,
			this.logger,
			this.db,
		);
		this.frictionlessManager = new FrictionlessManager(
			this.db,
			this.pair,
			this.config,
			this.logger,
		);
	}

	setLogger(logger: Logger): void {
		// Use a logger from the request
		this.logger = logger;
		this.powCaptchaManager.logger = logger;
		this.datasetManager.logger = logger;
		this.imgCaptchaManager.logger = logger;
		this.clientTaskManager.logger = logger;
		this.frictionlessManager.logger = logger;
		this.db.logger = logger; // Ensure the database also uses the new logger
	}
}
