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

//! captcha.ts, the client routes' router, for the routes ported so far: the spam email check
//! (captcha/checkSpamEmail.ts) and the PoW, icon-order and audio challenges (api/challenge.rs).

use crate::api::challenge::{challenge_route, image_challenge_route, ChallengeRoute, ChallengeState};
use crate::api::express::{send_json, Requested};
use crate::api::maintenance::MaintenanceMode;
use crate::api::metrics::ProviderMetrics;
use crate::api::pipeline::handle_errors;
use crate::api::public::route_matches;
use crate::tasks::spam::check_spam_email;
use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::Response;
use http::{Method, StatusCode};
use prosopo_api_route::schema::{object, Schema};
use prosopo_api_router::{RequestBody, RequestI18n, RequestLog};
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError, ThrownError, ZodLikeError};
use prosopo_database::provider::ProviderDatabase;
use prosopo_locale::I18nLookup;
use prosopo_logger::{LogRecord, Logger};
use prosopo_types::provider_api::ClientApiPaths;
use prosopo_types::sanitise::{safe_line, InputLimits};
use serde_json::{json, Value};
use std::sync::Arc;

pub struct CaptchaState {
    pub challenge: Arc<ChallengeState>,
    pub db: Option<Arc<ProviderDatabase>>,
    pub maintenance: Arc<MaintenanceMode>,
    pub metrics: Option<Arc<ProviderMetrics>>,
    /// `config.dnsServers`.
    pub dns_servers: Option<Vec<String>>,
}

/// `CheckSpamEmailRequestBody`.
fn check_spam_email_body() -> Schema {
    object(vec![("email", safe_line(InputLimits::EMAIL)), ("dapp", safe_line(InputLimits::ID))])
}

/// What a handler passes to `next(error)`: a `ProsopoApiError` in the request's language.
pub(crate) fn api_error(request: &Request, key: &str, context: ErrorContext, logger: &Logger) -> Response {
    let lookup = request.extensions().get::<RequestI18n>().map(RequestI18n::lookup);
    let error: ProsopoError = ProsopoError::new(
        ErrorClass::Api,
        ErrorSource::key(key),
        ErrorOptions {
            context: Some(context),
            i18n: lookup.as_ref().map(|lookup| lookup as &dyn I18nLookup),
            logger: Some(logger),
            ..ErrorOptions::default()
        },
    );
    handle_errors(request, &ThrownError::from(error))
}

/// What the spam check decides, before it is answered.
enum SpamOutcome {
    Checked { is_spam: bool, email_domain: Option<String> },
    Maintenance { email_domain: Option<String> },
    NotRegistered(String),
    NotEnabled(String),
    Failed,
}

async fn spam_outcome(state: &CaptchaState, email: &str, dapp: &str, logger: &Logger) -> SpamOutcome {
    let email_domain: Option<String> = prosopo_util::extract_domain_from_email(email);
    logger.info(|| LogRecord::msg("Check spam email handler entry").with_data(json!({ "emailDomain": email_domain })));
    if state.maintenance.get() {
        logger.info(|| LogRecord::msg("Maintenance mode active - returning isSpam=false").with_data(json!({ "emailDomain": email_domain })));
        return SpamOutcome::Maintenance { email_domain };
    }
    let Some(db) = &state.db else {
        return SpamOutcome::Failed;
    };
    let record = match db.get_client_record(dapp).await {
        Ok(record) => record,
        Err(error) => {
            logger.error(|| LogRecord::msg("Error in check spam email handler").with_err(error.to_string()));
            return SpamOutcome::Failed;
        }
    };
    let Some(record) = record else {
        return SpamOutcome::NotRegistered(dapp.to_string());
    };
    let enabled: bool = record.settings.as_ref().and_then(|settings| settings.get_bool("spamEmailDomainCheckEnabled").ok()).unwrap_or(false);
    if !enabled {
        return SpamOutcome::NotEnabled(dapp.to_string());
    }
    let is_spam: bool = check_spam_email(email, db, state.dns_servers.as_deref(), logger).await;
    logger.info(|| LogRecord::msg("Spam email check result").with_data(json!({ "emailDomain": email_domain, "isSpam": is_spam })));
    if let Some(metrics) = &state.metrics {
        metrics.record_spam_email(if is_spam { "spam" } else { "ham" });
    }
    SpamOutcome::Checked { is_spam, email_domain }
}

