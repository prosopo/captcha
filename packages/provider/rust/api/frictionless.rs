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

//! `captcha/frictionless` (captcha/getFrictionlessCaptchaChallenge/*): the session a widget's
//! first request is given, decided from its detector payload, the site's settings, access
//! rules, traffic filter and the score ladder. With frictionlessTasks.ts's FrictionlessManager
//! (`sendCaptcha`, `registerBlockedSession`, `createAuthenticatedSession`, `decryptPayload`,
//! the score increments) as [`Manager`].

use crate::api::captcha::api_error;
use crate::api::challenge::{ip_info_literal, logger_of, request_headers_document, ChallengeState};
use crate::api::express::{header, send_json, Requested};
use crate::api::pipeline::RequestSignals;
use crate::composite_ip::get_composite_ip_address;
use crate::device_platform::derive_platform;
use crate::mobile_signals::MobileSignals;
use crate::tasks::captcha_type_selection::{coerce_to_enabled_captcha_type, resolve_site_allowed_captcha_types, switch_type_after_refreshes, switch_type_on_user_request, allowed_types_json};
use crate::tasks::detection::{get_bot_score, resolve_bundle_by_id, DecodedDetectorPayload, DetectionServices, DetectorBundlePool, PoolBundleDecrypt};
use crate::tasks::frictionless::{tag_fresh_address, check_lang_rules, is_image_switch_request_valid, lean_json, rounds_from_triggered_detectors, timestamp_decay_function, LangScore, SessionStores};
use crate::tasks::usage_counters::build_all_window_increments;
use crate::tasks::verify::VerifyServices;
use axum::extract::Request;
use axum::response::Response;
use bson::{doc, Bson, DateTime, Document};
use http::StatusCode;
use prosopo_api_router::RequestBody;
use prosopo_captcha_severity::{resolve_max_escalation_level, severity_to_puzzle_difficulty, MAX_STALE_PAYLOAD_LEVEL};
use prosopo_common::{ErrorContext, ThrownError, ZodLikeError};
use prosopo_database::session::Session;
use prosopo_logger::{ErrorObject, LogRecord, Logger};
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::config::FrictionlessPenalties;
use prosopo_types::decision_machine::{CounterCaptchaType, CounterKind};
use prosopo_types::ipapi::IpInfoResponse;
use prosopo_types::matched_access_rule::AccessPolicyType;
use prosopo_types::provider_api::get_frictionless_captcha_challenge_request_body;
use prosopo_types::reasons::{FrictionlessReason, NO_MEASUREMENT_REASONS};
use prosopo_types::settings::{clamp_image_rounds, resolve_frictionless_threshold, resolve_image_rounds_bounds, AllowedTypes};
use prosopo_user_access_policy::AccessRule;
use serde_json::{json, Map, Value};
use std::sync::Arc;

/// What the frictionless route reads of the provider's config.
pub struct FrictionlessConfig {
    pub penalties: FrictionlessPenalties,
    /// `config.lRules`.
    pub l_rules: Option<Map<String, Value>>,
    pub host: String,
    pub phrase_bank: crate::honeypot::PhraseBank,
}

/// The session fields `setSessionParams` holds and each send overlays, a key absent where the
/// TS leaves it undefined. A string score stands for the string a poisoned language penalty
/// leaves: the session write refuses it, as mongoose's cast does.
#[derive(Clone, Default)]
struct SessionParams(Document);

impl SessionParams {
    fn put(&mut self, key: &str, value: Option<Bson>) {
        match value {
            Some(value) => {
                self.0.insert(key, value);
            }
            None => {
                self.0.remove(key);
            }
        }
    }

    fn overlaid(&self, over: &[(&str, Option<Bson>)]) -> SessionParams {
        let mut out: SessionParams = self.clone();
        for (key, value) in over {
            out.put(key, value.clone());
        }
        out
    }

    fn number(&self, key: &str) -> Option<f64> {
        self.0.get(key).and_then(Bson::as_f64)
    }

    fn text(&self, key: &str) -> Option<&str> {
        self.0.get(key).and_then(Bson::as_str)
    }
}

/// A bot score: a number, or the string the TS has once a poisoned language penalty is added,
/// which compares as `NaN`.
#[derive(Clone, Copy, Debug, PartialEq)]
struct Score {
    value: f64,
    poisoned: bool,
}

impl Score {
    fn add(self, penalty: f64) -> Score {
        Score { value: if self.poisoned { f64::NAN } else { self.value + penalty }, poisoned: self.poisoned }
    }

    /// `Number(botScore)`.
    fn number(self) -> f64 {
        if self.poisoned { f64::NAN } else { self.value }
    }

    fn bson(self) -> Bson {
        if self.poisoned { Bson::String("poisoned language penalty".to_string()) } else { Bson::Double(self.value) }
    }
}

