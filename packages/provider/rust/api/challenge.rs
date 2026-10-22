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

//! The challenge routes ported so far: `captcha/pow` (captcha/getPoWCaptchaChallenge.ts) and
//! `captcha/icon-order` (captcha/getIconOrderCaptchaChallenge.ts, through
//! interactiveCaptchaChallenge.ts), with the minting of powTasks.ts and
//! interactiveCaptchaManager.ts, maintenanceModeResponses.ts's dummies and
//! trafficFilterRequestTime.ts's `applyTrafficFilterAtRequestTime`.

use crate::api::block::{get_prioritised_access_rule, get_request_user_scope, normalize_headers_for_matching, PrioritisedRuleOptions, ScopeSignals};
use crate::api::captcha::api_error;
use crate::api::express::{header, send_json, Requested};
use crate::api::maintenance::MaintenanceMode;
use crate::api::metrics::ProviderMetrics;
use crate::api::padding::send_json_padded;
use crate::api::pipeline::{handle_errors, validate_address, RequestSignals};
use crate::composite_ip::get_composite_ip_address;
use crate::tasks::detection::{DetectionServices, DetectorBundlePool, SimdDecoder};
use crate::tasks::request::{settings_json, RequestStores, Validation};
use crate::tasks::traffic::{check_traffic_filter, resolve_challenge_policy, resolve_pad_bytes, ResolvedChallengePolicy, TrafficFilterView};
use crate::tasks::verify::{bson_json, VerifyServices};
use axum::extract::Request;
use axum::response::Response;
use bson::{Bson, Document};
use http::StatusCode;
use prosopo_api_router::{RequestBody, RequestLog};
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError, ThrownError, ZodLikeError};
use prosopo_database::challenges::{InteractiveAnswer, NewChallenge};
use prosopo_database::records::{CompositeIpAddress, StoredIconTarget};
use prosopo_database::session::Session;
use prosopo_icon_order_assets::{render_icon_order, IconOrderRenderSettings, RenderedIconOrder};
use prosopo_keyring::KeyringPair;
use prosopo_logger::{LogRecord, Logger};
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::client::get_test_site_key_mode;
use prosopo_types::datasets::{PoWChallengeComponents, POW_SEPARATOR};
use prosopo_types::ipapi::IpInfoResponse;
use prosopo_types::provider_api::get_challenge_request_body;
use prosopo_types::settings::ICON_ORDER_TOLERANCE_DEFAULT;
use prosopo_types::stored::SimdReadingsStage;
use prosopo_types_database::number::to_bson_document;
use prosopo_user_access_policy::AccessRule;
use prosopo_util_crypto::u8a::{u8a_to_hex, U8aLike};
use serde_json::{json, Map, Value};
use std::sync::{Arc, RwLock};

/// `DEFAULT_POW_DIFFICULTY`.
const DEFAULT_POW_DIFFICULTY: f64 = 4.0;

/// `ICON_ORDER_GLYPH_VOCABULARY`: how many distinct glyphs there are to draw icons from.
const ICON_ORDER_GLYPH_VOCABULARY: usize = 10;

/// Where a render's seed comes from: `createSeed`, fresh random bytes, unless a test pins them.
pub trait SeedSource: Send + Sync {
    fn seed(&self) -> Vec<u8>;
}

/// `createSeed`.
pub struct FreshSeeds;

impl SeedSource for FreshSeeds {
    fn seed(&self) -> Vec<u8> {
        prosopo_puzzle_assets::create_seed()
    }
}

pub struct ChallengeState {
    /// Absent before the database is set up, when only maintenance mode and the test keys are
    /// answered.
    pub services: Option<Arc<VerifyServices>>,
    pub maintenance: Arc<MaintenanceMode>,
    pub metrics: Option<Arc<ProviderMetrics>>,
    /// `env.pair`, which signs each challenge.
    pub pair: Option<KeyringPair>,
    pub pool: Arc<RwLock<Arc<DetectorBundlePool>>>,
    pub decoder: Option<Arc<dyn SimdDecoder>>,
    pub seeds: Arc<dyn SeedSource>,
}

/// `MintedChallenge`: `${now}___${user}___${dapp}___${nonce}`, signed by the provider.
pub struct MintedChallenge {
    pub challenge: String,
    pub provider_signature: String,
    pub requested_at_timestamp: i64,
}

