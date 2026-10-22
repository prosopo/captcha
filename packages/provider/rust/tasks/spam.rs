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

//! tasks/spam/checkSpamEmail.ts: whether an email's domain is on the spam list, or points
//! there through its website's redirect, its CNAME or its mail server.

use crate::dns::{run_dns_checks, DnsCheckResult};
use prosopo_database::provider::ProviderDatabase;
use prosopo_logger::{LogRecord, Logger};
use prosopo_util::{extract_domain_from_email, validate_domain_for_outbound_request};
use serde_json::json;

/// `extractDomain`: a URL's host, or the text as it is.
fn extract_domain(url_or_domain: &str) -> String {
    let url: String = if url_or_domain.starts_with("http") { url_or_domain.to_string() } else { format!("https://{url_or_domain}") };
    url::Url::parse(&url).ok().and_then(|url| url.host_str().map(str::to_string)).unwrap_or_else(|| url_or_domain.to_string())
}

/// Listed, unlisted, or the lookup failed (which lets the email through).
enum Listed {
    Yes,
    No,
    Failed,
}

async fn listed(db: &ProviderDatabase, domain: &str, logger: &Logger, failure: &str) -> Listed {
    match db.get_spam_email_domain(domain).await {
        Ok(Some(_)) => Listed::Yes,
        Ok(None) => Listed::No,
        Err(error) => {
            logger.warn(|| LogRecord::msg(failure.to_string()).with_err(error.to_string()).with_data(json!({ "domain": domain })));
            Listed::Failed
        }
    }
}

/// `checkSpamEmail`.
pub async fn check_spam_email(email: &str, db: &ProviderDatabase, dns_servers: Option<&[String]>, logger: &Logger) -> bool {
    let Some(domain) = extract_domain_from_email(email) else {
        return true;
    };
    match listed(db, &domain, logger, "Failed to check spam email domain").await {
        Listed::Yes => return true,
        Listed::Failed => return false,
        Listed::No => {}
    }
    let validation = validate_domain_for_outbound_request(&domain);
    if !validation.is_valid {
        logger.warn(|| {
            LogRecord::msg("Email domain failed SSRF validation, rejecting").with_data(json!({ "domain": domain, "reason": validation.reason }))
        });
        return true;
    }
    let checks: DnsCheckResult = run_dns_checks(&domain, dns_servers).await;
    if checks.redirect.tls_error {
        logger.info(|| LogRecord::msg("Email domain apex has TLS error — observed, not treated as spam").with_data(json!({ "domain": domain })));
    }
    let (pointed, failure, message) = if let Some(redirect) = &checks.redirect.redirect_url {
        let redirect_domain: String = extract_domain(redirect).to_lowercase().trim().to_string();
        (redirect_domain, "Failed to check spam email domain for redirect", "Email domain has HTTP redirect")
    } else if let Some(cnames) = checks.cname.as_ref().filter(|cnames| !cnames.is_empty()) {
        if cnames[0].is_empty() {
            logger.warn(|| LogRecord::msg("CNAME result array has undefined element").with_data(json!({ "domain": domain })));
            return false;
        }
        let cname: String = cnames[0].strip_suffix('.').unwrap_or(&cnames[0]).to_lowercase().trim().to_string();
        (cname, "Failed to check spam email domain for CNAME", "Email domain has CNAME")
    } else if let Some(records) = checks.mx.as_ref().filter(|records| !records.is_empty()) {
        if records[0].exchange.is_empty() {
            logger.warn(|| LogRecord::msg("MX record result array has undefined element or exchange").with_data(json!({ "domain": domain })));
            return false;
        }
        let exchange: String = records[0].exchange.strip_suffix('.').unwrap_or(&records[0].exchange).to_lowercase().trim().to_string();
        (exchange, "Failed to check spam email domain for MX record", "Email domain has MX record")
    } else {
        return false;
    };
    logger.info(|| LogRecord::msg(message).with_data(json!({ "domain": domain, "pointsTo": pointed })));
    matches!(listed(db, &pointed, logger, failure).await, Listed::Yes)
}
