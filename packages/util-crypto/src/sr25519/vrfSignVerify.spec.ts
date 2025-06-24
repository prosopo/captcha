// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { stringToU8a, u8aEq } from "@polkadot/util";
import { describe, expect, it } from "vitest";
import { randomAsU8a } from "../random/asU8a.js";
import { sr25519FromSeed } from "./pair/fromSeed.js";
import { sr25519VrfSign } from "./vrfSign.js";
import { sr25519VrfVerify } from "./vrfVerify.js";

const MESSAGE = stringToU8a("this is a message");

describe("vrf sign and verify", (): void => {
	it("has 96-byte proofs", (): void => {
		const pair = sr25519FromSeed(randomAsU8a());

		expect(sr25519VrfSign(MESSAGE, pair)).toHaveLength(96);
	});

	it("signing is deterministic", (): void => {
		const pair = sr25519FromSeed(randomAsU8a());
		const proof1 = sr25519VrfSign(MESSAGE, pair);
		const proof2 = sr25519VrfSign(MESSAGE, pair);

		expect(u8aEq(proof1.subarray(0, 32), proof2.subarray(0, 32))).toBe(true);
	});

	it("can sign and verify a message", (): void => {
		const pair = sr25519FromSeed(randomAsU8a());
		const proof = sr25519VrfSign(MESSAGE, pair);

		expect(sr25519VrfVerify(MESSAGE, proof, pair.publicKey)).toBe(true);
	});

	it("can sign and verify a message (with context)", (): void => {
		const context = "my context";
		const pair = sr25519FromSeed(randomAsU8a());
		const proof = sr25519VrfSign(MESSAGE, pair, context);

		expect(sr25519VrfVerify(MESSAGE, proof, pair.publicKey, context)).toBe(
			true,
		);
	});

	it("can sign and verify a message (with context & extra)", (): void => {
		const context = "my context";
		const extra = "some extra transcript data";
		const pair = sr25519FromSeed(randomAsU8a());
		const proof = sr25519VrfSign(MESSAGE, pair, context, extra);

		expect(
			sr25519VrfVerify(MESSAGE, proof, pair.publicKey, context, extra),
		).toBe(true);
	});

	it("throws error when publicKey lengths do not match", (): void => {
		expect(() =>
			sr25519VrfVerify(
				new Uint8Array([0x61, 0x62, 0x63, 0x64]),
				new Uint8Array(96),
				new Uint8Array(31),
			),
		).toThrow(/Invalid publicKey/);
	});

	it("throws error when proof lengths do not match", (): void => {
		expect(() =>
			sr25519VrfVerify(
				new Uint8Array([0x61, 0x62, 0x63, 0x64]),
				new Uint8Array(99),
				new Uint8Array(32),
			),
		).to.throw(/Invalid vrfSign/);
	});
});
