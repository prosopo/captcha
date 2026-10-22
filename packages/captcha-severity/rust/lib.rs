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

//! Relative severity of the captcha types, and the puzzle difficulty ladder.
//!
//! Numbers are `f64` throughout because the TypeScript callers pass arbitrary
//! JS numbers (fractions, negatives, NaN, infinities) straight from config and
//! rules, and the clamping behaviour for those inputs is part of the contract.

mod js_math;
mod puzzle_difficulty;
mod severity;

#[cfg(test)]
mod equivalence;

pub use puzzle_difficulty::{
    clamp_difficulty_level, puzzle_difficulty_to_severity, resolve_max_escalation_level,
    severity_to_puzzle_difficulty, PuzzleDifficultyBand, PuzzleDifficultyRange,
    MAX_AUTO_ESCALATION_LEVEL, MAX_AUTO_ESCALATION_LEVEL_TOUCH, MIN_DECOY_HOLE_DARKEN_MARGIN,
    PUZZLE_DIFFICULTY_LEVELS, PUZZLE_ROUNDS_PER_DIFFICULTY_LEVEL,
};
pub use severity::{
    captcha_policy_severity, is_stricter_captcha_policy, is_stricter_captcha_type,
    rank_captcha_type, CaptchaPolicySeverityInput,
};
