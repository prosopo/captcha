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

// Ported from rust/equivalence/vectors.json, generated from the TS by rust/equivalence/generate.ts

use serde::Deserialize;

use crate::{
    captcha_policy_severity, clamp_difficulty_level, is_stricter_captcha_policy,
    is_stricter_captcha_type, puzzle_difficulty_to_severity, rank_captcha_type,
    resolve_max_escalation_level, severity_to_puzzle_difficulty, CaptchaPolicySeverityInput,
    PuzzleDifficultyBand, MAX_AUTO_ESCALATION_LEVEL, MAX_AUTO_ESCALATION_LEVEL_TOUCH,
    MIN_DECOY_HOLE_DARKEN_MARGIN, PUZZLE_DIFFICULTY_LEVELS, PUZZLE_ROUNDS_PER_DIFFICULTY_LEVEL,
};

const VECTORS: &str = include_str!("equivalence/vectors.json");

/// A JS number, with NaN, the infinities and -0 carried as strings and
/// `undefined` as null.
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(untagged)]
enum Encoded {
    Number(f64),
    Special(Special),
}

#[derive(Debug, Clone, Copy, Deserialize)]
enum Special {
    #[serde(rename = "NaN")]
    Nan,
    Infinity,
    #[serde(rename = "-Infinity")]
    NegativeInfinity,
    #[serde(rename = "-0")]
    NegativeZero,
}

impl Encoded {
    fn value(self) -> f64 {
        match self {
            Encoded::Number(n) => n,
            Encoded::Special(Special::Nan) => f64::NAN,
            Encoded::Special(Special::Infinity) => f64::INFINITY,
            Encoded::Special(Special::NegativeInfinity) => f64::NEG_INFINITY,
            Encoded::Special(Special::NegativeZero) => -0.0,
        }
    }
}

type OptionalNumber = Option<Encoded>;

fn decode(value: OptionalNumber) -> Option<f64> {
    value.map(Encoded::value)
}

fn require(value: OptionalNumber) -> f64 {
    decode(value).expect("expected a number, got undefined")
}

/// Same value as JS `Object.is`: NaN equals NaN, and -0 differs from +0.
fn assert_same(actual: f64, expected: OptionalNumber, context: &str) {
    let expected: f64 = require(expected);
    let same: bool =
        (actual.is_nan() && expected.is_nan()) || actual.to_bits() == expected.to_bits();
    assert!(same, "{context}: rust {actual:?} != ts {expected:?}");
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EncodedPolicy {
    captcha_type: Option<String>,
    solved_images_count: OptionalNumber,
    pow_difficulty: OptionalNumber,
}

impl EncodedPolicy {
    fn input(&self) -> CaptchaPolicySeverityInput<'_> {
        CaptchaPolicySeverityInput {
            captcha_type: self.captcha_type.as_deref(),
            solved_images_count: decode(self.solved_images_count),
            pow_difficulty: decode(self.pow_difficulty),
        }
    }
}

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
struct Constants {
    MIN_DECOY_HOLE_DARKEN_MARGIN: OptionalNumber,
    MAX_AUTO_ESCALATION_LEVEL: OptionalNumber,
    MAX_AUTO_ESCALATION_LEVEL_TOUCH: OptionalNumber,
    PUZZLE_ROUNDS_PER_DIFFICULTY_LEVEL: OptionalNumber,
}

