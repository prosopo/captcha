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

//! `ScheduledTaskSchema`: a scheduler record as the provider holds it. The TS checks it with zod;
//! here the types do, so a record that would fail the schema does not deserialise.

use bson::{Bson, DateTime};
use prosopo_types::client::{ScheduledTaskNames, ScheduledTaskStatus};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledTask {
    pub process_name: ScheduledTaskNames,
    pub datetime: DateTime,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated: Option<DateTime>,
    pub status: ScheduledTaskStatus,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub result: Option<ScheduledTaskResult>,
}

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
pub struct ScheduledTaskResult {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<Bson>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<Bson>,
}
