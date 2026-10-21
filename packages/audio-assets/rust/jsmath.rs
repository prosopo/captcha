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

//! JavaScript `Math` and typed-array semantics where they differ from Rust's.
//! Lengths and sample positions stay `f64` through the pipeline, as they are
//! in the TS, so NaN and negative settings behave the same way.

pub(crate) use crate::fdlibm::{cos, exp, pow, tanh};

/// `Math.round`: ties go towards +Infinity.
pub(crate) fn round(x: f64) -> f64 {
    let up = x.ceil();
    if up - 0.5 <= x {
        up
    } else {
        up - 1.0
    }
}

pub(crate) fn max(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        return f64::NAN;
    }
    if a == b {
        return if a.is_sign_positive() { a } else { b };
    }
    if a > b {
        a
    } else {
        b
    }
}

pub(crate) fn min(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        return f64::NAN;
    }
    if a == b {
        return if a.is_sign_negative() { a } else { b };
    }
    if a < b {
        a
    } else {
        b
    }
}

/// Iterations of `for (let n = 0; n < bound; n++)`.
pub(crate) fn count_below(bound: f64) -> usize {
    if bound > 0.0 {
        bound.ceil() as usize
    } else {
        0
    }
}

/// `ToLength`, as `Array.from({ length })` applies it.
pub(crate) fn to_length(value: f64) -> usize {
    if value.is_nan() || value <= 0.0 {
        0
    } else {
        value.trunc().min(9_007_199_254_740_991.0) as usize
    }
}

/// `ToIndex`, as `new Float32Array(length)` applies it; `None` where the
/// constructor throws a `RangeError`.
pub(crate) fn to_index(value: f64) -> Option<usize> {
    let integer = if value.is_nan() { 0.0 } else { value.trunc() };
    if !(0.0..=9_007_199_254_740_991.0).contains(&integer) {
        return None;
    }
    Some(integer as usize)
}

/// `String(number)` for the values that reach an error message: integers and
/// the infinities.
pub(crate) fn number_to_string(value: f64) -> String {
    if value.is_nan() {
        "NaN".to_owned()
    } else if value.is_infinite() {
        if value > 0.0 { "Infinity" } else { "-Infinity" }.to_owned()
    } else if value == 0.0 {
        "0".to_owned()
    } else if value == value.trunc() && value.abs() < 1e21 {
        format!("{value:.0}")
    } else {
        format!("{value}")
    }
}
