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

use crate::at::{at, resolve_at_index};
use crate::error::UtilError;
use crate::js::{is_safe_integer, number_to_string, parse_int, round};

const MAX_BYTE: usize = 0xff;

fn push_hex(bytes: &[u8], out: &mut String) {
    for byte in bytes {
        out.push_str(&format!("{byte:02x}"));
    }
}

/// `u8aToHex(value)`: `0x`-prefixed lowercase hex, `0x` for an empty input.
pub fn u8a_to_hex(value: &[u8]) -> String {
    u8a_to_hex_with(value, -1, true)
}

/// `u8aToHex(value, bitLength, isPrefixed)`. A positive `bit_length` shorter
/// than the input elides the middle with `…`.
pub fn u8a_to_hex_with(value: &[u8], bit_length: i64, is_prefixed: bool) -> String {
    let mut result = String::from(if is_prefixed { "0x" } else { "" });
    if value.is_empty() {
        return result;
    }
    if bit_length > 0 {
        let length = bit_length.div_euclid(8) + i64::from(bit_length % 8 != 0);
        if value.len() as i64 > length {
            // `subarray` truncates the fractional `length / 2` bounds.
            let head = (length / 2) as usize;
            let tail_start = value.len() - (length as usize).div_ceil(2);
            push_hex(&value[..head], &mut result);
            result.push('…');
            push_hex(&value[tail_start..], &mut result);
            return result;
        }
    }
    push_hex(value, &mut result);
    result
}

fn strip_0x(s: &str) -> &str {
    s.strip_prefix("0x").unwrap_or(s)
}

fn to_byte_hex(n: usize) -> String {
    format!("{n:02x}")
}

/// `embedData`: writes `data` into `hex_string` as a count byte, a
/// position/length byte pair per value, and the values' hex digits packed
/// backwards from the end (or from index 255 on longer strings).
pub fn embed_data(hex_string: &str, data: &[f64]) -> Result<String, UtilError> {
    let mut hex: Vec<u16> = strip_0x(hex_string).encode_utf16().collect();

    if data.len() > MAX_BYTE {
        return Err(UtilError::new(format!(
            "embedData: count {} exceeds the maximum of {MAX_BYTE}",
            data.len()
        )));
    }
    let mut values: Vec<String> = Vec::with_capacity(data.len());
    for d in data {
        let rounded = round(*d);
        if !is_safe_integer(rounded) || rounded < 0.0 {
            return Err(UtilError::new(format!(
                "embedData: {} is not a non-negative number",
                number_to_string(*d)
            )));
        }
        values.push(format!("{:x}", rounded as u64));
    }

    let usable_length = hex.len().min(MAX_BYTE + 1);
    let total_length = 2 + 4 * values.len() + values.iter().map(String::len).sum::<usize>();
    if total_length > usable_length {
        return Err(UtilError::new(format!(
            "Hex data length {total_length} exceeds length of hex string {usable_length}"
        )));
    }

    let mut header = to_byte_hex(values.len());
    let mut cursor_end = usable_length;
    for value in &values {
        cursor_end -= value.len();
        for (offset, unit) in value.encode_utf16().enumerate() {
            hex[cursor_end + offset] = unit;
        }
        header.push_str(&to_byte_hex(cursor_end));
        header.push_str(&to_byte_hex(value.len()));
    }
    for (offset, unit) in header.encode_utf16().enumerate() {
        hex[offset] = unit;
    }

    Ok(format!("0x{}", String::from_utf16_lossy(&hex)))
}

fn assert_extracted(n: f64, label: &str) -> Result<(), UtilError> {
    if !is_safe_integer(n) || n < 0.0 {
        return Err(UtilError::new(format!(
            "extractData: {label} parsed to invalid value {}",
            number_to_string(n)
        )));
    }
    Ok(())
}

/// The string `at(hex, cursor) + hex[cursor + 1]` builds: `at` wraps the
/// first index, and a missing second char concatenates as `"undefined"`.
fn byte_at(hex: &[u16], cursor: usize) -> Result<f64, UtilError> {
    let first = resolve_at_index(hex.len(), cursor as f64, false)?;
    let mut text = String::from_utf16_lossy(&hex[first..=first]);
    match hex.get(cursor + 1) {
        Some(unit) => text.push_str(&String::from_utf16_lossy(std::slice::from_ref(unit))),
        None => text.push_str("undefined"),
    }
    Ok(parse_int(&text, 16))
}