/// The score components as the TS object grows them, in insertion order.
#[derive(Clone, Default)]
struct Components(Vec<(&'static str, Bson)>);

impl Components {
    fn set(&mut self, key: &'static str, value: Bson) {
        match self.0.iter_mut().find(|(existing, _)| *existing == key) {
            Some(entry) => entry.1 = value,
            None => self.0.push((key, value)),
        }
    }

    fn bson(&self) -> Bson {
        Bson::Document(self.0.iter().map(|(key, value)| (key.to_string(), value.clone())).collect())
    }
}

/// `RoutingContext`, as far as the Rust reads it: the router gate, the served counters and the
/// sizing of what is minted.
struct Routing {
    dapp: String,
    user: String,
    ip: String,
    image_max_rounds: Option<f64>,
    image_min_rounds: Option<f64>,
    base_image_rounds: f64,
    puzzle_max_difficulty: Option<f64>,
    is_mobile: bool,
}

/// `GetFrictionlessCaptchaResponse`.
fn session_answer(captcha_type: CaptchaType, session_id: &str, env: &dyn Fn(&str) -> Option<String>, audio_alternative: bool) -> Value {
    let mut out: Map<String, Value> = Map::new();
    out.insert("captchaType".to_string(), json!(captcha_type.as_str()));
    out.insert("sessionId".to_string(), json!(session_id));
    out.insert("status".to_string(), json!("ok"));
    if let Some(url) = crate::api::dns_event_url::build_dns_event_url(session_id, env) {
        out.insert("dns_url".to_string(), json!(url));
    }
    if crate::tasks::audio_alternative::offers_audio_alternative(Some(captcha_type), audio_alternative) {
        out.insert("audioAlternativeAvailable".to_string(), json!(true));
    }
    Value::Object(out)
}

/// What ends a request: an answer, or an error the handler passes on as a 400.
enum Outcome {
    Json(Value),
    Unauthorized,
}

struct Manager<'a> {
    state: &'a ChallengeState,
    services: &'a VerifyServices,
    config: &'a FrictionlessConfig,
    logger: &'a Logger,
    params: Option<SessionParams>,
    routing: Option<Routing>,
    allowed: Option<AllowedTypes>,
    audio_alternative: bool,
    image_switch: bool,
    now: DateTime,
}

impl Manager<'_> {
    fn env(&self, name: &str) -> Option<String> {
        (self.state.env)(name)
    }

    fn update_score(&mut self, score: Score, components: &Components) {
        if let Some(params) = self.params.as_mut() {
            params.put("score", Some(score.bson()));
            params.put("scoreComponents", Some(components.bson()));
        }
    }

    fn set_matched_rule(&mut self, rule: &AccessRule) {
        if let Some(params) = self.params.as_mut() {
            let matched = prosopo_user_access_policy::describe_matched_rule(rule);
            params.put("matchedRule", bson::serialize_to_bson(&matched).ok());
        }
    }

    async fn create_session(&self, fields: &Document) -> Result<Session, String> {
        let session_id: String = format!("{}-{}", self.state.session_id_prefix, uuid::Uuid::new_v4());
        let stores: SessionStores<'_> = SessionStores { db: &self.services.db, write_queue: self.services.write_queue() };
        stores.create_session(session_id, self.now, fields, true).await
    }

    /// `sendCaptcha`.
    async fn send_captcha(&self, captcha_type: CaptchaType, over: &[(&str, Option<Bson>)]) -> Result<Value, String> {
        let effective: SessionParams = self.params.clone().unwrap_or_default().overlaid(over);
        let present = |key: &str| effective.0.get(key).is_some();
        if effective.text("token").is_none_or(str::is_empty) || !present("score") || !present("threshold") || !present("scoreComponents") || !present("ipAddress") || !present("siteKey") {
            return Err(format!("Session parameters must be set before sending a {} captcha", captcha_type.as_str()));
        }
        if let Some(routing) = &self.routing {
            self.services.decisions.route(&routing.dapp, self.logger).await.map_err(|error| error.to_string())?;
        }
        let allowed: Option<Value> = self.allowed.map(allowed_types_json);
        let enabled: CaptchaType = coerce_to_enabled_captcha_type(captcha_type, self.allowed, Some(self.logger));
        let user_switched: CaptchaType = switch_type_on_user_request(enabled, self.image_switch, allowed.as_ref());
        let switched_by_user: bool = user_switched != enabled;
        let final_type: CaptchaType = switch_type_after_refreshes(user_switched, effective.number("refreshCount"), allowed.as_ref());
        let switched_by_refreshes: bool = final_type != user_switched;
        // The router's own count when it gives one; without a router the baseline carries
        // the session's count for an image and none otherwise, so both fall back to it.
        let requested_rounds: Option<f64> = effective.number("solvedImagesCount");
        let final_rounds: Option<f64> = if final_type == CaptchaType::Image {
            requested_rounds.map(|rounds| match &self.routing {
                Some(routing) => clamp_image_rounds(rounds, routing.image_min_rounds, routing.image_max_rounds),
                None => clamp_image_rounds(rounds, None, None),
            })
        } else {
            None
        };
        let final_pow: Option<f64> = if final_type == CaptchaType::Pow { effective.number("powDifficulty") } else { None };
        let final_reason: Option<String> = if switched_by_user {
            Some(FrictionlessReason::PuzzleUserSwitch.as_str().to_string())
        } else if switched_by_refreshes {
            Some(FrictionlessReason::PuzzleRefreshLimit.as_str().to_string())
        } else {
            effective.text("reason").map(str::to_string)
        };
        let mut puzzle_fields: Vec<(&str, Option<Bson>)> = vec![("puzzleTolerance", None), ("puzzle", None), ("puzzleLevel", None)];
        if final_type == CaptchaType::Puzzle {
            let max_level: f64 = resolve_max_escalation_level(
                Some(self.routing.as_ref().and_then(|routing| routing.puzzle_max_difficulty).unwrap_or(prosopo_types::settings::PUZZLE_MAX_DIFFICULTY_DEFAULT)),
                self.routing.as_ref().is_some_and(|routing| routing.is_mobile),
            );
            let ceiling: f64 = if final_reason.as_deref() == Some(FrictionlessReason::OldTimestamp.as_str()) { max_level.min(MAX_STALE_PAYLOAD_LEVEL) } else { max_level };
            let no_measurement: bool = final_reason.as_deref().is_some_and(|reason| NO_MEASUREMENT_REASONS.iter().any(|known| known.as_str() == reason));
            let level: f64 = if no_measurement {
                0.0
            } else {
                let base: f64 = self.routing.as_ref().map_or(self.state.captcha_counts.solved.count.get(), |routing| routing.base_image_rounds);
                severity_to_puzzle_difficulty(requested_rounds, base, Some(ceiling))
            };
            if level > 0.0 {
                let sampled = self.state.puzzle.difficulty.sample(level, prosopo_puzzle_assets::DEFAULT_RENDER_SETTINGS.hole_darken, Some(ceiling));
                puzzle_fields = vec![
                    ("puzzleTolerance", Some(Bson::Double(sampled.tolerance))),
                    ("puzzle", Some(prosopo_types_database::number::json_to_bson(&sampled.puzzle_settings()))),
                    ("puzzleLevel", Some(Bson::Double(sampled.level))),
                ];
            }
        }
        let blocked: Option<Bson> = if final_type == CaptchaType::Image { effective.0.get("blocked").cloned() } else { None };
        let mut fields: SessionParams = effective.overlaid(&[
            ("captchaType", Some(Bson::String(final_type.as_str().to_string()))),
            ("solvedImagesCount", final_rounds.map(Bson::Double)),
            ("powDifficulty", final_pow.map(Bson::Double)),
            ("reason", final_reason.map(Bson::String)),
            ("blocked", blocked),
            ("iconOrderTolerance", None),
            ("iconOrder", None),
            ("deleted", None),
            ("isEscalation", None),
            ("originSessionId", None),
        ]);
        for (key, value) in puzzle_fields {
            fields.put(key, value);
        }
        let session: Session = self.create_session(&fields.0).await?;
        if let (Some(routing), Some(counters)) = (&self.routing, self.services.usage_counters()) {
            counters.incr_many_async(&routing.dapp, build_all_window_increments(CounterKind::Served, CounterCaptchaType::Type(final_type), &routing.ip, &routing.user, None));
        }
        Ok(session_answer(final_type, &session.session_id, &|name: &str| self.env(name), self.audio_alternative))
    }

    /// `registerBlockedSession`.
    async fn register_blocked_session(&self, over: &[(&str, Option<Bson>)]) -> Result<(), String> {
        let effective: SessionParams = self.params.clone().unwrap_or_default().overlaid(over);
        let present = |key: &str| effective.0.get(key).is_some();
        if effective.text("token").is_none_or(str::is_empty) || !present("score") || !present("threshold") || !present("scoreComponents") || !present("ipAddress") || !present("siteKey") {
            return Err("Session parameters must be set before calling registerBlockedSession".to_string());
        }
        let fields: SessionParams = effective.overlaid(&[
            ("captchaType", Some(Bson::String(CaptchaType::Image.as_str().to_string()))),
            ("powDifficulty", None),
            ("blocked", Some(Bson::Boolean(true))),
            ("deleted", Some(Bson::Boolean(true))),
            ("puzzleTolerance", None),
            ("puzzle", None),
            ("iconOrderTolerance", None),
            ("iconOrder", None),
            ("isEscalation", None),
            ("originSessionId", None),
        ]);
        self.create_session(&fields.0).await.map(|_| ())
    }
}

/// What `decryptPayload` gives the route.
struct Decrypted {
    base_bot_score: f64,
    timestamp: f64,
    user_id: Option<String>,
    user_agent: Option<String>,
    web_view: bool,
    i_frame: bool,
    decrypted_head_hash: String,
    decryption_failed: bool,
    triggered_detectors: Option<Vec<f64>>,
    shadow_dom_penalty: Option<bool>,
    d: Option<Map<String, Value>>,
    bundle_id: Option<String>,
}

