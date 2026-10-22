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

//! tasks/powCaptcha/powTasksUtils.ts, the checks a PoW solution submission runs, and
//! powTasks.ts's `verifyPowCaptchaSolution` with submitPoWCaptchaSolution.ts's
//! `buildEscalation`.

use crate::composite_ip::{get_composite_ip_address, is_same_ip_origin};
use crate::device_platform::derive_platform;
use crate::mobile_signals::MobileSignals;
use crate::tasks::captcha_type_selection::coerce_to_enabled_captcha_type;
use crate::tasks::detection::{DecodedSubmission, DetectionServices};
use crate::tasks::frictionless::SessionStores;
use crate::tasks::puzzle::PuzzleDifficultySamplers;
use crate::tasks::usage_counters::build_all_window_increments;
use crate::tasks::verify::VerifyServices;
use bson::{Bson, DateTime, Document};
use prosopo_captcha_severity::{resolve_max_escalation_level, severity_to_puzzle_difficulty};
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_database::challenges::{is_blocking, Coords};
use prosopo_database::records::{ChallengeRecord, StoredResult};
use prosopo_database::session::Session;
use prosopo_logger::{LogRecord, Logger};
use prosopo_types::api_types::ClientMetaData;
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::datasets::CaptchaStatus;
use prosopo_types::decision_machine::{CounterCaptchaType, CounterKind};
use prosopo_types::reasons::{FrictionlessReason, ResultReason};
use prosopo_types::settings::{AllowedTypes, IMAGE_MAX_ROUNDS_DEFAULT};
use prosopo_types::stored::SimdReadingsStage;
use prosopo_types_database::number::json_to_bson;
use serde_json::{json, Map, Value};
use prosopo_util_crypto::js::js_number_to_string;
use prosopo_util_crypto::signature::signature_verify;
use prosopo_util_crypto::u8a::U8aLike;
use sha2::{Digest, Sha256};

/// `validateSolution`: whether `sha256(nonce + challenge)` meets `difficulty`, the nonce
/// written as JS writes a number.
pub fn validate_solution(nonce: f64, challenge: &str, difficulty: f64) -> Result<bool, String> {
    let message: String = format!("{}{challenge}", js_number_to_string(nonce));
    let hash = Sha256::digest(message.as_bytes());
    prosopo_util::hash_meets_difficulty(&hash, difficulty).map_err(|error| error.to_string())
}

/// Why a PoW signature check did not pass: the signature is wrong, or it could not be checked
/// at all (a malformed signature or address), which the TS throws as a plain error.
#[derive(Debug)]
pub enum PowSignatureError {
    Invalid(ProsopoError),
    Unreadable(String),
}

/// `checkPowSignature`: `signature` is `address`'s over the UTF-8 of `message`.
pub fn check_pow_signature(message: &str, signature: &str, address: &str, signature_type: Option<&str>) -> Result<(), PowSignatureError> {
    let verification = signature_verify(U8aLike::Bytes(message.as_bytes()), U8aLike::Str(signature), U8aLike::Str(address))
        .map_err(|error| PowSignatureError::Unreadable(error.to_string()))?;
    if verification.is_valid {
        return Ok(());
    }
    let label: String = signature_type.map_or_else(|| "undefined".to_string(), str::to_string);
    let mut context: ErrorContext = ErrorContext::new()
        .with("ERROR", format!("Signature is invalid for this message: {label}"))
        .with("failedFuncName", "checkPowSignature")
        .with("address", address)
        .with("message", message)
        .with("signature", signature);
    if let Some(signature_type) = signature_type {
        context = context.with("signatureType", signature_type);
    }
    Err(PowSignatureError::Invalid(ProsopoError::new(
        ErrorClass::Api,
        ErrorSource::key("GENERAL.INVALID_SIGNATURE"),
        ErrorOptions { context: Some(context), ..ErrorOptions::default() },
    )))
}

