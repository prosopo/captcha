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

import { load } from "@fingerprintjs/botd";
import type { DetectorType } from "@prosopo/procaptcha-frictionless";
import type { DetectorData, OpenDetectorPayload } from "@prosopo/types";
import { PUBLIC_KEY_PLACEHOLDER } from "./publicKey.js";
import { sealPayload, sha256Hex } from "./seal.js";

type Signals = { score: number; d: DetectorData };

/**
 * The part to replace with your own detection. `score` is compared against the
 * site key's frictionless thresholds (by default 0.5 serves a puzzle and 1
 * serves an image challenge; anything lower passes with proof of work), and
 * every key in `d` reaches your decision and routing machines as `input.d`.
 */
const collectSignals = async (): Promise<Signals> => {
	// monitoring: false stops BotD sending an install-statistics request to
	// FingerprintJS, so a self-hosted page makes no third-party calls.
	const botd = await load({ monitoring: false });
	const result = botd.detect();
	return result.bot
		? { score: 1, d: { bot: true, botKind: result.botKind } }
		: { score: 0, d: { bot: false } };
};

const detect: DetectorType = async (_container, _restart, accountGenerator) => {
	const [signals, userAccount, headHash, userAgentHash] = await Promise.all([
		collectSignals(),
		accountGenerator(),
		sha256Hex(document.head.outerHTML),
		sha256Hex(navigator.userAgent),
	]);
	const payload: OpenDetectorPayload = {
		...signals,
		timestamp: Date.now(),
		userId: userAccount.account.address,
		userAgent: userAgentHash.slice(0, 32),
		headHash,
		isIframe: window.self !== window.top,
	};
	return {
		token: await sealPayload(payload, PUBLIC_KEY_PLACEHOLDER),
		encryptHeadHash: headHash,
		shadowDomCleanup: () => {},
		userAccount,
	};
};

export default detect;
