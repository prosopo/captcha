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
import { u8aToHex } from "@prosopo/util";
import {
	keyExtractSuri,
	keyFromPath,
	mnemonicToMiniSecret,
	sr25519FromSeed,
	encodeAddress,
} from "@prosopo/util-crypto";

const suri =
	process.argv[2] ||
	"bottom drive obey lake curtain smoke basket hold race lonely fit walk//protect";

const { phrase, path } = keyExtractSuri(suri);
const seed = mnemonicToMiniSecret(phrase);
const rawPair = keyFromPath(sr25519FromSeed(seed), path, "sr25519");

const sr25519Secret = u8aToHex(rawPair.secretKey);
const sr25519Public = u8aToHex(rawPair.publicKey);
const ss58Address = encodeAddress(rawPair.publicKey, 42);

console.log(`SURI: ${suri}`);
console.log(`SS58_ADDRESS: ${ss58Address}`);
console.log(`SR25519_PUBLIC: ${sr25519Public}`);
console.log(`SR25519_SECRET: ${sr25519Secret}`);
