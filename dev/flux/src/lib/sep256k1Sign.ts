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

import { secp256k1 } from "@noble/curves/secp256k1";
import { bnToU8a, hexToU8a, u8aConcat, u8aToHex } from "@polkadot/util";
import {
  base58Decode,
  base64Encode,
  cryptoWaitReady,
  sha256AsU8a,
} from "@polkadot/util-crypto";
import { BN_BE_256_OPTS } from "@polkadot/util-crypto/bn";
import type { Keypair } from "@polkadot/util-crypto/types";
import { loadEnv } from "@prosopo/dotenv";
import { LogLevel, ProsopoEnvError, getLogger } from "@prosopo/common";
import { at } from "@prosopo/util";
import { isMain } from "@prosopo/util";
import varuint from "varuint-bitcoin";

loadEnv();
const logger = getLogger(LogLevel.enum.info, "flux.lib.sep256k1Sign");
const MESSAGE_MAGIC = "\u0018Bitcoin Signed Message:\n";

function hash256(buffer: Buffer) {
  return Buffer.from(sha256AsU8a(sha256AsU8a(buffer)));
}

function hasher(message: string, messagePrefixIn: string): Buffer {
  const messagePrefix = messagePrefixIn || "\u0018Bitcoin Signed Message:\n";
  const messagePrefixBuffer = Buffer.from(messagePrefix, "utf8");
  const messageBuffer = Buffer.from(message, "utf8");
  const messageVISize = varuint.encodingLength(messageBuffer.length);
  const buffer = Buffer.allocUnsafe(
    messagePrefix.length + messageVISize + messageBuffer.length,
  );
  messagePrefixBuffer.copy(buffer, 0);
  varuint.encode(messageBuffer.length, buffer, messagePrefixBuffer.length);
  messageBuffer.copy(buffer, messagePrefixBuffer.length + messageVISize);
  return hash256(buffer);
}

export async function sign(message: string, { secretKey }: Partial<Keypair>) {
  if (!secretKey)
    throw new ProsopoEnvError("DEVELOPER.MISSING_SECRET_KEY", {
      context: { error: "No secret key provided", failedFuncName: sign.name },
    });
  await cryptoWaitReady();
  const data: Buffer = hasher(message, MESSAGE_MAGIC);
  const signature = secp256k1.sign(data, secretKey);
  return u8aConcat(
    // add 4 for compressed and then 27 for the 27th recovery byte
    Buffer.alloc(1, signature.recovery + 4 + 27),
    bnToU8a(signature.r, BN_BE_256_OPTS),
    bnToU8a(signature.s, BN_BE_256_OPTS),
  );
}

// https://bitcoin.stackexchange.com/a/61972
// <version><key><compression?><first 4 bytes of double sha256>
// 0x80..................................................................6430148d
//     ..................................................................
export function wifToPrivateKey(wif: string): Uint8Array {
  let substractLength: number;

  if (wif.length === 51) {
    // compression not included
    substractLength = 8; // remove 4 bytes from WIF so 8 in hex
  } else if (wif.length === 52) {
    // compression included
    substractLength = 10; // remove 5 bytes from WIF so 10 in hex
  } else {
    throw new ProsopoEnvError("DEVELOPER.GENERAL", {
      context: { error: "Invalid WIF", failedFuncName: wifToPrivateKey.name },
    });
  }
  const secretKeyHexLong = u8aToHex(base58Decode(wif));
  // remove 0x and the version byte prefix 80 from the start. Remove the Compression Byte suffix and the Checksum from
  // the end
  const secretKeyHex = `0x${secretKeyHexLong.substring(4, secretKeyHexLong.length - substractLength)}`;
  return hexToU8a(secretKeyHex);
}

// if main process
if (isMain(import.meta.url)) {
  const secretKey = wifToPrivateKey(
    process.env.PROSOPO_ZELCORE_PRIVATE_KEY || "",
  );
  const publicKey: Uint8Array = base58Decode(
    process.env.PROSOPO_ZELCORE_PUBLIC_KEY || "",
  );
  const keypair: Keypair = { secretKey, publicKey };
  const message = at(process.argv.slice(2), 0).trim();
  if (message.length === 0) {
    console.error("No message provided");
    process.exit();
  }
  sign(message, keypair)
    .then((sig) => {
      const hexSig = u8aToHex(sig);
      logger.info(`Hex Signature   : ${hexSig}`);
      logger.info(`Public Key: ${publicKey}`);
      logger.info(`Base64 Signature: ${base64Encode(hexSig)}`);
      process.exit();
    })
    .catch((error) => {
      console.error(error);
      process.exit();
    });
}