/// `isCoordsAllZero`: there are coordinates, and every group has some and all are `(0, 0)`.
pub fn is_coords_all_zero(coords: Option<&[Vec<[f64; 2]>]>) -> bool {
    coords.is_some_and(|groups| !groups.is_empty() && groups.iter().all(|group| !group.is_empty() && group.iter().all(|[x, y]| *x == 0.0 && *y == 0.0)))
}

/// The routing machine's output as far as the Rust produces one: the baseline when no machine
/// applies, or the image escalation the missing-coordinates and changed-address rules force.
#[derive(Debug, Clone, PartialEq)]
pub struct Routed {
    pub captcha_type: CaptchaType,
    pub reason: Option<String>,
    pub pow_difficulty: Option<f64>,
}

/// `VerifyPowCaptchaSolutionResult`.
#[derive(Debug, Clone, PartialEq)]
pub struct PowVerified {
    pub verified: bool,
    pub routed: Option<Routed>,
}

/// What a PoW solution submission carries.
pub struct PowSubmission<'a> {
    pub challenge: &'a str,
    pub provider_signature: &'a str,
    pub nonce: f64,
    /// `solutionTimeout`, or `verifiedTimeout` for a site that predates it.
    pub timeout: f64,
    pub user_signature: &'a str,
    /// `req.ip`.
    pub ip: &'a str,
    pub behavioral_data: Option<&'a str>,
    pub salt: Option<&'a str>,
    pub simd_readings: Option<&'a str>,
    pub client_meta_data: Option<&'a ClientMetaData>,
}

/// Why a submission could not be judged; each is a 500 to the widget.
#[derive(Debug)]
pub enum PowSolutionError {
    Signature(PowSignatureError),
    Failed(String),
    RoutingMachine(crate::tasks::decision::UnsupportedDecisionMachine),
}

impl From<ProsopoError> for PowSolutionError {
    fn from(error: ProsopoError) -> PowSolutionError {
        PowSolutionError::Failed(error.message().to_string())
    }
}

/// What the PoW verify needs of the provider.
pub struct PowSolutionServices<'a> {
    pub services: &'a VerifyServices,
    pub detection: DetectionServices<'a>,
    pub provider_address: &'a str,
    pub now_ms: f64,
    pub logger: &'a Logger,
}

fn result_json(result: &StoredResult) -> Value {
    let mut out: Map<String, Value> = Map::new();
    out.insert("status".to_string(), json!(result.status.as_str()));
    if let Some(reason) = &result.reason {
        out.insert("reason".to_string(), json!(reason));
    }
    Value::Object(out)
}

/// The session side of a submission: submitted, with its result, `blocked` where the result
/// blocks, and the render's client metadata.
fn submitted_session(result: &StoredResult, client_meta_data: Option<&ClientMetaData>) -> (Map<String, Value>, Document) {
    let mut cached: Map<String, Value> = Map::new();
    let mut stored: Document = Document::new();
    cached.insert("userSubmitted".to_string(), json!(true));
    stored.insert("userSubmitted", true);
    cached.insert("result".to_string(), result_json(result));
    stored.insert("result", result.to_document());
    if is_blocking(CaptchaType::Pow, result) {
        cached.insert("blocked".to_string(), json!(true));
        stored.insert("blocked", true);
    }
    if let Some(meta) = client_meta_data {
        let value: Value = serde_json::to_value(meta).unwrap_or(Value::Null);
        stored.insert("clientMetaData", json_to_bson(&value));
        cached.insert("clientMetaData".to_string(), value);
    }
    (cached, stored)
}

fn coords_of(salt: &str) -> Result<Option<Coords>, String> {
    let extracted: Vec<f64> = prosopo_util::extract_data(salt).map_err(|error| error.to_string())?;
    if extracted.len() < 2 {
        return Ok(None);
    }
    let built: Coords = vec![vec![vec![extracted[0], extracted[1]]]];
    prosopo_util::assert_coords_safe(&built, "coords").map_err(|error| error.to_string())?;
    Ok(Some(built))
}

