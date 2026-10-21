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

//! The typed output of the settings schemas (`IUserSettings` and its parts). Fields are in
//! schema order and absent options are skipped, so serialising one gives exactly the parse
//! output, which is what the client record stores.

use crate::captcha_type::CaptchaType;
use crate::number::JsNumber;
use crate::settings::{EncodingType, IPValidationAction, TrafficFilterAction};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrictionlessThreshold {
    pub frictionless_puzzle_threshold: JsNumber,
    pub frictionless_image_threshold: JsNumber,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrictionlessTypes {
    pub image: bool,
    pub puzzle: bool,
    pub icon_order: bool,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptchaTypeFeatureFlags {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub puzzle: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon_order: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio: Option<bool>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetFeatureFlags {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub puzzle_image_switch: Option<bool>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioSettings {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub digit_count: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub noise_snr_db: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub babble_gain: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub babble_voices: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reverb_mix: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gap_ms: Option<JsNumber>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PuzzlePieceScale {
    pub min: JsNumber,
    pub max: JsNumber,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PuzzleSettings {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decoy_count: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decoy_edge_darkness: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decoy_body_brightness: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decoy_hole_darken: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hole_darken: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub piece_scale: Option<PuzzlePieceScale>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IconOrderSettings {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_count: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decoy_count: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stroke_width: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon_opacity: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub halo_opacity: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background_clutter: Option<JsNumber>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IPValidationActions {
    pub country_change_action: IPValidationAction,
    pub city_change_action: IPValidationAction,
    pub isp_change_action: IPValidationAction,
    pub distance_exceed_action: IPValidationAction,
    pub abuse_score_exceed_action: IPValidationAction,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IPValidationActionOverrides {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub country_change_action: Option<IPValidationAction>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub city_change_action: Option<IPValidationAction>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub isp_change_action: Option<IPValidationAction>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub distance_exceed_action: Option<IPValidationAction>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub abuse_score_exceed_action: Option<IPValidationAction>,
}

/// `IIPValidation`: a per-country override.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IPValidation {
    pub actions: IPValidationActionOverrides,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub distance_threshold_km: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub abuse_score_threshold: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub require_all_conditions: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IPValidationRules {
    pub enabled: bool,
    pub actions: IPValidationActions,
    pub distance_threshold_km: JsNumber,
    pub abuse_score_threshold: JsNumber,
    pub require_all_conditions: bool,
    /// Keyed by country code, in JS key order.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub country_overrides: Option<IndexMap<String, IPValidation>>,
    pub force_consistent_ip: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmailSpamRules {
    pub enabled: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_local_part_dots: Option<JsNumber>,
    pub normalise_gmail: bool,
    pub use_default_patterns: bool,
    pub custom_regex_blocklist: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_email_submission_count: Option<JsNumber>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpamFilterRules {
    pub enabled: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub email_rules: Option<EmailSpamRules>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrafficCategoryPolicy {
    pub action: TrafficFilterAction,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub captcha_type: Option<CaptchaType>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pow_difficulty: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub solved_images_count: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub puzzle_tolerance: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pad_bytes: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub puzzle: Option<PuzzleSettings>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio: Option<AudioSettings>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon_order_tolerance: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon_order: Option<IconOrderSettings>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrafficFilter {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vpn: Option<TrafficCategoryPolicy>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub proxy: Option<TrafficCategoryPolicy>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tor: Option<TrafficCategoryPolicy>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub abuser: Option<TrafficCategoryPolicy>,
    pub abuser_score_threshold: JsNumber,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub datacenter: Option<TrafficCategoryPolicy>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub datacenter_name_allowlist: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub datacenter_name_denylist: Option<Vec<String>>,
    pub skip_extras_on_valid_dns_path: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mobile: Option<TrafficCategoryPolicy>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub satellite: Option<TrafficCategoryPolicy>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub crawler: Option<TrafficCategoryPolicy>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HoneypotSettings {
    pub enabled: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub question: Option<String>,
    pub encoding_type: EncodingType,
}

/// `IUserSettings`: a site's settings as `ClientSettingsSchema` outputs them.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserSettings {
    pub captcha_type: CaptchaType,
    pub domains: Vec<String>,
    pub verified_timeout: JsNumber,
    pub solution_timeout: JsNumber,
    pub frictionless_threshold: FrictionlessThreshold,
    pub frictionless_types: FrictionlessTypes,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub captcha_type_feature_flags: Option<CaptchaTypeFeatureFlags>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub widget_feature_flags: Option<WidgetFeatureFlags>,
    pub pow_difficulty: JsNumber,
    pub image_threshold: JsNumber,
    pub image_max_rounds: JsNumber,
    pub image_min_rounds: JsNumber,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auto_ban_score_threshold: Option<JsNumber>,
    pub puzzle_tolerance: JsNumber,
    pub puzzle_max_difficulty: JsNumber,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub puzzle: Option<PuzzleSettings>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio: Option<AudioSettings>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_accessibility_enabled: Option<bool>,
    pub icon_order_tolerance: JsNumber,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon_order: Option<IconOrderSettings>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ip_validation_rules: Option<IPValidationRules>,
    pub disallow_web_view: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub spam_email_domain_check_enabled: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub spam_filter: Option<SpamFilterRules>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub traffic_filter: Option<TrafficFilter>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub store_metadata: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub honeypot: Option<HoneypotSettings>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub allow_agents: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub asset_origin: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_url: Option<String>,
}
