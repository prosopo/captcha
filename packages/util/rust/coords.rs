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

use serde_json::Value;

use crate::error::UtilError;
use crate::js::{is_integer, number_to_string};

/// Upper bound for pixel coordinates persisted to captcha records.
pub const MAX_PIXEL_COORD: f64 = 1_000_000.0;

pub fn is_valid_coord_scalar(v: f64) -> bool {
    is_integer(v) && (0.0..=MAX_PIXEL_COORD).contains(&v)
}

fn invalid_scalar(label: &str, i: usize, j: usize, k: usize, shown: &str) -> UtilError {
    UtilError::new(format!(
        "{label}[{i}][{j}][{k}] is not a finite non-negative integer ≤ {}: {shown}",
        number_to_string(MAX_PIXEL_COORD)
    ))
}

/// `assertCoordsSafe` for coords that are already numbers.
pub fn assert_coords_safe(coords: &[Vec<Vec<f64>>], label: &str) -> Result<(), UtilError> {
    for (i, stroke) in coords.iter().enumerate() {
        for (j, point) in stroke.iter().enumerate() {
            for (k, v) in point.iter().enumerate() {
                if !is_valid_coord_scalar(*v) {
                    return Err(invalid_scalar(label, i, j, k, &number_to_string(*v)));
                }
            }
        }
    }
    Ok(())
}

fn type_of(value: &Value) -> &'static str {
    match value {
        Value::Null | Value::Array(_) | Value::Object(_) => "object",
        Value::Bool(_) => "boolean",
        Value::Number(_) => "number",
        Value::String(_) => "string",
    }
}

/// `String(value)` for a JSON value.
fn js_string(value: &Value) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => number_to_string(n.as_f64().unwrap_or(f64::NAN)),
        Value::String(s) => s.clone(),
        Value::Array(items) => items
            .iter()
            .map(|item| match item {
                Value::Null => String::new(),
                other => js_string(other),
            })
            .collect::<Vec<String>>()
            .join(","),
        Value::Object(_) => "[object Object]".to_string(),
    }
}

/// `assertCoordsSafe` for an untrusted JSON value: checks the
/// `[[[number]]]` shape as well as each scalar. `null`/absent is allowed.
pub fn assert_coords_safe_value(coords: Option<&Value>, label: &str) -> Result<(), UtilError> {
    let Some(coords) = coords.filter(|c| !c.is_null()) else {
        return Ok(());
    };
    let Value::Array(strokes) = coords else {
        return Err(UtilError::new(format!(
            "{label} must be an array, got {}",
            type_of(coords)
        )));
    };
    for (i, stroke) in strokes.iter().enumerate() {
        let Value::Array(points) = stroke else {
            return Err(UtilError::new(format!(
                "{label}[{i}] must be an array of points"
            )));
        };
        for (j, point) in points.iter().enumerate() {
            let Value::Array(scalars) = point else {
                return Err(UtilError::new(format!(
                    "{label}[{i}][{j}] must be a [number, number] pair"
                )));
            };
            for (k, v) in scalars.iter().enumerate() {
                let valid = v.as_f64().is_some_and(is_valid_coord_scalar);
                if !valid {
                    return Err(invalid_scalar(label, i, j, k, &js_string(v)));
                }
            }
        }
    }
    Ok(())
}

/// `safeCoordsOrUndefined`: the coords if safe, else `None`. `null` passes through.
pub fn safe_coords_or_undefined_value(coords: Option<&Value>) -> Option<&Value> {
    assert_coords_safe_value(coords, "coords").ok().and(coords)
}

/// `safeCoordsOrUndefined` for coords that are already numbers.
pub fn safe_coords_or_undefined(coords: &[Vec<Vec<f64>>]) -> Option<&[Vec<Vec<f64>>]> {
    assert_coords_safe(coords, "coords").ok().map(|_| coords)
}

