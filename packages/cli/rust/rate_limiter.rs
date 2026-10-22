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

//! RateLimiter.ts: each limited route's window and limit, as the environment gives them.

use crate::config::Environment;
use prosopo_types::provider_api::{AdminApiPaths, ClientApiPaths, PublicApiPaths};
use serde_json::{Map, Value};

/// Each route and the stem of its two environment variables.
fn routes() -> [(&'static str, &'static str); 36] {
    [
        (ClientApiPaths::GetImageCaptchaChallenge.as_str(), "GET_IMAGE_CAPTCHA_CHALLENGE"),
        (ClientApiPaths::GetPowCaptchaChallenge.as_str(), "GET_POW_CAPTCHA_CHALLENGE"),
        (ClientApiPaths::SubmitImageCaptchaSolution.as_str(), "SUBMIT_IMAGE_CAPTCHA_SOLUTION"),
        (ClientApiPaths::SubmitPowCaptchaSolution.as_str(), "SUBMIT_POW_CAPTCHA_SOLUTION"),
        (ClientApiPaths::VerifyPowCaptchaSolution.as_str(), "VERIFY_POW_CAPTCHA_SOLUTION"),
        (ClientApiPaths::VerifyImageCaptchaSolutionDapp.as_str(), "VERIFY_IMAGE_CAPTCHA_SOLUTION_DAPP"),
        (ClientApiPaths::CheckSpamEmail.as_str(), "CHECK_SPAM_EMAIL"),
        (ClientApiPaths::GetProviderStatus.as_str(), "GET_PROVIDER_STATUS"),
        (PublicApiPaths::GetProviderDetails.as_str(), "GET_PROVIDER_DETAILS"),
        (ClientApiPaths::SubmitUserEvents.as_str(), "SUBMIT_USER_EVENTS"),
        (AdminApiPaths::SiteKeyRegister.as_str(), "SITE_KEY_REGISTER"),
        (AdminApiPaths::SiteKeysRegister.as_str(), "SITE_KEYS_REGISTER"),
        (AdminApiPaths::SiteKeyRemove.as_str(), "SITE_KEY_REMOVE"),
        (AdminApiPaths::SiteKeysRemove.as_str(), "SITE_KEYS_REMOVE"),
        (AdminApiPaths::ToggleMaintenanceMode.as_str(), "TOGGLE_MAINTENANCE_MODE"),
        (AdminApiPaths::UpdateDecisionMachine.as_str(), "UPDATE_DECISION_MACHINE"),
        (ClientApiPaths::GetFrictionlessCaptchaChallenge.as_str(), "GET_FR_CAPTCHA_CHALLENGE"),
        (AdminApiPaths::GetDecisionMachine.as_str(), "GET_DECISION_MACHINE"),
        (AdminApiPaths::GetAllDecisionMachines.as_str(), "GET_ALL_DECISION_MACHINES"),
        (AdminApiPaths::RemoveAllDecisionMachines.as_str(), "REMOVE_ALL_DECISION_MACHINES"),
        (AdminApiPaths::RemoveDecisionMachine.as_str(), "REMOVE_DECISION_MACHINE"),
        (AdminApiPaths::ClearAllCounters.as_str(), "CLEAR_ALL_COUNTERS"),
        (AdminApiPaths::GetSession.as_str(), "GET_SESSION"),
        (ClientApiPaths::GetPuzzleCaptchaChallenge.as_str(), "GET_PUZZLE_CAPTCHA_CHALLENGE"),
        (ClientApiPaths::SubmitPuzzleCaptchaSolution.as_str(), "SUBMIT_PUZZLE_CAPTCHA_SOLUTION"),
        (ClientApiPaths::VerifyPuzzleCaptchaSolution.as_str(), "VERIFY_PUZZLE_CAPTCHA_SOLUTION"),
        (ClientApiPaths::GetAudioCaptchaChallenge.as_str(), "GET_AUDIO_CAPTCHA_CHALLENGE"),
        (ClientApiPaths::SubmitAudioCaptchaSolution.as_str(), "SUBMIT_AUDIO_CAPTCHA_SOLUTION"),
        (ClientApiPaths::VerifyAudioCaptchaSolution.as_str(), "VERIFY_AUDIO_CAPTCHA_SOLUTION"),
        (ClientApiPaths::GetIconOrderCaptchaChallenge.as_str(), "GET_ICON_ORDER_CAPTCHA_CHALLENGE"),
        (ClientApiPaths::SubmitIconOrderCaptchaSolution.as_str(), "SUBMIT_ICON_ORDER_CAPTCHA_SOLUTION"),
        (ClientApiPaths::VerifyIconOrderCaptchaSolution.as_str(), "VERIFY_ICON_ORDER_CAPTCHA_SOLUTION"),
        (ClientApiPaths::VerifyAuthenticatedSession.as_str(), "VERIFY_AUTHENTICATED_SESSION"),
        (AdminApiPaths::DnsEvent.as_str(), "DNS_EVENT"),
        (ClientApiPaths::AssignDetectorBundle.as_str(), "ASSIGN_DETECTOR_BUNDLE"),
        (AdminApiPaths::ReplaceDetectorPool.as_str(), "REPLACE_DETECTOR_POOL"),
    ]
}

