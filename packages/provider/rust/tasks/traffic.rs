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

//! tasks/spam/checkTrafficFilter.ts: which of a site's traffic categories (VPN, proxy, Tor,
//! abuser, datacenter, mobile, satellite, crawler) an IP falls in, the first match deciding,
//! and what the matches ask for.

use prosopo_captcha_severity::is_stricter_captcha_type;
use prosopo_types::decision_machine::TrafficCategoryPolicies;
use prosopo_types::ipapi::{IpInfoResponse, IpInfoResult, ProviderType};
use prosopo_types::settings_types::{AudioSettings, IconOrderSettings, PuzzleSettings, TrafficCategoryPolicy};
use prosopo_types::reasons::ResultReason;
use prosopo_types::settings::{TrafficFilterAction, TRAFFIC_FILTER_ABUSER_SCORE_THRESHOLD_DEFAULT};
use prosopo_types::{CaptchaType, JsNumber};
use serde::Deserialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TrafficCategory {
    Vpn,
    Proxy,
    Tor,
    Abuser,
    Datacenter,
    Mobile,
    Satellite,
    Crawler,
}

impl TrafficCategory {
    pub const ALL: [TrafficCategory; 8] = [
        TrafficCategory::Vpn,
        TrafficCategory::Proxy,
        TrafficCategory::Tor,
        TrafficCategory::Abuser,
        TrafficCategory::Datacenter,
        TrafficCategory::Mobile,
        TrafficCategory::Satellite,
        TrafficCategory::Crawler,
    ];

    pub fn as_str(self) -> &'static str {
        match self {
            TrafficCategory::Vpn => "vpn",
            TrafficCategory::Proxy => "proxy",
            TrafficCategory::Tor => "tor",
            TrafficCategory::Abuser => "abuser",
            TrafficCategory::Datacenter => "datacenter",
            TrafficCategory::Mobile => "mobile",
            TrafficCategory::Satellite => "satellite",
            TrafficCategory::Crawler => "crawler",
        }
    }

    /// `categoryToReason`.
    pub fn reason(self) -> ResultReason {
        match self {
            TrafficCategory::Vpn => ResultReason::VpnBlocked,
            TrafficCategory::Proxy => ResultReason::ProxyBlocked,
            TrafficCategory::Tor => ResultReason::TorBlocked,
            TrafficCategory::Abuser => ResultReason::AbuserBlocked,
            TrafficCategory::Datacenter => ResultReason::DatacenterBlocked,
            TrafficCategory::Mobile => ResultReason::MobileBlocked,
            TrafficCategory::Satellite => ResultReason::SatelliteBlocked,
            TrafficCategory::Crawler => ResultReason::CrawlerBlocked,
        }
    }
}

/// A site's `trafficFilter` as the checks read it: any field may be absent.
#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrafficFilterView {
    #[serde(default)]
    pub vpn: Option<TrafficCategoryPolicy>,
    #[serde(default)]
    pub proxy: Option<TrafficCategoryPolicy>,
    #[serde(default)]
    pub tor: Option<TrafficCategoryPolicy>,
    #[serde(default)]
    pub abuser: Option<TrafficCategoryPolicy>,
    #[serde(default)]
    pub abuser_score_threshold: Option<f64>,
    #[serde(default)]
    pub datacenter: Option<TrafficCategoryPolicy>,
    #[serde(default)]
    pub datacenter_name_allowlist: Option<Vec<String>>,
    #[serde(default)]
    pub datacenter_name_denylist: Option<Vec<String>>,
    #[serde(default)]
    pub skip_extras_on_valid_dns_path: Option<bool>,
    #[serde(default)]
    pub mobile: Option<TrafficCategoryPolicy>,
    #[serde(default)]
    pub satellite: Option<TrafficCategoryPolicy>,
    #[serde(default)]
    pub crawler: Option<TrafficCategoryPolicy>,
}

impl TrafficFilterView {
    pub fn policy(&self, category: TrafficCategory) -> Option<&TrafficCategoryPolicy> {
        match category {
            TrafficCategory::Vpn => self.vpn.as_ref(),
            TrafficCategory::Proxy => self.proxy.as_ref(),
            TrafficCategory::Tor => self.tor.as_ref(),
            TrafficCategory::Abuser => self.abuser.as_ref(),
            TrafficCategory::Datacenter => self.datacenter.as_ref(),
            TrafficCategory::Mobile => self.mobile.as_ref(),
            TrafficCategory::Satellite => self.satellite.as_ref(),
            TrafficCategory::Crawler => self.crawler.as_ref(),
        }
    }

