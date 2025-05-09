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
import { getIPAddress } from "@prosopo/util";
import { Address4 } from "ip-address";
import { ruleIpSchema } from "./rule/ip/ruleIpSchema.js";
import type { RuleIpV4Mask } from "./rule/ip/v4/mask/ruleIpV4MaskSchema.js";

/**
 * Takes an IP address string and returns a rule object with the IP address.
 * @param ip
 */
export const createIpV4Rule = (ip: string) => {
	const ipAddress = getIPAddress(ip);
	return ruleIpSchema.parse({
		v4: {
			asNumeric: ipAddress.bigInt(),
			asString: ipAddress.address,
		},
	});
};

/**
 * Takes an IP mask string and returns a rule object with the IP address and mask range.
 * @param ip
 */
export const createIpV4MaskRule = (ip: string) => {
	const minIpString = ip.replace("*", "0");
	const maxIpString = ip.replace("*", "255");
	const minIpAddress = getIPAddress(minIpString);
	const maxIpAddress = getIPAddress(maxIpString);
	console.log("minIpAddress", minIpAddress.address);
	console.log("maxIpAddress", maxIpAddress.address);
	return ruleIpSchema.parse({
		v4: {
			asNumeric: minIpAddress.bigInt(),
			asString: minIpAddress.address,
			mask: {
				asNumeric: Number(minIpAddress.bigInt()),
				rangeMinAsNumeric: minIpAddress.bigInt(),
				rangeMaxAsNumeric: maxIpAddress.bigInt(),
			},
		},
	});
};

/**
 * Takes an IPV4MaskRule and returns the corresponding mask string.
 * @param ipMaskRule
 */
export const getIpMaskString = (ipMaskRule: RuleIpV4Mask) => {
	const ip = Address4.fromBigInt(ipMaskRule.rangeMinAsNumeric);
	return ip.address.replace(/0/g, "*");
};
