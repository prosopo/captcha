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

//! The enums of the stored records (provider/database.ts).

use crate::wire_enum::wire_enum;

wire_enum! {
    pub enum IpAddressType {
        V4: "v4" = "v4",
        V6: "v6" = "v6",
    }
}

wire_enum! {
    /// Labels superadmins put on a captcha record from the audit page, to build training sets.
    pub enum CaptchaLabel {
        Human: "human" = "human",
        Bot: "bot" = "bot",
        Suspicious: "suspicious" = "suspicious",
        Unknown: "unknown" = "unknown",
    }
}

wire_enum! {
    /// Where in the user's journey the SIMD readings first reached the provider.
    pub enum SimdReadingsStage {
        Frictionless: "frictionless" = "frictionless",
        Challenge: "challenge" = "challenge",
        Submit: "submit" = "submit",
    }
}
