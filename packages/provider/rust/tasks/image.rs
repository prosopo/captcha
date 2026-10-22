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

//! tasks/image: imgCaptchaTasks.ts's `getRandomCaptchasAndRequestHash`, which draws an image
//! challenge's captchas and stores the pending request they are answered against.

use bson::{Bson, DateTime, Document};
use prosopo_common::{ErrorClass, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_database::provider::ProviderDatabase;
use prosopo_database::records::CompositeIpAddress;
use prosopo_datasets::compute_pending_request_hash;
use prosopo_keyring::KeyringPair;
use prosopo_types::timeouts::DEFAULT_IMAGE_CAPTCHA_TIMEOUT;
use prosopo_util_crypto::js::JoinValue;
use prosopo_util_crypto::random::random_as_hex;
use prosopo_util_crypto::u8a::{u8a_to_hex, U8aLike};

/// The captchas drawn for one image challenge, the request hash they are answered against and
/// the provider's signature over it.
pub struct ImageChallenge {
    pub captchas: Vec<Document>,
    pub request_hash: String,
    pub timestamp: i64,
    pub signed_request_hash: String,
}

/// What `getRandomCaptchasAndRequestHash` is asked for.
pub struct ImageChallengeRequest<'a> {
    pub dataset_id: &'a str,
    pub user: &'a str,
    pub ip_address: &'a CompositeIpAddress,
    pub solved_count: f64,
    pub unsolved_count: f64,
    pub threshold: f64,
    pub session_id: Option<&'a str>,
    pub ip_info: Option<&'a Bson>,
}

/// `shuffleArray`, drawing from `Math.random`.
fn shuffle<T>(items: &mut [T], random: impl Fn() -> f64) {
    for index in (1..items.len()).rev() {
        let other: usize = (random() * (index + 1) as f64).floor() as usize;
        items.swap(index, other);
    }
}

/// `Math.abs(Math.trunc(count))`, with NaN as no count at all.
fn whole_count(count: f64) -> usize {
    if count.is_nan() {
        return 0;
    }
    count.trunc().abs() as usize
}

/// A captcha's time limit as `captcha.timeLimitMs || DEFAULT_IMAGE_CAPTCHA_TIMEOUT` reads it.
fn time_limit_ms(captcha: &Document) -> f64 {
    let limit: f64 = match captcha.get("timeLimitMs") {
        Some(Bson::Double(limit)) => *limit,
        Some(Bson::Int32(limit)) => f64::from(*limit),
        Some(Bson::Int64(limit)) => *limit as f64,
        _ => 0.0,
    };
    if limit == 0.0 || limit.is_nan() {
        DEFAULT_IMAGE_CAPTCHA_TIMEOUT as f64
    } else {
        limit
    }
}

/// `getRandomCaptchasAndRequestHash`: the solved and unsolved captchas drawn from the dataset
/// and shuffled together, a fresh salt, and the pending request stored with its deadline.
pub async fn get_random_captchas_and_request_hash(db: &ProviderDatabase, pair: &KeyringPair, request: &ImageChallengeRequest<'_>) -> Result<ImageChallenge, ProsopoError> {
    db.get_dataset_details(request.dataset_id).await?;
    let unsolved_count: usize = whole_count(request.unsolved_count);
    let solved_count: usize = whole_count(request.solved_count);
    if solved_count == 0 {
        return Err(ProsopoError::new(ErrorClass::Env, ErrorSource::key("CONFIG.INVALID_CAPTCHA_NUMBER"), ErrorOptions::default()));
    }
    let mut captchas: Vec<Document> = db.get_random_captcha(true, request.dataset_id, Some(solved_count as f64)).await?;
    if unsolved_count > 0 {
        captchas.extend(db.get_random_captcha(false, request.dataset_id, Some(unsolved_count as f64)).await?);
    }
    let source = db.source();
    shuffle(&mut captchas, || source.random());
    let salt: String = random_as_hex(32);
    let mut captcha_ids: Vec<String> = captchas.iter().map(|captcha| captcha.get_str("captchaId").unwrap_or_default().to_string()).collect();
    let request_hash: String = compute_pending_request_hash(&mut captcha_ids, JoinValue::from(request.user), &salt);
    let now: DateTime = source.now();
    let signature: Vec<u8> = pair
        .sign(U8aLike::Bytes(request_hash.as_bytes()), false)
        .map_err(|error| ProsopoError::new(ErrorClass::Env, ErrorSource::message(error.to_string()), ErrorOptions::default()))?;
    let time_limit: f64 = captchas.iter().map(time_limit_ms).sum();
    let deadline: DateTime = DateTime::from_millis(now.timestamp_millis() + time_limit as i64);
    db.store_pending_image_commitment(request.user, &request_hash, &salt, deadline, now, request.ip_address, request.threshold, request.session_id, request.ip_info)
        .await?;
    Ok(ImageChallenge { captchas, request_hash, timestamp: now.timestamp_millis(), signed_request_hash: u8a_to_hex(&signature) })
}

