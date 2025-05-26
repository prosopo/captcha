// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import type { IPAddress } from "@prosopo/types";
import { Address4, Address6 } from "ip-address";

export const getIPAddress = (ipAddressString: string): IPAddress => {
	try {
		if (ipAddressString.match(/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/)) {
			return new Address4(ipAddressString);
		}
		return new Address6(ipAddressString);
	} catch (e) {
		throw new Error("API.INVALID_IP");
	}
};

export const getIPAddressFromBigInt = (ipAddressBigInt: bigint): IPAddress => {
	return Address4.fromBigInt(ipAddressBigInt);
};
