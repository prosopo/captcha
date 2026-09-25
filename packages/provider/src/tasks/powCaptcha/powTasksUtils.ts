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

import { sha256 } from "@noble/hashes/sha2.js";
import { ProsopoApiError } from "@prosopo/common";
import { hashMeetsDifficulty } from "@prosopo/util";
import { isSignatureValid } from "../signatureCheck.js";

export const validateSolution = (
	nonce: number,
	challenge: string,
	difficulty: number,
): boolean =>
	hashMeetsDifficulty(
		sha256(new TextEncoder().encode(nonce + challenge)),
		difficulty,
	);

export const checkPowSignature = (
	message: string,
	signature: string,
	address: string,
	signatureType?: string,
): void => {
	if (!isSignatureValid(message, signature, address)) {
		throw new ProsopoApiError("GENERAL.INVALID_SIGNATURE", {
			context: {
				code: 400,
				ERROR: `Signature is invalid for this message: ${signatureType}`,
				failedFuncName: checkPowSignature.name,
				address,
				message,
				signature,
				signatureType,
			},
		});
	}
};
