// Copyright 2017-2025 @polkadot/keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type {
	KeyringPair,
	KeyringPair$Json,
	KeyringPair$Meta,
} from "@prosopo/types";

// empty publicKey
const publicKey = new Uint8Array(32);

// pre-computed via encodeAddress(publicKey)
const address = "5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM";

const meta = {
	isTesting: true,
	name: "nobody",
};

const json: KeyringPair$Json = {
	address,
	encoded: "",
	encoding: {
		content: ["pkcs8", "ed25519"],
		type: "none",
		version: "0",
	},
	meta,
};

const pair: KeyringPair = {
	address,
	addressRaw: publicKey,
	decodePkcs8: (_passphrase?: string, _encoded?: Uint8Array): void => undefined,
	derive: (_suri: string, _meta?: KeyringPair$Meta): KeyringPair => pair,
	encodePkcs8: (_passphrase?: string): Uint8Array => new Uint8Array(0),
	isLocked: true,
	lock: (): void => {
		// no locking, it is always locked
	},
	meta,
	publicKey,
	setMeta: (_meta: KeyringPair$Meta): void => undefined,
	sign: (_message: Uint8Array): Uint8Array => new Uint8Array(64),
	toJson: (_passphrase?: string): KeyringPair$Json => json,
	type: "sr25519",
	unlock: (_passphrase?: string): void => undefined,
	verify: (_message: Uint8Array, _signature: Uint8Array): boolean => false,
	vrfSign: (
		_message: Uint8Array,
		_context?: string | Uint8Array,
		_extra?: string | Uint8Array,
	): Uint8Array => new Uint8Array(96),
	vrfVerify: (
		_message: Uint8Array,
		_vrfResult: Uint8Array,
		_context?: string | Uint8Array,
		_extra?: string | Uint8Array,
	): boolean => false,
};

export function nobody(): KeyringPair {
	return pair;
}