#[derive(Debug, Deserialize)]
struct ResolveMaxEscalationLevel {
    touch: Vec<OptionalNumber>,
    pointer: Vec<OptionalNumber>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Vectors {
    constants: Constants,
    puzzle_difficulty_levels: Vec<PuzzleDifficultyBand>,
    captcha_types: Vec<Option<String>>,
    rank_captcha_type: Vec<OptionalNumber>,
    is_stricter_captcha_type: Vec<Vec<bool>>,
    policy_types: Vec<Option<String>>,
    policy_numbers: Vec<OptionalNumber>,
    captcha_policy_severity: Vec<Vec<Vec<OptionalNumber>>>,
    pair_policies: Vec<EncodedPolicy>,
    is_stricter_captcha_policy: Vec<Vec<bool>>,
    level_arguments: Vec<OptionalNumber>,
    level_numbers: Vec<OptionalNumber>,
    clamp_difficulty_level: Vec<Vec<OptionalNumber>>,
    resolve_max_escalation_level: ResolveMaxEscalationLevel,
    requested_rounds: Vec<OptionalNumber>,
    base_rounds: Vec<OptionalNumber>,
    max_levels: Vec<OptionalNumber>,
    severity_to_puzzle_difficulty: Vec<Vec<Vec<OptionalNumber>>>,
    puzzle_difficulty_to_severity: Vec<Vec<Vec<OptionalNumber>>>,
}

fn vectors() -> Vectors {
    serde_json::from_str(VECTORS).expect("vectors.json parses")
}

#[test]
fn equivalence_constants() {
    let v: Vectors = vectors();
    let c: &Constants = &v.constants;
    assert_same(
        MIN_DECOY_HOLE_DARKEN_MARGIN,
        c.MIN_DECOY_HOLE_DARKEN_MARGIN,
        "MIN_DECOY_HOLE_DARKEN_MARGIN",
    );
    assert_same(
        MAX_AUTO_ESCALATION_LEVEL,
        c.MAX_AUTO_ESCALATION_LEVEL,
        "MAX_AUTO_ESCALATION_LEVEL",
    );
    assert_same(
        MAX_AUTO_ESCALATION_LEVEL_TOUCH,
        c.MAX_AUTO_ESCALATION_LEVEL_TOUCH,
        "MAX_AUTO_ESCALATION_LEVEL_TOUCH",
    );
    assert_same(
        PUZZLE_ROUNDS_PER_DIFFICULTY_LEVEL,
        c.PUZZLE_ROUNDS_PER_DIFFICULTY_LEVEL,
        "PUZZLE_ROUNDS_PER_DIFFICULTY_LEVEL",
    );
    assert_eq!(
        v.puzzle_difficulty_levels,
        PUZZLE_DIFFICULTY_LEVELS.to_vec()
    );
}

#[test]
fn equivalence_captcha_type() {
    let v: Vectors = vectors();
    assert_eq!(v.rank_captcha_type.len(), v.captcha_types.len());
    for (t, expected) in v.captcha_types.iter().zip(&v.rank_captcha_type) {
        assert_same(
            rank_captcha_type(t.as_deref()),
            *expected,
            &format!("rank_captcha_type({t:?})"),
        );
    }
    assert_eq!(v.is_stricter_captcha_type.len(), v.captcha_types.len());
    for (candidate, row) in v.captcha_types.iter().zip(&v.is_stricter_captcha_type) {
        assert_eq!(row.len(), v.captcha_types.len());
        for (incumbent, expected) in v.captcha_types.iter().zip(row) {
            assert_eq!(
                is_stricter_captcha_type(candidate.as_deref(), incumbent.as_deref()),
                *expected,
                "is_stricter_captcha_type({candidate:?}, {incumbent:?})"
            );
        }
    }
}

#[test]
fn equivalence_captcha_policy_severity() {
    let v: Vectors = vectors();
    assert_eq!(v.captcha_policy_severity.len(), v.policy_types.len());
    for (t, by_solved) in v.policy_types.iter().zip(&v.captcha_policy_severity) {
        assert_eq!(by_solved.len(), v.policy_numbers.len());
        for (solved, by_pow) in v.policy_numbers.iter().zip(by_solved) {
            assert_eq!(by_pow.len(), v.policy_numbers.len());
            for (pow, expected) in v.policy_numbers.iter().zip(by_pow) {
                let input: CaptchaPolicySeverityInput<'_> = CaptchaPolicySeverityInput {
                    captcha_type: t.as_deref(),
                    solved_images_count: decode(*solved),
                    pow_difficulty: decode(*pow),
                };
                assert_same(
                    captcha_policy_severity(&input),
                    *expected,
                    &format!("{input:?}"),
                );
            }
        }
    }
    assert_eq!(v.is_stricter_captcha_policy.len(), v.pair_policies.len());
    for (candidate, row) in v.pair_policies.iter().zip(&v.is_stricter_captcha_policy) {
        assert_eq!(row.len(), v.pair_policies.len());
        for (incumbent, expected) in v.pair_policies.iter().zip(row) {
            assert_eq!(
                is_stricter_captcha_policy(&candidate.input(), &incumbent.input()),
                *expected,
                "is_stricter_captcha_policy({candidate:?}, {incumbent:?})"
            );
        }
    }
}

