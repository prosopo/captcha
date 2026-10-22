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

//! The solution route ported so far: `pow/solution` (captcha/submitPoWCaptchaSolution.ts).

use crate::api::body_summary::summarise_request_body;
use crate::api::captcha::api_error;
use crate::api::challenge::{logger_of, ChallengeState};
use crate::api::express::{header, send_json, Requested};
use crate::api::pipeline::{handle_errors, validate_address, RequestSignals};
use crate::tasks::detection::{DetectionServices, DetectorBundlePool};
use crate::tasks::pow::{EscalationServices, PowSignatureError, PowSolutionError, PowSolutionServices, PowSubmission, PowVerified, SiteConstraints};
use crate::tasks::request::settings_json;
use axum::extract::Request;
use axum::response::Response;
use http::StatusCode;
use prosopo_api_router::RequestBody;
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError, ThrownError, ZodLikeError};
use prosopo_logger::{ErrorObject, LogRecord, Logger};
use prosopo_types::api_types::ClientMetaData;
use prosopo_types::client::{get_test_site_key_mode, TestSiteKeyMode};
use prosopo_types::provider_api::submit_pow_captcha_solution_body;
use prosopo_types::settings::resolve_allowed_captcha_types;
use serde_json::{json, Map, Value};
use std::sync::Arc;

fn verdict(requested: &Requested, verified: bool) -> Response {
    send_json(requested, StatusCode::OK, Vec::new(), &json!({ "status": "ok", "verified": verified }))
}

/// What a failed submission passes on: the error itself where it was a Prosopo one.
fn thrown(error: PowSolutionError) -> ThrownError {
    match error {
        PowSolutionError::Signature(PowSignatureError::Invalid(error)) => ThrownError::from(error),
        PowSolutionError::Signature(PowSignatureError::Unreadable(message)) | PowSolutionError::Failed(message) => ThrownError::from(ErrorObject::new("Error", message)),
        PowSolutionError::RoutingMachine(unsupported) => ThrownError::from(ErrorObject::new("Error", unsupported.to_string())),
    }
}

/// What `PowChallengeIdSchema`'s check throws for a body whose `challenge` is not a string: it
/// calls `val.split` unguarded, so the parse fails with V8's `TypeError` rather than an issue.
pub(crate) fn challenge_type_error(raw: Option<&Value>) -> Option<String> {
    match raw?.as_object()?.get("challenge") {
        Some(Value::String(_)) => None,
        None => Some("Cannot read properties of undefined (reading 'split')".to_string()),
        Some(Value::Null) => Some("Cannot read properties of null (reading 'split')".to_string()),
        Some(_) => Some("val.split is not a function".to_string()),
    }
}