impl PowSolutionServices<'_> {
    async fn refuse(&self, record: &ChallengeRecord, submission: &PowSubmission<'_>, reason: ResultReason, coords: Option<&Coords>) -> Result<PowVerified, PowSolutionError> {
        let result: StoredResult = StoredResult::new(CaptchaStatus::Disapproved, Some(reason.as_str()));
        let db = &self.services.db;
        let record_write = db.update_pow_captcha_record_result(submission.challenge, &result, false, true, Some(submission.user_signature), coords);
        let session_write = async {
            if let Some(session_id) = record.session_id.as_deref().filter(|id| !id.is_empty()) {
                self.services.update_session_record_with_cache(session_id, submitted_session(&result, None), true, self.logger).await;
            }
        };
        let (written, ()) = futures_util::join!(record_write, session_write);
        written?;
        Ok(PowVerified { verified: false, routed: None })
    }

    /// `verifyPowCaptchaSolution`.
    pub async fn verify(&self, submission: &PowSubmission<'_>) -> Result<PowVerified, PowSolutionError> {
        check_pow_signature(submission.challenge, submission.provider_signature, self.provider_address, Some("challenge")).map_err(PowSolutionError::Signature)?;
        let split: Vec<&str> = submission.challenge.split(prosopo_types::datasets::POW_SEPARATOR).collect();
        let part = |index: usize| split.get(index).copied().ok_or_else(|| PowSolutionError::Failed(format!("Index {index} is out of bounds")));
        let timestamp: f64 = prosopo_util::parse_int(part(0)?, 10);
        let user_account: &str = part(1)?;
        check_pow_signature(&prosopo_util::number_to_string(timestamp), submission.user_signature, user_account, Some("timestamp")).map_err(PowSolutionError::Signature)?;
        let db = &self.services.db;
        let Some(record) = db.get_pow_captcha_record_by_challenge(submission.challenge).await? else {
            self.logger.debug(|| LogRecord::msg(format!("No record of this challenge: {}", submission.challenge)));
            return Ok(PowVerified { verified: false, routed: None });
        };
        if record.user_submitted == Some(true) {
            self.logger.debug(|| LogRecord::msg(format!("Challenge already submitted: {}", submission.challenge)));
            return Ok(PowVerified { verified: false, routed: None });
        }
        let mut coords: Option<Coords> = None;
        if let Some(salt) = submission.salt.filter(|salt| !salt.is_empty()) {
            match coords_of(salt) {
                Ok(read) => coords = read,
                Err(error) => {
                    self.logger.warn(|| LogRecord::msg("Failed to extract coordinates from salt").with_data(json!({ "error": { "message": error }, "salt": salt })));
                    return self.refuse(&record, submission, ResultReason::CaptchaInvalidSalt, None).await;
                }
            }
        }
        if !prosopo_util::verify_recency_at(submission.challenge, submission.timeout, self.now_ms) {
            return self.refuse(&record, submission, ResultReason::CaptchaInvalidTimestamp, coords.as_ref()).await;
        }
        let correct: bool = validate_solution(submission.nonce, submission.challenge, record.difficulty.unwrap_or(f64::NAN)).map_err(PowSolutionError::Failed)?;
        let result: StoredResult =
            if correct { StoredResult::new(CaptchaStatus::Approved, None) } else { StoredResult::new(CaptchaStatus::Disapproved, Some(ResultReason::CaptchaInvalidSolution.as_str())) };
        let dapp_account: &str = part(2)?;
        let ip = prosopo_util::get_ip_address(submission.ip).map_err(|error| PowSolutionError::Failed(error.to_string()))?;
        if correct {
            if let Some(counters) = self.services.usage_counters() {
                counters.incr_many_async(dapp_account, build_all_window_increments(CounterKind::Solved, CounterCaptchaType::Type(CaptchaType::Pow), ip.address(), user_account, None));
            }
        }
        let decoded: DecodedSubmission = self.detection.decode_submission_payloads(record.session_id.as_deref(), submission.behavioral_data, submission.simd_readings).await;
        let mut record_updates: Document = Document::new();
        if submission.behavioral_data.is_some_and(|data| !data.is_empty()) {
            if let Some(behaviour) = &decoded.behavioural {
                let collector = |key: &str| behaviour.get(key).filter(|value| !value.is_null()).cloned().unwrap_or_else(|| json!([]));
                let length = |key: &str| behaviour.get(key).and_then(Value::as_array).map_or(0, Vec::len);
                let device_capability: Value = behaviour.get("deviceCapability").cloned().unwrap_or(Value::Null);
                self.logger.info(|| {
                    LogRecord::msg("Behavioral analysis completed").with_data(json!({
                        "userAccount": user_account,
                        "dappAccount": dapp_account,
                        "challenge": submission.challenge,
                        "mouseEventsCount": length("collector1"),
                        "touchEventsCount": length("collector2"),
                        "clickEventsCount": length("collector3"),
                        "scrollEventsCount": length("collector4"),
                        "deviceCapability": device_capability,
                        "captchaResult": if correct { "passed" } else { "failed" },
                    }))
                });
                let packed: Value = json!({ "c1": collector("collector1"), "c2": collector("collector2"), "c3": collector("collector3"), "c4": collector("collector4"), "d": device_capability });
                record_updates.insert("behavioralDataPacked", json_to_bson(&packed));
                record_updates.insert("deviceCapability", json_to_bson(&device_capability));
            }
        }
        let stored_meta: Option<ClientMetaData> = crate::client_meta_data::to_stored_client_meta_data(submission.client_meta_data);
        if let Some(meta) = &stored_meta {
            record_updates.insert("clientMetaData", json_to_bson(&serde_json::to_value(meta).unwrap_or(Value::Null)));
        }
        if !record_updates.is_empty() {
            db.update_pow_captcha_record(submission.challenge, &record_updates).await?;
        }
        let record_write = db.update_pow_captcha_record_result(submission.challenge, &result, false, true, Some(submission.user_signature), coords.as_ref());
        let session_writes = async {
            if let Some(session_id) = record.session_id.as_deref().filter(|id| !id.is_empty()) {
                let simd = async {
                    if let Some(readings) = decoded.simd.clone() {
                        self.detection.record_session_simd_readings_if_absent_with_cache(session_id, readings, SimdReadingsStage::Submit).await;
                    }
                };
                futures_util::join!(self.services.update_session_record_with_cache(session_id, submitted_session(&result, stored_meta.as_ref()), true, self.logger), simd);
            }
        };
        let (written, ()) = futures_util::join!(record_write, session_writes);
        written?;
        if !correct {
            return Ok(PowVerified { verified: false, routed: None });
        }
        let linked: bool = record.session_id.as_deref().is_some_and(|id| !id.is_empty());
        let escalate_for_missing_coords: bool = coords.is_none() && linked;
        let solve_ip = get_composite_ip_address(submission.ip);
        let escalate_for_ip_change: bool = linked && !is_same_ip_origin(&record.ip_address, &solve_ip);
        if escalate_for_ip_change {
            self.logger.info(|| {
                LogRecord::msg("PoW solve arrived from a different address than the challenge").with_data(json!({
                    "challenge": submission.challenge,
                    "issuedType": record.ip_address.ip_type.as_str(),
                    "solvedType": solve_ip.ip_type.as_str(),
                }))
            });
        }
        let mut routed: Option<Routed> = None;
        if let Some(session_id) = record.session_id.as_deref().filter(|id| !id.is_empty()) {
            if db.get_session_record_by_session_id(session_id).await?.is_some() {
                self.services.decisions.route(dapp_account, self.logger).await.map_err(PowSolutionError::RoutingMachine)?;
                routed = Some(Routed { captcha_type: CaptchaType::Pow, reason: None, pow_difficulty: record.difficulty });
            } else {
                self.logger.debug(|| LogRecord::msg("Skipping post-pow routing: session record not found").with_data(json!({ "sessionId": session_id })));
            }
        } else {
            self.logger.debug(|| LogRecord::msg("Skipping post-pow routing: PoW record has no linked session"));
        }
        let visual = |routed: &Option<Routed>| routed.as_ref().is_some_and(|routed| matches!(routed.captcha_type, CaptchaType::Image | CaptchaType::Puzzle));
        if (escalate_for_missing_coords || escalate_for_ip_change) && !visual(&routed) {
            let reason: FrictionlessReason = if escalate_for_missing_coords { FrictionlessReason::MissingCoordinates } else { FrictionlessReason::IpChanged };
            routed = Some(Routed { captcha_type: CaptchaType::Image, reason: Some(reason.as_str().to_string()), pow_difficulty: None });
        }
        Ok(PowVerified { verified: true, routed })
    }
}

