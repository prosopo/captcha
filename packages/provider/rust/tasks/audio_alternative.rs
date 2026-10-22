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

//! tasks/audioAlternative.ts: audio is never selected on its own, only served in exchange for a
//! visual session, once the site owner has turned it on and Prosopo has flagged audio for the
//! site.

use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::settings::is_captcha_type_feature_enabled;
use serde_json::Value;

/// `isAudioAlternativeSessionType`: a visual challenge, which can offer audio instead.
pub fn is_audio_alternative_session_type(captcha_type: Option<CaptchaType>) -> bool {
    matches!(captcha_type, Some(CaptchaType::Image | CaptchaType::Puzzle | CaptchaType::IconOrder))
}

/// `isAudioAlternativeEnabled`: the owner's switch is exactly `true` and the audio flag is on.
pub fn is_audio_alternative_enabled(settings: Option<&Value>) -> bool {
    settings.is_some_and(|settings| {
        settings.get("audioAccessibilityEnabled") == Some(&Value::Bool(true))
            && is_captcha_type_feature_enabled(CaptchaType::Audio, settings.get("captchaTypeFeatureFlags"))
    })
}

/// `offersAudioAlternative`.
pub fn offers_audio_alternative(captcha_type: Option<CaptchaType>, audio_alternative_enabled: bool) -> bool {
    audio_alternative_enabled && is_audio_alternative_session_type(captcha_type)
}

/// `isAudioAlternativeAllowed`: an audio challenge against a session of another type.
pub fn is_audio_alternative_allowed(requested: CaptchaType, session_type: CaptchaType, settings: Option<&Value>) -> bool {
    requested == CaptchaType::Audio && offers_audio_alternative(Some(session_type), is_audio_alternative_enabled(settings))
}

#[cfg(test)]
mod tests {
    //! tests/unit/tasks/audioAlternative.unit.test.ts
    use super::*;
    use serde_json::json;

    const VISUAL: [CaptchaType; 3] = [CaptchaType::Image, CaptchaType::Puzzle, CaptchaType::IconOrder];
    const NON_VISUAL: [CaptchaType; 4] = [CaptchaType::Pow, CaptchaType::Frictionless, CaptchaType::Authenticated, CaptchaType::Audio];

    #[test]
    fn is_true_for_every_visual_challenge() {
        assert!(VISUAL.iter().all(|kind| is_audio_alternative_session_type(Some(*kind))));
    }

    #[test]
    fn is_false_for_types_with_no_challenge_to_switch_away_from() {
        assert!(NON_VISUAL.iter().all(|kind| !is_audio_alternative_session_type(Some(*kind))));
        assert!(!is_audio_alternative_session_type(None));
    }

    #[test]
    fn needs_both_the_owners_switch_and_the_audio_feature_flag() {
        assert!(is_audio_alternative_enabled(Some(&json!({ "audioAccessibilityEnabled": true, "captchaTypeFeatureFlags": { "audio": true } }))));
        assert!(!is_audio_alternative_enabled(Some(&json!({ "audioAccessibilityEnabled": true }))));
        assert!(!is_audio_alternative_enabled(Some(&json!({ "audioAccessibilityEnabled": true, "captchaTypeFeatureFlags": { "audio": false } }))));
        assert!(!is_audio_alternative_enabled(Some(&json!({ "audioAccessibilityEnabled": false, "captchaTypeFeatureFlags": { "audio": true } }))));
        assert!(!is_audio_alternative_enabled(Some(&json!({ "captchaTypeFeatureFlags": { "audio": true } }))));
        assert!(!is_audio_alternative_enabled(None));
    }

    fn on() -> Value {
        json!({ "audioAccessibilityEnabled": true, "captchaTypeFeatureFlags": { "audio": true } })
    }

    #[test]
    fn allows_audio_against_a_visual_session_on_a_site_with_both_switches_on() {
        assert!(VISUAL.iter().all(|kind| is_audio_alternative_allowed(CaptchaType::Audio, *kind, Some(&on()))));
    }

    #[test]
    fn refuses_when_either_switch_is_off() {
        let off: Value = json!({ "audioAccessibilityEnabled": false, "captchaTypeFeatureFlags": { "audio": true } });
        let unflagged: Value = json!({ "audioAccessibilityEnabled": true });
        for settings in [Some(&off), Some(&unflagged), Some(&json!({})), None] {
            assert!(!is_audio_alternative_allowed(CaptchaType::Audio, CaptchaType::Image, settings));
        }
    }

    #[test]
    fn refuses_against_a_session_with_no_visual_challenge() {
        assert!(NON_VISUAL.iter().all(|kind| !is_audio_alternative_allowed(CaptchaType::Audio, *kind, Some(&on()))));
    }

    #[test]
    fn only_ever_applies_to_an_audio_request() {
        assert!(!is_audio_alternative_allowed(CaptchaType::Puzzle, CaptchaType::Image, Some(&on())));
    }
}
