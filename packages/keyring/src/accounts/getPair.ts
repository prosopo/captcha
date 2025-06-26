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

import { hexToU8a } from "@polkadot/util/hex";
import { isHex } from "@polkadot/util/is";
import { ProsopoEnvError } from "@prosopo/common";
import type { PolkadotSecretJSON } from "@prosopo/types";
import type { KeyringPair, KeyringPair$Json } from "@prosopo/types";
import { mnemonicValidate } from "@prosopo/util-crypto";
import type { KeypairType } from "@prosopo/util-crypto";
import { Keyring } from "../keyring/keyring.js";

export function getPair(
	secret?: string | KeyringPair$Json | PolkadotSecretJSON,
	account?: string | Uint8Array,
	pairType?: KeypairType,
	ss58Format?: number,
): KeyringPair {
	pairType = pairType || "sr25519";
	ss58Format = ss58Format || 42;
	const keyring = new Keyring({ type: pairType, ss58Format });
	if (!secret && account) {
		return keyring.addFromAddress(account);
	}
	if (secret && typeof secret === "string") {
		if (mnemonicValidate(secret)) {
			return keyring.addFromMnemonic(secret);
		}
		if (isHex(secret)) {
			return keyring.addFromSeed(hexToU8a(secret));
		}
		if (secret.includes("//")) {
			return keyring.addFromUri(secret);
		}
		try {
			const json = JSON.parse(secret);
			const {
				encoding: { content },
			} = json;
			const keyring = new Keyring({ type: content[1], ss58Format });
			return keyring.addFromJson(json as KeyringPair$Json);
		} catch (e) {
			throw new ProsopoEnvError("GENERAL.NO_MNEMONIC_OR_SEED", {
				context: { error: e },
			});
		}
	} else if (typeof secret === "object") {
		return keyring.addFromJson(secret as KeyringPair$Json);
	} else {
		throw new ProsopoEnvError("GENERAL.NO_MNEMONIC_OR_SEED");
	}
}