/// `mintChallenge`, which PoW's `getPowCaptchaChallenge` and every interactive type share.
pub fn mint_challenge(pair: &KeyringPair, user: &str, dapp: &str, now_ms: i64, random: f64) -> Result<MintedChallenge, String> {
    let nonce: i64 = (random * 1_000_000.0).floor() as i64;
    let challenge: String = [now_ms.to_string(), user.to_string(), dapp.to_string(), nonce.to_string()].join(POW_SEPARATOR);
    let signature: Vec<u8> = pair.sign(U8aLike::Bytes(challenge.as_bytes()), false).map_err(|error| error.to_string())?;
    Ok(MintedChallenge { challenge, provider_signature: u8a_to_hex(&signature), requested_at_timestamp: now_ms })
}

fn now_ms() -> u128 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0, |elapsed| elapsed.as_millis())
}

/// `buildChallenge`: the unsigned challenge every maintenance dummy carries.
fn maintenance_challenge(user: &str, dapp: &str) -> String {
    [now_ms().to_string(), user.to_string(), dapp.to_string(), "0".to_string()].join(POW_SEPARATOR)
}

/// `buildPowMaintenanceResponse`.
fn pow_maintenance_response(user: &str, dapp: &str) -> Value {
    let timestamp: u128 = now_ms();
    json!({
        "status": "ok",
        "challenge": maintenance_challenge(user, dapp),
        "difficulty": 1,
        "timestamp": timestamp.to_string(),
        "signature": { "provider": { "challenge": "" } },
    })
}

/// What `applyTrafficFilterAtRequestTime` gives a challenge route: the overrides of the
/// `challenge` categories, and the padding every matched category asks for.
struct TrafficVerdict {
    challenge: Option<ResolvedChallengePolicy>,
    pad_bytes: Option<f64>,
}

fn traffic_verdict(ip_info: Option<&IpInfoResponse>, settings: Option<&Value>, logger: &Logger) -> TrafficVerdict {
    let Some(filter) = settings.and_then(|settings| settings.get("trafficFilter")).filter(|filter| filter.is_object()) else {
        return TrafficVerdict { challenge: None, pad_bytes: None };
    };
    let filter: TrafficFilterView = serde_json::from_value(filter.clone()).unwrap_or_default();
    let result = check_traffic_filter(ip_info, &filter, &[], None);
    let pad_bytes: Option<f64> = resolve_pad_bytes(&result.matches);
    let challenge: Option<ResolvedChallengePolicy> = resolve_challenge_policy(&result.matches);
    if let Some(resolved) = &challenge {
        logger.info(|| {
            LogRecord::msg("Traffic filter applied challenge overrides").with_data(json!({
                "categories": resolved.source_categories.iter().map(|category| category.as_str()).collect::<Vec<&str>>(),
                "captchaType": resolved.captcha_type.map(CaptchaType::as_str),
                "powDifficulty": resolved.pow_difficulty,
                "solvedImagesCount": resolved.solved_images_count,
                "puzzleTolerance": resolved.puzzle_tolerance,
            }))
        });
    }
    TrafficVerdict { challenge, pad_bytes }
}

/// JS `a || b`, for the numbers the PoW difficulty is chosen from.
fn first_truthy(candidates: &[Option<f64>]) -> Option<f64> {
    candidates.iter().flatten().copied().find(|number| *number != 0.0 && !number.is_nan())
}

/// `flatten(req.headers)`: each header as Node joins it, except `set-cookie`, which Node keeps
/// as an array and `flatten` then spreads over `set-cookie.0`, `set-cookie.1`, ….
pub fn request_headers_document(headers: &http::HeaderMap) -> Document {
    let mut out: Document = Document::new();
    for name in headers.keys() {
        if name.as_str() == "set-cookie" {
            for (index, value) in headers.get_all(name).iter().enumerate() {
                out.insert(format!("set-cookie.{index}"), crate::api::express::latin1(value.as_bytes()));
            }
        } else if let Some(value) = header(headers, name.as_str()) {
            out.insert(name.as_str(), value);
        }
    }
    out
}