impl Manager<'_> {
    fn detection<'b>(&'b self, pool: &'b DetectorBundlePool) -> DetectionServices<'b> {
        DetectionServices { db: &self.services.db, write_queue: self.services.write_queue(), pool: Some(pool), decoder: self.state.decoder.as_deref(), logger: self.logger }
    }

    /// `resolveBundleByDetectorSession`.
    async fn resolve_bundle_by_detector_session(&self, pool: &DetectorBundlePool, detector_session_id: Option<&str>) -> Option<(String, PoolBundleDecrypt)> {
        let unresolved = |reason: &str, bundle_id: Option<&str>| {
            self.logger.info(|| {
                LogRecord::msg("Could not resolve the detector bundle for this session").with_data(json!({ "reason": reason, "bundleId": bundle_id }))
            });
        };
        let (Some(detector_session_id), Some(queue)) = (detector_session_id.filter(|id| !id.is_empty()), self.services.write_queue()) else {
            unresolved("noDetectorSession", None);
            return None;
        };
        let Some(bundle_id) = queue.get_detector_bundle(detector_session_id).await else {
            unresolved("noBinding", None);
            return None;
        };
        let Some(decrypt) = resolve_bundle_by_id(Some(pool), Some(&bundle_id)) else {
            unresolved("bundleNotInPool", Some(&bundle_id));
            return None;
        };
        Some((bundle_id, decrypt))
    }

    /// `decryptPayload`: the detector's verdict, or a score of 1 marked as a failed decrypt.
    async fn decrypt_payload(&self, pool: &DetectorBundlePool, token: &str, head_hash: &str, detector_session_id: Option<&str>) -> Decrypted {
        let resolved = self.resolve_bundle_by_detector_session(pool, detector_session_id).await;
        let bundle_id: Option<String> = resolved.as_ref().map(|(id, _)| id.clone());
        let mut decrypted: Option<DecodedDetectorPayload> = None;
        if let (Some((_, bundle)), Some(decoder)) = (&resolved, self.state.decoder.as_deref()) {
            self.logger.info(|| LogRecord::msg("Attempting to decrypt score").with_data(json!({ "key": redact_key(&bundle.key) })));
            match get_bot_score(decoder, token, head_hash, bundle).await {
                Ok(result) => decrypted = Some(result),
                Err(_) => self.logger.warn(|| LogRecord::msg("Error decrypting score: no more keys to try")),
            }
        }
        let usable = decrypted.as_ref().filter(|result| !result.base_bot_score.is_nan() && !result.timestamp.is_nan());
        let failed: bool = usable.is_none();
        if failed {
            self.logger.error(|| LogRecord::msg("Error decrypting score: baseBotScore or timestamp is undefined"));
        }
        Decrypted {
            base_bot_score: usable.map_or(1.0, |result| result.base_bot_score),
            timestamp: usable.map_or(0.0, |result| result.timestamp),
            user_id: decrypted.as_ref().and_then(|result| result.user_id.clone()),
            user_agent: decrypted.as_ref().and_then(|result| result.user_agent.clone()),
            web_view: decrypted.as_ref().is_some_and(|result| result.is_web_view),
            i_frame: decrypted.as_ref().is_some_and(|result| result.is_iframe),
            decrypted_head_hash: usable.map_or(String::new(), |result| result.decrypted_head_hash.clone()),
            decryption_failed: failed,
            triggered_detectors: decrypted.as_ref().and_then(|result| result.triggered_detectors.clone()),
            shadow_dom_penalty: decrypted.as_ref().and_then(|result| result.shadow_dom_penalty),
            d: decrypted.and_then(|result| result.d),
            bundle_id,
        }
    }

    /// `createAuthenticatedSession`.
    #[allow(clippy::too_many_arguments)]
    async fn create_authenticated_session(&self, token: &str, ip_address: &Bson, agent: Option<&str>, site_key: &str, hash: &str, headers: &Document, ip_info: Option<Bson>, client_session_id: Option<&str>) -> Result<Session, String> {
        let session_id: String = format!("{}-{}", self.state.session_id_prefix, uuid::Uuid::new_v4());
        let mut record: Document = doc! {
            "sessionId": session_id.clone(),
            "createdAt": self.now,
            "token": token,
            "score": 0.0,
            "threshold": 0.0,
            "scoreComponents": { "baseScore": 0.0 },
            "ipAddress": ip_address.clone(),
            "captchaType": CaptchaType::Authenticated.as_str(),
            "userSitekeyIpHash": hash,
            "webView": false,
            "iFrame": false,
            "decryptedHeadHash": "",
            "siteKey": site_key,
            "serverChecked": false,
            "agent": agent.is_some(),
        };
        if let Some(agent) = agent {
            record.insert("webBotAuthAgent", agent);
        }
        if let Some(ip_info) = ip_info {
            record.insert("ipInfo", ip_info);
        }
        record.insert("headers", headers.clone());
        if let Some(id) = client_session_id {
            record.insert("clientMetaData", doc! { "clientSessionId": id });
        }
        let session: Session = bson::deserialize_from_document(record.clone()).map_err(|error| error.to_string())?;
        self.services.db.store_session_record(&session).await.map_err(|error| error.message().to_string())?;
        if let Some(queue) = self.services.write_queue() {
            let mut cached: Map<String, Value> = record.iter().map(|(key, value)| (key.clone(), lean_json(value))).collect();
            tag_fresh_address(&mut cached);
            queue.cache_session(&session_id, &cached, None).await;
            queue.cache_session_by_hash(hash, &session_id, None).await;
        }
        Ok(session)
    }
}

/// `redactKeyForLogging`.
fn redact_key(key: &str) -> String {
    let units: Vec<u16> = key.encode_utf16().collect();
    if units.is_empty() {
        return String::new();
    }
    let slice = |from: isize, to: isize| -> String {
        let length: isize = units.len() as isize;
        let clamp = |at: isize| -> usize { (if at < 0 { (length + at).max(0) } else { at.min(length) }) as usize };
        let (from, to) = (clamp(from), clamp(to));
        if from >= to { String::new() } else { String::from_utf16_lossy(&units[from..to]) }
    };
    let half: isize = (units.len() / 2) as isize;
    format!("{}...{}...{}", slice(0, 5), slice(half - 5, half + 5), slice(-5, units.len() as isize))
}

/// The request facts every send carries: the hash, the site key, the address's lookup and
/// the request's headers.
struct Common {
    hash: String,
    dapp: String,
    ip_info: Option<Bson>,
    headers: Document,
}

impl Common {
    fn with(&self, extra: Vec<(&'static str, Option<Bson>)>) -> Vec<(&'static str, Option<Bson>)> {
        let mut over: Vec<(&'static str, Option<Bson>)> = extra;
        over.push(("userSitekeyIpHash", Some(Bson::String(self.hash.clone()))));
        over.push(("siteKey", Some(Bson::String(self.dapp.clone()))));
        over.push(("ipInfo", self.ip_info.clone()));
        over.push(("headers", Some(Bson::Document(self.headers.clone()))));
        over
    }
}

fn reason(reason: FrictionlessReason) -> Option<Bson> {
    Some(Bson::String(reason.as_str().to_string()))
}

fn rounds(value: f64) -> Option<Bson> {
    Some(Bson::Double(value))
}

/// The site's image round bounds.
fn bounds(settings: Option<&Value>) -> (Option<f64>, Option<f64>) {
    let number = |key: &str| settings.and_then(|settings| settings.get(key)).filter(|value| !value.is_null()).and_then(Value::as_f64);
    (number("imageMinRounds"), number("imageMaxRounds"))
}

fn clamp(requested: f64, settings: Option<&Value>) -> f64 {
    let (min, max) = bounds(settings);
    clamp_image_rounds(requested, min, max)
}

fn max_rounds(settings: Option<&Value>) -> f64 {
    let (min, max) = bounds(settings);
    resolve_image_rounds_bounds(min, max).max
}

/// What the decision ladder reads.
struct Ladder<'a> {
    common: &'a Common,
    settings: Option<&'a Value>,
    token: &'a str,
    head_hash: &'a str,
    decrypted: &'a Decrypted,
    timestamp: f64,
    user_agent: Option<&'a str>,
    user_id: Option<&'a str>,
    request_user_agent: Option<String>,
    request_user: Option<String>,
    base_bot_score: f64,
    bot_threshold: f64,
    bot_image_threshold: f64,
    current_url: Option<&'a str>,
    now_ms: f64,
}

impl Manager<'_> {
    fn decision(&self, decision: &str, data: Value) {
        self.logger.info(|| {
            let mut fields: Map<String, Value> = Map::new();
            fields.insert("decision".to_string(), json!(decision));
            if let Value::Object(more) = data {
                fields.extend(more);
            }
            LogRecord::msg("Frictionless decision").with_data(Value::Object(fields))
        });
        if let Some(metrics) = &self.state.metrics {
            metrics.record_frictionless_decision(decision);
        }
    }

    async fn image(&self, common: &Common, solved: f64, why: FrictionlessReason) -> Result<Outcome, String> {
        self.send_captcha(CaptchaType::Image, &common.with(vec![("solvedImagesCount", rounds(solved)), ("reason", reason(why))])).await.map(Outcome::Json)
    }

