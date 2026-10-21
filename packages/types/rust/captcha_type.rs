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

use prosopo_api_route::schema::{native_enum, Data, Schema};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fmt;
use std::str::FromStr;

/// `CaptchaType`, serialised as its TS string value.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CaptchaType {
    Image,
    Pow,
    Frictionless,
    Puzzle,
    Audio,
    IconOrder,
    /// Web Bot Auth verified: issued only by the frictionless flow, with no user-facing
    /// challenge.
    Authenticated,
}

impl CaptchaType {
    /// In TS declaration order, as `Object.values(CaptchaType)`.
    pub const ALL: [CaptchaType; 7] = [
        CaptchaType::Image,
        CaptchaType::Pow,
        CaptchaType::Frictionless,
        CaptchaType::Puzzle,
        CaptchaType::Audio,
        CaptchaType::IconOrder,
        CaptchaType::Authenticated,
    ];

    /// The TS member names, in declaration order.
    pub const TS_KEYS: [&'static str; 7] = [
        "image",
        "pow",
        "frictionless",
        "puzzle",
        "audio",
        "iconOrder",
        "authenticated",
    ];

    pub fn as_str(self) -> &'static str {
        match self {
            CaptchaType::Image => "image",
            CaptchaType::Pow => "pow",
            CaptchaType::Frictionless => "frictionless",
            CaptchaType::Puzzle => "puzzle",
            CaptchaType::Audio => "audio",
            CaptchaType::IconOrder => "iconOrder",
            CaptchaType::Authenticated => "authenticated",
        }
    }

    /// `SelectableCaptchaTypeSchema`: audio is only served as an accessibility alternative.
    pub fn is_selectable(self) -> bool {
        self != CaptchaType::Audio
    }

    /// `DecisionMachineCaptchaTypeSchema`.
    pub fn is_decision_machine_type(self) -> bool {
        matches!(
            self,
            CaptchaType::Pow
                | CaptchaType::Image
                | CaptchaType::Puzzle
                | CaptchaType::Audio
                | CaptchaType::IconOrder
        )
    }
}

impl fmt::Display for CaptchaType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UnknownCaptchaType(pub String);

impl fmt::Display for UnknownCaptchaType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "unknown captcha type {:?}", self.0)
    }
}

impl std::error::Error for UnknownCaptchaType {}

impl FromStr for CaptchaType {
    type Err = UnknownCaptchaType;

    fn from_str(value: &str) -> Result<CaptchaType, UnknownCaptchaType> {
        CaptchaType::ALL
            .into_iter()
            .find(|captcha_type| captcha_type.as_str() == value)
            .ok_or_else(|| UnknownCaptchaType(value.to_string()))
    }
}

/// `CaptchaTypeSchema`.
pub fn captcha_type_schema() -> Schema {
    native_enum(&CaptchaType::ALL.map(CaptchaType::as_str))
}

/// `SelectableCaptchaTypeSchema`.
pub fn selectable_captcha_type_schema() -> Schema {
    captcha_type_schema().refine(
        |value: &Data| value.as_ref().and_then(Value::as_str) != Some(CaptchaType::Audio.as_str()),
        Some("audio is only served as an accessibility alternative".to_string()),
    )
}
