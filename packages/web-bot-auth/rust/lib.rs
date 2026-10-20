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

//! Web Bot Auth (RFC 9421 HTTP Message Signatures, draft-meunier-web-bot-auth)
//! verification: Signature-Agent / Signature-Input / Signature parsing, the
//! signature base, Ed25519 verification and a cached JWKS directory resolver.

mod base64;
mod ed25519;
mod js;
mod jwks_resolver;
mod parse_signature_agent;
mod signature_base;
mod structured_fields;
mod verify;

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod tests;

pub use base64::{decode_base64, decode_base64_url, Base64Error};
pub use jwks_resolver::{
    clear_jwks_cache, global_jwks_resolver, jwks_cache_size, resolve_jwks_from_signature_agent,
    BoxFuture, ChunkedBody, Clock, Jwk, JwksBody, JwksError, JwksFetch, JwksFetchError,
    JwksResolver, JwksResolverOptions, JwksResponse, ReqwestJwksFetch,
};
pub use parse_signature_agent::{
    normalise_signature_agent_url, parse_signature_agent_header, InvalidUrl,
};
pub use signature_base::{build_signature_base, SignatureBaseInput, UnsupportedCoveredComponent};
pub use structured_fields::{
    parse_signature, parse_signature_input, ParamValue, Params, SignatureInputEntry,
};
pub use verify::{
    verify_web_bot_auth, HeaderLookup, VerifiableRequest, VerifyError, VerifyFailReason,
    VerifyResult,
};