fn logger_of(request: &Request) -> Logger {
    request
        .extensions()
        .get::<RequestLog>()
        .map_or_else(|| prosopo_logger::get_logger(prosopo_logger::LogLevel::Info, "provider"), |log| log.logger.clone())
}

/// What a route reads of a request once its body has parsed.
struct ChallengeRequest<'a> {
    user: &'a str,
    dapp: &'a str,
    session_id: Option<&'a str>,
    simd_readings: Option<&'a str>,
    origin: Option<String>,
    signals: Option<RequestSignals>,
}

/// Where a challenge came from, as its record stores it.
struct Provenance {
    ip_address: CompositeIpAddress,
    headers: Document,
    ja4: String,
    session_id: Option<String>,
    ip_info: Option<Bson>,
}

impl Provenance {
    fn new_challenge<'a>(&'a self, minted: &'a MintedChallenge, components: &'a PoWChallengeComponents) -> NewChallenge<'a> {
        NewChallenge {
            challenge: &minted.challenge,
            components,
            provider_signature: &minted.provider_signature,
            ip_address: &self.ip_address,
            headers: &self.headers,
            ja4: &self.ja4,
            session_id: self.session_id.as_deref(),
            ip_info: self.ip_info.as_ref(),
        }
    }
}

/// What the shared request handling settles before a type issues its challenge.
struct Gate {
    settings: Option<Value>,
    session: Option<Session>,
    deferred: Option<AccessRule>,
    enforcing: Option<AccessRule>,
    session_difficulty: Option<f64>,
    verdict: TrafficVerdict,
    provenance: Provenance,
}

/// What the shared request handling answers, short of an error passed on.
enum Refusal {
    NotRegistered,
    Invalid(String),
    NoOrigin,
}

/// interactiveCaptchaChallenge.ts up to `spec.issue`, which the PoW route also runs: the
/// client record, the user scope and access rules, `isValidRequest`, the `Origin` check and
/// the traffic filter. The SIMD attach is left to the route ([`attach_simd`]), which runs it
/// before the interactive types mint and after PoW has.
async fn gate(services: &VerifyServices, request: &ChallengeRequest<'_>, captcha_type: CaptchaType, headers: &http::HeaderMap, logger: &Logger) -> Result<Result<Gate, Refusal>, String> {
    let Some(client) = services.db.get_client_record(request.dapp).await.map_err(|error| error.to_string())? else {
        return Ok(Err(Refusal::NotRegistered));
    };
    let ip: String = request.signals.as_ref().map(|signals| signals.ip.clone()).unwrap_or_default();
    if ip.is_empty() {
        logger.warn(|| LogRecord::msg("Request missing IP; geoblocking will be skipped"));
    }
    let ip_info: Option<&IpInfoResponse> = request.signals.as_ref().and_then(|signals| signals.ip_info.as_ref());
    let (country_code, asn) = match ip_info {
        Some(IpInfoResponse::Valid(info)) => (info.country_code.clone(), info.asn_number.map(|asn| asn.get())),
        _ => (None, None),
    };
    let session: Option<Session> = match request.session_id {
        Some(session_id) => services.db.get_session_record_by_session_id(session_id).await.map_err(|error| error.to_string())?,
        None => None,
    };
    let user_agent: Option<String> = header(headers, "user-agent");
    let ja4: String = request.signals.as_ref().map(|signals| signals.ja4.clone()).unwrap_or_default();
    let scope: Value = get_request_user_scope(ScopeSignals {
        user_agent: user_agent.as_deref(),
        ja4: Some(&ja4),
        ip: Some(&ip),
        user: Some(request.user),
        head_hash: session.as_ref().map(|session| session.decrypted_head_hash.as_str()),
        coords: None,
        country_code: country_code.as_deref(),
        asn,
        web_bot_auth_agent: None,
    });
    let storage = services.db.get_user_access_rules_storage().map_err(|error| error.to_string())?;
    let rules: Vec<AccessRule> = get_prioritised_access_rule(
        Arc::new(storage),
        &services.verdict_cache,
        &scope,
        Some(request.dapp),
        &normalize_headers_for_matching(headers),
        PrioritisedRuleOptions::default(),
    )
    .await?;
    let enforcing: Option<AccessRule> = rules.iter().find(|rule| rule.policy.defer_to_verify != Some(true)).cloned();
    let deferred: Option<AccessRule> = rules.iter().find(|rule| rule.policy.defer_to_verify == Some(true)).cloned();

    let stores = RequestStores { db: &services.db, write_queue: services.write_queue(), logger };
    let validation: Validation = stores
        .is_valid_request(&client, captcha_type, request.session_id, enforcing.as_ref())
        .await
        .map_err(|error| error.to_string())?;
    let (valid_session_id, session_difficulty) = match validation {
        Validation::Valid { session_id, pow_difficulty, .. } => (session_id, pow_difficulty),
        Validation::Invalid(reason) => return Ok(Err(Refusal::Invalid(reason.as_str().to_string()))),
    };
    if request.origin.is_none() {
        return Ok(Err(Refusal::NoOrigin));
    }
    let settings: Option<Value> = settings_json(&client);
    let verdict: TrafficVerdict = traffic_verdict(ip_info, settings.as_ref(), logger);
    let stored_ip_info: Option<Bson> = match ip_info {
        Some(info) => Some(Bson::Document(to_bson_document(info).map_err(|error| error.to_string())?)),
        None => None,
    };
    Ok(Ok(Gate {
        settings,
        session,
        deferred,
        enforcing,
        session_difficulty,
        verdict,
        provenance: Provenance {
            ip_address: get_composite_ip_address(&ip),
            headers: request_headers_document(headers),
            ja4,
            session_id: valid_session_id,
            ip_info: stored_ip_info,
        },
    }))
}

