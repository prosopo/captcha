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

//! Server-side verification: captchaManager.ts's verify-side methods and powTasks.ts's
//! `serverVerifyPowCaptchaSolution`.

use crate::api::block::{
    get_prioritised_access_rule, get_request_user_scope, normalize_stored_headers, HardBlockVerdictCache, PrioritisedRuleOptions, ScopeSignals,
};
use crate::api::pipeline::IpInfoLookup;
use crate::client_meta_data::is_client_session_mismatch;
use crate::composite_ip::{get_composite_ip_address, get_ip_address_from_composite};
use crate::ip_comparison::LookupFuture;
use crate::ip_validation::{deep_validate_ip_address, IpCheck};
use crate::tasks::decision::DecisionGate;
use crate::tasks::dns_event::{compute_dns_asymmetry, enrich_dns_event, extra_ip_infos_from_enriched_dns_event, get_ip_info_asn, DnsEventAddresses};
use crate::tasks::email::{evaluate_email_spam_rules, normalise_email_for_matching, SpamFilterView};
use crate::tasks::frictionless::compute_frictionless_score;
use crate::tasks::spam::check_spam_email;
use crate::tasks::traffic::{check_traffic_filter, TrafficCheckResult, TrafficFilterView};
use crate::tasks::usage_counters::{build_all_window_increments, UsageCounters};
use prosopo_types::decision_machine::{CounterCaptchaType, CounterKind};
use bson::{doc, Bson, Document};
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError, ThrownError};
use prosopo_database::challenges::{is_blocking, Interactive};
use prosopo_database::provider::ProviderDatabase;
use prosopo_database::records::{ChallengeRecord, CommitmentRecord, CompositeIpAddress, StoredResult};
use prosopo_database::redis_cache::RedisWriteQueue;
use prosopo_database::session::Session;
use prosopo_logger::{ErrorObject, LogObject, LogRecord, Logger};
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::client::Tier;
use prosopo_types::datasets::CaptchaStatus;
use prosopo_types::decision_machine::EnrichedDnsEvent;
use prosopo_types::ipapi::IpInfoResponse;
use prosopo_types::matched_access_rule::{AccessPolicyType, MatchedAccessRule};
use prosopo_types::reasons::ResultReason;
use prosopo_types::settings::TrafficFilterAction;
use prosopo_types::settings_types::{IPValidationRules, TrafficCategoryPolicy};
use prosopo_user_access_policy::{describe_matched_rule, AccessRule};
use serde_json::{json, Map, Value};
use std::sync::{Arc, OnceLock};

/// What verification uses beyond the request: the stores, the IP service, the access rules'
/// verdict cache, the DNS servers for the spam check and the decision machines.
pub struct VerifyServices {
    pub db: Arc<ProviderDatabase>,
    /// Made once Redis is there, as `initWriteQueue` makes the TS's.
    pub write_queue: OnceLock<RedisWriteQueue>,
    /// Made once Redis is there, as `initUsageCounters` makes the TS's.
    pub usage_counters: OnceLock<Arc<UsageCounters>>,
    pub logger: Logger,
    pub ip_info: Option<Arc<dyn IpInfoLookup>>,
    pub verdict_cache: Arc<HardBlockVerdictCache>,
    pub dns_servers: Option<Vec<String>>,
    pub decisions: Arc<DecisionGate>,
}

/// The request's IP service as IP validation asks it; without one every lookup fails.
struct ValidationLookup<'a>(Option<&'a dyn IpInfoLookup>);

impl crate::ip_comparison::IpInfoLookup for ValidationLookup<'_> {
    fn lookup<'a>(&'a self, ip: &'a str) -> LookupFuture<'a> {
        Box::pin(lookup_ip(self.0, ip))
    }
}

async fn lookup_ip(service: Option<&dyn IpInfoLookup>, ip: &str) -> IpInfoResponse {
    match service {
        Some(service) => service.lookup(ip).await,
        None => IpInfoResponse::error("IP info service not configured", ip),
    }
}

struct NoLookup;

impl IpInfoLookup for NoLookup {
    fn is_available(&self) -> bool {
        false
    }

    fn lookup<'a>(&'a self, ip: &'a str) -> std::pin::Pin<Box<dyn std::future::Future<Output = IpInfoResponse> + Send + 'a>> {
        Box::pin(lookup_ip(None, ip))
    }
}

/// `HardBlockRecordView`: what `checkForHardBlock` reads of a captcha record.
pub struct HardBlockRecordView<'a> {
    pub dapp_account: &'a str,
    pub user_account: &'a str,
    pub ip_address: &'a CompositeIpAddress,
    pub ja4: Option<&'a str>,
    pub session_id: Option<&'a str>,
    pub headers: Option<&'a Bson>,
    pub coords: Option<&'a [Vec<Vec<f64>>]>,
}

impl<'a> From<&'a ChallengeRecord> for HardBlockRecordView<'a> {
    fn from(record: &'a ChallengeRecord) -> HardBlockRecordView<'a> {
        HardBlockRecordView {
            dapp_account: &record.dapp_account,
            user_account: &record.user_account,
            ip_address: &record.ip_address,
            ja4: record.ja4.as_deref(),
            session_id: record.session_id.as_deref(),
            headers: record.headers.as_ref(),
            coords: record.coords.as_deref(),
        }
    }
}

/// A commitment is read without its `ja4` (`DAPP_USER_COMMITMENT_PROJECTION` leaves it out).
impl<'a> From<&'a CommitmentRecord> for HardBlockRecordView<'a> {
    fn from(record: &'a CommitmentRecord) -> HardBlockRecordView<'a> {
        HardBlockRecordView {
            dapp_account: &record.dapp_account,
            user_account: &record.user_account,
            ip_address: &record.ip_address,
            ja4: None,
            session_id: record.session_id.as_deref(),
            headers: record.headers.as_ref(),
            coords: record.coords.as_deref(),
        }
    }
}

/// A BSON value as the JS reads it out of a lean document.
pub fn bson_json(value: &Bson) -> Value {
    value.clone().into_relaxed_extjson()
}

/// A stored record's `ipInfo`, when it reads as one.
pub fn record_ip_info(ip_info: Option<&Bson>) -> Option<IpInfoResponse> {
    ip_info.and_then(|info| serde_json::from_value(bson_json(info)).ok())
}

/// `JSON.stringify` of stored click coordinates.
fn coords_json(coords: &[Vec<Vec<f64>>]) -> String {
    let join = |items: Vec<String>| format!("[{}]", items.join(","));
    join(coords
        .iter()
        .map(|path| join(path.iter().map(|point| join(point.iter().map(|n| if n.is_finite() { prosopo_util::number_to_string(*n) } else { "null".to_string() }).collect())).collect()))
        .collect())
}

/// `findHardBlockPolicy`: a deferred rule, or a Block without a captcha type.
fn find_hard_block_policy(rules: Vec<AccessRule>) -> Option<AccessRule> {
    rules.into_iter().find(|rule| rule.policy.defer_to_verify == Some(true) || (rule.policy.kind == AccessPolicyType::Block && rule.policy.captcha_type.is_none()))
}

/// `{ abuser: { action: "block" }, ...trafficFilter }`: abusers are blocked unless the site
/// set its own abuser policy.
fn effective_traffic_filter(filter: Option<&TrafficFilterView>) -> TrafficFilterView {
    let mut effective: TrafficFilterView = filter.cloned().unwrap_or_default();
    if effective.abuser.is_none() {
        effective.abuser = Some(TrafficCategoryPolicy {
            action: TrafficFilterAction::Block,
            captcha_type: None,
            pow_difficulty: None,
            solved_images_count: None,
            puzzle_tolerance: None,
            pad_bytes: None,
            puzzle: None,
            audio: None,
            icon_order_tolerance: None,
            icon_order: None,
        });
    }
    effective
}

