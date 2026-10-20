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

//! RFC 9421 §2.3 signature base for the components the Web Bot Auth profile
//! covers (`@authority`, `signature-agent`).

use std::fmt;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SignatureBaseInput {
    /// The request authority (host and optional port), lowercased.
    pub authority: String,
    /// The `Signature-Agent` header exactly as received, quotes intact.
    pub signature_agent: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UnsupportedCoveredComponent(pub String);

impl fmt::Display for UnsupportedCoveredComponent {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "unsupported covered component \"{}\" for Web Bot Auth",
            self.0
        )
    }
}

impl std::error::Error for UnsupportedCoveredComponent {}

pub fn build_signature_base<S: AsRef<str>>(
    covered_components: &[S],
    values: &SignatureBaseInput,
    signature_params_serialised: &str,
) -> Result<String, UnsupportedCoveredComponent> {
    let mut lines: Vec<String> = Vec::with_capacity(covered_components.len() + 1);
    for component in covered_components {
        match component.as_ref() {
            "@authority" => lines.push(format!("\"@authority\": {}", values.authority)),
            "signature-agent" => {
                lines.push(format!("\"signature-agent\": {}", values.signature_agent))
            }
            other => return Err(UnsupportedCoveredComponent(other.to_string())),
        }
    }
    lines.push(format!(
        "\"@signature-params\": {signature_params_serialised}"
    ));
    Ok(lines.join("\n"))
}
