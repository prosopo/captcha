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

import { describe, expect, it } from "vitest";
import { errorCodeForReason } from "../../../api/errorCodeForReason.js";

describe("errorCodeForReason", () => {
	it("strips the namespace from a reason that names a code", () => {
		expect(errorCodeForReason("API.VPN_BLOCKED")).toBe("VPN_BLOCKED");
		expect(errorCodeForReason("CAPTCHA.NO_SESSION_FOUND")).toBe(
			"NO_SESSION_FOUND",
		);
	});

	it("maps a renamed reason to its code", () => {
		expect(errorCodeForReason("API.INVALID_SITE_KEY")).toBe("SITE_KEY_INVALID");
		expect(errorCodeForReason("API.UNAUTHORIZED_ORIGIN_URL")).toBe(
			"ORIGIN_NOT_ALLOWED",
		);
		expect(errorCodeForReason("API.BAD_REQUEST")).toBe("INVALID_REQUEST");
	});

	it("accepts a bare code", () => {
		expect(errorCodeForReason("TOR_BLOCKED")).toBe("TOR_BLOCKED");
	});

	it("falls back for a missing or unknown reason", () => {
		expect(errorCodeForReason(undefined)).toBe("INVALID_REQUEST");
		expect(errorCodeForReason("API.SOMETHING_ELSE")).toBe("INVALID_REQUEST");
		expect(errorCodeForReason("API.SOMETHING_ELSE", "FORBIDDEN")).toBe(
			"FORBIDDEN",
		);
		expect(errorCodeForReason("API.toString")).toBe("INVALID_REQUEST");
	});
});