impl VerifyServices {
    pub fn write_queue(&self) -> Option<&RedisWriteQueue> {
        if let Some(queue) = self.write_queue.get() {
            return Some(queue);
        }
        let connection = self.db.get_redis_connection().ok()?;
        Some(self.write_queue.get_or_init(|| RedisWriteQueue::new(connection, self.logger.clone(), self.db.shared_source())))
    }

    pub fn usage_counters(&self) -> Option<&Arc<UsageCounters>> {
        if let Some(counters) = self.usage_counters.get() {
            return Some(counters);
        }
        let connection = self.db.get_redis_connection().ok()?;
        Some(self.usage_counters.get_or_init(|| Arc::new(UsageCounters::new(connection, self.logger.clone()))))
    }

    pub fn ip_info(&self) -> &dyn IpInfoLookup {
        self.ip_info.as_deref().unwrap_or(&NoLookup)
    }

    /// `updateSessionRecordWithCache`: the cached session patched now, the stored one in the
    /// background.
    pub async fn update_session_record_with_cache(&self, session_id: &str, updates: (Map<String, Value>, Document), stream_to_central: bool, logger: &Logger) {
        let (cached, stored) = updates;
        if let Some(queue) = self.write_queue() {
            queue.patch_cached_session(session_id, &cached, None).await;
        }
        let db: Arc<ProviderDatabase> = self.db.clone();
        let session_id: String = session_id.to_string();
        let logger: Logger = logger.clone();
        tokio::spawn(async move {
            if let Err(error) = db.update_session_record(&session_id, &stored, stream_to_central).await {
                logger.warn(|| LogRecord::msg("Background Mongo session update failed").with_err(error.to_string()).with_data(json!({ "sessionId": session_id })));
            }
        });
    }

    /// `getSessionRecordWithOriginFallback`, for what verification reads of it: an escalation
    /// without a DNS event takes the one of the session it escalated. The TS also fills in SIMD
    /// readings and detector data that way, which only the decision machines read.
    pub async fn get_session_record_with_origin_fallback(&self, session_id: &str) -> Result<Option<Session>, ProsopoError> {
        let Some(mut session) = self.db.get_session_record_by_session_id(session_id).await? else {
            return Ok(None);
        };
        let Some(origin_id) = session.origin_session_id.clone().filter(|_| session.dns_event.is_none()) else {
            return Ok(Some(session));
        };
        if let Some(origin) = self.db.get_session_record_by_session_id(&origin_id).await? {
            session.dns_event = origin.dns_event;
        }
        Ok(Some(session))
    }

    /// `checkForHardBlock`: the deferred or type-less Block rule that applies to the record's
    /// user, if any.
    pub async fn check_for_hard_block(&self, record: &HardBlockRecordView<'_>, ip_info: Option<&IpInfoResponse>) -> Result<Option<AccessRule>, String> {
        let storage = self.db.get_user_access_rules_storage().map_err(|error| error.to_string())?;
        let head_hash: Option<String> = match record.session_id {
            Some(session_id) => self.db.get_session_record_by_session_id(session_id).await.map_err(|error| error.to_string())?.map(|session| session.decrypted_head_hash),
            None => None,
        };
        let coords: Option<String> = record.coords.map(coords_json);
        let address: String = get_ip_address_from_composite(record.ip_address).map_err(|error| error.to_string())?.address().to_string();
        let headers: Map<String, Value> = match record.headers.map(bson_json) {
            Some(Value::Object(headers)) => headers,
            _ => Map::new(),
        };
        let user_agent: Option<String> = headers.get("user-agent").filter(|agent| truthy_json(agent)).map(js_string);
        let (country_code, asn) = match ip_info {
            Some(IpInfoResponse::Valid(info)) => (info.country_code.clone(), info.asn_number.map(|asn| asn.get())),
            _ => (None, None),
        };
        let scope: Value = get_request_user_scope(ScopeSignals {
            user_agent: user_agent.as_deref(),
            ja4: record.ja4,
            ip: Some(&address),
            user: Some(record.user_account),
            head_hash: head_hash.as_deref(),
            coords: coords.as_deref(),
            country_code: country_code.as_deref(),
            asn,
            web_bot_auth_agent: None,
        });
        let options: PrioritisedRuleOptions = PrioritisedRuleOptions { block_only: true, include_deferred: true, ..PrioritisedRuleOptions::default() };
        let rules: Vec<AccessRule> =
            get_prioritised_access_rule(Arc::new(storage), &self.verdict_cache, &scope, Some(record.dapp_account), &normalize_stored_headers(&headers), options).await?;
        Ok(find_hard_block_policy(rules))
    }

    /// `resolveTrafficFilterCheck`: the site's filter, abusers blocked unless it says otherwise,
    /// over the IP the dapp's server gave (looked up now) or else the one the record stored.
    pub async fn resolve_traffic_filter_check(
        &self,
        record_ip_info: Option<&IpInfoResponse>,
        filter: Option<&TrafficFilterView>,
        current_ip: Option<&str>,
        enriched: Option<&EnrichedDnsEvent>,
    ) -> TrafficCheckResult {
        let effective: TrafficFilterView = effective_traffic_filter(filter);
        let looked_up: Option<IpInfoResponse> = match current_ip.filter(|ip| !ip.is_empty()) {
            Some(ip) => Some(self.ip_info().lookup(ip).await),
            None => None,
        };
        let ip_info: Option<&IpInfoResponse> = if current_ip.is_some_and(|ip| !ip.is_empty()) { looked_up.as_ref() } else { record_ip_info };
        check_traffic_filter(ip_info, &effective, &extra_ip_infos_from_enriched_dns_event(enriched), enriched.and_then(|event| event.path_valid))
    }
}

fn truthy_json(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(flag) => *flag,
        Value::Number(number) => number.as_f64().is_some_and(|n| n != 0.0 && !n.is_nan()),
        Value::String(text) => !text.is_empty(),
        Value::Array(_) | Value::Object(_) => true,
    }
}

/// `value.toString()`.
fn js_string(value: &Value) -> String {
    match value {
        Value::String(text) => text.clone(),
        Value::Number(number) => prosopo_util::number_to_string(number.as_f64().unwrap_or(f64::NAN)),
        Value::Array(items) => items.iter().map(|item| if item.is_null() { String::new() } else { js_string(item) }).collect::<Vec<String>>().join(","),
        Value::Object(_) => "[object Object]".to_string(),
        other => other.to_string(),
    }
}

/// What a server verification is asked, the site's settings included.
pub struct ServerVerifyRequest<'a> {
    pub dapp: &'a str,
    pub challenge: &'a str,
    pub timeout: f64,
    pub ip: Option<&'a str>,
    pub email: Option<&'a str>,
    pub spam_email_domain_check_enabled: bool,
    pub spam_filter: Option<SpamFilterView>,
    pub traffic_filter: Option<TrafficFilterView>,
    pub store_metadata: bool,
    pub client_session_id: Option<&'a str>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct VerifyOutcome {
    pub verified: bool,
    pub score: Option<f64>,
    pub reason: Option<String>,
    pub session_id: Option<String>,
}

fn not_verified(reason: &str, session_id: Option<&String>) -> VerifyOutcome {
    VerifyOutcome {
        verified: false,
        score: None,
        reason: Some(reason.to_string()),
        session_id: session_id.filter(|id| !id.is_empty()).cloned(),
    }
}

const FAILED_FUNC_NAME: &str = "serverVerifyPowCaptchaSolution";

fn thrown(class: ErrorClass, key: &str, context: ErrorContext) -> ThrownError {
    ThrownError::from(ProsopoError::new(class, ErrorSource::key(key), ErrorOptions { context: Some(context), ..ErrorOptions::default() }))
}

/// A failed check: the stored result and the reason answered.
struct Failure {
    result: StoredResult,
    reason: String,
}

