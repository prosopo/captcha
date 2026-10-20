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

import type { RequestHeaders } from "@prosopo/types";

/**
 * Whether the request came from a handheld touch device, weighed across the
 * signals below. Used to size a challenge for the input device.
 */
export interface MobileSignals {
	userAgent?: string;
	/** Read for the UA client hints. */
	headers?: RequestHeaders;
	/** `ipInfo.isMobile`: the IP is on a mobile carrier network. */
	carrierNetwork?: boolean;
	/** MSS from the client's SYN. */
	tcpMss?: number;
	webView?: boolean;
	/** `deviceCapability` off the behavioural payload: "mobile" or "desktop". */
	deviceCapability?: string;
	touchEventCount?: number;
}

export interface MobileVerdict {
	isMobile: boolean;
	/**
	 * True when something other than a plaintext request header said mobile.
	 *
	 * A User-Agent or a client hint costs nothing to write, and WebKit sends no
	 * client hints, so a claim of iOS has nothing to contradict it. That is
	 * enough to pick the milder ladder, which is one rung either way. It is not
	 * enough to earn the render floors, which are a large loosening of the
	 * challenge and are the thing a solver would claim a phone to get.
	 */
	corroborated: boolean;
	score: number;
	/** Which signals contributed, for logging and calibration. */
	evidence: string[];
}

const MOBILE_UA_REGEX = /Mobile|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i;
const DESKTOP_UA_REGEX = /Windows NT|Macintosh|X11|CrOS/i;

// `Sec-CH-UA-Platform` arrives quoted, and only from Chromium.
const MOBILE_PLATFORM_HINTS = ["android", "ios"];
const DESKTOP_PLATFORM_HINTS = ["windows", "macos", "linux", "chrome os"];

// Tunnelled last mile rather than plain Ethernet. Carrier tunnels land here,
// and so do IPsec VPNs, hence the low weight.
const TUNNELLED_MSS_MIN = 1300;
const TUNNELLED_MSS_MAX = 1430;

// Starting points, pending calibration against solve rate by device class.
export const MOBILE_SIGNAL_WEIGHTS = {
	userAgentMobile: 3,
	userAgentDesktop: -3,
	clientHintMobile: 3,
	clientHintNotMobile: -3,
	clientHintPlatformMobile: 3,
	clientHintPlatformDesktop: -3,
	touchCapability: 2,
	pointerCapability: -3,
	touchEvents: 2,
	webView: 1,
	// `carrierNetwork` and `tunnelledMss` share this. Both describe the
	// network rather than the device, and the second largely follows from the
	// first — a carrier IP is why the MSS is 1400 — so scoring them separately
	// would count one fact twice. Both are still listed in `evidence`.
	network: 1,
} as const;

export const MOBILE_SCORE_THRESHOLD = 3;

const readHeader = (
	headers: RequestHeaders | undefined,
	name: string,
): string | undefined => {
	const value = headers?.[name];
	return typeof value === "string" && value !== "" ? value : undefined;
};

export const deriveMobileVerdict = (signals: MobileSignals): MobileVerdict => {
	let score = 0;
	let corroborated = false;
	const evidence: string[] = [];
	const vote = (
		name: keyof typeof MOBILE_SIGNAL_WEIGHTS,
		evidenceName: string = name,
	): void => {
		score += MOBILE_SIGNAL_WEIGHTS[name];
		evidence.push(evidenceName);
	};
	// Same as `vote`, for a signal that is not a plaintext request header.
	const voteCorroborating = (
		name: keyof typeof MOBILE_SIGNAL_WEIGHTS,
		evidenceName: string = name,
	): void => {
		vote(name, evidenceName);
		corroborated = true;
	};

	const userAgent = signals.userAgent ?? "";
	if (MOBILE_UA_REGEX.test(userAgent)) {
		vote("userAgentMobile");
	} else if (DESKTOP_UA_REGEX.test(userAgent)) {
		vote("userAgentDesktop");
	}

	const mobileHint = readHeader(signals.headers, "sec-ch-ua-mobile");
	if (mobileHint === "?1") {
		vote("clientHintMobile");
	} else if (mobileHint === "?0") {
		vote("clientHintNotMobile");
	}

	const platformHint = readHeader(signals.headers, "sec-ch-ua-platform")
		?.replaceAll('"', "")
		.toLowerCase();
	if (platformHint !== undefined) {
		if (MOBILE_PLATFORM_HINTS.includes(platformHint)) {
			vote("clientHintPlatformMobile");
		} else if (DESKTOP_PLATFORM_HINTS.includes(platformHint)) {
			vote("clientHintPlatformDesktop");
		}
	}

	if (signals.deviceCapability === "mobile") {
		voteCorroborating("touchCapability");
	} else if (signals.deviceCapability === "desktop") {
		vote("pointerCapability");
	}

	if (signals.touchEventCount !== undefined && signals.touchEventCount > 0) {
		voteCorroborating("touchEvents");
	}

	if (signals.webView === true) {
		voteCorroborating("webView");
	}

	const onCarrier = signals.carrierNetwork === true;
	const tunnelled =
		signals.tcpMss !== undefined &&
		signals.tcpMss >= TUNNELLED_MSS_MIN &&
		signals.tcpMss <= TUNNELLED_MSS_MAX;
	if (onCarrier || tunnelled) {
		voteCorroborating(
			"network",
			onCarrier && tunnelled
				? "carrierNetwork+tunnelledMss"
				: onCarrier
					? "carrierNetwork"
					: "tunnelledMss",
		);
	}

	return {
		isMobile: score >= MOBILE_SCORE_THRESHOLD,
		corroborated,
		score,
		evidence,
	};
};
