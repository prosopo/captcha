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

//! The challenge routes ported so far: `captcha/pow` (captcha/getPoWCaptchaChallenge.ts), with
//! powTasks.ts's `getPowCaptchaChallenge`, maintenanceModeResponses.ts's PoW dummy and
//! trafficFilterRequestTime.ts's `applyTrafficFilterAtRequestTime`.

use crate::api::block::{get_prioritised_access_rule, get_request_user_scope, normalize_headers_for_matching, PrioritisedRuleOptions, ScopeSignals};
use crate::api::captcha::api_error;
use crate::api::express::{header, send_json, Requested};
use crate::api::maintenance::MaintenanceMode;
use crate::api::metrics::ProviderMetrics;
use crate::api::padding::send_json_padded;
use crate::api::pipeline::{handle_errors, validate_address, RequestSignals};
use crate::composite_ip::get_composite_ip_address;
use crate::tasks::detection::{DetectionServices, DetectorBundlePool, SimdDecoder};
use crate::tasks::request::{settings_json, RequestStores, Validation};
use crate::tasks::traffic::{check_traffic_filter, resolve_challenge_policy, resolve_pad_bytes, TrafficFilterView};
use crate::tasks::verify::VerifyServices;
use axum::extract::Request;
use axum::response::Response;
use bson::{Bson, Document};
use http::StatusCode;
use prosopo_api_router::{RequestBody, RequestLog};
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError, ThrownError, ZodLikeError};
use prosopo_database::challenges::NewChallenge;
use prosopo_keyring::KeyringPair;
use prosopo_logger::{LogRecord, Logger};
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::client::get_test_site_key_mode;
use prosopo_types::datasets::{PoWChallengeComponents, POW_SEPARATOR};
use prosopo_types::ipapi::IpInfoResponse;
use prosopo_types::provider_api::get_challenge_request_body;
use prosopo_types::stored::SimdReadingsStage;
use prosopo_types_database::number::to_bson_document;
use prosopo_user_access_policy::AccessRule;
use prosopo_util_crypto::u8a::{u8a_to_hex, U8aLike};
use serde_json::{json, Value};
use std::sync::{Arc, RwLock};

/// `DEFAULT_POW_DIFFICULTY`.
const DEFAULT_POW_DIFFICULTY: f64 = 4.0;

pub struct ChallengeState {
    /// Absent before the database is set up, when only maintenance mode and the test keys are
    /// answered.
    pub services: Option<Arc<VerifyServices>>,
    pub maintenance: Arc<MaintenanceMode>,
    pub metrics: Option<Arc<ProviderMetrics>>,
    /// `env.pair`, which signs each challenge.
    pub pair: Option<KeyringPair>,
    pub pool: Arc<RwLock<Arc<DetectorBundlePool>>>,
    pub decoder: Option<Arc<dyn SimdDecoder>>,
}

/// `PoWCaptcha`, as `getPowCaptchaChallenge` mints it.
pub struct PowChallenge {
    pub challenge: String,
    pub difficulty: f64,
    pub provider_signature: String,
    pub requested_at_timestamp: i64,
}

/// `getPowCaptchaChallenge`: `${now}___${user}___${dapp}___${nonce}`, signed by the provider.
pub fn get_pow_captcha_challenge(pair: &KeyringPair, user: &str, dapp: &str, pow_difficulty: Option<f64>, now_ms: i64, random: f64) -> Result<PowChallenge, String> {
    let difficulty: f64 = pow_difficulty.filter(|difficulty| *difficulty != 0.0 && !difficulty.is_nan()).unwrap_or(DEFAULT_POW_DIFFICULTY);
    let nonce: i64 = (random * 1_000_000.0).floor() as i64;
    let challenge: String = [now_ms.to_string(), user.to_string(), dapp.to_string(), nonce.to_string()].join(POW_SEPARATOR);
    let signature: Vec<u8> = pair.sign(U8aLike::Bytes(challenge.as_bytes()), false).map_err(|error| error.to_string())?;
    Ok(PowChallenge { challenge, difficulty, provider_signature: u8a_to_hex(&signature), requested_at_timestamp: now_ms })
}