impl Failure {
    fn new(reason: ResultReason, answered: &str) -> Failure {
        Failure { result: StoredResult::new(CaptchaStatus::Disapproved, Some(reason.as_str())), reason: answered.to_string() }
    }
}

fn result_json(result: &StoredResult) -> Value {
    let mut out: Map<String, Value> = Map::new();
    out.insert("status".to_string(), json!(result.status.as_str()));
    if let Some(reason) = &result.reason {
        out.insert("reason".to_string(), json!(reason));
    }
    if let Some(error) = &result.error {
        out.insert("error".to_string(), json!(error));
    }
    Value::Object(out)
}

/// The session's verified state, for the cache and for the database, in the TS's key order.
fn session_updates(captcha_type: CaptchaType, result: &StoredResult, matched_rule: Option<&MatchedAccessRule>) -> (Map<String, Value>, Document) {
    let blocked: bool = is_blocking(captcha_type, result);
    let mut cached: Map<String, Value> = Map::new();
    let mut stored: Document = Document::new();
    cached.insert("serverChecked".to_string(), json!(true));
    stored.insert("serverChecked", true);
    cached.insert("result".to_string(), result_json(result));
    stored.insert("result", result.to_document());
    if blocked {
        cached.insert("blocked".to_string(), json!(true));
        stored.insert("blocked", true);
    }
    if let Some(rule) = matched_rule {
        cached.insert("matchedRule".to_string(), serde_json::to_value(rule).unwrap_or(Value::Null));
        stored.insert("matchedRule", bson::serialize_to_bson(rule).unwrap_or(Bson::Null));
    }
    (cached, stored)
}

fn dns_addresses(session: &Session) -> Option<DnsEventAddresses> {
    session.dns_event.as_ref().map(|event| DnsEventAddresses {
        peer_ip: event.peer_ip.clone(),
        resolver_ip: event.resolver_ip.clone(),
        path_valid: event.path_valid,
    })
}

