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

use crate::wire_enum::wire_enum;

wire_enum! {
    /// `Tier`, stored on the account.
    pub enum Tier {
        Free: "Free" = "free",
        Professional: "Professional" = "professional",
        Enterprise: "Enterprise" = "enterprise",
    }
}

wire_enum! {
    pub enum ModeEnum {
        Visible: "visible" = "visible",
        Invisible: "invisible" = "invisible",
    }
}

/// `Mode`: `enum([visible, invisible]).optional()`.
pub fn mode_schema() -> prosopo_api_route::schema::Schema {
    prosopo_api_route::schema::string_enum(&[
        ModeEnum::Visible.as_str(),
        ModeEnum::Invisible.as_str(),
    ])
    .optional()
}

wire_enum! {
    pub enum ScheduledTaskNames {
        BatchCommitment: "BatchCommitment" = "BatchCommitment",
        CalculateSolution: "CalculateSolution" = "CalculateSolution",
        StoreCommitmentsExternal: "StoreCommitmentsExternal" = "StoreCommitmentsExternal",
        GetClientList: "GetClientList" = "GetClientList",
        SetClientEntropy: "SetClientEntropy" = "SetClientEntropy",
        UpdateSpamEmailDomains: "UpdateSpamEmailDomains" = "UpdateSpamEmailDomains",
    }
}

wire_enum! {
    pub enum ScheduledTaskStatus {
        Pending: "Pending" = "Pending",
        Running: "Running" = "Running",
        Completed: "Completed" = "Completed",
        Failed: "Failed" = "Failed",
    }
}

pub const ALWAYS_PASS_SITE_KEY: &str = "5EARALUe4HXQwKo5KanZSGGKqJV4VTaytpezFwv8ZHbZewmh";
pub const ALWAYS_FAIL_SITE_KEY: &str = "5ETtechmZkn3CUVeJX7Z511oiuiu742aHLm91D5ZZw4fqoAG";

wire_enum! {
    pub enum TestSiteKeyMode {
        Pass: "Pass" = "pass",
        Fail: "Fail" = "fail",
    }
}

/// `getTestSiteKeyMode`: the reserved site keys force a result; any other key is normal.
pub fn get_test_site_key_mode(site_key: &str) -> Option<TestSiteKeyMode> {
    match site_key {
        ALWAYS_PASS_SITE_KEY => Some(TestSiteKeyMode::Pass),
        ALWAYS_FAIL_SITE_KEY => Some(TestSiteKeyMode::Fail),
        _ => None,
    }
}

wire_enum! {
    pub enum BlockRuleType {
        IpAddress: "ipAddress" = "ipAddress",
        UserAccount: "userAccount" = "userAccount",
    }
}
