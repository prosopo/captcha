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
	type IIPValidation,
	type IIPValidationRules,
	type IPAddress,
	type IPComparisonResult,
	type IPValidateCondition,
	IPValidationAction,
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
 * Evaluates IP validation rules based on IP comparison results
 * @param comparison - IP comparison results from compareIPs
 * @param rules - IP validation rules configuration
 * @param logger - Logger instance
 * @returns Validation result with action to take
 */
export const evaluateIpValidationRules = (
	comparison: IPComparisonResult,
	rules: IIPValidationRules,
	logger: Logger,
): {
	action: IPValidationAction;
	errorMessage?: string;
	shouldFlag?: boolean;
} => {
	// Early return if no comparison data is provided
	if (!comparison.comparison) {
		return { action: IPValidationAction.Allow };
	}

	const conditions: IPValidateCondition[] = [];
	const rejectActions = Object.values(rules.actions).filter(
		(action) => action === IPValidationAction.Reject,
	);

	// Apply country-specific overrides if they exist
	const ip1Country = comparison.comparison.ip1Details?.country;
	const ip2Country = comparison.comparison.ip2Details?.country;
	let effectiveRules = rules;
	let countryOverride: undefined | IIPValidation = undefined;
	if (ip1Country && rules.countryOverrides?.[ip1Country]) {
		countryOverride = rules.countryOverrides[ip1Country];
	}
	if (ip2Country && rules.countryOverrides?.[ip2Country]) {
		countryOverride = rules.countryOverrides[ip2Country];
	}
	if (countryOverride) {
		effectiveRules = {
			...rules,
			actions: {
				...rules.actions,
				...countryOverride.actions,
			},
			distanceThresholdKm:
				countryOverride.distanceThresholdKm ?? rules.distanceThresholdKm,
			abuseScoreThreshold:
				countryOverride.abuseScoreThreshold ?? rules.abuseScoreThreshold,
			requireAllConditions:
				countryOverride.requireAllConditions ?? rules.requireAllConditions,
		};
	}

	// Check for country change
	if (ip1Country !== ip2Country) {
		conditions.push({
			met: true,
			action: effectiveRules.actions.countryChangeAction,
			message: `Country changed from ${ip1Country} to ${ip2Country}`,
		});
	}

	// Check for city change
	const ip1City = comparison.comparison.ip1Details?.city;
	const ip2City = comparison.comparison.ip2Details?.city;
	if (ip1City !== ip2City) {
		conditions.push({
			met: true,
			action: effectiveRules.actions.cityChangeAction,
			message: `City changed from ${ip1City} to ${ip2City}`,
		});
	}

	// Check for ISP change
	if (comparison.comparison.differentProviders) {
		const ip1Provider = comparison.comparison.ip1Details?.provider;
		const ip2Provider = comparison.comparison.ip2Details?.provider;
		conditions.push({
			met: true,
			action: effectiveRules.actions.ispChangeAction,
			message: `ISP changed from ${ip1Provider} to ${ip2Provider}`,
		});
	}

	// Check for distance exceed condition
	const distanceKm = comparison.comparison.distanceKm;
	if (
		distanceKm !== undefined &&
		distanceKm > effectiveRules.distanceThresholdKm
	) {
		conditions.push({
			met: true,
			action: effectiveRules.actions.distanceExceedAction,
			message: `IP addresses are ${distanceKm.toFixed(2)}km apart (>${effectiveRules.distanceThresholdKm}km limit)`,
		});
	}

	console.log(JSON.stringify(effectiveRules, null, 2));
	// Check for abuse score exceed condition
	const ip2AbuseScore = comparison.comparison.ip2Details?.abuserScore;
	if (
		ip2AbuseScore !== undefined &&
		ip2AbuseScore > effectiveRules.abuseScoreThreshold
	) {
		conditions.push({
			met: true,
			action: effectiveRules.actions.abuseScoreExceedAction,
			message: `Abuse score ${ip2AbuseScore.toFixed(4)} exceeds threshold ${effectiveRules.abuseScoreThreshold}`,
		});
	}
	const ip1AbuseScore = comparison.comparison.ip1Details?.abuserScore;
	if (
		ip1AbuseScore !== undefined &&
		ip1AbuseScore > effectiveRules.abuseScoreThreshold
	) {
		conditions.push({
			met: true,
			action: effectiveRules.actions.abuseScoreExceedAction,
			message: `Abuse score ${ip1AbuseScore.toFixed(4)} exceeds threshold ${effectiveRules.abuseScoreThreshold}`,
		});
	}

	// If no conditions are met, allow
	if (conditions.length === 0) {
		return { action: IPValidationAction.Allow };
	}

	const errorMessages: string[] = [];
	let finalAction = IPValidationAction.Allow;
	let shouldFlag = false;

	// Determine action based on requireAllConditions flag
	if (effectiveRules.requireAllConditions) {
		// Apply AND logic: all reject actions must be met to reject
		const rejectConditions = conditions.filter(
			(c) => c.action === IPValidationAction.Reject,
		);

		// If at least as many reject conditions as reject actions exist, we reject
		if (
			rejectConditions.length > 0 &&
			rejectConditions.length >= rejectActions.length
		) {
			finalAction = IPValidationAction.Reject;
		}

		// Collect error messages for all reject/flag conditions
		for (const condition of conditions) {
			if (
				condition.action === IPValidationAction.Reject ||
				condition.action === IPValidationAction.Flag
			) {
				errorMessages.push(condition.message);
			}
		}
	} else {
		// Apply OR logic: the first reject condition triggers rejection
		for (const condition of conditions) {
			if (condition.action === IPValidationAction.Reject) {
				finalAction = IPValidationAction.Reject;
				errorMessages.push(condition.message);
				break; // Reject is the most restrictive, no need to check further
			}
			if (condition.action === IPValidationAction.Flag) {
				finalAction = IPValidationAction.Flag;
				shouldFlag = true;
			}
			errorMessages.push(condition.message);
		}
	}

	logger.info(() => ({
		msg: `IP validation rules evaluated: ${finalAction}`,
		data: {
			conditions,
			finalAction,
			requireAllConditions: effectiveRules.requireAllConditions,
		},
	}));

	// Return the evaluation result
	return {
		action: finalAction,
		errorMessage:
			errorMessages.length > 0 ? errorMessages.join("; ") : undefined,
		shouldFlag,
	};
};