/// `serverVerifyPowCaptchaSolution`: whether the dapp's token stands for a solved, unused PoW
/// challenge that passes the site's checks. The record is claimed first, so a token verifies
/// once.
pub async fn server_verify_pow_captcha_solution(services: &VerifyServices, request: &ServerVerifyRequest<'_>, logger: &Logger) -> Result<VerifyOutcome, ThrownError> {
    let mut bindings: LogObject = LogObject::new();
    bindings.insert("challenge".to_string(), json!(request.challenge));
    bindings.insert("dappAccount".to_string(), json!(request.dapp));
    let logger: Logger = logger.with(&bindings, None);
    let db: &ProviderDatabase = &services.db;

    let Some(record) = db.get_pow_captcha_record_by_challenge(request.challenge).await? else {
        logger.debug(|| LogRecord::msg(format!("No record of this challenge: {}", request.challenge)));
        return Ok(not_verified("CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND", None));
    };
    if record.result.status != CaptchaStatus::Approved {
        let context: ErrorContext = ErrorContext::new().with("code", 400).with("failedFuncName", FAILED_FUNC_NAME).with("challenge", request.challenge);
        return Err(thrown(ErrorClass::Api, "CAPTCHA.INVALID_SOLUTION", context));
    }
    if record.server_checked == Some(true) {
        return Ok(not_verified("API.USER_ALREADY_VERIFIED", record.session_id.as_ref()));
    }
    if request.dapp != record.dapp_account {
        let context: ErrorContext =
            ErrorContext::new().with("failedFuncName", FAILED_FUNC_NAME).with("dappAccount", request.dapp).with("challengeDappAccount", record.dapp_account.as_str());
        return Err(thrown(ErrorClass::Env, "CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND", context));
    }
    if db.mark_dapp_user_pow_commitments_checked(std::slice::from_ref(&record.challenge)).await? == 0 {
        return Ok(not_verified("API.USER_ALREADY_VERIFIED", record.session_id.as_ref()));
    }

    let mut updates: Document = Document::new();
    let mut failure: Option<Failure> = None;
    let mut matched_rule: Option<MatchedAccessRule> = None;
    let record_ip_info: Option<IpInfoResponse> = record_ip_info(record.ip_info.as_ref());

    let submit_to_verify_ms: f64 = record
        .submitted_at_timestamp
        .map_or(f64::INFINITY, |submitted| (db.source().now().timestamp_millis() - submitted.timestamp_millis()) as f64);
    if submit_to_verify_ms > request.timeout {
        failure = Some(Failure::new(ResultReason::TimestampTooOld, "API.TIMESTAMP_TOO_OLD"));
    }

    let recorded_session: Option<&str> = record.client_meta_data.as_ref().and_then(|meta| meta.client_session_id.as_deref());
    if failure.is_none() && is_client_session_mismatch(request.client_session_id, recorded_session) {
        logger.info(|| {
            LogRecord::msg("Client session mismatch in server PoW verification").with_data(json!({ "hasRecordedClientSessionId": recorded_session.is_some_and(|id| !id.is_empty()) }))
        });
        failure = Some(Failure::new(ResultReason::ClientSessionMismatch, "API.CLIENT_SESSION_MISMATCH"));
    }

    if failure.is_none() && db.get_user_access_rules_storage().is_ok() {
        match services.check_for_hard_block(&HardBlockRecordView::from(&record), record_ip_info.as_ref()).await {
            Ok(Some(rule)) => {
                logger.info(|| {
                    LogRecord::msg("User blocked by access policy in server PoW verification")
                        .with_data(json!({ "userAccount": record.user_account, "policy": serde_json::to_value(&rule).unwrap_or(Value::Null) }))
                });
                failure = Some(Failure::new(ResultReason::AccessPolicyBlock, "API.ACCESS_POLICY_BLOCK"));
                matched_rule = Some(describe_matched_rule(&rule));
            }
            Ok(None) => {}
            Err(error) => logger.warn(|| LogRecord::msg("Failed to check user access policies in server PoW verification").with_data(json!({ "error": error }))),
        }
    }

    let email: Option<&str> = request.email.filter(|email| !email.is_empty());
    if let (None, Some(email), true) = (&failure, email, request.spam_email_domain_check_enabled) {
        if check_spam_email(email, db, services.dns_servers.as_deref(), &logger).await {
            let email_domain: &str = email.split('@').nth(1).filter(|domain| !domain.is_empty()).unwrap_or("unknown");
            logger.info(|| LogRecord::msg("Spam email domain detected in server PoW verification").with_data(json!({ "emailDomain": email_domain })));
            failure = Some(Failure::new(ResultReason::SpamEmailDomain, "API.SPAM_EMAIL_DOMAIN"));
        }
    }

    let email_rules = request.spam_filter.as_ref().and_then(SpamFilterView::active_email_rules);
    if let (None, Some(rules), Some(email)) = (&failure, email_rules, email) {
        if let Some(spam) = evaluate_email_spam_rules(Some(email), Some(rules)) {
            logger.info(|| LogRecord::msg("Spam filter rejected email in PoW verification").with_data(json!({ "reason": spam.reason.as_str() })));
            failure = Some(Failure::new(ResultReason::SpamEmailRule, "API.SPAM_EMAIL_RULE"));
        }
    }

    let max_email_submission_count: Option<f64> = email_rules.and_then(|rules| rules.max_email_submission_count).map(|count| count.get());
    let mut email_normalised: Option<String> = None;
    if let (None, Some(max), Some(email), true) = (&failure, max_email_submission_count, email, request.store_metadata) {
        let normalised: String = normalise_email_for_matching(email);
        if !normalised.is_empty() {
            match db.count_commitments_by_normalised_email(request.dapp, &normalised).await {
                Ok(prior) if prior as f64 >= max => {
                    logger.info(|| {
                        LogRecord::msg("Email submission count exceeded in PoW verification").with_data(json!({ "priorCount": prior, "maxEmailSubmissionCount": max }))
                    });
                    failure = Some(Failure::new(ResultReason::SpamEmailCountExceeded, "API.SPAM_EMAIL_COUNT_EXCEEDED"));
                }
                Ok(_) => {}
                Err(error) => {
                    logger.warn(|| LogRecord::msg("Failed to check email submission count in PoW verification").with_data(json!({ "error": error.to_string() })))
                }
            }
        }
        email_normalised = Some(normalised);
    }

    let mut session: Option<Session> = match record.session_id.as_deref().filter(|id| !id.is_empty()) {
        Some(session_id) => services.get_session_record_with_origin_fallback(session_id).await?,
        None => None,
    };
    let ip: Option<&str> = request.ip;
    let primary_ip: Option<String> = ip.map(str::to_string).or_else(|| record_ip_info.as_ref().map(ip_of));
    let dns_event: Option<DnsEventAddresses> = session.as_ref().and_then(dns_addresses);
    let enriched: Option<EnrichedDnsEvent> = enrich_dns_event(dns_event.as_ref(), services.ip_info(), primary_ip.as_deref()).await;

    if failure.is_none() {
        let check: TrafficCheckResult = services.resolve_traffic_filter_check(record_ip_info.as_ref(), request.traffic_filter.as_ref(), ip, enriched.as_ref()).await;
        if let Some(reason) = check.blocked {
            logger.info(|| {
                LogRecord::msg("Traffic filter rejected request in PoW verification").with_data(json!({
                    "ip": ip,
                    "reason": reason.as_str(),
                    "dnsPeerIp": enriched.as_ref().and_then(|event| event.peer_ip.clone()),
                    "dnsResolverIp": enriched.as_ref().and_then(|event| event.resolver_ip.clone()),
                    "dnsPeerAsn": get_ip_info_asn(enriched.as_ref().and_then(|event| event.peer_ip_info.as_ref())),
                    "dnsResolverAsn": get_ip_info_asn(enriched.as_ref().and_then(|event| event.resolver_ip_info.as_ref())),
                    "dnsPathValid": enriched.as_ref().and_then(|event| event.path_valid),
                }))
            });
            failure = Some(Failure { result: StoredResult::new(CaptchaStatus::Disapproved, Some(reason.as_str())), reason: reason.as_str().to_string() });
        }
    }

    if let (true, Some(email)) = (request.store_metadata, email) {
        let normalised: String = email_normalised.clone().unwrap_or_else(|| normalise_email_for_matching(email));
        updates.insert("metadata", doc! { "email": email, "emailNormalised": normalised });
    }

    if let (None, Some(ip)) = (&failure, ip.filter(|ip| !ip.is_empty())) {
        let challenge_ip = get_ip_address_from_composite(&record.ip_address).map_err(|error| ThrownError::from(ErrorObject::new("Error", error.to_string())))?;
        let client = db.get_client_record(request.dapp).await?;
        let rules: Option<Value> = client.as_ref().and_then(|client| client.settings.as_ref()).and_then(|settings| settings.get("ipValidationRules")).map(bson_json);
        updates.insert("providedIp", get_composite_ip_address(ip).to_document());
        if rules.as_ref().and_then(|rules| rules.get("enabled")) == Some(&json!(true)) {
            let rules: Option<IPValidationRules> = rules.and_then(|rules| serde_json::from_value(rules).ok());
            let peer_ip: Option<&str> = enriched.as_ref().and_then(|event| event.peer_ip.as_deref());
            let lookup: ValidationLookup = ValidationLookup(services.ip_info.as_deref());
            let validation: IpCheck = deep_validate_ip_address(ip, &challenge_ip, &logger, &lookup, rules.as_ref(), peer_ip).await;
            if !validation.is_valid {
                logger.error(|| {
                    LogRecord::msg("IP validation failed for PoW captcha").with_data(json!({
                        "ip": ip,
                        "challengeIp": challenge_ip.address(),
                        "error": validation.error_message,
                        "distanceKm": validation.distance_km,
                    }))
                });
                failure = Some(Failure::new(ResultReason::FailedIpValidation, "API.FAILED_IP_VALIDATION"));
            }
        }
    }

    let mut score: Option<f64> = None;
    if let Some(session) = session.as_mut() {
        let dns_asymmetry: f64 = compute_dns_asymmetry(enriched.as_ref(), record_ip_info.as_ref(), request.traffic_filter.as_ref());
        if dns_asymmetry > 0.0 {
            session.score_components.dns_asymmetry = Some(dns_asymmetry);
        }
        let computed: f64 = compute_frictionless_score(&session.score_components);
        logger.info(|| {
            LogRecord::default().with_data(json!({
                "scoreComponents": serde_json::to_value(&session.score_components).unwrap_or(Value::Null),
                "score": computed,
                "dnsPeerAsn": get_ip_info_asn(enriched.as_ref().and_then(|event| event.peer_ip_info.as_ref())),
                "dnsResolverAsn": get_ip_info_asn(enriched.as_ref().and_then(|event| event.resolver_ip_info.as_ref())),
            }))
        });
        score = Some(computed);
    }

    if failure.is_none() {
        services
            .decisions
            .decide(request.dapp, CaptchaType::Pow, &logger)
            .await
            .map_err(|unsupported| ThrownError::from(ErrorObject::new("Error", unsupported.to_string())))?;
    }

    let final_result: StoredResult = failure.as_ref().map_or_else(|| StoredResult::new(CaptchaStatus::Approved, None), |failure| failure.result.clone());
    if let Some(failure) = &failure {
        updates.insert("result", failure.result.to_document());
        updates.insert("blocked", is_blocking(CaptchaType::Pow, &failure.result));
    }
    let record_write = async {
        if updates.is_empty() {
            return Ok(());
        }
        db.update_pow_captcha_record(&record.challenge, &updates).await
    };
    let session_write = async {
        if let Some(session_id) = record.session_id.as_deref().filter(|id| !id.is_empty()) {
            services.update_session_record_with_cache(session_id, session_updates(CaptchaType::Pow, &final_result, matched_rule.as_ref()), true, &logger).await;
        }
    };
    let (written, ()) = futures_util::join!(record_write, session_write);
    written?;

    if let Some(failure) = failure {
        return Ok(not_verified(&failure.reason, record.session_id.as_ref()));
    }
    Ok(VerifyOutcome {
        verified: true,
        score: score.filter(|score| *score != 0.0 && !score.is_nan()),
        reason: None,
        session_id: record.session_id.filter(|id| !id.is_empty()),
    })
}

/// What an interactive verification refuses with: the stored reason, and the session's
/// part (none for the spam checks, which leave the session as it is).
struct Refusal {
    reason: ResultReason,
    session: Option<Option<MatchedAccessRule>>,
}

impl Refusal {
    fn new(reason: ResultReason) -> Refusal {
        Refusal { reason, session: Some(None) }
    }
}

fn captcha_type_of(kind: Interactive) -> CaptchaType {
    match kind {
        Interactive::Puzzle => CaptchaType::Puzzle,
        Interactive::IconOrder => CaptchaType::IconOrder,
        Interactive::Audio => CaptchaType::Audio,
    }
}

fn log_label(kind: Interactive) -> &'static str {
    match kind {
        Interactive::Puzzle => "puzzle",
        Interactive::IconOrder => "icon-order",
        Interactive::Audio => "audio",
    }
}

const INTERACTIVE_FUNC_NAME: &str = "serverVerifyInteractiveCaptchaSolution";

