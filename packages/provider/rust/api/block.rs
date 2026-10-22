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

//! block.ts, blacklistRequestInspector.ts and hardBlockVerdictCache.ts: a request matched by an
//! access-policy Block rule is refused with a 403 (and a blocked session stored), before any
//! captcha route sees it.

use crate::api::express::{header, send_json, Requested};
use crate::api::maintenance::MaintenanceMode;
use crate::api::metrics::ProviderMetrics;
use crate::api::pipeline::RequestSignals;
use crate::composite_ip::get_composite_ip_address;
use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::Response;
use bson::{doc, DateTime, Document};
use futures_util::future::{BoxFuture, FutureExt, Shared};
use http::{HeaderMap, StatusCode};
use indexmap::IndexMap;
use num_bigint::BigInt;
use prosopo_api_router::{RequestBody, RequestI18n, RequestLog};
use prosopo_captcha_severity::{captcha_policy_severity, CaptchaPolicySeverityInput};
use prosopo_database::provider::ProviderDatabase;
use prosopo_database::session::Session;
use prosopo_locale::{is_translation_key, I18nLookup};
use prosopo_logger::{LogRecord, Logger};
use prosopo_types::ipapi::IpInfoResponse;
use prosopo_types::provider_api::API_PREFIX;
use prosopo_user_access_policy::{
    access_rule_header_matches, classify_browser, classify_os, describe_matched_rule, make_access_rule_hash, user_scope_input, AccessPolicyType, AccessRule,
    AccessRulesFilter, AccessRulesReader, FilterScopeMatch, PolicyScope, UserScope, HEADER_RULE_MARKER,
};
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

pub const DEFAULT_VERDICT_CACHE_TTL_MS: f64 = 10_000.0;
pub const DEFAULT_VERDICT_CACHE_MAX_ENTRIES: usize = 50_000;

fn now_ms() -> f64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map_or(0.0, |elapsed| elapsed.as_millis() as f64)
}

type Candidates = Shared<BoxFuture<'static, Vec<AccessRule>>>;

struct CacheState {
    /// Least recently used first.
    store: IndexMap<String, (Vec<AccessRule>, f64)>,
    inflight: HashMap<String, (u64, Candidates)>,
    generation: u64,
    next_flight: u64,
}

/// The time in epoch milliseconds.
pub type Clock = Arc<dyn Fn() -> f64 + Send + Sync>;

/// `HardBlockVerdictCache`: candidate rules per scope for a few seconds, and one lookup at a
/// time per scope however many requests ask for it at once.
pub struct HardBlockVerdictCache {
    ttl_ms: f64,
    max_entries: usize,
    clock: Clock,
    state: Mutex<CacheState>,
}

impl Default for HardBlockVerdictCache {
    fn default() -> HardBlockVerdictCache {
        HardBlockVerdictCache::new(DEFAULT_VERDICT_CACHE_TTL_MS, DEFAULT_VERDICT_CACHE_MAX_ENTRIES)
    }
}

impl HardBlockVerdictCache {
    pub fn new(ttl_ms: f64, max_entries: usize) -> HardBlockVerdictCache {
        HardBlockVerdictCache::with_clock(ttl_ms, max_entries, Arc::new(now_ms))
    }

