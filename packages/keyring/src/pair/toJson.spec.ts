// Copyright 2017-2025 @polkadot/keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { createTestPairs } from "../keyring/testingPairs.js";

const keyring = createTestPairs({ type: "sr25519" }, false);

describe("toJson", (): void => {
	it("creates an unencoded output with no passphrase", (): void => {
		expect(keyring.alice.toJson()).toMatchObject({
			address: "5Engs9f8Gk6JqvVWz3kFyJ8Kqkgx7pLi8C1UTcr7EZ855qBQ",
			encoded:
				"MFMCAQEwBQYDK2VwBCIEIHipoQ68w1cHP0Tju+ym3lzqc2fma5FCMXgDqwBDqTtU2pOQGFg2vA+4oVIIZMphcnOugCZhNuyAfxQ4r1OyWsahIwMhAHh9b36VcuIWVvYdPYl8NDyAyBt3Sx125cjHJVK3zLwl",
			encoding: {
				content: ["pkcs8", "sr25519"],
				type: ["none"],
				version: "3",
			},
			meta: {
				isTesting: true,
				name: "alice",
			},
		});
	});

	it("creates an encoded output with passphrase", (): void => {
		const json = keyring.alice.toJson("testing");

		expect(json.encoded).toHaveLength(268);
		expect(json).toMatchObject({
			address: "5Engs9f8Gk6JqvVWz3kFyJ8Kqkgx7pLi8C1UTcr7EZ855qBQ",
			encoding: {
				content: ["pkcs8", "sr25519"],
				type: ["scrypt", "xsalsa20-poly1305"],
				version: "3",
			},
		});
	});
});
