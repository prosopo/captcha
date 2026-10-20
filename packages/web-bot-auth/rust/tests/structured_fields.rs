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

// Ported from src/tests/structuredFields.test.ts

use crate::structured_fields::{parse_signature, parse_signature_input, ParamValue};

#[test]
fn parses_a_web_bot_auth_signature_input_header() {
    let header: &str = "sig1=(\"@authority\" \"signature-agent\");created=1735689600;expires=1735693200;keyid=\"abc\";alg=\"ed25519\";tag=\"web-bot-auth\"";
    let entry = parse_signature_input(header).expect("entry");
    assert_eq!(entry.label, "sig1");
    assert_eq!(
        entry.covered_components,
        vec!["@authority", "signature-agent"]
    );
    assert_eq!(
        entry.params.get("created"),
        Some(&ParamValue::Number(1735689600.0))
    );
    assert_eq!(
        entry.params.get("expires"),
        Some(&ParamValue::Number(1735693200.0))
    );
    assert_eq!(
        entry.params.get("keyid"),
        Some(&ParamValue::String("abc".into()))
    );
    assert_eq!(
        entry.params.get("alg"),
        Some(&ParamValue::String("ed25519".into()))
    );
    assert_eq!(
        entry.params.get("tag"),
        Some(&ParamValue::String("web-bot-auth".into()))
    );
    assert_eq!(
        entry.serialised_value,
        "(\"@authority\" \"signature-agent\");created=1735689600;expires=1735693200;keyid=\"abc\";alg=\"ed25519\";tag=\"web-bot-auth\""
    );
}

#[test]
fn returns_none_on_a_header_with_no_equals() {
    assert_eq!(parse_signature_input("garbage"), None);
}

#[test]
fn returns_none_when_the_value_is_not_an_inner_list() {
    assert_eq!(parse_signature_input("sig1=\"not-a-list\""), None);
}

#[test]
fn tolerates_unquoted_alg_tokens() {
    let entry =
        parse_signature_input("sig1=(\"@authority\");keyid=\"k\";alg=ed25519").expect("entry");
    assert_eq!(
        entry.params.get("alg"),
        Some(&ParamValue::String("ed25519".into()))
    );
}

#[test]
fn handles_an_empty_inner_list() {
    let entry = parse_signature_input("sig1=();keyid=\"k\"").expect("entry");
    assert!(entry.covered_components.is_empty());
}

#[test]
fn decodes_the_base64_byte_sequence_for_the_matching_label() {
    assert_eq!(parse_signature("sig1=:AQID:", "sig1"), Some(vec![1, 2, 3]));
}

#[test]
fn returns_none_when_the_label_does_not_match() {
    assert_eq!(parse_signature("sig1=:AQID:", "sig2"), None);
}

#[test]
fn returns_none_when_the_value_is_not_wrapped_in_colons() {
    assert_eq!(parse_signature("sig1=\"AQID\"", "sig1"), None);
}

#[test]
fn returns_none_on_invalid_base64() {
    assert_eq!(parse_signature("sig1=:not_valid_base64!!!:", "sig1"), None);
}