    pub fn with_clock(ttl_ms: f64, max_entries: usize, clock: Clock) -> HardBlockVerdictCache {
        HardBlockVerdictCache {
            ttl_ms,
            max_entries,
            clock,
            state: Mutex::new(CacheState {
                store: IndexMap::new(),
                inflight: HashMap::new(),
                generation: 0,
                next_flight: 0,
            }),
        }
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, CacheState> {
        self.state.lock().unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    fn get_locked(&self, state: &mut CacheState, key: &str) -> Option<Vec<AccessRule>> {
        let (value, expires_at) = state.store.shift_remove(key)?;
        if expires_at <= (self.clock)() {
            return None;
        }
        state.store.insert(key.to_string(), (value.clone(), expires_at));
        Some(value)
    }

    fn set_locked(&self, state: &mut CacheState, key: &str, value: Vec<AccessRule>) {
        state.store.shift_remove(key);
        if state.store.len() >= self.max_entries {
            state.store.shift_remove_index(0);
        }
        state.store.insert(key.to_string(), (value, (self.clock)() + self.ttl_ms));
    }

    /// The cached rules while fresh; reading one makes it the most recently used, without
    /// extending its life.
    pub fn get(&self, key: &str) -> Option<Vec<AccessRule>> {
        self.get_locked(&mut self.lock(), key)
    }

    /// Stored for the TTL, evicting the least recently used entry when full.
    pub fn set(&self, key: &str, value: Vec<AccessRule>) {
        self.set_locked(&mut self.lock(), key, value);
    }

    pub async fn get_or_compute(&self, key: &str, compute: impl FnOnce() -> BoxFuture<'static, Vec<AccessRule>>) -> Vec<AccessRule> {
        let joined: Result<Candidates, (u64, Candidates, u64)> = {
            let mut state = self.lock();
            if let Some(cached) = self.get_locked(&mut state, key) {
                return cached;
            }
            match state.inflight.get(key) {
                Some((_, shared)) => Ok(shared.clone()),
                None => {
                    let shared: Candidates = compute().shared();
                    state.next_flight += 1;
                    let flight: u64 = state.next_flight;
                    state.inflight.insert(key.to_string(), (flight, shared.clone()));
                    Err((flight, shared, state.generation))
                }
            }
        };
        let (flight, shared, generation) = match joined {
            Ok(shared) => return shared.await,
            Err(started) => started,
        };
        let value: Vec<AccessRule> = shared.await;
        let mut state = self.lock();
        if generation == state.generation {
            self.set_locked(&mut state, key, value.clone());
        }
        if state.inflight.get(key).is_some_and(|(current, _)| *current == flight) {
            state.inflight.remove(key);
        }
        value
    }

    /// Everything forgotten, and lookups already running kept out of the cache.
    pub fn clear(&self) {
        let mut state = self.lock();
        state.generation += 1;
        state.store.clear();
        state.inflight.clear();
    }

    pub fn size(&self) -> usize {
        self.lock().store.len()
    }

    pub fn inflight_size(&self) -> usize {
        self.lock().inflight.len()
    }
}

/// `hardBlockCacheKey`.
pub fn hard_block_cache_key(client_id: Option<&str>, scope: &UserScope, block_only: bool, include_deferred: bool) -> String {
    let flags: String = format!("{}{}", if block_only { "1" } else { "0" }, if include_deferred { "d" } else { "" });
    let big = |value: &Option<BigInt>| value.as_ref().map(BigInt::to_string).unwrap_or_default();
    let text = |value: &Option<String>| value.clone().unwrap_or_default();
    let parts: [String; 12] = [
        client_id.unwrap_or_default().to_string(),
        big(&scope.numeric_ip),
        big(&scope.numeric_ip_mask_min),
        big(&scope.numeric_ip_mask_max),
        text(&scope.user_id),
        text(&scope.ja4_hash),
        text(&scope.headers_hash),
        text(&scope.user_agent_hash),
        text(&scope.head_hash),
        text(&scope.coords),
        text(&scope.country_code),
        scope.asn.map(|asn| prosopo_util::number_to_string(asn.get())).unwrap_or_default(),
    ];
    format!("{flags}|{}", parts.join("|"))
}

/// What `getRequestUserScope` builds a scope from.
#[derive(Debug, Clone, Copy, Default)]
pub struct ScopeSignals<'a> {
    pub user_agent: Option<&'a str>,
    pub ja4: Option<&'a str>,
    pub ip: Option<&'a str>,
    pub user: Option<&'a str>,
    pub head_hash: Option<&'a str>,
    pub coords: Option<&'a str>,
    pub country_code: Option<&'a str>,
    pub asn: Option<f64>,
    pub web_bot_auth_agent: Option<&'a str>,
}

/// `getRequestUserScope`, in record form: what `userScopeInput` reads.
pub fn get_request_user_scope(signals: ScopeSignals<'_>) -> Value {
    fn put(record: &mut Map<String, Value>, key: &str, value: Option<&str>) {
        if let Some(value) = value.filter(|value| !value.is_empty()) {
            record.insert(key.to_string(), json!(value));
        }
    }
    let user_agent: Option<&str> = signals.user_agent.filter(|agent| !agent.is_empty());
    let mut record: Map<String, Value> = Map::new();
    put(&mut record, "userId", signals.user);
    put(&mut record, "ja4Hash", signals.ja4);
    put(&mut record, "userAgent", user_agent);
    put(&mut record, "ip", signals.ip);
    put(&mut record, "headHash", signals.head_hash);
    put(&mut record, "coords", signals.coords);
    put(&mut record, "countryCode", signals.country_code);
    if let Some(asn) = signals.asn {
        record.insert("asn".to_string(), json!(asn));
    }
    put(&mut record, "webBotAuthAgent", signals.web_bot_auth_agent);
    record.insert("os".to_string(), json!(classify_os(user_agent).as_str()));
    record.insert("browser".to_string(), json!(classify_browser(user_agent).as_str()));
    record.insert("headerMatch".to_string(), json!(HEADER_RULE_MARKER));
    Value::Object(record)
}

/// `normalizeHeadersForMatching`.
pub fn normalize_headers_for_matching(headers: &HeaderMap) -> HashMap<String, String> {
    headers.keys().filter_map(|name| Some((name.as_str().to_string(), header(headers, name.as_str())?))).collect()
}

/// `normalizeHeadersForMatching` over headers as a record stores them: string values, and
/// arrays joined, under lower-cased names.
pub fn normalize_stored_headers(headers: &Map<String, Value>) -> HashMap<String, String> {
    /// `String(value)`.
    fn text(value: &Value) -> String {
        match value {
            Value::String(text) => text.clone(),
            Value::Number(number) => prosopo_util::number_to_string(number.as_f64().unwrap_or(f64::NAN)),
            Value::Null => "null".to_string(),
            Value::Bool(flag) => flag.to_string(),
            Value::Array(items) => items.iter().map(|item| if item.is_null() { String::new() } else { text(item) }).collect::<Vec<String>>().join(","),
            Value::Object(_) => "[object Object]".to_string(),
        }
    }
    headers
        .iter()
        .filter_map(|(name, value)| match value {
            Value::String(text) => Some((name.to_lowercase(), text.clone())),
            Value::Array(items) => Some((name.to_lowercase(), items.iter().map(text).collect::<Vec<String>>().join(", "))),
            _ => None,
        })
        .collect()
}

/// The scalar user-scope fields, each one point of specificity when a rule sets it.
fn scalar_fields(scope: &UserScope) -> [Option<String>; 12] {
    [
        scope.user_id.clone(),
        scope.ja4_hash.clone(),
        scope.headers_hash.clone(),
        scope.user_agent_hash.clone(),
        scope.head_hash.clone(),
        scope.coords.clone(),
        scope.country_code.clone(),
        scope.asn.map(|asn| prosopo_util::number_to_string(asn.get())),
        scope.os.clone(),
        scope.browser.clone(),
        scope.header_match.clone(),
        scope.web_bot_auth_agent.clone(),
    ]
}

fn has_ip_constraint(rule: &AccessRule) -> bool {
    rule.scope.numeric_ip.is_some() || (rule.scope.numeric_ip_mask_min.is_some() && rule.scope.numeric_ip_mask_max.is_some())
}

fn ip_matches(rule: &AccessRule, request_ip: Option<&BigInt>) -> bool {
    if !has_ip_constraint(rule) {
        return true;
    }
    let Some(request_ip) = request_ip else {
        return false;
    };
    match (&rule.scope.numeric_ip, &rule.scope.numeric_ip_mask_min, &rule.scope.numeric_ip_mask_max) {
        (Some(ip), _, _) => request_ip == ip,
        (None, Some(min), Some(max)) => request_ip >= min && request_ip <= max,
        _ => true,
    }
}

fn rule_applies(rule: &AccessRule, request: &UserScope, client_id: Option<&str>, headers: &HashMap<String, String>) -> bool {
    if rule.client_id.is_some() && rule.client_id.as_deref() != client_id {
        return false;
    }
    if let (None, Some(client_id), Some(excluded)) = (&rule.client_id, client_id, &rule.excluded_client_ids) {
        if excluded.iter().any(|excluded| excluded == client_id) {
            return false;
        }
    }
    let wanted: [Option<String>; 12] = scalar_fields(&rule.scope);
    let have: [Option<String>; 12] = scalar_fields(request);
    if wanted.iter().zip(&have).any(|(wanted, have)| wanted.is_some() && wanted != have) {
        return false;
    }
    ip_matches(rule, request.numeric_ip.as_ref()) && access_rule_header_matches(rule, headers)
}

fn specificity(rule: &AccessRule, client_id: Option<&str>) -> f64 {
    let client: usize = usize::from(rule.client_id.is_some() && rule.client_id.as_deref() == client_id);
    let scalars: usize = scalar_fields(&rule.scope).iter().filter(|field| field.is_some()).count();
    (client + scalars + usize::from(has_ip_constraint(rule))) as f64
}

/// Block outranks every Restrict; Restricts rank by the shared captcha severity.
fn harshness(rule: &AccessRule) -> f64 {
    if rule.policy.kind == AccessPolicyType::Block {
        return 9_007_199_254_740_991.0;
    }
    captcha_policy_severity(&CaptchaPolicySeverityInput {
        captcha_type: rule.policy.captcha_type.map(|captcha_type| captcha_type.as_str()),
        solved_images_count: rule.policy.solved_images_count().map(|count| count.get()),
        pow_difficulty: rule.policy.pow_difficulty.map(|difficulty| difficulty.get()),
    })
}

/// `rankCandidateRules`: the rules that apply, most specific first, harshest first among
/// equals.
pub fn rank_candidate_rules(rules: Vec<AccessRule>, request: &UserScope, client_id: Option<&str>, headers: &HashMap<String, String>) -> Vec<AccessRule> {
    let mut applying: Vec<AccessRule> = rules.into_iter().filter(|rule| rule_applies(rule, request, client_id, headers)).collect();
    applying.sort_by(|a, b| {
        let by_specificity: f64 = specificity(b, client_id) - specificity(a, client_id);
        let delta: f64 = if by_specificity != 0.0 { by_specificity } else { harshness(b) - harshness(a) };
        delta.partial_cmp(&0.0).unwrap_or(std::cmp::Ordering::Equal)
    });
    applying
}

/// The rules looked up for a request, kept for the rest of it.
#[derive(Clone, Default)]
pub struct RequestRuleMemo(pub Arc<Mutex<HashMap<String, Vec<AccessRule>>>>);

#[derive(Default)]
pub struct PrioritisedRuleOptions<'a> {
    pub block_only: bool,
    pub include_deferred: bool,
    pub memo: Option<&'a RequestRuleMemo>,
    pub skip_cache: bool,
}

