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
import { LogLevel, ProsopoEnvError, getLogger } from "@prosopo/common";
import { getURLProtocol } from "@prosopo/util";
import { errorHandler } from "../errorHandler.js";
import { getAuth, verifyLogin } from "./auth.js";

export const nodeAPIURL = new URL("https://jetpackbridge.runonflux.io/");
const logger = getLogger(LogLevel.enum.info, "flux.lib.getDapps");

export const main = async (publicKey: string, privateKey: Uint8Array) => {
	try {
		const { signature, loginPhrase } = await getAuth(privateKey, nodeAPIURL);

		// Login to the node
		await verifyLogin(publicKey, signature, loginPhrase);
		logger.info(nodeAPIURL);
		return getDappDetails(nodeAPIURL, publicKey, signature, loginPhrase);
	} catch (e) {
		console.error(e);
		throw new ProsopoEnvError("DEVELOPER.GENERAL", {
			context: { error: e },
		});
	}
};

async function getDappDetails(
	nodeUrl: URL,
	publicKey: string,
	signature: string,
	loginPhrase: string,
) {
	const protocol = getURLProtocol(nodeAPIURL);
	const apiUrl = new URL(
		`${protocol}://${nodeUrl.host}/api/v1/dapps.php?filter=&zelid=${publicKey}&signature=${signature}&loginPhrase=${loginPhrase}`,
	);
	const response = await fetch(apiUrl);
	return await errorHandler(response);
}