impl VerifyServices {
    /// `disapproveVerification`: the result on the record and, unless the refusal leaves it
    /// out, on the session.
    async fn disapprove_verification(&self, kind: Interactive, record: &ChallengeRecord, refusal: Refusal, logger: &Logger) -> Result<(), ProsopoError> {
        let captcha_type: CaptchaType = captcha_type_of(kind);
        let result: StoredResult = StoredResult::new(CaptchaStatus::Disapproved, Some(refusal.reason.as_str()));
        let mut updates: Document = doc! { "result": result.to_document() };
        if is_blocking(captcha_type, &result) {
            updates.insert("blocked", true);
        }
        self.db.update_interactive_captcha_record(kind, &record.challenge, &updates).await?;
        if let (Some(matched_rule), Some(session_id)) = (refusal.session, record.session_id.as_deref().filter(|id| !id.is_empty())) {
            self.update_session_record_with_cache(session_id, session_updates(captcha_type, &result, matched_rule.as_ref()), false, logger).await;
        }
        Ok(())
    }

    /// The checks of `serverVerifyInteractiveCaptchaSolution` after the record is claimed, up
    /// to the score: the first that refuses, or the score.
    async fn interactive_checks(
        &self,
        kind: Interactive,
        record: &ChallengeRecord,
        request: &ServerVerifyRequest<'_>,
        logger: &Logger,
    ) -> Result<Result<Option<f64>, Refusal>, ThrownError> {
        let db: &ProviderDatabase = &self.db;
        let label: &str = log_label(kind);
        let submit_to_verify_ms: f64 =
            record.submitted_at_timestamp.map_or(f64::INFINITY, |submitted| (db.source().now().timestamp_millis() - submitted.timestamp_millis()) as f64);
        if submit_to_verify_ms > request.timeout {
            return Ok(Err(Refusal::new(ResultReason::TimestampTooOld)));
        }
        let recorded_session: Option<&str> = record.client_meta_data.as_ref().and_then(|meta| meta.client_session_id.as_deref());
        if is_client_session_mismatch(request.client_session_id, recorded_session) {
            logger.info(|| {
                LogRecord::msg(format!("Client session mismatch in server {label} verification"))
                    .with_data(json!({ "hasRecordedClientSessionId": recorded_session.is_some_and(|id| !id.is_empty()) }))
            });
            return Ok(Err(Refusal::new(ResultReason::ClientSessionMismatch)));
        }
        let record_ip_info: Option<IpInfoResponse> = record_ip_info(record.ip_info.as_ref());
        if db.get_user_access_rules_storage().is_ok() {
            match self.check_for_hard_block(&HardBlockRecordView::from(record), record_ip_info.as_ref()).await {
                Ok(Some(rule)) => {
                    logger.info(|| {
                        LogRecord::msg(format!("User blocked by access policy in server {label} verification"))
                            .with_data(json!({ "userAccount": record.user_account, "policy": serde_json::to_value(&rule).unwrap_or(Value::Null) }))
                    });
                    return Ok(Err(Refusal { reason: ResultReason::AccessPolicyBlock, session: Some(Some(describe_matched_rule(&rule))) }));
                }
                Ok(None) => {}
                Err(error) => logger.warn(|| LogRecord::msg(format!("Failed to check user access policies in server {label} verification")).with_data(json!({ "error": error }))),
            }
        }
        let email: Option<&str> = request.email.filter(|email| !email.is_empty());
        if let (Some(email), true) = (email, request.spam_email_domain_check_enabled) {
            if check_spam_email(email, db, self.dns_servers.as_deref(), logger).await {
                let email_domain: &str = email.split('@').nth(1).filter(|domain| !domain.is_empty()).unwrap_or("unknown");
                logger.info(|| LogRecord::msg(format!("Spam email domain detected in server {label} verification")).with_data(json!({ "emailDomain": email_domain })));
                return Ok(Err(Refusal { reason: ResultReason::SpamEmailDomain, session: None }));
            }
        }
        let email_rules = request.spam_filter.as_ref().and_then(SpamFilterView::active_email_rules);
        let max_email_submission_count: Option<f64> = email_rules.and_then(|rules| rules.max_email_submission_count).map(|count| count.get());
        let mut email_normalised: Option<String> = None;
        if let (Some(max), Some(email), true) = (max_email_submission_count, email, request.store_metadata) {
            let normalised: String = normalise_email_for_matching(email);
            if !normalised.is_empty() {
                match db.count_commitments_by_normalised_email(request.dapp, &normalised).await {
                    Ok(prior) if prior as f64 >= max => {
                        logger.info(|| {
                            LogRecord::msg(format!("Email submission count exceeded in server {label} verification"))
                                .with_data(json!({ "priorCount": prior, "maxEmailSubmissionCount": max }))
                        });
                        return Ok(Err(Refusal { reason: ResultReason::SpamEmailCountExceeded, session: None }));
                    }
                    Ok(_) => {}
                    Err(error) => logger.warn(|| {
                        LogRecord::msg(format!("Failed to check email submission count in server {label} verification")).with_data(json!({ "error": error.to_string() }))
                    }),
                }
            }
            email_normalised = Some(normalised);
        }
        let mut session: Option<Session> = match record.session_id.as_deref().filter(|id| !id.is_empty()) {
            Some(session_id) => self.get_session_record_with_origin_fallback(session_id).await?,
            None => None,
        };
        let ip: Option<&str> = request.ip;
        let primary_ip: Option<String> = ip.map(str::to_string).or_else(|| record_ip_info.as_ref().map(ip_of));
        let dns_event: Option<DnsEventAddresses> = session.as_ref().and_then(dns_addresses);
        let enriched: Option<EnrichedDnsEvent> = enrich_dns_event(dns_event.as_ref(), self.ip_info(), primary_ip.as_deref()).await;
        let check: TrafficCheckResult = self.resolve_traffic_filter_check(record_ip_info.as_ref(), request.traffic_filter.as_ref(), ip, enriched.as_ref()).await;
        if let Some(reason) = check.blocked {
            logger.info(|| {
                LogRecord::msg(format!("Traffic filter rejected request in {label} verification")).with_data(json!({
                    "ip": ip,
                    "reason": reason.as_str(),
                    "dnsPeerIp": enriched.as_ref().and_then(|event| event.peer_ip.clone()),
                    "dnsResolverIp": enriched.as_ref().and_then(|event| event.resolver_ip.clone()),
                    "dnsPeerAsn": get_ip_info_asn(enriched.as_ref().and_then(|event| event.peer_ip_info.as_ref())),
                    "dnsResolverAsn": get_ip_info_asn(enriched.as_ref().and_then(|event| event.resolver_ip_info.as_ref())),
                    "dnsPathValid": enriched.as_ref().and_then(|event| event.path_valid),
                }))
            });
            return Ok(Err(Refusal::new(reason)));
        }
        if let (true, Some(email)) = (request.store_metadata, email) {
            let normalised: String = email_normalised.unwrap_or_else(|| normalise_email_for_matching(email));
            db.update_interactive_captcha_record(kind, &record.challenge, &doc! { "metadata": { "email": email, "emailNormalised": normalised } }).await?;
        }
        if let Some(ip) = ip.filter(|ip| !ip.is_empty()) {
            let challenge_ip = get_ip_address_from_composite(&record.ip_address).map_err(|error| ThrownError::from(ErrorObject::new("Error", error.to_string())))?;
            let client = db.get_client_record(request.dapp).await?;
            let rules: Option<Value> = client.as_ref().and_then(|client| client.settings.as_ref()).and_then(|settings| settings.get("ipValidationRules")).map(bson_json);
            db.update_interactive_captcha_record(kind, &record.challenge, &doc! { "providedIp": get_composite_ip_address(ip).to_document() }).await?;
            if rules.as_ref().and_then(|rules| rules.get("enabled")) == Some(&json!(true)) {
                let rules: Option<IPValidationRules> = rules.and_then(|rules| serde_json::from_value(rules).ok());
                let peer_ip: Option<&str> = enriched.as_ref().and_then(|event| event.peer_ip.as_deref());
                let lookup: ValidationLookup = ValidationLookup(self.ip_info.as_deref());
                let validation: IpCheck = deep_validate_ip_address(ip, &challenge_ip, logger, &lookup, rules.as_ref(), peer_ip).await;
                if !validation.is_valid {
                    logger.error(|| {
                        LogRecord::msg(format!("IP validation failed for {label} captcha")).with_data(json!({
                            "ip": ip,
                            "challengeIp": challenge_ip.address(),
                            "error": validation.error_message,
                            "distanceKm": validation.distance_km,
                        }))
                    });
                    return Ok(Err(Refusal::new(ResultReason::FailedIpValidation)));
                }
            }
        }
        let Some(session) = session.as_mut() else {
            return Ok(Ok(None));
        };
        let dns_asymmetry: f64 = compute_dns_asymmetry(enriched.as_ref(), record_ip_info.as_ref(), request.traffic_filter.as_ref());
        if dns_asymmetry > 0.0 {
            session.score_components.dns_asymmetry = Some(dns_asymmetry);
        }
        let score: f64 = compute_frictionless_score(&session.score_components);
        logger.info(|| {
            LogRecord::default().with_data(json!({
                "scoreComponents": serde_json::to_value(&session.score_components).unwrap_or(Value::Null),
                "score": score,
                "dnsPeerAsn": get_ip_info_asn(enriched.as_ref().and_then(|event| event.peer_ip_info.as_ref())),
                "dnsResolverAsn": get_ip_info_asn(enriched.as_ref().and_then(|event| event.resolver_ip_info.as_ref())),
            }))
        });
        Ok(Ok(Some(score)))
    }
}