/// `getPrioritisedAccessRule`: the rules that apply to the request, most specific first. An
/// error when the scope does not parse, as the TS throws.
pub async fn get_prioritised_access_rule(
    storage: Arc<dyn AccessRulesReader>,
    cache: &HardBlockVerdictCache,
    scope: &Value,
    client_id: Option<&str>,
    headers: &HashMap<String, String>,
    options: PrioritisedRuleOptions<'_>,
) -> Result<Vec<AccessRule>, String> {
    let parsed: Value = user_scope_input().validate(Some(scope)).map_err(|error| error.to_string())?;
    let parsed: UserScope = serde_json::from_value(parsed).map_err(|error| error.to_string())?;
    let key: String = hard_block_cache_key(client_id, &parsed, options.block_only, options.include_deferred);
    let memo_hit: Option<Vec<AccessRule>> = options.memo.and_then(|memo| memo.0.lock().ok().and_then(|memo| memo.get(&key).cloned()));
    let filter: AccessRulesFilter = AccessRulesFilter {
        policy_scope: client_id.filter(|id| !id.is_empty()).map(|id| PolicyScope { client_id: Some(id.to_string()) }),
        policy_scope_match: Some(FilterScopeMatch::Greedy),
        user_scope: Some(parsed.clone()),
        user_scope_match: Some(FilterScopeMatch::Greedy),
        group_id: None,
        block_only: options.block_only.then_some(true),
        include_deferred: options.include_deferred.then_some(true),
    };
    let compute = move || -> BoxFuture<'static, Vec<AccessRule>> { async move { storage.find_rules(&filter, true, true).await }.boxed() };
    let candidates: Vec<AccessRule> = match memo_hit {
        Some(candidates) => candidates,
        None if options.skip_cache => compute().await,
        None => cache.get_or_compute(&key, compute).await,
    };
    if let Some(memo) = options.memo {
        if let Ok(mut memo) = memo.0.lock() {
            memo.insert(key, candidates.clone());
        }
    }
    Ok(rank_candidate_rules(candidates, &parsed, client_id, headers))
}

