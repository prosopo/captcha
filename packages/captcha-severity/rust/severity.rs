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

use crate::js_math::{js_max, js_min};

/// Spacing between adjacent severity tiers. It must exceed anything the
/// intra-tier component can add, or a hardened weaker type would outrank a
/// stricter one; the intra-tier component is clamped below it regardless.
const TIER_GAP: f64 = 10_000.0;

const MAX_INTRA_TIER: f64 = TIER_GAP - 1.0;

fn captcha_type_tier(captcha_type: &str) -> Option<f64> {
    match captcha_type {
        "image" => Some(5.0 * TIER_GAP),
        "iconOrder" => Some(4.0 * TIER_GAP),
        "puzzle" => Some(3.0 * TIER_GAP),
        "pow" => Some(2.0 * TIER_GAP),
        "frictionless" => Some(TIER_GAP),
        _ => None,
    }
}

/// The tunables that make one challenge of a given type harder than another.
/// `solved_images_count` is a round count on `image` and a severity level on
/// `puzzle`; `pow_difficulty` only applies to `pow`.
#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct CaptchaPolicySeverityInput<'a> {
    pub captcha_type: Option<&'a str>,
    pub solved_images_count: Option<f64>,
    pub pow_difficulty: Option<f64>,
}

fn clamp_intra_tier(value: f64) -> f64 {
    if value.is_finite() {
        js_min(js_max(value, 0.0), MAX_INTRA_TIER)
    } else {
        0.0
    }
}

/// Severity of a captcha type on its own. Unset or unrecognised ranks 0.
pub fn rank_captcha_type(captcha_type: Option<&str>) -> f64 {
    captcha_type.and_then(captcha_type_tier).unwrap_or(0.0)
}

/// Strictly greater, so an equal type keeps the incumbent.
pub fn is_stricter_captcha_type(candidate: Option<&str>, incumbent: Option<&str>) -> bool {
    rank_captcha_type(candidate) > rank_captcha_type(incumbent)
}

fn intra_tier_severity(policy: &CaptchaPolicySeverityInput<'_>) -> f64 {
    match policy.captcha_type {
        Some("image") | Some("puzzle") => {
            clamp_intra_tier(policy.solved_images_count.unwrap_or(0.0))
        }
        Some("pow") => clamp_intra_tier(policy.pow_difficulty.unwrap_or(0.0)),
        _ => 0.0,
    }
}

/// Severity of a complete policy: the type tier plus the type's own
/// difficulty setting, clamped so it never reaches the next tier. Returns 0
/// for an unset or unrecognised type whatever the settings say.
pub fn captcha_policy_severity(policy: &CaptchaPolicySeverityInput<'_>) -> f64 {
    let tier: f64 = rank_captcha_type(policy.captcha_type);
    if tier == 0.0 {
        return 0.0;
    }
    tier + intra_tier_severity(policy)
}

/// Strictly greater, so two policies of equal severity keep the incumbent.
pub fn is_stricter_captcha_policy(
    candidate: &CaptchaPolicySeverityInput<'_>,
    incumbent: &CaptchaPolicySeverityInput<'_>,
) -> bool {
    captcha_policy_severity(candidate) > captcha_policy_severity(incumbent)
}

#[cfg(test)]
mod tests {
    // Ported from src/index.test.ts
    use super::*;

    const TYPES: [&str; 5] = ["image", "iconOrder", "puzzle", "pow", "frictionless"];
    const STRICTEST_FIRST: [&str; 5] = ["image", "iconOrder", "puzzle", "pow", "frictionless"];
    const ABSURD_ROUNDS: f64 = 100_000.0;

