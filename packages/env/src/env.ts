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

import {
	type Logger,
	ProsopoEnvError,
	getLogger,
	parseLogLevel,
} from "@prosopo/common";
import { ProviderDatabase } from "@prosopo/database";
import { Keyring } from "@prosopo/keyring";
import type { KeyringPair } from "@prosopo/types";
import type { AssetsResolver, EnvironmentTypes } from "@prosopo/types";
import type { ProsopoConfigOutput } from "@prosopo/types";
import type { ProsopoEnvironment } from "@prosopo/types-env";
import { randomAsHex } from "@prosopo/util-crypto";

export class Environment implements ProsopoEnvironment {
	config: ProsopoConfigOutput;
	db: ProviderDatabase | undefined;
	defaultEnvironment: EnvironmentTypes;
	logger: Logger;
	assetsResolver: AssetsResolver | undefined;
	keyring: Keyring;
	pair: KeyringPair | undefined;
	authAccount: KeyringPair | undefined;
	envId: string | undefined;
	ready = false;

	constructor(
		config: ProsopoConfigOutput,
		pair?: KeyringPair,
		authAccount?: KeyringPair,
	) {
		this.config = config;
		this.defaultEnvironment = this.config.defaultEnvironment;
		this.pair = pair;
		this.authAccount = authAccount;
		this.logger = getLogger(
			parseLogLevel(this.config.logLevel),
			"ProsopoEnvironment",
		);

		this.keyring = new Keyring({
			type: "sr25519",
		});
		if (this.pair) this.keyring.addPair(this.pair);
		this.envId = randomAsHex(32).slice(0, 32);
		this.logger.info(() => ({
			msg: "Environment initialized",
			data: {
				envId: this.envId,
				defaultEnvironment: this.defaultEnvironment,
				logLevel: this.config.logLevel,
			},
		}));
	}

	async getSigner(): Promise<KeyringPair> {
		if (!this.pair) {
			throw new ProsopoEnvError("CONTRACT.SIGNER_UNDEFINED", {
				context: { failedFuncName: this.getSigner.name },
			});
		}

		try {
			this.pair = this.keyring.addPair(this.pair);
		} catch (error) {
			throw new ProsopoEnvError("CONTRACT.SIGNER_UNDEFINED", {
				context: { failedFuncName: this.getSigner.name, error },
			});
		}

		return this.pair;
	}

	getDb(): ProviderDatabase {
		if (this.db === undefined) {
			throw new ProsopoEnvError(
				new Error("db not setup! Please call isReady() first"),
			);
		}
		return this.db;
	}

	getAssetsResolver(): AssetsResolver {
		if (this.assetsResolver === undefined) {
			throw new ProsopoEnvError(
				new Error("assetsResolver not setup! Please call isReady() first"),
			);
		}
		return this.assetsResolver;
	}

	getPair(): KeyringPair {
		if (this.pair === undefined) {
			throw new ProsopoEnvError(
				new Error("pair not setup! Please call isReady() first"),
			);
		}
		return this.pair;
	}

	async isReady() {
		if (this.ready) {
			this.logger.debug(() => ({ msg: "Environment is already ready" }));
			return;
		}
		try {
			if (this.pair && this.config.account.password && this.pair.isLocked) {
				this.pair.unlock(this.config.account.password);
			}
			await this.getSigner();
			if (!this.db) {
				await this.importDatabase();
			}
			if (this.db && !this.db.connected) {
				this.logger.warn(() => ({
					msg: `Database connection is not ready (state: ${this.db?.connection?.readyState}), reconnecting...`,
				}));
				await this.db.connect();
				this.logger.info(() => ({ msg: "Connected to db" }));
			}
			this.ready = true;
		} catch (err) {
			throw new ProsopoEnvError("GENERAL.ENVIRONMENT_NOT_READY", {
				context: { error: err },
				logger: this.logger,
			});
		}
	}

	async importDatabase(): Promise<void> {
		try {
			if (this.config.database) {
				const dbConfig = this.config.database[this.defaultEnvironment];
				if (dbConfig) {
					this.db = new ProviderDatabase({
						mongo: {
							url: dbConfig.endpoint,
							dbname: dbConfig.dbname,
							authSource: dbConfig.authSource,
						},
						redis: {
							url: this.config.redisConnection.url,
							password: this.config.redisConnection.password,
						},
						logger: this.logger,
					});
					await this.db.connect();
				}
			}
		} catch (error) {
			throw new ProsopoEnvError("DATABASE.DATABASE_IMPORT_FAILED", {
				context: {
					error,
					environment: this.config.database
						? this.config.database[this.defaultEnvironment]
							? this.config.database[this.defaultEnvironment]?.type
							: undefined
						: undefined,
				},
			});
		}
	}
}