/// `decryptAndAttachSimdReadingsIfAbsent` for a session-backed challenge with readings.
async fn attach_simd(state: &ChallengeState, services: &VerifyServices, gate: &Gate, simd_readings: Option<&str>, label: &str, logger: &Logger) {
    let (Some(session_id), Some(simd_readings)) = (gate.provenance.session_id.as_deref(), simd_readings.filter(|readings| !readings.is_empty())) else {
        return;
    };
    let pool: Arc<DetectorBundlePool> = state.pool.read().map_or_else(|poisoned| poisoned.into_inner().clone(), |pool| pool.clone());
    let detection = DetectionServices { db: &services.db, write_queue: services.write_queue(), pool: Some(&pool), decoder: state.decoder.as_deref(), logger };
    if let Err(error) = detection.decrypt_and_attach_simd_readings_if_absent(session_id, simd_readings, SimdReadingsStage::Challenge).await {
        logger.warn(|| LogRecord::msg(format!("Failed to patch session with SIMD readings on {label} challenge")).with_err(error));
    }
}

fn components(minted: &MintedChallenge, user: &str, dapp: &str) -> PoWChallengeComponents {
    PoWChallengeComponents {
        requested_at_timestamp: (minted.requested_at_timestamp as f64).into(),
        user_account: user.to_string(),
        dapp_account: dapp.to_string(),
    }
}

/// A challenge issued: its answer, its padding, and what its issuance line logs.
struct Issued {
    body: Value,
    pad_bytes: Option<f64>,
    log_data: Map<String, Value>,
}

async fn issue_pow(state: &ChallengeState, services: &VerifyServices, pair: &KeyringPair, request: &ChallengeRequest<'_>, headers: &http::HeaderMap, logger: &Logger) -> Result<Result<Issued, Refusal>, String> {
    let gate: Gate = match gate(services, request, CaptchaType::Pow, headers, logger).await? {
        Ok(gate) => gate,
        Err(refusal) => return Ok(Err(refusal)),
    };
    let policy_difficulty = |rule: Option<&AccessRule>| rule.and_then(|rule| rule.policy.pow_difficulty).map(|difficulty| difficulty.get());
    let difficulty: f64 = first_truthy(&[
        gate.verdict.challenge.as_ref().and_then(|challenge| challenge.pow_difficulty),
        gate.session_difficulty,
        policy_difficulty(gate.enforcing.as_ref()),
        policy_difficulty(gate.deferred.as_ref()),
        gate.settings.as_ref().and_then(|settings| settings.get("powDifficulty")).and_then(Value::as_f64),
    ])
    .unwrap_or(DEFAULT_POW_DIFFICULTY);
    let source = services.db.source();
    let minted: MintedChallenge = mint_challenge(pair, request.user, request.dapp, source.now().timestamp_millis(), source.random())?;
    attach_simd(state, services, &gate, request.simd_readings, "PoW", logger).await;
    let components: PoWChallengeComponents = components(&minted, request.user, request.dapp);
    services
        .db
        .store_pow_captcha_record(&gate.provenance.new_challenge(&minted, &components), difficulty, false, false, None)
        .await
        .map_err(|error| error.to_string())?;
    let mut log_data: Map<String, Value> = Map::new();
    log_data.insert("difficulty".to_string(), json!(difficulty));
    Ok(Ok(Issued {
        body: json!({
            "status": "ok",
            "challenge": minted.challenge,
            "difficulty": difficulty,
            "timestamp": minted.requested_at_timestamp.to_string(),
            "signature": { "provider": { "challenge": minted.provider_signature } },
        }),
        pad_bytes: gate.verdict.pad_bytes,
        log_data,
    }))
}

