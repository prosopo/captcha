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

//! controllers/auth.ts: `signup`, `login` and `isAuth`, each in the order the TS takes its steps,
//! answering with the status and body it answers with.

use crate::app::{AppState, VerificationType};
use crate::jwt;
use crate::users::StoredUser;
use http::StatusCode;
use prosopo_api_route::schema::{object, string, Schema};
use prosopo_common::{ContextValue, ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_keyring::{get_pair, KeyringPair, Secret};
use prosopo_logger::{get_logger, LogLevel, LogRecord, Logger};
use prosopo_server::ProsopoServer;
use prosopo_util_crypto::{blake2_as_hex, random_as_hex, U8aLike};
use serde_json::{json, Map, Value};
use std::sync::LazyLock;

/// What a handler answers: a status and a JSON body.
pub type Answer = (StatusCode, Value);

const NO_IP: &str = "NO_IP";
const JWT_SECRET: &str = "secret";

/// The captcha types whose `//<type>` derivations of the secret are tried, in this order.
/// `audio` is not a site type: it is the seed name of the audio demos' image site.
const DERIVATIONS: [&str; 6] = ["pow", "image", "frictionless", "puzzle", "audio", "iconOrder"];

fn logger() -> Logger {
    get_logger(LogLevel::Info, "client-example-server:auth")
}

/// `ProcaptchaResponse.merge(z.object({ email, password, siteKey }))`.
static SUBSCRIBE_BODY: LazyLock<Schema> = LazyLock::new(|| {
    object(vec![
        ("procaptcha-response", string().starts_with("0x")),
        ("email", string().email()),
        ("password", string()),
        ("siteKey", string()),
    ])
});

/// `u8aToHex(blake2b(utf8ToBytes(password)))`: a 512-bit blake2b of the text's UTF-8 bytes.
pub fn hash_password(password: &str) -> String {
    blake2_as_hex(U8aLike::Bytes(password.as_bytes()), 512, None).expect("512 bits is a blake2b length")
}

fn is_truthy(value: Option<&Value>) -> bool {
    match value {
        None | Some(Value::Null) => false,
        Some(Value::Bool(flag)) => *flag,
        Some(Value::Number(number)) => number.as_f64().is_some_and(|n| n != 0.0 && !n.is_nan()),
        Some(Value::String(text)) => !text.is_empty(),
        Some(_) => true,
    }
}

fn env_error(key: &str) -> String {
    let mut context: ErrorContext = ErrorContext::new();
    context.set("missingParams", ContextValue::Json(json!(["PROSOPO_SITE_PRIVATE_KEY"])));
    ProsopoError::new(ErrorClass::Env, ErrorSource::key(key), ErrorOptions { context: Some(context), ..ErrorOptions::default() })
        .message()
        .to_string()
}

fn pair_of(secret: &str) -> Result<KeyringPair, String> {
    get_pair(Some(Secret::Text(secret)), None, None, None).map_err(|error| error.to_string())
}

fn address_of(pair: &KeyringPair) -> String {
    pair.address().unwrap_or_default()
}

/// `getPairAndSecretForSiteKey`: the secret itself, else its first `//<type>` derivation whose
/// address is the site key.
pub fn pair_and_secret_for_site_key(base_secret: &str, site_key: &str) -> Result<(KeyringPair, String), String> {
    let log: Logger = logger();
    let pair: KeyringPair = pair_of(base_secret)?;
    if address_of(&pair) == site_key {
        log.info(|| {
            LogRecord::msg("Site key matches the server configuration without captcha type suffix")
                .with_data(json!({ "siteKeyDerived": address_of(&pair), "siteKey": site_key }))
        });
        return Ok((pair, base_secret.to_string()));
    }
    let mut last: KeyringPair = pair;
    for captcha_type in DERIVATIONS {
        let secret: String = format!("{base_secret}//{captcha_type}");
        let pair: KeyringPair = pair_of(&secret)?;
        log.info(|| {
            LogRecord::msg("Checking pair").with_data(json!({ "captchaType": captcha_type, "siteKeyDerived": address_of(&pair), "siteKey": site_key }))
        });
        if address_of(&pair) == site_key {
            return Ok((pair, secret));
        }
        last = pair;
    }
    Err(format!("Site key does not match the server configuration: Provided {site_key} vs Server {}", address_of(&last)))
}

/// The verification request's body for the siteverify API: the IP left out in development.
pub fn siteverify_body(token: &str, secret: &str, ip: &str, email: Option<&str>, development: bool) -> Value {
    let mut body: Map<String, Value> = Map::new();
    body.insert("token".to_string(), json!(token));
    body.insert("secret".to_string(), json!(secret));
    if let Some(email) = email.filter(|email| !email.is_empty()) {
        body.insert("email".to_string(), json!(email));
    }
    if !development {
        body.insert("ip".to_string(), json!(ip));
    }
    Value::Object(body)
}

/// The request facts `verify` is given.
struct Verification<'a> {
    token: &'a str,
    secret: &'a str,
    ip: &'a str,
    email: Option<&'a str>,
    client_session_id: Option<&'a str>,
}

