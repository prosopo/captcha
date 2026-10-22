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

//! verify.ts, the dapp servers' verify router: image, PoW, puzzle, audio, icon-order and
//! authenticated sessions. With
//! forwardVerify.ts (a token another provider issued is verified there) and testSiteKey.ts.

use crate::api::express::{send_json, Requested};
use crate::api::maintenance::MaintenanceMode;
use crate::api::metrics::{ProviderMetrics, VerifySource};
use crate::api::pipeline::handle_errors;
use crate::api::public::route_matches;
use crate::tasks::email::SpamFilterView;
use crate::tasks::traffic::TrafficFilterView;
use crate::tasks::verify::{
    bson_json, get_verification_response, server_verify_interactive_captcha_solution, server_verify_pow_captcha_solution, verify_image_captcha_solution, ImageVerifyOutcome,
    ImageVerifyRequest, ServerVerifyRequest, VerifyOutcome, VerifyServices,
};
use crate::tasks::verify::verify_authenticated_session;
use prosopo_database::challenges::Interactive;
use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::Response;
use http::{Method, StatusCode};
use prosopo_api::{ClientOptions, ProviderApi, VERIFY_FORWARDED_HEADER};
use prosopo_api_router::{verify_signature, RequestBody, RequestI18n, RequestLog};
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError, ThrownError, ZodLikeError};
use prosopo_database::clients::ClientRecord;
use prosopo_keyring::{FromAddress, Keyring, KeyringPair};
use prosopo_load_balancer::ProviderDirectory;
use prosopo_locale::I18nLookup;
use prosopo_logger::{ErrorObject, LogRecord, Logger};
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::client::{get_test_site_key_mode, TestSiteKeyMode};
use prosopo_types::config::EnvironmentTypes;
use prosopo_types::keyring::KeyringOptions;
use prosopo_types::provider_api::{server_captcha_verify_request_body, verify_solution_body, ClientApiPaths};
use prosopo_types::{decode_procaptcha_output, ProcaptchaOutput};
use prosopo_util_crypto::u8a::U8aLike;
use serde_json::{json, Value};
use std::sync::Arc;

/// `MAINTENANCE_VERIFY_SCORE`.
const MAINTENANCE_VERIFY_SCORE: f64 = 0.0;

pub struct VerifyState {
    /// Absent before the database is set up, when only maintenance mode and the test keys are
    /// answered.
    pub services: Option<Arc<VerifyServices>>,
    pub maintenance: Arc<MaintenanceMode>,
    pub metrics: Option<Arc<ProviderMetrics>>,
    pub providers: Arc<ProviderDirectory>,
    /// `env.defaultEnvironment`.
    pub default_environment: String,
    /// `env.pair.address`.
    pub address: Option<String>,
}

fn logger_of(request: &Request) -> Logger {
    request
        .extensions()
        .get::<RequestLog>()
        .map_or_else(|| prosopo_logger::get_logger(prosopo_logger::LogLevel::Info, "provider"), |log| log.logger.clone())
}

fn translate(i18n: Option<&RequestI18n>, key: &str) -> String {
    match i18n {
        Some(i18n) => i18n.lookup().t(key),
        None => key.to_string(),
    }
}

fn api_error(i18n: Option<&RequestI18n>, key: &str, context: ErrorContext, logger: &Logger) -> ProsopoError {
    let lookup = i18n.map(RequestI18n::lookup);
    ProsopoError::new(
        ErrorClass::Api,
        ErrorSource::key(key),
        ErrorOptions {
            context: Some(context),
            i18n: lookup.as_ref().map(|lookup| lookup as &dyn I18nLookup),
            logger: Some(logger),
            ..ErrorOptions::default()
        },
    )
}

fn plain_error(message: impl Into<String>) -> ThrownError {
    ThrownError::from(ErrorObject::new("Error", message))
}

/// `buildMaintenanceVerificationResponse`.
fn maintenance_response(i18n: Option<&RequestI18n>) -> Value {
    json!({ "status": translate(i18n, "API.USER_VERIFIED"), "verified": true, "score": MAINTENANCE_VERIFY_SCORE })
}

/// `deriveVerifySource`: the label a verify's metric carries.
fn verify_source(maintenance: &MaintenanceMode, body: Option<&Value>) -> VerifySource {
    if maintenance.get() {
        return VerifySource::Maintenance;
    }
    let token: Option<&str> = body.and_then(|body| body.get("token")).and_then(Value::as_str).filter(|token| !token.is_empty());
    let reserved: bool = token.and_then(|token| decode_procaptcha_output(token).ok()).is_some_and(|output| get_test_site_key_mode(&output.dapp).is_some());
    if reserved {
        VerifySource::TestKey
    } else {
        VerifySource::Real
    }
}

