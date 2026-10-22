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

//! tasks/spam/evaluateEmailSpamRules.ts: a site's own rules on the emails it is sent.

use prosopo_types::reasons::ResultReason;
use prosopo_types::settings::JsRegex;
use prosopo_types::JsNumber;
use prosopo_util::js_trim;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::{Arc, LazyLock, Mutex};

const GMAIL_DOMAINS: [&str; 2] = ["gmail.com", "googlemail.com"];

/// A site's `emailRules` as the check reads them: any field may be absent.
#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmailSpamRulesView {
    #[serde(default)]
    pub enabled: Option<bool>,
    #[serde(default)]
    pub max_local_part_dots: Option<JsNumber>,
    #[serde(default)]
    pub normalise_gmail: Option<bool>,
    #[serde(default)]
    pub use_default_patterns: Option<bool>,
    #[serde(default)]
    pub custom_regex_blocklist: Option<Vec<String>>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct EmailSpam {
    pub reason: ResultReason,
    pub pattern: Option<String>,
}

static DEFAULT_EMAIL_SPAM_PATTERNS: LazyLock<[(&str, JsRegex); 2]> = LazyLock::new(|| {
    let pattern = |raw: &str, flags: &str| JsRegex::new(raw, flags).expect("a pattern the TS compiles");
    [
        ("many-dots-local-part", pattern(r"^[^@]*\.[^@]*\.[^@]*\.[^@]*\.[^@]*@", "")),
        ("gmail-random-plus-tag", pattern(r"^[^@+]+\+[a-z0-9]{6,}@(gmail|googlemail)\.com$", "i")),
    ]
});

/// `regexCache`: every pattern compiled once per process, failures included.
static REGEX_CACHE: LazyLock<Mutex<HashMap<String, Option<Arc<JsRegex>>>>> = LazyLock::new(|| Mutex::new(HashMap::new()));

fn compiled_regex(raw: &str) -> Option<Arc<JsRegex>> {
    let mut cache = REGEX_CACHE.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
    cache.entry(raw.to_string()).or_insert_with(|| JsRegex::new(raw, "i").map(Arc::new)).clone()
}

fn normalise(email: &str) -> String {
    js_trim(email).to_lowercase()
}

/// `splitEmail`: the trimmed, lowercased address at its last `@`, both sides non-empty.
fn split_email(email: &str) -> Option<(String, String)> {
    let trimmed: String = normalise(email);
    let at: usize = trimmed.rfind('@')?;
    if at == 0 || at == trimmed.len() - 1 {
        return None;
    }
    Some((trimmed[..at].to_string(), trimmed[at + 1..].to_string()))
}

fn is_gmail(domain: &str) -> bool {
    GMAIL_DOMAINS.contains(&domain)
}

/// `normaliseGmailAddress`: a gmail address without its dots and `+tag`.
pub fn normalise_gmail_address(email: &str) -> String {
    let Some((local, domain)) = split_email(email) else {
        return normalise(email);
    };
    if !is_gmail(&domain) {
        return format!("{local}@{domain}");
    }
    let stripped: String = local.replace('.', "");
    format!("{}@gmail.com", stripped.split('+').next().unwrap_or_default())
}

/// `normaliseEmailForMatching`: without its `+tag`, and for gmail its dots, unless that
/// would leave nothing.
pub fn normalise_email_for_matching(email: &str) -> String {
    let Some((local, domain)) = split_email(email) else {
        return normalise(email);
    };
    let before_plus: &str = local.split('+').next().unwrap_or_default();
    let without_plus_tag: &str = if before_plus.is_empty() { &local } else { before_plus };
    if is_gmail(&domain) {
        let without_dots: String = without_plus_tag.replace('.', "");
        let local: &str = if without_dots.is_empty() { without_plus_tag } else { &without_dots };
        return format!("{local}@gmail.com");
    }
    format!("{without_plus_tag}@{domain}")
}

/// `evaluateEmailSpamRules`: the first rule the email breaks.
pub fn evaluate_email_spam_rules(email: Option<&str>, rules: Option<&EmailSpamRulesView>) -> Option<EmailSpam> {
    let rules: &EmailSpamRulesView = rules.filter(|rules| rules.enabled == Some(true))?;
    let email: &str = email.filter(|email| !email.is_empty())?;
    let Some((local, domain)) = split_email(email) else {
        return Some(EmailSpam { reason: ResultReason::EmailInvalid, pattern: None });
    };
    if let Some(max) = rules.max_local_part_dots {
        if local.matches('.').count() as f64 > max.get() {
            return Some(EmailSpam { reason: ResultReason::EmailTooManyDots, pattern: None });
        }
    }
    let address: String = format!("{local}@{domain}");
    let target: String = if rules.normalise_gmail == Some(true) { normalise_gmail_address(&address) } else { address.clone() };
    if rules.use_default_patterns == Some(true) {
        if let Some((name, _)) = DEFAULT_EMAIL_SPAM_PATTERNS.iter().find(|(_, pattern)| pattern.test(&address)) {
            return Some(EmailSpam { reason: ResultReason::EmailMatchedDefaultPattern, pattern: Some(name.to_string()) });
        }
    }
    rules.custom_regex_blocklist.iter().flatten().find(|raw| compiled_regex(raw).is_some_and(|regex| regex.test(&target))).map(|raw| EmailSpam {
        reason: ResultReason::EmailMatchedCustomPattern,
        pattern: Some(raw.clone()),
    })
}