#[cfg(test)]
mod tests {
    // Ported from src/tests/coords.unit.test.ts
    use super::*;
    use serde_json::json;

    fn value_err(coords: &Value) -> String {
        assert_coords_safe_value(Some(coords), "coords")
            .unwrap_err()
            .message()
            .to_string()
    }

    fn typed_err(coords: &[Vec<Vec<f64>>]) -> String {
        assert_coords_safe(coords, "coords")
            .unwrap_err()
            .message()
            .to_string()
    }

    #[test]
    fn accepts_undefined_and_null() {
        assert!(assert_coords_safe_value(None, "coords").is_ok());
        assert!(assert_coords_safe_value(Some(&Value::Null), "coords").is_ok());
    }

    #[test]
    fn accepts_a_normal_single_stroke_single_point_shape() {
        assert!(assert_coords_safe_value(Some(&json!([[[90, 270]]])), "coords").is_ok());
        assert!(assert_coords_safe(&[vec![vec![90.0, 270.0]]], "coords").is_ok());
    }

    #[test]
    fn accepts_the_empty_outer_array() {
        assert!(assert_coords_safe_value(Some(&json!([])), "coords").is_ok());
        assert!(assert_coords_safe(&[], "coords").is_ok());
    }

    #[test]
    fn rejects_nan() {
        assert!(typed_err(&[vec![vec![f64::NAN, 270.0]]]).contains("finite non-negative integer"));
    }

    #[test]
    fn rejects_infinities() {
        assert!(
            typed_err(&[vec![vec![f64::INFINITY, 0.0]]]).contains("finite non-negative integer")
        );
        assert!(typed_err(&[vec![vec![0.0, f64::NEG_INFINITY]]])
            .contains("finite non-negative integer"));
    }

    #[test]
    fn rejects_values_above_max_safe_integer() {
        assert!(value_err(&json!([[[9_007_199_254_740_992_u64, 0]]]))
            .contains("finite non-negative integer"));
        assert!(value_err(&json!([[[0, 18_014_398_509_481_982_u64]]]))
            .contains("finite non-negative integer"));
    }

    #[test]
    fn rejects_negative_integers() {
        assert!(value_err(&json!([[[-1, 0]]])).contains("finite non-negative integer"));
    }

    #[test]
    fn rejects_non_integer_numbers() {
        assert!(value_err(&json!([[[1.5, 0]]])).contains("finite non-negative integer"));
    }

    #[test]
    fn rejects_values_above_max_pixel_coord() {
        assert!(value_err(&json!([[[1_000_001, 0]]])).contains("finite non-negative integer"));
    }

    #[test]
    fn rejects_non_array_members_in_the_nested_shape() {
        assert!(value_err(&json!("not an array")).contains("must be an array"));
        assert!(value_err(&json!(["stroke"])).contains("must be an array of points"));
        assert!(value_err(&json!([["point"]])).contains("must be a [number, number] pair"));
    }

    #[test]
    fn safe_coords_returns_coords_when_safe() {
        let c = json!([[[10, 20]]]);
        assert_eq!(safe_coords_or_undefined_value(Some(&c)), Some(&c));
        let typed: Vec<Vec<Vec<f64>>> = vec![vec![vec![10.0, 20.0]]];
        assert_eq!(safe_coords_or_undefined(&typed), Some(typed.as_slice()));
    }

    #[test]
    fn safe_coords_returns_undefined_when_not_safe() {
        assert_eq!(safe_coords_or_undefined(&[vec![vec![f64::NAN, 0.0]]]), None);
        assert_eq!(
            safe_coords_or_undefined_value(Some(&json!("not coords"))),
            None
        );
    }

    #[test]
    fn safe_coords_passes_undefined_and_null_through() {
        assert_eq!(safe_coords_or_undefined_value(None), None);
        assert_eq!(
            safe_coords_or_undefined_value(Some(&Value::Null)),
            Some(&Value::Null)
        );
    }
}