#[test]
fn equivalence_puzzle_difficulty() {
    let v: Vectors = vectors();
    assert_eq!(v.clamp_difficulty_level.len(), v.level_arguments.len());
    for (level, row) in v.level_arguments.iter().zip(&v.clamp_difficulty_level) {
        assert_eq!(row.len(), v.level_numbers.len());
        for (max_level, expected) in v.level_numbers.iter().zip(row) {
            assert_same(
                clamp_difficulty_level(require(*level), decode(*max_level)),
                *expected,
                &format!("clamp_difficulty_level({level:?}, {max_level:?})"),
            );
        }
    }

    let resolved: &ResolveMaxEscalationLevel = &v.resolve_max_escalation_level;
    assert_eq!(resolved.touch.len(), v.level_numbers.len());
    assert_eq!(resolved.pointer.len(), v.level_numbers.len());
    for ((site, touch), pointer) in v
        .level_numbers
        .iter()
        .zip(&resolved.touch)
        .zip(&resolved.pointer)
    {
        assert_same(
            resolve_max_escalation_level(decode(*site), true),
            *touch,
            &format!("touch {site:?}"),
        );
        assert_same(
            resolve_max_escalation_level(decode(*site), false),
            *pointer,
            &format!("pointer {site:?}"),
        );
    }

    assert_eq!(
        v.severity_to_puzzle_difficulty.len(),
        v.requested_rounds.len()
    );
    for (requested, by_base) in v
        .requested_rounds
        .iter()
        .zip(&v.severity_to_puzzle_difficulty)
    {
        assert_eq!(by_base.len(), v.base_rounds.len());
        for (base, by_max) in v.base_rounds.iter().zip(by_base) {
            assert_eq!(by_max.len(), v.max_levels.len());
            for (max_level, expected) in v.max_levels.iter().zip(by_max) {
                assert_same(
                    severity_to_puzzle_difficulty(
                        decode(*requested),
                        require(*base),
                        decode(*max_level),
                    ),
                    *expected,
                    &format!(
                        "severity_to_puzzle_difficulty({requested:?}, {base:?}, {max_level:?})"
                    ),
                );
            }
        }
    }

    assert_eq!(
        v.puzzle_difficulty_to_severity.len(),
        v.level_arguments.len()
    );
    for (level, by_base) in v
        .level_arguments
        .iter()
        .zip(&v.puzzle_difficulty_to_severity)
    {
        assert_eq!(by_base.len(), v.base_rounds.len());
        for (base, by_max) in v.base_rounds.iter().zip(by_base) {
            assert_eq!(by_max.len(), v.max_levels.len());
            for (max_level, expected) in v.max_levels.iter().zip(by_max) {
                assert_same(
                    puzzle_difficulty_to_severity(
                        require(*level),
                        require(*base),
                        decode(*max_level),
                    ),
                    *expected,
                    &format!("puzzle_difficulty_to_severity({level:?}, {base:?}, {max_level:?})"),
                );
            }
        }
    }
}