/// `verify`: through the siteverify endpoint (`fetch` posts the JSON as text), or the library.
async fn verify(state: &AppState, server: ProsopoServer, request: Verification<'_>) -> Result<Option<Value>, String> {
    let log: Logger = logger();
    if state.verify_type == VerificationType::Api {
        log.info(|| LogRecord::msg("Verifying using the API endpoint").with_data(json!({ "verifyEndpoint": state.verify_endpoint })));
        let body: Value = siteverify_body(request.token, request.secret, request.ip, request.email, state.development);
        let mut shown: Value = body.clone();
        shown["secret"] = json!("[redacted]");
        log.info(|| LogRecord::default().with_data(json!({ "body": shown })));
        let response = state
            .http
            .post(&state.verify_endpoint)
            .header(http::header::CONTENT_TYPE, "text/plain;charset=UTF-8")
            .body(prosopo_logger::json_stringify(&body, 0))
            .send()
            .await
            .map_err(|_| "fetch failed".to_string())?;
        let text: String = response.text().await.map_err(|_| "fetch failed".to_string())?;
        let response: Value = serde_json::from_str(&text).map_err(|_| format!("Unexpected token in JSON: \"{text}\" is not valid JSON"))?;
        log.info(|| LogRecord::default().with_data(json!({ "response": response })));
        if response.is_null() {
            return Err("Cannot read properties of null (reading 'verified')".to_string());
        }
        return Ok(response.get("verified").cloned());
    }
    let verified: Value = server
        .is_verified(request.token, Some(request.ip), request.email, request.client_session_id)
        .await
        .map_err(|error| error.message().to_string())?;
    log.info(|| LogRecord::default().with_data(json!({ "verified": verified })));
    Ok(verified.get("verified").cloned())
}

fn server_for(state: &AppState, pair: KeyringPair) -> ProsopoServer {
    ProsopoServer::new(state.config.clone(), Some(pair)).with_clock(state.now_ms.clone()).with_provider_directory(state.providers.clone())
}

fn refused(verified: Option<Value>) -> Answer {
    let mut body: Map<String, Value> = Map::new();
    body.insert("message".to_string(), json!("user has not completed a captcha"));
    if let Some(verified) = verified {
        body.insert("verified".to_string(), verified);
    }
    (StatusCode::UNAUTHORIZED, Value::Object(body))
}

fn server_error(message: String) -> Answer {
    let message: String = if message.is_empty() { "internal server error".to_string() } else { message };
    (StatusCode::INTERNAL_SERVER_ERROR, json!({ "message": message }))
}

fn secret_of(state: &AppState) -> Option<String> {
    state.config.account.secret.clone().filter(|secret| !secret.is_empty())
}

fn client_ip(headers: &http::HeaderMap) -> Option<String> {
    prosopo_provider::api::express::header(headers, "x-client-ip").filter(|ip| !ip.is_empty())
}