#[cfg(test)]
mod tests {
    use super::*;
    use bson::doc;
    use std::cell::RefCell;

    #[test]
    fn shuffles_as_shuffle_array_does() {
        let draws: RefCell<Vec<f64>> = RefCell::new(vec![0.0, 0.99, 0.5]);
        let mut items: Vec<u8> = vec![1, 2, 3, 4];
        shuffle(&mut items, || draws.borrow_mut().remove(0));
        assert_eq!(items, vec![4, 2, 3, 1]);
    }

    #[test]
    fn counts_as_abs_trunc_reads_them() {
        assert_eq!([whole_count(2.9), whole_count(-3.2), whole_count(0.4), whole_count(f64::NAN)], [2, 3, 0, 0]);
    }

    #[test]
    fn falls_back_to_the_default_time_limit_for_a_missing_or_zero_one() {
        assert_eq!(time_limit_ms(&doc! {}), 60_000.0);
        assert_eq!(time_limit_ms(&doc! { "timeLimitMs": 0 }), 60_000.0);
        assert_eq!(time_limit_ms(&doc! { "timeLimitMs": 5000 }), 5000.0);
    }
}

/// What an image solution submission carries.
pub struct ImageSubmission<'a> {
    pub user: &'a str,
    pub dapp: &'a str,
    pub request_hash: &'a str,
    /// The `captchas` the body parsed to.
    pub captchas: &'a serde_json::Value,
    pub user_signature: &'a str,
    /// `Number.parseInt(timestamp)`.
    pub timestamp: f64,
    pub provider_signature: &'a str,
    pub ip: &'a str,
    pub headers: Document,
    pub ja4: String,
    pub behavioral_data: Option<&'a str>,
    pub ip_info: Option<Bson>,
    pub simd_readings: Option<&'a str>,
    pub client_meta_data: Option<&'a prosopo_types::api_types::ClientMetaData>,
}

/// `DappUserSolutionResult`: each captcha's proof (an empty one when not verified).
#[derive(Debug, Clone, PartialEq)]
pub struct ImageVerdict {
    pub captchas: Vec<(String, prosopo_types::datasets::MerkleProof)>,
    pub verified: bool,
}

/// Why an image solution could not be judged.
#[derive(Debug)]
pub enum ImageSolutionError {
    Prosopo(ProsopoError),
    Plain(String),
}

impl From<ProsopoError> for ImageSolutionError {
    fn from(error: ProsopoError) -> ImageSolutionError {
        ImageSolutionError::Prosopo(error)
    }
}

fn env_error(key: &str, context: prosopo_common::ErrorContext) -> ProsopoError {
    ProsopoError::new(ErrorClass::Env, ErrorSource::key(key), ErrorOptions { context: Some(context), ..ErrorOptions::default() })
}

/// What `dappUserSolution` needs of the provider.
pub struct ImageSolutionServices<'a> {
    pub services: &'a crate::tasks::verify::VerifyServices,
    pub detection: crate::tasks::detection::DetectionServices<'a>,
    pub provider_address: &'a str,
    pub now: DateTime,
    pub logger: &'a prosopo_logger::Logger,
    /// `NODE_ENV === "test"`, under which the TS skips the scripted-selection check.
    pub node_env_test: bool,
}

