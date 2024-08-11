import { getLogger } from "@prosopo/common";
import { at } from "@prosopo/util";
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
import {
	FLUX_URL,
	main as authMain,
	getAuth,
	getIndividualFluxAppDetails,
	verifyLogin,
} from "./auth.js";
import { getSocketURL, getZelIdAuthHeader, prefixIPAddress } from "./url.js";

const log = getLogger("Info", "logs.js");

async function getLogs(
	zelid: string,
	signature: string,
	loginPhrase: string,
	nodeAPIURL: URL,
	appName: string,
	appComponentName: string,
	lineCount = 100,
) {
	const lineCountLocal = Math.min(lineCount, 1000);
	// https://176-9-52-22-16187.node.api.runonflux.io/apps/applog/emailTriggerSignupApi_emailTriggerServer/100
	const socketURL = getSocketURL(nodeAPIURL);
	const apiUrl = new URL(
		`/apps/applog/${appComponentName}_${appName}/${lineCountLocal}`,
		socketURL.href,
	);
	const Zelidauth = getZelIdAuthHeader(zelid, signature, loginPhrase);
	const response = await fetch(apiUrl, {
		method: "GET",
		headers: {
			Zelidauth: Zelidauth,
		},
	});
	return await response.text();
}

export const main = async (
	publicKey: string,
	privateKey: Uint8Array,
	appName: string,
	ip?: string,
	lineCount?: number,
	callbacks?: Record<string, (logs: string) => string>,
) => {
	try {
		const { signature, loginPhrase } = await getAuth(privateKey, FLUX_URL);
		const dapp = await getIndividualFluxAppDetails(
			appName,
			publicKey,
			signature,
			loginPhrase,
		);
		const appComponentName = at(dapp.components_new, 0)["Component Name"];

		let ips: URL[] = [];
		if (ip) {
			ips.push(prefixIPAddress(ip));
		} else {
			if (dapp.nodes !== undefined) {
				log.info(dapp.nodes);
				// take the fluxos urls from the dapp (these are different to the API URLs)
				ips = ips.concat(
					Object.values(dapp.nodes).map(
						(node) => new URL(prefixIPAddress(node.fluxos)),
					),
				);
			}
		}
		const logPromises: Promise<{ url: string; logs: string }>[] = ips.map(
			async (ip) => {
				// Get auth details
				const { nodeAPIURL, nodeLoginPhrase, nodeSignature } = await authMain(
					publicKey,
					privateKey,
					appName,
					ip.href,
				);

				// Login to the node
				await verifyLogin(
					publicKey,
					nodeSignature,
					nodeLoginPhrase,
					nodeAPIURL,
				);

				const logs = await getLogs(
					publicKey,
					nodeSignature,
					nodeLoginPhrase,
					nodeAPIURL,
					appName,
					appComponentName,
					lineCount,
				);

				if (!callbacks) {
					return {
						url: ip.href,
						logs,
					};
				}

				const customLogs: Record<string, string> = {};
				for (const [key, callback] of Object.entries(callbacks)) {
					customLogs[key] = callback(logs);
				}

				// Get the logs for the app
				return {
					url: ip.href,
					logs,
					...customLogs,
				};
			},
		);

		return await Promise.all(logPromises);
	} catch (error) {
		log.error("An error occurred:", error);
		process.exit(1);
	}
};
