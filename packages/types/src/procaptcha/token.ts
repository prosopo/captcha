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
import { hexToU8a, u8aToHex } from "@polkadot/util";
import { Option, Struct, str, u32, u64 } from "scale-ts";
import { bigint, number, object, string, type infer as zInfer } from "zod";
import { ApiParams } from "../api/params.js";

export const ProcaptchaOutputSchema = object({
  [ApiParams.commitmentId]: string().optional(),
  [ApiParams.providerUrl]: string().optional(),
  [ApiParams.dapp]: string(),
  [ApiParams.user]: string(),
  [ApiParams.challenge]: string().optional(),
  [ApiParams.nonce]: number().optional(),
  [ApiParams.timestamp]: string(),
  [ApiParams.signature]: object({
    [ApiParams.provider]: object({
      [ApiParams.timestamp]: string(),
    }),
    [ApiParams.user]: object({
      [ApiParams.timestamp]: string(),
    }).optional(),
  }),
});

/**
 * The information produced by procaptcha on completion of the captcha process,
 * whether verified by smart contract, a pending commitment in the cache of a
 * provider or a captcha challenge.
 */
export type ProcaptchaOutput = zInfer<typeof ProcaptchaOutputSchema>;

/**
 * The codec for encoding and decoding the procaptcha output to a hex string.
 */
export const ProcaptchaTokenCodec = Struct({
  [ApiParams.commitmentId]: Option(str),
  [ApiParams.providerUrl]: Option(str),
  [ApiParams.dapp]: str,
  [ApiParams.user]: str,
  [ApiParams.challenge]: Option(str),
  [ApiParams.nonce]: Option(u32),
  [ApiParams.timestamp]: str,
  [ApiParams.signature]: Struct({
    [ApiParams.provider]: Struct({
      [ApiParams.timestamp]: str,
    }),
    [ApiParams.user]: Option(
      Struct({
        [ApiParams.timestamp]: str,
      }),
    ),
  }),
});

export const ProcaptchaTokenSpec = string().startsWith("0x");
export type ProcaptchaToken = zInfer<typeof ProcaptchaTokenSpec>;

export const encodeProcaptchaOutput = (
  procaptchaOutput: ProcaptchaOutput,
): ProcaptchaToken => {
  console.log("encoding", procaptchaOutput);
  return u8aToHex(
    ProcaptchaTokenCodec.enc({
      [ApiParams.commitmentId]: undefined,
      [ApiParams.providerUrl]: undefined,
      [ApiParams.challenge]: undefined,
      [ApiParams.nonce]: undefined,
      // override any optional fields by spreading the procaptchaOutput
      ...procaptchaOutput,
      signature: {
        ...procaptchaOutput.signature,
        user: {
          timestamp: procaptchaOutput.signature.user?.timestamp || "",
        },
      },
    }),
  );
};

export const decodeProcaptchaOutput = (
  procaptchaToken: ProcaptchaToken,
): ProcaptchaOutput => {
  return ProcaptchaOutputSchema.parse(
    ProcaptchaTokenCodec.dec(hexToU8a(procaptchaToken)),
  );
};