/// `getRateLimitConfig`: `{ [route]: { windowMs, limit } }`, each the raw environment string,
/// the schema coercing it, or left out when unset.
pub fn get_rate_limit_config(env: &Environment) -> Value {
    let mut out: Map<String, Value> = Map::new();
    for (route, stem) in routes() {
        let mut limit: Map<String, Value> = Map::new();
        if let Some(window) = env.get(&format!("PROSOPO_{stem}_WINDOW")) {
            limit.insert("windowMs".to_string(), Value::String(window));
        }
        if let Some(count) = env.get(&format!("PROSOPO_{stem}_LIMIT")) {
            limit.insert("limit".to_string(), Value::String(count));
        }
        out.insert(route.to_string(), Value::Object(limit));
    }
    Value::Object(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn environment(variables: &[(&str, &str)]) -> Environment {
        Environment::from_map(variables.iter().map(|(name, value)| (name.to_string(), value.to_string())).collect::<HashMap<String, String>>())
    }

    fn entry(config: &Value, route: &str) -> Value {
        config.get(route).cloned().unwrap_or_else(|| panic!("no entry for {route}"))
    }

    #[test]
    fn leaves_out_window_and_limit_for_every_route_when_no_variable_is_set() {
        let config: Value = get_rate_limit_config(&environment(&[]));
        for (route, limits) in config.as_object().expect("an object") {
            assert_eq!(limits, &serde_json::json!({}), "{route}");
        }
    }

    #[test]
    fn has_an_entry_for_every_client_route_it_limits() {
        let config: Value = get_rate_limit_config(&environment(&[]));
        for route in [
            ClientApiPaths::GetImageCaptchaChallenge,
            ClientApiPaths::GetPowCaptchaChallenge,
            ClientApiPaths::SubmitImageCaptchaSolution,
            ClientApiPaths::SubmitPowCaptchaSolution,
            ClientApiPaths::VerifyPowCaptchaSolution,
            ClientApiPaths::VerifyImageCaptchaSolutionDapp,
            ClientApiPaths::CheckSpamEmail,
            ClientApiPaths::GetProviderStatus,
            ClientApiPaths::SubmitUserEvents,
            ClientApiPaths::GetFrictionlessCaptchaChallenge,
            ClientApiPaths::GetPuzzleCaptchaChallenge,
            ClientApiPaths::SubmitPuzzleCaptchaSolution,
            ClientApiPaths::VerifyPuzzleCaptchaSolution,
            ClientApiPaths::GetIconOrderCaptchaChallenge,
            ClientApiPaths::SubmitIconOrderCaptchaSolution,
            ClientApiPaths::VerifyIconOrderCaptchaSolution,
        ] {
            entry(&config, route.as_str());
        }
    }

    #[test]
    fn has_an_entry_for_every_admin_route_it_limits() {
        let config: Value = get_rate_limit_config(&environment(&[]));
        for route in [
            AdminApiPaths::SiteKeyRegister,
            AdminApiPaths::SiteKeysRegister,
            AdminApiPaths::SiteKeyRemove,
            AdminApiPaths::SiteKeysRemove,
            AdminApiPaths::ReplaceDetectorPool,
            AdminApiPaths::ToggleMaintenanceMode,
            AdminApiPaths::UpdateDecisionMachine,
            AdminApiPaths::GetDecisionMachine,
            AdminApiPaths::GetAllDecisionMachines,
            AdminApiPaths::RemoveAllDecisionMachines,
            AdminApiPaths::RemoveDecisionMachine,
            AdminApiPaths::ClearAllCounters,
            AdminApiPaths::DnsEvent,
        ] {
            entry(&config, route.as_str());
        }
    }

    #[test]
    fn has_an_entry_for_the_public_details_route() {
        entry(&get_rate_limit_config(&environment(&[])), PublicApiPaths::GetProviderDetails.as_str());
    }

    #[test]
    fn passes_the_variables_through_as_strings_to_their_route_only() {
        let config: Value = get_rate_limit_config(&environment(&[
            ("PROSOPO_GET_IMAGE_CAPTCHA_CHALLENGE_WINDOW", "60000"),
            ("PROSOPO_GET_IMAGE_CAPTCHA_CHALLENGE_LIMIT", "10"),
        ]));
        assert_eq!(entry(&config, ClientApiPaths::GetImageCaptchaChallenge.as_str()), serde_json::json!({ "windowMs": "60000", "limit": "10" }));
        assert_eq!(entry(&config, ClientApiPaths::CheckSpamEmail.as_str()), serde_json::json!({}));
    }

    #[test]
    fn keeps_window_and_limit_apart() {
        let config: Value = get_rate_limit_config(&environment(&[
            ("PROSOPO_CHECK_SPAM_EMAIL_WINDOW", "WINDOW_MARKER"),
            ("PROSOPO_CHECK_SPAM_EMAIL_LIMIT", "LIMIT_MARKER"),
        ]));
        assert_eq!(entry(&config, ClientApiPaths::CheckSpamEmail.as_str()), serde_json::json!({ "windowMs": "WINDOW_MARKER", "limit": "LIMIT_MARKER" }));
    }

    #[test]
    fn reads_the_environment_it_is_given_each_time() {
        let route: &str = AdminApiPaths::DnsEvent.as_str();
        assert_eq!(entry(&get_rate_limit_config(&environment(&[("PROSOPO_DNS_EVENT_WINDOW", "first")])), route)["windowMs"], "first");
        assert_eq!(entry(&get_rate_limit_config(&environment(&[("PROSOPO_DNS_EVENT_WINDOW", "second")])), route)["windowMs"], "second");
        assert!(entry(&get_rate_limit_config(&environment(&[])), route).get("windowMs").is_none());
    }
}