/// `buildPowMaintenanceResponse`: a challenge nobody signed, at difficulty 1.
fn pow_maintenance_response(user: &str, dapp: &str) -> Value {
    let now = || std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0, |elapsed| elapsed.as_millis());
    let challenge: String = [now().to_string(), user.to_string(), dapp.to_string(), "0".to_string()].join(POW_SEPARATOR);
    json!({
        "status": "ok",
        "challenge": challenge,
        "difficulty": 1,
        "timestamp": now().to_string(),
        "signature": { "provider": { "challenge": "" } },
    })
}

/// What `applyTrafficFilterAtRequestTime` gives the PoW route: a difficulty override from the
/// `challenge` categories, and the padding every matched category asks for.
struct TrafficVerdict {
    pow_difficulty: Option<f64>,
    pad_bytes: Option<f64>,
}

fn traffic_verdict(ip_info: Option<&IpInfoResponse>, settings: Option<&Value>, logger: &Logger) -> TrafficVerdict {
    let Some(filter) = settings.and_then(|settings| settings.get("trafficFilter")).filter(|filter| filter.is_object()) else {
        return TrafficVerdict { pow_difficulty: None, pad_bytes: None };
    };
    let filter: TrafficFilterView = serde_json::from_value(filter.clone()).unwrap_or_default();
    let result = check_traffic_filter(ip_info, &filter, &[], None);
    let pad_bytes: Option<f64> = resolve_pad_bytes(&result.matches);
    let Some(resolved) = resolve_challenge_policy(&result.matches) else {
        return TrafficVerdict { pow_difficulty: None, pad_bytes };
    };
    logger.info(|| {
        LogRecord::msg("Traffic filter applied challenge overrides").with_data(json!({
            "categories": resolved.source_categories.iter().map(|category| category.as_str()).collect::<Vec<&str>>(),
            "captchaType": resolved.captcha_type.map(CaptchaType::as_str),
            "powDifficulty": resolved.pow_difficulty,
            "solvedImagesCount": resolved.solved_images_count,
            "puzzleTolerance": resolved.puzzle_tolerance,
        }))
    });
    TrafficVerdict { pow_difficulty: resolved.pow_difficulty, pad_bytes }
}

/// JS `a || b`, for the numbers the difficulty is chosen from.
fn first_truthy(candidates: &[Option<f64>]) -> Option<f64> {
    candidates.iter().flatten().copied().find(|number| *number != 0.0 && !number.is_nan())
}

/// `flatten(req.headers)`: each header as Node joins it, except `set-cookie`, which Node keeps
/// as an array and `flatten` then spreads over `set-cookie.0`, `set-cookie.1`, ….
pub fn request_headers_document(headers: &http::HeaderMap) -> Document {
    let mut out: Document = Document::new();
    for name in headers.keys() {
        if name.as_str() == "set-cookie" {
            for (index, value) in headers.get_all(name).iter().enumerate() {
                out.insert(format!("set-cookie.{index}"), crate::api::express::latin1(value.as_bytes()));
            }
        } else if let Some(value) = header(headers, name.as_str()) {
            out.insert(name.as_str(), value);
        }
    }
    out
}

fn logger_of(request: &Request) -> Logger {
    request
        .extensions()
        .get::<RequestLog>()
        .map_or_else(|| prosopo_logger::get_logger(prosopo_logger::LogLevel::Info, "provider"), |log| log.logger.clone())
}

/// What the route reads of a request once its body has parsed.
struct PowRequest<'a> {
    user: &'a str,
    dapp: &'a str,
    session_id: Option<&'a str>,
    simd_readings: Option<&'a str>,
    origin: Option<String>,
    signals: Option<RequestSignals>,
}

/// What the route answers, short of an error passed on.
enum PowOutcome {
    Issued { body: Value, pad_bytes: Option<f64> },
    NotRegistered,
    Invalid(String),
    NoOrigin,
}

