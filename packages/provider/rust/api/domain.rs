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

//! domainMiddleware.ts: a client route is served only to an origin the site key's settings
//! allow, a Google Translate proxy of one included.

use crate::api::express::{header, hostname, send_json, Requested};
use crate::api::maintenance::MaintenanceMode;
use crate::api::metrics::ProviderMetrics;
use crate::api::pipeline::{handle_errors, mounted};
use crate::tasks::client::domain_pattern_matcher;
use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::Response;
use bson::Bson;
use http::{HeaderMap, StatusCode};
use prosopo_api_router::{RequestI18n, RequestLog};
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError, ThrownError};
use prosopo_database::provider::ProviderDatabase;
use prosopo_locale::I18nLookup;
use prosopo_logger::{LogRecord, Logger};
use serde_json::{json, Value};
use std::sync::Arc;

pub const CLIENT_PREFIX: &str = "/v1/prosopo/provider/client";

pub struct DomainState {
    pub db: Option<Arc<ProviderDatabase>>,
    pub maintenance: Arc<MaintenanceMode>,
    pub metrics: Option<Arc<ProviderMetrics>>,
}

/// Why a request was refused: an API error, answered as such, or anything else, which may
/// carry connection details and is answered with a bare 401.
enum Refusal {
    Api(&'static str, ErrorContext),
    Other(String),
}

fn api_error(key: &'static str, context: ErrorContext) -> Refusal {
    Refusal::Api(key, context)
}

/// The refusal as `ProsopoApiError` makes it, in the request's language.
fn to_error(request: &Request, key: &str, context: ErrorContext, logger: &Logger) -> ProsopoError {
    let lookup = request.extensions().get::<RequestI18n>().map(RequestI18n::lookup);
    ProsopoError::new(
        ErrorClass::Api,
        ErrorSource::key(key),
        ErrorOptions {
            context: Some(context.with("code", 400)),
            i18n: lookup.as_ref().map(|lookup| lookup as &dyn I18nLookup),
            logger: Some(logger),
            ..ErrorOptions::default()
        },
    )
}

/// The origins a site's domains are matched against: the origin, and the site a Google
/// Translate proxy host stands for.
fn candidate_origins(origin: &str) -> Vec<String> {
    let mut candidates: Vec<String> = vec![origin.to_string()];
    if let Ok(url) = prosopo_util::parse_url(origin) {
        if let Some(decoded) = url.host_str().and_then(prosopo_util::decode_google_translate_host) {
            candidates.push(format!("{}://{decoded}", url.scheme()));
        }
    }
    candidates
}

async fn check(state: &DomainState, headers: &HeaderMap) -> Result<&'static str, Refusal> {
    let db: &Arc<ProviderDatabase> = state.db.as_ref().ok_or_else(|| Refusal::Other("db not setup! Please call isReady() first".to_string()))?;
    let Some(site_key) = header(headers, "prosopo-site-key").filter(|key| !key.is_empty()) else {
        return Err(api_error("API.SITE_KEY_NOT_REGISTERED", ErrorContext::new().with("siteKey", "No sitekey provided")));
    };
    if !matches!(prosopo_util_crypto::validate_address(Some(&site_key), false, Some(42)), Ok(true)) {
        return Err(api_error("API.INVALID_SITE_KEY", ErrorContext::new().with("siteKey", site_key.as_str())));
    }
    if prosopo_types::client::get_test_site_key_mode(&site_key).is_some() {
        return Ok("test_key");
    }
    let record = db.get_client_record(&site_key).await.map_err(|error| Refusal::Other(error.to_string()))?;
    let Some(record) = record else {
        return Err(api_error("API.SITE_KEY_NOT_REGISTERED", ErrorContext::new().with("siteKey", site_key.as_str())));
    };
    let domains: Option<Vec<String>> = match record.settings.as_ref().and_then(|settings| settings.get("domains")) {
        Some(Bson::Array(domains)) => Some(domains.iter().filter_map(|domain| domain.as_str().map(str::to_string)).collect()),
        _ => None,
    };
    let Some(domains) = domains else {
        let context: ErrorContext = ErrorContext::new()
            .with("message", "No domains are allowed for this site key. Please fix in the Procaptcha Portal")
            .with("siteKey", site_key.as_str())
            .with("domain", hostname(headers).unwrap_or_default());
        return Err(api_error("API.UNAUTHORIZED_ORIGIN_URL", context));
    };
    let Some(origin) = header(headers, "origin").filter(|origin| !origin.is_empty()) else {
        return Err(api_error("API.UNAUTHORIZED_ORIGIN_URL", ErrorContext::new()));
    };
    let logger: Logger = prosopo_logger::get_logger(prosopo_logger::LogLevel::Info, "provider:client");
    let allowed: bool = candidate_origins(&origin).iter().any(|candidate| domains.iter().any(|domain| domain_pattern_matcher(candidate, domain, &logger)));
    if allowed {
        Ok("allowed")
    } else {
        Err(api_error("API.UNAUTHORIZED_ORIGIN_URL", ErrorContext::new().with("origin", origin.as_str())))
    }
}

/// domainMiddleware, on the client routes.
pub async fn domain(State(state): State<Arc<DomainState>>, request: Request, next: Next) -> Response {
    if !mounted(request.uri().path(), CLIENT_PREFIX) {
        return next.run(request).await;
    }
    let logger: Logger = request
        .extensions()
        .get::<RequestLog>()
        .map_or_else(|| prosopo_logger::get_logger(prosopo_logger::LogLevel::Info, "provider"), |log| log.logger.clone());
    if state.maintenance.get() {
        logger.info(|| LogRecord::msg("Maintenance mode active - skipping domain validation"));
        return next.run(request).await;
    }
    let outcome: Result<&'static str, Refusal> = check(&state, request.headers()).await;
    let result: &str = outcome.as_ref().map_or("rejected", |result| result);
    if let Some(metrics) = &state.metrics {
        metrics.record_domain_validation(result);
    }
    match outcome {
        Ok(_) => next.run(request).await,
        Err(Refusal::Api(key, context)) => {
            let error: ProsopoError = to_error(&request, key, context, &logger);
            handle_errors(&request, &ThrownError::from(error))
        }
        Err(Refusal::Other(error)) => {
            logger.error(|| LogRecord::msg("Domain middleware error").with_err(error));
            let body: Value = json!({ "error": "Unauthorized", "message": "Unauthorized" });
            send_json(&Requested::of(&request), StatusCode::UNAUTHORIZED, Vec::new(), &body)
        }
    }
}
