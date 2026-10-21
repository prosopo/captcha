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

//! Replays rust/equivalence/vectors.json, written by generate.ts from the TS token codec:
//! every encoded token must be byte-identical, and every decode must give the same output
//! (as JSON) or fail the same way.

use crate::{
    decode_procaptcha_output, encode_procaptcha_output, ProcaptchaOutput, TokenDecodeError,
};
use serde::Deserialize;

const VECTORS: &str = include_str!("equivalence/vectors.json");

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Vectors {
    encode: Vec<EncodeVector>,
    decode: Vec<DecodeVector>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct EncodeVector {
    output: ProcaptchaOutput,
    token: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
enum DecodeError {
    Malformed,
    Schema,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum DecodeResult {
    Ok { ok: String },
    Error { error: DecodeError },
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct DecodeVector {
    token: String,
    result: DecodeResult,
}

fn vectors() -> Vectors {
    serde_json::from_str(VECTORS).expect("vectors.json parses")
}

#[test]
fn encoded_tokens_are_byte_identical() {
    let vectors: Vectors = vectors();
    assert!(vectors.encode.len() > 300);
    for vector in &vectors.encode {
        assert_eq!(
            encode_procaptcha_output(&vector.output),
            vector.token,
            "{:?}",
            vector.output
        );
    }
}

#[test]
fn decoding_matches_the_ts() {
    let vectors: Vectors = vectors();
    let (mut ok, mut malformed, mut schema): (usize, usize, usize) = (0, 0, 0);
    for vector in &vectors.decode {
        let token: &str = &vector.token;
        match (decode_procaptcha_output(token), &vector.result) {
            (Ok(output), DecodeResult::Ok { ok: expected }) => {
                ok += 1;
                assert_eq!(
                    serde_json::to_string(&output).expect("output serialises"),
                    *expected,
                    "{token}"
                );
            }
            (
                Err(TokenDecodeError::Malformed),
                DecodeResult::Error {
                    error: DecodeError::Malformed,
                },
            ) => malformed += 1,
            (
                Err(TokenDecodeError::UnknownCaptchaType(_)),
                DecodeResult::Error {
                    error: DecodeError::Schema,
                },
            ) => schema += 1,
            (actual, expected) => panic!("{token}: got {actual:?}, TS gave {expected:?}"),
        }
    }
    assert!(
        ok > 1000 && malformed > 500 && schema > 10,
        "{ok} {malformed} {schema}"
    );
}