/// submitPoWCaptchaSolution.ts's handler.
pub async fn pow_solution_route(state: &ChallengeState, request: Request) -> Response {
    let logger: Logger = logger_of(&request);
    let requested: Requested = Requested::of(&request);
    if state.maintenance.get() {
        logger.info(|| LogRecord::msg("Maintenance mode active - returning verified"));
        return verdict(&requested, true);
    }
    let raw: Option<Value> = request.extensions().get::<RequestBody>().map(|body| body.0.clone());
    let content_length: Option<String> = header(request.headers(), "content-length");
    let summary = || summarise_request_body(raw.as_ref(), content_length.as_deref());
    if let Some(message) = challenge_type_error(raw.as_ref()) {
        let cause: ErrorObject = ErrorObject::new("TypeError", message);
        return api_error(&request, "CAPTCHA.PARSE_ERROR", ErrorContext::new().with("code", 400).with_error(cause).with("body", summary()), &logger);
    }
    let parsed: Value = match submit_pow_captcha_solution_body().validate(Some(raw.as_ref().unwrap_or(&json!({})))) {
        Ok(parsed) => parsed,
        Err(issues) => {
            let cause: ZodLikeError = ZodLikeError { message: issues.message(), issues: issues.issues.iter().filter_map(|issue| serde_json::to_value(issue).ok()).collect() };
            return api_error(&request, "CAPTCHA.PARSE_ERROR", ErrorContext::new().with("code", 400).with_error(cause).with("body", summary()), &logger);
        }
    };
    let text = |key: &str| parsed.get(key).and_then(Value::as_str);
    let pointer = |path: &str| parsed.pointer(path).and_then(Value::as_str).unwrap_or_default();
    let (dapp, user) = (text("dapp").unwrap_or_default(), text("user").unwrap_or_default());
    for (address, key) in [(dapp, "API.INVALID_SITE_KEY"), (user, "CONTRACT.INVALID_ADDRESS")] {
        if let Err(error) = validate_address(address, key) {
            return handle_errors(&request, &ThrownError::from(error));
        }
    }
    if let Some(mode) = get_test_site_key_mode(dapp) {
        logger.warn(|| LogRecord::msg("Reserved TEST site key - forcing deterministic captcha verdict").with_data(json!({ "siteKey": dapp, "mode": mode.as_str() })));
        return verdict(&requested, mode == TestSiteKeyMode::Pass);
    }
    let Some(services) = state.services.as_ref() else {
        let error = ProsopoError::new(ErrorClass::Env, ErrorSource::message("db not setup! Please call isReady() first"), ErrorOptions::default());
        return handle_errors(&request, &ThrownError::from(error));
    };
    let failed = |request: &Request, error: ThrownError| {
        logger.error(|| LogRecord::msg("Error in PoW captcha solution submission").with_err(error.to_json()).with_data(json!({ "body": summary() })));
        let site_key: Value = raw.as_ref().and_then(|body| body.get("dapp")).cloned().unwrap_or(Value::Null);
        api_error(request, "API.BAD_REQUEST", ErrorContext::new().with("code", 500).with("siteKey", site_key).with_error(error), &logger)
    };
    let client = match services.db.get_client_record(dapp).await {
        Ok(Some(client)) => client,
        Ok(None) => return api_error(&request, "API.SITE_KEY_NOT_REGISTERED", ErrorContext::new().with("code", 400).with("siteKey", dapp), &logger),
        Err(error) => return failed(&request, ThrownError::from(error)),
    };
    let Some(provider_address) = state.pair.as_ref().and_then(|pair| pair.address().ok()) else {
        return failed(&request, ThrownError::from(ErrorObject::new("Error", "no provider pair")));
    };
    let challenge: &str = text("challenge").unwrap_or_default();
    let fingerprint_proof: Option<&str> = text("fingerprintProof");
    logger.info(|| {
        LogRecord::msg(if fingerprint_proof.is_some() { "fingerprintProof detected" } else { "no fingerprintProof on PoW submission" }).with_data(json!({
            "fingerprintProofPresent": fingerprint_proof.is_some(),
            "fingerprintProofBytes": fingerprint_proof.map_or(0, |proof| proof.encode_utf16().count()),
            "challenge": challenge,
        }))
    });
    let settings: Option<Value> = settings_json(&client);
    let setting = |key: &str| settings.as_ref().and_then(|settings| settings.get(key)).filter(|value| !value.is_null()).and_then(Value::as_f64);
    let timeout: f64 = setting("solutionTimeout").or_else(|| setting("verifiedTimeout")).unwrap_or(f64::NAN);
    let signals: Option<RequestSignals> = request.extensions().get::<RequestSignals>().cloned();
    let ip: String = signals.as_ref().map(|signals| signals.ip.clone()).unwrap_or_default();
    let client_meta_data: Option<ClientMetaData> = parsed.get("clientMetaData").and_then(|meta| serde_json::from_value(meta.clone()).ok());
    let pool: Arc<DetectorBundlePool> = state.pool.read().map_or_else(|poisoned| poisoned.into_inner().clone(), |pool| pool.clone());
    let now = services.db.source().now();
    let solution: PowSolutionServices<'_> = PowSolutionServices {
        services,
        detection: DetectionServices { db: &services.db, write_queue: services.write_queue(), pool: Some(&pool), decoder: state.decoder.as_deref(), logger: &logger },
        provider_address: &provider_address,
        now_ms: now.timestamp_millis() as f64,
        logger: &logger,
    };
    let submission: PowSubmission<'_> = PowSubmission {
        challenge,
        provider_signature: pointer("/signature/provider/challenge"),
        nonce: parsed.get("nonce").and_then(Value::as_f64).unwrap_or(f64::NAN),
        timeout,
        user_signature: pointer("/signature/user/timestamp"),
        ip: &ip,
        behavioral_data: text("behavioralData"),
        salt: text("salt"),
        simd_readings: text("simdReadings"),
        client_meta_data: client_meta_data.as_ref(),
    };
    let verified: PowVerified = match solution.verify(&submission).await {
        Ok(verified) => verified,
        Err(error) => return failed(&request, thrown(error)),
    };
    if let Some(routed) = &verified.routed {
        logger.info(|| {
            LogRecord::msg("post-PoW routing decision").with_data(json!({ "routedCaptchaType": routed.captcha_type.as_str(), "routingReason": routed.reason, "challenge": challenge }))
        });
    }
    let mut per_connection: Map<String, Value> = Map::new();
    if let Some(signals) = &signals {
        for part in [serde_json::to_value(signals.timing), serde_json::to_value(&signals.raw_tls)].into_iter().flatten() {
            if let Value::Object(fields) = part {
                per_connection.extend(fields);
            }
        }
    }
    let site: SiteConstraints = SiteConstraints {
        allowed: resolve_allowed_captcha_types(settings.as_ref()),
        image_max_rounds: setting("imageMaxRounds"),
        puzzle_max_difficulty: setting("puzzleMaxDifficulty"),
    };
    let escalation_services: EscalationServices<'_> = EscalationServices {
        services,
        samplers: &state.puzzle.difficulty,
        session_id_prefix: &state.session_id_prefix,
        base_image_rounds: state.captcha_counts.solved.count.get(),
        now,
        logger: &logger,
    };
    let escalation = match escalation_services.build(&verified, challenge, &per_connection, &site).await {
        Ok(escalation) => escalation,
        Err(error) => return failed(&request, thrown(error)),
    };
    let body: Value = match escalation {
        Some(escalation) => json!({ "status": "ok", "verified": false, "escalation": { "captchaType": escalation.captcha_type.as_str(), "sessionId": escalation.session_id } }),
        None => json!({ "status": "ok", "verified": verified.verified }),
    };
    send_json(&requested, StatusCode::OK, Vec::new(), &body)
}
