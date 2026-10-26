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

// Web Bot Auth (RFC 9421 HTTP Message Signatures, draft-meunier-web-bot-auth)
// verifier for Prosopo. Accepts both the bare-quoted-string Signature-Agent
// header form (OpenAI) and the RFC 8941 dictionary form (Google). Fetches
// the signer's JWKS from the well-known directory and caches per Cache-Control
// (1 h default fallback).

export {
	verifyWebBotAuth,
	type VerifyResult,
	type VerifyFailReason,
	type VerifiableRequest,
} from "./verify.js";
export {
	resolveJwksFromSignatureAgent,
	clearJwksCache,
	type Jwk,
	type JwksResolverOptions,
	type JwksFetch,
} from "./jwksResolver.js";
export {
	parseSignatureAgentHeader,
	normaliseSignatureAgentUrl,
} from "./parseSignatureAgent.js";
export {
	parseSignatureInput,
	parseSignature,
	type SignatureInputEntry,
	type ParamValue,
} from "./structuredFields.js";
export {
	buildSignatureBase,
	type SignatureBaseInput,
} from "./signatureBase.js";
