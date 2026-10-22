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

//! interactiveCaptchaManager.ts's `submitInteractiveCaptchaSolution`, the submission the
//! puzzle, audio and icon-order solution routes share, with each type's grading
//! (puzzleTasksUtils.ts, audioTasksUtils.ts, icon-order-assets' `gradeClicks`).

use crate::tasks::detection::{DecodedSubmission, DetectionServices};
use crate::tasks::pow::{check_pow_signature, coords_of, submitted_session, PowSolutionError};
use crate::tasks::usage_counters::build_all_window_increments;
use crate::tasks::verify::VerifyServices;
use bson::Document;
use prosopo_database::challenges::{Coords, Interactive};
use prosopo_database::records::{ChallengeRecord, StoredResult};
use prosopo_icon_order_assets::{grade_clicks, Click, IconTargetGeometry};
use prosopo_logger::{LogRecord, Logger};
use prosopo_types::api_types::ClientMetaData;
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::datasets::CaptchaStatus;
use prosopo_types::decision_machine::{CounterCaptchaType, CounterKind};
use prosopo_types::reasons::ResultReason;
use prosopo_types::stored::SimdReadingsStage;
use prosopo_types_database::number::json_to_bson;
use serde_json::{json, Value};

/// `validatePuzzleSolution`: within `tolerance` of the target, by Euclidean distance.
pub fn validate_puzzle_solution(final_x: f64, final_y: f64, target_x: f64, target_y: f64, tolerance: f64) -> bool {
    ((final_x - target_x).powi(2) + (final_y - target_y).powi(2)).sqrt() <= tolerance
}

/// `normaliseAudioAnswer`: the ASCII digits, in order.
pub fn normalise_audio_answer(raw: &str) -> String {
    raw.chars().filter(char::is_ascii_digit).collect()
}

/// `validateAudioSolution`: the digits match exactly, and neither side is empty.
pub fn validate_audio_solution(submitted: &str, expected: &str) -> bool {
    let normalised: String = normalise_audio_answer(submitted);
    !normalised.is_empty() && !expected.is_empty() && normalised == expected
}

/// What a submission answered, by type, as the parsed body has it.
pub enum Answer<'a> {
    Puzzle { final_x: f64, final_y: f64, puzzle_events: &'a Value },
    Audio { answer: &'a str, replays: f64, audio_events: Value },
    IconOrder { clicks: &'a Value, icon_order_events: &'a Value },
}

impl Answer<'_> {
    fn kind(&self) -> Interactive {
        match self {
            Answer::Puzzle { .. } => Interactive::Puzzle,
            Answer::Audio { .. } => Interactive::Audio,
            Answer::IconOrder { .. } => Interactive::IconOrder,
        }
    }

    fn is_correct(&self, record: &ChallengeRecord) -> bool {
        let number = |value: Option<f64>| value.unwrap_or(f64::NAN);
        match self {
            Answer::Puzzle { final_x, final_y, .. } => validate_puzzle_solution(*final_x, *final_y, number(record.target_x), number(record.target_y), number(record.tolerance)),
            Answer::Audio { answer, .. } => validate_audio_solution(answer, record.answer.as_deref().unwrap_or_default()),
            Answer::IconOrder { clicks, .. } => {
                let targets: Vec<IconTargetGeometry> =
                    record.targets.iter().flatten().map(|target| IconTargetGeometry { x: target.x, y: target.y, size: target.size }).collect();
                let clicks: Vec<Click> = clicks
                    .as_array()
                    .into_iter()
                    .flatten()
                    .map(|click| Click { x: click.get("x").and_then(Value::as_f64).unwrap_or(f64::NAN), y: click.get("y").and_then(Value::as_f64).unwrap_or(f64::NAN) })
                    .collect();
                grade_clicks(&targets, &clicks, number(record.tolerance))
            }
        }
    }

    /// `persistInteraction`: the raw trail, whatever the verdict.
    fn interaction(&self) -> Document {
        let mut out: Document = Document::new();
        match self {
            Answer::Puzzle { puzzle_events, .. } => {
                out.insert("puzzleEvents", json_to_bson(puzzle_events));
            }
            Answer::Audio { answer, replays, audio_events } => {
                out.insert("audioEvents", json_to_bson(audio_events));
                out.insert("replays", *replays);
                out.insert("submittedAnswer", normalise_audio_answer(answer));
            }
            Answer::IconOrder { clicks, icon_order_events } => {
                out.insert("clicks", json_to_bson(clicks));
                out.insert("iconOrderEvents", json_to_bson(icon_order_events));
            }
        }
        out
    }
}

