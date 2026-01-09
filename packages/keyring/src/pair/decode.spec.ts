// Copyright 2017-2025 @polkadot/keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { createTestPairs } from "../keyring/testingPairs.js";

const keyring = createTestPairs({ type: "sr25519" }, false);

describe("decode", (): void => {
	it("fails when no data provided", (): void => {
		expect((): void => keyring.alice.decodePkcs8()).toThrow(
			/No encrypted data available/,
		);
	});

	it("returns correct publicKey from encoded", (): void => {
		const PASS = "testing";

		expect((): void =>
			keyring.alice.decodePkcs8(PASS, keyring.alice.encodePkcs8(PASS)),
		).not.toThrow();
	}, 30000);

	it("throws error for invalid encoding header", (): void => {
		// Create malformed data with invalid header
		const validEncoded = keyring.alice.encodePkcs8();
		const invalidEncoded = new Uint8Array(validEncoded);
		// Corrupt the header (first few bytes)
		invalidEncoded[0] = invalidEncoded[0] === 0 ? 255 : 0;

		expect(() => {
			keyring.alice.decodePkcs8("testing", invalidEncoded);
		}).toThrow("Invalid encoding header found in body");
	});

	it("throws error for invalid encoding divider in generation 1/2 format", (): void => {
		// Create data that triggers the generation 1/2 path by having invalid divider
		const validEncoded = keyring.alice.encodePkcs8();
		// Modify the divider section to trigger the error path
		const invalidEncoded = new Uint8Array(validEncoded);
		// Find and corrupt the divider bytes (this is approximate)
		const dividerStart = 16 + 32 + 1; // header + secret + divider position
		if (dividerStart + 4 < invalidEncoded.length) {
			for (let i = 0; i < 4; i++) {
				invalidEncoded[dividerStart + i] = invalidEncoded[dividerStart + i] === 0 ? 255 : 0;
			}
		}

		expect(() => {
			keyring.alice.decodePkcs8("testing", invalidEncoded);
		}).toThrow("Invalid encoding divider found in body");
	});
});
