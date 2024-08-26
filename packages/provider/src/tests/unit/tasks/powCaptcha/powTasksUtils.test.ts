// Copyright 2021-2024 Prosopo (UK) Ltd.
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

import { signatureVerify } from "@polkadot/util-crypto";
import { ProsopoContractError } from "@prosopo/common";
import { verifyRecency } from "@prosopo/contract";
import { describe, expect, it, vi } from "vitest";
import {
  checkPowSignature,
  validateSolution,
} from "../../../../tasks/powCaptcha/powTasksUtils.js";

vi.mock("@polkadot/util-crypto", () => ({
  signatureVerify: vi.fn(),
}));

vi.mock("@prosopo/contract", () => ({
  verifyRecency: vi.fn(),
}));

describe("Validation Functions", () => {
  describe("validateSolution", () => {
    it("should return true for a valid solution", () => {
      const nonce = 377;
      const challenge =
        "6678154___aZZW9CeVFStJw3si91CXBqaEsGR1sk6h1bBEecJ4EBaSgsx___5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw";
      const difficulty = 4;
      const validSolution = validateSolution(nonce, challenge, difficulty);
      expect(validSolution).toBe(true);
    });

    it("should return false for an invalid solution", () => {
      const nonce = 0;
      const challenge = "testChallenge";
      const difficulty = 10;
      const validSolution = validateSolution(nonce, challenge, difficulty);
      expect(validSolution).toBe(false);
    });
  });

  describe("checkPowSolution", () => {
    it("should return true for a valid solution", () => {
      const nonce = 377;
      const challenge =
        "6678154___aZZW9CeVFStJw3si91CXBqaEsGR1sk6h1bBEecJ4EBaSgsx___5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw";
      const difficulty = 4;
      expect(validateSolution(nonce, challenge, difficulty)).to.be.true;
    });

    it("should throw an error for an invalid solution", () => {
      const nonce = 0;
      const challenge = "testChallenge";
      const difficulty = 10;
      expect(validateSolution(nonce, challenge, difficulty)).to.be.false;
    });
  });

  describe("checkPowSignature", () => {
    it("should not throw an error for a valid signature", () => {
      const challenge = "testChallenge";
      const signature = "testSignature";
      const providerAddress = "testAddress";
      // biome-ignore lint/suspicious/noExplicitAny: TODO fix
      (signatureVerify as any).mockReturnValueOnce({ isValid: true });

      expect(() =>
        checkPowSignature(challenge, signature, providerAddress),
      ).not.toThrow();
    });

    it("should throw an error for an invalid signature", () => {
      const challenge = "testChallenge";
      const signature = "testSignature";
      const providerAddress = "testAddress";
      // biome-ignore lint/suspicious/noExplicitAny: TODO fix
      (signatureVerify as any).mockReturnValueOnce({ isValid: false });

      expect(() =>
        checkPowSignature(challenge, signature, providerAddress),
      ).toThrow(
        new ProsopoContractError("GENERAL.INVALID_SIGNATURE", {
          context: {
            ERROR: "Provider signature is invalid for this message",
            failedFuncName: "checkPowSignature",
            signature,
          },
        }),
      );
    });
  });
});