    /// `runDecisionMachine`, the ladder after the access rules and traffic filter.
    async fn run_decision_machine(&mut self, ladder: &Ladder<'_>, mut score: Score, mut components: Components) -> Result<Outcome, String> {
        let common: &Common = ladder.common;
        let settings: Option<&Value> = ladder.settings;
        let image_type = json!({ "captchaType": CaptchaType::Image.as_str() });
        if ladder.token.is_empty() {
            self.decision("missing_token", image_type);
            return self.image(common, clamp(crate::api::frictionless::MISSING_TOKEN_IMAGE_ROUNDS, settings), FrictionlessReason::MissingToken).await;
        }
        if ladder.head_hash.is_empty() {
            self.decision("missing_head_hash", image_type);
            return self.image(common, clamp(MISSING_HEAD_HASH_IMAGE_ROUNDS, settings), FrictionlessReason::MissingHeadHash).await;
        }
        if ladder.decrypted.decryption_failed {
            self.decision("decryption_failed", image_type);
            return self.image(common, clamp(DECRYPTION_FAILED_IMAGE_ROUNDS, settings), FrictionlessReason::DecryptionFailed).await;
        }
        let hashed: String = ladder.request_user_agent.as_deref().filter(|agent| !agent.is_empty()).map(crate::hashing::hash_user_agent).unwrap_or_default();
        if Some(hashed.as_str()) != ladder.user_agent || ladder.request_user.as_deref() != ladder.user_id {
            self.logger.info(|| {
                LogRecord::msg("User agent or user id does not match").with_data(json!({
                    "headersUserAgent": ladder.request_user_agent,
                    "hashedHeadersUserAgent": hashed,
                    "userAgent": ladder.user_agent,
                    "headersProsopoUser": ladder.request_user,
                    "userId": ladder.user_id,
                }))
            });
            self.decision("user_agent_mismatch", image_type);
            let image_max: f64 = settings.and_then(|settings| settings.get("imageMaxRounds")).and_then(Value::as_f64).unwrap_or(f64::NAN);
            return self.image(common, clamp(timestamp_decay_function(ladder.timestamp, image_max, ladder.now_ms), settings), FrictionlessReason::UserAgentMismatch).await;
        }
        let flag = |key: &str| settings.and_then(|settings| settings.get(key)).and_then(Value::as_bool);
        let web_view_tripped: bool = flag("disallowWebView") == Some(true) && ladder.decrypted.web_view;
        if web_view_tripped {
            self.logger.info(|| LogRecord::msg("WebView detected"));
            let penalty: f64 = self.config.penalties.PENALTY_WEBVIEW.get();
            score = score.add(penalty);
            components.set("webView", Bson::Double(penalty));
            self.update_score(score, &components);
        }
        let timestamp_tripped: bool = ladder.now_ms - ladder.timestamp > prosopo_types::timeouts::DEFAULT_MAX_TIMESTAMP_AGE as f64;
        if timestamp_tripped {
            self.logger.info(|| LogRecord::msg("Timestamp is older than 10 minutes").with_data(json!({ "timestamp": prosopo_logger::iso_timestamp(ladder.timestamp as i64) })));
            let penalty: f64 = self.config.penalties.PENALTY_OLD_TIMESTAMP.get();
            score = score.add(penalty);
            components.set("timeout", Bson::Double(penalty));
            self.update_score(score, &components);
        }
        if let Some(threshold) = settings.and_then(|settings| settings.get("autoBanScoreThreshold")).filter(|value| !value.is_null()).and_then(Value::as_f64) {
            if score.number() >= threshold {
                self.decision("auto_ban_score", json!({ "botScore": score.number(), "autoBanThreshold": threshold, "token": ladder.token }));
                self.register_blocked_session(&common.with(vec![("solvedImagesCount", rounds(max_rounds(settings))), ("reason", reason(FrictionlessReason::AutoBanScore))])).await?;
                return Ok(Outcome::Unauthorized);
            }
        }
        let base_rounds: f64 = self.state.captcha_counts.solved.count.get();
        if web_view_tripped {
            self.decision("webview_detected", image_type);
            return self.image(common, clamp(base_rounds * 2.0, settings), FrictionlessReason::WebviewDetected).await;
        }
        if timestamp_tripped {
            self.decision("timestamp_too_old", image_type);
            let image_max: f64 = settings.and_then(|settings| settings.get("imageMaxRounds")).and_then(Value::as_f64).unwrap_or(f64::NAN);
            return self.image(common, clamp(timestamp_decay_function(ladder.timestamp, image_max, ladder.now_ms), settings), FrictionlessReason::OldTimestamp).await;
        }
        let scored_rounds: f64 = clamp(rounds_from_triggered_detectors(base_rounds, ladder.decrypted.triggered_detectors.as_deref()), settings);
        if ladder.bot_image_threshold > ladder.bot_threshold && score.number() > ladder.bot_threshold && score.number() < ladder.bot_image_threshold {
            self.decision(
                "bot_score_puzzle_band",
                json!({ "captchaType": CaptchaType::Puzzle.as_str(), "botScore": score.number(), "botThreshold": ladder.bot_threshold, "botImageThreshold": ladder.bot_image_threshold, "token": ladder.token }),
            );
            return self
                .send_captcha(CaptchaType::Puzzle, &common.with(vec![("solvedImagesCount", rounds(scored_rounds)), ("reason", reason(FrictionlessReason::BotScorePuzzleBand))]))
                .await
                .map(Outcome::Json);
        }
        if score.number() > ladder.bot_threshold {
            self.logger.info(|| LogRecord::msg("Bot score is greater than threshold").with_data(json!({ "botScore": score.number(), "botThreshold": ladder.bot_threshold, "token": ladder.token })));
            self.decision(
                "bot_score_above_threshold",
                json!({ "captchaType": CaptchaType::Image.as_str(), "solvedImagesCount": scored_rounds, "triggeredDetectorCount": ladder.decrypted.triggered_detectors.as_ref().map_or(0, Vec::len) }),
            );
            return self.image(common, scored_rounds, FrictionlessReason::BotScoreAboveThreshold).await;
        }
        if ladder.current_url.is_none() {
            self.decision("missing_current_url", json!({ "captchaType": CaptchaType::Image.as_str(), "token": ladder.token }));
            return self.image(common, clamp(base_rounds, settings), FrictionlessReason::MissingCurrentUrl).await;
        }
        self.decision("default_pow", json!({ "captchaType": CaptchaType::Pow.as_str() }));
        let _ = ladder.base_bot_score;
        self.send_captcha(CaptchaType::Pow, &common.with(Vec::new())).await.map(Outcome::Json)
    }

    /// `handleAccessPolicy`: `None` when the rule leaves the decision to what follows, with
    /// the score it raised.
    async fn handle_access_policy(&mut self, rule: Option<&AccessRule>, common: &Common, settings: Option<&Value>, score: Score, components: Components, scope: &Value) -> Result<Result<Outcome, (Score, Components)>, String> {
        let Some(rule) = rule else {
            return Ok(Err((score, components)));
        };
        self.set_matched_rule(rule);
        self.logger.info(|| {
            LogRecord::msg("User access policy matched").with_data(json!({
                "policy": serde_json::to_value(rule).unwrap_or(Value::Null),
                "captchaType": rule.policy.captcha_type.map(CaptchaType::as_str),
                "userScope": scope,
            }))
        });
        let penalty: f64 = rule.policy.frictionless_score.map(|score| score.get()).filter(|score| *score != 0.0 && !score.is_nan()).unwrap_or(self.config.penalties.PENALTY_ACCESS_RULE.get());
        let score: Score = score.add(penalty);
        let mut components: Components = components;
        components.set("accessPolicy", Bson::Double(penalty));
        self.update_score(score, &components);
        if rule.policy.kind == AccessPolicyType::Block {
            self.decision("block", json!({ "captchaType": CaptchaType::Image.as_str() }));
            self.register_blocked_session(&common.with(vec![("solvedImagesCount", rounds(max_rounds(settings))), ("reason", reason(FrictionlessReason::AccessPolicyBlock))])).await?;
            return Ok(Ok(Outcome::Unauthorized));
        }
        if let Some(threshold) = settings.and_then(|settings| settings.get("autoBanScoreThreshold")).filter(|value| !value.is_null()).and_then(Value::as_f64) {
            if score.number() >= threshold {
                self.decision("auto_ban_score", json!({ "botScore": score.number(), "autoBanThreshold": threshold, "captchaType": rule.policy.captcha_type.map(CaptchaType::as_str) }));
                self.register_blocked_session(&common.with(vec![("solvedImagesCount", rounds(max_rounds(settings))), ("reason", reason(FrictionlessReason::AutoBanScore))])).await?;
                return Ok(Ok(Outcome::Unauthorized));
            }
        }
        let solved: Option<f64> = rule.policy.solved_images_count().map(|count| count.get());
        let base = |extra: Vec<(&'static str, Option<Bson>)>| {
            let mut over = extra;
            over.push(("reason", reason(FrictionlessReason::UserAccessPolicy)));
            common.with(over)
        };
        let typed = |captcha_type: CaptchaType| json!({ "captchaType": captcha_type.as_str() });
        match rule.policy.captcha_type {
            Some(CaptchaType::Image) => {
                self.decision("user_access_policy", typed(CaptchaType::Image));
                let count: f64 = match solved.filter(|count| *count != 0.0 && !count.is_nan()) {
                    Some(count) => clamp(count, settings),
                    None => max_rounds(settings),
                };
                self.send_captcha(CaptchaType::Image, &base(vec![("solvedImagesCount", rounds(count))])).await.map(|answer| Ok(Outcome::Json(answer)))
            }
            Some(CaptchaType::Pow) => {
                self.decision("user_access_policy", typed(CaptchaType::Pow));
                self.send_captcha(CaptchaType::Pow, &base(Vec::new())).await.map(|answer| Ok(Outcome::Json(answer)))
            }
            Some(CaptchaType::Puzzle) => {
                self.decision("user_access_policy", typed(CaptchaType::Puzzle));
                let extra = solved.map(|count| vec![("solvedImagesCount", rounds(count))]).unwrap_or_default();
                self.send_captcha(CaptchaType::Puzzle, &base(extra)).await.map(|answer| Ok(Outcome::Json(answer)))
            }
            _ => Ok(Err((score, components))),
        }
    }

