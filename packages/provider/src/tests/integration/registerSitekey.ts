import { ProviderDatabase } from "@prosopo/database";
import type { ClientRecord } from "@prosopo/types-database";

export const registerSiteKey = async (siteKey: string): Promise<void> => {
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
	await db.updateClientRecords([
		{
			account: siteKey,
		} as ClientRecord,
	]);
	await db.connection?.close();
};
