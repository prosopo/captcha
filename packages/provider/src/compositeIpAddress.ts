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
import {
	type CompositeIpAddress,
	IpAddressType,
} from "@prosopo/types-database";
import { getIPAddress } from "@prosopo/util";
import { Address4, Address6 } from "ip-address";

const V6_SHIFT = 64n;
const v6_LOWER_MASK = (1n << V6_SHIFT) - 1n;

export const getCompositeIpAddress = (
	ip: string | IPAddress,
): CompositeIpAddress => {
	let ipAddress: IPAddress;

	try {
		ipAddress = "string" === typeof ip ? getIPAddress(ip) : ip;
	} catch (e) {
		return {
			lower: 0n,
			type: IpAddressType.v4,
		};
	}

	return getCompositeFromIpAddress(ipAddress);
};

const getCompositeFromIpAddress = (
	ipAddress: IPAddress,
): CompositeIpAddress => {
	const numericIp = ipAddress.bigInt();

	if (ipAddress instanceof Address4) {
		return {
			lower: numericIp,
			type: IpAddressType.v4,
		};
	}

	ipAddress satisfies Address6;

	return {
		lower: numericIp & v6_LOWER_MASK,
		upper: numericIp >> V6_SHIFT,
		type: IpAddressType.v6,
	};
};

export const getIpAddressFromComposite = (
	compositeIpAddress: CompositeIpAddress,
): IPAddress => {
	switch (compositeIpAddress.type) {
		case IpAddressType.v4:
			return Address4.fromBigInt(compositeIpAddress.lower);
		case IpAddressType.v6:
			return Address6.fromBigInt(
				((compositeIpAddress.upper || 0n) << V6_SHIFT) |
					(compositeIpAddress.lower & v6_LOWER_MASK),
			);
		default:
			never();
			return Address4.fromBigInt(0n);
	}
};

const never = (): never => {
	throw new Error("Unhandled type");
};