/// `serverVerifyInteractiveCaptchaSolution`, for puzzle, icon-order and audio: as the PoW
/// verify, but each refusal is written as it is found, the site's email rules are not
/// applied, and the answer names no reason.
pub async fn server_verify_interactive_captcha_solution(
    services: &VerifyServices,
    kind: Interactive,
    request: &ServerVerifyRequest<'_>,
    logger: &Logger,
) -> Result<VerifyOutcome, ThrownError> {
    let mut bindings: LogObject = LogObject::new();
    bindings.insert("challenge".to_string(), json!(request.challenge));
    bindings.insert("dappAccount".to_string(), json!(request.dapp));
    let logger: Logger = logger.with(&bindings, None);
    let db: &ProviderDatabase = &services.db;
    let Some(record) = db.get_interactive_captcha_record_by_challenge(kind, request.challenge).await? else {
        logger.debug(|| LogRecord::msg(format!("No record of this challenge: {}", request.challenge)));
        return Ok(VerifyOutcome { verified: false, score: None, reason: None, session_id: None });
    };
    let not_verified: VerifyOutcome = VerifyOutcome { verified: false, score: None, reason: None, session_id: record.session_id.clone() };
    if record.result.status != CaptchaStatus::Approved {
        let context: ErrorContext = ErrorContext::new().with("code", 400).with("failedFuncName", INTERACTIVE_FUNC_NAME).with("challenge", request.challenge);
        return Err(thrown(ErrorClass::Api, "CAPTCHA.INVALID_SOLUTION", context));
    }
    if record.server_checked == Some(true) {
        return Ok(not_verified);
    }
    if request.dapp != record.dapp_account {
        let context: ErrorContext =
            ErrorContext::new().with("failedFuncName", INTERACTIVE_FUNC_NAME).with("dappAccount", request.dapp).with("challengeDappAccount", record.dapp_account.as_str());
        return Err(thrown(ErrorClass::Env, "CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND", context));
    }
    if !db.mark_interactive_captcha_record_checked(kind, &record.challenge).await? {
        return Ok(not_verified);
    }
    let score: Option<f64> = match services.interactive_checks(kind, &record, request, &logger).await? {
        Ok(score) => score,
        Err(refusal) => {
            services.disapprove_verification(kind, &record, refusal, &logger).await?;
            return Ok(not_verified);
        }
    };
    services
        .decisions
        .decide(request.dapp, captcha_type_of(kind), &logger)
        .await
        .map_err(|unsupported| ThrownError::from(ErrorObject::new("Error", unsupported.to_string())))?;
    if let Some(session_id) = record.session_id.as_deref().filter(|id| !id.is_empty()) {
        let approved: StoredResult = StoredResult::new(CaptchaStatus::Approved, None);
        services.update_session_record_with_cache(session_id, session_updates(captcha_type_of(kind), &approved, None), false, &logger).await;
    }
    Ok(VerifyOutcome {
        verified: true,
        score: score.filter(|score| *score != 0.0 && !score.is_nan()),
        reason: None,
        session_id: record.session_id.filter(|id| !id.is_empty()),
    })
}

/// What `verifyImageCaptchaSolution` answers: the outcome, its status (a translation key, or
/// the stored reason), and the commitment it was about.
#[derive(Debug, Clone, PartialEq)]
pub struct ImageVerifyOutcome {
    pub outcome: VerifyOutcome,
    pub status: String,
    pub commitment_id: Option<String>,
}

/// What image verification is asked beyond the shared request.
pub struct ImageVerifyRequest<'a> {
    pub shared: ServerVerifyRequest<'a>,
    pub commitment_id: Option<&'a str>,
    pub max_verified_time: Option<f64>,
    pub disallow_web_view: Option<bool>,
}

fn image_not_verified(status: &str, session_id: Option<&String>) -> ImageVerifyOutcome {
    ImageVerifyOutcome {
        outcome: VerifyOutcome { verified: false, score: None, reason: None, session_id: session_id.filter(|id| !id.is_empty()).cloned() },
        status: status.to_string(),
        commitment_id: None,
    }
}

