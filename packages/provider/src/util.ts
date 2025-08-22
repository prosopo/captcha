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

import { hexToU8a } from "@polkadot/util/hex";
import { isHex } from "@polkadot/util/is";
import {
	type Logger,
	ProsopoContractError,
	ProsopoEnvError,
} from "@prosopo/common";
import {
	type IPAddress,
	type ScheduledTaskNames,
	ScheduledTaskStatus,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { at } from "@prosopo/util";
import { decodeAddress, encodeAddress } from "@prosopo/util-crypto";
import { Address4, Address6 } from "ip-address";
import type { ObjectId } from "mongoose";
import { compareIPs } from "./services/ipComparison.js";

export function encodeStringAddress(address: string) {
	try {
		return encodeAddress(
			isHex(address) ? hexToU8a(address) : decodeAddress(address),
		);
	} catch (err) {
		throw new ProsopoContractError("CONTRACT.INVALID_ADDRESS", {
			context: { address },
		});
	}
}

export function shuffleArray<T>(array: T[]): T[] {
	for (let arrayIndex = array.length - 1; arrayIndex > 0; arrayIndex--) {
		const randIndex = Math.floor(Math.random() * (arrayIndex + 1));
		const tmp = at(array, randIndex);
		array[randIndex] = at(array, arrayIndex);
		array[arrayIndex] = tmp;
	}
	return array;
}

/**
 * Check if there is a scheduled task running.
 * If the scheduled task is running and not completed, return true.
 * If the scheduled task is running and completed, return false.
 * Otherwise, the scheduled task is not running, return false.
 */
export async function checkIfTaskIsRunning(
	taskName: ScheduledTaskNames,
	db: IProviderDatabase,
): Promise<boolean> {
	const runningTask = await db.getLastScheduledTaskStatus(
		taskName,
		ScheduledTaskStatus.Running,
	);
	const twoMinutesAgo = new Date().getTime() - 1000 * 60 * 2;
	// If the task is running and the task was started within the last 2 minutes
	// TODO: This is a temporary fix to prevent failed tasks from blocking the next task
	if (runningTask && runningTask.datetime > twoMinutesAgo) {
		const completedTask = await db.getScheduledTaskStatus(
			runningTask._id as ObjectId,
			ScheduledTaskStatus.Completed,
		);
		return !completedTask;
	}
	return false;
}

export const getIPAddress = (ipAddressString: string): IPAddress => {
	try {
		try {
			return new Address4(ipAddressString);
		} catch (e) {
			return new Address6(ipAddressString);
		}
	} catch (e) {
		throw new ProsopoEnvError("API.INVALID_IP");
	}
};

export const getIPAddressFromBigInt = (ipAddressBigInt: bigint): IPAddress => {
	try {
		if (ipAddressBigInt > 4228250626n) {
			return Address6.fromBigInt(BigInt(ipAddressBigInt));
		}
		return Address4.fromBigInt(BigInt(ipAddressBigInt));
	} catch (e) {
		throw new ProsopoEnvError("API.INVALID_IP");
	}
};

/**
 * Validates that the provided IP address matches the challenge record's IP address
 * @param ip - The IP address string to validate
 * @param challengeIpAddress - The IP address from the challenge record
 * @param logger - Logger instance for debug messages
 * @returns Object with validation result and optional error message
 */
export const validateIpAddress = (
	ip: string | undefined,
	challengeIpAddress: IPAddress,
	logger: Logger,
): { isValid: boolean; errorMessage?: string } => {
	if (!ip) {
		return { isValid: true }; // IP validation is optional
	}

	let ipV4orV6Address: IPAddress;
	try {
		ipV4orV6Address = getIPAddress(ip);
		logger.info(() => ({ data: { ipV4orV6Address } }));
	} catch (e) {
		const errorMessage = `Invalid IP address: ${ip}`;
		logger.info(() => ({ msg: errorMessage }));
		return { isValid: false, errorMessage };
	}

	// Make sure both IP addresses are of the same type (either both IPv4 or both IPv6)
	ipV4orV6Address =
		"address4" in ipV4orV6Address && ipV4orV6Address.address4
			? ipV4orV6Address.address4
			: ipV4orV6Address;
	challengeIpAddress =
		"address4" in challengeIpAddress && challengeIpAddress.address4
			? challengeIpAddress.address4
			: challengeIpAddress;

	if (ipV4orV6Address.v4 && !challengeIpAddress.v4) {
		challengeIpAddress = new Address4(
			(<Address6>challengeIpAddress).to4().correctForm(),
		);
	}

	if (!ipV4orV6Address.v4 && challengeIpAddress.v4) {
		ipV4orV6Address = new Address6(
			(<Address6>ipV4orV6Address).to4().correctForm(),
		);
	}

	if (challengeIpAddress.bigInt() - ipV4orV6Address.bigInt() !== 0n) {
		const errorMessage = `IP address mismatch: ${challengeIpAddress.address} !== ${ipV4orV6Address.address}`;
		logger.info(() => ({
			msg: errorMessage,
			data: {
				challengeIp: challengeIpAddress.address,
				providedIp: ipV4orV6Address.address,
			},
		}));
		return { isValid: false, errorMessage };
	}

	return { isValid: true };
};

/**
 * Enhanced IP validation with geolocation distance checking
 * @param ip - The IP address string to validate
 * @param challengeIpAddress - The IP address from the challenge record
 * @param logger - Logger instance for debug messages
 * @returns Object with validation result, optional error message, and distance info
 */
export const validateIpAddressWithDistance = async (
	ip: string | undefined,
	challengeIpAddress: IPAddress,
	logger: Logger,
): Promise<{
	isValid: boolean;
	errorMessage?: string;
	distanceKm?: number;
	shouldFlag?: boolean;
}> => {
	if (!ip) {
		return { isValid: true }; // IP validation is optional
	}

	// Check if IPs match exactly first
	const standardValidation = validateIpAddress(ip, challengeIpAddress, logger);
	
	// If IPs match exactly, no distance check needed
	if (standardValidation.isValid) {
		return standardValidation;
	}

	// IPs are different - now check if the difference is due to invalid format vs geographic difference
	let ipV4orV6Address: IPAddress;
	try {
		ipV4orV6Address = getIPAddress(ip);
	} catch (e) {
		// Invalid IP format - return the standard validation error
		return standardValidation;
	}

	// Both IPs are valid format but different - check distance
	try {
		const challengeIpString = challengeIpAddress.address;
		const comparison = await compareIPs(challengeIpString, ip);
		
		if ("error" in comparison) {
			logger.error(() => ({
				msg: "Failed to get IP distance comparison",
				data: { error: comparison.error, challengeIp: challengeIpString, providedIp: ip },
			}));
			// Conservative approach - allow but flag
			return { 
				isValid: true, 
				shouldFlag: true,
				errorMessage: "Could not determine IP distance"
			};
		}

		if (comparison.ipsMatch) {
			// This shouldn't happen given our earlier check, but handle gracefully
			return { isValid: true };
		}

		const distanceKm = comparison.comparison?.distanceKm;
		
		if (distanceKm !== undefined && distanceKm > 1000) {
			// Distance > 1000km - fail immediately and log
			const errorMessage = `IP addresses are too far apart: ${distanceKm.toFixed(2)}km (>1000km limit)`;
			logger.error(() => ({
				msg: "IP validation failed - distance too great",
				data: {
					challengeIp: challengeIpString,
					providedIp: ip,
					distanceKm: distanceKm,
					comparison: comparison.comparison,
				},
			}));
			return { 
				isValid: false, 
				errorMessage,
				distanceKm
			};
		}

		// Distance <= 1000km - allow but flag to client
		logger.info(() => ({
			msg: "IP addresses differ but within acceptable distance",
			data: {
				challengeIp: challengeIpString,
				providedIp: ip,
				distanceKm: distanceKm,
				comparison: comparison.comparison,
			},
		}));
		
		return { 
			isValid: true, 
			distanceKm,
			shouldFlag: true 
		};

	} catch (error) {
		logger.error(() => ({
			msg: "Error during IP distance validation",
			err: error,
			data: { challengeIp: challengeIpAddress.address, providedIp: ip },
		}));
		// Conservative approach - allow but flag
		return { 
			isValid: true, 
			shouldFlag: true,
			errorMessage: "IP distance validation error"
		};
	}
};
