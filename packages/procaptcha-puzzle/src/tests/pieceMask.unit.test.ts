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

import { ApiParams, type GetPuzzleCaptchaResponse } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import {
	liftChallengePiece,
	unscramblePieceMask,
} from "../services/pieceMask.js";

// Produced by the provider's `scramblePieceMask` from a 32-byte key of 0x11,
// challenge "1700000000000___user___dapp" and the mask 0..99; its unit test
// pins the same values.
const NETWORK_KEY = "11".repeat(32);
const SCRAMBLED =
	"ZJLQGNjoEVqPK46IKKyELIQD9RKvv6omH8OF5fVQzYZwyNzBAZGp6J7MdcUfu160HiCB+9UvCDtWTqCbJ2CGVInskIp3DMm0dTan3EY2YuKMjECsxrwPkU3YbiCwWJhIhV2KBg==";
const CHECK = "bce0aff19cf5aa6a";
const MASK = Uint8Array.from({ length: 100 }, (_, i) => i);

const challenge = (
	fields: Partial<GetPuzzleCaptchaResponse>,
): GetPuzzleCaptchaResponse => ({
	[ApiParams.status]: "ok",
	[ApiParams.challenge]: "1700000000000___user___dapp",
	[ApiParams.background]: "data:image/webp;base64,",
	[ApiParams.pieceSize]: 10,
	[ApiParams.originX]: 50,
	[ApiParams.originY]: 50,
	[ApiParams.timestamp]: "0",
	[ApiParams.signature]: { [ApiParams.provider]: { challenge: "sig" } },
	...fields,
});

describe("unscramblePieceMask", () => {
	it("recovers the mask the provider scrambled", async () => {
		expect(
			await unscramblePieceMask(
				NETWORK_KEY,
				"1700000000000___user___dapp",
				SCRAMBLED,
				CHECK,
			),
		).toEqual(MASK);
	});

	it("refuses a key minted for another network", async () => {
		expect(
			await unscramblePieceMask(
				"22".repeat(32),
				"1700000000000___user___dapp",
				SCRAMBLED,
				CHECK,
			),
		).toBeUndefined();
	});

	it("refuses the right key on a different challenge", async () => {
		expect(
			await unscramblePieceMask(
				NETWORK_KEY,
				"1700000000001___user___dapp",
				SCRAMBLED,
				CHECK,
			),
		).toBeUndefined();
	});
});

describe("liftChallengePiece", () => {
	it("passes a challenge that already carries its piece through", async () => {
		const served = challenge({ [ApiParams.piece]: "data:image/webp;base64,p" });
		expect(await liftChallengePiece(served, undefined)).toEqual(served);
	});

	it("gives up on a scrambled piece without a key", async () => {
		const scrambled = challenge({
			[ApiParams.pieceMask]: SCRAMBLED,
			[ApiParams.pieceMaskCheck]: CHECK,
		});
		expect(await liftChallengePiece(scrambled, undefined)).toBeUndefined();
	});

	it("gives up on a scrambled piece the key does not fit", async () => {
		const scrambled = challenge({
			[ApiParams.pieceMask]: SCRAMBLED,
			[ApiParams.pieceMaskCheck]: CHECK,
		});
		expect(
			await liftChallengePiece(scrambled, "22".repeat(32)),
		).toBeUndefined();
	});
});