impl ImageSolutionServices<'_> {
    /// `dappUserSolution`: the user's answers to a pending image request, graded against the
    /// dataset's solutions and committed.
    pub async fn dapp_user_solution(&self, submission: &ImageSubmission<'_>) -> Result<ImageVerdict, ImageSolutionError> {
        use crate::pairs::{construct_pair_list, peel_checkbox_input_method, peel_checkbox_prefix, resolve_input_methods, selections_look_scripted};
        use prosopo_common::ErrorContext;
        use prosopo_database::records::{StoredResult, UserCommitment};
        use prosopo_logger::LogRecord;
        use prosopo_types::api_types::{CaptchaSolution, SolutionRecord};
        use prosopo_types::datasets::{CaptchaStatus, InputMethod};
        use prosopo_types::reasons::ResultReason;
        use prosopo_types::stored::SimdReadingsStage;
        use prosopo_types_database::number::json_to_bson;
        use prosopo_util_crypto::signature::signature_verify;
        use serde_json::{json, Value};

        let timestamp_text: String = prosopo_util::number_to_string(submission.timestamp);
        let user_valid: bool = signature_verify(U8aLike::Bytes(timestamp_text.as_bytes()), U8aLike::Str(submission.user_signature), U8aLike::Str(submission.user))
            .map_err(|error| ImageSolutionError::Plain(error.to_string()))?
            .is_valid;
        if !user_valid {
            let error = env_error("GENERAL.INVALID_SIGNATURE", ErrorContext::new().with("failedFuncName", "dappUserSolution").with("userAccount", submission.user));
            self.logger.info(|| LogRecord::msg("Invalid user timestamp signature").with_err(error.to_json()));
            return Err(error.into());
        }
        let provider_valid: bool =
            signature_verify(U8aLike::Bytes(submission.request_hash.as_bytes()), U8aLike::Str(submission.provider_signature), U8aLike::Str(self.provider_address))
                .map_err(|error| ImageSolutionError::Plain(error.to_string()))?
                .is_valid;
        if !provider_valid {
            let error = env_error(
                "GENERAL.INVALID_SIGNATURE",
                ErrorContext::new().with("failedFuncName", "dappUserSolution").with("userAccount", submission.user).with("error", "requestHash signature is invalid"),
            );
            self.logger.info(|| LogRecord::msg("Invalid provider requestHash signature").with_err(error.to_json()));
            return Err(error.into());
        }
        let mut response: ImageVerdict = ImageVerdict { captchas: Vec::new(), verified: false };
        let stored_meta = crate::client_meta_data::to_stored_client_meta_data(submission.client_meta_data);
        let db = &self.services.db;
        let pending = db.get_pending_image_commitment(submission.request_hash).await?;
        let decoded = self.detection.decode_submission_payloads(pending.session_id.as_deref(), submission.behavioral_data, submission.simd_readings).await;
        let received_values: &[Value] = submission.captchas.as_array().map(Vec::as_slice).unwrap_or_default();
        let unverified_ids: Vec<String> = received_values.iter().map(|captcha| captcha.get("captchaId").and_then(Value::as_str).unwrap_or_default().to_string()).collect();
        if pending.deadline_timestamp < self.now {
            self.logger.info(|| LogRecord::msg("Deadline for responding to captcha has expired"));
            self.logger.info(|| LogRecord::msg("Request hash not found"));
            return Ok(response);
        }
        let mut sorted_ids: Vec<String> = unverified_ids.clone();
        let pending_hash: String = compute_pending_request_hash(&mut sorted_ids, JoinValue::from(submission.user), &pending.salt);
        if pending_hash != submission.request_hash {
            self.logger.info(|| LogRecord::msg("Request hash not found"));
            return Ok(response);
        }
        let received: Vec<CaptchaSolution> = prosopo_datasets::parse_and_sort_captcha_solutions(submission.captchas).map_err(|error| ImageSolutionError::Plain(error.to_string()))?;
        let captcha_ids: Vec<String> = received.iter().map(|captcha| captcha.captcha_id.clone()).collect();
        let stored = db.get_captcha_by_id(&captcha_ids).await?;
        if received.len() != stored.len() {
            return Err(env_error("CAPTCHA.INVALID_CAPTCHA_ID", ErrorContext::new().with("failedFuncName", "validateReceivedCaptchasAgainstStoredCaptchas").with("captchas", submission.captchas.clone())).into());
        }
        let first_dataset: &str = stored.first().map_or("", |captcha| captcha.dataset_id.as_str());
        if !stored.iter().all(|captcha| captcha.dataset_id == first_dataset) {
            return Err(env_error("CAPTCHA.DIFFERENT_DATASET_IDS", ErrorContext::new().with("failedFuncName", "validateReceivedCaptchasAgainstStoredCaptchas").with("captchas", submission.captchas.clone())).into());
        }
        let raw_flat: Vec<Vec<f64>> = received.iter().map(|captcha| prosopo_util::extract_data(&captcha.salt)).collect::<Result<_, _>>().map_err(|error| ImageSolutionError::Plain(error.to_string()))?;
        let peeled = peel_checkbox_prefix(&raw_flat, &received.iter().map(|captcha| captcha.solution.len()).collect::<Vec<usize>>());
        let mut pairs: Vec<Vec<[f64; 2]>> = Vec::new();
        if let Some(checkbox) = peeled.checkbox {
            pairs.push(vec![checkbox]);
        }
        for list in &peeled.flat {
            pairs.push(construct_pair_list(list).map_err(ImageSolutionError::Plain)?);
        }
        let declared: Vec<Option<Vec<InputMethod>>> = received.iter().map(|captcha| captcha.input_methods.clone()).collect();
        let input_methods: Option<Vec<Vec<InputMethod>>> = match resolve_input_methods(&raw_flat, &declared) {
            Some(raw) if peeled.checkbox.is_some() => Some(peel_checkbox_input_method(raw)),
            other => other,
        };
        let input_methods_declared: bool = declared.iter().any(Option::is_some);
        let leaves: Vec<String> = received.iter().map(prosopo_datasets::compute_captcha_solution_hash).collect();
        let mut tree = prosopo_datasets::CaptchaMerkleTree::new();
        tree.build(&leaves).map_err(|_| {
            ImageSolutionError::Prosopo(env_error(
                "CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST",
                ErrorContext::new().with("failedFuncName", "buildTreeAndGetCommitmentId").with("commitmentId", Value::Null),
            ))
        })?;
        let commitment_id: String = tree.get_root().map_err(|error| ImageSolutionError::Plain(error.to_string()))?.hash.clone();
        if first_dataset.is_empty() {
            return Err(env_error("CAPTCHA.ID_MISMATCH", ErrorContext::new().with("failedFuncName", "dappUserSolution")).into());
        }
        if !db.update_pending_image_commitment_status(submission.request_hash).await? {
            self.logger.info(|| LogRecord::msg("Request hash already consumed by a concurrent submission"));
            return Ok(response);
        }
        let mut behavioral_data_packed: Option<Bson> = None;
        let mut device_capability: Option<String> = None;
        if submission.behavioral_data.is_some_and(|data| !data.is_empty()) {
            if let Some(behaviour) = &decoded.behavioural {
                let collector = |key: &str| behaviour.get(key).filter(|value| !value.is_null()).cloned().unwrap_or_else(|| json!([]));
                let length = |key: &str| behaviour.get(key).and_then(Value::as_array).map_or(0, Vec::len);
                let capability: Value = behaviour.get("deviceCapability").cloned().unwrap_or(Value::Null);
                self.logger.info(|| {
                    LogRecord::msg("Behavioral analysis completed").with_data(json!({
                        "userAccount": submission.user,
                        "dappAccount": submission.dapp,
                        "requestHash": submission.request_hash,
                        "mouseEventsCount": length("collector1"),
                        "touchEventsCount": length("collector2"),
                        "clickEventsCount": length("collector3"),
                        "scrollEventsCount": length("collector4"),
                        "deviceCapability": capability,
                    }))
                });
                behavioral_data_packed =
                    Some(json_to_bson(&json!({ "c1": collector("collector1"), "c2": collector("collector2"), "c3": collector("collector3"), "c4": collector("collector4"), "d": capability })));
                device_capability = capability.as_str().filter(|capability| !capability.is_empty()).map(str::to_string);
            }
        }
        let ip_address = crate::composite_ip::get_composite_ip_address(submission.ip);
        let commit: UserCommitment = UserCommitment {
            user_account: submission.user.to_string(),
            dapp_account: submission.dapp.to_string(),
            dataset_id: first_dataset.to_string(),
            provider_account: self.provider_address.to_string(),
            id: commitment_id.clone(),
            result: StoredResult::new(CaptchaStatus::Pending, None),
            user_signature: submission.user_signature.to_string(),
            ip_address,
            provided_ip: None,
            metadata: None,
            client_meta_data: stored_meta.clone(),
            headers: submission.headers.clone(),
            ja4: submission.ja4.clone(),
            user_submitted: true,
            server_checked: false,
            ip_info: submission.ip_info.clone(),
            parsed_user_agent_info: None,
            stored_at_timestamp: None,
            requested_at_timestamp: DateTime::from_millis(submission.timestamp as i64),
            submitted_at_timestamp: Some(self.now),
            verified_at_timestamp: None,
            failed_at_timestamp: None,
            last_updated_timestamp: None,
            pending_stage: None,
            session_id: pending.session_id.clone(),
            coords: None,
            input_methods: if input_methods_declared { input_methods.clone() } else { None },
            pending: false,
            salt: pending.salt.clone(),
            request_hash: pending.request_hash.clone(),
            deadline_timestamp: pending.deadline_timestamp,
            threshold: pending.threshold,
            device_capability,
            behavioral_data_packed,
            label: None,
            label_reason: None,
            labelled_by: None,
            labelled_at: None,
        };
        db.store_user_image_captcha_solution(&received, &commit).await?;
        let mut solutions: Vec<SolutionRecord> = Vec::new();
        for captcha in &stored {
            let Some(found) = db.get_solution_by_captcha_id(&captcha.captcha_id).await? else {
                return Err(env_error("CAPTCHA.SOLUTION_NOT_FOUND", ErrorContext::new().with("failedFuncName", "dappUserSolution")).into());
            };
            solutions.push(SolutionRecord {
                solution: CaptchaSolution { captcha_id: found.captcha_id, captcha_content_id: found.captcha_content_id, solution: found.solution, salt: found.salt, input_methods: None },
                dataset_id: found.dataset_id,
                dataset_content_id: found.dataset_content_id,
            });
        }
        let total_images: f64 = stored.first().map_or(0.0, |captcha| captcha.items.len() as f64);
        let coords: Vec<Vec<Vec<f64>>> = pairs.iter().map(|list| list.iter().map(|pair| pair.to_vec()).collect()).collect();
        let scripted: bool = !self.node_env_test && selections_look_scripted(&pairs, input_methods.as_deref());
        let verified: bool = !scripted && prosopo_datasets::compare_captcha_solutions(&mut received.clone(), &mut solutions, total_images, pending.threshold);
        let result: StoredResult =
            if verified { StoredResult::new(CaptchaStatus::Approved, None) } else { StoredResult::new(CaptchaStatus::Disapproved, Some(ResultReason::CaptchaInvalidSolution.as_str())) };
        let commitment_write = async {
            if verified {
                db.approve_dapp_user_commitment(&commitment_id, Some(&coords)).await
            } else {
                db.disapprove_dapp_user_commitment(&commitment_id, result.reason.as_deref(), Some(&coords)).await
            }
        };
        let session_writes = async {
            if let Some(session_id) = pending.session_id.as_deref().filter(|id| !id.is_empty()) {
                let simd = async {
                    if let Some(readings) = decoded.simd.clone() {
                        self.detection.record_session_simd_readings_if_absent_with_cache(session_id, readings, SimdReadingsStage::Submit).await;
                    }
                };
                let mut updates = crate::tasks::pow::submitted_session(prosopo_types::captcha_type::CaptchaType::Image, &result, stored_meta.as_ref());
                updates.0.shift_remove("blocked");
                updates.1.remove("blocked");
                futures_util::join!(self.services.update_session_record_with_cache(session_id, updates, false, self.logger), simd);
            }
        };
        let (written, ()) = futures_util::join!(commitment_write, session_writes);
        written?;
        response.verified = verified;
        response.captchas = if verified {
            let mut proofs = Vec::new();
            for (index, id) in captcha_ids.iter().enumerate() {
                proofs.push((id.clone(), tree.proof(&leaves[index]).map_err(|error| ImageSolutionError::Plain(error.to_string()))?));
            }
            proofs
        } else {
            captcha_ids.iter().map(|id| (id.clone(), vec![Vec::new()])).collect()
        };
        Ok(response)
    }
}