/// `verifyImageCaptchaSolution`: whether the token's commitment is a solved, unused image
/// challenge that passes the site's checks. Unlike the other types the commitment's own result
/// decides, a refusal found after the IP check is written to the session only, and the answer's
/// status is the reason.
pub async fn verify_image_captcha_solution(services: &VerifyServices, request: &ImageVerifyRequest<'_>, logger: &Logger) -> Result<ImageVerifyOutcome, ThrownError> {
    let shared: &ServerVerifyRequest = &request.shared;
    let mut bindings: LogObject = LogObject::new();
    bindings.insert("commitmentId".to_string(), json!(request.commitment_id));
    bindings.insert("dapp".to_string(), json!(shared.dapp));
    let logger: Logger = logger.with(&bindings, None);
    let db: &ProviderDatabase = &services.db;
    let Some(commitment_id) = request.commitment_id.filter(|id| !id.is_empty()) else {
        logger.debug(|| LogRecord::msg("Not verified - token carried no commitmentId"));
        return Ok(image_not_verified("API.USER_NOT_VERIFIED_NO_SOLUTION", None));
    };
    let Some(solution) = db.get_dapp_user_commitment_by_id(commitment_id).await? else {
        let context: ErrorContext = ErrorContext::new().with("failedFuncName", "getDappUserCommitmentById").with("commitmentId", commitment_id);
        return Err(thrown(ErrorClass::Env, "CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND", context));
    };
    if solution.server_checked == Some(true) || db.mark_dapp_user_commitments_checked(std::slice::from_ref(&solution.id)).await? == 0 {
        return Ok(image_not_verified("API.USER_ALREADY_VERIFIED", solution.session_id.as_ref()));
    }
    if solution.result.status == CaptchaStatus::Disapproved {
        let status: &str = solution.result.reason.as_deref().filter(|reason| !reason.is_empty()).unwrap_or("API.USER_NOT_VERIFIED");
        return Ok(image_not_verified(status, solution.session_id.as_ref()));
    }
    let max_verified_time: f64 = request.max_verified_time.filter(|time| *time != 0.0 && !time.is_nan()).unwrap_or(60_000.0);
    let since_completion: f64 =
        solution.submitted_at_timestamp.map_or(f64::INFINITY, |submitted| (db.source().now().timestamp_millis() - submitted.timestamp_millis()) as f64);
    if since_completion > max_verified_time {
        logger.debug(|| LogRecord::msg("Not verified - timed out"));
        return Ok(image_not_verified("API.USER_NOT_VERIFIED_TIME_EXPIRED", solution.session_id.as_ref()));
    }

    let mut result_update: Option<StoredResult> = None;
    let mut fail_status: Option<String> = None;
    let mut matched_rule: Option<MatchedAccessRule> = None;
    let fail = |reason: &str, result: &mut Option<StoredResult>| {
        *result = Some(StoredResult::new(CaptchaStatus::Disapproved, Some(reason)));
        Some(reason.to_string())
    };

    let recorded_session: Option<&str> = solution.client_meta_data.as_ref().and_then(|meta| meta.client_session_id.as_deref());
    if is_client_session_mismatch(shared.client_session_id, recorded_session) {
        logger.info(|| {
            LogRecord::msg("Client session mismatch in server image verification")
                .with_data(json!({ "hasRecordedClientSessionId": recorded_session.is_some_and(|id| !id.is_empty()) }))
        });
        fail_status = fail(ResultReason::ClientSessionMismatch.as_str(), &mut result_update);
    }
    let record_ip_info: Option<IpInfoResponse> = record_ip_info(solution.ip_info.as_ref());
    if fail_status.is_none() && db.get_user_access_rules_storage().is_ok() {
        match services.check_for_hard_block(&HardBlockRecordView::from(&solution), record_ip_info.as_ref()).await {
            Ok(Some(rule)) => {
                logger.info(|| {
                    LogRecord::msg("User blocked by access policy in server image verification").with_data(json!({
                        "userAccount": solution.user_account,
                        "dappAccount": solution.dapp_account,
                        "policy": serde_json::to_value(&rule).unwrap_or(Value::Null),
                    }))
                });
                fail_status = fail(ResultReason::AccessPolicyBlock.as_str(), &mut result_update);
                matched_rule = Some(describe_matched_rule(&rule));
            }
            Ok(None) => {}
            Err(error) => logger.warn(|| LogRecord::msg("Failed to check user access policies in server image verification").with_data(json!({ "error": error }))),
        }
    }
    let email: Option<&str> = shared.email.filter(|email| !email.is_empty());
    if let (None, Some(email), true) = (&fail_status, email, shared.spam_email_domain_check_enabled) {
        if check_spam_email(email, db, services.dns_servers.as_deref(), &logger).await {
            let email_domain: &str = email.split('@').nth(1).filter(|domain| !domain.is_empty()).unwrap_or("unknown");
            logger.info(|| LogRecord::msg("Spam email domain detected in server image verification").with_data(json!({ "emailDomain": email_domain })));
            fail_status = fail(ResultReason::SpamEmailDomain.as_str(), &mut result_update);
        }
    }
    let email_rules = shared.spam_filter.as_ref().and_then(SpamFilterView::active_email_rules);
    if let (None, Some(rules), Some(email)) = (&fail_status, email_rules, email) {
        if let Some(spam) = evaluate_email_spam_rules(Some(email), Some(rules)) {
            logger.info(|| LogRecord::msg("Spam filter rejected email in image verification").with_data(json!({ "reason": spam.reason.as_str() })));
            fail_status = fail(ResultReason::SpamEmailRule.as_str(), &mut result_update);
        }
    }
    let max_email_submission_count: Option<f64> = email_rules.and_then(|rules| rules.max_email_submission_count).map(|count| count.get());
    let mut email_normalised: Option<String> = None;
    if let (None, Some(max), Some(email), true) = (&fail_status, max_email_submission_count, email, shared.store_metadata) {
        let normalised: String = normalise_email_for_matching(email);
        if !normalised.is_empty() {
            match db.count_commitments_by_normalised_email(shared.dapp, &normalised).await {
                Ok(prior) if prior as f64 >= max => {
                    logger.info(|| {
                        LogRecord::msg("Email submission count exceeded in image verification").with_data(json!({ "priorCount": prior, "maxEmailSubmissionCount": max }))
                    });
                    fail_status = fail(ResultReason::SpamEmailCountExceeded.as_str(), &mut result_update);
                }
                Ok(_) => {}
                Err(error) => {
                    logger.warn(|| LogRecord::msg("Failed to check email submission count in image verification").with_data(json!({ "error": error.to_string() })))
                }
            }
        }
        email_normalised = Some(normalised);
    }

    let mut session: Option<Session> = match solution.session_id.as_deref().filter(|id| !id.is_empty()) {
        Some(session_id) => services.get_session_record_with_origin_fallback(session_id).await?,
        None => None,
    };
    let ip: Option<&str> = shared.ip;
    let primary_ip: Option<String> = ip.map(str::to_string).or_else(|| record_ip_info.as_ref().map(ip_of));
    let dns_event: Option<DnsEventAddresses> = session.as_ref().and_then(dns_addresses);
    let enriched: Option<EnrichedDnsEvent> = enrich_dns_event(dns_event.as_ref(), services.ip_info(), primary_ip.as_deref()).await;
    if fail_status.is_none() {
        let check: TrafficCheckResult = services.resolve_traffic_filter_check(record_ip_info.as_ref(), shared.traffic_filter.as_ref(), ip, enriched.as_ref()).await;
        if let Some(reason) = check.blocked {
            logger.info(|| {
                LogRecord::msg("Traffic filter rejected request").with_data(json!({
                    "ip": ip,
                    "reason": reason.as_str(),
                    "dnsPeerIp": enriched.as_ref().and_then(|event| event.peer_ip.clone()),
                    "dnsResolverIp": enriched.as_ref().and_then(|event| event.resolver_ip.clone()),
                    "dnsPeerAsn": get_ip_info_asn(enriched.as_ref().and_then(|event| event.peer_ip_info.as_ref())),
                    "dnsResolverAsn": get_ip_info_asn(enriched.as_ref().and_then(|event| event.resolver_ip_info.as_ref())),
                    "dnsPathValid": enriched.as_ref().and_then(|event| event.path_valid),
                }))
            });
            fail_status = fail(reason.as_str(), &mut result_update);
        }
    }

    let metadata: Option<Document> = match (shared.store_metadata, email) {
        (true, Some(email)) => Some(doc! { "email": email, "emailNormalised": email_normalised.unwrap_or_else(|| normalise_email_for_matching(email)) }),
        _ => None,
    };
    let mut provided_ip: Option<Document> = None;
    if let Some(ip) = ip.filter(|ip| !ip.is_empty()) {
        let solution_ip = get_ip_address_from_composite(&solution.ip_address).map_err(|error| ThrownError::from(ErrorObject::new("Error", error.to_string())))?;
        let client = db.get_client_record(shared.dapp).await?;
        let rules: Option<Value> = client.as_ref().and_then(|client| client.settings.as_ref()).and_then(|settings| settings.get("ipValidationRules")).map(bson_json);
        provided_ip = Some(get_composite_ip_address(ip).to_document());
        if fail_status.is_none() && rules.as_ref().and_then(|rules| rules.get("enabled")) == Some(&json!(true)) {
            let rules: Option<IPValidationRules> = rules.and_then(|rules| serde_json::from_value(rules).ok());
            let peer_ip: Option<&str> = enriched.as_ref().and_then(|event| event.peer_ip.as_deref());
            let lookup: ValidationLookup = ValidationLookup(services.ip_info.as_deref());
            let validation: IpCheck = deep_validate_ip_address(ip, &solution_ip, &logger, &lookup, rules.as_ref(), peer_ip).await;
            if !validation.is_valid {
                logger.error(|| {
                    LogRecord::msg("IP validation failed for image captcha").with_data(json!({
                        "ip": ip,
                        "solutionIp": solution_ip.address(),
                        "error": validation.error_message,
                        "distanceKm": validation.distance_km,
                    }))
                });
                fail_status = Some(ResultReason::FailedIpValidation.as_str().to_string());
            }
        }
    }

    let approved_solution: bool = solution.result.status == CaptchaStatus::Approved;
    let mut is_approved: bool = fail_status.is_none() && approved_solution;
    let mut failure_status: String = fail_status.clone().unwrap_or_else(|| ResultReason::UserNotVerified.as_str().to_string());
    if let (None, true, Some(counters)) = (&fail_status, approved_solution, services.usage_counters()) {
        let increments = build_all_window_increments(
            CounterKind::Solved,
            CounterCaptchaType::Type(CaptchaType::Image),
            ip.unwrap_or_default(),
            &solution.user_account,
            enriched.as_ref().and_then(|event| event.peer_ip.as_deref()),
        );
        counters.incr_many_async(&solution.dapp_account, increments);
    }

    let mut score: Option<f64> = None;
    if let Some(session) = session.as_mut() {
        let dns_asymmetry: f64 = compute_dns_asymmetry(enriched.as_ref(), record_ip_info.as_ref(), shared.traffic_filter.as_ref());
        if dns_asymmetry > 0.0 {
            session.score_components.dns_asymmetry = Some(dns_asymmetry);
        }
        let computed: f64 = compute_frictionless_score(&session.score_components);
        logger.info(|| {
            LogRecord::default().with_data(json!({
                "scoreComponents": serde_json::to_value(&session.score_components).unwrap_or(Value::Null),
                "score": computed,
                "dnsPeerAsn": get_ip_info_asn(enriched.as_ref().and_then(|event| event.peer_ip_info.as_ref())),
                "dnsResolverAsn": get_ip_info_asn(enriched.as_ref().and_then(|event| event.resolver_ip_info.as_ref())),
            }))
        });
        score = Some(computed);
        let web_view: bool = session.web_view || session.score_components.web_view.unwrap_or(0.0) > 0.0;
        if fail_status.is_none() && request.disallow_web_view == Some(true) && web_view {
            logger.info(|| LogRecord::msg("Disallowing webview access - user not verified"));
            result_update = Some(StoredResult::new(CaptchaStatus::Disapproved, Some(ResultReason::DisallowedWebview.as_str())));
            is_approved = false;
            failure_status = ResultReason::DisallowedWebview.as_str().to_string();
        }
    }
    if is_approved {
        services
            .decisions
            .decide(shared.dapp, CaptchaType::Image, &logger)
            .await
            .map_err(|unsupported| ThrownError::from(ErrorObject::new("Error", unsupported.to_string())))?;
    }

    let mut side_updates: Document = Document::new();
    if let Some(provided_ip) = provided_ip {
        side_updates.insert("providedIp", provided_ip);
    }
    if let Some(metadata) = metadata {
        side_updates.insert("metadata", metadata);
    }
    let final_result: StoredResult = if is_approved {
        StoredResult::new(CaptchaStatus::Approved, None)
    } else {
        result_update.clone().unwrap_or_else(|| StoredResult::new(CaptchaStatus::Disapproved, Some(&failure_status)))
    };
    let side_write = async {
        if side_updates.is_empty() {
            return Ok(());
        }
        db.update_dapp_user_commitment(&solution.id, &side_updates).await
    };
    let result_write = async {
        if is_approved {
            db.approve_dapp_user_commitment(commitment_id, None).await
        } else if let Some(result) = &result_update {
            db.disapprove_dapp_user_commitment(commitment_id, result.reason.as_deref(), None).await
        } else {
            Ok(())
        }
    };
    let session_write = async {
        if let Some(session_id) = solution.session_id.as_deref().filter(|id| !id.is_empty()) {
            services.update_session_record_with_cache(session_id, session_updates(CaptchaType::Image, &final_result, matched_rule.as_ref()), true, &logger).await;
        }
    };
    let (side, result, ()) = futures_util::join!(side_write, result_write, session_write);
    side?;
    result?;

    Ok(ImageVerifyOutcome {
        outcome: VerifyOutcome {
            verified: is_approved,
            score: score.filter(|score| *score != 0.0 && !score.is_nan()),
            reason: None,
            session_id: solution.session_id.clone().filter(|id| !id.is_empty()),
        },
        status: if is_approved { ResultReason::UserVerified.as_str().to_string() } else { failure_status },
        commitment_id: Some(solution.id.clone()),
    })
}