/// `normalizeProviderUrl`: without an `ipv4.` or `ipv6.` label or a trailing slash.
fn normalize_provider_url(url: &str) -> String {
    match url::Url::parse(url) {
        Ok(mut parsed) => {
            if let Some(host) = parsed.host_str().map(str::to_string) {
                let stripped: &str = host.strip_prefix("ipv4.").or_else(|| host.strip_prefix("ipv6.")).unwrap_or(&host);
                if stripped != host {
                    let stripped: String = stripped.to_string();
                    let _ = parsed.set_host(Some(&stripped));
                }
            }
            let text: String = parsed.to_string();
            text.strip_suffix('/').map(str::to_string).unwrap_or(text)
        }
        Err(_) => url.strip_suffix('/').unwrap_or(url).to_string(),
    }
}

/// `forwardVerifyIfNotIssuer`: the issuing provider's answer, when another known provider
/// issued the token; none when this node verifies.
async fn forward_verify_if_not_issuer(
    state: &VerifyState,
    logger: &Logger,
    path: ClientApiPaths,
    token: &ProcaptchaOutput,
    body: &Value,
    already_forwarded: bool,
) -> Result<Option<Value>, ThrownError> {
    if already_forwarded {
        return Ok(None);
    }
    let Some(provider_url) = token.provider_url.as_deref().filter(|url| !url.is_empty()) else {
        return Ok(None);
    };
    let providers = match state.default_environment.parse::<EnvironmentTypes>() {
        Ok(environment) => state.providers.get_providers(environment, None).await.map_err(|error| error.to_string()),
        Err(error) => Err(error.to_string()),
    };
    let providers = match providers {
        Ok(providers) => providers,
        Err(error) => {
            logger.warn(|| LogRecord::msg("Failed to load provider list; verifying locally").with_err(error).with_data(json!({ "providerUrl": provider_url })));
            return Ok(None);
        }
    };
    let normalized: String = normalize_provider_url(provider_url);
    let Some(issuer) = providers.iter().find(|provider| normalize_provider_url(&provider.url) == normalized) else {
        logger.warn(|| LogRecord::msg("Token providerUrl is not a known provider; verifying locally").with_data(json!({ "providerUrl": provider_url })));
        return Ok(None);
    };
    if state.address.as_deref().is_some_and(|address| !address.is_empty() && address == issuer.address) {
        return Ok(None);
    }
    logger.info(|| {
        LogRecord::msg("Forwarding verify request to issuing provider").with_data(json!({ "providerUrl": provider_url, "path": path.as_str(), "dapp": token.dapp }))
    });
    let api: ProviderApi = ProviderApi::new(&issuer.url, &token.dapp, ClientOptions::default());
    api.forward_verify(path, body, &token.user).await.map(Some).map_err(|error| plain_error(error.to_string()))
}

/// `validateAddress(address, false, 42)`, which throws a plain error.
fn validate_address(address: &str) -> Result<(), ThrownError> {
    prosopo_util_crypto::validate_address(Some(address), false, Some(42)).map(|_| ()).map_err(|error| plain_error(error.to_string()))
}

/// `env.keyring.addFromAddress(dapp)`.
fn pair_from_address(address: &str) -> Result<KeyringPair, ThrownError> {
    let mut keyring: Keyring = Keyring::new(KeyringOptions { ss58_format: None, kind: None }).map_err(|error| plain_error(error.to_string()))?;
    keyring.add_from_address(U8aLike::Str(address), FromAddress::default()).map_err(|error| plain_error(error.to_string()))
}

/// The verify routes ported so far.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum VerifyRoute {
    Authenticated,
    Image,
    Pow,
    Interactive(Interactive),
}

impl VerifyRoute {
    const ALL: [VerifyRoute; 6] = [
        VerifyRoute::Authenticated,
        VerifyRoute::Image,
        VerifyRoute::Pow,
        VerifyRoute::Interactive(Interactive::Puzzle),
        VerifyRoute::Interactive(Interactive::Audio),
        VerifyRoute::Interactive(Interactive::IconOrder),
    ];

    fn path(self) -> ClientApiPaths {
        match self {
            VerifyRoute::Authenticated => ClientApiPaths::VerifyAuthenticatedSession,
            VerifyRoute::Image => ClientApiPaths::VerifyImageCaptchaSolutionDapp,
            VerifyRoute::Pow => ClientApiPaths::VerifyPowCaptchaSolution,
            VerifyRoute::Interactive(Interactive::Puzzle) => ClientApiPaths::VerifyPuzzleCaptchaSolution,
            VerifyRoute::Interactive(Interactive::Audio) => ClientApiPaths::VerifyAudioCaptchaSolution,
            VerifyRoute::Interactive(Interactive::IconOrder) => ClientApiPaths::VerifyIconOrderCaptchaSolution,
        }
    }

