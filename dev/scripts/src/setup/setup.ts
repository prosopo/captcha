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

import path from "node:path";
import { defaultConfig, getSecret } from "@prosopo/cli";
import { LogLevel, ProsopoEnvError, getLogger } from "@prosopo/common";
import { getEnvFile } from "@prosopo/dotenv";
import { ProviderEnvironment } from "@prosopo/env";
import {
	generateMnemonic,
	getDefaultSiteKeys,
	getPair,
} from "@prosopo/keyring";
import type { IProviderAccount } from "@prosopo/types";
import { get } from "@prosopo/util";
import fse from "fs-extra";
import { updateDemoHTMLFiles, updateEnvFiles } from "../util/index.js";
import { setupProvider } from "./provider.js";
import { registerSiteKey } from "./site.js";

const logger = getLogger({ scope: "dev.scripts.setup", url: import.meta.url });
const __dirname = path.resolve();

// Take the root dir from the environment or assume it's the root of this package
function getRootDir() {
	const rootDir =
		process.env.PROSOPO_ROOT_DIR || path.resolve(__dirname, "../..");
	logger.info(() => ({ msg: "Root dir:", data: { rootDir } }));
	return rootDir;
}

function getDatasetFilePath() {
	const datasetFile =
		process.env.PROSOPO_PROVIDER_DATASET_FILE ||
		path.resolve("../data/captchas.json");
	logger.info(() => ({ msg: "Dataset file:", data: { datasetFile } }));
	return datasetFile;
}

function getDefaultProvider(): IProviderAccount {
	const host = process.env.PROSOPO_PROVIDER_HOST || "localhost";
	return {
		url: process.env.PROSOPO_API_PORT
			? `http://${host}:${process.env.PROSOPO_API_PORT}`
			: `http://${host}:9229`,
		datasetFile: getDatasetFilePath(),
		address: process.env.PROSOPO_PROVIDER_ADDRESS || "",
		secret: getSecret(),
		captchaDatasetId: "",
		pair: getPair(getSecret()),
	};
}

async function copyEnvFile() {
	try {
		const rootDir = getRootDir();
		// TODO move all env files to a single template location
		const tplLocation = path.resolve(rootDir, "./dev/scripts");
		const tplEnvFile = getEnvFile(tplLocation, "env");
		const envFile = getEnvFile(tplLocation, ".env");
		await fse.copy(tplEnvFile, envFile, { overwrite: false });
	} catch (err) {
		logger.debug(() => ({ msg: "Error copying env file", err }));
	}
}

function updateEnvFileVar(source: string, name: string, value: string) {
	const envVar = new RegExp(`.*(${name}=)(.*)`, "g");
	if (envVar.test(source)) {
		return source.replace(envVar, `$1${value}`);
	}
	return `${source}\n${name}=${value}`;
}

export async function updateEnvFile(vars: Record<string, string>) {
	const rootDir = getRootDir();
	const envFile = getEnvFile(rootDir, ".env");

	let readEnvFile = await fse.readFile(envFile, "utf8");

	for (const key in vars) {
		readEnvFile = updateEnvFileVar(readEnvFile, key, get(vars, key));
	}
	logger.info(() => ({ msg: `Updating ${envFile}` }));
	await fse.writeFile(envFile, readEnvFile);
}

export async function setup(provider: boolean, sites: boolean) {
	if (!provider && !sites) {
		logger.info(() => ({ msg: "No setup required, exiting." }));
		process.exit(0);
	}

	const defaultProvider = getDefaultProvider();

	if (defaultProvider.secret) {
		const hasProviderAccount =
			defaultProvider.address && defaultProvider.secret;
		logger.debug(() => ({
			msg: "ENVIRONMENT",
			data: { nodeEnv: process.env.NODE_ENV },
		}));

		const [mnemonic, address] = !hasProviderAccount
			? await generateMnemonic()
			: [defaultProvider.secret, defaultProvider.address];

		logger.debug(() => ({ msg: `Address: ${address}` }));
		logger.debug(() => ({ msg: `Mnemonic: ${mnemonic}` }));
		logger.debug(() => ({ msg: "Writing .env file..." }));
		await copyEnvFile();

		if (!process.env.PROSOPO_SITE_KEY) {
			throw new ProsopoEnvError("DEVELOPER.PROSOPO_SITE_KEY_MISSING");
		}

		const config = defaultConfig();
		const providerSecret = config.account.secret;
		const pair = getPair(providerSecret);
		const authAccount = getPair(config.authAccount.secret);

		const env = new ProviderEnvironment(config, pair, authAccount);
		await env.isReady();

		defaultProvider.secret = mnemonic;

		env.logger.info(() => ({
			msg: `Registering provider... ${defaultProvider.address}`,
		}));

		defaultProvider.pair = getPair(providerSecret);
		if (provider) {
			await setupProvider(env);

			if (!hasProviderAccount) {
				await updateEnvFile({
					PROVIDER_MNEMONIC: `"${mnemonic}"`,
					PROVIDER_ADDRESS: address,
				});
			}
		}
		if (sites) {
			for (const siteKey of getDefaultSiteKeys()) {
				siteKey.pair = getPair(siteKey.secret);

				env.logger.info(() => ({
					msg: `Registering ${siteKey.secret} siteKey ... ${siteKey.pair?.address}`,
				}));

				await registerSiteKey(env, siteKey.pair.address, siteKey.settings);

				env.logger.debug(() => ({
					msg: "Updating env files with PROSOPO_SITE_KEY",
				}));
				await updateDemoHTMLFiles(
					[/data-sitekey="(\w{48})"/, /siteKey:\s*'(\w{48})'/],
					siteKey.pair.address,
					env.logger,
				);

				const envVarNames =
					siteKey.settings.captchaType === "image"
						? [
							"PROSOPO_SITE_KEY",
							`PROSOPO_SITE_KEY_${siteKey.settings.captchaType.toUpperCase()}`,
						]
						: [
							`PROSOPO_SITE_KEY_${siteKey.settings.captchaType.toUpperCase()}`,
						];

				await updateEnvFiles(envVarNames, siteKey.pair.address, env.logger);
			}
		}
		process.exit();
	} else {
		console.error("no secret found in .env file");
		throw new ProsopoEnvError("GENERAL.NO_MNEMONIC_OR_SEED");
	}
}
