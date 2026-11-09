// Copyright 2021-2026 Prosopo (UK) Ltd.
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

import {
	createCipheriv,
	createHash,
	createHmac,
	randomBytes,
} from "node:crypto";
import { type IPAddress, PUZZLE_KEY_HEADER } from "@prosopo/types";
import { getIPAddress } from "@prosopo/util";
import type { Response } from "express";
import { subscriberNetwork } from "../../util.js";

/**
 * Per-process: the widget fetches its key and its puzzle from the same
 * provider seconds apart, and a key orphaned by a restart is recovered by the
 * widget re-running frictionless.
 */
const PROCESS_SECRET = randomBytes(32);

/** Key for the subscriber network `address` belongs to. */
export const networkPuzzleKey = (
	address: IPAddress,
	secret: Buffer = PROCESS_SECRET,
): Buffer =>
	createHmac("sha256", secret)
		.update("procaptcha-puzzle-network\0")
		.update(subscriberNetwork(address))
		.digest();

/** Hand the caller the key for its network. Unparseable addresses get none. */
export const attachPuzzleKey = (
	res: Pick<Response, "setHeader">,
	ip: string,
): void => {
	let address: IPAddress;
	try {
		address = getIPAddress(ip);
	} catch {
		return;
	}
	res.setHeader(PUZZLE_KEY_HEADER, networkPuzzleKey(address).toString("hex"));
};

export interface ScrambledPieceMask {
	/** Base64. */
	mask: string;
	/** First 8 bytes of the SHA-256 of the plain mask, hex. */
	check: string;
}

/**
 * AES-128-CTR under a key drawn from `networkKey` and the challenge id. The
 * counter's low 64 bits start at zero so a 64-bit counter, as WebCrypto's
 * AES-CTR uses, never wraps on a mask of any realistic size.
 */
export const scramblePieceMask = (
	mask: Buffer,
	networkKey: Buffer,
	challenge: string,
): ScrambledPieceMask => {
	const challengeKey = createHmac("sha256", networkKey)
		.update(challenge)
		.digest();
	const counter = Buffer.concat([
		challengeKey.subarray(16, 24),
		Buffer.alloc(8),
	]);
	const cipher = createCipheriv(
		"aes-128-ctr",
		challengeKey.subarray(0, 16),
		counter,
	);
	const scrambled = Buffer.concat([cipher.update(mask), cipher.final()]);
	return {
		mask: scrambled.toString("base64"),
		check: createHash("sha256")
			.update(mask)
			.digest()
			.subarray(0, 8)
			.toString("hex"),
	};
};
