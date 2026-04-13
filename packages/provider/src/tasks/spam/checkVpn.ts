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

import type { Logger } from "@prosopo/common";
import type { IPInfoResponse } from "@prosopo/types";
import { getIPInfo } from "../../services/ipInfo.js";

export type VpnCheckResult =
	| { isBlocked: false }
	| { isBlocked: true; reason: "VPN_BLOCKED"; ipService?: string };

/**
 * Returns true if the IP info classifies the address as a VPN, proxy or Tor exit node.
 */
export const ipInfoIsVpn = (info: IPInfoResponse): boolean => {
	if (!("isValid" in info) || !info.isValid) return false;
	return Boolean(info.isVPN || info.isProxy || info.isTor);
};

/**
 * Performs a VPN/proxy/tor lookup against the configured IP API and returns
 * a structured result. Falls back to "not blocked" on lookup failure so an
 * outage in the upstream service can't block all traffic.
 */
export const checkIpForVpn = async (
	ip: string,
	apiUrl: string,
	apiKey: string | undefined,
	logger: Logger,
): Promise<VpnCheckResult> => {
	try {
		const info = await getIPInfo(ip, apiUrl, apiKey);
		if (ipInfoIsVpn(info)) {
			return {
				isBlocked: true,
				reason: "VPN_BLOCKED",
				ipService:
					"isValid" in info && info.isValid ? info.vpnService : undefined,
			};
		}
		return { isBlocked: false };
	} catch (error) {
		logger.warn(() => ({
			msg: "VPN check failed; allowing request",
			error,
			ip,
		}));
		return { isBlocked: false };
	}
};
