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

// Writes pow-solution-vectors.json: the checks a PoW solution submission runs, from the TS on
// Node 24. `validateSolution` over solved and unsolved nonces, odd nonces (fractions, -0,
// exponent forms) and every difficulty edge; `checkPowSignature` over signatures the TS made,
// tampered ones, other signers, malformed signatures and addresses; `isCoordsAllZero`;
// `derivePlatform`; `coerceToEnabledCaptchaType` for every type and site flag combination;
// and the deterministic parts of `samplePuzzleDifficulty` (the level, the piece scale, and the
// decoy floor when it overrides every draw).
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sha256 } from "@noble/hashes/sha2.js";
import { getPair } from "@prosopo/keyring";
import { CaptchaType, type IFrictionlessTypes } from "@prosopo/types";
import { hashMeetsDifficulty, u8aToHex } from "@prosopo/util";
import {
	type ConcreteCaptchaType,
	coerceToEnabledCaptchaType,
} from "../../src/tasks/captchaTypeSelection.js";
import {
	checkPowSignature,
	isCoordsAllZero,
	validateSolution,
} from "../../src/tasks/powCaptcha/powTasksUtils.js";
import { samplePuzzleDifficulty } from "../../src/tasks/puzzle/puzzleDifficulty.js";
import { derivePlatform } from "../../src/utils/devicePlatform.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(
		`this generator must run on Node 24 (the production runtime), not ${process.version}`,
	);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const outcome = (run: () => unknown): Json => {
	try {
		return { ok: run() as Json };
	} catch (error) {
		const e = error as {
			translationKey?: string;
			message?: string;
			context?: Json;
		};
		return e.translationKey
			? {
					key: e.translationKey,
					context: JSON.parse(JSON.stringify(e.context ?? null)),
				}
			: { thrown: String(e.message) };
	}
};

const solve = (challenge: string, difficulty: number): number => {
	for (let nonce = 0; ; nonce++) {
		if (
			hashMeetsDifficulty(
				sha256(new TextEncoder().encode(nonce + challenge)),
				difficulty,
			)
		) {
			return nonce;
		}
	}
};

const challenge = "1700000000000___5Grwva___5FHne___123456";
const solutions: Json[] = [];
for (const difficulty of [0, 1, 2, 3, 4, 2.5, 0.1, 0.125, 0.13, -1]) {
	const nonce = solve(challenge, difficulty);
	for (const tried of [nonce, nonce + 1, nonce - 1]) {
		solutions.push({
			nonce: tried,
			challenge,
			difficulty,
			result: outcome(() => validateSolution(tried, challenge, difficulty)),
		});
	}
}
for (const nonce of [0, -0, 1.5, 1e21, 1e-7, 123456789012, -5, 2 ** 53]) {
	for (const difficulty of [0, 1, 64, 65, 1000]) {
		solutions.push({
			nonce,
			challenge,
			difficulty,
			result: outcome(() => validateSolution(nonce, challenge, difficulty)),
		});
	}
}
// A challenge each odd nonce solves at difficulty 2 only when written as JS writes it, so a
// different number format fails these (but for a 1 in 256 chance).
for (const nonce of [-0, 1.5, 1e21, 1e-7, 2 ** 53, 0.1 + 0.2, 1e300, -1e-300]) {
	let suffix = 0;
	while (!validateSolution(nonce, `${challenge}${suffix}`, 2)) suffix++;
	solutions.push({
		nonce,
		challenge: `${challenge}${suffix}`,
		difficulty: 2,
		result: outcome(() => validateSolution(nonce, `${challenge}${suffix}`, 2)),
	});
}
for (const text of ["", "ü", "😀___x"]) {
	solutions.push({
		nonce: 7,
		challenge: text,
		difficulty: 1,
		result: outcome(() => validateSolution(7, text, 1)),
	});
}