/// What a refusal says: the matched rule's message key, when it has one.
#[derive(Debug, Default)]
pub struct BlockOutcome {
    pub message_key: Option<String>,
}

pub struct BlacklistRequestInspector {
    pub storage: Arc<dyn AccessRulesReader>,
    pub cache: Arc<HardBlockVerdictCache>,
    pub db: Option<Arc<ProviderDatabase>>,
    pub metrics: Option<Arc<ProviderMetrics>>,
}

/// The facts about a request the inspector reads.
pub struct InspectedRequest<'a> {
    pub url: &'a str,
    pub ip: &'a str,
    pub ja4: &'a str,
    pub headers: &'a HeaderMap,
    pub body: &'a Value,
    pub ip_info: Option<&'a IpInfoResponse>,
    pub memo: Option<&'a RequestRuleMemo>,
}

impl BlacklistRequestInspector {
    fn record_blocked(&self, reason: &str) {
        if let Some(metrics) = &self.metrics {
            metrics.record_blocked_request(reason);
        }
    }

    /// `shouldAbortRequest`.
    pub async fn should_abort_request(&self, request: &InspectedRequest<'_>, logger: &Logger, outcome: &mut BlockOutcome) -> bool {
        if !request.url.contains(API_PREFIX) {
            return false;
        }
        if request.ip.is_empty() {
            logger.info(|| LogRecord::msg("Request without IP").with_data(json!({ "requestedRoute": request.url })));
            self.record_blocked("no_ip");
            return true;
        }
        // The TS reads `Prosopo-User` and `Prosopo-Site-Key` from the headers under those exact
        // names, which Node never has (it lower-cases them), so only the body's are ever used.
        let text = |key: &str| request.body.get(key).and_then(Value::as_str);
        let user_id: Option<&str> = text("user");
        let client_id: Option<&str> = text("dapp");
        let (country_code, asn) = match request.ip_info {
            Some(IpInfoResponse::Valid(info)) => (info.country_code.as_deref(), info.asn_number.map(|asn| asn.get())),
            _ => (None, None),
        };
        let user_agent: Option<String> = header(request.headers, "user-agent");
        let scope: Value = get_request_user_scope(ScopeSignals {
            user_agent: user_agent.as_deref(),
            ja4: Some(request.ja4),
            ip: Some(request.ip),
            user: user_id,
            country_code,
            asn,
            ..ScopeSignals::default()
        });
        let options = PrioritisedRuleOptions { block_only: true, memo: request.memo, ..PrioritisedRuleOptions::default() };
        let rules: Vec<AccessRule> =
            match get_prioritised_access_rule(self.storage.clone(), &self.cache, &scope, client_id, &normalize_headers_for_matching(request.headers), options).await {
                Ok(rules) => rules,
                Err(error) => {
                    logger.error(|| LogRecord::msg("Block Middleware Error").with_err(error));
                    self.record_blocked("error");
                    return true;
                }
            };
        let Some(rule) = rules.into_iter().find(|rule| rule.policy.defer_to_verify != Some(true)) else {
            return false;
        };
        if rule.policy.kind != AccessPolicyType::Block {
            return false;
        }
        outcome.message_key = rule.policy.message_key.map(|key| key.as_str().to_string());
        self.record_blocked("access_policy");
        self.record_block_decision(&rule, request, user_id, client_id, country_code, asn, logger);
        true
    }

