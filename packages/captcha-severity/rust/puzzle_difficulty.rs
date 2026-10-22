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

//! The puzzle difficulty ladder and its conversions to and from the image
//! round count that the rest of the system uses as its severity currency.
//! Sampling a render out of a level's bands stays with the puzzle renderer.

use serde::{Deserialize, Serialize};

use crate::js_math::{js_max, js_min};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct PuzzleDifficultyRange {
    pub min: f64,
    pub max: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PuzzleDifficultyBand {
    /// Index into `PUZZLE_DIFFICULTY_LEVELS`. 0 is the site's ordinary puzzle.
    pub level: f64,
    /// Placement accuracy required, in px. Lower is stricter.
    pub tolerance: PuzzleDifficultyRange,
    /// Decoy silhouettes scattered on the background. More is harder.
    pub decoy_count: PuzzleDifficultyRange,
    /// Multiplier on decoy pixels. Lower brings decoys closer to the real
    /// cut's darkness.
    pub decoy_hole_darken: PuzzleDifficultyRange,
    /// Dark inner rim amplitude on each decoy, 0-255. Higher is harder.
    pub decoy_edge_darkness: PuzzleDifficultyRange,
    /// Piece size as a fraction of background width. Smaller is harder.
    pub piece_scale: PuzzleDifficultyRange,
}

/// Minimum gap kept between `decoy_hole_darken` and `hole_darken`: closer and
/// a human cannot tell target from decoy, further and a solver thresholds on
/// brightness alone.
pub const MIN_DECOY_HOLE_DARKEN_MARGIN: f64 = 0.04;

/// Highest level reachable by automatic escalation. L4 is reserved for
/// sessions already destined to fail verification, because with image
/// disabled a human who cannot solve the hardest puzzle has no way through.
pub const MAX_AUTO_ESCALATION_LEVEL: f64 = 3.0;

/// Touch ceiling: tolerance is in CSS pixels in a fixed-size widget, so a
/// level asks the same accuracy of a fingertip as of a mouse.
pub const MAX_AUTO_ESCALATION_LEVEL_TOUCH: f64 = 2.0;

/// Ceiling on automatic escalation when the bot-detection payload is stale.
pub const MAX_STALE_PAYLOAD_LEVEL: f64 = 1.0;

/// Loosest placement target a touch device is ever asked for, in px. The touch
/// ceiling bounds the ladder only; this floor is applied at the point of issue,
/// after the site's tolerance, a traffic-filter override and a routing
/// machine's override have resolved, so it covers all four.
pub const TOUCH_MIN_TOLERANCE_PX: f64 = 12.0;

/// Smallest piece served to a touch device, as a fraction of background width:
/// below this the finger dragging it hides it.
pub const TOUCH_MIN_PIECE_SCALE: f64 = 0.2;

pub const PUZZLE_ROUNDS_PER_DIFFICULTY_LEVEL: f64 = 2.0;

const fn range(min: f64, max: f64) -> PuzzleDifficultyRange {
    PuzzleDifficultyRange { min, max }
}

/// Adjacent bands overlap on purpose so a single render does not reveal
/// which level it was drawn from. L0 reproduces the shipped defaults.
pub const PUZZLE_DIFFICULTY_LEVELS: [PuzzleDifficultyBand; 5] = [
    PuzzleDifficultyBand {
        level: 0.0,
        tolerance: range(14.0, 16.0),
        decoy_count: range(4.0, 6.0),
        decoy_hole_darken: range(0.68, 0.72),
        decoy_edge_darkness: range(18.0, 22.0),
        piece_scale: range(0.15, 0.45),
    },
    PuzzleDifficultyBand {
        level: 1.0,
        tolerance: range(12.0, 15.0),
        decoy_count: range(6.0, 10.0),
        decoy_hole_darken: range(0.66, 0.7),
        decoy_edge_darkness: range(20.0, 24.0),
        piece_scale: range(0.14, 0.4),
    },
    PuzzleDifficultyBand {
        level: 2.0,
        tolerance: range(10.0, 13.0),
        decoy_count: range(10.0, 16.0),
        decoy_hole_darken: range(0.64, 0.68),
        decoy_edge_darkness: range(22.0, 27.0),
        piece_scale: range(0.12, 0.34),
    },
    PuzzleDifficultyBand {
        level: 3.0,
        tolerance: range(8.0, 11.0),
        decoy_count: range(16.0, 26.0),
        decoy_hole_darken: range(0.62, 0.66),
        decoy_edge_darkness: range(25.0, 30.0),
        piece_scale: range(0.1, 0.28),
    },
    PuzzleDifficultyBand {
        level: 4.0,
        tolerance: range(6.0, 9.0),
        decoy_count: range(26.0, 40.0),
        decoy_hole_darken: range(0.6, 0.64),
        decoy_edge_darkness: range(28.0, 34.0),
        piece_scale: range(0.09, 0.22),
    },
];

const HIGHEST_LEVEL: f64 = (PUZZLE_DIFFICULTY_LEVELS.len() - 1) as f64;

pub fn ease_tolerance_for_touch(tolerance: f64) -> f64 {
    js_max(tolerance, TOUCH_MIN_TOLERANCE_PX)
}

pub fn ease_piece_scale_for_touch(range: PuzzleDifficultyRange) -> PuzzleDifficultyRange {
    PuzzleDifficultyRange {
        min: js_max(range.min, TOUCH_MIN_PIECE_SCALE),
        max: js_max(range.max, TOUCH_MIN_PIECE_SCALE),
    }
}

/// `max_level` defaults to `MAX_AUTO_ESCALATION_LEVEL` when `None`.
pub fn clamp_difficulty_level(level: f64, max_level: Option<f64>) -> f64 {
    let ceiling: f64 = js_min(
        max_level.unwrap_or(MAX_AUTO_ESCALATION_LEVEL),
        HIGHEST_LEVEL,
    );
    if !level.is_finite() {
        return 0.0;
    }
    js_max(0.0, js_min(level.floor(), ceiling))
}

/// The stricter of the site's own `puzzleMaxDifficulty` and the device ceiling.
pub fn resolve_max_escalation_level(site_max_level: Option<f64>, is_touch: bool) -> f64 {
    let device_ceiling: f64 = if is_touch {
        MAX_AUTO_ESCALATION_LEVEL_TOUCH
    } else {
        MAX_AUTO_ESCALATION_LEVEL
    };
    match site_max_level {
        Some(site) if site.is_finite() => js_min(js_max(0.0, site.floor()), device_ceiling),
        _ => device_ceiling,
    }
}

/// Maps image rounds requested above the site's ordinary count onto a
/// difficulty level. Relative rather than absolute because the baseline
/// varies per site. `max_level` defaults to `MAX_AUTO_ESCALATION_LEVEL`.
pub fn severity_to_puzzle_difficulty(
    requested_image_rounds: Option<f64>,
    base_image_rounds: f64,
    max_level: Option<f64>,
) -> f64 {
    let Some(requested) = requested_image_rounds else {
        return 0.0;
    };
    let excess: f64 = requested - base_image_rounds;
    let level: f64 = if !excess.is_finite() || excess <= 0.0 {
        0.0
    } else if excess <= 2.0 {
        1.0
    } else if excess <= 4.0 {
        2.0
    } else if excess <= 6.0 {
        3.0
    } else {
        4.0
    };
    clamp_difficulty_level(level, max_level)
}

/// The round count that lands squarely on `level`; the inverse of
/// `severity_to_puzzle_difficulty` for the same baseline and ceiling.
pub fn puzzle_difficulty_to_severity(
    level: f64,
    base_image_rounds: f64,
    max_level: Option<f64>,
) -> f64 {
    base_image_rounds
        + clamp_difficulty_level(level, max_level) * PUZZLE_ROUNDS_PER_DIFFICULTY_LEVEL
}

#[cfg(test)]
mod tests {
    // Ported from src/puzzleDifficulty.test.ts
    use super::*;

    const LADDER_LEN: f64 = PUZZLE_DIFFICULTY_LEVELS.len() as f64;

    #[test]
    fn table_is_ordered_strictly_harder_as_the_level_rises() {
        for pair in PUZZLE_DIFFICULTY_LEVELS.windows(2) {
            let (prev, cur) = (&pair[0], &pair[1]);
            assert!(cur.tolerance.max < prev.tolerance.max);
            assert!(cur.decoy_count.min >= prev.decoy_count.min);
            assert!(cur.decoy_hole_darken.max < prev.decoy_hole_darken.max);
            assert!(cur.decoy_edge_darkness.max > prev.decoy_edge_darkness.max);
            assert!(cur.piece_scale.max < prev.piece_scale.max);
        }
    }

    #[test]
    fn table_overlaps_adjacent_bands_so_one_render_does_not_identify_the_level() {
        for pair in PUZZLE_DIFFICULTY_LEVELS.windows(2) {
            let (prev, cur) = (&pair[0], &pair[1]);
            assert!(cur.decoy_count.min <= prev.decoy_count.max);
            assert!(cur.tolerance.max >= prev.tolerance.min);
        }
    }

    #[test]
    fn table_indexes_each_band_by_its_own_position() {
        for (index, band) in PUZZLE_DIFFICULTY_LEVELS.iter().enumerate() {
            assert_eq!(band.level, index as f64);
        }
    }

    #[test]
    fn severity_maps_no_requested_rounds_to_the_baseline_level() {
        assert_eq!(severity_to_puzzle_difficulty(None, 2.0, None), 0.0);
    }

    #[test]
    fn severity_maps_a_request_at_or_below_the_site_baseline_to_the_baseline_level() {
        assert_eq!(severity_to_puzzle_difficulty(Some(2.0), 2.0, None), 0.0);
        assert_eq!(severity_to_puzzle_difficulty(Some(1.0), 2.0, None), 0.0);
    }

    #[test]
    fn severity_rises_monotonically_with_rounds_requested_above_the_baseline() {
        let levels: Vec<f64> = [0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 12.0]
            .iter()
            .map(|extra| severity_to_puzzle_difficulty(Some(2.0 + extra), 2.0, Some(LADDER_LEN)))
            .collect();
        for pair in levels.windows(2) {
            assert!(pair[1] >= pair[0]);
        }
    }

    #[test]
    fn severity_is_relative_to_the_site_baseline_not_an_absolute_round_count() {
        assert!(
            severity_to_puzzle_difficulty(Some(6.0), 2.0, None)
                > severity_to_puzzle_difficulty(Some(6.0), 6.0, None)
        );
    }

    #[test]
    fn severity_caps_automatic_escalation_below_the_hardest_level() {
        assert_eq!(
            severity_to_puzzle_difficulty(Some(100.0), 2.0, None),
            MAX_AUTO_ESCALATION_LEVEL
        );
        const { assert!(MAX_AUTO_ESCALATION_LEVEL < LADDER_LEN - 1.0) };
    }

    #[test]
    fn clamp_difficulty_level_clamps_out_of_range_and_non_finite_input() {
        assert_eq!(clamp_difficulty_level(-5.0, None), 0.0);
        assert_eq!(clamp_difficulty_level(f64::NAN, None), 0.0);
        assert_eq!(
            clamp_difficulty_level(99.0, None),
            MAX_AUTO_ESCALATION_LEVEL
        );
    }

    #[test]
    fn to_severity_round_trips_every_reachable_level_on_any_site_baseline() {
        for base_image_rounds in [1.0, 2.0, 5.0, 10.0] {
            let mut level: f64 = 0.0;
            while level <= MAX_AUTO_ESCALATION_LEVEL {
                let rounds: f64 = puzzle_difficulty_to_severity(level, base_image_rounds, None);
                assert_eq!(
                    severity_to_puzzle_difficulty(Some(rounds), base_image_rounds, None),
                    level
                );
                level += 1.0;
            }
        }
    }

    #[test]
    fn to_severity_round_trips_the_reserved_level_when_the_caller_lifts_the_ceiling() {
        let max_level: f64 = LADDER_LEN - 1.0;
        let rounds: f64 = puzzle_difficulty_to_severity(max_level, 2.0, Some(max_level));
        assert_eq!(
            severity_to_puzzle_difficulty(Some(rounds), 2.0, Some(max_level)),
            max_level
        );
    }

    #[test]
    fn to_severity_gives_each_level_a_distinct_round_count() {
        let mut counts: Vec<f64> = (0..=MAX_AUTO_ESCALATION_LEVEL as u32)
            .map(|level| puzzle_difficulty_to_severity(f64::from(level), 2.0, None))
            .collect();
        let len: usize = counts.len();
        counts.sort_by(|a, b| a.total_cmp(b));
        counts.dedup();
        assert_eq!(counts.len(), len);
    }

    #[test]
    fn to_severity_clamps_to_the_same_ceiling_severity_to_puzzle_difficulty_does() {
        assert_eq!(
            puzzle_difficulty_to_severity(99.0, 2.0, None),
            puzzle_difficulty_to_severity(MAX_AUTO_ESCALATION_LEVEL, 2.0, None)
        );
        assert_eq!(puzzle_difficulty_to_severity(-1.0, 2.0, None), 2.0);
        assert_eq!(puzzle_difficulty_to_severity(f64::NAN, 2.0, None), 2.0);
    }

    #[test]
    fn to_severity_leaves_the_sites_own_settings_in_force_at_level_0() {
        assert_eq!(
            severity_to_puzzle_difficulty(
                Some(puzzle_difficulty_to_severity(0.0, 2.0, None)),
                2.0,
                None
            ),
            0.0
        );
    }

    #[test]
    fn resolve_stops_touch_one_rung_below_pointer() {
        assert_eq!(
            MAX_AUTO_ESCALATION_LEVEL_TOUCH,
            MAX_AUTO_ESCALATION_LEVEL - 1.0
        );
    }

    #[test]
    fn resolve_applies_the_device_ceiling_when_the_site_has_no_cap_of_its_own() {
        assert_eq!(
            resolve_max_escalation_level(None, false),
            MAX_AUTO_ESCALATION_LEVEL
        );
        assert_eq!(
            resolve_max_escalation_level(None, true),
            MAX_AUTO_ESCALATION_LEVEL_TOUCH
        );
    }

    #[test]
    fn resolve_does_not_let_a_permissive_site_cap_out_vote_the_touch_ceiling() {
        assert_eq!(
            resolve_max_escalation_level(Some(4.0), true),
            MAX_AUTO_ESCALATION_LEVEL_TOUCH
        );
        assert_eq!(
            resolve_max_escalation_level(Some(3.0), true),
            MAX_AUTO_ESCALATION_LEVEL_TOUCH
        );
    }

    #[test]
    fn resolve_does_not_raise_a_site_that_deliberately_sits_below_the_ceiling() {
        assert_eq!(resolve_max_escalation_level(Some(0.0), true), 0.0);
        assert_eq!(resolve_max_escalation_level(Some(0.0), false), 0.0);
        assert_eq!(resolve_max_escalation_level(Some(1.0), true), 1.0);
    }

    #[test]
    fn resolve_never_returns_a_level_the_ladder_cannot_serve() {
        for is_touch in [true, false] {
            for site_max in [-1.0, 0.0, 1.0, 2.0, 3.0, 4.0, 99.0, f64::NAN] {
                let resolved: f64 = resolve_max_escalation_level(Some(site_max), is_touch);
                assert!(resolved >= 0.0);
                assert!(resolved < LADDER_LEN);
            }
        }
    }

    #[test]
    fn resolve_caps_the_level_actually_served_on_touch_at_l2() {
        let touch_max: f64 = resolve_max_escalation_level(Some(4.0), true);
        assert_eq!(
            severity_to_puzzle_difficulty(Some(100.0), 2.0, Some(touch_max)),
            MAX_AUTO_ESCALATION_LEVEL_TOUCH
        );
        assert_eq!(
            clamp_difficulty_level(99.0, Some(touch_max)),
            MAX_AUTO_ESCALATION_LEVEL_TOUCH
        );
    }

    #[test]
    fn resolve_leaves_the_pointer_path_on_its_existing_ceiling() {
        let pointer_max: f64 = resolve_max_escalation_level(None, false);
        assert_eq!(
            severity_to_puzzle_difficulty(Some(100.0), 2.0, Some(pointer_max)),
            MAX_AUTO_ESCALATION_LEVEL
        );
    }

    #[test]
    fn resolve_keeps_the_touch_ceiling_strictly_easier_than_the_pointer_ceiling() {
        let touch: &PuzzleDifficultyBand =
            &PUZZLE_DIFFICULTY_LEVELS[MAX_AUTO_ESCALATION_LEVEL_TOUCH as usize];
        let pointer: &PuzzleDifficultyBand =
            &PUZZLE_DIFFICULTY_LEVELS[MAX_AUTO_ESCALATION_LEVEL as usize];
        assert!(touch.tolerance.min > pointer.tolerance.min);
        assert!(touch.piece_scale.min > pointer.piece_scale.min);
        assert!(touch.decoy_count.max < pointer.decoy_count.max);
    }

    #[test]
    fn touch_easing_raises_a_tolerance_below_the_floor() {
        assert_eq!(ease_tolerance_for_touch(5.0), TOUCH_MIN_TOLERANCE_PX);
        assert_eq!(ease_tolerance_for_touch(8.0), TOUCH_MIN_TOLERANCE_PX);
    }

    #[test]
    fn touch_easing_leaves_a_tolerance_at_or_above_the_floor_alone() {
        assert_eq!(ease_tolerance_for_touch(TOUCH_MIN_TOLERANCE_PX), TOUCH_MIN_TOLERANCE_PX);
        assert_eq!(ease_tolerance_for_touch(15.0), 15.0);
    }

    #[test]
    fn touch_easing_never_tightens_a_tolerance() {
        for tolerance in [1.0, 5.0, 10.0, 12.0, 15.0, 20.0, 1000.0] {
            assert!(ease_tolerance_for_touch(tolerance) >= tolerance);
        }
    }

    #[test]
    fn touch_easing_raises_both_ends_of_a_piece_scale_range_under_the_floor() {
        assert_eq!(
            ease_piece_scale_for_touch(range(0.05, 0.1)),
            range(TOUCH_MIN_PIECE_SCALE, TOUCH_MIN_PIECE_SCALE)
        );
    }

    #[test]
    fn touch_easing_raises_only_the_min_when_the_max_is_above_the_floor() {
        assert_eq!(
            ease_piece_scale_for_touch(range(0.1, 0.28)),
            range(TOUCH_MIN_PIECE_SCALE, 0.28)
        );
    }

    #[test]
    fn touch_easing_never_inverts_a_piece_scale_range() {
        for original in [range(0.05, 0.05), range(0.1, 0.28), range(0.15, 0.45), range(0.3, 0.3)] {
            let eased: PuzzleDifficultyRange = ease_piece_scale_for_touch(original);
            assert!(eased.max >= eased.min);
            assert!(eased.min >= original.min);
        }
    }

    #[test]
    fn touch_easing_bites_at_the_touch_ceiling() {
        let band: &PuzzleDifficultyBand =
            &PUZZLE_DIFFICULTY_LEVELS[MAX_AUTO_ESCALATION_LEVEL_TOUCH as usize];
        assert!(ease_tolerance_for_touch(band.tolerance.min) > band.tolerance.min);
        assert!(ease_piece_scale_for_touch(band.piece_scale).min > band.piece_scale.min);
    }
}
