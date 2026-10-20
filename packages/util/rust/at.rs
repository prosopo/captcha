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

use crate::error::UtilError;
use crate::js::number_to_string;

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct AtOptions {
    /// Allow a missing element instead of failing.
    pub optional: bool,
    /// Fail on an out-of-range index instead of wrapping it around.
    pub no_wrap: bool,
}

/// Resolves a JS-number index against a collection of `len` items the way `at`
/// does: out-of-range indices wrap unless `no_wrap` is set.
pub fn resolve_at_index(len: usize, index: f64, no_wrap: bool) -> Result<usize, UtilError> {
    if len == 0 {
        return Err(UtilError::new("Array is empty"));
    }
    if !index.is_finite() {
        return Err(UtilError::new(format!(
            "Index {} is not a finite number",
            number_to_string(index)
        )));
    }
    if index.trunc() != index {
        return Err(UtilError::new(format!(
            "Index {} is not an integer",
            number_to_string(index)
        )));
    }
    let length = len as f64;
    let mut index = index;
    if !no_wrap {
        index = if index > 0.0 {
            index % length
        } else {
            (index.abs() / length).ceil() * length + index
        };
    }
    if index >= length {
        return Err(UtilError::new(format!(
            "Index {} larger than array length {len}",
            number_to_string(index)
        )));
    }
    if index < 0.0 {
        return Err(UtilError::new(format!(
            "Index {} smaller than 0",
            number_to_string(index)
        )));
    }
    Ok(index as usize)
}

fn undefined_element(index: usize) -> UtilError {
    UtilError::new(format!("Element at index {index} is undefined"))
}

pub fn at<T>(items: &[T], index: i64, options: AtOptions) -> Result<&T, UtilError> {
    at_f64(items, index as f64, options)
}

pub fn at_f64<T>(items: &[T], index: f64, options: AtOptions) -> Result<&T, UtilError> {
    let resolved = resolve_at_index(items.len(), index, options.no_wrap)?;
    Ok(&items[resolved])
}

/// `at` over a collection that may contain `undefined` (`None`) elements, or
/// holes in a sparse array. A `None` element fails unless `options.optional`.
pub fn at_optional<T>(
    items: &[Option<T>],
    index: f64,
    options: AtOptions,
) -> Result<Option<&T>, UtilError> {
    let resolved = resolve_at_index(items.len(), index, options.no_wrap)?;
    match &items[resolved] {
        Some(item) => Ok(Some(item)),
        None if options.optional => Ok(None),
        None => Err(undefined_element(resolved)),
    }
}

/// `at` over a string. Like JS, the string is indexed by UTF-16 code unit, so
/// a lone surrogate comes back as U+FFFD.
pub fn at_str(s: &str, index: f64, options: AtOptions) -> Result<String, UtilError> {
    let units: Vec<u16> = s.encode_utf16().collect();
    let resolved = resolve_at_index(units.len(), index, options.no_wrap)?;
    Ok(String::from_utf16_lossy(&units[resolved..=resolved]))
}

#[cfg(test)]
mod tests {
    // Ported from src/tests/at.unit.test.ts
    use super::*;

    const WRAP: AtOptions = AtOptions {
        optional: false,
        no_wrap: false,
    };
    const NO_WRAP: AtOptions = AtOptions {
        optional: false,
        no_wrap: true,
    };
    const OPTIONAL: AtOptions = AtOptions {
        optional: true,
        no_wrap: false,
    };

    #[test]
    fn types() {
        let numbers: [i32; 3] = [1, 2, 3];
        assert_eq!(at(&numbers, 0, WRAP), Ok(&1));
        assert_eq!(
            at_optional(&[Some(1), Some(2), Some(3), None], 0.0, WRAP),
            Ok(Some(&1))
        );
        assert_eq!(at_str("abc", 0.0, WRAP).as_deref(), Ok("a"));
        assert_eq!(at_str("abc", 0.0, OPTIONAL).as_deref(), Ok("a"));
        assert_eq!(at(&numbers, 0, NO_WRAP), Ok(&1));
        let undefineds: [Option<i32>; 3] = [None, None, None];
        assert!(at_optional(&undefineds, 0.0, WRAP)
            .unwrap_err()
            .message()
            .contains("undefined"));
        assert_eq!(at_optional(&undefineds, 0.0, OPTIONAL), Ok(None));
        let strings: [&str; 3] = ["a", "b", "c"];
        assert_eq!(at(&strings, 0, WRAP), Ok(&"a"));
    }