    /// `VERIFY_PATH_TYPE`: the type a route's verify metric is counted under, if it is.
    fn counted_type(self) -> Option<CaptchaType> {
        match self {
            VerifyRoute::Authenticated => None,
            VerifyRoute::Image => Some(CaptchaType::Image),
            VerifyRoute::Pow => Some(CaptchaType::Pow),
            VerifyRoute::Interactive(Interactive::Puzzle) => Some(CaptchaType::Puzzle),
            VerifyRoute::Interactive(Interactive::Audio) => Some(CaptchaType::Audio),
            VerifyRoute::Interactive(Interactive::IconOrder) => Some(CaptchaType::IconOrder),
        }
    }

    /// The routes whose failures pass on no inner error, and whose body is `VerifySolutionBody`.
    fn is_dapp_solution(self) -> bool {
        matches!(self, VerifyRoute::Authenticated | VerifyRoute::Image)
    }

    /// The handler's `label`.
    fn label(self) -> &'static str {
        match self {
            VerifyRoute::Authenticated => "authenticated",
            VerifyRoute::Image => "image",
            VerifyRoute::Pow => "PoW",
            VerifyRoute::Interactive(Interactive::Puzzle) => "puzzle",
            VerifyRoute::Interactive(Interactive::Audio) => "audio",
            VerifyRoute::Interactive(Interactive::IconOrder) => "icon-order",
        }
    }

    /// The handler's name, as its error log gives it.
    fn handler_name(self) -> &'static str {
        match self {
            VerifyRoute::Authenticated => "verifyAuthenticatedSession",
            VerifyRoute::Image => "verifyImageCaptchaSolution",
            VerifyRoute::Pow => "verifyPowCaptchaSolution",
            VerifyRoute::Interactive(Interactive::Puzzle) => "verifyPuzzleCaptchaSolution",
            VerifyRoute::Interactive(Interactive::Audio) => "verifyAudioCaptchaSolution",
            VerifyRoute::Interactive(Interactive::IconOrder) => "verifyIconOrderCaptchaSolution",
        }
    }
}

/// The client settings verification reads.
struct VerifySettings {
    verified_timeout: f64,
    spam_email_domain_check_enabled: bool,
    spam_filter: Option<SpamFilterView>,
    traffic_filter: Option<TrafficFilterView>,
    store_metadata: bool,
    disallow_web_view: Option<bool>,
}

fn verify_settings(record: &ClientRecord) -> Result<VerifySettings, ThrownError> {
    let settings: Value = record.settings.as_ref().map(|settings| bson_json(&bson::Bson::Document(settings.clone()))).ok_or_else(|| {
        plain_error("Cannot read properties of undefined (reading 'verifiedTimeout')")
    })?;
    let flag = |key: &str| settings.get(key).and_then(Value::as_bool) == Some(true);
    fn view<T: serde::de::DeserializeOwned>(settings: &Value, key: &str) -> Option<T> {
        settings.get(key).filter(|value| value.is_object()).and_then(|value| serde_json::from_value(value.clone()).ok())
    }
    Ok(VerifySettings {
        verified_timeout: settings.get("verifiedTimeout").and_then(Value::as_f64).unwrap_or(f64::NAN),
        spam_email_domain_check_enabled: flag("spamEmailDomainCheckEnabled"),
        spam_filter: view(&settings, "spamFilter"),
        traffic_filter: view(&settings, "trafficFilter"),
        store_metadata: flag("storeMetadata"),
        disallow_web_view: settings.get("disallowWebView").and_then(Value::as_bool),
    })
}

/// What the PoW verify answers, short of an error passed on.
enum Answer {
    Json(Value),
    Error(ProsopoError),
}

/// What the verify reads of the request besides its body.
struct Asked {
    i18n: Option<RequestI18n>,
    already_forwarded: bool,
}