    #[allow(clippy::too_many_arguments)]
    fn record_block_decision(
        &self,
        rule: &AccessRule,
        request: &InspectedRequest<'_>,
        user_id: Option<&str>,
        client_id: Option<&str>,
        country_code: Option<&str>,
        asn: Option<f64>,
        logger: &Logger,
    ) {
        let rule_hash: String = make_access_rule_hash(rule);
        let rule_type: Vec<String> = derive_rule_type(rule);
        let user_agent: Option<String> = header(request.headers, "user-agent");
        logger.info(|| {
            LogRecord::msg("Access policy block").with_data(json!({
                "ruleHash": rule_hash,
                "ruleType": rule_type,
                "ruleDescription": rule.policy.description,
                "policyType": rule.policy.kind.as_str(),
                "clientId": client_id,
                "userScope": {
                    "userId": user_id,
                    "ja4": request.ja4,
                    "ip": request.ip,
                    "userAgent": user_agent,
                    "countryCode": country_code,
                    "asn": asn,
                    "os": classify_os(user_agent.as_deref()).as_str(),
                    "browser": classify_browser(user_agent.as_deref()).as_str(),
                },
            }))
        });
        let Some(db) = self.db.clone() else {
            return;
        };
        let Ok(session) = blocked_session(rule, request, client_id, rule_hash, rule_type) else {
            return;
        };
        tokio::spawn(async move { db.store_blocked_session(&session).await });
    }
}

/// `deriveRuleType`: the scope fields a rule sets, as the Traffic page groups them.
fn derive_rule_type(rule: &AccessRule) -> Vec<String> {
    const NAMES: [&str; 12] =
        ["userId", "ja4Hash", "headersHash", "userAgentHash", "headHash", "coords", "countryCode", "asn", "os", "browser", "headerMatch", "webBotAuthAgent"];
    let mut fields: Vec<String> = scalar_fields(&rule.scope).iter().zip(NAMES).filter(|(field, _)| field.is_some()).map(|(_, name)| name.to_string()).collect();
    if rule.scope.numeric_ip.is_some() {
        fields.push("ip".to_string());
    } else if rule.scope.numeric_ip_mask_min.is_some() && rule.scope.numeric_ip_mask_max.is_some() {
        fields.push("ipMask".to_string());
    }
    fields
}

