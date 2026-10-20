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

// Ported from src/tests/signatureBase.test.ts

use crate::signature_base::{build_signature_base, SignatureBaseInput};

#[test]
fn builds_the_rfc_9421_base_for_authority_and_signature_agent() {
    let params: &str = "(\"@authority\" \"signature-agent\");created=1735689600;expires=1735693200;keyid=\"abc\";alg=\"ed25519\";tag=\"web-bot-auth\"";
    let base: String = build_signature_base(
        &["@authority", "signature-agent"],
        &SignatureBaseInput {
            authority: "example.com".into(),
            signature_agent: "\"https://chatgpt.com\"".into(),
        },
        params,
    )
    .expect("base");
    assert_eq!(
        base,
        [
            "\"@authority\": example.com".to_string(),
            "\"signature-agent\": \"https://chatgpt.com\"".to_string(),
            format!("\"@signature-params\": {params}"),
        ]
        .join("\n")
    );
}

#[test]
fn preserves_the_covered_component_order_the_signer_chose() {
    let base: String = build_signature_base(
        &["signature-agent", "@authority"],
        &SignatureBaseInput {
            authority: "example.com".into(),
            signature_agent: "g=\"https://agent.bot.goog\"".into(),
        },
        "(\"signature-agent\" \"@authority\");keyid=\"k\"",
    )
    .expect("base");
    assert_eq!(
        base.split('\n').next(),
        Some("\"signature-agent\": g=\"https://agent.bot.goog\"")
    );
}

#[test]
fn errors_on_an_unsupported_covered_component() {
    let err = build_signature_base(
        &["@method"],
        &SignatureBaseInput {
            authority: "example.com".into(),
            signature_agent: "\"\"".into(),
        },
        "()",
    )
    .expect_err("unsupported");
    assert!(err.to_string().contains("unsupported covered component"));
}
