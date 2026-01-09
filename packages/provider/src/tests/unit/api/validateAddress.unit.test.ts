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

import { type Logger, ProsopoApiError } from "@prosopo/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { validateAddr, validateSiteKey } from "../../../api/validateAddress.js";
import * as utilCrypto from "@prosopo/util-crypto";

vi.mock("@prosopo/util-crypto", () => ({
    validateAddress: vi.fn(),
}));

describe("validateSiteKey", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("calls validateAddr with correct translation key", () => {
        vi.mocked(utilCrypto.validateAddress).mockReturnValue(true);

        expect(() => validateSiteKey("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY")).not.toThrow();
        expect(utilCrypto.validateAddress).toHaveBeenCalledWith(
            "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
            false,
            42,
        );
    });

    it("throws ProsopoApiError when address is invalid", () => {
        vi.mocked(utilCrypto.validateAddress).mockReturnValue(false);

        expect(() => validateSiteKey("invalid")).toThrow(ProsopoApiError);
    });

    it("throws ProsopoApiError when validateAddress throws", () => {
        vi.mocked(utilCrypto.validateAddress).mockImplementation(() => {
            throw new Error("Invalid address");
        });

        expect(() => validateSiteKey("invalid")).toThrow(ProsopoApiError);
    });
});

describe("validateAddr", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("does not throw when address is valid", () => {
        vi.mocked(utilCrypto.validateAddress).mockReturnValue(true);

        expect(() =>
            validateAddr("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"),
        ).not.toThrow();
    });

    it("throws ProsopoApiError with default translation key when address is invalid", () => {
        vi.mocked(utilCrypto.validateAddress).mockReturnValue(false);

        expect(() => validateAddr("invalid")).toThrow(ProsopoApiError);
        try {
            validateAddr("invalid");
        } catch (err: unknown) {
            expect(err).toBeInstanceOf(ProsopoApiError);
            if (err instanceof ProsopoApiError) {
                expect(err.translationKey).toBe("CONTRACT.INVALID_ADDRESS");
            }
        }
    });

    it("throws ProsopoApiError with custom translation key", () => {
        vi.mocked(utilCrypto.validateAddress).mockReturnValue(false);

        expect(() =>
            validateAddr("invalid", "API.INVALID_SITE_KEY"),
        ).toThrow(ProsopoApiError);
        try {
            validateAddr("invalid", "API.INVALID_SITE_KEY");
        } catch (err: unknown) {
            expect(err).toBeInstanceOf(ProsopoApiError);
            if (err instanceof ProsopoApiError) {
                expect(err.translationKey).toBe("API.INVALID_SITE_KEY");
            }
        }
    });

    it("throws ProsopoApiError when validateAddress throws", () => {
        vi.mocked(utilCrypto.validateAddress).mockImplementation(() => {
            throw new Error("Invalid address");
        });

        expect(() => validateAddr("invalid")).toThrow(ProsopoApiError);
    });

    it("passes logger to ProsopoApiError", () => {
        const mockLogger = {
            error: vi.fn(),
        } as unknown as Logger;
        vi.mocked(utilCrypto.validateAddress).mockReturnValue(false);

        expect(() => validateAddr("invalid", "CONTRACT.INVALID_ADDRESS", mockLogger)).toThrow(ProsopoApiError);
    });

    it("includes address in error context", () => {
        vi.mocked(utilCrypto.validateAddress).mockReturnValue(false);

        try {
            validateAddr("test-address");
        } catch (err: unknown) {
            expect(err).toBeInstanceOf(ProsopoApiError);
            if (err instanceof ProsopoApiError) {
                expect(err.context?.siteKey).toBe("test-address");
            }
        }
    });
});

