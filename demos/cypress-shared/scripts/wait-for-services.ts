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

import https from "node:https";

interface Service {
	name: string;
	url: string;
}

const services: Service[] = [
	{ name: "Admin API", url: "https://localhost:9229/healthz" },
	{ name: "Bundle Server", url: "https://localhost:9269/procaptcha.bundle.js" },
	{ name: "Client Bundle", url: "https://localhost:9232" },
	{ name: "Example Server", url: "https://localhost:9228/health" },
];

async function checkService(url: string): Promise<boolean> {
	return new Promise((resolve) => {
		const req = https.get(url, { rejectUnauthorized: false }, (res) => {
			resolve(res.statusCode === 200 || res.statusCode === 304);
		});
		req.on("error", () => resolve(false));
		req.setTimeout(2000, () => {
			req.destroy();
			resolve(false);
		});
	});
}

async function waitForServices(maxWait = 120000): Promise<void> {
	const startTime = Date.now();
	console.log("🔍 Waiting for services to be ready...\n");

	while (Date.now() - startTime < maxWait) {
		const results = await Promise.all(
			services.map(async (service) => ({
				...service,
				ready: await checkService(service.url),
			})),
		);

		const allReady = results.every((r) => r.ready);

		// Clear console and show status
		process.stdout.write("\x1Bc");
		console.log("🔍 Service Status:\n");
		for (const result of results) {
			const icon = result.ready ? "✅" : "⏳";
			console.log(`${icon} ${result.name} - ${result.url}`);
		}

		if (allReady) {
			console.log("\n✅ All services are ready!");
			return;
		}

		const elapsed = Math.floor((Date.now() - startTime) / 1000);
		console.log(`\n⏱️  Elapsed: ${elapsed}s / ${maxWait / 1000}s`);

		await new Promise((resolve) => setTimeout(resolve, 2000));
	}

	throw new Error("❌ Services did not become ready in time");
}

waitForServices().catch((error) => {
	console.error(error);
	process.exit(1);
});
