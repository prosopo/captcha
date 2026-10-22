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

//! The solution routes ported so far: `pow/solution` (captcha/submitPoWCaptchaSolution.ts), and
//! `puzzle/solution`, `audio/solution` and `icon-order/solution` (interactiveCaptchaSolution.ts).

use crate::api::body_summary::summarise_request_body;
use crate::api::captcha::api_error;
use crate::api::challenge::{logger_of, ChallengeState};
use crate::api::express::{header, send_json, Requested};
use crate::api::pipeline::{handle_errors, validate_address, RequestSignals};
use crate::tasks::detection::{DetectionServices, DetectorBundlePool};
use crate::tasks::interactive::{Answer, InteractiveServices, InteractiveSubmission};
use crate::tasks::pow::{EscalationServices, PowSignatureError, PowSolutionError, PowSolutionServices, PowSubmission, PowVerified, SiteConstraints};
use crate::tasks::request::settings_json;
use axum::extract::Request;
use axum::response::Response;
use http::StatusCode;
use prosopo_api_route::schema::Schema;
use prosopo_api_router::RequestBody;
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError, ThrownError, ZodLikeError};
use prosopo_logger::{ErrorObject, LogRecord, Logger};
use prosopo_types::api_types::ClientMetaData;
use prosopo_types::client::{get_test_site_key_mode, TestSiteKeyMode};
use prosopo_types::provider_api::{submit_audio_captcha_solution_body, submit_icon_order_captcha_solution_body, submit_pow_captcha_solution_body, submit_puzzle_captcha_solution_body};
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

/// A submission past the checks every solution route shares.
struct Admitted<'a> {
    parsed: Value,
    services: &'a Arc<crate::tasks::verify::VerifyServices>,
    settings: Option<Value>,
    provider_address: String,
}

/// What a failed submission's log line and error carry.
struct Failure<'a> {
    raw: Option<&'a Value>,
    content_length: Option<&'a str>,
    label: &'a str,
}

impl Failure<'_> {
    /// The handler's catch: logged with the body's summary, passed on as a 500.
    fn answer(&self, request: &Request, logger: &Logger, error: ThrownError) -> Response {
        logger.error(|| {
            LogRecord::msg(format!("Error in {} captcha solution submission", self.label))
                .with_err(error.to_json())
                .with_data(json!({ "body": summarise_request_body(self.raw, self.content_length) }))
        });
        let site_key: Value = self.raw.and_then(|body| body.get("dapp")).cloned().unwrap_or(Value::Null);
        api_error(request, "API.BAD_REQUEST", ErrorContext::new().with("code", 500).with("siteKey", site_key).with_error(error), logger)
    }
}