    /// `handleFrictionlessTrafficFilter`.
    async fn handle_traffic_filter(&self, ip_info: Option<&IpInfoResponse>, settings: Option<&Value>, common: &Common) -> Result<Option<Outcome>, String> {
        let Some(filter) = settings.and_then(|settings| settings.get("trafficFilter")).filter(|filter| filter.is_object()) else {
            return Ok(None);
        };
        let filter: crate::tasks::traffic::TrafficFilterView = serde_json::from_value(filter.clone()).unwrap_or_default();
        let result = crate::tasks::traffic::check_traffic_filter(ip_info, &filter, &[], None);
        let Some(resolved) = crate::tasks::traffic::resolve_challenge_policy(&result.matches) else {
            return Ok(None);
        };
        self.logger.info(|| {
            LogRecord::msg("Traffic filter applied challenge overrides").with_data(json!({
                "categories": resolved.source_categories.iter().map(|category| category.as_str()).collect::<Vec<&str>>(),
                "captchaType": resolved.captcha_type.map(CaptchaType::as_str),
                "powDifficulty": resolved.pow_difficulty,
                "solvedImagesCount": resolved.solved_images_count,
                "puzzleTolerance": resolved.puzzle_tolerance,
            }))
        });
        let categories: Vec<&str> = resolved.source_categories.iter().map(|category| category.as_str()).collect();
        let dispatch = |captcha_type: CaptchaType| self.decision("traffic_filter", json!({ "captchaType": captcha_type.as_str(), "categories": categories }));
        let answer: Option<Value> = match resolved.captcha_type {
            Some(CaptchaType::Image) => {
                dispatch(CaptchaType::Image);
                let count: f64 = match resolved.solved_images_count.filter(|count| *count != 0.0 && !count.is_nan()) {
                    Some(count) => clamp(count, settings),
                    None => max_rounds(settings),
                };
                Some(self.send_captcha(CaptchaType::Image, &common.with(vec![("solvedImagesCount", rounds(count))])).await?)
            }
            Some(CaptchaType::Pow) => {
                dispatch(CaptchaType::Pow);
                let extra = resolved.pow_difficulty.map(|difficulty| vec![("powDifficulty", Some(Bson::Double(difficulty)))]).unwrap_or_default();
                Some(self.send_captcha(CaptchaType::Pow, &common.with(extra)).await?)
            }
            Some(CaptchaType::Puzzle) => {
                dispatch(CaptchaType::Puzzle);
                Some(self.send_captcha(CaptchaType::Puzzle, &common.with(Vec::new())).await?)
            }
            _ => None,
        };
        Ok(answer.map(Outcome::Json))
    }
}

/// `MISSING_TOKEN_IMAGE_ROUNDS`.
pub const MISSING_TOKEN_IMAGE_ROUNDS: f64 = 3.0;
/// `MISSING_HEAD_HASH_IMAGE_ROUNDS`.
pub const MISSING_HEAD_HASH_IMAGE_ROUNDS: f64 = 2.0;
/// `DECRYPTION_FAILED_IMAGE_ROUNDS`.
pub const DECRYPTION_FAILED_IMAGE_ROUNDS: f64 = 3.0;

/// `buildFrictionlessMaintenanceResponse`: a PoW session id that no record backs.
fn maintenance_answer(prefix: &str) -> Value {
    json!({ "captchaType": CaptchaType::Pow.as_str(), "sessionId": format!("{prefix}-{}", uuid::Uuid::new_v4()), "status": "ok" })
}

/// What a frictionless request ends with: JSON with the honeypot header when the site has one,
/// a 401, or an error already answered.
enum Answer {
    Json(Value, Option<String>),
    Unauthorized,
    ApiError(String, ErrorContext),
}

/// getFrictionlessCaptchaChallenge/handler.ts.
pub async fn frictionless_route(state: &ChallengeState, request: Request) -> Response {
    let logger: Logger = logger_of(&request);
    let requested: Requested = Requested::of(&request);
    let path: String = request.uri().path().to_string();
    let method: String = request.method().to_string();
    let (parts, _) = request.into_parts();
    let answer: Answer = match frictionless(state, &parts, &logger).await {
        Ok(answer) => answer,
        Err(error) => {
            logger.error(|| LogRecord::msg("Error in frictionless captcha challenge").with_err(error.to_json()));
            Answer::ApiError("API.BAD_REQUEST".to_string(), ErrorContext::new().with("code", 400).with_error(error))
        }
    };
    let response: Response = match answer {
        Answer::Json(body, honeypot) => {
            let headers = honeypot
                .and_then(|value| http::HeaderValue::from_str(&value).ok())
                .map(|value| (http::HeaderName::from_static(crate::honeypot::HONEYPOT_HEADER), value))
                .into_iter()
                .collect();
            send_json(&requested, StatusCode::OK, headers, &body)
        }
        Answer::Unauthorized => send_json(&requested, StatusCode::UNAUTHORIZED, Vec::new(), &json!({ "error": "Unauthorized" })),
        Answer::ApiError(key, context) => api_error(&Request::from_parts(parts, axum::body::Body::empty()), &key, context, &logger),
    };
    let status: u16 = response.status().as_u16();
    logger.info(|| LogRecord::msg("Frictionless response finished").with_data(json!({ "status": status, "path": path, "method": method })));
    response
}

fn thrown(message: impl Into<String>) -> ThrownError {
    ThrownError::from(ErrorObject::new("Error", message))
}