/// A number setting read as `x ?? y` reads it: present unless absent or null.
fn nullish_number(value: Option<&Value>) -> Option<f64> {
    value.filter(|value| !value.is_null()).and_then(Value::as_f64)
}

/// `resolveIconOrderRenderSettings`: each override layered onto the defaults, later ones
/// winning, then the decoys cut to the glyphs the targets leave.
fn resolve_icon_order_render_settings(overrides: &[Option<&Value>]) -> IconOrderRenderSettings {
    let mut resolved: IconOrderRenderSettings = prosopo_icon_order_assets::DEFAULT_RENDER_SETTINGS;
    for over in overrides {
        let field = |key: &str| nullish_number(over.and_then(|over| over.get(key)));
        resolved = IconOrderRenderSettings {
            target_count: field("targetCount").map_or(resolved.target_count, |count| count as usize),
            decoy_count: field("decoyCount").map_or(resolved.decoy_count, |count| count as usize),
            stroke_width: field("strokeWidth").unwrap_or(resolved.stroke_width),
            icon_opacity: field("iconOpacity").unwrap_or(resolved.icon_opacity),
            halo_opacity: field("haloOpacity").unwrap_or(resolved.halo_opacity),
            background_clutter: field("backgroundClutter").unwrap_or(resolved.background_clutter),
        };
    }
    let budget: isize = ICON_ORDER_GLYPH_VOCABULARY as isize - resolved.target_count as isize;
    if resolved.decoy_count as isize > budget {
        resolved.decoy_count = budget.max(0) as usize;
    }
    resolved
}

/// `renderIconOrderImages`.
fn render_icon_order_images(settings: &IconOrderRenderSettings, seeds: &dyn SeedSource) -> Result<RenderedIconOrder, String> {
    render_icon_order(&prosopo_icon_order_assets::DEFAULT_GEOMETRY, settings, Some(seeds.seed())).map_err(|error| error.to_string())
}

/// `buildIconOrderMaintenanceResponse`: a rendered frame nobody stores.
fn icon_order_maintenance_response(user: &str, dapp: &str, seeds: &dyn SeedSource) -> Result<Value, String> {
    let timestamp: u128 = now_ms();
    let images: RenderedIconOrder = render_icon_order_images(&prosopo_icon_order_assets::DEFAULT_RENDER_SETTINGS, seeds)?;
    Ok(json!({
        "status": "ok",
        "challenge": maintenance_challenge(user, dapp),
        "background": prosopo_puzzle_assets::to_data_uri(&images.background),
        "legend": prosopo_puzzle_assets::to_data_uri(&images.legend),
        "legendIconSize": images.legend_icon_size,
        "timestamp": timestamp.to_string(),
        "signature": { "provider": { "challenge": "" } },
    }))
}

