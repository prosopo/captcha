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

import { createDecipheriv, createHmac } from "node:crypto";
import { getPair } from "@prosopo/keyring";
import { PUZZLE_KEY_HEADER } from "@prosopo/types";
import { getIPAddress } from "@prosopo/util";
import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import {
	attachPuzzleKey,
	networkPuzzleKey,
	puzzleKeySecret,
	scramblePieceMask,
} from "../../../../tasks/puzzle/puzzleKey.js";

const SECRET = Buffer.alloc(32, 7);

const keyFor = (ip: string): string =>
	networkPuzzleKey(getIPAddress(ip), SECRET).toString("hex");

describe("networkPuzzleKey", () => {
	it("gives one key to an IPv4 /24 and another to the next /24", () => {
		expect(keyFor("203.0.113.5")).toBe(keyFor("203.0.113.250"));
		expect(keyFor("203.0.113.5")).not.toBe(keyFor("203.0.114.5"));
	});

	it("gives one key to an IPv6 /64 and another to the next /64", () => {
		expect(keyFor("2001:db8:1:2::1")).toBe(keyFor("2001:db8:1:2:ffff::9"));
		expect(keyFor("2001:db8:1:2::1")).not.toBe(keyFor("2001:db8:1:3::1"));
	});

	it("treats an IPv4-mapped IPv6 address as its IPv4 network", () => {
		expect(keyFor("::ffff:203.0.113.5")).toBe(keyFor("203.0.113.9"));
	});

	it("depends on the provider's secret", () => {
		const address = getIPAddress("203.0.113.5");
		expect(networkPuzzleKey(address, SECRET)).not.toEqual(
			networkPuzzleKey(address, Buffer.alloc(32, 8)),
		);
	});
});

describe("puzzleKeySecret", () => {
	it("is the same in every container holding the provider's pair", () => {
		expect(puzzleKeySecret(getPair("//Alice"))).toEqual(
			puzzleKeySecret(getPair("//Alice")),
		);
	});

	it("differs between providers", () => {
		expect(puzzleKeySecret(getPair("//Alice"))).not.toEqual(
			puzzleKeySecret(getPair("//Bob")),
		);
	});
});

describe("scramblePieceMask", () => {
	const networkKey = Buffer.alloc(32, 0x11);
	const mask = Buffer.from(Array.from({ length: 100 }, (_, i) => i));

	// The widget's unscramble test decodes this same vector with WebCrypto.
	it("matches the shared test vector", () => {
		expect(
			scramblePieceMask(mask, networkKey, "1700000000000___user___dapp"),
		).toEqual({
			mask: "ZJLQGNjoEVqPK46IKKyELIQD9RKvv6omH8OF5fVQzYZwyNzBAZGp6J7MdcUfu160HiCB+9UvCDtWTqCbJ2CGVInskIp3DMm0dTan3EY2YuKMjECsxrwPkU3YbiCwWJhIhV2KBg==",
			check: "bce0aff19cf5aa6a",
		});
	});

	it("unscrambles with the challenge key and no other", () => {
		const { mask: scrambled } = scramblePieceMask(
			mask,
			networkKey,
			"1700000000000___user___dapp",
		);
		const unscramble = (challenge: string): Buffer => {
			const key = createHmac("sha256", networkKey).update(challenge).digest();
			const decipher = createDecipheriv(
				"aes-128-ctr",
				key.subarray(0, 16),
				Buffer.concat([key.subarray(16, 24), Buffer.alloc(8)]),
			);
			return Buffer.concat([
				decipher.update(Buffer.from(scrambled, "base64")),
				decipher.final(),
			]);
		};
		expect(unscramble("1700000000000___user___dapp")).toEqual(mask);
		expect(unscramble("challenge-2")).not.toEqual(mask);
	});

	it("scrambles the same mask differently for each challenge", () => {
		expect(scramblePieceMask(mask, networkKey, "a").mask).not.toBe(
			scramblePieceMask(mask, networkKey, "b").mask,
		);
	});
});

describe("attachPuzzleKey", () => {
	const responseSpy = () => {
		const setHeader = vi.fn<Response["setHeader"]>();
		const res: Pick<Response, "setHeader"> = { setHeader };
		return { res, setHeader };
	};

	it("sets the key header for a parseable address", () => {
		const { res, setHeader } = responseSpy();
		attachPuzzleKey(res, "203.0.113.5", SECRET);
		expect(setHeader).toHaveBeenCalledWith(
			PUZZLE_KEY_HEADER,
			expect.stringMatching(/^[0-9a-f]{64}$/),
		);
	});

	it("sets nothing for an address that does not parse", () => {
		const { res, setHeader } = responseSpy();
		attachPuzzleKey(res, "not-an-ip", SECRET);
		expect(setHeader).not.toHaveBeenCalled();
	});
});