/// `signup`.
pub async fn signup(state: &AppState, body: &Value, headers: &http::HeaderMap) -> Answer {
    let attempt = async {
        let base_secret: String = secret_of(state).ok_or_else(|| env_error("GENERAL.MNEMONIC_UNDEFINED"))?;
        let existing: Option<StoredUser> = state.users.find_by_email(body.get("email")).await.map_err(|error| error.0)?;
        let payload: Value = SUBSCRIBE_BODY.validate(Some(body)).map_err(|error| error.message())?;
        let token: &str = payload["procaptcha-response"].as_str().unwrap_or_default();
        let site_key: &str = payload["siteKey"].as_str().unwrap_or_default();
        let (pair, secret) = pair_and_secret_for_site_key(&base_secret, site_key)?;
        let server: ProsopoServer = server_for(state, pair);
        if existing.is_some() {
            return Ok((StatusCode::CONFLICT, json!({ "message": "email already exists" })));
        }
        let email: &str = body["email"].as_str().unwrap_or_default();
        let ip: String = client_ip(headers).unwrap_or_else(|| "127.0.0.1".to_string());
        let verification: Verification = Verification {
            token,
            secret: &secret,
            ip: &ip,
            email: Some(email),
            client_session_id: body.get("clientSessionId").and_then(Value::as_str),
        };
        let verified: Option<Value> = verify(state, server, verification).await?;
        if verified == Some(Value::Bool(true)) {
            let salt: String = random_as_hex(32);
            let password: &str = body["password"].as_str().unwrap_or_default();
            let hash: String = hash_password(&format!("{password}{salt}"));
            return Ok(match state.users.create(email, body.get("name"), &hash, &salt).await {
                Ok(()) => (StatusCode::OK, json!({ "message": "user created" })),
                Err(error) => {
                    logger().error(|| LogRecord::msg("Error creating user in database").with_err(error.0.clone()));
                    (StatusCode::BAD_GATEWAY, json!({ "message": "error while creating the user" }))
                }
            });
        }
        Ok::<Answer, String>(refused(verified))
    };
    attempt.await.unwrap_or_else(server_error)
}

/// `login`.
pub async fn login(state: &AppState, body: &Value, headers: &http::HeaderMap) -> Answer {
    let attempt = async {
        let Some(user) = state.users.find_by_email(body.get("email")).await.map_err(|error| error.0)? else {
            return Ok((StatusCode::NOT_FOUND, json!({ "message": "user not found" })));
        };
        let payload: Value = SUBSCRIBE_BODY.validate(Some(body)).map_err(|error| error.message())?;
        let token: &str = payload["procaptcha-response"].as_str().unwrap_or_default();
        let site_key: &str = payload["siteKey"].as_str().unwrap_or_default();
        let base_secret: String = secret_of(state).ok_or_else(|| env_error("GENERAL.MISSING_SECRET_KEY"))?;
        let (pair, secret) = pair_and_secret_for_site_key(&base_secret, site_key)?;
        let server: ProsopoServer = server_for(state, pair);
        let ip: String = client_ip(headers).unwrap_or_else(|| NO_IP.to_string());
        let verification: Verification = Verification {
            token,
            secret: &secret,
            ip: &ip,
            email: None,
            client_session_id: body.get("clientSessionId").and_then(Value::as_str),
        };
        let verified: Option<Value> = verify(state, server, verification).await?;
        logger().info(|| LogRecord::default().with_data(json!({ "verified": verified })));
        if !is_truthy(verified.as_ref()) {
            return Ok(refused(verified));
        }
        let password: &str = body["password"].as_str().unwrap_or_default();
        if hash_password(&format!("{password}{}", user.salt)) != user.password {
            return Ok((StatusCode::UNAUTHORIZED, json!({ "message": "invalid credentials" })));
        }
        let mut claims: Map<String, Value> = Map::new();
        claims.insert("email".to_string(), body.get("email").cloned().unwrap_or(Value::Null));
        let now_seconds: i64 = ((state.now_ms)() / 1000.0).floor() as i64;
        let token: String = jwt::sign(claims, JWT_SECRET, 3600, now_seconds);
        Ok::<Answer, String>((StatusCode::OK, json!({ "message": "user logged in", "token": token })))
    };
    attempt.await.unwrap_or_else(server_error)
}

