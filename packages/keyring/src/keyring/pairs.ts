// Copyright 2017-2025 @polkadot/keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { isHex, isU8a, u8aToU8a } from "@polkadot/util";
import type { KeyringPair, KeyringPairs } from "@prosopo/types";

import { u8aToHex } from "@prosopo/util";
import { decodeAddress } from "@prosopo/util-crypto";

type KeyringPairMap = Record<string, KeyringPair>;

export class Pairs implements KeyringPairs {
	readonly #map: KeyringPairMap = {};

	public add(pair: KeyringPair): KeyringPair {
		this.#map[decodeAddress(pair.address).toString()] = pair;

		return pair;
	}

	public all(): KeyringPair[] {
		return Object.values(this.#map);
	}

	public get(address: string | Uint8Array): KeyringPair {
		const pair = this.#map[decodeAddress(address).toString()];

		if (!pair) {
			throw new Error(
				`Unable to retrieve keypair '${
					isU8a(address) || isHex(address)
						? u8aToHex(u8aToU8a(address))
						: address
				}'`,
			);
		}

		return pair;
	}

	public remove(address: string | Uint8Array): void {
		delete this.#map[decodeAddress(address).toString()];
	}
}
