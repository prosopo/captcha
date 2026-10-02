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

import type { IPAddress } from "@prosopo/types";
import { type CompositeIpAddress, IpAddressType } from "@prosopo/types";
import { getIPAddress } from "@prosopo/util";
import { Address4, Address6 } from "ip-address";

const V6_SHIFT = 64n;
const v6_LOWER_MASK = (1n << V6_SHIFT) - 1n;

/**
 * The part of a v4 address treated as the host rather than the network, for
 * the purposes of `isSameIpOrigin`. 8 bits — a /24.
 */
const V4_HOST_BITS = 8n;

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
			return Address4.fromBigInt(getBigInt(compositeIpAddress.lower));
		case IpAddressType.v6:
			return Address6.fromBigInt(
				(getBigInt(compositeIpAddress.upper) << V6_SHIFT) |
					(getBigInt(compositeIpAddress.lower) & v6_LOWER_MASK),
			);
		default:
			never();
			return Address4.fromBigInt(0n);
	}
};

const getBigInt = (number: bigint | number | undefined) => BigInt(number || 0n);

/**
 * Mongo hands these back as Decimal128 rather than the `number | bigint` the
 * type promises, and `BigInt(Decimal128)` throws. Route through the string
 * form, and report a value we cannot read as absent rather than throwing.
 */
const readPart = (value: bigint | number | undefined): bigint | undefined => {
	if (value === undefined || value === null) return undefined;
	try {
		return BigInt(value.toString());
	} catch {
		return undefined;
	}
};

/**
 * The value `getCompositeIpAddress` returns when it could not read an
 * address at all. 0.0.0.0 is not a client address, so nothing legitimate is
 * being swallowed by treating it as "we don't know".
 */
const isUnknownIp = (ip: CompositeIpAddress): boolean =>
	ip.type === IpAddressType.v4 && readPart(ip.lower) === 0n;

/**
 * Do two observations of a client come from the same place on the network?
 *
 * Both families are compared on the network part and neither on the host part.
 *
 * v6 is the /64 prefix: the interface identifier in the low 64 bits is designed
 * to rotate (RFC 8981 privacy extensions), often several times a day on one
 * unchanged connection, so comparing it would call an ordinary phone a
 * different host.
 *
 * v4 is the /24. A carrier NAT or mobile pool reassigns the low octet mid
 * session — an EE subscriber was observed moving one address in four seconds —
 * so comparing the whole address called every rotating mobile and CGNAT client
 * a different host, which is the opposite of the leniency this check is for.
 * The /24 still separates an unrelated network, which is the case worth
 * catching: a challenge handed to a second host to farm the work out.
 *
 * A value we do not actually have counts as the same — one that will not
 * parse, or the all-zero v4 `getCompositeIpAddress` returns when handed an
 * address it could not read. This answer gates extra friction for a real
 * user, and a gap in what we recorded is not evidence against them.
 */
export const isSameIpOrigin = (
	a: CompositeIpAddress,
	b: CompositeIpAddress,
): boolean => {
	if (isUnknownIp(a) || isUnknownIp(b)) return true;
	if (a.type !== b.type) return false;

	const sameNetwork = (
		left: bigint | number | undefined,
		right: bigint | number | undefined,
		hostBits: bigint,
	): boolean => {
		const leftPart = readPart(left);
		const rightPart = readPart(right);
		if (leftPart === undefined || rightPart === undefined) return true;
		return leftPart >> hostBits === rightPart >> hostBits;
	};

	// v6's host part is already split off into `lower`, so `upper` is the
	// network as stored and needs no further masking.
	return a.type === IpAddressType.v6
		? sameNetwork(a.upper, b.upper, 0n)
		: sameNetwork(a.lower, b.lower, V4_HOST_BITS);
};

const never = (): never => {
	throw new Error("Unhandled type");
};