/**
 * @param ip - The IP address string to validate
 * @param challengeIpAddress - The IP address from the challenge record
 * @param logger - Logger instance for debug messages
 * @param apiKey
 * @param apiUrl
 * @param ipValidationRules - IP validation rules configuration
 * @returns Object with validation result, optional error message, and distance info
 */
export const deepValidateIpAddress = async (
	ip: string,
	challengeIpAddress: IPAddress,
	logger: Logger,
	apiKey: string,
	apiUrl: string,
	ipValidationRules?: IIPValidationRules,
): Promise<{
	isValid: boolean;
	errorMessage?: string;
	distanceKm?: number;
	shouldFlag?: boolean;
}> => {
	const standardValidation = validateIpAddress(ip, challengeIpAddress, logger);
	if (!standardValidation.isValid) {
		// Check if this is a format error or a mismatch
		if (standardValidation.errorMessage?.includes("Invalid IP address")) {
			// Format error - return the error
			return standardValidation;
		}
		// IP mismatch - continue to distance checking
	} else {
		// IPs match exactly - return valid without distance checking
		return { isValid: true };
	}

	// Both IPs valid but different -> check distance
	try {
		const challengeIpString = challengeIpAddress.address;
		const comparison = await compareIPs(challengeIpString, ip, apiKey, apiUrl);

		if ("error" in comparison) {
			logger.error(() => ({
				msg: "Failed to get IP distance comparison",
				data: {
					error: comparison.error,
					challengeIp: challengeIpString,
					providedIp: ip,
				},
			}));
			// If we can't do distance comparison and IPs don't match exactly, be strict
			return {
				isValid: false,
				errorMessage: "Could not determine IP distance",
			};
		}

		if (comparison.ipsMatch) {
			return { isValid: true };
		}

		const distanceKm = comparison.comparison?.distanceKm;

		// If no validation rules provided, use legacy logic (1000km threshold)
		if (!ipValidationRules) {
			logger.info(() => ({
				msg: "No IP validation rules provided, using legacy logic",
				data: {
					challengeIp: challengeIpString,
					providedIp: ip,
					distanceKm: distanceKm,
				},
			}));
			// Legacy distance > 1000km -> fail and log
			if (distanceKm !== undefined && distanceKm > 1000) {
				const errorMessage = `IP addresses are too far apart: ${distanceKm.toFixed(2)}km (>1000km limit)`;
				logger.info(() => ({
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
					distanceKm,
				};
			}

			// Legacy distance <= 1000km -> allow flag
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
				shouldFlag: true,
			};
		}

		// Use configurable validation rules
		const ruleEvaluation = evaluateIpValidationRules(
			comparison,
			ipValidationRules,
			logger,
		);

		switch (ruleEvaluation.action) {
			case IPValidationAction.Reject:
				return {
					isValid: false,
					errorMessage: ruleEvaluation.errorMessage,
					distanceKm,
				};
			case IPValidationAction.Flag:
				return {
					isValid: true,
					distanceKm,
					shouldFlag: true,
					errorMessage: ruleEvaluation.errorMessage,
				};
			default:
				return {
					isValid: true,
					distanceKm,
				};
		}
	} catch (error) {
		logger.error(() => ({
			msg: "Error during IP distance validation",
			err: error,
			data: { challengeIp: challengeIpAddress.address, providedIp: ip },
		}));
		// Something weird going on -> allow but flag
		return {
			isValid: true,
			shouldFlag: true,
			errorMessage: "IP distance validation error",
		};
	}
};