/// `extractData`: the inverse of [`embed_data`].
pub fn extract_data(hex_string: &str) -> Result<Vec<f64>, UtilError> {
    let hex: Vec<u16> = strip_0x(hex_string).encode_utf16().collect();
    let mut cursor = 0;

    let count = byte_at(&hex, cursor)?;
    assert_extracted(count, "count")?;
    cursor += 2;

    let count = count as usize;
    let mut positions: Vec<usize> = Vec::with_capacity(count);
    let mut lengths: Vec<usize> = Vec::with_capacity(count);
    for i in 0..count {
        let pos = byte_at(&hex, cursor)?;
        let len = byte_at(&hex, cursor + 2)?;
        assert_extracted(pos, &format!("positions[{i}]"))?;
        assert_extracted(len, &format!("lengths[{i}]"))?;
        positions.push(pos as usize);
        lengths.push(len as usize);
        cursor += 4;
    }

    let mut results: Vec<f64> = Vec::with_capacity(count);
    for i in 0..count {
        let start = *at(&positions, i as i64, Default::default())?;
        let len = *at(&lengths, i as i64, Default::default())?;
        let from = start.min(hex.len());
        let to = (start + len).min(hex.len());
        let value = parse_int(&String::from_utf16_lossy(&hex[from..to]), 16);
        assert_extracted(value, &format!("values[{i}]"))?;
        results.push(value);
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    // Ported from src/tests/hex.unit.test.ts
    use super::*;

    const HEX: &str = "0x0101010101010101010101010101010101010101010101010101010101010101";

    fn embed_err(hex: &str, data: &[f64]) -> String {
        embed_data(hex, data).unwrap_err().message().to_string()
    }

    fn extract_err(hex: &str) -> String {
        extract_data(hex).unwrap_err().message().to_string()
    }

    fn caller_sized_salt(data: &[f64]) -> String {
        let bytes: usize = data
            .iter()
            .map(|d| format!("{:x}", *d as u64).len() + 4)
            .sum();
        format!("0x{}", "ab".repeat(bytes))
    }

    #[test]
    fn embed_returns_zero_count_if_the_array_is_empty() {
        assert_eq!(
            embed_data(HEX, &[]).unwrap(),
            "0x0001010101010101010101010101010101010101010101010101010101010101"
        );
    }

    #[test]
    fn embed_replaces_data_at_the_start_and_end_1() {
        assert_eq!(
            embed_data(HEX, &[1020.0, 345.0]).unwrap(),
            "0x023d033a030101010101010101010101010101010101010101010101011593fc"
        );
    }

    #[test]
    fn embed_replaces_data_at_the_start_and_end_2() {
        assert_eq!(
            embed_data(HEX, &[1.0, 3.0]).unwrap(),
            "0x023f013e01010101010101010101010101010101010101010101010101010131"
        );
    }

    #[test]
    fn embed_replaces_data_at_the_start_and_end_3() {
        assert_eq!(
            embed_data(HEX, &[9999.0, 9999.0]).unwrap(),
            "0x023c0438040101010101010101010101010101010101010101010101270f270f"
        );
    }

    #[test]
    fn embed_replaces_data_at_the_start_and_end_4() {
        assert_eq!(
            embed_data(HEX, &[99999.0, 99999.0]).unwrap(),
            "0x023b053605010101010101010101010101010101010101010101011869f1869f"
        );
    }

    #[test]
    fn embed_throws_on_too_short_a_hex_string_1() {
        let data: [f64; 14] = [
            345.0, 678.0, 213.0, 1020.0, 453.0, 234.0, 678.0, 234.0, 234.0, 354.0, 345.0, 678.0,
            213.0, 1020.0,
        ];
        assert!(embed_err(HEX, &data).contains("exceeds length of hex string"));
    }

    #[test]
    fn embed_throws_on_too_short_a_hex_string_2() {
        let data: [f64; 28] = [
            345.0, 678.0, 213.0, 1020.0, 453.0, 234.0, 678.0, 234.0, 234.0, 354.0, 345.0, 678.0,
            213.0, 1020.0, 345.0, 678.0, 213.0, 1020.0, 453.0, 234.0, 678.0, 234.0, 234.0, 354.0,
            345.0, 678.0, 213.0, 1020.0,
        ];
        assert!(embed_err(HEX, &data).contains("exceeds length of hex string"));
    }

    #[test]
    fn round_trip_keeps_every_value_when_the_salt_is_longer_than_256_hex_chars() {
        let coords: Vec<f64> = (0..20).map(|i| f64::from(300 + i * 37)).collect();
        let salt = caller_sized_salt(&coords);
        assert!(salt.len() - 2 > 256);
        assert_eq!(
            extract_data(&embed_data(&salt, &coords).unwrap()).unwrap(),
            coords
        );
    }

    #[test]
    fn round_trip_keeps_every_value_for_every_count_that_fits_below_index_256() {
        for count in 1..=36 {
            let coords: Vec<f64> = (0..count).map(|i| f64::from(4000 + i)).collect();
            let salt = caller_sized_salt(&coords);
            assert_eq!(
                extract_data(&embed_data(&salt, &coords).unwrap()).unwrap(),
                coords
            );
        }
    }

    #[test]
    fn round_trip_throws_instead_of_truncating_once_positions_pass_255() {
        let coords: Vec<f64> = (0..37).map(|i| f64::from(4000 + i)).collect();
        assert!(embed_err(&caller_sized_salt(&coords), &coords)
            .contains("exceeds length of hex string"));
    }

    #[test]
    fn round_trip_throws_when_there_are_more_values_than_the_count_byte_can_hold() {
        let coords: Vec<f64> = vec![1.0; 256];
        assert!(embed_err(&caller_sized_salt(&coords), &coords).contains("count"));
    }

    #[test]
    fn round_trip_throws_instead_of_overwriting_the_header_when_the_salt_is_too_short() {
        assert!(embed_err("0x01010101", &[f64::from(0xfff)]).contains("exceeds"));
    }

    #[test]
    fn round_trip_throws_on_values_that_are_negative_or_not_finite() {
        assert!(embed_err(HEX, &[-5.0]).contains("non-negative number"));
        assert!(embed_err(HEX, &[f64::NAN]).contains("non-negative number"));
        assert!(embed_err(HEX, &[f64::INFINITY]).contains("non-negative number"));
    }

    #[test]
    fn round_trip_rounds_fractional_values() {
        let embedded = embed_data(HEX, &[150.5, 30.4, -0.2]).unwrap();
        assert_eq!(extract_data(&embedded).unwrap(), vec![151.0, 30.0, 0.0]);
    }

    #[test]
    fn extract_returns_empty_array_if_no_data_is_embedded() {
        assert_eq!(
            extract_data(&embed_data(HEX, &[]).unwrap()).unwrap(),
            Vec::<f64>::new()
        );
    }

    #[test]
    fn extract_from_the_start_and_end_of_the_string_1() {
        let data: [f64; 2] = [1020.0, 345.0];
        assert_eq!(
            extract_data(&embed_data(HEX, &data).unwrap()).unwrap(),
            data.to_vec()
        );
    }

    #[test]
    fn extract_from_the_start_and_end_of_the_string_2() {
        let data: [f64; 2] = [1.0, 3.0];
        assert_eq!(
            extract_data(&embed_data(HEX, &data).unwrap()).unwrap(),
            data.to_vec()
        );
    }

    #[test]
    fn extract_from_the_start_and_end_of_the_string_3() {
        let data: [f64; 2] = [9999.0, 9999.0];
        assert_eq!(
            extract_data(&embed_data(HEX, &data).unwrap()).unwrap(),
            data.to_vec()
        );
    }

    #[test]
    fn extract_from_the_start_and_end_of_the_string_4() {
        let data: [f64; 2] = [99999.0, 99999.0];
        assert_eq!(
            extract_data(&embed_data(HEX, &data).unwrap()).unwrap(),
            data.to_vec()
        );
    }

    #[test]
    fn extract_throws_when_a_value_slice_decodes_to_nan() {
        assert!(extract_err("0x010200").contains("invalid value"));
    }

    #[test]
    fn extract_throws_when_the_count_byte_itself_is_non_hex() {
        assert!(extract_err("0xzz").contains("invalid value"));
    }

    #[test]
    fn extract_throws_when_a_value_parses_above_max_safe_integer() {
        assert!(extract_err(&format!("0x010610{}", "f".repeat(16))).contains("invalid value"));
    }

    #[test]
    fn u8a_to_hex_matches_polkadot() {
        assert_eq!(u8a_to_hex(&[0x68, 0x65, 0x6c, 0x0f]), "0x68656c0f");
        assert_eq!(u8a_to_hex(&[]), "0x");
        assert_eq!(u8a_to_hex_with(&[], -1, false), "");
        assert_eq!(u8a_to_hex_with(&[1, 2, 3, 4, 5], 24, true), "0x01…0405");
    }
}
