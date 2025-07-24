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
import { generateMnemonic, getPair } from "@prosopo/keyring";

const main = async () => {
	const mnemonic = process.argv[2];
	if (!mnemonic) {
		throw new Error("Mnemonic is required");
	}
	const res = getPair(mnemonic);
	console.log(res.address);
};

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
