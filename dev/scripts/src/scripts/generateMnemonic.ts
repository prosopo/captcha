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

import { LogLevel, getLogger } from "@prosopo/common";
import { generateMnemonic } from "@prosopo/account";
import { loadEnv } from "@prosopo/dotenv";
import { updateEnvFile } from "../setup/index.js";

loadEnv();
const logger = getLogger(
	process.env.PROSOPO_LOG_LEVEL || LogLevel.enum.info,
	"generateMnemonic",
);

async function mnemonic(addToEnv: boolean) {
	const [mnemonic, address] = await generateMnemonic();
	logger.info(`Address: ${address}`);
	logger.info(`Mnemonic: ${mnemonic}`);
	if (addToEnv) {
		await updateEnvFile({
			PROSOPO_PROVIDER_MNEMONIC: `"${mnemonic}"`,
			PROSOPO_PROVIDER_ADDRESS: address,
		});
	}
}

mnemonic(process.argv.includes("--env"))
	.then(() => process.exit(0))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	});
