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

//! `authMiddleware` and `verifySignature` (authMiddleware.ts): the admin routes take a JWT
//! signed by the auth account or the provider's own pair.

use crate::context::{RequestI18n, RequestLog};
use crate::errors::json_response;
use crate::replay::JwtReplayGuard;
use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::Response;
use http::header::AUTHORIZATION;
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_keyring::KeyringPair;
use prosopo_locale::{is_translation_key, I18nLookup};
use prosopo_logger::{get_logger, number_to_js_string, LogLevel, LogRecord, Logger};
use prosopo_util_crypto::js::JsonValue;
use prosopo_util_crypto::jwt::{JwtVerifyOptions, JwtVerifyResult};
use prosopo_util_crypto::u8a::hex_to_u8a;
use prosopo_util_crypto::u8a::U8aLike;
use serde_json::json;
use std::sync::Arc;

#[derive(Clone, Default)]
pub struct AuthMiddlewareOptions {
    /// Claim checks (audience, maximum lifetime) applied to every token.
    pub verify: JwtVerifyOptions,
    /// Makes a token that carries a `jti` single-use. Tokens without one are unaffected, so
    /// existing issuers keep working until they add one.
    pub replay_guard: Option<Arc<dyn JwtReplayGuard>>,
}

/// What the middleware and `verify_signature` use of a key pair.
pub trait AdminKey: Send + Sync {
    fn jwt_verify(&self, jwt: &str, options: &JwtVerifyOptions) -> Result<JwtVerifyResult, ProsopoError>;
    fn verify(&self, message: &str, signature: &[u8], public_key: &[u8]) -> bool;
    fn public_key(&self) -> Vec<u8>;
    fn address(&self) -> String;
}

impl AdminKey for KeyringPair {
    fn jwt_verify(&self, jwt: &str, options: &JwtVerifyOptions) -> Result<JwtVerifyResult, ProsopoError> {
        KeyringPair::jwt_verify(self, jwt, options).map_err(|error| {
            ProsopoError::new(ErrorClass::Prosopo, ErrorSource::message(error.to_string()), ErrorOptions { silent: true, ..ErrorOptions::default() })
        })
    }

    fn verify(&self, message: &str, signature: &[u8], public_key: &[u8]) -> bool {
        KeyringPair::verify(self, U8aLike::Str(message), U8aLike::Bytes(signature), U8aLike::Bytes(public_key)).unwrap_or(false)
    }

    fn public_key(&self) -> Vec<u8> {
        KeyringPair::public_key(self)
    }

    fn address(&self) -> String {
        KeyringPair::address(self).unwrap_or_default()
    }
}

/// The keys an admin token may be signed by, and the checks it must pass.
#[derive(Clone)]
pub struct AuthState {
    pub pair: Option<Arc<dyn AdminKey>>,
    pub auth_account: Option<Arc<dyn AdminKey>>,
    pub options: AuthMiddlewareOptions,
}

fn verify_with(key: Option<&Arc<dyn AdminKey>>, jwt: &str, options: &AuthMiddlewareOptions) -> Result<Option<JwtVerifyResult>, ProsopoError> {
    let Some(key) = key else {
        return Ok(None);
    };
    let result: JwtVerifyResult = key.jwt_verify(jwt, &options.verify)?;
    Ok(result.is_valid.then_some(result))
}

fn is_replay(result: &JwtVerifyResult, options: &AuthMiddlewareOptions) -> bool {
    let (Some(guard), Some(payload)) = (&options.replay_guard, &result.payload) else {
        return false;
    };
    let Some(jti) = payload.get("jti").and_then(JsonValue::as_str) else {
        return false;
    };
    let sub: String = payload.get("sub").map(template).unwrap_or_else(|| "undefined".to_string());
    let exp: f64 = payload.get("exp").and_then(JsonValue::as_f64).unwrap_or(f64::NAN);
    !guard.claim(&format!("{sub}:{jti}"), exp)
}