    pub fn abuser_threshold(&self) -> f64 {
        self.abuser_score_threshold.unwrap_or(TRAFFIC_FILTER_ABUSER_SCORE_THRESHOLD_DEFAULT)
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct TrafficFilterMatch {
    pub category: TrafficCategory,
    pub policy: TrafficCategoryPolicy,
}

#[derive(Debug, Clone, PartialEq)]
pub struct TrafficCheckResult {
    /// The first `block` match's reason, when there is one.
    pub blocked: Option<ResultReason>,
    pub matches: Vec<TrafficFilterMatch>,
}

fn matches_datacenter_name_list(ip_info: &IpInfoResult, list: Option<&[String]>) -> bool {
    let Some(list) = list.filter(|list| !list.is_empty()) else {
        return false;
    };
    let candidates: Vec<String> = [&ip_info.datacenter_name, &ip_info.provider_name, &ip_info.asn_organization]
        .into_iter()
        .filter_map(|value| value.as_deref())
        .map(|value| value.trim().to_lowercase())
        .filter(|value| !value.is_empty())
        .collect();
    if candidates.is_empty() {
        return false;
    }
    let normalised: Vec<String> = list.iter().map(|entry| entry.trim().to_lowercase()).collect();
    candidates.iter().any(|candidate| normalised.contains(candidate))
}

/// `isPrivateRelay`: Apple's relay, which is never treated as a datacenter.
pub fn is_private_relay(ip_info: &IpInfoResult) -> bool {
    matches_datacenter_name_list(ip_info, Some(&["iCloud Private Relay".to_string()]))
}

pub fn is_datacenter_allowlisted(ip_info: &IpInfoResult, allowlist: Option<&[String]>) -> bool {
    is_private_relay(ip_info) || matches_datacenter_name_list(ip_info, allowlist)
}

pub fn is_datacenter_denylisted(ip_info: &IpInfoResult, denylist: Option<&[String]>) -> bool {
    matches_datacenter_name_list(ip_info, denylist)
}

fn flag(value: Option<bool>) -> bool {
    value == Some(true)
}

fn is_isp(ip_info: &IpInfoResult) -> bool {
    ip_info.provider_type == Some(ProviderType::Isp)
}

/// `isEffectivelyDatacenter`.
pub fn is_effectively_datacenter(ip_info: &IpInfoResult, filter: &TrafficFilterView) -> bool {
    if !flag(ip_info.is_datacenter) {
        return false;
    }
    if is_datacenter_denylisted(ip_info, filter.datacenter_name_denylist.as_deref()) {
        return true;
    }
    !is_isp(ip_info) && !is_datacenter_allowlisted(ip_info, filter.datacenter_name_allowlist.as_deref())
}

/// The higher of the two abuser scores, absent ones counting as 0.
pub fn max_abuser_score(ip_info: &IpInfoResult) -> f64 {
    math_max(ip_info.abuser_score.map_or(0.0, JsNumber::get), ip_info.company_abuser_score.map_or(0.0, JsNumber::get))
}

fn evaluate(ip_info: Option<&IpInfoResponse>, filter: &TrafficFilterView, dns_extra: bool) -> Vec<TrafficFilterMatch> {
    let Some(IpInfoResponse::Valid(info)) = ip_info else {
        return Vec::new();
    };
    let only = |category: TrafficCategory| -> Vec<TrafficFilterMatch> {
        filter.policy(category).map(|policy| TrafficFilterMatch { category, policy: policy.clone() }).into_iter().collect()
    };
    if flag(info.is_tor) {
        return only(TrafficCategory::Tor);
    }
    if flag(info.is_vpn) {
        return only(TrafficCategory::Vpn);
    }
    if flag(info.is_proxy) {
        return only(TrafficCategory::Proxy);
    }
    if is_effectively_datacenter(info, filter) {
        return only(TrafficCategory::Datacenter);
    }
    if flag(info.is_datacenter) && is_private_relay(info) {
        return Vec::new();
    }
    if flag(info.is_abuser) && max_abuser_score(info) >= filter.abuser_threshold() {
        return only(TrafficCategory::Abuser);
    }
    if flag(info.is_crawler) && !dns_extra {
        return only(TrafficCategory::Crawler);
    }
    if flag(info.is_satellite) {
        return only(TrafficCategory::Satellite);
    }
    if flag(info.is_mobile) {
        return only(TrafficCategory::Mobile);
    }
    Vec::new()
}

/// `checkTrafficFilter`: the client IP's match, then the DNS path's (unless the path checked
/// out and the site skips them); blocked by the first `block` match.
pub fn check_traffic_filter(ip_info: Option<&IpInfoResponse>, filter: &TrafficFilterView, extra_ip_infos: &[IpInfoResponse], dns_path_valid: Option<bool>) -> TrafficCheckResult {
    let mut matches: Vec<TrafficFilterMatch> = evaluate(ip_info, filter, false);
    let skip_extras: bool = filter.skip_extras_on_valid_dns_path == Some(true) && dns_path_valid == Some(true);
    if !skip_extras {
        for extra in extra_ip_infos {
            matches.extend(evaluate(Some(extra), filter, true));
        }
    }
    let blocked: Option<ResultReason> = matches.iter().find(|found| found.policy.action == TrafficFilterAction::Block).map(|found| found.category.reason());
    TrafficCheckResult { blocked, matches }
}

/// What the `challenge` matches ask a challenge to be: the strictest type, the highest
/// difficulty and round count, the tightest tolerances, the settings merged in order.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct ResolvedChallengePolicy {
    pub captcha_type: Option<CaptchaType>,
    pub pow_difficulty: Option<f64>,
    pub solved_images_count: Option<f64>,
    pub puzzle_tolerance: Option<f64>,
    pub puzzle_settings: Option<serde_json::Map<String, serde_json::Value>>,
    pub audio_settings: Option<serde_json::Map<String, serde_json::Value>>,
    pub icon_order_tolerance: Option<f64>,
    pub icon_order_settings: Option<serde_json::Map<String, serde_json::Value>>,
    pub source_categories: Vec<TrafficCategory>,
}

/// `Math.max` of two: NaN if either is.
fn math_max(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        f64::NAN
    } else {
        a.max(b)
    }
}

