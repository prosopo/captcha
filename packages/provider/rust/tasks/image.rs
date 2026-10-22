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