/// The handlers' shared opening: maintenance, the parse, the addresses, the test keys and the
/// site's record. `Err` is the answer already given.
async fn admit<'a>(state: &'a ChallengeState, request: Request, schema: Schema, failure: &Failure<'_>, logger: &Logger) -> Result<(Request, Admitted<'a>), Response> {
    let requested: Requested = Requested::of(&request);
    if state.maintenance.get() {
        logger.info(|| LogRecord::msg("Maintenance mode active - returning verified"));
        return Err(verdict(&requested, true));
    }
    let summary = || summarise_request_body(failure.raw, failure.content_length);
    if let Some(message) = challenge_type_error(failure.raw) {
        let cause: ErrorObject = ErrorObject::new("TypeError", message);
        return Err(api_error(&request, "CAPTCHA.PARSE_ERROR", ErrorContext::new().with("code", 400).with_error(cause).with("body", summary()), logger));
    }
    let parsed: Value = match schema.validate(Some(failure.raw.unwrap_or(&json!({})))) {
        Ok(parsed) => parsed,
        Err(issues) => {
            let cause: ZodLikeError = ZodLikeError { message: issues.message(), issues: issues.issues.iter().filter_map(|issue| serde_json::to_value(issue).ok()).collect() };
            return Err(api_error(&request, "CAPTCHA.PARSE_ERROR", ErrorContext::new().with("code", 400).with_error(cause).with("body", summary()), logger));
        }
    };
    let text = |key: &str| parsed.get(key).and_then(Value::as_str).unwrap_or_default();
    let (dapp, user) = (text("dapp"), text("user"));
    for (address, key) in [(dapp, "API.INVALID_SITE_KEY"), (user, "CONTRACT.INVALID_ADDRESS")] {
        if let Err(error) = validate_address(address, key) {
            return Err(handle_errors(&request, &ThrownError::from(error)));
        }
    }
    if let Some(mode) = get_test_site_key_mode(dapp) {
        logger.warn(|| LogRecord::msg("Reserved TEST site key - forcing deterministic captcha verdict").with_data(json!({ "siteKey": dapp, "mode": mode.as_str() })));
        return Err(verdict(&requested, mode == TestSiteKeyMode::Pass));
    }
    let Some(services) = state.services.as_ref() else {
        let error = ProsopoError::new(ErrorClass::Env, ErrorSource::message("db not setup! Please call isReady() first"), ErrorOptions::default());
        return Err(handle_errors(&request, &ThrownError::from(error)));
    };
    let client = match services.db.get_client_record(dapp).await {
        Ok(Some(client)) => client,
        Ok(None) => return Err(api_error(&request, "API.SITE_KEY_NOT_REGISTERED", ErrorContext::new().with("code", 400).with("siteKey", dapp), logger)),
        Err(error) => return Err(failure.answer(&request, logger, ThrownError::from(error))),
    };
    let Some(provider_address) = state.pair.as_ref().and_then(|pair| pair.address().ok()) else {
        return Err(failure.answer(&request, logger, ThrownError::from(ErrorObject::new("Error", "no provider pair"))));
    };
    let settings: Option<Value> = settings_json(&client);
    Ok((request, Admitted { parsed, services, settings, provider_address }))
}

/// A number setting, unless absent or null.
fn setting(settings: Option<&Value>, key: &str) -> Option<f64> {
    settings.and_then(|settings| settings.get(key)).filter(|value| !value.is_null()).and_then(Value::as_f64)
}

/// `solutionTimeout`, or `verifiedTimeout` for a site that predates it.
fn submit_window(settings: Option<&Value>) -> f64 {
    setting(settings, "solutionTimeout").or_else(|| setting(settings, "verifiedTimeout")).unwrap_or(f64::NAN)
}

/// submitPoWCaptchaSolution.ts's handler.
pub async fn pow_solution_route(state: &ChallengeState, request: Request) -> Response {
    let logger: Logger = logger_of(&request);
    let requested: Requested = Requested::of(&request);
    let raw: Option<Value> = request.extensions().get::<RequestBody>().map(|body| body.0.clone());
    let content_length: Option<String> = header(request.headers(), "content-length");
    let failure: Failure<'_> = Failure { raw: raw.as_ref(), content_length: content_length.as_deref(), label: "PoW" };
    let (request, admitted): (Request, Admitted<'_>) = match admit(state, request, submit_pow_captcha_solution_body(), &failure, &logger).await {
        Ok(admitted) => admitted,
        Err(answer) => return answer,
    };
    let Admitted { parsed, services, settings, provider_address } = admitted;
    let failed = |request: &Request, error: ThrownError| failure.answer(request, &logger, error);
    let text = |key: &str| parsed.get(key).and_then(Value::as_str);
    let pointer = |path: &str| parsed.pointer(path).and_then(Value::as_str).unwrap_or_default();
    let challenge: &str = text("challenge").unwrap_or_default();
    let fingerprint_proof: Option<&str> = text("fingerprintProof");
    logger.info(|| {
        LogRecord::msg(if fingerprint_proof.is_some() { "fingerprintProof detected" } else { "no fingerprintProof on PoW submission" }).with_data(json!({
            "fingerprintProofPresent": fingerprint_proof.is_some(),
            "fingerprintProofBytes": fingerprint_proof.map_or(0, |proof| proof.encode_utf16().count()),
            "challenge": challenge,
        }))
    });
    let timeout: f64 = submit_window(settings.as_ref());
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
        image_max_rounds: setting(settings.as_ref(), "imageMaxRounds"),
        puzzle_max_difficulty: setting(settings.as_ref(), "puzzleMaxDifficulty"),
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

/// An interactive solution route: its type, and the label its log lines use.
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum InteractiveRoute {
    Puzzle,
    Audio,
    IconOrder,
}

impl InteractiveRoute {
    fn label(self) -> &'static str {
        match self {
            InteractiveRoute::Puzzle => "puzzle",
            InteractiveRoute::Audio => "audio",
            InteractiveRoute::IconOrder => "icon-order",
        }
    }

    fn schema(self) -> Schema {
        match self {
            InteractiveRoute::Puzzle => submit_puzzle_captcha_solution_body(),
            InteractiveRoute::Audio => submit_audio_captcha_solution_body(),
            InteractiveRoute::IconOrder => submit_icon_order_captcha_solution_body(),
        }
    }
}

