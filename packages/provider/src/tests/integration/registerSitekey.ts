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
import { ProviderDatabase } from "@prosopo/database";
import type { ClientRecord } from "@prosopo/types-database";

export const registerSiteKey = async (siteKey: string): Promise<void> => {
	try {
		const username = process.env.PROSOPO_DATABASE_USERNAME || "root";
		const pw = process.env.PROSOPO_DATABASE_PASSWORD || "root";
		const host = process.env.PROSOPO_DATABASE_HOST || "localhost";
		const port = process.env.PROSOPO_DATABASE_PORT || 27017;
		const db = new ProviderDatabase(
			`mongodb://${username}:${pw}@${host}:${port}`,
			process.env.PROSOPO_DATABASE_NAME || "prosopo",
			process.env.PROSOPO_DATABASE_AUTH_SOURCE || "admin",
		);
		await db.connect();
		console.log("Registering site key", siteKey);
		await db.updateClientRecords([
			{
				account: siteKey,
				settings: {
					captchaType: "pow",
					domains: ["example.com"],
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
