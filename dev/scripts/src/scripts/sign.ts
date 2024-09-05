import { stringToU8a, u8aToHex } from "@polkadot/util";
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
import type { KeypairType } from "@polkadot/util-crypto/types";
import { getPairAsync } from "@prosopo/contract";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const main = async () => {
	console.log("argv", process.argv);
	const argv = await yargs(hideBin(process.argv))
		.option("mnemonic", {
			alias: "seed",
			type: "string",
		})
		.option("message", {
			alias: "msg",
			type: "string",
		})
		.option("type", {
			type: "string",
			choices: ["sr25519", "ed25519", "ecdsa", "ethereum"],
			default: "sr25519",
		})
		.option("ss58Format", {
			type: "number",
			default: 42,
		})
		.parse();
	const mnemonic = argv.mnemonic;
	if (!mnemonic) {
		throw new Error("mnemonic is required");
	}
	const message = argv.message;
	if (!message) {
		throw new Error("message is required");
	}
	const type = argv.type as KeypairType;
	const ss58Format = argv.ss58Format;

	const keypair = await getPairAsync(mnemonic, undefined, type, ss58Format);

	const sig = keypair.sign(stringToU8a(message));
	console.log(`hex sig: ${u8aToHex(sig)}`);
};

main();
