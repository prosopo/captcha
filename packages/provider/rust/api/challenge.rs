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

//! The challenge routes ported so far: `captcha/pow` (captcha/getPoWCaptchaChallenge.ts),
//! `captcha/icon-order`, `captcha/audio` and `captcha/puzzle` (getIconOrderCaptchaChallenge.ts,
//! getAudioCaptchaChallenge.ts and getPuzzleCaptchaChallenge.ts, through
//! interactiveCaptchaChallenge.ts), and `captcha/image` (getImageCaptchaChallenge.ts), with
//! the minting of powTasks.ts, puzzleTasks.ts and interactiveCaptchaManager.ts, maintenanceModeResponses.ts's dummies and
//! trafficFilterRequestTime.ts's `applyTrafficFilterAtRequestTime`.

use crate::api::block::{get_prioritised_access_rule, get_request_user_scope, normalize_headers_for_matching, PrioritisedRuleOptions, ScopeSignals};
use crate::api::captcha::api_error;
use crate::api::express::{header, send_json, Requested};
use crate::api::maintenance::MaintenanceMode;
use crate::api::metrics::ProviderMetrics;
use crate::api::assets::ItemAssetsResolver;
use crate::api::padding::send_json_padded;
use crate::api::public::EnvReader;
use crate::api::pipeline::{handle_errors, validate_address, RequestSignals};
use crate::composite_ip::get_composite_ip_address;
use crate::tasks::audio::{render_audio_clip, resolve_audio_render_settings, AudioBufferOptions, AudioChallengeBuffer, AudioRenderer, RenderedAudioClip};
use crate::tasks::detection::{DetectionServices, DetectorBundlePool, PayloadDecoder};
use crate::mobile_signals::{derive_mobile_verdict, MobileSignals, MobileVerdict};
use crate::tasks::image::{get_random_captchas_and_request_hash, ImageChallenge, ImageChallengeRequest};
use crate::tasks::puzzle::{
    is_puzzle_image_switch_available, render_puzzle_images, resolve_puzzle_piece_scale_range, resolve_puzzle_render_settings, stored_render_settings, PuzzleAssets, PuzzleBackgroundBuffer,
    RenderedPuzzleImages, ScaleRange,
};
use crate::tasks::request::{settings_json, RequestStores, Validation};
use crate::tasks::traffic::{check_traffic_filter, resolve_challenge_policy, resolve_pad_bytes, ResolvedChallengePolicy, TrafficFilterView};
use crate::tasks::verify::{bson_json, VerifyServices};
use axum::extract::Request;
use axum::response::Response;
use bson::{Bson, Document};
use http::StatusCode;
use prosopo_api_router::{RequestBody, RequestI18n, RequestLog};
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError, ThrownError, ZodLikeError};
use prosopo_captcha_severity::{ease_piece_scale_for_touch, ease_tolerance_for_touch, PuzzleDifficultyRange};
use prosopo_database::challenges::{Interactive, InteractiveAnswer, NewChallenge};
use prosopo_database::records::{CompositeIpAddress, StoredIconTarget};
use prosopo_database::session::Session;
use prosopo_icon_order_assets::{render_icon_order, IconOrderRenderSettings, RenderedIconOrder};
use prosopo_keyring::KeyringPair;
use prosopo_logger::{LogRecord, Logger};
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::client::get_test_site_key_mode;
use prosopo_types::datasets::{PoWChallengeComponents, POW_SEPARATOR};
use prosopo_types::ipapi::IpInfoResponse;
use prosopo_locale::{english_text, is_language, is_target_key, I18nLookup};
use prosopo_types::api_types::CaptchaCountConfig;
use prosopo_types::number::JsNumber;
use prosopo_types::provider_api::{captcha_request_body, get_challenge_request_body};
use prosopo_puzzle_assets::{NotchPlacement, PuzzleRenderSettings, DEFAULT_GEOMETRY, DEFAULT_RENDER_SETTINGS};
use prosopo_types::settings::{clamp_image_rounds, ICON_ORDER_TOLERANCE_DEFAULT, PUZZLE_TOLERANCE_DEFAULT};
use prosopo_types::stored::SimdReadingsStage;
use prosopo_types_database::number::{json_to_bson, to_bson_document};
use prosopo_user_access_policy::AccessRule;
use prosopo_util_crypto::u8a::{u8a_to_hex, U8aLike};
use serde_json::{json, Map, Value};
use std::sync::{Arc, OnceLock, RwLock};

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
    pub decoder: Option<Arc<dyn PayloadDecoder>>,
    pub seeds: Arc<dyn SeedSource>,
    /// The process's audio buffer, made on first use as `initAudioChallengeBuffer` makes it.
    pub audio: OnceLock<Arc<AudioChallengeBuffer>>,
    pub puzzle: PuzzleAssets,
    /// `env.datasetId`: the dataset an image challenge draws from unless it names one.
    pub dataset_id: Option<String>,
    /// `env.config.captchas`: the image rounds when nothing else sets them.
    pub captcha_counts: CaptchaCountConfig,
    /// The process environment, which the image route reads its asset URL keys from per
    /// request.
    pub env: EnvReader,
    /// `getSessionIDPrefix(config.host)`, which an escalation's session id starts with.
    pub session_id_prefix: String,
    /// `getDetectorBundlePoolDir()`, where the assign secret is kept.
    pub pool_dir: String,
    pub assign_secret: crate::api::detector::AssignSecret,
}

