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

//! The enums, counter keys and output schemas of decisionMachine/index.ts.

use crate::captcha_type::CaptchaType;
use crate::settings::{
    icon_order_settings_schema, icon_order_tolerance_field_schema, puzzle_settings_schema,
    puzzle_tolerance_field_schema,
};
use crate::wire_enum::wire_enum;
use prosopo_api_route::schema::{
    array, literal, number, object, string, string_enum, union, Schema,
};

wire_enum! {
    pub enum DecisionMachineRuntime {
        Node: "Node" = "node",
    }
}

wire_enum! {
    pub enum DecisionMachineKind {
        Routing: "Routing" = "routing",
        Decision: "Decision" = "decision",
    }
}

wire_enum! {
    /// Decision machine scope defines the specificity level of an artifact.
    /// Only ONE artifact is selected per request based on scope priority.
    ///
    /// Current scopes (priority order):
    /// - Dapp: Custom decision machine for a specific dapp (highest priority)
    /// - Global: Default decision machine applied to all dapps (fallback)
    ///
    /// Future extensibility: Additional scopes can be added for device type
    /// (mobile/desktop/app), geographic region, user tier, etc. New scopes
    /// would be evaluated in priority order to maintain single-artifact execution.
    pub enum DecisionMachineScope {
        Global: "Global" = "global",
        Dapp: "Dapp" = "dapp",
    }
}

wire_enum! {
    pub enum DecisionMachineLanguage {
        JavaScript: "JavaScript" = "js",
        TypeScript: "TypeScript" = "ts",
    }
}

wire_enum! {
    pub enum DecisionMachineDecision {
        Allow: "Allow" = "allow",
        Deny: "Deny" = "deny",
    }
}

/// `DecisionMachineCaptchaTypeSchema`.
pub fn decision_machine_captcha_type_schema() -> Schema {
    literal_union(&[
        CaptchaType::Pow,
        CaptchaType::Image,
        CaptchaType::Puzzle,
        CaptchaType::Audio,
        CaptchaType::IconOrder,
    ])
}

fn literal_union(types: &[CaptchaType]) -> Schema {
    union(
        types
            .iter()
            .map(|captcha_type| literal(captcha_type.as_str()))
            .collect(),
    )
}

/// `DecisionMachineOutputSchema`.
pub fn decision_machine_output_schema() -> Schema {
    object(vec![
        ("decision", DecisionMachineDecision::schema()),
        ("reason", string().optional()),
        ("score", number().optional()),
        ("tags", array(string()).optional()),
    ])
}

/// `DecisionMachineConfigSchema`.
pub fn decision_machine_config_schema() -> Schema {
    object(vec![
        ("runtime", DecisionMachineRuntime::schema()),
        ("source", string()),
        ("language", DecisionMachineLanguage::schema().optional()),
        ("name", string().optional()),
        ("version", string().optional()),
        ("createdAt", string()),
        (
            "captchaType",
            decision_machine_captcha_type_schema().optional(),
        ),
    ])
}

wire_enum! {
    pub enum CounterWindow {
        OneMinute: "1m" = "1m",
        TenMinutes: "10m" = "10m",
        OneHour: "1h" = "1h",
        ThreeHours: "3h" = "3h",
        SixHours: "6h" = "6h",
        OneDay: "24h" = "24h",
    }
}

impl CounterWindow {
    /// `COUNTER_WINDOW_SECONDS`.
    pub const fn seconds(self) -> u64 {
        match self {
            CounterWindow::OneMinute => 60,
            CounterWindow::TenMinutes => 600,
            CounterWindow::OneHour => 3600,
            CounterWindow::ThreeHours => 10800,
            CounterWindow::SixHours => 21600,
            CounterWindow::OneDay => 86400,
        }
    }
}

wire_enum! {
    pub enum CounterKind {
        Served: "served" = "served",
        Solved: "solved" = "solved",
    }
}

wire_enum! {
    pub enum CounterDimension {
        Ip: "ip" = "ip",
        UserAccount: "userAccount" = "userAccount",
        PeerIp: "peerIp" = "peerIp",
    }
}

