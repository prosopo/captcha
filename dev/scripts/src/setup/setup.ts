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

import path from "node:path";
import { BN } from "@polkadot/util";
import { isAddress } from "@polkadot/util-crypto";
import { defaultConfig, getSecret } from "@prosopo/cli";
import { getEnvFile } from "@prosopo/dotenv";
import { LogLevel, ProsopoEnvError, getLogger } from "@prosopo/common";
import { generateMnemonic, getPairAsync } from "@prosopo/contract";
import { ProviderEnvironment } from "@prosopo/env";
import {
  type IDappAccount,
  type IProviderAccount,
  Payee,
} from "@prosopo/types";
import { get } from "@prosopo/util";
import fse from "fs-extra";
import { updateDemoHTMLFiles, updateEnvFiles } from "../util/index.js";
import { setupProvider } from "./provider.js";

const logger = getLogger(LogLevel.enum.info, "setup");
const __dirname = path.resolve();

// Take the root dir from the environment or assume it's the root of this package
function getRootDir() {
  const rootDir =
    process.env.PROSOPO_ROOT_DIR || path.resolve(__dirname, "../..");
  logger.info("Root dir:", rootDir);
  return rootDir;
}

function getDatasetFilePath() {
  const datasetFile =
    process.env.PROSOPO_PROVIDER_DATASET_FILE ||
    path.resolve("../data/captchas.json");
  logger.info("Dataset file:", datasetFile);
  return datasetFile;
}

function getDefaultProvider(): IProviderAccount {
  const host = process.env.PROSOPO_PROVIDER_HOST || "localhost";
  return {
    url: process.env.PROSOPO_API_PORT
      ? `http://${host}:${process.env.PROSOPO_API_PORT}`
      : `http://${host}:9229`,
    fee: 10,
    payee: Payee.dapp,
    stake: new BN(10 ** 13),
    datasetFile: getDatasetFilePath(),
    address: process.env.PROSOPO_PROVIDER_ADDRESS || "",
    secret: getSecret(),
    captchaDatasetId: "",
  };
}

function getDefaultDapp(): IDappAccount {
  return {
    secret: "//Eve",
    fundAmount: new BN(10 ** 12),
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
    logger.debug(err);
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
  logger.info(`Updating ${envFile}`);
  await fse.writeFile(envFile, readEnvFile);
}

export async function setup(force: boolean) {
  const defaultProvider = getDefaultProvider();
  const defaultDapp = getDefaultDapp();

  if (defaultProvider.secret) {
    const hasProviderAccount =
      defaultProvider.address && defaultProvider.secret;
    logger.debug("ENVIRONMENT", process.env.NODE_ENV);

    const [mnemonic, address] = !hasProviderAccount
      ? await generateMnemonic()
      : [defaultProvider.secret, defaultProvider.address];

    logger.debug(`Address: ${address}`);
    logger.debug(`Mnemonic: ${mnemonic}`);
    logger.debug("Writing .env file...");
    await copyEnvFile();

    if (!process.env.PROSOPO_SITE_KEY) {
      throw new ProsopoEnvError("DEVELOPER.PROSOPO_SITE_KEY_MISSING");
    }

    const config = defaultConfig();
    const providerSecret = config.account.secret;
    const pair = await getPairAsync(providerSecret);

    const env = new ProviderEnvironment(defaultConfig(), pair);
    await env.isReady();

    defaultProvider.secret = mnemonic;

    env.logger.info(`Registering provider... ${defaultProvider.address}`);

    defaultProvider.pair = await getPairAsync(providerSecret);

    defaultDapp.pair = await getPairAsync(defaultDapp.secret);

    await setupProvider(env, defaultProvider);

    env.logger.info(`Registering dapp... ${defaultDapp.pair.address}`);

    if (!hasProviderAccount) {
      await updateEnvFile({
        PROVIDER_MNEMONIC: `"${mnemonic}"`,
        PROVIDER_ADDRESS: address,
      });
    }
    env.logger.debug("Updating env files with PROSOPO_SITE_KEY");
    await updateDemoHTMLFiles(
      [/data-sitekey="(\w{48})"/, /siteKey:\s*'(\w{48})'/],
      defaultDapp.pair.address,
      env.logger,
    );
    await updateEnvFiles(
      ["NEXT_PUBLIC_PROSOPO_SITE_KEY", "PROSOPO_SITE_KEY"],
      defaultDapp.pair.address,
      env.logger,
    );
    process.exit();
  } else {
    console.error("no secret found in .env file");
    throw new ProsopoEnvError("GENERAL.NO_MNEMONIC_OR_SEED");
  }
}
