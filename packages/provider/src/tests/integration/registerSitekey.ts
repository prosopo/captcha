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
import { ProviderDatabase } from "@prosopo/database";
import type { CaptchaType } from "@prosopo/types";
import type { ClientRecord } from "@prosopo/types-database";

export const registerSiteKey = async (
	siteKey: string,
	captchaType: CaptchaType,
): Promise<void> => {
	try {
		const username = process.env.PROSOPO_DATABASE_USERNAME || "root";
		const pw = process.env.PROSOPO_DATABASE_PASSWORD || "root";
		const host = process.env.PROSOPO_DATABASE_HOST || "localhost";
		const port = process.env.PROSOPO_DATABASE_PORT || 27017;
		const db = new ProviderDatabase({
			mongo: {
				url: `mongodb://${username}:${pw}@${host}:${port}`,
				dbname: process.env.PROSOPO_DATABASE_NAME || "prosopo",
				authSource: process.env.PROSOPO_DATABASE_AUTH_SOURCE || "admin",
			},
			redis: {
				url: process.env.REDIS_CONNECTION_URL || "redis://localhost:6379",
				password: process.env.REDIS_CONNECTION_PASSWORD || "root",
			},
		});
		await db.connect();
		console.log("Registering site key", siteKey);
		await db.updateClientRecords([
			{
				account: siteKey,
				settings: {
					captchaType: captchaType,
					domains: ["localhost", "0.0.0.0", "127.0.0.0", "example.com"],
					frictionlessThreshold: 0.5,
					powDifficulty: 4,
				},
			} as ClientRecord,
		]);
		await db.connection?.close();
	} catch (err) {
		throw new Error(`Failed to register site key: ${err}`);
	}
};