/// What a site allows an escalation to serve.
pub struct SiteConstraints {
    pub allowed: AllowedTypes,
    pub image_max_rounds: Option<f64>,
    pub puzzle_max_difficulty: Option<f64>,
}

/// What `buildEscalation` needs of the provider.
pub struct EscalationServices<'a> {
    pub services: &'a VerifyServices,
    pub samplers: &'a PuzzleDifficultySamplers,
    pub session_id_prefix: &'a str,
    pub base_image_rounds: f64,
    pub now: DateTime,
    pub logger: &'a Logger,
}

/// `PowCaptchaSolutionEscalation`.
#[derive(Debug, Clone, PartialEq)]
pub struct Escalation {
    pub captcha_type: CaptchaType,
    pub session_id: String,
}

/// The origin's fields an escalation carries, as `buildEscalation` lists them.
const CARRIED: [&str; 18] = [
    "token", "score", "threshold", "scoreComponents", "ipAddress", "userSitekeyIpHash", "webView", "iFrame", "decryptedHeadHash", "ipInfo", "headers", "mode",
    "simdReadings", "d", "bundleId", "currentUrl", "iframeUrl", "clientMetaData",
];

impl EscalationServices<'_> {
    /// `buildEscalation`: a fresh session of the routed type, carrying the origin session's
    /// risk profile, unless the routing kept the user on PoW or the site allows neither visual
    /// type. `per_connection` is this request's handshake and TCP signals, by their session keys.
    pub async fn build(&self, verified: &PowVerified, challenge: &str, per_connection: &Map<String, Value>, site: &SiteConstraints) -> Result<Option<Escalation>, PowSolutionError> {
        let Some(routed) = verified.routed.as_ref().filter(|_| verified.verified) else {
            return Ok(None);
        };
        if !matches!(routed.captcha_type, CaptchaType::Image | CaptchaType::Puzzle) {
            return Ok(None);
        }
        let db = &self.services.db;
        let Some(record) = db.get_pow_captcha_record_by_challenge(challenge).await? else {
            return Ok(None);
        };
        let Some(origin_id) = record.session_id.clone().filter(|id| !id.is_empty()) else {
            return Ok(None);
        };
        let Some(origin) = db.get_session_record_by_session_id(&origin_id).await? else {
            return Ok(None);
        };
        let escalated: CaptchaType = coerce_to_enabled_captcha_type(routed.captcha_type, Some(site.allowed), None);
        if escalated == CaptchaType::Pow {
            return Ok(None);
        }
        let image_max_rounds: f64 = site.image_max_rounds.unwrap_or(IMAGE_MAX_ROUNDS_DEFAULT);
        let puzzle = if escalated == CaptchaType::Puzzle { self.puzzle_overrides(&origin, &record, site) } else { None };
        let origin_document: Document = bson::serialize_to_document(&origin).map_err(|error| PowSolutionError::Failed(error.to_string()))?;
        let mut fields: Document = Document::new();
        for key in CARRIED {
            if let Some(value) = origin_document.get(key).filter(|value| !matches!(value, Bson::Null)) {
                fields.insert(key, value.clone());
            }
        }
        fields.insert("captchaType", escalated.as_str());
        fields.insert("siteKey", origin.site_key.clone().unwrap_or_else(|| record.dapp_account.clone()));
        if escalated == CaptchaType::Image {
            fields.insert("solvedImagesCount", origin.solved_images_count.unwrap_or(self.base_image_rounds).min(image_max_rounds));
        }
        if let Some(reason) = routed.reason.clone().or_else(|| origin.reason.clone()) {
            fields.insert("reason", reason);
        }
        if origin.is_protect == Some(true) {
            fields.insert("isProtect", true);
        }
        fields.insert("isEscalation", true);
        fields.insert("originSessionId", origin.session_id.clone());
        for (key, value) in per_connection {
            fields.insert(key.clone(), json_to_bson(value));
        }
        if let Some(sampled) = &puzzle {
            fields.insert("puzzleTolerance", sampled.tolerance);
            fields.insert("puzzle", json_to_bson(&sampled.puzzle_settings()));
        }
        let session_id: String = format!("{}-{}", self.session_id_prefix, uuid::Uuid::new_v4());
        let stores: SessionStores<'_> = SessionStores { db, write_queue: self.services.write_queue() };
        let session: Session = stores.create_session(session_id, self.now, &fields).await.map_err(PowSolutionError::Failed)?;
        if let Some(queue) = self.services.write_queue() {
            queue.cache_session_escalation(&origin_id, &session.session_id, None).await;
        }
        Ok(Some(Escalation { captcha_type: escalated, session_id: session.session_id }))
    }

    /// The puzzle drawn for an escalation, off the image-rounds severity and the device's
    /// ceiling; none at level 0, which leaves the site's own puzzle settings in force.
    fn puzzle_overrides(&self, origin: &Session, record: &ChallengeRecord, site: &SiteConstraints) -> Option<crate::tasks::puzzle::SampledPuzzleDifficulty> {
        let user_agent: &str = origin.headers.as_ref().and_then(|headers| headers.get_str("user-agent").ok()).unwrap_or_default();
        let ip_info: Option<Value> = origin.ip_info.as_ref().map(crate::tasks::verify::bson_json);
        let carrier_network: Option<bool> =
            ip_info.as_ref().filter(|info| info.get("isValid").and_then(Value::as_bool) == Some(true)).and_then(|info| info.get("isMobile").and_then(Value::as_bool));
        let packed: Option<Value> = record.behavioral_data_packed.as_ref().map(crate::tasks::verify::bson_json);
        let touch_event_count: Option<f64> = packed.as_ref().and_then(|packed| packed.get("c2")).and_then(Value::as_array).map(|events| events.len() as f64);
        let is_mobile: bool = derive_platform(
            user_agent,
            origin.web_view,
            MobileSignals {
                headers: origin.headers.as_ref(),
                carrier_network,
                tcp_mss: origin.tcp_mss,
                device_capability: record.device_capability.as_deref(),
                touch_event_count,
                ..MobileSignals::default()
            },
        )
        .is_mobile;
        let level: f64 = severity_to_puzzle_difficulty(origin.solved_images_count, self.base_image_rounds, Some(resolve_max_escalation_level(site.puzzle_max_difficulty, is_mobile)));
        if level == 0.0 {
            return None;
        }
        Some(self.samplers.sample(level, prosopo_puzzle_assets::DEFAULT_RENDER_SETTINGS.hole_darken, None))
    }
}
