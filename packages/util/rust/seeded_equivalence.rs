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

//! Replays rust/equivalence/seeded-vectors.json, written by generate-seeded.ts on Node 24,
//! and ports src/tests/lodash.unit.test.ts.

use crate::{Rng, SeedRandom, SeededLodash};
use serde_json::Value;

const VECTORS: &str = include_str!("equivalence/seeded-vectors.json");

fn vectors() -> Value {
    serde_json::from_str(VECTORS).expect("seeded-vectors.json parses")
}

fn field<'a>(value: &'a Value, key: &str) -> &'a Value {
    value
        .get(key)
        .unwrap_or_else(|| panic!("vector has no {key}: {value}"))
}

fn text(value: &Value) -> &str {
    value
        .as_str()
        .unwrap_or_else(|| panic!("expected a string: {value}"))
}

fn numbers(value: &Value) -> Vec<f64> {
    value
        .as_array()
        .expect("an array")
        .iter()
        .map(|number| number.as_f64().expect("a number"))
        .collect()
}

/// `Number(text)` for the bounds the generator writes as strings.
fn number(value: &Value) -> f64 {
    match text(value) {
        "Infinity" => f64::INFINITY,
        "-Infinity" => f64::NEG_INFINITY,
        "NaN" => f64::NAN,
        other => other.parse().expect("a number"),
    }
}

#[test]
fn seedrandom_matches_the_ts() {
    for vector in field(&vectors(), "generators")
        .as_array()
        .expect("generators")
    {
        let seed: &str = text(field(vector, "seed"));
        let mut prng: SeedRandom = SeedRandom::new(seed);
        let doubles: Vec<f64> = (0..40).map(|_| prng.double()).collect();
        assert_eq!(
            doubles,
            numbers(field(vector, "doubles")),
            "{seed:?} doubles"
        );
        let int32s: Vec<f64> = (0..20).map(|_| f64::from(prng.int32())).collect();
        assert_eq!(int32s, numbers(field(vector, "int32s")), "{seed:?} int32s");
        let quicks: Vec<f64> = (0..20).map(|_| prng.quick()).collect();
        assert_eq!(quicks, numbers(field(vector, "quicks")), "{seed:?} quicks");
        let mut rng: Rng = Rng::new(seed);
        let ints: Vec<f64> = (0..20).map(|_| rng.int() as f64).collect();
        assert_eq!(ints, numbers(field(vector, "ints")), "{seed:?} ints");
        let bools: Vec<Value> = (0..20).map(|_| Value::from(rng.bool())).collect();
        assert_eq!(
            Value::from(bools),
            *field(vector, "bools"),
            "{seed:?} bools"
        );
        let mut rng: Rng = Rng::new(seed);
        let mixed: Vec<f64> = (0..10)
            .flat_map(|_| [rng.double(), rng.float(), f64::from(rng.int32())])
            .collect();
        assert_eq!(mixed, numbers(field(vector, "mixed")), "{seed:?} mixed");
    }
}

#[test]
fn seeded_lodash_matches_the_ts() {
    let vectors: Value = vectors();
    let ops: &Vec<Value> = field(&vectors, "ops").as_array().expect("ops");
    for run in field(&vectors, "lodashRuns").as_array().expect("runs") {
        let seed: &str = text(field(run, "seed"));
        let mut lodash: SeededLodash = SeededLodash::new(seed);
        let expected: &Vec<Value> = field(run, "results").as_array().expect("results");
        for (index, (op, expected)) in ops.iter().zip(expected).enumerate() {
            let actual: Value = match text(field(op, "op")) {
                "random" => Value::from(
                    lodash.random(number(field(op, "lower")), number(field(op, "upper"))),
                ),
                "shuffle" => Value::from(lodash.shuffle(&numbers(field(op, "array")))),
                "sampleSize" => Value::from(
                    lodash.sample_size(&numbers(field(op, "array")), number(field(op, "n"))),
                ),
                other => panic!("no {other} op"),
            };
            let same: bool = match (&actual, expected) {
                (Value::Number(a), Value::Number(b)) => a.as_f64() == b.as_f64(),
                (Value::Array(a), Value::Array(b)) => {
                    a.len() == b.len() && a.iter().zip(b).all(|(a, b)| a.as_f64() == b.as_f64())
                }
                _ => false,
            };
            assert!(
                same,
                "{seed:?} call {index} {op}: got {actual}, TS {expected}"
            );
        }
    }
}

mod rng {
    use super::*;

    #[test]
    fn generates_random_numbers_using_a_seed() {
        let mut rand: Rng = Rng::new("0");
        let expected: [i64; 7] = [
            -1681090547,
            408334984,
            788430095,
            3233831872,
            963300000,
            -299378919,
            97582850,
        ];
        for value in expected {
            assert_eq!(rand.int(), value);
        }
    }
}

mod seeded_lodash {
    use super::*;

    #[test]
    fn shuffles_an_array_using_a_seed() {
        let mut lodash: SeededLodash = SeededLodash::new("0");
        let mut array: Vec<i32> = vec![1, 2, 3, 4, 5];
        array = lodash.shuffle(&array);
        assert_eq!(array, vec![4, 2, 1, 3, 5]);
        array = lodash.shuffle(&array);
        assert_eq!(array, vec![3, 4, 1, 5, 2]);
        array = lodash.shuffle(&array);
        assert_eq!(array, vec![3, 4, 5, 2, 1]);
    }
}
