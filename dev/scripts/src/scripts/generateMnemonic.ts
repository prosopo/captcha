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

import { LogLevel, getLogger, parseLogLevel } from "@prosopo/common";
import { loadEnv } from "@prosopo/dotenv";
import { generateMnemonic } from "@prosopo/keyring";
import { updateEnvFile } from "../setup/index.js";

loadEnv();
const logger = getLogger(
	parseLogLevel(process.env.PROSOPO_LOG_LEVEL),
	import.meta.url,
);

async function mnemonic(addToEnv: boolean) {
	const [mnemonic, address] = await generateMnemonic();
	logger.info(() => ({ data: { address }, msg: "Address generated" }));
	logger.info(() => ({ data: { mnemonic }, msg: "Mnemonic generated" }));
	if (addToEnv) {
		await updateEnvFile({
			PROSOPO_PROVIDER_MNEMONIC: `"${mnemonic}"`,
			PROSOPO_PROVIDER_ADDRESS: address,
			PROSOPO_ADMIN_MNEMONIC: `"${mnemonic}"`,
			PROSOPO_ADMIN_ADDRESS: address,
		});
	}
}

mnemonic(process.argv.includes("--env"))
	.then(() => process.exit(0))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	});
