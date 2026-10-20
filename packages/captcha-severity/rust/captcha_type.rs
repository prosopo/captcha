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

use serde::{Deserialize, Serialize};

/// The captcha types, serialised as the TypeScript `CaptchaType` string values.
///
/// The severity functions take `&str` rather than this enum, as the TS takes
/// `string`, so that unrecognised values rank 0 instead of failing to parse.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CaptchaType {
    Image,
    Pow,
    Frictionless,
    Puzzle,
    Audio,
    IconOrder,
    Authenticated,
}

impl CaptchaType {
    pub const ALL: [CaptchaType; 7] = [
        CaptchaType::Image,
        CaptchaType::Pow,
        CaptchaType::Frictionless,
        CaptchaType::Puzzle,
        CaptchaType::Audio,
        CaptchaType::IconOrder,
        CaptchaType::Authenticated,
    ];

    pub const fn as_str(self) -> &'static str {
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

    pub fn from_name(name: &str) -> Option<CaptchaType> {
        CaptchaType::ALL.into_iter().find(|t| t.as_str() == name)
    }
}

#[cfg(test)]
mod tests {
    use super::CaptchaType;

    #[test]
    fn serde_names_match_as_str() {
        for t in CaptchaType::ALL {
            let json: String = serde_json::to_string(&t).unwrap();
            assert_eq!(json, format!("\"{}\"", t.as_str()));
            assert_eq!(serde_json::from_str::<CaptchaType>(&json).unwrap(), t);
            assert_eq!(CaptchaType::from_name(t.as_str()), Some(t));
        }
        assert_eq!(CaptchaType::from_name("Image"), None);
    }
}
