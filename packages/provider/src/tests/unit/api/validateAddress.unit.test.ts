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

import { isProsopoError } from "@prosopo/common";
import { validateAddress } from "@prosopo/util-crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateAddr, validateSiteKey } from "../../../api/validateAddress.js";

vi.mock("@prosopo/util-crypto", () => ({
	validateAddress: vi.fn<typeof validateAddress>(),
}));

const address = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

const thrown = (fn: () => void): unknown => {
	try {
		fn();
	} catch (err) {
		return err;
	}
	throw new Error("expected a throw");
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe("validateSiteKey", () => {
	it("accepts a valid site key", () => {
		vi.mocked(validateAddress).mockReturnValue(true);

		expect(() => validateSiteKey(address)).not.toThrow();
		expect(validateAddress).toHaveBeenCalledWith(address, false, 42);
	});

	it("rejects an invalid site key as SITE_KEY_INVALID", () => {
		vi.mocked(validateAddress).mockReturnValue(false);

		const err = thrown(() => validateSiteKey("invalid"));

		expect(isProsopoError(err, "SITE_KEY_INVALID")).toBe(true);
	});
});

describe("validateAddr", () => {
	it("accepts a valid address", () => {
		vi.mocked(validateAddress).mockReturnValue(true);

		expect(() => validateAddr(address)).not.toThrow();
	});

	it("rejects an invalid address as INVALID_REQUEST by default", () => {
		vi.mocked(validateAddress).mockReturnValue(false);

		const err = thrown(() => validateAddr("invalid"));

		if (!isProsopoError(err, "INVALID_REQUEST")) throw err;
		expect(err.errorSite).toBe("PROV-35");
		expect(err.context.siteKey).toBe("invalid");
		expect(err.cause).toBeUndefined();
	});

	it("uses the given code", () => {
		vi.mocked(validateAddress).mockReturnValue(false);

		expect(
			isProsopoError(
				thrown(() => validateAddr("x", "FORBIDDEN")),
				"FORBIDDEN",
			),
		).toBe(true);
	});

	it("keeps the validator's exception as the cause", () => {
		const failure = new Error("bad checksum");
		vi.mocked(validateAddress).mockImplementation(() => {
			throw failure;
		});

		const err = thrown(() => validateAddr("invalid"));

		if (!isProsopoError(err)) throw err;
		expect(err.cause).toBe(failure);
	});

	it("handles an empty address", () => {
		vi.mocked(validateAddress).mockReturnValue(false);

		expect(isProsopoError(thrown(() => validateAddr("")))).toBe(true);
		expect(validateAddress).toHaveBeenCalledWith("", false, 42);
	});
});
