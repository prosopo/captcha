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

//! JavaScript `Math` semantics, so the pixel maths rounds exactly as V8 does.
//!
//! `exp` and `pow` are V8's own fdlibm port (see `fdlibm.rs`); the rest are
//! the builtins' semantics where they differ from Rust's (`Math.round` ties,
//! `Math.max`/`Math.min` NaN and signed-zero handling, `Math.hypot`).

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

pub(crate) use crate::fdlibm::exp;

/// `Math.pow` as V8 13.6 (Node 24) computes it: JS's `NaN` cases, `x * x` for a square, and
/// otherwise the system libm `pow`, which is also what `f64::powf` calls. The Rust image
/// must therefore use the same glibc as the Node one (see MIGRATION-LOG.md, Node 24).
pub(crate) fn pow(x: f64, y: f64) -> f64 {
    if y.is_nan() || (y.is_infinite() && x.abs() == 1.0) {
        return f64::NAN;
    }
    if y == 2.0 {
        return x * x;
    }
    x.powf(y)
}

/// V8's `Math.hypot`: normalise by the largest magnitude, then a Kahan sum.
/// Not the C `hypot`, which rounds differently.
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
