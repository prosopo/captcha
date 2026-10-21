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

//! The JS `Math` and `Number#toString` behaviour the SVG markup and the layout
//! depend on. `round`, `max` and `hypot` are copies of the crate-private ones
//! in prosopo-puzzle-assets (`rust/jsmath.rs`).

/// `Math.round`: half-way cases go towards +infinity.
pub(crate) fn round(x: f64) -> f64 {
    let up = x.ceil();
    if up - 0.5 <= x {
        up
    } else {
        up - 1.0
    }
}

/// `Math.max` of two numbers: NaN wins, and +0 beats -0.
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

/// `Math.hypot` of two numbers, with V8's scaling and Kahan summation, which
/// is not always the correctly rounded result `f64::hypot` gives.
pub(crate) fn hypot(a: f64, b: f64) -> f64 {
    let values = [a, b];
    let mut max = 0.0_f64;
    let mut any_nan = false;
    let mut abs = [0.0_f64; 2];
    for (slot, value) in abs.iter_mut().zip(values) {
        if value.is_nan() {
            any_nan = true;
        } else {
            *slot = value.abs();
            if *slot > max {
                max = *slot;
            }
        }
    }
    if max == f64::INFINITY {
        return f64::INFINITY;
    }
    if any_nan {
        return f64::NAN;
    }
    if max == 0.0 {
        return 0.0;
    }
    let mut sum = 0.0_f64;
    let mut compensation = 0.0_f64;
    for value in abs {
        let n = value / max;
        let summand = n * n - compensation;
        let preliminary = sum + summand;
        compensation = (preliminary - sum) - summand;
        sum = preliminary;
    }
    sum.sqrt() * max
}

/// `String(x)` for a number (ECMA-262 Number::toString, radix 10).
pub(crate) fn to_js_string(x: f64) -> String {
    if x.is_nan() {
        return "NaN".to_owned();
    }
    if x == 0.0 {
        return "0".to_owned();
    }
    if x.is_infinite() {
        return if x > 0.0 { "Infinity" } else { "-Infinity" }.to_owned();
    }
    let sign = if x < 0.0 { "-" } else { "" };
    // `{:e}` prints the shortest digits that round-trip, as JS does.
    let scientific = format!("{:e}", x.abs());
    let (mantissa, exponent) = scientific
        .split_once('e')
        .expect("LowerExp always has an exponent");
    let digits: String = mantissa.chars().filter(|c| *c != '.').collect();
    let k = digits.len() as i32;
    let n = exponent.parse::<i32>().expect("integer exponent") + 1;
    let body = if k <= n && n <= 21 {
        format!("{digits}{}", "0".repeat((n - k) as usize))
    } else if 0 < n && n <= 21 {
        let (int, frac) = digits.split_at(n as usize);
        format!("{int}.{frac}")
    } else if -6 < n && n <= 0 {
        format!("0.{}{digits}", "0".repeat((-n) as usize))
    } else {
        let (first, rest) = digits.split_at(1);
        let fraction = if rest.is_empty() {
            String::new()
        } else {
            format!(".{rest}")
        };
        let exp_sign = if n - 1 < 0 { '-' } else { '+' };
        format!("{first}{fraction}e{exp_sign}{}", (n - 1).abs())
    };
    format!("{sign}{body}")
}

pub(crate) use crate::fdlibm::{cos, sin};