async fn issue_pow(state: &ChallengeState, services: &VerifyServices, pair: &KeyringPair, request: &PowRequest<'_>, headers: &http::HeaderMap, logger: &Logger) -> Result<PowOutcome, String> {
    let Some(client) = services.db.get_client_record(request.dapp).await.map_err(|error| error.to_string())? else {
        return Ok(PowOutcome::NotRegistered);
    };
    let ip: String = request.signals.as_ref().map(|signals| signals.ip.clone()).unwrap_or_default();
    if ip.is_empty() {
        logger.warn(|| LogRecord::msg("Request missing IP; geoblocking will be skipped"));
    }
    let ip_info: Option<&IpInfoResponse> = request.signals.as_ref().and_then(|signals| signals.ip_info.as_ref());
    let (country_code, asn) = match ip_info {
        Some(IpInfoResponse::Valid(info)) => (info.country_code.clone(), info.asn_number.map(|asn| asn.get())),
        _ => (None, None),
    };
    let head_hash: Option<String> = match request.session_id {
        Some(session_id) => services
            .db
            .get_session_record_by_session_id(session_id)
            .await
            .map_err(|error| error.to_string())?
            .map(|session| session.decrypted_head_hash),
        None => None,
    };
    let user_agent: Option<String> = header(headers, "user-agent");
    let ja4: Option<String> = request.signals.as_ref().map(|signals| signals.ja4.clone());
    let scope: Value = get_request_user_scope(ScopeSignals {
        user_agent: user_agent.as_deref(),
        ja4: ja4.as_deref(),
        ip: Some(&ip),
        user: Some(request.user),
        head_hash: head_hash.as_deref(),
        coords: None,
        country_code: country_code.as_deref(),
        asn,
        web_bot_auth_agent: None,
    });
    let storage = services.db.get_user_access_rules_storage().map_err(|error| error.to_string())?;
    let rules: Vec<AccessRule> = get_prioritised_access_rule(
        Arc::new(storage),
        &services.verdict_cache,
        &scope,
        Some(request.dapp),
        &normalize_headers_for_matching(headers),
        PrioritisedRuleOptions::default(),
    )
    .await?;
    let enforcing: Option<&AccessRule> = rules.iter().find(|rule| rule.policy.defer_to_verify != Some(true));
    let deferred: Option<&AccessRule> = rules.iter().find(|rule| rule.policy.defer_to_verify == Some(true));

    let stores = RequestStores { db: &services.db, write_queue: services.write_queue(), logger };
    let validation: Validation = stores
        .is_valid_request(&client, CaptchaType::Pow, request.session_id, enforcing)
        .await
        .map_err(|error| error.to_string())?;
    let (valid_session_id, session_difficulty) = match validation {
        Validation::Valid { session_id, pow_difficulty, .. } => (session_id, pow_difficulty),
        Validation::Invalid(reason) => return Ok(PowOutcome::Invalid(reason.as_str().to_string())),
    };
    if request.origin.is_none() {
        return Ok(PowOutcome::NoOrigin);
    }

    let settings: Option<Value> = settings_json(&client);
    let verdict: TrafficVerdict = traffic_verdict(ip_info, settings.as_ref(), logger);
    let policy_difficulty = |rule: Option<&AccessRule>| rule.and_then(|rule| rule.policy.pow_difficulty).map(|difficulty| difficulty.get());
    let difficulty: Option<f64> = first_truthy(&[
        verdict.pow_difficulty,
        session_difficulty,
        policy_difficulty(enforcing),
        policy_difficulty(deferred),
        settings.as_ref().and_then(|settings| settings.get("powDifficulty")).and_then(Value::as_f64),
    ]);
    let source = services.db.source();
    let challenge: PowChallenge = get_pow_captcha_challenge(pair, request.user, request.dapp, difficulty, source.now().timestamp_millis(), source.random())?;

    if let (Some(session_id), Some(simd_readings)) = (valid_session_id.as_deref(), request.simd_readings.filter(|readings| !readings.is_empty())) {
        let pool: Arc<DetectorBundlePool> = state.pool.read().map_or_else(|poisoned| poisoned.into_inner().clone(), |pool| pool.clone());
        let detection = DetectionServices { db: &services.db, write_queue: services.write_queue(), pool: Some(&pool), decoder: state.decoder.as_deref(), logger };
        if let Err(error) = detection.decrypt_and_attach_simd_readings_if_absent(session_id, simd_readings, SimdReadingsStage::Challenge).await {
            logger.warn(|| LogRecord::msg("Failed to patch session with SIMD readings on PoW challenge").with_err(error));
        }
    }

    let components: PoWChallengeComponents = PoWChallengeComponents {
        requested_at_timestamp: (challenge.requested_at_timestamp as f64).into(),
        user_account: request.user.to_string(),
        dapp_account: request.dapp.to_string(),
    };
    let stored_ip_info: Option<Bson> = match ip_info {
        Some(info) => Some(Bson::Document(to_bson_document(info).map_err(|error| error.to_string())?)),
        None => None,
    };
    let new: NewChallenge<'_> = NewChallenge {
        challenge: &challenge.challenge,
        components: &components,
        provider_signature: &challenge.provider_signature,
        ip_address: &get_composite_ip_address(&ip),
        headers: &request_headers_document(headers),
        ja4: ja4.as_deref().unwrap_or_default(),
        session_id: valid_session_id.as_deref(),
        ip_info: stored_ip_info.as_ref(),
    };
    services.db.store_pow_captcha_record(&new, challenge.difficulty, false, false, None).await.map_err(|error| error.to_string())?;

    logger.info(|| {
        LogRecord::msg("PoW captcha challenge issued").with_data(json!({
            "captchaType": CaptchaType::Pow.as_str(),
            "challenge": challenge.challenge,
            "difficulty": challenge.difficulty,
            "user": request.user,
            "dapp": request.dapp,
            "session": request.session_id,
        }))
    });
    Ok(PowOutcome::Issued {
        body: json!({
            "status": "ok",
            "challenge": challenge.challenge,
            "difficulty": challenge.difficulty,
            "timestamp": challenge.requested_at_timestamp.to_string(),
            "signature": { "provider": { "challenge": challenge.provider_signature } },
        }),
        pad_bytes: verdict.pad_bytes,
    })
}