async fn frictionless(state: &ChallengeState, request: &http::request::Parts, logger: &Logger) -> Result<Answer, ThrownError> {
    let raw: Value = request.extensions.get::<RequestBody>().map_or_else(|| json!({}), |body| body.0.clone());
    let parsed: Value = get_frictionless_captcha_challenge_request_body().validate(Some(&raw)).map_err(|issues| {
        ThrownError::from(ZodLikeError { message: issues.message(), issues: issues.issues.iter().filter_map(|issue| serde_json::to_value(issue).ok()).collect() })
    })?;
    let text = |key: &str| parsed.get(key).and_then(Value::as_str);
    let token: &str = text("token").unwrap_or_default();
    let head_hash: &str = text("headHash").unwrap_or_default();
    let dapp: &str = text("dapp").unwrap_or_default();
    let user: &str = text("user").unwrap_or_default();
    let detector_session_id: Option<&str> = text("detectorSessionId");
    let client_session_id: Option<&str> = text("clientSessionId").filter(|id| !id.is_empty());
    let current_url: Option<String> = prosopo_util::sanitise_page_url(text("currentUrl"));
    let iframe_url: Option<String> = prosopo_util::sanitise_page_url(text("iframeUrl"));
    let is_protect: bool = prosopo_util::is_protect_deployment(current_url.as_deref(), iframe_url.as_deref());
    let session_token: String = if token.is_empty() { format!("notoken-{}", uuid::Uuid::new_v4()) } else { token.to_string() };
    let signals: Option<RequestSignals> = request.extensions.get::<RequestSignals>().cloned();
    let normalized_ip: String = signals.as_ref().map(|signals| signals.ip.clone()).unwrap_or_default();
    let mode: &str = if text("mode") == Some("invisible") { "invisible" } else { "visible" };
    logger.info(|| {
        LogRecord::msg("Frictionless handler entry").with_data(json!({
            "token": token, "user": user, "dapp": dapp, "normalizedIp": normalized_ip,
            "ja4": signals.as_ref().map(|signals| signals.ja4.clone()), "path": request.uri.path(), "method": request.method.as_str(), "mode": mode,
        }))
    });
    if state.maintenance.get() {
        logger.info(|| LogRecord::msg("Maintenance mode active - returning dummy PoW captcha session").with_data(json!({ "dapp": dapp, "user": user })));
        return Ok(Answer::Json(maintenance_answer(&state.session_id_prefix), None));
    }
    if prosopo_types::client::get_test_site_key_mode(dapp).is_some() {
        logger.warn(|| LogRecord::msg("Reserved TEST site key - returning invisible PoW session").with_data(json!({ "dapp": dapp, "user": user })));
        return Ok(Answer::Json(maintenance_answer(&state.session_id_prefix), None));
    }
    let services: &Arc<VerifyServices> = state.services.as_ref().ok_or_else(|| thrown("db not setup! Please call isReady() first"))?;
    let config: &FrictionlessConfig = &state.frictionless;
    let hash: String = crate::hashing::hash_user_ip(user, &normalized_ip, dapp);
    let pool: Arc<DetectorBundlePool> = state.pool.read().map_or_else(|poisoned| poisoned.into_inner().clone(), |pool| pool.clone());
    let now: DateTime = services.db.source().now();
    let mut manager: Manager<'_> = Manager {
        state,
        services,
        config,
        logger,
        params: None,
        routing: None,
        allowed: None,
        audio_alternative: false,
        image_switch: false,
        now,
    };
    let simd_readings = async {
        let encrypted: &str = text("simdReadings").filter(|readings| !readings.is_empty())?;
        let bundle = manager.resolve_bundle_by_detector_session(&pool, detector_session_id).await.map(|(_, bundle)| bundle);
        manager.detection(&pool).decrypt_simd_readings_for_attach(encrypted, bundle.as_ref()).await
    };
    let dedup = async {
        let existing = services.db.get_session_record_by_token(token).await?;
        let session = services.db.get_session_by_user_sitekey_ip_hash(&hash).await?;
        if session.is_none() {
            if let Some(queue) = services.write_queue() {
                if let Some(stale) = queue.get_cached_session_by_hash(&hash).await {
                    logger.warn(|| LogRecord::msg("Evicting stale Redis dedup pointer").with_data(json!({ "userSitekeyIpHash": hash, "staleSessionId": stale })));
                    futures_util::join!(queue.invalidate_cached_session_by_hash(&hash), queue.invalidate_cached_session(&stale));
                }
            }
        }
        Ok::<_, prosopo_common::ProsopoError>((existing, session))
    };
    let (decoded_simd, dedup, client) = futures_util::join!(simd_readings, dedup, services.db.get_client_record(dapp));
    let (existing_token, dedup) = dedup.map_err(ThrownError::from)?;
    let client = client.map_err(ThrownError::from)?;
    if let Some(existing) = &existing_token {
        logger.info(|| LogRecord::msg("Token has already been used").with_data(json!({ "token": existing.token })));
        return Ok(Answer::ApiError("API.BAD_REQUEST".to_string(), ErrorContext::new().with("code", 400).with("siteKey", dapp).with("user", user)));
    }
    let Some(client) = client else {
        return Ok(Answer::ApiError("API.SITE_KEY_NOT_REGISTERED".to_string(), ErrorContext::new().with("code", 400).with("siteKey", dapp)));
    };
    let settings: Option<Value> = crate::tasks::request::settings_json(&client);
    manager.audio_alternative = crate::tasks::audio_alternative::is_audio_alternative_enabled(settings.as_ref());
    let allowed: AllowedTypes = resolve_site_allowed_captcha_types(settings.as_ref());
    manager.allowed = Some(allowed);
    let honeypot: Option<String> = crate::honeypot::honeypot_header(settings.as_ref(), &config.phrase_bank, (state.env)("PROSOPO_HONEYPOT_PHRASE_BANK_PATH").as_deref(), services.db.source().random(), logger);
    let json_answer = |body: Value| Answer::Json(body, honeypot.clone());

    let flat_headers: Document = request_headers_document(&request.headers);
    let header_map: std::collections::HashMap<String, String> = flat_headers.iter().filter_map(|(key, value)| value.as_str().map(|text| (key.clone(), text.to_string()))).collect();
    let node_env: Option<String> = (state.env)("NODE_ENV");
    let web_bot_auth = prosopo_web_bot_auth::verify_web_bot_auth(
        &prosopo_web_bot_auth::VerifiableRequest {
            method: request.method.to_string(),
            url: format!("https://{}{}", header(&request.headers, "host").unwrap_or_default(), request.uri),
            headers: header_map.clone(),
        },
        &prosopo_web_bot_auth::JwksResolverOptions { allow_local_signers: matches!(node_env.as_deref(), Some("test") | Some("development")), ..Default::default() },
    )
    .await
    .map_err(|error| thrown(format!("{error:?}")))?;
    let signer_url: Option<String> = match &web_bot_auth {
        prosopo_web_bot_auth::VerifyResult::Verified { signer_url, .. } => Some(signer_url.clone()),
        prosopo_web_bot_auth::VerifyResult::Failed(reason) => {
            if reason.as_str() != "no-signature-headers" {
                logger.info(|| LogRecord::msg("Web Bot Auth signature rejected").with_data(json!({ "reason": reason.as_str(), "signatureAgent": header(&request.headers, "signature-agent") })));
            }
            None
        }
    };
    let ip_info: Option<&IpInfoResponse> = signals.as_ref().and_then(|signals| signals.ip_info.as_ref());
    let valid_info = match ip_info {
        Some(IpInfoResponse::Valid(info)) => Some(info),
        _ => None,
    };
    let country_code: Option<String> = valid_info.and_then(|info| info.country_code.clone());
    let asn: Option<f64> = valid_info.and_then(|info| info.asn_number.map(|asn| asn.get()));
    let carrier: Option<bool> = valid_info.and_then(|info| info.is_mobile);
    let user_agent_header: String = header(&request.headers, "user-agent").unwrap_or_default();
    let ja4: Option<String> = signals.as_ref().map(|signals| signals.ja4.clone()).filter(|ja4| !ja4.is_empty());
    let tcp_mss: Option<f64> = signals.as_ref().and_then(|signals| signals.raw_tls.tcp_mss);
    let scope: Value = crate::api::block::get_request_user_scope(crate::api::block::ScopeSignals {
        user_agent: Some(user_agent_header.as_str()),
        ja4: ja4.as_deref(),
        ip: Some(normalized_ip.as_str()),
        user: Some(user),
        head_hash: None,
        coords: None,
        country_code: country_code.as_deref(),
        asn,
        web_bot_auth_agent: signer_url.as_deref(),
    });
    let lookup = || async {
        let storage = services.db.get_user_access_rules_storage().map_err(|error| thrown(error.message().to_string()))?;
        crate::api::block::get_prioritised_access_rule(
            Arc::new(storage),
            &services.verdict_cache,
            &scope,
            Some(dapp),
            &crate::api::block::normalize_headers_for_matching(&request.headers),
            crate::api::block::PrioritisedRuleOptions::default(),
        )
        .await
        .map_err(thrown)
    };
    let stored_ip_info: Option<Bson> = ip_info.map(ip_info_literal).transpose().map_err(thrown)?;
    let platform = |web_view: bool| {
        derive_platform(&user_agent_header, web_view, MobileSignals { headers: Some(&flat_headers), carrier_network: carrier, tcp_mss, ..MobileSignals::default() })
    };

    if let Some(dedup) = dedup {
        let rules: Vec<AccessRule> = lookup().await?;
        let policy: Option<&AccessRule> = rules.iter().find(|rule| rule.policy.defer_to_verify != Some(true));
        let cached_type: CaptchaType = dedup.captcha_type;
        let conflicts_with_policy: bool = policy.is_some_and(|rule| {
            matches!(rule.policy.kind, AccessPolicyType::Block | AccessPolicyType::Allow) || rule.policy.captcha_type.is_some_and(|captcha_type| captcha_type != cached_type)
        });
        if !normalized_ip.is_empty() {
            services.decisions.route(dapp, logger).await.map_err(|error| thrown(error.to_string()))?;
        }
        let conflicts_with_routing: bool = coerce_to_enabled_captcha_type(cached_type, Some(allowed), None) != cached_type;
        let conflicts_with_allowed: bool = conflicts_with_routing;
        let mut bundle_conflict: Option<String> = None;
        if let (Some(_), Some(cached_bundle)) = (detector_session_id.filter(|id| !id.is_empty()), dedup.bundle_id.as_deref()) {
            if let Some((incoming, _)) = manager.resolve_bundle_by_detector_session(&pool, detector_session_id).await {
                if incoming != cached_bundle {
                    bundle_conflict = Some(incoming);
                }
            }
        }
        if conflicts_with_policy || conflicts_with_routing || conflicts_with_allowed {
            logger.info(|| {
                let mut data: Map<String, Value> = Map::new();
                data.insert("userSitekeyIpHash".to_string(), json!(hash));
                data.insert("sessionId".to_string(), json!(dedup.session_id));
                data.insert("cachedCaptchaType".to_string(), json!(cached_type.as_str()));
                if conflicts_with_policy {
                    data.insert("policyType".to_string(), json!(policy.map(|rule| rule.policy.kind.as_str())));
                    data.insert("policyCaptchaType".to_string(), json!(policy.and_then(|rule| rule.policy.captcha_type).map(CaptchaType::as_str)));
                }
                if conflicts_with_routing {
                    data.insert("routedCaptchaType".to_string(), json!(cached_type.as_str()));
                }
                if conflicts_with_allowed {
                    data.insert("allowedCaptchaTypes".to_string(), allowed_types_json(allowed));
                }
                LogRecord::msg("Evicting reused session: cached captchaType conflicts with access policy, routing machine or allowed types").with_data(Value::Object(data))
            });
            services.db.check_and_remove_session(&dedup.session_id).await.map_err(ThrownError::from)?;
            if let Some(queue) = services.write_queue() {
                futures_util::join!(queue.invalidate_cached_session(&dedup.session_id), queue.invalidate_cached_session_by_hash(&hash));
            }
        } else {
            if let Some(incoming) = &bundle_conflict {
                logger.info(|| {
                    LogRecord::msg("Rebinding reused session bundleId to match incoming detector").with_data(json!({
                        "userSitekeyIpHash": hash, "sessionId": dedup.session_id, "cachedBundleId": dedup.bundle_id, "incomingBundleId": incoming,
                    }))
                });
                let mut cached: Map<String, Value> = Map::new();
                cached.insert("bundleId".to_string(), json!(incoming));
                services.update_session_record_with_cache(&dedup.session_id, (cached, doc! { "bundleId": incoming }), false, logger).await;
            }
            logger.info(|| LogRecord::msg("Reusing existing session for user-IP-sitekey combination").with_data(json!({ "userSitekeyIpHash": hash, "sessionId": dedup.session_id, "captchaType": cached_type.as_str() })));
            manager.decision("reuse_session", json!({ "captchaType": cached_type.as_str(), "sessionId": dedup.session_id }));
            return Ok(json_answer(session_answer(cached_type, &dedup.session_id, &|name: &str| (state.env)(name), manager.audio_alternative)));
        }
    }

    let ip_address: Bson = Bson::Document(get_composite_ip_address(&normalized_ip).to_document());
    let mut tls: Vec<(&'static str, Option<Bson>)> = Vec::new();
    if let Some(signals) = &signals {
        for part in [serde_json::to_value(signals.timing), serde_json::to_value(&signals.raw_tls)].into_iter().flatten() {
            if let Value::Object(fields) = part {
                for (key, value) in fields {
                    let key: &'static str = Box::leak(key.into_boxed_str());
                    tls.push((key, Some(prosopo_types_database::number::json_to_bson(&value))));
                }
            }
        }
    }
    let common: Common = Common { hash: hash.clone(), dapp: dapp.to_string(), ip_info: stored_ip_info.clone(), headers: flat_headers.clone() };

    let refresh = match text("refreshOf").filter(|id| !id.is_empty()) {
        Some(refresh_of) => match services.db.get_session_record_by_session_id(refresh_of).await.map_err(ThrownError::from)? {
            Some(replaced) if replaced.site_key.as_deref() == Some(dapp) => Some((
                refresh_of.to_string(),
                replaced.refresh_count.unwrap_or(0.0) + 1.0,
                (now.timestamp_millis() - replaced.created_at.timestamp_millis()).max(0) as f64,
                replaced.captcha_type,
            )),
            _ => None,
        },
        None => None,
    };
    manager.image_switch = is_image_switch_request_valid(
        parsed.get("switchToImage").and_then(Value::as_bool) == Some(true),
        refresh.as_ref().map(|(_, _, _, captcha_type)| *captcha_type),
        crate::tasks::puzzle::is_puzzle_image_switch_available(settings.as_ref()),
    );

    let allow_inputs: AllowInputs<'_> = AllowInputs {
        token: &session_token,
        ip_address: &ip_address,
        signer_url: signer_url.as_deref(),
        dapp,
        hash: &hash,
        headers: &flat_headers,
        ip_info: stored_ip_info.clone().filter(|_| valid_info.is_some()),
        client_session_id,
    };

    let signer_rules: Option<Vec<AccessRule>> = if signer_url.is_some() { Some(lookup().await?) } else { None };
    if let Some(rules) = &signer_rules {
        if let Some(block) = rules.iter().find(|rule| rule.policy.defer_to_verify != Some(true) && rule.policy.kind == AccessPolicyType::Block) {
            let mut params: SessionParams = SessionParams::default();
            params.put("token", Some(Bson::String(session_token.clone())));
            params.put("score", Some(Bson::Double(0.0)));
            params.put("threshold", Some(Bson::Double(0.0)));
            params.put("scoreComponents", Some(Bson::Document(doc! { "baseScore": 0.0 })));
            params.put("ipAddress", Some(ip_address.clone()));
            params.put("webView", Some(Bson::Boolean(false)));
            params.put("iFrame", Some(Bson::Boolean(false)));
            params.put("decryptedHeadHash", Some(Bson::String(String::new())));
            params.put("siteKey", Some(Bson::String(dapp.to_string())));
            params.put("ipInfo", stored_ip_info.clone());
            params.put("headers", Some(Bson::Document(flat_headers.clone())));
            params.put("mode", Some(Bson::String(mode.to_string())));
            manager.params = Some(params);
            let mut components: Components = Components::default();
            components.set("baseScore", Bson::Double(0.0));
            let zero: Score = Score { value: 0.0, poisoned: false };
            if let Ok(outcome) = manager.handle_access_policy(Some(block), &common, settings.as_ref(), zero, components, &scope).await.map_err(thrown)? {
                return Ok(finish(outcome, &json_answer));
            }
        }
        if let Some(rule) = allowing(rules) {
            return Ok(json_answer(manager.allow(&allow_inputs, &rule).await.map_err(thrown)?));
        }
    }

    let configured: Option<&str> = settings.as_ref().and_then(|settings| settings.get("captchaType")).and_then(Value::as_str).filter(|value| !value.is_empty());
    let bypass = || async {
        let bundle_id: Option<String> = match detector_session_id.filter(|id| !id.is_empty()) {
            Some(_) => manager.resolve_bundle_by_detector_session(&pool, detector_session_id).await.map(|(id, _)| id),
            None => None,
        };
        let threshold: f64 = resolve_frictionless_threshold(settings.as_ref().and_then(|settings| settings.get("frictionlessThreshold"))).puzzle;
        let mut over: Vec<(&'static str, Option<Bson>)> = vec![
            ("token", Some(Bson::String(if token.is_empty() { format!("nodetector-{}", uuid::Uuid::new_v4()) } else { token.to_string() }))),
            ("score", Some(Bson::Double(0.0))),
            ("threshold", Some(Bson::Double(threshold))),
            ("scoreComponents", Some(Bson::Document(doc! { "baseScore": 0.0 }))),
            ("ipAddress", Some(ip_address.clone())),
            ("webView", Some(Bson::Boolean(false))),
            ("iFrame", Some(Bson::Boolean(false))),
            ("decryptedHeadHash", Some(Bson::String(String::new()))),
            ("siteKey", Some(Bson::String(dapp.to_string()))),
            ("ipInfo", stored_ip_info.clone()),
            ("headers", Some(Bson::Document(flat_headers.clone()))),
            ("mode", Some(Bson::String(mode.to_string()))),
            ("userSitekeyIpHash", Some(Bson::String(hash.clone()))),
            ("bundleId", bundle_id.map(Bson::String)),
        ];
        for (key, value) in &tls {
            if matches!(*key, "tcpToChelloUs" | "chelloToHandshakeUs") {
                over.push((key, value.clone()));
            }
        }
        over
    };
    if let Some(configured) = configured.filter(|configured| *configured != CaptchaType::Frictionless.as_str()) {
        let over = bypass().await;
        manager.decision("configured_captcha_type", json!({ "captchaType": configured }));
        let body: Value = match configured {
            "image" => {
                let mut over = over;
                over.push(("solvedImagesCount", rounds(clamp(state.captcha_counts.solved.count.get(), settings.as_ref()))));
                manager.send_captcha(CaptchaType::Image, &over).await
            }
            "pow" => manager.send_captcha(CaptchaType::Pow, &over).await,
            "puzzle" => manager.send_captcha(CaptchaType::Puzzle, &over).await,
            "iconOrder" => manager.send_captcha(CaptchaType::IconOrder, &over).await,
            other => Err(format!("Unhandled configured captchaType in /frictionless short-circuit: {other}")),
        }
        .map_err(thrown)?;
        return Ok(json_answer(body));
    }
    if pool.size() == 0 {
        let over = bypass().await;
        logger.warn(|| LogRecord::msg("Frictionless decision").with_data(json!({ "requestId": request.extensions.get::<prosopo_api_router::RequestLog>().map(|log| log.request_id.clone()), "decision": "empty_detector_pool_pow_fallback", "captchaType": CaptchaType::Pow.as_str() })));
        if let Some(metrics) = &state.metrics {
            metrics.record_frictionless_decision("empty_detector_pool_pow_fallback");
        }
        return Ok(json_answer(manager.send_captcha(CaptchaType::Pow, &over).await.map_err(thrown)?));
    }

    let lang: LangScore = check_lang_rules(config.l_rules.as_ref(), &header(&request.headers, "accept-language").unwrap_or_default());
    let stores = crate::tasks::request::RequestStores { db: &services.db, write_queue: services.write_queue(), logger };
    let rules_future = async {
        match &signer_rules {
            Some(rules) => Ok(rules.clone()),
            None => lookup().await,
        }
    };
    let (decrypted, validation, rules) = futures_util::join!(manager.decrypt_payload(&pool, token, head_hash, detector_session_id), stores.is_valid_request(&client, CaptchaType::Frictionless, None, None), rules_future);
    let rules: Vec<AccessRule> = rules?;
    if let Some(rule) = allowing(&rules) {
        return Ok(json_answer(manager.allow(&allow_inputs, &rule).await.map_err(thrown)?));
    }
    let override_detector: bool = (state.env)("PROSOPO_TEST_FRICTIONLESS_DETECTOR_OVERRIDE").as_deref() == Some("1");
    let base_bot_score: f64 = if override_detector { 0.0 } else { decrypted.base_bot_score };
    let timestamp: f64 = if override_detector { now.timestamp_millis() as f64 } else { decrypted.timestamp };
    let user_id: Option<String> = if override_detector { header(&request.headers, "prosopo-user") } else { decrypted.user_id.clone() };
    let user_agent: Option<String> = if override_detector { Some(crate::hashing::hash_user_agent(&user_agent_header)) } else { decrypted.user_agent.clone() };
    let decryption_failed: bool = !override_detector && decrypted.decryption_failed;
    let decrypted: Decrypted = Decrypted { decryption_failed, ..decrypted };
    let (l_score, poisoned): (f64, bool) = match lang {
        LangScore::Number(score) => (score, false),
        LangScore::Poisoned => (f64::NAN, true),
    };
    let score: Score = Score { value: base_bot_score + if poisoned { 0.0 } else { l_score }, poisoned };
    match validation.map_err(ThrownError::from)? {
        crate::tasks::request::Validation::Valid { .. } => {}
        crate::tasks::request::Validation::Invalid(reason) => {
            return Ok(Answer::ApiError(reason.as_str().to_string(), ErrorContext::new().with("code", 400).with("siteKey", dapp).with("user", user)));
        }
    }
    if let Some(metrics) = state.metrics.as_ref().filter(|_| !poisoned) {
        metrics.record_bot_score(score.value);
        if let Some(triggered) = decrypted.triggered_detectors.as_ref().filter(|triggered| !triggered.is_empty()) {
            metrics.record_detector_triggered(&triggered.iter().map(|detector| prosopo_util::number_to_string(*detector)).collect::<Vec<String>>());
        }
    }
    let ladder = resolve_frictionless_threshold(settings.as_ref().and_then(|settings| settings.get("frictionlessThreshold")));
    let mut components: Components = Components::default();
    components.set("baseScore", Bson::Double(base_bot_score));
    if poisoned {
        components.set("lScore", Bson::String("poisoned language penalty".to_string()));
    } else if l_score != 0.0 && !l_score.is_nan() {
        components.set("lScore", Bson::Double(l_score));
    }
    if let Some(triggered) = decrypted.triggered_detectors.as_ref().filter(|triggered| !triggered.is_empty()) {
        components.set("triggeredDetectors", Bson::Array(triggered.iter().map(|detector| Bson::Double(*detector)).collect()));
    }
    if let Some(penalty) = decrypted.shadow_dom_penalty {
        components.set("shadowDomPenalty", Bson::Boolean(penalty));
    }
    let mut params: SessionParams = SessionParams::default();
    params.put("token", Some(Bson::String(session_token.clone())));
    params.put("score", Some(score.bson()));
    params.put("threshold", Some(Bson::Double(ladder.puzzle)));
    params.put("scoreComponents", Some(components.bson()));
    params.put("ipAddress", Some(ip_address.clone()));
    params.put("webView", Some(Bson::Boolean(decrypted.web_view)));
    params.put("iFrame", Some(Bson::Boolean(decrypted.i_frame)));
    params.put("decryptedHeadHash", Some(Bson::String(decrypted.decrypted_head_hash.clone())));
    params.put("siteKey", Some(Bson::String(dapp.to_string())));
    params.put("currentUrl", current_url.clone().map(Bson::String));
    params.put("iframeUrl", iframe_url.clone().map(Bson::String));
    params.put("isProtect", is_protect.then_some(Bson::Boolean(true)));
    params.put("ipInfo", stored_ip_info.clone());
    params.put("headers", Some(Bson::Document(flat_headers.clone())));
    params.put("mode", Some(Bson::String(mode.to_string())));
    params.put("bundleId", decrypted.bundle_id.clone().map(Bson::String));
    params.put("simdReadings", decoded_simd.map(|readings| prosopo_types_database::number::json_to_bson(&Value::Object(readings))));
    params.put("d", decrypted.d.clone().map(|d| prosopo_types_database::number::json_to_bson(&Value::Object(d))));
    params.put("clientMetaData", client_session_id.map(|id| Bson::Document(doc! { "clientSessionId": id })));
    if let Some((refresh_of, count, after, _)) = &refresh {
        params.put("refreshOf", Some(Bson::String(refresh_of.clone())));
        params.put("refreshCount", Some(Bson::Double(*count)));
        params.put("refreshedAfterMs", Some(Bson::Double(*after)));
    }
    for (key, value) in &tls {
        params.put(key, value.clone());
    }
    manager.params = Some(params);
    let (image_min, image_max) = bounds(settings.as_ref());
    manager.routing = Some(Routing {
        dapp: dapp.to_string(),
        user: user.to_string(),
        ip: normalized_ip.clone(),
        image_max_rounds: image_max,
        image_min_rounds: image_min,
        base_image_rounds: state.captcha_counts.solved.count.get(),
        puzzle_max_difficulty: settings.as_ref().and_then(|settings| settings.get("puzzleMaxDifficulty")).and_then(Value::as_f64),
        is_mobile: platform(decrypted.web_view).is_mobile,
    });
    let policy: Option<&AccessRule> = rules.iter().find(|rule| !(rule.policy.defer_to_verify == Some(true) && rule.policy.kind == AccessPolicyType::Block));
    let (score, components) = match manager.handle_access_policy(policy, &common, settings.as_ref(), score, components, &scope).await.map_err(thrown)? {
        Ok(outcome) => return Ok(finish(outcome, &json_answer)),
        Err(raised) => raised,
    };
    if let Some(outcome) = manager.handle_traffic_filter(ip_info, settings.as_ref(), &common).await.map_err(thrown)? {
        return Ok(finish(outcome, &json_answer));
    }
    let request_user: Option<String> = header(&request.headers, "prosopo-user");
    let ladder_input: Ladder<'_> = Ladder {
        common: &common,
        settings: settings.as_ref(),
        token,
        head_hash,
        decrypted: &decrypted,
        timestamp,
        user_agent: user_agent.as_deref(),
        user_id: user_id.as_deref(),
        request_user_agent: header(&request.headers, "user-agent"),
        request_user,
        base_bot_score,
        bot_threshold: ladder.puzzle,
        bot_image_threshold: ladder.image,
        current_url: current_url.as_deref(),
        now_ms: now.timestamp_millis() as f64,
    };
    let outcome: Outcome = manager.run_decision_machine(&ladder_input, score, components).await.map_err(thrown)?;
    Ok(finish(outcome, &json_answer))
}

