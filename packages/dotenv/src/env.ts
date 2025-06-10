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
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LogLevel, getLogger, parseLogLevel } from "@prosopo/common";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = getLogger(
	parseLogLevel(process.env.PROSOPO_LOG_LEVEL, LogLevel.enum.info),
	import.meta.url,
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
	nodeEnv?: string,
	override = false,
): string {
	const envPath = getEnvFile(
		path.resolve(rootDir || "."),
		filename,
		filePath,
		nodeEnv,
	);
	const args = { path: envPath, override };
	logger.info(() => ({
		data: { envPath },
		msg: "Loading env"
	}));
	dotenv.config(args);
	return envPath;
}

/**
 * Get the path to the .env file. Search up directories until `.env.${env}` is found.
 * If not found, look in the root directory, if specified, or 2 directories up from this file.
 * @param rootDir
 * @param filename
 * @param filepath
 * @param nodeEnv Environment override
 */
export function getEnvFile(
	rootDir?: string,
	filename = ".env",
	filepath = path.join(__dirname, "../.."),
	nodeEnv?: string,
) {
	const env = nodeEnv || getEnv();
	const fileNameFull = `${filename}.${env}`;

	let searchPath = path.resolve(rootDir || ".");

	logger.info(() => ({
		data: { "fileName": fileNameFull, "searchPath": searchPath },
		msg: "Searching"
	}));

	let levelCount = 0;

	while (!fs.existsSync(path.join(searchPath, fileNameFull))) {
		if (fs.existsSync(path.join(searchPath, "package.json"))) {
			const pkgJson = JSON.parse(
				fs.readFileSync(path.join(searchPath, "package.json"), "utf8"),
			);
			if (pkgJson.name === "@prosopo/captcha-private") {
				logger.info(() => ({
					data: { fileName: fileNameFull },
					msg: "Reached the workspace root package.json, stopping search."
				}));
				break;
			}
		}
		searchPath = path.resolve(searchPath, "..");
		levelCount += 1;
		if (levelCount > 10) {
			logger.warn(() => ({
				data: { fileName: fileNameFull, levelCount },
				msg: "Checked directories above, stopping search."
			}));
			break;
		}
	}

	const foundPath = path.join(searchPath, fileNameFull);
	return fs.existsSync(foundPath)
		? foundPath
		: path.join(rootDir || filepath, fileNameFull);
}