/// `isAuth`: the bearer token after the first space, verified with the demo's secret.
pub fn is_auth(state: &AppState, authorization: Option<&str>) -> Answer {
    let not_authenticated: Answer = (StatusCode::UNAUTHORIZED, json!({ "message": "not authenticated" }));
    let header: &str = authorization.unwrap_or_default();
    if header.is_empty() {
        return not_authenticated;
    }
    let parts: Vec<&str> = header.split(' ').collect();
    if parts.len() < 2 || parts[1].is_empty() {
        return not_authenticated;
    }
    let now_seconds: f64 = ((state.now_ms)() / 1000.0).floor();
    match jwt::verify(parts[1], JWT_SECRET, now_seconds) {
        Err(message) => {
            let message: String = if message.is_empty() { "could not decode the token".to_string() } else { message };
            (StatusCode::INTERNAL_SERVER_ERROR, json!({ "message": message }))
        }
        Ok(payload) if !jwt::is_truthy_payload(&payload) => (StatusCode::UNAUTHORIZED, json!({ "message": "unauthorized" })),
        Ok(_) => (StatusCode::OK, json!({ "message": "here is your resource" })),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const MNEMONIC: &str = "bottom drive obey lake curtain smoke basket hold race lonely fit walk";

    #[test]
    fn hashes_the_text_not_hex() {
        assert_eq!(hash_password("0x12"), blake2_as_hex(U8aLike::Bytes(b"0x12"), 512, None).expect("hashes"));
        assert_ne!(hash_password("0x12"), blake2_as_hex(U8aLike::Bytes(&[0x12]), 512, None).expect("hashes"));
        assert_eq!(hash_password("").len(), 2 + 128);
    }

    #[test]
    fn matches_the_site_key_to_a_derivation() {
        let bare: String = address_of(&pair_of(MNEMONIC).expect("a pair"));
        let pow: String = address_of(&pair_of(&format!("{MNEMONIC}//pow")).expect("a pair"));
        let icon_order: String = address_of(&pair_of(&format!("{MNEMONIC}//iconOrder")).expect("a pair"));
        assert_eq!(pair_and_secret_for_site_key(MNEMONIC, &bare).map(|(_, secret)| secret), Ok(MNEMONIC.to_string()));
        assert_eq!(pair_and_secret_for_site_key(MNEMONIC, &pow).map(|(_, secret)| secret), Ok(format!("{MNEMONIC}//pow")));
        assert_eq!(
            pair_and_secret_for_site_key(MNEMONIC, "5Other").map(|(_, secret)| secret),
            Err(format!("Site key does not match the server configuration: Provided 5Other vs Server {icon_order}"))
        );
    }

    #[test]
    fn withholds_the_ip_in_development_and_an_empty_email_always() {
        assert_eq!(siteverify_body("0x1", "s", "1.2.3.4", Some("a@b.c"), false), json!({ "token": "0x1", "secret": "s", "email": "a@b.c", "ip": "1.2.3.4" }));
        assert_eq!(siteverify_body("0x1", "s", "1.2.3.4", Some("a@b.c"), true), json!({ "token": "0x1", "secret": "s", "email": "a@b.c" }));
        assert_eq!(siteverify_body("0x1", "s", "NO_IP", None, false), json!({ "token": "0x1", "secret": "s", "ip": "NO_IP" }));
    }

    #[test]
    fn reads_truthiness_as_javascript_does() {
        assert!(!is_truthy(None));
        assert!(!is_truthy(Some(&json!(0))));
        assert!(!is_truthy(Some(&json!(""))));
        assert!(is_truthy(Some(&json!("yes"))));
        assert!(is_truthy(Some(&json!({}))));
    }
}