/// getIconOrderCaptchaChallenge.ts's `issueIconOrderChallenge`.
async fn issue_icon_order(state: &ChallengeState, services: &VerifyServices, pair: &KeyringPair, gate: &Gate, request: &ChallengeRequest<'_>) -> Result<Issued, String> {
    let challenge = gate.verdict.challenge.as_ref();
    let session_icon_order: Option<Value> = gate.session.as_ref().and_then(|session| session.icon_order.as_ref()).map(bson_json);
    let traffic_icon_order: Option<Value> = challenge.and_then(|challenge| challenge.icon_order_settings.clone()).map(Value::Object);
    let tolerance: f64 = challenge
        .and_then(|challenge| challenge.icon_order_tolerance)
        .or_else(|| gate.session.as_ref().and_then(|session| session.icon_order_tolerance))
        .or_else(|| nullish_number(gate.settings.as_ref().and_then(|settings| settings.get("iconOrderTolerance"))))
        .unwrap_or(ICON_ORDER_TOLERANCE_DEFAULT);
    let render_settings: IconOrderRenderSettings = resolve_icon_order_render_settings(&[
        gate.settings.as_ref().and_then(|settings| settings.get("iconOrder")),
        traffic_icon_order.as_ref().or(session_icon_order.as_ref()),
    ]);
    let source = services.db.source();
    let minted: MintedChallenge = mint_challenge(pair, request.user, request.dapp, source.now().timestamp_millis(), source.random())?;
    let images: RenderedIconOrder = render_icon_order_images(&render_settings, state.seeds.as_ref())?;
    let targets: Vec<StoredIconTarget> = images
        .targets
        .iter()
        .map(|target| StoredIconTarget { x: target.x, y: target.y, size: target.size, kind: target.kind.as_str().to_string() })
        .collect();
    let components: PoWChallengeComponents = components(&minted, request.user, request.dapp);
    services
        .db
        .store_interactive_captcha_record(&gate.provenance.new_challenge(&minted, &components), &InteractiveAnswer::IconOrder { targets, tolerance })
        .await
        .map_err(|error| error.to_string())?;
    let mut log_data: Map<String, Value> = Map::new();
    log_data.insert("tolerance".to_string(), json!(tolerance));
    Ok(Issued {
        body: json!({
            "status": "ok",
            "challenge": minted.challenge,
            "background": prosopo_puzzle_assets::to_data_uri(&images.background),
            "legend": prosopo_puzzle_assets::to_data_uri(&images.legend),
            "legendIconSize": images.legend_icon_size,
            "timestamp": minted.requested_at_timestamp.to_string(),
            "signature": { "provider": { "challenge": minted.provider_signature } },
        }),
        pad_bytes: gate.verdict.pad_bytes,
        log_data,
    })
}

/// A challenge route: its type, the label its log lines use, and what it answers in
/// maintenance mode.
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum ChallengeRoute {
    Pow,
    IconOrder,
}

impl ChallengeRoute {
    fn captcha_type(self) -> CaptchaType {
        match self {
            ChallengeRoute::Pow => CaptchaType::Pow,
            ChallengeRoute::IconOrder => CaptchaType::IconOrder,
        }
    }

    fn label(self) -> &'static str {
        match self {
            ChallengeRoute::Pow => "PoW",
            ChallengeRoute::IconOrder => "icon-order",
        }
    }

    fn maintenance_response(self, user: &str, dapp: &str, seeds: &dyn SeedSource) -> Result<Value, String> {
        match self {
            ChallengeRoute::Pow => Ok(pow_maintenance_response(user, dapp)),
            ChallengeRoute::IconOrder => icon_order_maintenance_response(user, dapp, seeds),
        }
    }
}

fn capitalise(text: &str) -> String {
    let mut chars = text.chars();
    chars.next().map_or_else(String::new, |first| first.to_uppercase().chain(chars).collect())
}

async fn issue(state: &ChallengeState, services: &VerifyServices, pair: &KeyringPair, route: ChallengeRoute, request: &ChallengeRequest<'_>, headers: &http::HeaderMap, logger: &Logger) -> Result<Result<Issued, Refusal>, String> {
    match route {
        ChallengeRoute::Pow => issue_pow(state, services, pair, request, headers, logger).await,
        ChallengeRoute::IconOrder => {
            let gate: Gate = match gate(services, request, route.captcha_type(), headers, logger).await? {
                Ok(gate) => gate,
                Err(refusal) => return Ok(Err(refusal)),
            };
            attach_simd(state, services, &gate, request.simd_readings, route.label(), logger).await;
            issue_icon_order(state, services, pair, &gate, request).await.map(Ok)
        }
    }
}