const signer = getPair("//Alice");
const other = getPair("//Bob");
const messages: string[] = [
	challenge,
	"1700000000000",
	"",
	"ü😀",
	"0x1234",
	"x".repeat(300),
];
const signatures: Json[] = [];
for (const message of messages) {
	const good = u8aToHex(signer.sign(message));
	const tampered = `${good.slice(0, -2)}${good.endsWith("00") ? "01" : "00"}`;
	const cases: [string, string, string | undefined][] = [
		[good, signer.address, "challenge"],
		[good, signer.address, undefined],
		[good, u8aToHex(signer.publicKey), "timestamp"],
		[tampered, signer.address, "challenge"],
		[good, other.address, "timestamp"],
		[u8aToHex(other.sign(message)), signer.address, "challenge"],
		["0x1234", signer.address, "challenge"],
		["not hex", signer.address, "challenge"],
		[good, "not an address", "challenge"],
		[good, "", "challenge"],
	];
	for (const [signature, address, type] of cases) {
		signatures.push({
			message,
			signature,
			address,
			signatureType: type ?? null,
			result: outcome(() =>
				checkPowSignature(message, signature, address, type),
			),
		});
	}
}

const coordCases: ([number, number][][] | undefined)[] = [
	undefined,
	[],
	[[]],
	[[[0, 0]]],
	[
		[
			[0, 0],
			[0, 0],
		],
		[[0, 0]],
	],
	[[[0, 1]]],
	[[[0, 0]], []],
	[[[-0, 0]]],
	[[[0.5, 0]]],
];
const coords: Json[] = coordCases.map((c) => ({
	coords: (c ?? null) as Json,
	result: isCoordsAllZero(c),
}));

const userAgents: string[] = [
	"",
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119",
	"Mozilla/5.0 (Linux; Android 14; Pixel 7) Mobile",
	"IPOD touch",
	"mac os x",
	"MacOS X",
	"Macintoſh",
];
const platforms: Json[] = [];
for (const userAgent of userAgents) {
	for (const webView of [false, true]) {
		for (const signals of [
			{},
			{ carrierNetwork: true, tcpMss: 1400 },
			{ headers: { "sec-ch-ua-mobile": "?1" } },
			{ deviceCapability: "touch", touchEventCount: 3 },
		]) {
			platforms.push({
				userAgent,
				webView,
				signals: signals as Json,
				result: derivePlatform(userAgent, webView, signals) as unknown as Json,
			});
		}
	}
}

const requestedTypes: ConcreteCaptchaType[] = [
	CaptchaType.pow,
	CaptchaType.image,
	CaptchaType.puzzle,
	CaptchaType.iconOrder,
];
const coercions: Json[] = [];
for (const requested of requestedTypes) {
	coercions.push({
		requested,
		allowed: null,
		result: coerceToEnabledCaptchaType(requested, undefined),
	});
	for (let mask = 0; mask < 8; mask++) {
		const allowed: IFrictionlessTypes = {
			image: (mask & 1) !== 0,
			puzzle: (mask & 2) !== 0,
			iconOrder: (mask & 4) !== 0,
		};
		coercions.push({
			requested,
			allowed: allowed as unknown as Json,
			result: coerceToEnabledCaptchaType(requested, allowed),
		});
	}
}

const difficulties: Json[] = [];
for (const level of [
	-1,
	0,
	0.5,
	1,
	2,
	3,
	4,
	5,
	Number.NaN,
	Number.POSITIVE_INFINITY,
]) {
	for (const maxLevel of [undefined, 0, 1, 2, 4, 9]) {
		for (const holeDarken of [0.4, 0.97, 1.5]) {
			const sampled = samplePuzzleDifficulty(level, holeDarken, maxLevel);
			difficulties.push({
				level: Number.isFinite(level) ? level : String(level),
				maxLevel: maxLevel ?? null,
				holeDarken,
				result: {
					level: sampled.level,
					pieceScale: sampled.puzzle.pieceScale as unknown as Json,
					decoyHoleDarken:
						holeDarken >= 0.96
							? (sampled.puzzle.decoyHoleDarken ?? null)
							: null,
				},
			});
		}
	}
}

const out = fileURLToPath(
	new URL("pow-solution-vectors.json", import.meta.url),
);
writeFileSync(
	out,
	`${JSON.stringify({ node: process.version, solutions, signatures, coords, platforms, coercions, difficulties }, null, "\t")}\n`,
);
console.log(`wrote ${out}`);