/// `{ isSpam, emailDomain }`; `extractDomainFromEmail` gives `null`, not `undefined`, when there
/// is no domain, so the field is always there.
fn spam_body(is_spam: bool, email_domain: Option<String>) -> Value {
    json!({ "isSpam": is_spam, "emailDomain": email_domain })
}

async fn check_spam_email_route(state: &CaptchaState, request: Request) -> Response {
    let logger: Logger = request
        .extensions()
        .get::<RequestLog>()
        .map_or_else(|| prosopo_logger::get_logger(prosopo_logger::LogLevel::Info, "provider"), |log| log.logger.clone());
    let body: Value = request.extensions().get::<RequestBody>().map_or_else(|| json!({}), |body| body.0.clone());
    let parsed: Value = match check_spam_email_body().validate(Some(&body)) {
        Ok(parsed) => parsed,
        Err(issues) => {
            let cause: ZodLikeError = ZodLikeError {
                message: issues.message(),
                issues: issues.issues.iter().filter_map(|issue| serde_json::to_value(issue).ok()).collect(),
            };
            return api_error(&request, "CAPTCHA.PARSE_ERROR", ErrorContext::new().with("code", 400).with_error(cause), &logger);
        }
    };
    let email: &str = parsed["email"].as_str().unwrap_or_default();
    let dapp: &str = parsed["dapp"].as_str().unwrap_or_default();
    match spam_outcome(state, email, dapp, &logger).await {
        SpamOutcome::Checked { is_spam, email_domain } => send_json(&Requested::of(&request), StatusCode::OK, Vec::new(), &spam_body(is_spam, email_domain)),
        SpamOutcome::Maintenance { email_domain } => send_json(&Requested::of(&request), StatusCode::OK, Vec::new(), &spam_body(false, email_domain)),
        SpamOutcome::NotRegistered(dapp) => {
            api_error(&request, "API.SITE_KEY_NOT_REGISTERED", ErrorContext::new().with("code", 400).with("siteKey", dapp.as_str()), &logger)
        }
        SpamOutcome::NotEnabled(dapp) => api_error(&request, "API.BAD_REQUEST", ErrorContext::new().with("code", 400).with("siteKey", dapp.as_str()), &logger),
        SpamOutcome::Failed => api_error(&request, "API.INTERNAL_SERVER_ERROR", ErrorContext::new().with("code", 500), &logger),
    }
}

/// The client routes ported so far; anything else goes on.
pub async fn captcha_routes(State(state): State<Arc<CaptchaState>>, request: Request, next: Next) -> Response {
    if request.method() == Method::POST && route_matches(request.uri().path(), ClientApiPaths::CheckSpamEmail.as_str()) {
        return check_spam_email_route(&state, request).await;
    }
    let challenges = [
        (ClientApiPaths::GetPowCaptchaChallenge, ChallengeRoute::Pow),
        (ClientApiPaths::GetIconOrderCaptchaChallenge, ChallengeRoute::IconOrder),
        (ClientApiPaths::GetAudioCaptchaChallenge, ChallengeRoute::Audio),
        (ClientApiPaths::GetPuzzleCaptchaChallenge, ChallengeRoute::Puzzle),
    ];
    if request.method() == Method::POST && route_matches(request.uri().path(), ClientApiPaths::GetImageCaptchaChallenge.as_str()) {
        return image_challenge_route(&state.challenge, request).await;
    }
    for (path, route) in challenges {
        if request.method() == Method::POST && route_matches(request.uri().path(), path.as_str()) {
            return challenge_route(&state.challenge, route, request).await;
        }
    }
    next.run(request).await
}
