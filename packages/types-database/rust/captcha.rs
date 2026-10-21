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

//! The central captcha database's schemas (src/types/captcha.ts). Each is rebuilt from the
//! provider schema's definition (`new Schema({ ...X.obj })`), so it keeps the fields and the
//! TTL but none of the provider's indexes, and gains one on `sessionId`. The session schema is
//! the provider's, unchanged.

use crate::provider::{audio_fields, icon_order_fields, pow_fields, puzzle_fields, user_commitment_fields};
use crate::schema::{IndexOptions, Schema};
use std::sync::LazyLock;

pub use crate::provider::SESSION_RECORD as STORED_SESSION_RECORD;

fn by_session(schema: Schema) -> Schema {
    schema.index(&[("sessionId", 1)], IndexOptions::default())
}

/// `StoredUserCommitmentRecordSchema`.
pub static STORED_USER_COMMITMENT_RECORD: LazyLock<Schema> =
    LazyLock::new(|| by_session(Schema::new(user_commitment_fields())));

/// `StoredPoWCaptchaRecordSchema`.
pub static STORED_POW_CAPTCHA_RECORD: LazyLock<Schema> =
    LazyLock::new(|| by_session(Schema::new(pow_fields())));

/// `StoredPuzzleCaptchaRecordSchema`.
pub static STORED_PUZZLE_CAPTCHA_RECORD: LazyLock<Schema> = LazyLock::new(|| by_session(Schema::new(puzzle_fields())));

/// `StoredAudioCaptchaRecordSchema`.
pub static STORED_AUDIO_CAPTCHA_RECORD: LazyLock<Schema> = LazyLock::new(|| by_session(Schema::new(audio_fields())));

/// `StoredIconOrderCaptchaRecordSchema`.
pub static STORED_ICON_ORDER_CAPTCHA_RECORD: LazyLock<Schema> =
    LazyLock::new(|| by_session(Schema::new(icon_order_fields())));
