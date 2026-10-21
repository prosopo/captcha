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

//! A JS `number` in a typed record.

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::fmt;

/// A JS number. It serialises the way js-bson stores one: an integer in the int32 range as
/// an int32 (so `-0` as `0`) and anything else as a double. In JSON that also gives JS's
/// `4` rather than `4.0`.
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Default)]
pub struct JsNumber(pub f64);

impl JsNumber {
    pub fn get(self) -> f64 {
        self.0
    }

    fn as_int32(self) -> Option<i32> {
        let value: f64 = self.0;
        let in_range: bool = value >= f64::from(i32::MIN) && value <= f64::from(i32::MAX);
        (value.fract() == 0.0 && in_range).then_some(value as i32)
    }
}

impl From<f64> for JsNumber {
    fn from(value: f64) -> JsNumber {
        JsNumber(value)
    }
}

impl From<i32> for JsNumber {
    fn from(value: i32) -> JsNumber {
        JsNumber(f64::from(value))
    }
}

impl fmt::Display for JsNumber {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// As `JSON.stringify` writes the number, or, for BSON (a serializer that is not human
/// readable), as js-bson does, which keeps `-0` a double.
impl Serialize for JsNumber {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let negative_zero: bool = self.0 == 0.0 && self.0.is_sign_negative();
        if negative_zero && !serializer.is_human_readable() {
            return serializer.serialize_f64(self.0);
        }
        match self.as_int32() {
            Some(value) => serializer.serialize_i32(value),
            None => serializer.serialize_f64(self.0),
        }
    }
}

impl<'de> Deserialize<'de> for JsNumber {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<JsNumber, D::Error> {
        f64::deserialize(deserializer).map(JsNumber)
    }
}

/// `Math.round`: halves round towards +∞, so `-2.5` gives `-2`. `x - floor(x)` is exact, so
/// this has no double-rounding trouble at `0.49999999999999994`.
pub fn js_math_round(value: f64) -> f64 {
    if !value.is_finite() {
        return value;
    }
    let floor: f64 = value.floor();
    if value - floor >= 0.5 {
        floor + 1.0
    } else {
        floor
    }
}
