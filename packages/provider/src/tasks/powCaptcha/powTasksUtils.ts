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
import { sha256 } from "@noble/hashes/sha256";
import { stringToHex } from "@polkadot/util";
import { signatureVerify } from "@polkadot/util-crypto";
import { ProsopoContractError } from "@prosopo/common";

import { verifyRecency } from "@prosopo/util";

export const validateSolution = (
  nonce: number,
  challenge: string,
  difficulty: number,
): boolean =>
  Array.from(sha256(new TextEncoder().encode(nonce + challenge)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .startsWith("0".repeat(difficulty));

export const checkPowSignature = (
  challenge: string,
  signature: string,
  address: string,
  signatureType?: string,
): void => {
  const signatureVerification = signatureVerify(
    stringToHex(challenge),
    signature,
    address,
  );
  if (!signatureVerification.isValid) {
    throw new ProsopoContractError("GENERAL.INVALID_SIGNATURE", {
      context: {
        ERROR: `Signature is invalid for this message: ${signatureType}`,
        failedFuncName: checkPowSignature.name,
        signature,
        signatureType,
      },
    });
  }
};