/// `ipMatchesSession`: the operator's IP is the session's, family and both halves.
pub fn ip_matches_session(operator_ip: &str, session_ip: &CompositeIpAddress) -> bool {
    let parsed: CompositeIpAddress = get_composite_ip_address(operator_ip);
    parsed.ip_type == session_ip.ip_type && parsed.lower.0 == session_ip.lower.0 && parsed.upper.map_or(0, |half| half.0) == session_ip.upper.map_or(0, |half| half.0)
}

/// `verifyAuthenticatedSession`: a Web Bot Auth session verifies once, for the IP it was
/// issued to. The status is a translation key, sent untranslated.
pub async fn verify_authenticated_session(services: &VerifyServices, session_id: &str, ip: Option<&str>, client_session_id: Option<&str>) -> Result<(bool, &'static str), ThrownError> {
    let Some(ip) = ip.filter(|ip| !ip.is_empty()) else {
        return Ok((false, "API.AUTHENTICATED_IP_REQUIRED"));
    };
    let Some(session) = services.db.get_session_record_by_session_id(session_id).await? else {
        return Ok((false, "API.USER_NOT_VERIFIED_NO_SOLUTION"));
    };
    if session.captcha_type != CaptchaType::Authenticated {
        return Ok((false, "API.INCORRECT_CAPTCHA_TYPE"));
    }
    if session.server_checked == Some(true) {
        return Ok((false, "API.USER_ALREADY_VERIFIED"));
    }
    if !ip_matches_session(ip, &session.ip_address) {
        return Ok((false, "API.AUTHENTICATED_IP_MISMATCH"));
    }
    let recorded: Option<&str> = session.client_meta_data.as_ref().and_then(|meta| meta.client_session_id.as_deref());
    if is_client_session_mismatch(client_session_id, recorded) {
        return Ok((false, "API.CLIENT_SESSION_MISMATCH"));
    }
    if !services.db.claim_session_server_check(session_id).await? {
        return Ok((false, "API.USER_ALREADY_VERIFIED"));
    }
    Ok((true, "API.USER_VERIFIED"))
}

fn ip_of(info: &IpInfoResponse) -> String {
    match info {
        IpInfoResponse::Valid(info) => info.ip.clone().unwrap_or_default(),
        IpInfoResponse::Invalid(error) => error.ip.clone(),
    }
}

/// `canClientSeeScore`.
pub fn can_client_see_score(tier: Tier, score: Option<f64>) -> bool {
    score.is_some() && tier != Tier::Free
}

/// `getVerificationResponse`: the localised status, the verdict, the score and the failure
/// reason where the tier allows, and the session id.
pub fn get_verification_response(outcome: &VerifyOutcome, tier: Tier, status: String) -> Value {
    let mut out: Map<String, Value> = Map::new();
    out.insert("status".to_string(), json!(status));
    out.insert("verified".to_string(), json!(outcome.verified));
    if let (true, Some(score)) = (can_client_see_score(tier, outcome.score), outcome.score) {
        out.insert("score".to_string(), json!(score));
    }
    if let (false, true, Some(reason)) = (outcome.verified, tier != Tier::Free, outcome.reason.as_ref().filter(|reason| !reason.is_empty())) {
        out.insert("reason".to_string(), json!(reason));
    }
    if let Some(session_id) = outcome.session_id.as_ref().filter(|id| !id.is_empty()) {
        out.insert("sessionId".to_string(), json!(session_id));
    }
    Value::Object(out)
}
