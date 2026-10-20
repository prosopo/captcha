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
 * Is the thing on the other end of this request a handheld touch device?
 *
 * Asked so a challenge can be sized for the input device. A placement target
 * is in absolute CSS pixels against a fixed-size container, so a level asks the
 * same accuracy of a fingertip as of a mouse — and a fingertip cannot give it.
 *
 * No single signal answers the question:
 *
 *   - The IP's mobile-carrier bit describes the *network*, not the device. A
 *     phone on home Wi-Fi is false and a tethered laptop is true.
 *   - Touch support is a property of the hardware, and every touchscreen
 *     laptop and Windows tablet has it.
 *   - The User-Agent and the UA-CH headers are the browser stating what it is,
 *     which is both the most direct answer and the one a client can make up.
 *
 * So they are weighed together. Each of the three platform-declaration
 * channels — the UA, the `Sec-CH-UA-Mobile` bit and `Sec-CH-UA-Platform` —
 * carries enough weight to decide on its own, which it has to: WebKit sends no
 * client hints at all, so an iPhone on Wi-Fi has nothing else to go on. They
 * also cancel each other out, so a desktop browser wearing a phone's UA string
 * is contradicted by the two hints it still sends honestly. The physical and
 * behavioural signals are worth less individually and serve to break ties.
 *
 * A wrong "yes" costs one rung of the escalation ladder and a slacker
 * placement target. A wrong "no" is what put 5,171 phone sessions a day on a
 * puzzle 4% of them could solve, so the asymmetry runs the other way from the
 * usual bot-detection default.
 *
 * The weights below are starting points. `evidence` on the verdict names every
 * signal that voted so the mix can be calibrated against observed solve rates
 * per device class.
 */
export interface MobileSignals {
	/** Request User-Agent header, unhashed. */
	userAgent?: string;
	/** Request headers, read for the UA client hints. */
	headers?: RequestHeaders;
	/** `ipInfo.isMobile` — the IP sits on a mobile carrier network. */
	carrierNetwork?: boolean;
	/** TCP MSS from the client's SYN, as observed on the wire. */
	tcpMss?: number;
	/** The bot detector classified the client as an in-app browser. */
	webView?: boolean;
	/**
	 * `deviceCapability` off the behavioural payload — the client's own
	 * `hasTouchSupport` reading, "mobile" or "desktop". Only available once a
	 * challenge has been solved, so absent at challenge-issue time.
	 */
	deviceCapability?: string;
	/** Touch events in the behavioural payload. Same availability as above. */
	touchEventCount?: number;
}

export interface MobileVerdict {
	isMobile: boolean;
	/** Sum of the weights below. At or above the threshold reads as mobile. */
	score: number;
	/** Names of the signals that contributed, for logging and calibration. */
	evidence: string[];
}

const MOBILE_UA_REGEX = /Mobile|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i;
const DESKTOP_UA_REGEX = /Windows NT|Macintosh|X11|CrOS/i;

// `Sec-CH-UA-Platform` values that mean a handheld, and those that mean a
// desktop. Sent quoted ("Android"), and only by Chromium.
const MOBILE_PLATFORM_HINTS = ["android", "ios"];
const DESKTOP_PLATFORM_HINTS = ["windows", "macos", "linux", "chrome os"];

/**
 * MSS range that implies the last mile is tunnelled rather than plain
 * Ethernet. Mobile-carrier GTP tunnels land here (1348, 1400, 1420); so do
 * IPsec VPNs, which is why this is worth little on its own.
 */
const TUNNELLED_MSS_MIN = 1300;
const TUNNELLED_MSS_MAX = 1430;

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
	carrierNetwork: 1,
	tunnelledMss: 1,
	webView: 1,
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
	const evidence: string[] = [];
	const vote = (name: keyof typeof MOBILE_SIGNAL_WEIGHTS): void => {
		score += MOBILE_SIGNAL_WEIGHTS[name];
		evidence.push(name);
	};

	const userAgent = signals.userAgent ?? "";
	if (MOBILE_UA_REGEX.test(userAgent)) {
		vote("userAgentMobile");
	} else if (DESKTOP_UA_REGEX.test(userAgent)) {
		vote("userAgentDesktop");
	}

	// `?1` / `?0` per RFC 8941 structured-field booleans.
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
		vote("touchCapability");
	} else if (signals.deviceCapability === "desktop") {
		vote("pointerCapability");
	}

	if (signals.touchEventCount !== undefined && signals.touchEventCount > 0) {
		vote("touchEvents");
	}

	if (signals.carrierNetwork === true) {
		vote("carrierNetwork");
	}

	if (
		signals.tcpMss !== undefined &&
		signals.tcpMss >= TUNNELLED_MSS_MIN &&
		signals.tcpMss <= TUNNELLED_MSS_MAX
	) {
		vote("tunnelledMss");
	}

	if (signals.webView === true) {
		vote("webView");
	}

	return { isMobile: score >= MOBILE_SCORE_THRESHOLD, score, evidence };
};