impl ChallengeState {
    /// `getAudioChallengeBuffer() ?? initAudioChallengeBuffer()`.
    fn audio_buffer(&self) -> Result<Arc<AudioChallengeBuffer>, String> {
        if let Some(buffer) = self.audio.get() {
            return Ok(buffer.clone());
        }
        let render: AudioRenderer = Arc::new(|settings| {
            prosopo_audio_assets::render_audio_challenge(settings, prosopo_audio_assets::SAMPLE_RATE).map_err(|error| error.to_string())
        });
        let buffer: Arc<AudioChallengeBuffer> = AudioChallengeBuffer::create(AudioBufferOptions::default(), render)?;
        Ok(self.audio.get_or_init(|| buffer).clone())
    }
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

pub(crate) fn logger_of(request: &Request) -> Logger {
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
    /// `ipInfo.isMobile` of a valid lookup.
    carrier_network: Option<bool>,
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

/// `req.ipInfo` as the TS object holds it, a key the backend lists but left `undefined` kept
/// as BSON undefined: a typed path's cast drops it, a Mixed path's write makes it `null`.
pub(crate) fn ip_info_literal(info: &IpInfoResponse) -> Result<Bson, String> {
    match info {
        IpInfoResponse::Valid(result) => {
            Ok(Bson::Document(result.entries().into_iter().map(|(key, value)| (key.to_string(), value.as_ref().map_or(Bson::Undefined, json_to_bson))).collect()))
        }
        other => Ok(Bson::Document(to_bson_document(other).map_err(|error| error.to_string())?)),
    }
}

/// What the shared request handling settles before a type issues its challenge.
struct Gate {
    settings: Option<Value>,
    session: Option<Session>,
    deferred: Option<AccessRule>,
    enforcing: Option<AccessRule>,
    session_difficulty: Option<f64>,
    /// The session's `solvedImagesCount`, when set and not zero.
    image_rounds: Option<f64>,
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
async fn gate(
    services: &VerifyServices,
    request: &ChallengeRequest<'_>,
    captcha_type: CaptchaType,
    require_origin: bool,
    headers: &http::HeaderMap,
    logger: &Logger,
) -> Result<Result<Gate, Refusal>, String> {
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
    let (valid_session_id, session_difficulty, image_rounds) = match validation {
        Validation::Valid { session_id, pow_difficulty, image_rounds, .. } => (session_id, pow_difficulty, image_rounds),
        Validation::Invalid(reason) => return Ok(Err(Refusal::Invalid(reason.as_str().to_string()))),
    };
    if require_origin && request.origin.is_none() {
        return Ok(Err(Refusal::NoOrigin));
    }
    let settings: Option<Value> = settings_json(&client);
    let verdict: TrafficVerdict = traffic_verdict(ip_info, settings.as_ref(), logger);
    let stored_ip_info: Option<Bson> = ip_info.map(ip_info_literal).transpose()?;
    Ok(Ok(Gate {
        settings,
        session,
        deferred,
        enforcing,
        session_difficulty,
        image_rounds,
        verdict,
        provenance: Provenance {
            ip_address: get_composite_ip_address(&ip),
            headers: request_headers_document(headers),
            ja4,
            session_id: valid_session_id,
            ip_info: stored_ip_info,
            carrier_network: match ip_info {
                Some(IpInfoResponse::Valid(info)) => info.is_mobile,
                _ => None,
            },
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
    let gate: Gate = match gate(services, request, CaptchaType::Pow, true, headers, logger).await? {
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

/// `buildAudioMaintenanceResponse`: a clip from the buffer, its answer discarded.
fn audio_maintenance_response(user: &str, dapp: &str, buffer: &AudioChallengeBuffer) -> Result<Value, String> {
    let timestamp: u128 = now_ms();
    let rendered: RenderedAudioClip = render_audio_clip(buffer, &resolve_audio_render_settings(&[]))?;
    Ok(json!({
        "status": "ok",
        "challenge": maintenance_challenge(user, dapp),
        "clip": rendered.clip,
        "characterCount": rendered.character_count,
        "timestamp": timestamp.to_string(),
        "signature": { "provider": { "challenge": "" } },
    }))
}

/// getAudioCaptchaChallenge.ts's `issueAudioChallenge`.
async fn issue_audio(state: &ChallengeState, services: &VerifyServices, pair: &KeyringPair, gate: &Gate, request: &ChallengeRequest<'_>) -> Result<Issued, String> {
    let traffic_audio: Option<Value> = gate.verdict.challenge.as_ref().and_then(|challenge| challenge.audio_settings.clone()).map(Value::Object);
    let settings = resolve_audio_render_settings(&[gate.settings.as_ref().and_then(|settings| settings.get("audio")), traffic_audio.as_ref()]);
    let source = services.db.source();
    let minted: MintedChallenge = mint_challenge(pair, request.user, request.dapp, source.now().timestamp_millis(), source.random())?;
    let buffer: Arc<AudioChallengeBuffer> = state.audio_buffer()?;
    let rendered: RenderedAudioClip = tokio::task::spawn_blocking(move || render_audio_clip(&buffer, &settings)).await.map_err(|error| error.to_string())??;
    let components: PoWChallengeComponents = components(&minted, request.user, request.dapp);
    services
        .db
        .store_interactive_captcha_record(&gate.provenance.new_challenge(&minted, &components), &InteractiveAnswer::Audio { answer: rendered.answer.clone() })
        .await
        .map_err(|error| error.to_string())?;
    let mut log_data: Map<String, Value> = Map::new();
    log_data.insert("characterCount".to_string(), json!(rendered.character_count));
    log_data.insert("durationMs".to_string(), json!(rendered.duration_ms));
    Ok(Issued {
        body: json!({
            "status": "ok",
            "challenge": minted.challenge,
            "clip": rendered.clip,
            "characterCount": rendered.character_count,
            "timestamp": minted.requested_at_timestamp.to_string(),
            "signature": { "provider": { "challenge": minted.provider_signature } },
        }),
        pad_bytes: gate.verdict.pad_bytes,
        log_data,
    })
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

/// `buildPuzzleMaintenanceResponse`: a cut frame nobody stores.
fn puzzle_maintenance_response(user: &str, dapp: &str, puzzle: &PuzzleAssets) -> Result<Value, String> {
    let timestamp: u128 = now_ms();
    let images: RenderedPuzzleImages = render_puzzle_images(puzzle.buffer()?.as_ref(), NotchPlacement { target_x: 200.0, target_y: 100.0 }, &DEFAULT_RENDER_SETTINGS, None)?;
    Ok(json!({
        "status": "ok",
        "challenge": maintenance_challenge(user, dapp),
        "background": images.background,
        "piece": images.piece,
        "pieceSize": images.piece_size,
        "originX": 60,
        "originY": 100,
        "timestamp": timestamp.to_string(),
        "signature": { "provider": { "challenge": "" } },
    }))
}

/// `Math.floor(Math.random() * (max - min + 1)) + min`.
fn random_between(random: f64, min: f64, max: f64) -> f64 {
    (random * (max - min + 1.0)).floor() + min
}

/// getPuzzleCaptchaChallenge.ts's `issuePuzzleChallenge`.
async fn issue_puzzle(state: &ChallengeState, services: &VerifyServices, pair: &KeyringPair, gate: &Gate, request: &ChallengeRequest<'_>) -> Result<Issued, String> {
    let challenge = gate.verdict.challenge.as_ref();
    let session: Option<&Session> = gate.session.as_ref();
    let headers: &Document = &gate.provenance.headers;
    let mobile: MobileVerdict = derive_mobile_verdict(&MobileSignals {
        user_agent: headers.get_str("user-agent").ok(),
        headers: Some(headers),
        carrier_network: gate.provenance.carrier_network,
        tcp_mss: session.and_then(|session| session.tcp_mss),
        web_view: session.map(|session| session.web_view),
        device_capability: None,
        touch_event_count: None,
    });
    let ease_for_touch: bool = mobile.is_mobile && mobile.corroborated;
    let requested_tolerance: Option<f64> = challenge
        .and_then(|challenge| challenge.puzzle_tolerance)
        .or_else(|| session.and_then(|session| session.puzzle_tolerance))
        .or_else(|| nullish_number(gate.settings.as_ref().and_then(|settings| settings.get("puzzleTolerance"))));
    let tolerance: f64 = match requested_tolerance {
        Some(tolerance) if ease_for_touch => ease_tolerance_for_touch(tolerance),
        Some(tolerance) => tolerance,
        None => PUZZLE_TOLERANCE_DEFAULT,
    };
    let site_puzzle: Option<&Value> = gate.settings.as_ref().and_then(|settings| settings.get("puzzle"));
    let routed: Option<Value> = challenge
        .and_then(|challenge| challenge.puzzle_settings.clone())
        .map(Value::Object)
        .or_else(|| session.and_then(|session| session.puzzle.as_ref()).map(bson_json));
    let render_settings: PuzzleRenderSettings = resolve_puzzle_render_settings(&[site_puzzle, routed.as_ref()]);
    let range: ScaleRange = resolve_puzzle_piece_scale_range(&[site_puzzle, routed.as_ref()]);
    let range: ScaleRange = if ease_for_touch {
        let eased: PuzzleDifficultyRange = ease_piece_scale_for_touch(PuzzleDifficultyRange { min: range.min, max: range.max });
        ScaleRange { min: eased.min, max: eased.max }
    } else {
        range
    };
    let piece_size: u32 = state.puzzle.sample_piece_size(range);
    let source = services.db.source();
    let minted: MintedChallenge = mint_challenge(pair, request.user, request.dapp, source.now().timestamp_millis(), source.random())?;
    let target_x: f64 = random_between(source.random(), 150.0, 280.0);
    let target_y: f64 = random_between(source.random(), 30.0, 170.0);
    let origin_x: f64 = random_between(source.random(), 20.0, 130.0);
    let origin_y: f64 = random_between(source.random(), 30.0, 170.0);
    let components: PoWChallengeComponents = components(&minted, request.user, request.dapp);
    services
        .db
        .store_interactive_captcha_record(&gate.provenance.new_challenge(&minted, &components), &InteractiveAnswer::Puzzle { target_x, target_y, origin_x, origin_y, tolerance })
        .await
        .map_err(|error| error.to_string())?;
    let buffer: Arc<PuzzleBackgroundBuffer> = state.puzzle.buffer()?;
    let placement: NotchPlacement = NotchPlacement { target_x, target_y };
    let images: RenderedPuzzleImages = tokio::task::spawn_blocking(move || render_puzzle_images(&buffer, placement, &render_settings, Some(piece_size)))
        .await
        .map_err(|error| error.to_string())??;
    let mut render: Map<String, Value> = Map::new();
    if let Some(level) = session.and_then(|session| session.puzzle_level) {
        render.insert("level".to_string(), json!(level));
    }
    render.insert("pieceSize".to_string(), json!(images.piece_size));
    render.insert(
        "geometry".to_string(),
        json!({ "width": DEFAULT_GEOMETRY.width, "height": DEFAULT_GEOMETRY.height, "notchSize": DEFAULT_GEOMETRY.notch_size }),
    );
    render.insert("settings".to_string(), stored_render_settings(&render_settings));
    render.insert("backgroundSeed".to_string(), json!(images.background_seed));
    render.insert("renderSeed".to_string(), json!(images.render_seed));
    let patched: Result<(), String> = match to_bson_document(&json!({ "render": render })) {
        Ok(update) => services.db.update_interactive_captcha_record(Interactive::Puzzle, &minted.challenge, &update).await.map_err(|error| error.to_string()),
        Err(error) => Err(error.to_string()),
    };
    if let Err(error) = patched {
        services.logger.warn(|| LogRecord::msg("Failed to patch puzzle render inputs onto the challenge record").with_err(error));
    }
    let mut log_data: Map<String, Value> = Map::new();
    log_data.insert("tolerance".to_string(), json!(tolerance));
    log_data.insert("pieceSize".to_string(), json!(images.piece_size));
    log_data.insert("mobileScore".to_string(), json!(mobile.score));
    log_data.insert("mobileCorroborated".to_string(), json!(u8::from(mobile.corroborated)));
    let mut body: Value = json!({
        "status": "ok",
        "challenge": minted.challenge,
        "background": images.background,
        "piece": images.piece,
        "pieceSize": images.piece_size,
        "originX": origin_x,
        "originY": origin_y,
        "timestamp": minted.requested_at_timestamp.to_string(),
        "signature": { "provider": { "challenge": minted.provider_signature } },
    });
    if is_puzzle_image_switch_available(Some(gate.settings.as_ref().unwrap_or(&json!({})))) {
        body["imageSwitchAvailable"] = json!(true);
    }
    Ok(Issued { body, pad_bytes: gate.verdict.pad_bytes, log_data })
}

/// A challenge route: its type, the label its log lines use, and what it answers in
/// maintenance mode.
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum ChallengeRoute {
    Pow,
    IconOrder,
    Audio,
    Puzzle,
}

impl ChallengeRoute {
    fn captcha_type(self) -> CaptchaType {
        match self {
            ChallengeRoute::Pow => CaptchaType::Pow,
            ChallengeRoute::IconOrder => CaptchaType::IconOrder,
            ChallengeRoute::Audio => CaptchaType::Audio,
            ChallengeRoute::Puzzle => CaptchaType::Puzzle,
        }
    }

    fn label(self) -> &'static str {
        match self {
            ChallengeRoute::Pow => "PoW",
            ChallengeRoute::IconOrder => "icon-order",
            ChallengeRoute::Audio => "audio",
            ChallengeRoute::Puzzle => "puzzle",
        }
    }

    fn maintenance_response(self, user: &str, dapp: &str, state: &ChallengeState) -> Result<Value, String> {
        match self {
            ChallengeRoute::Pow => Ok(pow_maintenance_response(user, dapp)),
            ChallengeRoute::IconOrder => icon_order_maintenance_response(user, dapp, state.seeds.as_ref()),
            ChallengeRoute::Audio => audio_maintenance_response(user, dapp, state.audio_buffer()?.as_ref()),
            ChallengeRoute::Puzzle => puzzle_maintenance_response(user, dapp, &state.puzzle),
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
        ChallengeRoute::IconOrder | ChallengeRoute::Audio | ChallengeRoute::Puzzle => {
            let gate: Gate = match gate(services, request, route.captcha_type(), true, headers, logger).await? {
                Ok(gate) => gate,
                Err(refusal) => return Ok(Err(refusal)),
            };
            attach_simd(state, services, &gate, request.simd_readings, route.label(), logger).await;
            match route {
                ChallengeRoute::Audio => issue_audio(state, services, pair, &gate, request).await.map(Ok),
                ChallengeRoute::Puzzle => issue_puzzle(state, services, pair, &gate, request).await.map(Ok),
                _ => issue_icon_order(state, services, pair, &gate, request).await.map(Ok),
            }
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
        match route.maintenance_response(user, dapp, state) {
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

/// `buildImageMaintenanceResponse`: no captchas, nothing signed.
fn image_maintenance_response() -> Value {
    json!({
        "status": "ok",
        "captchas": [],
        "requestHash": "",
        "timestamp": now_ms().to_string(),
        "signature": { "provider": { "requestHash": "" } },
    })
}

/// `localiseTarget`: a catalogued label in the user's language with its key and English text;
/// any other label as it is, logged for someone to translate.
fn localise_target(captcha: &mut Map<String, Value>, i18n: Option<&RequestI18n>, logger: &Logger) {
    let target: String = captcha.get("target").and_then(Value::as_str).unwrap_or_default().to_string();
    if is_target_key(&target) {
        let key: String = format!("TARGET.{target}");
        let translated: String = i18n.map_or_else(|| english_text(&key), |i18n| I18nLookup::t(&i18n.lookup(), &key));
        captcha.insert("target".to_string(), json!(translated));
        captcha.insert("targetKey".to_string(), json!(target));
        captcha.insert("targetEn".to_string(), json!(english_text(&key)));
        return;
    }
    logger.warn(|| LogRecord::msg("Captcha target has no translation key").with_data(json!({ "target": target })));
    captcha.insert("target".to_string(), json!(target));
    captcha.insert("targetEn".to_string(), json!(target));
}

/// A drawn captcha as the answer serves it: localised, its items' URLs resolved.
fn served_captcha(captcha: &Document, resolver: Option<&ItemAssetsResolver>, i18n: Option<&RequestI18n>, logger: &Logger) -> Result<Value, String> {
    let Value::Object(mut served) = bson_json(&Bson::Document(captcha.clone())) else {
        return Err("a captcha is not a document".to_string());
    };
    localise_target(&mut served, i18n, logger);
    if let (Some(resolver), Some(Value::Array(items))) = (resolver, served.get_mut("items")) {
        for item in items.iter_mut() {
            let data: String = item.get("data").and_then(Value::as_str).unwrap_or_default().to_string();
            let resolved: String = resolver.resolver().resolve_asset_url(&data)?;
            if !resolved.is_empty() {
                item["data"] = json!(resolved);
            }
        }
    }
    Ok(Value::Object(served))
}

/// `ipAddress.toString()` for the `Address4` or `Address6` the TS hands the signed resolver:
/// neither class defines `toString`, so a URL bound to the client's IP is bound to this.
const IP_ADDRESS_AS_STRING: &str = "[object Object]";

/// A number setting read as `x || y` reads it: present unless absent, zero or NaN.
fn truthy_number(value: Option<f64>) -> Option<f64> {
    value.filter(|value| *value != 0.0 && !value.is_nan())
}

/// What the image route answers, short of a refusal: the challenge, or an error passed on.
enum ImageFailure {
    Refused(Refusal),
    Failed(ThrownError),
}

impl From<String> for ImageFailure {
    fn from(error: String) -> Self {
        ImageFailure::Failed(ThrownError::from(prosopo_logger::ErrorObject::new("Error", error)))
    }
}

impl From<ProsopoError> for ImageFailure {
    fn from(error: ProsopoError) -> Self {
        ImageFailure::Failed(ThrownError::from(error))
    }
}

/// getImageCaptchaChallenge.ts from the client record on, inside its `try`.
#[allow(clippy::too_many_arguments)]
async fn issue_image(
    state: &ChallengeState,
    services: &VerifyServices,
    pair: &KeyringPair,
    request: &ChallengeRequest<'_>,
    dataset_id: &str,
    headers: &http::HeaderMap,
    i18n: Option<&RequestI18n>,
    logger: &Logger,
) -> Result<(Value, Option<f64>, f64), ImageFailure> {
    let gate: Gate = gate(services, request, CaptchaType::Image, false, headers, logger).await?.map_err(ImageFailure::Refused)?;
    let traffic_rounds: Option<f64> = gate.verdict.challenge.as_ref().and_then(|challenge| challenge.solved_images_count);
    let policy = |rule: &Option<AccessRule>, pick: fn(&AccessRule) -> Option<JsNumber>| truthy_number(rule.as_ref().and_then(pick).map(JsNumber::get));
    let setting = |key: &str| gate.settings.as_ref().and_then(|settings| settings.get(key)).and_then(Value::as_f64);
    let solved: f64 = clamp_image_rounds(
        truthy_number(traffic_rounds)
            .or(truthy_number(gate.image_rounds))
            .or_else(|| policy(&gate.enforcing, |rule| rule.policy.solved_images_count()))
            .or_else(|| policy(&gate.deferred, |rule| rule.policy.solved_images_count()))
            .unwrap_or(state.captcha_counts.solved.count.get()),
        setting("imageMinRounds"),
        setting("imageMaxRounds"),
    );
    let unsolved: f64 = policy(&gate.enforcing, |rule| rule.policy.unsolved_images_count)
        .or_else(|| policy(&gate.deferred, |rule| rule.policy.unsolved_images_count))
        .unwrap_or(state.captcha_counts.unsolved.count.get());
    attach_simd(state, services, &gate, request.simd_readings, "image", logger).await;
    let challenge: ImageChallenge = get_random_captchas_and_request_hash(
        &services.db,
        pair,
        &ImageChallengeRequest {
            dataset_id,
            user: request.user,
            ip_address: &gate.provenance.ip_address,
            solved_count: solved,
            unsolved_count: unsolved,
            threshold: setting("imageThreshold").unwrap_or(0.8),
            session_id: gate.provenance.session_id.as_deref(),
            ip_info: gate.provenance.ip_info.as_ref(),
        },
    )
    .await?;
    let now_ms: f64 = services.db.source().now().timestamp_millis() as f64;
    let resolver: Option<ItemAssetsResolver> = ItemAssetsResolver::from_env(state.env.as_ref(), Some(IP_ADDRESS_AS_STRING))?.map(|resolver| match resolver {
        ItemAssetsResolver::Sealed(sealed) => ItemAssetsResolver::Sealed(crate::api::assets::SealedAssetsResolver { now_ms: Some(now_ms), ..sealed }),
        ItemAssetsResolver::Signed(signed) => ItemAssetsResolver::Signed(crate::api::assets::SignedAssetsResolver { now_ms: Some(now_ms), ..signed }),
    });
    let captchas: Vec<Value> = challenge.captchas.iter().map(|captcha| served_captcha(captcha, resolver.as_ref(), i18n, logger)).collect::<Result<_, String>>()?;
    let language: &str = i18n.map(|i18n| i18n.language.as_str()).filter(|language| is_language(language)).unwrap_or("en");
    let body: Value = json!({
        "status": "ok",
        "captchas": captchas,
        "language": language,
        "requestHash": challenge.request_hash,
        "timestamp": challenge.timestamp.to_string(),
        "signature": { "provider": { "requestHash": challenge.signed_request_hash } },
    });
    Ok((body, gate.verdict.pad_bytes, solved))
}

/// getImageCaptchaChallenge.ts's handler.
pub async fn image_challenge_route(state: &ChallengeState, request: Request) -> Response {
    let logger: Logger = logger_of(&request);
    let signals: Option<RequestSignals> = request.extensions().get::<RequestSignals>().cloned();
    if signals.as_ref().is_none_or(|signals| signals.ip.is_empty()) {
        return api_error(&request, "API.BAD_REQUEST", ErrorContext::new().with("code", 400).with("error", "IP address not found"), &logger);
    }
    let raw: Value = request.extensions().get::<RequestBody>().map_or_else(|| json!({}), |body| body.0.clone());
    let parsed: Value = match captcha_request_body().validate(Some(&raw)) {
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
    let dataset_id: Option<String> = match parsed.get("datasetId").filter(|id| !id.is_null()) {
        Some(Value::String(id)) => Some(id.clone()),
        Some(other) => Some(other.to_string()),
        None => state.dataset_id.clone(),
    };
    let Some(dataset_id) = dataset_id.filter(|id| !id.is_empty()) else {
        let context: ErrorContext = ErrorContext::new().with("code", 400).with("error", "No dataset available. Please upload a dataset first.");
        return api_error(&request, "API.BAD_REQUEST", context, &logger);
    };
    for (address, key) in [(dapp, "API.INVALID_SITE_KEY"), (user, "CONTRACT.INVALID_ADDRESS")] {
        if let Err(error) = validate_address(address, key) {
            return handle_errors(&request, &ThrownError::from(error));
        }
    }
    let requested: Requested = Requested::of(&request);
    let dummy_record = |message: &str| LogRecord::msg(message).with_data(json!({ "dapp": dapp, "user": user, "sessionId": text("sessionId") }));
    if state.maintenance.get() {
        logger.info(|| dummy_record("Maintenance mode active - returning dummy image challenge"));
        return send_json(&requested, StatusCode::OK, Vec::new(), &image_maintenance_response());
    }
    if get_test_site_key_mode(dapp).is_some() {
        logger.warn(|| dummy_record("Reserved TEST site key - returning dummy image challenge"));
        return send_json(&requested, StatusCode::OK, Vec::new(), &image_maintenance_response());
    }
    let (Some(services), Some(pair)) = (state.services.as_ref(), state.pair.as_ref()) else {
        let error = ProsopoError::new(ErrorClass::Env, ErrorSource::message("db not setup! Please call isReady() first"), ErrorOptions::default());
        return handle_errors(&request, &ThrownError::from(error));
    };
    let challenge_request: ChallengeRequest<'_> = ChallengeRequest {
        user,
        dapp,
        session_id: text("sessionId").filter(|id| !id.is_empty()),
        simd_readings: text("simdReadings"),
        origin: None,
        signals,
    };
    let i18n: Option<RequestI18n> = request.extensions().get::<RequestI18n>().map(|i18n| RequestI18n { i18n: i18n.i18n.clone(), language: i18n.language.clone() });
    let headers: http::HeaderMap = request.headers().clone();
    match issue_image(state, services, pair, &challenge_request, &dataset_id, &headers, i18n.as_ref(), &logger).await {
        Ok((body, pad_bytes, solved)) => {
            logger.info(|| {
                LogRecord::msg("Image captcha challenge issued").with_data(json!({
                    "captchaType": CaptchaType::Image.as_str(),
                    "requestHash": body["requestHash"],
                    "solvedImagesCount": solved,
                    "user": user,
                    "dapp": dapp,
                    "sessionId": text("sessionId"),
                }))
            });
            if let Some(metrics) = &state.metrics {
                metrics.record_captcha_issued(CaptchaType::Image);
            }
            send_json_padded(&requested, &body, pad_bytes)
        }
        Err(ImageFailure::Refused(Refusal::NotRegistered)) => api_error(&request, "API.SITE_KEY_NOT_REGISTERED", ErrorContext::new().with("code", 400).with("siteKey", dapp), &logger),
        Err(ImageFailure::Refused(Refusal::Invalid(reason))) => {
            api_error(&request, &reason, ErrorContext::new().with("code", 400).with("siteKey", dapp).with("user", user), &logger)
        }
        Err(ImageFailure::Refused(Refusal::NoOrigin)) => api_error(&request, "API.BAD_REQUEST", ErrorContext::new().with("code", 400), &logger),
        Err(ImageFailure::Failed(error)) => {
            if let Some(metrics) = &state.metrics {
                metrics.record_captcha_issue_error(CaptchaType::Image);
            }
            logger.error(|| LogRecord::msg("Error in image captcha challenge request").with_data(json!({})).with_err(error.to_json()));
            let context: ErrorContext = ErrorContext::new().with_error(error).with("code", 500).with("params", json!({}));
            api_error(&request, "API.BAD_REQUEST", context, &logger)
        }
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
