import { blake2AsHex } from "@polkadot/util-crypto/blake2";
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
import { arrayJoin } from "./array.js";
export const HEX_HASH_BIT_LENGTH = 256;

export function hexHash(
	data: string | Uint8Array,
	bitLength?: 256 | 512 | 64 | 128 | 384 | undefined,
): string {
	// default bit length is 256
	return blake2AsHex(data, bitLength);
}

export function hexHashArray<T>(arr: T[]): string {
	return hexHash(arrayJoin(arr));
}