/// What an interactive submission carries besides its answer.
pub struct InteractiveSubmission<'a> {
    pub challenge: &'a str,
    pub provider_signature: &'a str,
    pub timeout: f64,
    pub user_signature: &'a str,
    pub ip: &'a str,
    pub behavioral_data: Option<&'a str>,
    pub salt: Option<&'a str>,
    pub simd_readings: Option<&'a str>,
    pub client_meta_data: Option<&'a ClientMetaData>,
    pub answer: Answer<'a>,
}

/// What the interactive submission needs of the provider.
pub struct InteractiveServices<'a> {
    pub services: &'a VerifyServices,
    pub detection: DetectionServices<'a>,
    pub provider_address: &'a str,
    pub now_ms: f64,
    pub logger: &'a Logger,
}

fn captcha_type_of(kind: Interactive) -> CaptchaType {
    match kind {
        Interactive::Puzzle => CaptchaType::Puzzle,
        Interactive::Audio => CaptchaType::Audio,
        Interactive::IconOrder => CaptchaType::IconOrder,
    }
}

impl InteractiveServices<'_> {
    /// `recordSubmissionResult`: the record's verdict, then the session's. The interactive
    /// managers are built without the write queue, so the cached session is left as it was.
    async fn record_result(&self, kind: Interactive, record: &ChallengeRecord, result: &StoredResult, user_signature: &str, coords: Option<&Coords>, client_meta_data: Option<&ClientMetaData>) -> Result<(), PowSolutionError> {
        self.services.db.update_interactive_captcha_record_result(kind, &record.challenge, result, false, true, Some(user_signature), coords, None).await?;
        if let Some(session_id) = record.session_id.as_deref().filter(|id| !id.is_empty()) {
            let (_, stored) = submitted_session(captcha_type_of(kind), result, client_meta_data);
            self.services.schedule_mongo_session_update(session_id, stored, false, self.logger);
        }
        Ok(())
    }

    /// `submitInteractiveCaptchaSolution`: whether the answer was right, recorded once.
    pub async fn submit(&self, submission: &InteractiveSubmission<'_>) -> Result<bool, PowSolutionError> {
        let kind: Interactive = submission.answer.kind();
        check_pow_signature(submission.challenge, submission.provider_signature, self.provider_address, Some("challenge")).map_err(PowSolutionError::Signature)?;
        let split: Vec<&str> = submission.challenge.split(prosopo_types::datasets::POW_SEPARATOR).collect();
        let part = |index: usize| split.get(index).copied().ok_or_else(|| PowSolutionError::Failed(format!("Index {index} is out of bounds")));
        let timestamp: f64 = prosopo_util::parse_int(part(0)?, 10);
        let user_account: &str = part(1)?;
        check_pow_signature(&prosopo_util::number_to_string(timestamp), submission.user_signature, user_account, Some("timestamp")).map_err(PowSolutionError::Signature)?;
        let db = &self.services.db;
        let Some(record) = db.get_interactive_captcha_record_by_challenge(kind, submission.challenge).await? else {
            self.logger.debug(|| LogRecord::msg(format!("No record of this challenge: {}", submission.challenge)));
            return Ok(false);
        };
        let (coords, salt_unreadable): (Option<Coords>, bool) = match submission.salt.filter(|salt| !salt.is_empty()).map(coords_of) {
            None => (None, false),
            Some(Ok(coords)) => (coords, false),
            Some(Err(error)) => {
                self.logger.warn(|| LogRecord::msg("Failed to extract coordinates from salt").with_data(json!({ "error": { "message": error }, "salt": submission.salt })));
                (None, true)
            }
        };
        // The TS claims a puzzle by reading `userSubmitted` off the record it fetched, which two
        // concurrent submissions can both pass; audio and icon-order claim atomically, and so
        // does the Rust for all three (MIGRATION-LOG.md, DEVIATION in slice 3m).
        let claimed: bool = match kind {
            Interactive::Puzzle => record.user_submitted != Some(true) && db.claim_puzzle_captcha_submission(submission.challenge).await?,
            _ => db.claim_interactive_captcha_submission(kind, submission.challenge).await?,
        };
        if !claimed {
            self.logger.debug(|| LogRecord::msg(format!("Challenge already submitted: {}", submission.challenge)));
            return Ok(false);
        }
        if salt_unreadable {
            let result: StoredResult = StoredResult::new(CaptchaStatus::Disapproved, Some(ResultReason::CaptchaInvalidSalt.as_str()));
            self.record_result(kind, &record, &result, submission.user_signature, None, None).await?;
            return Ok(false);
        }
        if !prosopo_util::verify_recency_at(submission.challenge, submission.timeout, self.now_ms) {
            let result: StoredResult = StoredResult::new(CaptchaStatus::Disapproved, Some(ResultReason::CaptchaInvalidTimestamp.as_str()));
            self.record_result(kind, &record, &result, submission.user_signature, coords.as_ref(), None).await?;
            return Ok(false);
        }
        let correct: bool = submission.answer.is_correct(&record);
        let result: StoredResult =
            if correct { StoredResult::new(CaptchaStatus::Approved, None) } else { StoredResult::new(CaptchaStatus::Disapproved, Some(ResultReason::CaptchaInvalidSolution.as_str())) };
        let dapp_account: &str = part(2)?;
        let ip = prosopo_util::get_ip_address(submission.ip).map_err(|error| PowSolutionError::Failed(error.to_string()))?;
        if correct {
            if let Some(counters) = self.services.usage_counters() {
                counters.incr_many_async(dapp_account, build_all_window_increments(CounterKind::Solved, CounterCaptchaType::Type(captcha_type_of(kind)), ip.address(), user_account, None));
            }
        }
        db.update_interactive_captcha_record(kind, submission.challenge, &submission.answer.interaction()).await?;
        let decoded: DecodedSubmission = self.detection.decode_submission_payloads(record.session_id.as_deref(), submission.behavioral_data, submission.simd_readings).await;
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
                let mut updates: Document = Document::new();
                updates.insert("behavioralDataPacked", json_to_bson(&packed));
                updates.insert("deviceCapability", json_to_bson(&device_capability));
                db.update_interactive_captcha_record(kind, submission.challenge, &updates).await?;
            }
        }
        let stored_meta: Option<ClientMetaData> = crate::client_meta_data::to_stored_client_meta_data(submission.client_meta_data);
        if let Some(meta) = &stored_meta {
            let mut updates: Document = Document::new();
            updates.insert("clientMetaData", json_to_bson(&serde_json::to_value(meta).unwrap_or(Value::Null)));
            db.update_interactive_captcha_record(kind, submission.challenge, &updates).await?;
        }
        self.record_result(kind, &record, &result, submission.user_signature, coords.as_ref(), stored_meta.as_ref()).await?;
        if let (Some(session_id), Some(readings)) = (record.session_id.as_deref().filter(|id| !id.is_empty()), decoded.simd) {
            self.detection.record_session_simd_readings_if_absent_with_cache(session_id, readings, SimdReadingsStage::Submit).await;
        }
        Ok(correct)
    }
}
