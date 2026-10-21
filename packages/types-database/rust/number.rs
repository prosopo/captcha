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

//! A JS number as js-bson 7 serialises it.

use bson::{Bson, Decimal128, Document};
use serde::Serialize;

/// An int32 for a safe integer in the int32 range other than `-0`, otherwise a double
/// (`serializeNumber` in js-bson 7.3).
pub fn js_number(value: f64) -> Bson {
    let negative_zero: bool = value == 0.0 && value.is_sign_negative();
    let int32: bool = value.fract() == 0.0 && value >= f64::from(i32::MIN) && value <= f64::from(i32::MAX);
    if int32 && !negative_zero {
        Bson::Int32(value as i32)
    } else {
        Bson::Double(value)
    }
}

/// The number a BSON numeric value holds, as JS reads it.
pub fn as_js_number(value: &Bson) -> Option<f64> {
    match value {
        Bson::Int32(n) => Some(f64::from(*n)),
        Bson::Int64(n) => Some(*n as f64),
        Bson::Double(n) => Some(*n),
        _ => None,
    }
}

/// `Decimal128.fromString` of an integer: the coefficient with exponent 0.
pub fn decimal128_from_integer(value: i128) -> Decimal128 {
    const EXPONENT_BIAS: u128 = 6176;
    const SIGN: u128 = 1 << 127;
    let magnitude: u128 = value.unsigned_abs();
    let sign: u128 = if value < 0 { SIGN } else { 0 };
    Decimal128::from_bytes((sign | (EXPONENT_BIAS << 113) | magnitude).to_le_bytes())
}

/// A value as the mongodb driver serialises it: through bson's raw serializer, which is not
/// human readable, so a `JsNumber` keeps `-0` a double as js-bson does. `bson::serialize_to_document`
/// reports itself human readable and so writes `-0` as JSON would, as int32 `0`; build documents
/// for the database with this instead.
pub fn to_bson_document<T: Serialize>(value: &T) -> bson::error::Result<Document> {
    Ok(Document::try_from(bson::serialize_to_raw_document_buf(value)?)?)
}

/// A JSON value as a JS object literal holds it, in BSON: every number a JS number.
pub fn json_to_bson(value: &serde_json::Value) -> Bson {
    match value {
        serde_json::Value::Null => Bson::Null,
        serde_json::Value::Bool(flag) => Bson::Boolean(*flag),
        serde_json::Value::Number(number) => js_number(number.as_f64().unwrap_or(f64::NAN)),
        serde_json::Value::String(text) => Bson::String(text.clone()),
        serde_json::Value::Array(items) => Bson::Array(items.iter().map(json_to_bson).collect()),
        serde_json::Value::Object(entries) => {
            Bson::Document(entries.iter().map(|(key, entry)| (key.clone(), json_to_bson(entry))).collect())
        }
    }
}
