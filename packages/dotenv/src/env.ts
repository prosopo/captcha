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
import { fileURLToPath } from "node:url";
import { LogLevel, getLogger } from "@prosopo/common";
import dotenv from "dotenv";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = getLogger(
  process.env.PROSOPO_LOG_LEVEL || LogLevel.enum.info,
  "env",
);

export function getEnv() {
  if (process.env.NODE_ENV) {
    return process.env.NODE_ENV.replace(/\W/g, "");
  }
  return "development";
}

export function loadEnv(
  rootDir?: string,
  filename?: string,
  filePath?: string,
): string {
  const envPath = getEnvFile(path.resolve(rootDir || "."), filename, filePath);
  const args = { path: envPath };
  logger.info(`Loading env from ${envPath}`);
  dotenv.config(args);
  return envPath;
}

/**
 * Get the path to the .env file. Search up directories until `.env.${env}` is found.
 * If not found, look in the root directory, if specified, or 2 directories up from this file.
 * @param rootDir
 * @param filename
 * @param filepath
 */
export function getEnvFile(
  rootDir?: string,
  filename = ".env",
  filepath = path.join(__dirname, "../.."),
) {
  const env = getEnv();
  const fileNameFull = `${filename}.${env}`;

  let searchPath = path.resolve(rootDir || ".");

  logger.info(`Searching for ${fileNameFull} in ${searchPath}`);

  while (!fs.existsSync(path.join(searchPath, fileNameFull))) {
    if (fs.existsSync(path.join(searchPath, "package.json"))) {
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(searchPath, "package.json"), "utf8"),
      );
      if (pkgJson.workspaces) {
        logger.info(
          `Found workspaces in package.json, stopping search for ${fileNameFull}.`,
        );
        break;
      }
    }
    searchPath = path.resolve(searchPath, "..");
  }

  const foundPath = path.join(searchPath, fileNameFull);
  return fs.existsSync(foundPath)
    ? foundPath
    : path.join(rootDir || filepath, fileNameFull);
}