    #[test]
    fn infinite_index() {
        let numbers: [i32; 3] = [1, 2, 3];
        assert!(at_f64(&numbers, f64::INFINITY, WRAP).is_err());
        assert!(at_f64(&numbers, f64::NEG_INFINITY, WRAP).is_err());
        assert!(at_f64(&numbers, f64::NAN, WRAP).is_err());
    }

    #[test]
    fn compatible_with_string() {
        let cases: [(f64, &str); 12] = [
            (0.0, "a"),
            (1.0, "b"),
            (2.0, "c"),
            (3.0, "a"),
            (4.0, "b"),
            (5.0, "c"),
            (-1.0, "c"),
            (-2.0, "b"),
            (-3.0, "a"),
            (-4.0, "c"),
            (-5.0, "b"),
            (-6.0, "a"),
        ];
        for (index, expected) in cases {
            assert_eq!(at_str("abc", index, WRAP).as_deref(), Ok(expected));
        }
    }

    #[test]
    fn empty_string() {
        assert!(at_str("", 0.0, WRAP).is_err());
    }

    #[test]
    fn throw_on_empty_array() {
        let empty: [i32; 0] = [];
        assert!(at(&empty, 0, WRAP).is_err());
    }

    #[test]
    fn throw_on_index_out_of_bounds_high() {
        assert!(at(&[1, 2, 3], 3, NO_WRAP).is_err());
    }

    #[test]
    fn throw_on_index_out_of_bounds_low() {
        assert!(at(&[1, 2, 3], -1, NO_WRAP).is_err());
    }

    #[test]
    fn returns_correct_value() {
        assert_eq!(at(&[1, 2, 3], 0, WRAP), Ok(&1));
        assert_eq!(at(&[1, 2, 3], 1, WRAP), Ok(&2));
        assert_eq!(at(&[1, 2, 3], 2, WRAP), Ok(&3));
    }

    #[test]
    fn wraps_index_high() {
        assert_eq!(at(&[1, 2, 3], 3, WRAP), Ok(&1));
        assert_eq!(at(&[1, 2, 3], 4, WRAP), Ok(&2));
        assert_eq!(at(&[1, 2, 3], 5, WRAP), Ok(&3));
    }

    #[test]
    fn wraps_index_low() {
        assert_eq!(at(&[1, 2, 3], -1, WRAP), Ok(&3));
        assert_eq!(at(&[1, 2, 3], -2, WRAP), Ok(&2));
        assert_eq!(at(&[1, 2, 3], -3, WRAP), Ok(&1));
        assert_eq!(at(&[1, 2, 3], -4, WRAP), Ok(&3));
        assert_eq!(at(&[1, 2, 3], -5, WRAP), Ok(&2));
        assert_eq!(at(&[1, 2, 3], -6, WRAP), Ok(&1));
    }

    #[test]
    fn allow_undefined_in_bounds() {
        let undefineds: [Option<i32>; 3] = [None, None, None];
        for index in [0.0, 1.0, 2.0] {
            assert_eq!(at_optional(&undefineds, index, OPTIONAL), Ok(None));
        }
    }

    #[test]
    fn throw_on_undefined_element_unless_optional() {
        let items: [Option<i32>; 3] = [Some(1), None, Some(3)];
        assert!(at_optional(&items, 1.0, WRAP)
            .unwrap_err()
            .message()
            .contains("undefined"));
        assert!(at_optional(&items, 4.0, WRAP)
            .unwrap_err()
            .message()
            .contains("undefined"));
        assert_eq!(at_optional(&items, 1.0, OPTIONAL), Ok(None));
    }

    #[test]
    fn throw_on_sparse_array_hole_unless_optional() {
        let sparse: [Option<i32>; 3] = [Some(1), None, Some(3)];
        assert!(at_optional(&sparse, 1.0, WRAP)
            .unwrap_err()
            .message()
            .contains("undefined"));
    }

    #[test]
    fn throw_on_non_integer_index() {
        let numbers: [i32; 3] = [1, 2, 3];
        assert!(at_f64(&numbers, 1.5, WRAP)
            .unwrap_err()
            .message()
            .contains("integer"));
        assert!(at_f64(&numbers, -0.5, WRAP)
            .unwrap_err()
            .message()
            .contains("integer"));
        assert!(at_str("abc", 0.5, OPTIONAL)
            .unwrap_err()
            .message()
            .contains("integer"));
    }
}
