// Copyright 2017-2025 @polkadot/keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { KeyringPair$Json, KeyringPair$Meta } from "@prosopo/types";
import type { KeypairType } from "@prosopo/util-crypto";

import { objectSpread } from "@polkadot/util";
import { jsonEncryptFormat } from "@prosopo/util-crypto";

interface PairStateJson {
	address: string;
	meta: KeyringPair$Meta;
}

export function pairToJson(
	type: KeypairType,
	{ address, meta }: PairStateJson,
	encoded: Uint8Array,
	isEncrypted: boolean,
): KeyringPair$Json {
	return objectSpread(
		jsonEncryptFormat(encoded, ["pkcs8", type], isEncrypted),
		{
			address,
			meta,
		},
	);
}
