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

use std::fmt;
use std::str::FromStr;

use serde::{Deserialize, Serialize};

/// A string enum on the wire: clients compare these values literally.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum ApiEndpointResponseStatus {
    Success,
    Fail,
    Processing,
}

impl ApiEndpointResponseStatus {
    /// Members in TS declaration order (`Object.values(ApiEndpointResponseStatus)`).
    pub const ALL: [ApiEndpointResponseStatus; 3] = [
        ApiEndpointResponseStatus::Success,
        ApiEndpointResponseStatus::Fail,
        ApiEndpointResponseStatus::Processing,
    ];

    pub fn as_str(self) -> &'static str {
        match self {
            ApiEndpointResponseStatus::Success => "SUCCESS",
            ApiEndpointResponseStatus::Fail => "FAIL",
            ApiEndpointResponseStatus::Processing => "PROCESSING",
        }
    }
}

impl fmt::Display for ApiEndpointResponseStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UnknownApiEndpointResponseStatus(pub String);

impl fmt::Display for UnknownApiEndpointResponseStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "unknown api endpoint response status: {}", self.0)
    }
}

impl std::error::Error for UnknownApiEndpointResponseStatus {}

impl FromStr for ApiEndpointResponseStatus {
    type Err = UnknownApiEndpointResponseStatus;

    fn from_str(
        value: &str,
    ) -> Result<ApiEndpointResponseStatus, UnknownApiEndpointResponseStatus> {
        ApiEndpointResponseStatus::ALL
            .into_iter()
            .find(|status| status.as_str() == value)
            .ok_or_else(|| UnknownApiEndpointResponseStatus(value.to_string()))
    }
}