async fn verify(state: &VerifyState, route: VerifyRoute, asked: &Asked, body: &Value, token: &ProcaptchaOutput, logger: &Logger) -> Result<Answer, ThrownError> {
    let i18n: Option<&RequestI18n> = asked.i18n.as_ref();
    if let Some(mode) = get_test_site_key_mode(&token.dapp) {
        logger.warn(|| {
            LogRecord::msg("Reserved TEST site key - forcing deterministic captcha verdict").with_data(json!({ "siteKey": token.dapp, "mode": mode.as_str() }))
        });
        return Ok(Answer::Json(json!({ "status": "ok", "verified": mode == TestSiteKeyMode::Pass })));
    }
    if let Some(forwarded) = forward_verify_if_not_issuer(state, logger, route.path(), token, body, asked.already_forwarded).await? {
        return Ok(Answer::Json(forwarded));
    }
    let services: &Arc<VerifyServices> = state.services.as_ref().ok_or_else(|| {
        ThrownError::from(ProsopoError::new(ErrorClass::Env, ErrorSource::key("DATABASE.DATABASE_UNDEFINED"), ErrorOptions::default()))
    })?;
    validate_address(&token.dapp)?;
    validate_address(&token.user)?;
    let Some(client) = services.db.get_client_record(&token.dapp).await? else {
        let mut context: ErrorContext = ErrorContext::new().with("code", 400).with("siteKey", token.dapp.as_str());
        if route.is_dapp_solution() {
            context = context.with("user", token.user.as_str());
        }
        return Ok(Answer::Error(api_error(i18n, "API.SITE_KEY_NOT_REGISTERED", context, logger)));
    };
    let challenge: &str = token.challenge.as_deref().unwrap_or_default();
    if !route.is_dapp_solution() && challenge.is_empty() {
        return Ok(Answer::Json(json!({ "status": translate(i18n, "API.USER_NOT_VERIFIED"), "verified": false })));
    }
    let pair: KeyringPair = pair_from_address(&token.dapp)?;
    let signature: &str = body.get("dappSignature").and_then(Value::as_str).unwrap_or_default();
    if verify_signature(signature, &token.timestamp, &pair).is_err() {
        let context: ErrorContext = ErrorContext::new().with("code", 400).with("siteKey", token.dapp.as_str());
        return Ok(Answer::Error(api_error(i18n, "GENERAL.INVALID_SIGNATURE", context, logger)));
    }
    if state.maintenance.get() || state.maintenance.site_keys().iter().any(|key| key == &token.dapp) {
        logger.info(|| LogRecord::msg("Site key in maintenance mode - returning verified").with_data(json!({ "siteKey": token.dapp })));
        return Ok(Answer::Json(maintenance_response(i18n)));
    }
    let text = |key: &str| body.get(key).and_then(Value::as_str);
    if route == VerifyRoute::Authenticated {
        let Some(session_id) = token.commitment_id.as_deref().filter(|id| !id.is_empty()) else {
            return Ok(Answer::Json(json!({ "status": "API.USER_NOT_VERIFIED_NO_SOLUTION", "verified": false })));
        };
        let (verified, status) = verify_authenticated_session(services, session_id, text("ip"), text("clientSessionId")).await?;
        return Ok(Answer::Json(json!({ "verified": verified, "status": status })));
    }
    let settings: VerifySettings = verify_settings(&client)?;
    let verify_request: ServerVerifyRequest = ServerVerifyRequest {
        dapp: &token.dapp,
        challenge,
        timeout: settings.verified_timeout,
        ip: text("ip"),
        email: text("email"),
        spam_email_domain_check_enabled: settings.spam_email_domain_check_enabled,
        spam_filter: settings.spam_filter,
        traffic_filter: settings.traffic_filter,
        store_metadata: settings.store_metadata,
        client_session_id: text("clientSessionId"),
    };
    let (outcome, commitment_id): (VerifyOutcome, Option<String>) = match route {
        VerifyRoute::Image => {
            let image: ImageVerifyRequest = ImageVerifyRequest {
                shared: verify_request,
                commitment_id: token.commitment_id.as_deref(),
                max_verified_time: body.get("maxVerifiedTime").and_then(Value::as_f64),
                disallow_web_view: settings.disallow_web_view,
            };
            let answer: ImageVerifyOutcome = verify_image_captcha_solution(services, &image, logger).await?;
            let outcome: VerifyOutcome = VerifyOutcome { reason: Some(answer.status), ..answer.outcome };
            (outcome, answer.commitment_id)
        }
        VerifyRoute::Pow => (server_verify_pow_captcha_solution(services, &verify_request, logger).await?, None),
        VerifyRoute::Authenticated => unreachable!("an authenticated session is answered before the settings are read"),
        VerifyRoute::Interactive(kind) => (server_verify_interactive_captcha_solution(services, kind, &verify_request, logger).await?, None),
    };
    let status: String = translate(i18n, if outcome.verified { "API.USER_VERIFIED" } else { "API.USER_NOT_VERIFIED" });
    let mut answer: Value = get_verification_response(&outcome, client.tier, status);
    if let (Some(commitment_id), Some(fields)) = (commitment_id.filter(|id| !id.is_empty()), answer.as_object_mut()) {
        fields.insert("commitmentId".to_string(), json!(commitment_id));
    }
    Ok(Answer::Json(answer))
}