    fn typed(captcha_type: &str) -> CaptchaPolicySeverityInput<'_> {
        CaptchaPolicySeverityInput {
            captcha_type: Some(captcha_type),
            ..Default::default()
        }
    }

    fn rounds(captcha_type: &str, solved_images_count: f64) -> CaptchaPolicySeverityInput<'_> {
        CaptchaPolicySeverityInput {
            captcha_type: Some(captcha_type),
            solved_images_count: Some(solved_images_count),
            pow_difficulty: None,
        }
    }

    fn pow(captcha_type: &str, pow_difficulty: f64) -> CaptchaPolicySeverityInput<'_> {
        CaptchaPolicySeverityInput {
            captcha_type: Some(captcha_type),
            solved_images_count: None,
            pow_difficulty: Some(pow_difficulty),
        }
    }

    #[test]
    fn rank_captcha_type_ranks_image_gt_icon_order_gt_puzzle_gt_pow_gt_frictionless() {
        let ranks: Vec<f64> = STRICTEST_FIRST
            .iter()
            .rev()
            .map(|t| rank_captcha_type(Some(t)))
            .collect();
        let mut sorted: Vec<f64> = ranks.clone();
        sorted.sort_by(|a, b| a.total_cmp(b));
        assert_eq!(ranks, sorted);
        sorted.dedup();
        assert_eq!(sorted.len(), STRICTEST_FIRST.len());
    }

    #[test]
    fn rank_captcha_type_does_not_rank_audio_above_unset() {
        assert_eq!(rank_captcha_type(Some("audio")), 0.0);
        assert!(!is_stricter_captcha_type(Some("audio"), None));
    }

    #[test]
    fn rank_captcha_type_ranks_unset_and_unrecognised_values_at_0() {
        assert_eq!(rank_captcha_type(None), 0.0);
        assert_eq!(rank_captcha_type(Some("")), 0.0);
        assert_eq!(rank_captcha_type(Some("not-a-captcha-type")), 0.0);
    }

    fn assert_object_prototype_key_ranks_0(key: &str) {
        assert_eq!(rank_captcha_type(Some(key)), 0.0);
        assert_eq!(captcha_policy_severity(&typed(key)), 0.0);
        assert!(is_stricter_captcha_policy(
            &typed("frictionless"),
            &typed(key)
        ));
    }

    #[test]
    fn rank_captcha_type_ranks_the_object_prototype_key_constructor_at_0() {
        assert_object_prototype_key_ranks_0("constructor");
    }

    #[test]
    fn rank_captcha_type_ranks_the_object_prototype_key_to_string_at_0() {
        assert_object_prototype_key_ranks_0("toString");
    }

    #[test]
    fn rank_captcha_type_ranks_the_object_prototype_key_proto_at_0() {
        assert_object_prototype_key_ranks_0("__proto__");
    }

    #[test]
    fn rank_captcha_type_ranks_the_object_prototype_key_has_own_property_at_0() {
        assert_object_prototype_key_ranks_0("hasOwnProperty");
    }

    #[test]
    fn rank_captcha_type_ranks_frictionless_above_unset() {
        assert!(rank_captcha_type(Some("frictionless")) > rank_captcha_type(None));
    }

    #[test]
    fn is_stricter_captcha_type_adjacent_pairs() {
        let cases: [(&str, &str, bool); 8] = [
            ("image", "iconOrder", true),
            ("iconOrder", "image", false),
            ("iconOrder", "puzzle", true),
            ("puzzle", "iconOrder", false),
            ("puzzle", "pow", true),
            ("pow", "puzzle", false),
            ("pow", "frictionless", true),
            ("frictionless", "pow", false),
        ];
        for (candidate, incumbent, expected) in cases {
            assert_eq!(
                is_stricter_captcha_type(Some(candidate), Some(incumbent)),
                expected,
                "is_stricter_captcha_type({candidate}, {incumbent})"
            );
        }
    }

    #[test]
    fn is_stricter_captcha_type_is_false_for_equal_types() {
        for t in TYPES {
            assert!(!is_stricter_captcha_type(Some(t), Some(t)));
        }
    }

    #[test]
    fn is_stricter_captcha_type_treats_any_real_type_as_stricter_than_unset() {
        for t in TYPES {
            assert!(is_stricter_captcha_type(Some(t), None));
            assert!(!is_stricter_captcha_type(None, Some(t)));
        }
    }

    #[test]
    fn is_stricter_captcha_type_is_false_when_both_sides_are_unset() {
        assert!(!is_stricter_captcha_type(None, None));
    }

    #[test]
    fn captcha_policy_severity_orders_by_type_before_any_setting() {
        assert!(
            captcha_policy_severity(&typed("image")) > captcha_policy_severity(&typed("iconOrder"))
        );
        assert!(
            captcha_policy_severity(&typed("iconOrder"))
                > captcha_policy_severity(&typed("puzzle"))
        );
        assert!(captcha_policy_severity(&typed("puzzle")) > captcha_policy_severity(&typed("pow")));
        assert!(
            captcha_policy_severity(&typed("pow"))
                > captcha_policy_severity(&typed("frictionless"))
        );
    }

    #[test]
    fn captcha_policy_severity_never_lets_a_setting_lift_a_policy_over_a_stricter_type() {
        for pair in STRICTEST_FIRST.windows(2) {
            let maxed_out_weaker: f64 = captcha_policy_severity(&CaptchaPolicySeverityInput {
                captcha_type: Some(pair[1]),
                solved_images_count: Some(ABSURD_ROUNDS),
                pow_difficulty: Some(ABSURD_ROUNDS),
            });
            assert!(maxed_out_weaker < captcha_policy_severity(&typed(pair[0])));
        }
    }

    #[test]
    fn captcha_policy_severity_scores_an_unset_or_unrecognised_type_at_0() {
        assert_eq!(
            captcha_policy_severity(&CaptchaPolicySeverityInput {
                captcha_type: None,
                solved_images_count: Some(12.0),
                pow_difficulty: Some(10.0),
            }),
            0.0
        );
        assert_eq!(
            captcha_policy_severity(&rounds("not-a-captcha-type", 12.0)),
            0.0
        );
    }

    #[test]
    fn captcha_policy_severity_ranks_image_by_solved_images_count() {
        assert!(
            captcha_policy_severity(&rounds("image", 9.0))
                > captcha_policy_severity(&rounds("image", 2.0))
        );
    }

    #[test]
    fn captcha_policy_severity_ranks_pow_by_pow_difficulty() {
        assert!(
            captcha_policy_severity(&pow("pow", 8.0)) > captcha_policy_severity(&pow("pow", 4.0))
        );
    }

    #[test]
    fn captcha_policy_severity_ranks_puzzle_by_solved_images_count() {
        assert!(
            captcha_policy_severity(&rounds("puzzle", 9.0))
                > captcha_policy_severity(&rounds("puzzle", 2.0))
        );
    }

    #[test]
    fn captcha_policy_severity_treats_an_unset_setting_as_the_bottom_of_its_tier() {
        assert_eq!(
            captcha_policy_severity(&typed("image")),
            captcha_policy_severity(&rounds("image", 0.0))
        );
        assert!(
            captcha_policy_severity(&rounds("image", 2.0))
                > captcha_policy_severity(&typed("image"))
        );
    }

    #[test]
    fn captcha_policy_severity_ignores_settings_that_do_not_govern_the_type() {
        assert_eq!(
            captcha_policy_severity(&pow("image", 10.0)),
            captcha_policy_severity(&typed("image"))
        );
        assert_eq!(
            captcha_policy_severity(&rounds("pow", 32.0)),
            captcha_policy_severity(&typed("pow"))
        );
        assert_eq!(
            captcha_policy_severity(&pow("puzzle", 10.0)),
            captcha_policy_severity(&typed("puzzle"))
        );
    }

    #[test]
    fn captcha_policy_severity_clamps_negative_and_non_finite_settings() {
        for bad in [-1.0, -ABSURD_ROUNDS, f64::NAN] {
            assert_eq!(
                captcha_policy_severity(&rounds("image", bad)),
                captcha_policy_severity(&typed("image"))
            );
        }
    }

    #[test]
    fn is_stricter_captcha_policy_breaks_a_same_type_tie_on_the_governing_setting() {
        assert!(is_stricter_captcha_policy(
            &rounds("image", 9.0),
            &rounds("image", 2.0)
        ));
        assert!(!is_stricter_captcha_policy(
            &rounds("image", 2.0),
            &rounds("image", 9.0)
        ));
    }

    #[test]
    fn is_stricter_captcha_policy_still_lets_the_type_dominate_the_setting() {
        assert!(!is_stricter_captcha_policy(
            &pow("pow", 10.0),
            &rounds("image", 2.0)
        ));
        assert!(is_stricter_captcha_policy(
            &rounds("image", 2.0),
            &pow("pow", 10.0)
        ));
    }

    #[test]
    fn is_stricter_captcha_policy_is_false_for_genuinely_equal_policies() {
        assert!(!is_stricter_captcha_policy(
            &rounds("image", 3.0),
            &rounds("image", 3.0)
        ));
    }

    #[test]
    fn is_stricter_captcha_policy_differs_from_is_stricter_captcha_type_on_a_same_type_pair() {
        let harder: CaptchaPolicySeverityInput<'_> = rounds("image", 9.0);
        let milder: CaptchaPolicySeverityInput<'_> = rounds("image", 2.0);
        assert!(!is_stricter_captcha_type(
            harder.captcha_type,
            milder.captcha_type
        ));
        assert!(is_stricter_captcha_policy(&harder, &milder));
    }
}