/// `getPoWCaptchaChallenge`'s handler.
pub async fn pow_challenge_route(state: &ChallengeState, request: Request) -> Response {
    let logger: Logger = logger_of(&request);
    let raw: Value = request.extensions().get::<RequestBody>().map_or_else(|| json!({}), |body| body.0.clone());
    let parsed: Value = match get_challenge_request_body().validate(Some(&raw)) {
        Ok(parsed) => parsed,
        Err(issues) => {
            let cause: ZodLikeError = ZodLikeError {
                message: issues.message(),
                issues: issues.issues.iter().filter_map(|issue| serde_json::to_value(issue).ok()).collect(),
            };
            return api_error(&request, "CAPTCHA.PARSE_ERROR", ErrorContext::new().with("code", 400).with_error(cause), &logger);
        }
    };
    let text = |key: &str| parsed.get(key).and_then(Value::as_str);
    let (user, dapp) = (text("user").unwrap_or_default(), text("dapp").unwrap_or_default());
    for (address, key) in [(dapp, "API.INVALID_SITE_KEY"), (user, "CONTRACT.INVALID_ADDRESS")] {
        if let Err(error) = validate_address(address, key) {
            return handle_errors(&request, &ThrownError::from(error));
        }
    }
    let requested: Requested = Requested::of(&request);
    if state.maintenance.get() {
        logger.info(|| LogRecord::msg("Maintenance mode active - returning dummy PoW challenge").with_data(json!({ "dapp": dapp, "user": user, "sessionId": text("sessionId") })));
        return send_json(&requested, StatusCode::OK, Vec::new(), &pow_maintenance_response(user, dapp));
    }
    if get_test_site_key_mode(dapp).is_some() {
        logger.warn(|| LogRecord::msg("Reserved TEST site key - returning dummy PoW challenge").with_data(json!({ "dapp": dapp, "user": user, "sessionId": text("sessionId") })));
        return send_json(&requested, StatusCode::OK, Vec::new(), &pow_maintenance_response(user, dapp));
    }
    let failed = |request: &Request, error: Option<String>| {
        if let Some(metrics) = &state.metrics {
            metrics.record_captcha_issue_error(CaptchaType::Pow);
        }
        logger.error(|| LogRecord::msg("Error in PoW captcha challenge request").with_err(error.clone().unwrap_or_default()));
        let context: ErrorContext = ErrorContext::new()
            .with("code", 500)
            .with("siteKey", raw.get("dapp").cloned().unwrap_or(Value::Null))
            .with("user", raw.get("user").cloned().unwrap_or(Value::Null))
            .with_error(ThrownError::from(prosopo_logger::ErrorObject::new("Error", error.unwrap_or_default())));
        api_error(request, "API.BAD_REQUEST", context, &logger)
    };
    let (Some(services), Some(pair)) = (state.services.as_ref(), state.pair.as_ref()) else {
        let error = ProsopoError::new(ErrorClass::Env, ErrorSource::message("db not setup! Please call isReady() first"), ErrorOptions::default());
        return handle_errors(&request, &ThrownError::from(error));
    };
    let pow_request: PowRequest<'_> = PowRequest {
        user,
        dapp,
        session_id: text("sessionId").filter(|id| !id.is_empty()),
        simd_readings: text("simdReadings"),
        origin: header(request.headers(), "origin").filter(|origin| !origin.is_empty()),
        signals: request.extensions().get::<RequestSignals>().cloned(),
    };
    match issue_pow(state, services, pair, &pow_request, request.headers(), &logger).await {
        Ok(PowOutcome::Issued { body, pad_bytes }) => {
            if let Some(metrics) = &state.metrics {
                metrics.record_captcha_issued(CaptchaType::Pow);
            }
            send_json_padded(&requested, &body, pad_bytes)
        }
        Ok(PowOutcome::NotRegistered) => api_error(&request, "API.SITE_KEY_NOT_REGISTERED", ErrorContext::new().with("code", 400).with("siteKey", dapp), &logger),
        Ok(PowOutcome::Invalid(reason)) => api_error(&request, &reason, ErrorContext::new().with("code", 400).with("siteKey", dapp).with("user", user), &logger),
        Ok(PowOutcome::NoOrigin) => api_error(
            &request,
            "API.BAD_REQUEST",
            ErrorContext::new().with("error", "Origin header not found").with("code", 400).with("siteKey", dapp).with("user", user),
            &logger,
        ),
        Err(error) => failed(&request, Some(error)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use http::{HeaderMap, HeaderName, HeaderValue};

    #[test]
    fn spreads_set_cookie_as_flatten_does_and_joins_the_rest_as_node_does() {
        let mut headers: HeaderMap = HeaderMap::new();
        for (name, value) in [("host", "h"), ("set-cookie", "s=1"), ("cookie", "a=1"), ("set-cookie", "s=2"), ("cookie", "b=2")] {
            headers.append(HeaderName::from_static(name), HeaderValue::from_static(value));
        }
        let document: Document = request_headers_document(&headers);
        assert_eq!(document, bson::doc! { "host": "h", "set-cookie.0": "s=1", "set-cookie.1": "s=2", "cookie": "a=1; b=2" });
    }

    #[test]
    fn takes_the_first_truthy_difficulty_as_js_or_does() {
        assert_eq!(first_truthy(&[None, Some(0.0), Some(f64::NAN), Some(7.0), Some(9.0)]), Some(7.0));
        assert_eq!(first_truthy(&[None, Some(0.0)]), None);
    }
}