/// The response, and the JSON it carries when it answers the verify.
async fn verify_route(state: &VerifyState, route: VerifyRoute, request: Request) -> (Response, Option<Value>) {
    let logger: Logger = logger_of(&request);
    let asked: Asked = Asked {
        i18n: request.extensions().get::<RequestI18n>().cloned(),
        already_forwarded: request.headers().contains_key(VERIFY_FORWARDED_HEADER),
    };
    let i18n: Option<&RequestI18n> = asked.i18n.as_ref();
    let requested: Requested = Requested::of(&request);
    let answered = |answer: Value| (send_json(&requested, StatusCode::OK, Vec::new(), &answer), Some(answer));
    if state.maintenance.get() {
        if route != VerifyRoute::Authenticated {
            logger.info(|| LogRecord::msg(format!("Maintenance mode active - returning verified for {} captcha verification", route.label())));
        }
        return answered(maintenance_response(i18n));
    }
    let raw: Value = request.extensions().get::<RequestBody>().map_or_else(|| json!({}), |body| body.0.clone());
    let schema = if route.is_dapp_solution() { verify_solution_body() } else { server_captcha_verify_request_body() };
    let body: Value = match schema.validate(Some(&raw)) {
        Ok(body) => body,
        Err(issues) => {
            let cause: ZodLikeError = ZodLikeError {
                message: issues.message(),
                issues: issues.issues.iter().filter_map(|issue| serde_json::to_value(issue).ok()).collect(),
            };
            let error: ProsopoError = api_error(i18n, "CAPTCHA.PARSE_ERROR", ErrorContext::new().with("code", 400).with_error(cause), &logger);
            return (handle_errors(&request, &ThrownError::from(error)), None);
        }
    };
    let token: &str = body.get("token").and_then(Value::as_str).unwrap_or_default();
    let decoded: ProcaptchaOutput = match decode_procaptcha_output(token) {
        Ok(decoded) => decoded,
        Err(error) => {
            let context: ErrorContext = ErrorContext::new().with("code", 400).with_error(plain_error(error.to_string()));
            let error: ProsopoError = api_error(i18n, "CAPTCHA.PARSE_ERROR", context, &logger);
            return (handle_errors(&request, &ThrownError::from(error)), None);
        }
    };
    let outcome: Result<Answer, ThrownError> = verify(state, route, &asked, &body, &decoded, &logger).await;
    match outcome {
        Ok(Answer::Json(answer)) => answered(answer),
        Ok(Answer::Error(error)) => (handle_errors(&request, &ThrownError::from(error)), None),
        Err(error) => {
            logger.error(|| LogRecord::msg(format!("Error in {}", route.handler_name())).with_err(format!("{error:?}")));
            let context: ErrorContext =
                if route.is_dapp_solution() { ErrorContext::new().with("code", 500) } else { ErrorContext::new().with("code", 500).with_error(error) };
            let error: ProsopoError = api_error(i18n, "API.BAD_REQUEST", context, &logger);
            (handle_errors(&request, &ThrownError::from(error)), None)
        }
    }
}

/// The verify router: each answered verify counted by type, outcome and source, then the
/// verify routes ported so far; anything else goes on.
pub async fn verify_routes(State(state): State<Arc<VerifyState>>, request: Request, next: Next) -> Response {
    let path: String = request.uri().path().to_string();
    let Some(route) = VerifyRoute::ALL.into_iter().find(|route| request.method() == Method::POST && route_matches(&path, route.path().as_str())) else {
        return next.run(request).await;
    };
    let counted: Option<(CaptchaType, VerifySource)> = route
        .counted_type()
        .filter(|_| state.metrics.is_some() && path == route.path().as_str())
        .map(|captcha_type| (captcha_type, verify_source(&state.maintenance, request.extensions().get::<RequestBody>().map(|body| &body.0))));
    let (response, answer) = verify_route(&state, route, request).await;
    if let (Some(metrics), Some((captcha_type, source)), Some(answer)) = (&state.metrics, counted, answer) {
        metrics.record_captcha_verify(captcha_type, answer.get("verified").is_some_and(truthy), source);
    }
    response
}

fn truthy(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(flag) => *flag,
        Value::Number(number) => number.as_f64().is_some_and(|n| n != 0.0 && !n.is_nan()),
        Value::String(text) => !text.is_empty(),
        Value::Array(_) | Value::Object(_) => true,
    }
}
