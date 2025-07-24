// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { hexToU8a } from "@polkadot/util";
import { describe, expect, it } from "vitest";
import { secp256k1Compress } from "./index.js";

describe("secp256k1Compress", (): void => {
	for (const onlyJs of [false, true]) {
		describe(`onlyJs=${(onlyJs && "true") || "false"}`, (): void => {
			it("returns a compressed key as-is", (): void => {
				expect(
					secp256k1Compress(
						hexToU8a(
							"0x03b9dc646dd71118e5f7fda681ad9eca36eb3ee96f344f582fbe7b5bcdebb13077",
						),
						onlyJs,
					),
				).toEqual(
					hexToU8a(
						"0x03b9dc646dd71118e5f7fda681ad9eca36eb3ee96f344f582fbe7b5bcdebb13077",
					),
				);
			});

			it("compresses a known key", (): void => {
				expect(
					secp256k1Compress(
						hexToU8a(
							"0x04b9dc646dd71118e5f7fda681ad9eca36eb3ee96f344f582fbe7b5bcdebb1307763fe926c273235fd979a134076d00fd1683cbd35868cb485d4a3a640e52184af",
						),
						onlyJs,
					),
				).toEqual(
					hexToU8a(
						"0x03b9dc646dd71118e5f7fda681ad9eca36eb3ee96f344f582fbe7b5bcdebb13077",
					),
				);
			});
		});
	}
});
