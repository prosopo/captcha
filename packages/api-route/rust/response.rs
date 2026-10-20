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
use serde_json::Value;

use crate::status::ApiEndpointResponseStatus;

/// `data` and `error` are independently optional (an endpoint may return partial data alongside
/// an error) and are omitted from the JSON when absent, as `JSON.stringify` drops `undefined`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ApiEndpointResponse {
    pub status: ApiEndpointResponseStatus,
    /// TS types this as `object`, so it should be a JSON object or array, never a primitive.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl ApiEndpointResponse {
    pub fn new(status: ApiEndpointResponseStatus) -> ApiEndpointResponse {
        ApiEndpointResponse {
            status,
            data: None,
            error: None,
        }
    }

    pub fn with_data(mut self, data: Value) -> ApiEndpointResponse {
        self.data = Some(data);
        self
    }

    pub fn with_error(mut self, error: impl Into<String>) -> ApiEndpointResponse {
        self.error = Some(error.into());
        self
    }
}
