// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { availableNetworks } from "../networks.js";

export const defaults = {
	allowedDecodedLengths: [1, 2, 4, 8, 32, 33],
	// publicKey has prefix + 2 checksum bytes, short only prefix + 1 checksum byte
	allowedEncodedLengths: [3, 4, 6, 10, 35, 36, 37, 38],
	allowedPrefix: availableNetworks.map(({ prefix }) => prefix),
	prefix: 42,
};