pub const COUNTER_CAPTCHA_ANY: &str = "any";

/// `CounterCaptchaType`: a challengeable captcha type, or every type.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum CounterCaptchaType {
    Type(CaptchaType),
    Any,
}

impl CounterCaptchaType {
    pub fn as_str(self) -> &'static str {
        match self {
            CounterCaptchaType::Type(captcha_type) => captcha_type.as_str(),
            CounterCaptchaType::Any => COUNTER_CAPTCHA_ANY,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct CounterSpec {
    pub kind: CounterKind,
    pub captcha_type: CounterCaptchaType,
    pub dimension: CounterDimension,
    pub window: CounterWindow,
}

fn variants(values: &[&'static str]) -> Schema {
    string_enum(values)
}

/// `CounterSpecSchema`.
pub fn counter_spec_schema() -> Schema {
    let counted: Vec<Schema> = [
        CaptchaType::Pow,
        CaptchaType::Image,
        CaptchaType::Puzzle,
        CaptchaType::Audio,
        CaptchaType::IconOrder,
    ]
    .iter()
    .map(|captcha_type| literal(captcha_type.as_str()))
    .chain(std::iter::once(literal(COUNTER_CAPTCHA_ANY)))
    .collect();
    object(vec![
        ("kind", variants(&CounterKind::ALL.map(CounterKind::as_str))),
        ("captchaType", union(counted)),
        (
            "dimension",
            variants(&CounterDimension::ALL.map(CounterDimension::as_str)),
        ),
        (
            "window",
            variants(&CounterWindow::ALL.map(CounterWindow::as_str)),
        ),
    ])
}

/// `encodeCounterKey`: the Redis key of a counter. The value is not escaped, so a value with
/// colons (an IPv6 address) adds segments; the window is always last. The decision-machine
/// compiler writes the same format by hand, so the two must not drift.
pub fn encode_counter_key(dapp_account: &str, spec: &CounterSpec, value: &str) -> String {
    format!(
        "cnt:{dapp_account}:{}:{}:{}:{value}:{}",
        spec.kind,
        spec.captcha_type.as_str(),
        spec.dimension,
        spec.window
    )
}

/// `RoutingMachineOutputSchema`: what a routing machine may decide.
pub fn routing_machine_output_schema() -> Schema {
    object(vec![
        (
            "captchaType",
            literal_union(&[
                CaptchaType::Pow,
                CaptchaType::Image,
                CaptchaType::Puzzle,
                CaptchaType::IconOrder,
            ]),
        ),
        ("solvedImagesCount", number().int().positive().optional()),
        ("powDifficulty", number().positive().optional()),
        ("reason", string().optional()),
        (
            "puzzleTolerance",
            puzzle_tolerance_field_schema().optional(),
        ),
        ("puzzle", puzzle_settings_schema().optional()),
        (
            "iconOrderTolerance",
            icon_order_tolerance_field_schema().optional(),
        ),
        ("iconOrder", icon_order_settings_schema().optional()),
    ])
}

/// `EnrichedDnsEvent`: a session's DNS event with what the IP service says of its addresses.
#[derive(Debug, Clone, Default, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnrichedDnsEvent {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub peer_ip: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolver_ip: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path_valid: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub peer_ip_info: Option<crate::ipapi::IpInfoResponse>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolver_ip_info: Option<crate::ipapi::IpInfoResponse>,
}

/// `TrafficCategoryPolicies`: a site's traffic filter, its category policies only.
#[derive(Debug, Clone, Default, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrafficCategoryPolicies {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vpn: Option<crate::settings_types::TrafficCategoryPolicy>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub proxy: Option<crate::settings_types::TrafficCategoryPolicy>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tor: Option<crate::settings_types::TrafficCategoryPolicy>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub datacenter: Option<crate::settings_types::TrafficCategoryPolicy>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub abuser: Option<crate::settings_types::TrafficCategoryPolicy>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mobile: Option<crate::settings_types::TrafficCategoryPolicy>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub satellite: Option<crate::settings_types::TrafficCategoryPolicy>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub crawler: Option<crate::settings_types::TrafficCategoryPolicy>,
}
