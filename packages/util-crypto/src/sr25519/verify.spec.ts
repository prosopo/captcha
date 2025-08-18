// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { stringToU8a } from "@polkadot/util";
import { describe, expect, it } from "vitest";
import { randomAsU8a } from "../random/asU8a.js";
import { sr25519FromSeed } from "./pair/fromSeed.js";
import { sr25519Sign } from "./sign.js";
import { sr25519Verify } from "./verify.js";

const MESSAGE = stringToU8a("this is a message");

describe("verify", (): void => {
	it("can sign and verify a message", (): void => {
		const pair = sr25519FromSeed(randomAsU8a());
		const signature = sr25519Sign(MESSAGE, pair);

		expect(sr25519Verify(MESSAGE, signature, pair.publicKey)).toBe(true);
	});

	it("throws error when publicKey lengths do not match", (): void => {
		expect(() =>
			sr25519Verify(
				new Uint8Array([0x61, 0x62, 0x63, 0x64]),
				new Uint8Array(64),
				new Uint8Array(31),
			),
		).toThrow(/Invalid publicKey/);
	});

	it("throws error when signature lengths do not match", (): void => {
		expect(() =>
			sr25519Verify(
				new Uint8Array([0x61, 0x62, 0x63, 0x64]),
				new Uint8Array(65),
				new Uint8Array(32),
			),
		).toThrow(/Invalid signature/);
	});
});
