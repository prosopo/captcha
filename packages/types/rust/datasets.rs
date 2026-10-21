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

//! The enums and the PoW challenge format of datasets/captcha.ts.

use crate::wire_enum::wire_enum;
use prosopo_api_route::schema::{custom, Data, Schema};
use serde_json::Value;

wire_enum! {
    pub enum CaptchaTypes {
        SelectAll: "SelectAll" = "SelectAll",
    }
}

wire_enum! {
    pub enum CaptchaItemTypes {
        Text: "Text" = "text",
        Image: "Image" = "image",
    }
}

wire_enum! {
    pub enum CaptchaStates {
        Solved: "Solved" = "solved",
        Unsolved: "Unsolved" = "unsolved",
    }
}

wire_enum! {
    /// How a selection was made: a tile, or the checkbox tick that opened the challenge.
    pub enum InputMethod {
        Pointer: "pointer" = "pointer",
        Keyboard: "keyboard" = "keyboard",
    }
}

wire_enum! {
    pub enum CaptchaStatus {
        Pending: "pending" = "Pending",
        Approved: "approved" = "Approved",
        Disapproved: "disapproved" = "Disapproved",
    }
}

wire_enum! {
    pub enum StoredStatusNames {
        NotStored: "notStored" = "notStored",
        UserSubmitted: "userSubmitted" = "userSubmitted",
        ServerChecked: "serverChecked" = "serverChecked",
        Stored: "stored" = "stored",
    }
}

wire_enum! {
    pub enum GovernanceStatus {
        Active: "active" = "Active",
        Inactive: "inactive" = "Inactive",
    }
}

wire_enum! {
    pub enum DappPayee {
        Provider: "provider" = "Provider",
        Dapp: "dapp" = "Dapp",
        Any: "any" = "Any",
    }
}

/// Joins the parts of a PoW challenge: `timestamp___user___dapp___nonce`. The provider
/// signs that string.
pub const POW_SEPARATOR: &str = "___";

/// `PowChallengeIdSchema`: a string with exactly four `___`-separated parts. The TS calls
/// `val.split` unguarded, so a non-string throws a `TypeError` out of `safeParse`; here it
/// fails validation instead.
pub fn pow_challenge_id_schema() -> Schema {
    custom(|value: &Data| match value {
        Some(Value::String(challenge)) => challenge.split(POW_SEPARATOR).count() == 4,
        _ => false,
    })
}