/// The synthetic session a block writes, with the matched rule's identity.
fn blocked_session(rule: &AccessRule, request: &InspectedRequest<'_>, client_id: Option<&str>, rule_hash: String, rule_type: Vec<String>) -> Result<Session, String> {
    let mut headers: Document = Document::new();
    for name in request.headers.keys() {
        if let Some(value) = header(request.headers, name.as_str()) {
            headers.insert(name.as_str(), value);
        }
    }
    let mut record: Document = doc! {
        "sessionId": format!("blocked-{}", uuid::Uuid::new_v4()),
        "createdAt": DateTime::now(),
        "token": "blocked",
        "score": 1.0,
        "threshold": 0.0,
        "scoreComponents": { "baseScore": 1.0 },
        "captchaType": "frictionless",
        "webView": false,
        "iFrame": false,
        "decryptedHeadHash": "",
        "ipAddress": get_composite_ip_address(request.ip).to_document(),
        "headers": headers,
        "reason": "ACCESS_POLICY_BLOCK",
        "result": { "status": "Disapproved", "reason": "API.ACCESS_POLICY_BLOCK" },
        "ruleHash": rule_hash,
        "ruleType": rule_type,
    };
    if let Some(client_id) = client_id {
        record.insert("siteKey", client_id);
    }
    if let Some(ip_info) = request.ip_info {
        record.insert("ipInfo", bson::serialize_to_bson(ip_info).map_err(|error| error.to_string())?);
    }
    if let Some(description) = &rule.policy.description {
        record.insert("ruleDescription", description.as_str());
    }
    record.insert("matchedRule", bson::serialize_to_bson(&describe_matched_rule(rule)).map_err(|error| error.to_string())?);
    bson::deserialize_from_document(record).map_err(|error| error.to_string())
}

pub struct BlockState {
    pub db: Option<Arc<ProviderDatabase>>,
    pub cache: Arc<HardBlockVerdictCache>,
    pub metrics: Option<Arc<ProviderMetrics>>,
    pub maintenance: Arc<MaintenanceMode>,
    /// Made on the first request that finds the rule storage, then kept; until then every
    /// request goes through, as the TS lets them when the database is not there.
    pub inspector: std::sync::OnceLock<BlacklistRequestInspector>,
}

impl BlockState {
    fn inspector(&self) -> Option<&BlacklistRequestInspector> {
        if let Some(inspector) = self.inspector.get() {
            return Some(inspector);
        }
        let db: &Arc<ProviderDatabase> = self.db.as_ref()?;
        let storage = db.get_user_access_rules_storage().ok()?;
        Some(self.inspector.get_or_init(|| BlacklistRequestInspector {
            storage: Arc::new(storage),
            cache: self.cache.clone(),
            db: Some(db.clone()),
            metrics: self.metrics.clone(),
        }))
    }
}

