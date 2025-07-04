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
	});
});
