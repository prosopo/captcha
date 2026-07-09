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

import { ProsopoEnvError } from "@prosopo/common";
import { ProviderDatabase } from "@prosopo/database";
import { IpInfoService } from "@prosopo/ipinfo";
import { Keyring, getPair } from "@prosopo/keyring";
import { type Logger, getLogger, parseLogLevel } from "@prosopo/logger";
import type { KeyringPair } from "@prosopo/types";
import type { AssetsResolver, EnvironmentTypes } from "@prosopo/types";
import type { ProsopoConfigOutput } from "@prosopo/types";
import type { IIpInfoService, ProsopoEnvironment } from "@prosopo/types-env";
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
	ipInfoService: IIpInfoService;
	ready = false;
	datasetId: string | undefined;

	constructor(
		config: ProsopoConfigOutput,
		pair?: KeyringPair,
		authAccount?: KeyringPair,
	) {
		this.config = config;
		this.defaultEnvironment = this.config.defaultEnvironment;
		this.pair = pair || getPair(config.account.secret);
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

		// Initialize IpInfoService
		this.ipInfoService = new IpInfoService({
			maxmindCityDbPath:
				this.config.maxmindCityDbPath ?? this.config.maxmindDbPath,
			maxmindAsnDbPath: this.config.maxmindAsnDbPath,
			ipapiUrl: this.config.ipApi?.baseUrl,
			ipapiKey: this.config.ipApi?.apiKey,
			logger: this.logger,
		});

		this.logger.info(() => ({
			msg: "Environment initialized",
			data: {
				envId: this.envId,
				defaultEnvironment: this.defaultEnvironment,
				logLevel: this.config.logLevel,
				maxmindDbPath: this.config.maxmindDbPath || "not configured",
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

			const maintenanceMode = isMaintenanceMode();

			// In maintenance mode the captcha request path is kept DB-free (the
			// handlers short-circuit before touching the DB), but the admin
			// endpoints — access rules, detector keys, site keys, decision
			// machines — still need a DB. So we create the DB handle and connect
			// in the BACKGROUND: env.getDb() returns a usable handle (admin
			// routes register and keep working), while a slow or unavailable
			// Mongo/Redis socket still can't gate boot because we never await
			// the connection here.
			if (maintenanceMode) {
				this.logger.warn(() => ({
					msg: "MAINTENANCE_MODE=true — connecting to DB in the background so admin endpoints stay available; captcha path short-circuits",
				}));
				if (!this.db) {
					this.connectDatabaseInBackground();
				}
			} else if (!this.db) {
				await this.importDatabase();
			} else if (this.db && !this.db.connected) {
				this.logger.warn(() => ({
					msg: `Database connection is not ready (state: ${this.db?.connection?.readyState}), reconnecting...`,
				}));
				await this.db.connect();
				this.logger.info(() => ({ msg: "Connected to db" }));
			}
			// Resolve the default datasetId from the DB. Clients no longer
			// send one — providers pick from this fallback for image challenges.
			// Skip in maintenance mode: the connection is still settling in the
			// background and this is a DB read we don't want to gate boot on.
			if (!maintenanceMode && this.db && !this.datasetId) {
				try {
					this.datasetId = await this.db.getMostRecentDatasetId();
					if (this.datasetId) {
						this.logger.info(() => ({
							msg: "Default dataset ID set",
							data: { datasetId: this.datasetId },
						}));
					} else {
						this.logger.warn(() => ({
							msg: "No datasets found in database. Image captchas will not work until a dataset is uploaded.",
						}));
					}
				} catch (err) {
					this.logger.warn(() => ({
						msg: "Failed to get most recent dataset ID",
						data: { error: err },
					}));
				}
			}
			// Initialize IP info service (MaxMind + optional ipapi.is)
			await this.ipInfoService.initialize();
			this.ready = true;
		} catch (err) {
			throw new ProsopoEnvError("GENERAL.ENVIRONMENT_NOT_READY", {
				context: { error: err },
				logger: this.logger,
			});
		}
	}

	// Build the ProviderDatabase handle from config WITHOUT connecting. Returns
	// undefined when no database is configured for the current environment.
	buildDatabase(): ProviderDatabase | undefined {
		if (!this.config.database) {
			return undefined;
		}
		const dbConfig = this.config.database[this.defaultEnvironment];
		if (!dbConfig) {
			return undefined;
		}
		return new ProviderDatabase({
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
	}

	async importDatabase(): Promise<void> {
		try {
			const db = this.buildDatabase();
			if (db) {
				this.db = db;
				await this.db.connect();
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

	// Create the DB handle and kick off the connection WITHOUT awaiting it, so
	// startup is never gated on the DB socket. Used in maintenance mode: the
	// captcha request path never touches the DB (it short-circuits), but the
	// admin endpoints do, so the handle must exist. A failed connection is
	// logged rather than thrown — admin queries will surface the error (or
	// succeed once the socket recovers) when they actually run.
	connectDatabaseInBackground(): void {
		try {
			const db = this.buildDatabase();
			if (!db) {
				return;
			}
			this.db = db;
			db.connect().catch((error: unknown) => {
				this.logger.warn(() => ({
					msg: "Background DB connection failed in maintenance mode; admin endpoints will retry on demand",
					data: { error },
				}));
			});
		} catch (error) {
			this.logger.warn(() => ({
				msg: "Failed to create DB handle in maintenance mode; admin endpoints will be unavailable until restart",
				data: { error },
			}));
		}
	}
}

// Read directly from process.env to avoid a cyclic dep on the provider
// package (which owns the runtime toggle endpoint). Same env var name.
export const isMaintenanceMode = (): boolean =>
	process.env.MAINTENANCE_MODE?.toLowerCase() === "true";
