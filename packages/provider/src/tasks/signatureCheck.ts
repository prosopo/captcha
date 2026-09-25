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
import { stringToHex } from "@polkadot/util";
import { signatureVerify } from "@prosopo/util-crypto";

// signatureVerify throws on a signature or address it cannot decode, such as
// an empty string or non-hex text. Those come straight from the request body,
// so they are an invalid signature, not a server fault.
export const isSignatureValid = (
	message: string,
	signature: string,
	address: string,
): boolean => {
	try {
		return signatureVerify(stringToHex(message), signature, address).isValid;
	} catch {
		return false;
	}
};
