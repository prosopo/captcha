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

import {
	CaptchaStatus,
	type CompositeIpAddress,
	type SolveDeviceSignals,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { getIpAddressFromComposite } from "../../../compositeIpAddress.js";
import { solveDeviceSignals } from "../../../utils/devicePlatform.js";

export interface RetryRequest {
	/** The challenge of the failed puzzle, as the client reported it. */
	retryOf: string | undefined;
	siteKey: string;
	userAccount: string;
	ipAddress: CompositeIpAddress;
	userAgent: string;
	ja4: string | undefined;
}

export interface ResolvedRetry {
	retryOf: string;
	solveDevice: SolveDeviceSignals;
}

/**
 * Exact, unlike `isSameIpOrigin`: that check forgives a rotated host part
 * and an address it could not read, because it only decides whether to add
 * friction. This one decides whether a device may take another solve's
 * readings, so anything short of the same address is a different client.
 */
const isSameAddress = (
	a: CompositeIpAddress,
	b: CompositeIpAddress,
): boolean => {
	try {
		const left = getIpAddressFromComposite(a);
		const right = getIpAddressFromComposite(b);
		return (
			a.type === b.type &&
			left.bigInt() !== 0n &&
			left.bigInt() === right.bigInt()
		);
	} catch {
		return false;
	}
};

/**
 * The device readings a retry session may take from the puzzle it replaces.
 *
 * A failed puzzle consumes its session, so the puzzle served next is issued
 * on a new session that knows nothing of the solve. The client names the
 * failed challenge, and its readings are carried over only when the provider's
 * own record of it shows the same client: same site, user account and IP
 * address, the same user agent and the same TLS fingerprint, and a solve that
 * was submitted and failed. A client cannot take another device's readings by
 * naming its challenge, and each failed puzzle vouches for one retry only.
 *
 * The readings come from that solve's own behavioural payload, never from
 * what its session inherited, so they do not travel down a chain of retries.
 * Anything that does not check out is ignored: the session is minted with no
 * readings, which is what it would have had without `retryOf`.
 */
export const resolveRetrySolveDevice = async (
	db: Pick<
		IProviderDatabase,
		"getPuzzleCaptchaRecordByChallenge" | "claimPuzzleCaptchaRetry"
	>,
	request: RetryRequest,
): Promise<ResolvedRetry | undefined> => {
	const { retryOf, ja4 } = request;
	if (!retryOf || !ja4) return undefined;

	const record = await db.getPuzzleCaptchaRecordByChallenge(retryOf);
	if (
		!record ||
		true !== record.userSubmitted ||
		CaptchaStatus.disapproved !== record.result?.status ||
		record.dappAccount !== request.siteKey ||
		record.userAccount !== request.userAccount ||
		record.ja4 !== ja4 ||
		record.headers?.["user-agent"] !== request.userAgent ||
		!isSameAddress(record.ipAddress, request.ipAddress)
	) {
		return undefined;
	}

	const solveDevice = solveDeviceSignals(record.behavioralDataPacked);
	if (!solveDevice) return undefined;

	// Checked before claiming, so a request that fails the checks above cannot
	// use up the retry for the client the puzzle belongs to.
	if (!(await db.claimPuzzleCaptchaRetry(record.challenge))) return undefined;

	return { retryOf, solveDevice };
};