/// A value in a JS template string.
fn template(value: &JsonValue) -> String {
    match value {
        JsonValue::Null => "null".to_string(),
        JsonValue::Bool(flag) => flag.to_string(),
        JsonValue::Number(number) => number_to_js_string(*number),
        JsonValue::String(text) => text.clone(),
        JsonValue::Array(items) => items
            .iter()
            .map(|item| match item {
                JsonValue::Null => String::new(),
                item => template(item),
            })
            .collect::<Vec<String>>()
            .join(","),
        JsonValue::Object(_) => "[object Object]".to_string(),
    }
}

fn api_error(key: &str, context: ErrorContext) -> ProsopoError {
    ProsopoError::new(
        ErrorClass::Api,
        ErrorSource::key(key),
        ErrorOptions {
            context: Some(context),
            ..ErrorOptions::default()
        },
    )
}

/// The token in the `Authorization` header, its first `"Bearer "` taken out.
fn extract_jwt(request: &Request) -> Result<String, ProsopoError> {
    let header: &str = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| api_error("GENERAL.MISSING_AUTH_HEADER", ErrorContext::new().with("error", "Missing Authorization header").with("code", 401)))?;
    let jwt: String = header.replacen("Bearer ", "", 1);
    if jwt.is_empty() {
        return Err(api_error("GENERAL.INVALID_JWT", ErrorContext::new().with("error", "Missing JWT").with("code", 400)));
    }
    Ok(jwt)
}

/// Only a failure's translation key goes back to the caller: what it carries can include
/// request context, a stack or config.
fn translation_key_of(error: &ProsopoError) -> &str {
    error.translation_key().filter(|key| is_translation_key(key)).unwrap_or("API.UNAUTHORIZED")
}

fn unauthorized(i18n: Option<&RequestI18n>, key: &str) -> Response {
    let message: String = match i18n {
        Some(i18n) => i18n.lookup().t(key),
        None => key.to_string(),
    };
    json_response(401, "Unauthorized", &json!({ "error": { "code": 401, "key": key, "message": message } }))
}

/// `authMiddleware(pair, authAccount, options)` as an axum middleware: the request goes on when
/// the token verifies against the auth account, or else the provider's pair, and is not a
/// replay; anything else is a 401.
pub async fn auth_middleware(State(state): State<AuthState>, request: Request, next: Next) -> Response {
    let i18n: Option<RequestI18n> = request.extensions().get::<RequestI18n>().cloned();
    let logger: Logger = request
        .extensions()
        .get::<RequestLog>()
        .map(|log| log.logger.clone())
        .unwrap_or_else(|| get_logger(LogLevel::Info, "api"));
    let verified: Result<Option<JwtVerifyResult>, ProsopoError> = extract_jwt(&request).and_then(|jwt| {
        match verify_with(state.auth_account.as_ref(), &jwt, &state.options)? {
            Some(result) => Ok(Some(result)),
            None => verify_with(state.pair.as_ref(), &jwt, &state.options),
        }
    });
    match verified {
        Ok(Some(result)) if !is_replay(&result, &state.options) => next.run(request).await,
        Ok(_) => unauthorized(i18n.as_ref(), "API.UNAUTHORIZED"),
        Err(error) => {
            logger.error(|| LogRecord::msg("Auth Middleware Error").with_err(error.message().to_string()));
            unauthorized(i18n.as_ref(), translation_key_of(&error))
        }
    }
}

/// `verifySignature`: fails with a 401 when `pair` did not sign `message`.
pub fn verify_signature(signature: &str, message: &str, pair: &dyn AdminKey) -> Result<(), ProsopoError> {
    let signature_bytes: Vec<u8> = hex_to_u8a(signature);
    if pair.verify(message, &signature_bytes, &pair.public_key()) {
        return Ok(());
    }
    Err(api_error(
        "GENERAL.INVALID_SIGNATURE",
        ErrorContext::new()
            .with("error", "Signature verification failed")
            .with("code", 401)
            .with("account", pair.address())
            .with("message", message)
            .with("signature", signature),
    ))
}
