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
import fs from "node:fs";
import type { Server } from "node:net";
import { LogLevel, getLogger } from "@prosopo/common";
import { loadEnv } from "@prosopo/dotenv";
import { ProviderEnvironment } from "@prosopo/env";
import type { KeyringPair, ProsopoConfigOutput } from "@prosopo/types";
import type { AwaitedProcessedArgs } from "./argv.js";
import { start } from "./start.js";

const log = getLogger(LogLevel.enum.info, "CLI");

export default class ReloadingAPI {
	// biome-ignore lint/suspicious/noExplicitAny: TODO fix
	private _envWatcher: any;
	private _envPath: string;
	private _config: ProsopoConfigOutput;
	private _pair: KeyringPair;
	private _authAccount: KeyringPair;
	private _processedArgs: AwaitedProcessedArgs;
	private api: Server | undefined;
	private _restarting: boolean;
	private _env: ProviderEnvironment | undefined;

	constructor(
		envPath: string,
		config: ProsopoConfigOutput,
		pair: KeyringPair,
		authAccount: KeyringPair,
		processedArgs: AwaitedProcessedArgs,
	) {
		this._envPath = envPath;
		this._config = config;
		this._pair = pair;
		this._authAccount = authAccount;
		this._processedArgs = processedArgs;
		this._restarting = false;
	}

	get env() {
		if (!this._env) {
			throw new Error("Environment not initialized. Call start() first.");
		}

		return this._env;
	}

	public async start(reloadEnv = false) {
		log.info(() => ({ msg: "Starting API" }));

		loadEnv();
		if (!this._env || reloadEnv) {
			this._env = new ProviderEnvironment(
				this._config,
				this._pair,
				this._authAccount,
			);
		}
		await this.env.isReady();

		this.api = await start(this.env, !!this._processedArgs.adminApi);
		if (process.env.NODE_ENV === "development") {
			this._envWatcher = await this._watchEnv();
		}
	}

	public async stop() {
		log.info(() => ({ msg: "Stopping API" }));
		return new Promise((resolve) => {
			if (this.api) {
				this.api.close(resolve);
			}
		});
	}

	private async _watchEnv() {
		return fs.watch(this._envPath, async () => {
			log.info(() => ({
				data: { restarting: this._restarting },
				msg: "env file change detected. Restarting",
			}));
			if (!this._restarting) {
				this._restarting = true;
				await this.stop();
				loadEnv();
				await this.start(true);
				this._restarting = false;
			}
		});
	}
}
