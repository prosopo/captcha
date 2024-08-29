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

import type { ApiPromise } from "@polkadot/api/promise/Api";
import { Keyring } from "@polkadot/keyring";
import type { KeyringPair, KeyringPair$Json } from "@polkadot/keyring/types";
import type { AccountId } from "@polkadot/types/interfaces";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { mnemonicValidate } from "@polkadot/util-crypto/mnemonic";
import type { KeypairType } from "@polkadot/util-crypto/types";
import { hexToU8a } from "@polkadot/util/hex";
import { isHex } from "@polkadot/util/is";
import { ProsopoEnvError } from "@prosopo/common";
import {
  NetworkPairTypeSchema,
  type PolkadotSecretJSON,
} from "@prosopo/types";

export async function getPairAsync(
  secret?: string | KeyringPair$Json | PolkadotSecretJSON,
  account?: string | Uint8Array,
  pairType?: KeypairType,
  ss58Format?: number,
): Promise<KeyringPair> {
  await cryptoWaitReady();
  return getPair(secret, account, pairType, ss58Format);
}

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
    if (secret.startsWith("//")) {
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

export function getReadOnlyPair(
  api: ApiPromise,
  userAccount?: string,
): KeyringPair {
  // 5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM is the all zero address
  return getPair(
    undefined,
    userAccount || getZeroAddress(api).toHex(),
    NetworkPairTypeSchema.parse("sr25519"),
    api.registry.chainSS58,
  );
}

export function getZeroAddress(api: ApiPromise): AccountId {
  return api.registry.createType(
    "AccountId",
    new Uint8Array(new Array(32).fill(0)),
  );
}
