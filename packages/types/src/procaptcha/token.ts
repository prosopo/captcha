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

import { hexToU8a } from "@polkadot/util";
import { u8aToHex } from "@prosopo/util";
import { Option, Struct, str, u32 } from "scale-ts";
import { number, object, string, type infer as zInfer } from "zod";
import { ApiParams } from "../api/params.js";
import { CaptchaTypeSchema } from "../client/captchaType/captchaType.js";

export const RequestHashSignatureSchema = object({
	[ApiParams.requestHash]: string(),
});

export type RequestHashSignature = zInfer<typeof RequestHashSignatureSchema>;

export const ChallengeSignatureSchema = object({
	[ApiParams.challenge]: string(),
});

export type ChallengeSignature = zInfer<typeof ChallengeSignatureSchema>;

export const TimestampSignatureSchema = object({
	[ApiParams.timestamp]: string(),
});

export type TimestampSignature = zInfer<typeof TimestampSignatureSchema>;

export const SignatureTypesSchema = object({
	[ApiParams.challenge]: string().optional(),
	[ApiParams.requestHash]: string().optional(),
	[ApiParams.timestamp]: string().optional(),
});

export const ProcaptchaOutputSchema = object({
	[ApiParams.commitmentId]: string().optional(),
	[ApiParams.providerUrl]: string().optional(),
	[ApiParams.dapp]: string(),
	[ApiParams.user]: string(),
	[ApiParams.challenge]: string().optional(),
	[ApiParams.nonce]: number().optional(),
	[ApiParams.timestamp]: string(),
	[ApiParams.signature]: object({
		[ApiParams.provider]: SignatureTypesSchema,
		[ApiParams.user]: SignatureTypesSchema,
	}),
	// Declares which captcha flow minted the token so @prosopo/server can
	// dispatch to the correct verify endpoint. Optional for backwards
	// compatibility with tokens minted before this field existed — see
	// the v1/v2 codec split below.
	[ApiParams.captchaType]: CaptchaTypeSchema.optional(),
});

/**
 * The information produced by procaptcha on completion of the captcha process,
 * whether verified by smart contract, a pending commitment in the cache of a
 * provider or a captcha challenge.
 */
export type ProcaptchaOutput = zInfer<typeof ProcaptchaOutputSchema>;

// Frozen v1 layout — kept so decodeProcaptchaOutput can still parse tokens
// minted by client bundles that shipped before captchaType was added. DO NOT
// modify: existing tokens on the wire are encoded against this exact struct
// and changing the field order or types would break decode round-trip.
export const ProcaptchaTokenCodecV1 = Struct({
	[ApiParams.commitmentId]: Option(str),
	[ApiParams.providerUrl]: Option(str),
	[ApiParams.dapp]: str,
	[ApiParams.user]: str,
	[ApiParams.challenge]: Option(str),
	[ApiParams.nonce]: Option(u32),
	[ApiParams.timestamp]: str,
	[ApiParams.signature]: Struct({
		[ApiParams.provider]: Struct({
			[ApiParams.challenge]: Option(str),
			[ApiParams.requestHash]: Option(str),
		}),
		[ApiParams.user]: Struct({
			[ApiParams.timestamp]: Option(str),
			[ApiParams.requestHash]: Option(str),
		}),
	}),
});

/**
 * The codec for encoding and decoding the procaptcha output to a hex string.
 *
 * v2 appends `captchaType: Option(str)` to the v1 layout so @prosopo/server
 * can dispatch verify calls to the right endpoint (puzzle/pow/image). Legacy
 * tokens minted against v1 remain decodable via the fallback in
 * decodeProcaptchaOutput.
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
			[ApiParams.challenge]: Option(str),
			[ApiParams.requestHash]: Option(str),
		}),
		[ApiParams.user]: Struct({
			[ApiParams.timestamp]: Option(str),
			[ApiParams.requestHash]: Option(str),
		}),
	}),
	[ApiParams.captchaType]: Option(str),
});

export const ProcaptchaTokenSpec = string().startsWith("0x");
export type ProcaptchaToken = zInfer<typeof ProcaptchaTokenSpec>;

export const encodeProcaptchaOutput = (
	procaptchaOutput: ProcaptchaOutput,
): ProcaptchaToken => {
	return u8aToHex(
		ProcaptchaTokenCodec.enc({
			[ApiParams.commitmentId]: undefined,
			[ApiParams.providerUrl]: undefined,
			[ApiParams.challenge]: undefined,
			[ApiParams.nonce]: undefined,
			[ApiParams.captchaType]: undefined,
			// override any optional fields by spreading the procaptchaOutput
			...procaptchaOutput,
			signature: {
				provider: {
					challenge:
						procaptchaOutput.signature.provider?.challenge || undefined,
					requestHash:
						procaptchaOutput.signature.provider?.requestHash || undefined,
				},
				user: {
					timestamp: procaptchaOutput.signature.user?.timestamp || undefined,
					requestHash:
						procaptchaOutput.signature.user?.requestHash || undefined,
				},
			},
		}),
	);
};

export const decodeProcaptchaOutput = (
	procaptchaToken: ProcaptchaToken,
): ProcaptchaOutput => {
	const bytes = hexToU8a(procaptchaToken);
	// Try the current (v2) codec first; fall back to the frozen v1 layout for
	// tokens minted by older client bundles that predate the captchaType field.
	// Split the two failure modes carefully: catch only the v2 decode step
	// (binary layout mismatch → try v1), NOT the schema parse (unknown enum
	// values / malformed shape must surface as ZodError, not be silently
	// dropped by the fallback).
	let v2Decoded: unknown;
	try {
		v2Decoded = ProcaptchaTokenCodec.dec(bytes);
	} catch {
		return ProcaptchaOutputSchema.parse(ProcaptchaTokenCodecV1.dec(bytes));
	}
	return ProcaptchaOutputSchema.parse(v2Decoded);
};