fn finish(outcome: Outcome, json_answer: &dyn Fn(Value) -> Answer) -> Answer {
    match outcome {
        Outcome::Json(body) => json_answer(body),
        Outcome::Unauthorized => Answer::Unauthorized,
    }
}

/// `respondIfAllowed`'s rule: an Allow that applies, unless a Block or Restrict also does.
fn allowing(rules: &[AccessRule]) -> Option<AccessRule> {
    if rules.iter().any(|rule| rule.policy.defer_to_verify != Some(true) && matches!(rule.policy.kind, AccessPolicyType::Block | AccessPolicyType::Restrict)) {
        return None;
    }
    rules.iter().find(|rule| rule.policy.defer_to_verify != Some(true) && rule.policy.kind == AccessPolicyType::Allow).cloned()
}

/// What an authenticated session is minted from.
struct AllowInputs<'a> {
    token: &'a str,
    ip_address: &'a Bson,
    signer_url: Option<&'a str>,
    dapp: &'a str,
    hash: &'a str,
    headers: &'a Document,
    ip_info: Option<Bson>,
    client_session_id: Option<&'a str>,
}

impl Manager<'_> {
    /// `respondIfAllowed`'s answer: an authenticated session.
    async fn allow(&self, inputs: &AllowInputs<'_>, rule: &AccessRule) -> Result<Value, String> {
        let session: Session = self
            .create_authenticated_session(inputs.token, inputs.ip_address, inputs.signer_url, inputs.dapp, inputs.hash, inputs.headers, inputs.ip_info.clone(), inputs.client_session_id)
            .await?;
        self.decision(
            "authenticated_allow_rule",
            json!({ "captchaType": CaptchaType::Authenticated.as_str(), "sessionId": session.session_id, "webBotAuthAgent": inputs.signer_url, "ruleType": rule.policy.description }),
        );
        let mut body: Map<String, Value> = match session_answer(CaptchaType::Authenticated, &session.session_id, &|name: &str| self.env(name), false) {
            Value::Object(body) => body,
            _ => Map::new(),
        };
        if let Some(agent) = inputs.signer_url {
            body.insert("agent".to_string(), json!(agent));
        }
        Ok(Value::Object(body))
    }
}