/// getPoWCaptchaChallenge.ts's handler, and interactiveCaptchaChallenge.ts's for the
/// interactive types.
pub async fn challenge_route(state: &ChallengeState, route: ChallengeRoute, request: Request) -> Response {
    let logger: Logger = logger_of(&request);
    let raw: Value = request.extensions().get::<RequestBody>().map_or_else(|| json!({}), |body| body.0.clone());
    let parsed: Value = match get_challenge_request_body().validate(Some(&raw)) {
        Ok(parsed) => parsed,
        Err(issues) => {
            let cause: ZodLikeError = ZodLikeError {
                message: issues.message(),
                issues: issues.issues.iter().filter_map(|issue| serde_json::to_value(issue).ok()).collect(),
            };
            return api_error(&request, "CAPTCHA.PARSE_ERROR", ErrorContext::new().with("code", 400).with_error(cause), &logger);
        }
    };
    let text = |key: &str| parsed.get(key).and_then(Value::as_str);
    let (user, dapp) = (text("user").unwrap_or_default(), text("dapp").unwrap_or_default());
    for (address, key) in [(dapp, "API.INVALID_SITE_KEY"), (user, "CONTRACT.INVALID_ADDRESS")] {
        if let Err(error) = validate_address(address, key) {
            return handle_errors(&request, &ThrownError::from(error));
        }
    }
    let requested: Requested = Requested::of(&request);
    let label: &str = route.label();
    let dummy = |message: String, warn: bool| {
        let record = || LogRecord::msg(message.clone()).with_data(json!({ "dapp": dapp, "user": user, "sessionId": text("sessionId") }));
        if warn {
            logger.warn(record);
        } else {
            logger.info(record);
        }
        match route.maintenance_response(user, dapp, state.seeds.as_ref()) {
            Ok(body) => send_json(&requested, StatusCode::OK, Vec::new(), &body),
            Err(error) => handle_errors(&request, &ThrownError::from(prosopo_logger::ErrorObject::new("Error", error))),
        }
    };
    if state.maintenance.get() {
        return dummy(format!("Maintenance mode active - returning dummy {label} challenge"), false);
    }
    if get_test_site_key_mode(dapp).is_some() {
        return dummy(format!("Reserved TEST site key - returning dummy {label} challenge"), true);
    }
    let captcha_type: CaptchaType = route.captcha_type();
    let failed = |request: &Request, error: String| {
        if let Some(metrics) = &state.metrics {
            metrics.record_captcha_issue_error(captcha_type);
        }
        logger.error(|| LogRecord::msg(format!("Error in {label} captcha challenge request")).with_err(error.clone()));
        let context: ErrorContext = ErrorContext::new()
            .with("code", 500)
            .with("siteKey", raw.get("dapp").cloned().unwrap_or(Value::Null))
            .with("user", raw.get("user").cloned().unwrap_or(Value::Null))
            .with_error(ThrownError::from(prosopo_logger::ErrorObject::new("Error", error)));
        api_error(request, "API.BAD_REQUEST", context, &logger)
    };
    let (Some(services), Some(pair)) = (state.services.as_ref(), state.pair.as_ref()) else {
        let error = ProsopoError::new(ErrorClass::Env, ErrorSource::message("db not setup! Please call isReady() first"), ErrorOptions::default());
        return handle_errors(&request, &ThrownError::from(error));
    };
    let challenge_request: ChallengeRequest<'_> = ChallengeRequest {
        user,
        dapp,
        session_id: text("sessionId").filter(|id| !id.is_empty()),
        simd_readings: text("simdReadings"),
        origin: header(request.headers(), "origin").filter(|origin| !origin.is_empty()),
        signals: request.extensions().get::<RequestSignals>().cloned(),
    };
    match issue(state, services, pair, route, &challenge_request, request.headers(), &logger).await {
        Ok(Ok(issued)) => {
            logger.info(|| {
                let mut data: Map<String, Value> = Map::new();
                data.insert("captchaType".to_string(), json!(captcha_type.as_str()));
                data.insert("challenge".to_string(), issued.body["challenge"].clone());
                data.extend(issued.log_data.clone());
                data.insert("user".to_string(), json!(user));
                data.insert("dapp".to_string(), json!(dapp));
                data.insert("session".to_string(), json!(challenge_request.session_id));
                LogRecord::msg(format!("{} captcha challenge issued", capitalise(label))).with_data(Value::Object(data))
            });
            if let Some(metrics) = &state.metrics {
                metrics.record_captcha_issued(captcha_type);
            }
            send_json_padded(&requested, &issued.body, issued.pad_bytes)
        }
        Ok(Err(Refusal::NotRegistered)) => api_error(&request, "API.SITE_KEY_NOT_REGISTERED", ErrorContext::new().with("code", 400).with("siteKey", dapp), &logger),
        Ok(Err(Refusal::Invalid(reason))) => api_error(&request, &reason, ErrorContext::new().with("code", 400).with("siteKey", dapp).with("user", user), &logger),
        Ok(Err(Refusal::NoOrigin)) => api_error(
            &request,
            "API.BAD_REQUEST",
            ErrorContext::new().with("error", "Origin header not found").with("code", 400).with("siteKey", dapp).with("user", user),
            &logger,
        ),
        Err(error) => failed(&request, error),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use http::{HeaderMap, HeaderName, HeaderValue};

    #[test]
    fn spreads_set_cookie_as_flatten_does_and_joins_the_rest_as_node_does() {
        let mut headers: HeaderMap = HeaderMap::new();
        for (name, value) in [("host", "h"), ("set-cookie", "s=1"), ("cookie", "a=1"), ("set-cookie", "s=2"), ("cookie", "b=2")] {
            headers.append(HeaderName::from_static(name), HeaderValue::from_static(value));
        }
        let document: Document = request_headers_document(&headers);
        assert_eq!(document, bson::doc! { "host": "h", "set-cookie.0": "s=1", "set-cookie.1": "s=2", "cookie": "a=1; b=2" });
    }

    #[test]
    fn takes_the_first_truthy_difficulty_as_js_or_does() {
        assert_eq!(first_truthy(&[None, Some(0.0), Some(f64::NAN), Some(7.0), Some(9.0)]), Some(7.0));
        assert_eq!(first_truthy(&[None, Some(0.0)]), None);
    }

    /// rust/equivalence/icon-order-settings-vectors.json, written by generate-challenge.ts from
    /// iconOrderRenderer.ts's `resolveIconOrderRenderSettings`.
    #[test]
    fn equivalence_resolves_icon_order_render_settings_as_the_ts_does() {
        let vectors: Value = serde_json::from_str(include_str!("../equivalence/icon-order-settings-vectors.json")).expect("vectors parse");
        let cases: &Vec<Value> = vectors.as_array().expect("cases");
        assert!(cases.len() > 50);
        for case in cases {
            let site: Option<&Value> = Some(&case["site"]).filter(|value| !value.is_null());
            let other: Option<&Value> = Some(&case["other"]).filter(|value| !value.is_null());
            let resolved: IconOrderRenderSettings = resolve_icon_order_render_settings(&[site, other]);
            let actual: Value = json!({
                "targetCount": resolved.target_count,
                "decoyCount": resolved.decoy_count,
                "strokeWidth": resolved.stroke_width,
                "iconOpacity": resolved.icon_opacity,
                "haloOpacity": resolved.halo_opacity,
                "backgroundClutter": resolved.background_clutter,
            });
            for key in ["targetCount", "decoyCount", "strokeWidth", "iconOpacity", "haloOpacity", "backgroundClutter"] {
                assert_eq!(actual[key].as_f64(), case["resolved"][key].as_f64(), "{key} for {case}");
            }
        }
    }

    #[test]
    fn layers_icon_order_overrides_and_cuts_decoys_to_the_glyphs_left() {
        let site: Value = json!({ "targetCount": 4, "strokeWidth": null, "iconOpacity": 0.5 });
        let traffic: Value = json!({ "targetCount": 6, "decoyCount": 9 });
        let resolved: IconOrderRenderSettings = resolve_icon_order_render_settings(&[Some(&site), Some(&traffic)]);
        assert_eq!(resolved.target_count, 6);
        assert_eq!(resolved.decoy_count, 4);
        assert_eq!(resolved.stroke_width, prosopo_icon_order_assets::DEFAULT_RENDER_SETTINGS.stroke_width);
        assert_eq!(resolved.icon_opacity, 0.5);
        let crowded: Value = json!({ "targetCount": 12 });
        assert_eq!(resolve_icon_order_render_settings(&[Some(&crowded)]).decoy_count, 0);
    }
}