/// interactiveCaptchaSolution.ts's `interactiveSolutionHandler`, for the puzzle, audio and
/// icon-order solution routes.
pub async fn interactive_solution_route(state: &ChallengeState, route: InteractiveRoute, request: Request) -> Response {
    let logger: Logger = logger_of(&request);
    let requested: Requested = Requested::of(&request);
    let raw: Option<Value> = request.extensions().get::<RequestBody>().map(|body| body.0.clone());
    let content_length: Option<String> = header(request.headers(), "content-length");
    let failure: Failure<'_> = Failure { raw: raw.as_ref(), content_length: content_length.as_deref(), label: route.label() };
    let (request, admitted): (Request, Admitted<'_>) = match admit(state, request, route.schema(), &failure, &logger).await {
        Ok(admitted) => admitted,
        Err(answer) => return answer,
    };
    let Admitted { parsed, services, settings, provider_address } = admitted;
    let text = |key: &str| parsed.get(key).and_then(Value::as_str);
    let pointer = |path: &str| parsed.pointer(path).and_then(Value::as_str).unwrap_or_default();
    let number = |key: &str| parsed.get(key).and_then(Value::as_f64);
    let empty: Value = json!([]);
    let answer: Answer<'_> = match route {
        InteractiveRoute::Puzzle => Answer::Puzzle {
            final_x: number("finalX").unwrap_or(f64::NAN),
            final_y: number("finalY").unwrap_or(f64::NAN),
            puzzle_events: parsed.get("puzzleEvents").unwrap_or(&empty),
        },
        InteractiveRoute::Audio => Answer::Audio {
            answer: text("answer").unwrap_or_default(),
            replays: number("replays").unwrap_or(0.0),
            audio_events: parsed.get("audioEvents").cloned().unwrap_or_else(|| json!([])),
        },
        InteractiveRoute::IconOrder => Answer::IconOrder {
            clicks: parsed.get("clicks").unwrap_or(&empty),
            icon_order_events: parsed.get("iconOrderEvents").unwrap_or(&empty),
        },
    };
    let signals: Option<RequestSignals> = request.extensions().get::<RequestSignals>().cloned();
    let ip: String = signals.as_ref().map(|signals| signals.ip.clone()).unwrap_or_default();
    let client_meta_data: Option<ClientMetaData> = parsed.get("clientMetaData").and_then(|meta| serde_json::from_value(meta.clone()).ok());
    let pool: Arc<DetectorBundlePool> = state.pool.read().map_or_else(|poisoned| poisoned.into_inner().clone(), |pool| pool.clone());
    let interactive: InteractiveServices<'_> = InteractiveServices {
        services,
        detection: DetectionServices { db: &services.db, write_queue: None, pool: Some(&pool), decoder: state.decoder.as_deref(), logger: &logger },
        provider_address: &provider_address,
        now_ms: services.db.source().now().timestamp_millis() as f64,
        logger: &logger,
    };
    let submission: InteractiveSubmission<'_> = InteractiveSubmission {
        challenge: text("challenge").unwrap_or_default(),
        provider_signature: pointer("/signature/provider/challenge"),
        timeout: submit_window(settings.as_ref()),
        user_signature: pointer("/signature/user/timestamp"),
        ip: &ip,
        behavioral_data: text("behavioralData"),
        salt: text("salt"),
        simd_readings: text("simdReadings"),
        client_meta_data: client_meta_data.as_ref(),
        answer,
    };
    match interactive.submit(&submission).await {
        Ok(verified) => verdict(&requested, verified),
        Err(error) => failure.answer(&request, &logger, thrown(error)),
    }
}
