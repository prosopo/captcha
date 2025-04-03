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

import { getLogLevel } from "@prosopo/common";
import { loadEnv } from "@prosopo/dotenv";
import { getPairAsync } from "@prosopo/keyring";
import { ProsopoServer } from "@prosopo/server";
import {
	type EnvironmentTypes,
	EnvironmentTypesSchema,
	ProsopoServerConfigSchema,
} from "@prosopo/types";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

loadEnv();

export const getConfig = (address: string, mnemonic: string) => {
	return ProsopoServerConfigSchema.parse({
		logLevel: getLogLevel(),
		defaultEnvironment:
			<EnvironmentTypes>process.env.PROSOPO_DEFAULT_ENVIRONMENT ||
			EnvironmentTypesSchema.enum.development,
		defaultNetwork: process.env.DEFAULT_NETWORK || "rococo",
		account: {
			password: "",
			address: address,
			secret: mnemonic,
		},
		serverUrl: "https://api.prosopo.io",
		web2: false,
		solutionThreshold: 60,
		dappName: "prosopo-website",
	});
};

const main = async () => {
	console.log("argv", process.argv);
	const argv = await yargs(hideBin(process.argv))
		.option("mnemonic", {
			alias: "seed",
			type: "string",
		})
		.option("token", {
			alias: "msg",
			type: "string",
		})
		.parse();
	const mnemonic = argv.mnemonic;
	if (!mnemonic) {
		throw new Error("mnemonic is required");
	}
	const token = argv.token;
	if (!token) {
		throw new Error("token is required");
	}
	const pair = await getPairAsync(mnemonic);
	const config = getConfig(pair.address, mnemonic);
	const server = new ProsopoServer(config, pair);
	console.log(await server.isVerified(token));
};

main();
