// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { randomAsNumber } from "./index.js";

describe("randomAsNumber", (): void => {
	it("generates subsequent non-matching numbers", (): void => {
		expect(randomAsNumber()).not.toEqual(randomAsNumber());
	});
});
