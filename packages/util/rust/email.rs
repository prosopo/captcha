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

use crate::js::trim;

/// The lowercased domain of an email address (the part after the last `@`),
/// or the input itself if it has no `@`. `None` when nothing is left.
pub fn extract_domain_from_email(email_or_domain: &str) -> Option<String> {
    let trimmed = trim(email_or_domain);
    if trimmed.is_empty() {
        return None;
    }
    let domain = trimmed.rsplit('@').next().unwrap_or("");
    let lower = domain.to_lowercase();
    let normalized = trim(&lower);
    if normalized.is_empty() {
        None
    } else {
        Some(normalized.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_the_documented_forms() {
        assert_eq!(
            extract_domain_from_email("user@domain.com").as_deref(),
            Some("domain.com")
        );
        assert_eq!(
            extract_domain_from_email("@domain.com").as_deref(),
            Some("domain.com")
        );
        assert_eq!(
            extract_domain_from_email("user@sub@domain.com").as_deref(),
            Some("domain.com")
        );
        assert_eq!(
            extract_domain_from_email("domain.com").as_deref(),
            Some("domain.com")
        );
        assert_eq!(extract_domain_from_email("  "), None);
        assert_eq!(extract_domain_from_email("user@"), None);
    }
}