fn math_min(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        f64::NAN
    } else {
        a.min(b)
    }
}

fn highest(current: Option<f64>, next: Option<f64>) -> Option<f64> {
    match (current, next) {
        (current, None) => current,
        (None, next) => next,
        (Some(current), Some(next)) => Some(math_max(current, next)),
    }
}

fn tightest(current: Option<f64>, next: Option<f64>) -> Option<f64> {
    match (current, next) {
        (current, None) => current,
        (None, next) => next,
        (Some(current), Some(next)) => Some(math_min(current, next)),
    }
}

/// `{ ...(merged ?? {}), ...next }`.
fn merge_settings<T: serde::Serialize>(merged: Option<serde_json::Map<String, serde_json::Value>>, next: Option<&T>) -> Option<serde_json::Map<String, serde_json::Value>> {
    let Some(next) = next.and_then(|next| serde_json::to_value(next).ok()) else {
        return merged;
    };
    let mut out: serde_json::Map<String, serde_json::Value> = merged.unwrap_or_default();
    if let serde_json::Value::Object(fields) = next {
        for (key, value) in fields {
            out.insert(key, value);
        }
    }
    Some(out)
}

/// `resolveChallengePolicy`.
pub fn resolve_challenge_policy(matches: &[TrafficFilterMatch]) -> Option<ResolvedChallengePolicy> {
    let challenges: Vec<&TrafficFilterMatch> = matches.iter().filter(|found| found.policy.action == TrafficFilterAction::Challenge).collect();
    if challenges.is_empty() {
        return None;
    }
    let mut resolved: ResolvedChallengePolicy = ResolvedChallengePolicy::default();
    for found in &challenges {
        if is_stricter_captcha_type(found.policy.captcha_type.map(CaptchaType::as_str), resolved.captcha_type.map(CaptchaType::as_str)) {
            resolved.captcha_type = found.policy.captcha_type;
        }
    }
    let number = |value: &Option<JsNumber>| value.map(|value| value.get());
    for found in &challenges {
        let policy: &TrafficCategoryPolicy = &found.policy;
        resolved.pow_difficulty = highest(resolved.pow_difficulty, number(&policy.pow_difficulty));
        resolved.solved_images_count = highest(resolved.solved_images_count, number(&policy.solved_images_count));
        resolved.puzzle_tolerance = tightest(resolved.puzzle_tolerance, number(&policy.puzzle_tolerance));
        resolved.puzzle_settings = merge_settings::<PuzzleSettings>(resolved.puzzle_settings.take(), policy.puzzle.as_ref());
        resolved.audio_settings = merge_settings::<AudioSettings>(resolved.audio_settings.take(), policy.audio.as_ref());
        resolved.icon_order_tolerance = tightest(resolved.icon_order_tolerance, number(&policy.icon_order_tolerance));
        resolved.icon_order_settings = merge_settings::<IconOrderSettings>(resolved.icon_order_settings.take(), policy.icon_order.as_ref());
    }
    resolved.source_categories = challenges.iter().map(|found| found.category).collect();
    Some(resolved)
}

/// `resolvePadBytes`: the largest padding any match asks for.
pub fn resolve_pad_bytes(matches: &[TrafficFilterMatch]) -> Option<f64> {
    matches.iter().fold(None, |pad, found| highest(pad, found.policy.pad_bytes.map(|bytes| bytes.get())))
}

/// `deriveTrafficPolicies`: the configured category policies, or none when there are none.
pub fn derive_traffic_policies(filter: Option<&TrafficFilterView>) -> Option<TrafficCategoryPolicies> {
    let filter: &TrafficFilterView = filter?;
    let policies: TrafficCategoryPolicies = TrafficCategoryPolicies {
        vpn: filter.vpn.clone(),
        proxy: filter.proxy.clone(),
        tor: filter.tor.clone(),
        datacenter: filter.datacenter.clone(),
        abuser: filter.abuser.clone(),
        mobile: filter.mobile.clone(),
        satellite: filter.satellite.clone(),
        crawler: filter.crawler.clone(),
    };
    (policies != TrafficCategoryPolicies::default()).then_some(policies)
}