/// blockMiddleware.
pub async fn block(State(state): State<Arc<BlockState>>, mut request: Request, next: Next) -> Response {
    if state.maintenance.get() {
        return next.run(request).await;
    }
    if header(request.headers(), "prosopo-site-key").is_some_and(|site_key| prosopo_types::client::get_test_site_key_mode(&site_key).is_some()) {
        return next.run(request).await;
    }
    let Some(inspector) = state.inspector() else {
        return next.run(request).await;
    };
    let memo: RequestRuleMemo = request.extensions().get::<RequestRuleMemo>().cloned().unwrap_or_default();
    request.extensions_mut().insert(memo.clone());
    let url: String = request.uri().path_and_query().map_or_else(String::new, |url| url.as_str().to_string());
    let signals: Option<RequestSignals> = request.extensions().get::<RequestSignals>().cloned();
    let body: Value = request.extensions().get::<RequestBody>().map_or_else(|| json!({}), |body| body.0.clone());
    let log: Option<RequestLog> = request.extensions().get::<RequestLog>().cloned();
    let logger: Logger = log.as_ref().map_or_else(|| prosopo_logger::get_logger(prosopo_logger::LogLevel::Info, "provider"), |log| log.logger.clone());
    let mut outcome: BlockOutcome = BlockOutcome::default();
    let inspected: InspectedRequest<'_> = InspectedRequest {
        url: &url,
        ip: signals.as_ref().map_or("", |signals| signals.ip.as_str()),
        ja4: signals.as_ref().map_or("", |signals| signals.ja4.as_str()),
        headers: request.headers(),
        body: &body,
        ip_info: signals.as_ref().and_then(|signals| signals.ip_info.as_ref()),
        memo: Some(&memo),
    };
    if !inspector.should_abort_request(&inspected, &logger, &mut outcome).await {
        return next.run(request).await;
    }
    let reason: String = match &outcome.message_key {
        None => "Forbidden".to_string(),
        Some(key) if is_translation_key(key) => request.extensions().get::<RequestI18n>().map_or_else(|| key.clone(), |i18n| i18n.lookup().t(key)),
        Some(key) => key.clone(),
    };
    let request_id: &str = log.as_ref().map_or("unknown", |log| log.request_id.as_str());
    let mut error: Map<String, Value> = Map::new();
    error.insert("message".to_string(), json!(format!("{reason}: {request_id}")));
    error.insert("code".to_string(), json!(403));
    if let Some(key) = outcome.message_key {
        error.insert("key".to_string(), json!(key));
    }
    send_json(&Requested::of(&request), StatusCode::FORBIDDEN, Vec::new(), &json!({ "error": error }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use prosopo_user_access_policy::AccessPolicy;
    use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};

    fn rule(client_id: &str) -> Vec<AccessRule> {
        let mut rule: AccessRule = AccessRule::new(AccessPolicy::new(AccessPolicyType::Block));
        rule.client_id = Some(client_id.to_string());
        vec![rule]
    }

    struct ManualClock(Arc<AtomicU64>);

    impl ManualClock {
        fn new() -> ManualClock {
            ManualClock(Arc::new(AtomicU64::new(1_000_000)))
        }

        fn clock(&self) -> Clock {
            let time: Arc<AtomicU64> = self.0.clone();
            Arc::new(move || time.load(Ordering::SeqCst) as f64)
        }

        fn advance(&self, ms: u64) {
            self.0.fetch_add(ms, Ordering::SeqCst);
        }
    }

    #[test]
    fn returns_nothing_on_a_miss_and_the_value_on_a_hit() {
        let cache = HardBlockVerdictCache::new(30_000.0, 100);
        assert!(cache.get("missing").is_none());
        cache.set("key", rule("client-A"));
        assert_eq!(cache.get("key"), Some(rule("client-A")));
    }

    #[test]
    fn expires_once_the_ttl_has_elapsed() {
        let time = ManualClock::new();
        let cache = HardBlockVerdictCache::with_clock(1_000.0, 100, time.clock());
        cache.set("key", rule("client-A"));
        time.advance(999);
        assert!(cache.get("key").is_some());
        time.advance(2);
        assert!(cache.get("key").is_none());
    }

    #[test]
    fn evicts_the_least_recently_used_entry_when_full() {
        let cache = HardBlockVerdictCache::new(30_000.0, 2);
        cache.set("a", rule("A"));
        cache.set("b", rule("B"));
        cache.set("c", rule("C"));
        assert!(cache.get("a").is_none());
        assert!(cache.get("b").is_some());
        assert!(cache.get("c").is_some());
        assert_eq!(cache.size(), 2);
    }

    #[test]
    fn a_read_entry_survives_eviction() {
        let cache = HardBlockVerdictCache::new(30_000.0, 2);
        cache.set("a", rule("A"));
        cache.set("b", rule("B"));
        assert!(cache.get("a").is_some());
        cache.set("c", rule("C"));
        assert!(cache.get("a").is_some());
        assert!(cache.get("b").is_none());
        assert!(cache.get("c").is_some());
    }

    #[test]
    fn reading_does_not_extend_the_ttl() {
        let time = ManualClock::new();
        let cache = HardBlockVerdictCache::with_clock(1_000.0, 100, time.clock());
        cache.set("k", rule("A"));
        time.advance(500);
        assert!(cache.get("k").is_some());
        time.advance(499);
        assert!(cache.get("k").is_some());
        time.advance(2);
        assert!(cache.get("k").is_none());
    }

    #[test]
    fn setting_an_existing_key_evicts_nothing() {
        let cache = HardBlockVerdictCache::new(30_000.0, 2);
        cache.set("a", rule("A"));
        cache.set("b", rule("B"));
        cache.set("a", rule("A2"));
        assert_eq!(cache.get("a"), Some(rule("A2")));
        assert!(cache.get("b").is_some());
        assert_eq!(cache.size(), 2);
    }

    #[test]
    fn clear_drops_every_entry() {
        let cache = HardBlockVerdictCache::new(30_000.0, 100);
        cache.set("a", rule("A"));
        cache.set("b", rule("B"));
        cache.clear();
        assert_eq!(cache.size(), 0);
        assert!(cache.get("a").is_none());
    }

    fn counted(calls: &Arc<AtomicUsize>, release: tokio::sync::watch::Receiver<bool>, value: Vec<AccessRule>) -> BoxFuture<'static, Vec<AccessRule>> {
        calls.fetch_add(1, Ordering::SeqCst);
        let mut release = release;
        async move {
            let _ = release.wait_for(|released| *released).await;
            value
        }
        .boxed()
    }

    #[tokio::test]
    async fn concurrent_identical_misses_compute_once() {
        let cache = Arc::new(HardBlockVerdictCache::new(30_000.0, 100));
        let calls = Arc::new(AtomicUsize::new(0));
        let (release, released) = tokio::sync::watch::channel(false);
        let waiters: Vec<_> = (0..5)
            .map(|_| {
                let (cache, calls, released) = (cache.clone(), calls.clone(), released.clone());
                tokio::spawn(async move { cache.get_or_compute("k", move || counted(&calls, released, rule("A"))).await })
            })
            .collect();
        tokio::task::yield_now().await;
        let _ = release.send(true);
        for waiter in waiters {
            assert_eq!(waiter.await.expect("joins"), rule("A"));
        }
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        assert_eq!(cache.inflight_size(), 0);
    }

    #[tokio::test]
    async fn different_keys_compute_separately() {
        let cache = HardBlockVerdictCache::new(30_000.0, 100);
        let calls = Arc::new(AtomicUsize::new(0));
        let (_release, released) = tokio::sync::watch::channel(true);
        let a = cache.get_or_compute("a", || counted(&calls, released.clone(), rule("A"))).await;
        let b = cache.get_or_compute("b", || counted(&calls, released.clone(), rule("B"))).await;
        assert_eq!((a, b), (rule("A"), rule("B")));
        assert_eq!(calls.load(Ordering::SeqCst), 2);
    }

    #[tokio::test]
    async fn a_lookup_running_when_cleared_does_not_fill_the_cache() {
        let cache = Arc::new(HardBlockVerdictCache::new(30_000.0, 100));
        let calls = Arc::new(AtomicUsize::new(0));
        let (release, released) = tokio::sync::watch::channel(false);
        let running = {
            let (cache, calls, released) = (cache.clone(), calls.clone(), released.clone());
            tokio::spawn(async move { cache.get_or_compute("k", move || counted(&calls, released, rule("old"))).await })
        };
        tokio::task::yield_now().await;
        cache.clear();
        let (_fresh_release, fresh_released) = tokio::sync::watch::channel(true);
        let after = cache.get_or_compute("k", || counted(&calls, fresh_released, rule("new"))).await;
        assert_eq!(after, rule("new"));
        let _ = release.send(true);
        assert_eq!(running.await.expect("joins"), rule("old"));
        assert_eq!(cache.get("k"), Some(rule("new")));
        assert_eq!(calls.load(Ordering::SeqCst), 2);
    }

    #[test]
    fn keys_tell_apart_what_the_ts_keys_tell_apart() {
        let scope = |ip: Option<i64>| UserScope { numeric_ip: ip.map(BigInt::from), ..UserScope::default() };
        let key = |client: Option<&str>, ip: Option<i64>, block_only: bool, deferred: bool| hard_block_cache_key(client, &scope(ip), block_only, deferred);
        assert_eq!(key(Some("c"), Some(1), true, false), key(Some("c"), Some(1), true, false));
        assert_ne!(key(Some("c"), Some(1), true, true), key(Some("c"), Some(1), true, false));
        assert_ne!(key(Some("c"), Some(1), true, false), key(Some("d"), Some(1), true, false));
        assert_ne!(key(Some("c"), Some(1), true, false), key(None, Some(1), true, false));
        assert_ne!(key(None, Some(1), true, false), key(None, Some(2), true, false));
        assert_ne!(key(None, Some(1), true, false), key(None, Some(1), false, false));
        assert_eq!(key(None, None, true, false), "1||||||||||||");
        let empty_user = UserScope { user_id: Some(String::new()), ..UserScope::default() };
        assert_eq!(hard_block_cache_key(None, &empty_user, true, false), key(None, None, true, false));
    }
}
