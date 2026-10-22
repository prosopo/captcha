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

//! api/admin: the admin routes (apiAdminRoutesProvider.ts) behind the admin gate, answered
//! through the endpoint adapter with 400 as its error status, and the ClientTaskManager
//! methods they call. The detector-pool replacement is not here (see the migration log).

use crate::api::maintenance::MaintenanceMode;
use crate::api::metrics::ProviderMetrics;
use crate::api::pipeline::validate_address;
use crate::api::public::route_matches;
use crate::api::rules::at_route;
use crate::tasks::dns_event::{compute_dns_asymmetry, enrich_dns_event, DnsEventAddresses};
use crate::tasks::verify::{record_ip_info, VerifyServices};
use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::Response;
use axum::Router;
use bson::{doc, Bson, Document};
use http::Method;
use prosopo_api_route::{ApiEndpoint, ApiEndpointError, PathSegment, ApiEndpointResponse, ApiEndpointResponseStatus, ApiRoutes, ApiRoutesProvider};
use prosopo_api_router::{create_router, DefaultEndpointAdapter};
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_database::clients::{ClientRecord, DecisionMachineArtifact};
use prosopo_database::session::DnsObservation;
use prosopo_logger::{iso_timestamp, LogLevel, LogObject, LogRecord, Logger};
use prosopo_types::api_types::{
    ClearAllCountersBody, DecisionMachineIdBody, EmptyBody, GetSessionBody, RegisterSitekeyBody, RegisterSitekeysBody, RemoveSitekeyBody, RemoveSitekeysBody,
    ToggleMaintenanceModeBody, UpdateDecisionMachineBody,
};
use prosopo_types::api_types::DnsEventIngestBatch;
use prosopo_types::decision_machine::DecisionMachineScope;
use prosopo_types::provider_api::{
    dns_event_schema, get_all_decision_machines_response, get_decision_machine_response, remove_all_decision_machines_response, remove_decision_machine_response,
    AdminApiPaths,
};
use prosopo_types::settings::client_settings_schema;
use prosopo_types::settings_types::UserSettings;
use serde_json::{json, Map, Value};
use std::sync::{Arc, OnceLock};
use tower::ServiceExt;

/// What the admin endpoints act on.
pub struct AdminContext {
    pub services: Arc<VerifyServices>,
    pub maintenance: Arc<MaintenanceMode>,
    pub metrics: Option<Arc<ProviderMetrics>>,
}

/// `logger.with({}, scope)`, or a logger of its own under `provider:` without one.
fn child(logger: Option<&Logger>, scope: &str) -> Logger {
    match logger {
        Some(logger) => logger.with(&LogObject::new(), Some(scope)),
        None => prosopo_logger::get_logger(LogLevel::Info, &format!("provider:{scope}")),
    }
}

fn success(data: Option<Value>) -> ApiEndpointResponse {
    let response: ApiEndpointResponse = ApiEndpointResponse::new(ApiEndpointResponseStatus::Success);
    match data {
        Some(data) => response.with_data(data),
        None => response,
    }
}

fn fail(error: &ProsopoError) -> ApiEndpointResponse {
    ApiEndpointResponse::new(ApiEndpointResponseStatus::Fail).with_error(error.message().to_string())
}

fn bad_request(context: ErrorContext) -> ProsopoError {
    ProsopoError::new(ErrorClass::Api, ErrorSource::key("API.BAD_REQUEST"), ErrorOptions { context: Some(context), ..ErrorOptions::default() })
}

/// `ClientSettingsSchema.parse(input)`.
fn default_settings(input: Value) -> Result<UserSettings, ApiEndpointError> {
    let parsed: Value = client_settings_schema().validate(Some(&input)).map_err(|error| Box::new(error) as ApiEndpointError)?;
    serde_json::from_value(parsed).map_err(|error| Box::new(error) as ApiEndpointError)
}

fn record(site_key: &str, settings: &UserSettings, tier: prosopo_types::client::Tier) -> Result<ClientRecord, ApiEndpointError> {
    ClientRecord::new(site_key, settings, tier).map_err(|error| Box::new(error) as ApiEndpointError)
}

/// A BSON value as express's `res.json` writes a lean document's: ids as hex, dates as ISO
/// strings, decimals as `{ "$numberDecimal": … }`, whole doubles without a fraction.
pub fn express_json(value: &Bson) -> Value {
    match value {
        Bson::Document(document) => Value::Object(
            document.iter().filter(|(_, value)| !matches!(value, Bson::Undefined)).map(|(key, value)| (key.clone(), express_json(value))).collect(),
        ),
        Bson::Array(items) => Value::Array(items.iter().map(|item| if matches!(item, Bson::Undefined) { Value::Null } else { express_json(item) }).collect()),
        Bson::Double(number) => js_number(*number),
        Bson::Int32(number) => json!(number),
        Bson::Int64(number) => json!(number),
        Bson::String(text) => json!(text),
        Bson::Boolean(flag) => json!(flag),
        Bson::DateTime(date) => json!(iso_timestamp(date.timestamp_millis())),
        Bson::ObjectId(id) => json!(id.to_hex()),
        Bson::Decimal128(decimal) => json!({ "$numberDecimal": decimal.to_string() }),
        _ => Value::Null,
    }
}

/// A JS number as `JSON.stringify` writes it.
fn js_number(number: f64) -> Value {
    if !number.is_finite() {
        return Value::Null;
    }
    if number.fract() == 0.0 && number.abs() < 9_007_199_254_740_992.0 {
        return json!(number as i64);
    }
    json!(number)
}

/// A stored artifact as `getAllDecisionMachines` and `getDecisionMachine` map it: each field
/// taken as stored (an absent one left out, a stored `null` kept), the id as hex and the two
/// times as ISO strings. The response schema then checks and orders it.
fn artifact_json(artifact: &Document) -> Value {
    let mut out: Map<String, Value> = Map::new();
    out.insert("_id".into(), artifact.get("_id").map(express_json).unwrap_or(Value::Null));
    for key in ["scope", "dappAccount", "kind", "runtime", "language", "name", "version", "captchaType", "source", "createdAt", "updatedAt"] {
        if let Some(value) = artifact.get(key).filter(|value| !matches!(value, Bson::Undefined)) {
            out.insert(key.into(), express_json(value));
        }
    }
    Value::Object(out)
}

/// A response's data through its schema, as the TS `parse`s it; a failure is zod's message,
/// which the endpoint reports as its error.
fn parsed(schema: prosopo_api_route::schema::Schema, data: Value) -> Result<Value, String> {
    schema.validate(Some(&data)).map_err(|error| error.message())
}

fn fail_message(message: String) -> ApiEndpointResponse {
    ApiEndpointResponse::new(ApiEndpointResponseStatus::Fail).with_error(message)
}

struct RegisterSiteKey(Arc<AdminContext>);

impl ApiEndpoint for RegisterSiteKey {
    type Args = RegisterSitekeyBody;

    async fn process_request(&self, args: RegisterSitekeyBody, logger: Option<&Logger>) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: Logger = child(logger, "admin:site-key:register");
        let settings: UserSettings = match args.settings {
            Some(settings) => settings,
            None => default_settings(json!({}))?,
        };
        log.info(|| LogRecord::msg("`Registering site key").with_data(json!({ "siteKey": args.site_key })));
        validate_address(&args.site_key, "API.INVALID_SITE_KEY")?;
        self.0.services.db.update_client_records(&[record(&args.site_key, &settings, args.tier)?]).await?;
        log.info(|| LogRecord::msg("Site key registered"));
        Ok(success(None))
    }
}

struct RegisterSiteKeys(Arc<AdminContext>);

impl ApiEndpoint for RegisterSiteKeys {
    type Args = RegisterSitekeysBody;

    async fn process_request(&self, args: RegisterSitekeysBody, logger: Option<&Logger>) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: Logger = child(logger, "admin:site-keys:register");
        log.info(|| LogRecord::msg("Registering site keys").with_data(json!({ "count": args.0.len() })));
        let mut records: Vec<ClientRecord> = Vec::new();
        for site in args.0 {
            let settings: UserSettings = match site.settings {
                Some(settings) => settings,
                None => default_settings(json!({ "domains": ["localhost"] }))?,
            };
            validate_address(&site.site_key, "API.INVALID_SITE_KEY")?;
            records.push(record(&site.site_key, &settings, site.tier)?);
        }
        self.0.services.db.update_client_records(&records).await?;
        log.info(|| LogRecord::msg("Site keys registered"));
        Ok(success(None))
    }
}

struct RemoveSiteKey(Arc<AdminContext>);

impl ApiEndpoint for RemoveSiteKey {
    type Args = RemoveSitekeyBody;

    async fn process_request(&self, args: RemoveSitekeyBody, logger: Option<&Logger>) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: Logger = child(logger, "admin:site-key:remove");
        log.info(|| LogRecord::msg("Removing site key").with_data(json!({ "siteKey": args.site_key })));
        let removed: Result<(), ProsopoError> = async {
            validate_address(&args.site_key, "API.INVALID_SITE_KEY")?;
            self.0.services.db.remove_client_records(std::slice::from_ref(&args.site_key)).await
        }
        .await;
        match removed {
            Ok(()) => {
                log.info(|| LogRecord::msg("Site key removed"));
                Ok(success(None))
            }
            Err(error) => {
                log.error(|| LogRecord::msg("Error removing site key").with_err(error.message().to_string()));
                Ok(fail(&error))
            }
        }
    }
}

struct RemoveSiteKeys(Arc<AdminContext>);

impl ApiEndpoint for RemoveSiteKeys {
    type Args = RemoveSitekeysBody;

    async fn process_request(&self, args: RemoveSitekeysBody, logger: Option<&Logger>) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: Logger = child(logger, "admin:site-keys:remove");
        log.info(|| LogRecord::msg("Removing site keys").with_data(json!({ "count": args.0.len() })));
        let removed: Result<(), ProsopoError> = async {
            let mut accounts: Vec<String> = Vec::new();
            for site in &args.0 {
                validate_address(&site.site_key, "API.INVALID_SITE_KEY")?;
                accounts.push(site.site_key.clone());
            }
            self.0.services.db.remove_client_records(&accounts).await
        }
        .await;
        match removed {
            Ok(()) => {
                log.info(|| LogRecord::msg("Site keys removed"));
                Ok(success(None))
            }
            Err(error) => {
                log.error(|| LogRecord::msg("Error removing site keys").with_err(error.message().to_string()));
                Ok(fail(&error))
            }
        }
    }
}

struct UpdateDecisionMachine(Arc<AdminContext>);

impl ApiEndpoint for UpdateDecisionMachine {
    type Args = UpdateDecisionMachineBody;

    async fn process_request(&self, args: UpdateDecisionMachineBody, logger: Option<&Logger>) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: Logger = child(logger, "admin:decision-machine:update");
        log.info(|| {
            LogRecord::msg("Updating decision machine").with_data(json!({
                "decisionMachineScope": args.decision_machine_scope.as_str(),
                "dappAccount": args.dapp,
                "kind": args.decision_machine_kind.map(|kind| kind.as_str()),
            }))
        });
        if args.decision_machine_scope == DecisionMachineScope::Dapp && args.dapp.as_deref().is_none_or(str::is_empty) {
            let error: ProsopoError = bad_request(ErrorContext::new().with("scope", args.decision_machine_scope.as_str()));
            log.error(|| LogRecord::msg("Error updating decision machine").with_err(error.message().to_string()));
            return Ok(fail(&error));
        }
        let db = &self.0.services.db;
        let now = db.source().now();
        let artifact: DecisionMachineArtifact = DecisionMachineArtifact {
            id: None,
            scope: args.decision_machine_scope,
            dapp_account: args.dapp.clone(),
            kind: args.decision_machine_kind,
            runtime: args.decision_machine_runtime,
            language: args.decision_machine_language,
            source: args.decision_machine_source.clone(),
            name: args.decision_machine_name.clone(),
            version: args.decision_machine_version.clone(),
            captcha_type: args.decision_machine_captcha_type,
            created_at: now,
            updated_at: now,
        };
        if let Err(error) = db.upsert_decision_machine_artifact(&artifact).await {
            log.error(|| LogRecord::msg("Error updating decision machine").with_err(error.message().to_string()));
            return Ok(fail(&error));
        }
        let mut result: Map<String, Value> = Map::new();
        result.insert("scope".into(), json!(args.decision_machine_scope.as_str()));
        if let Some(dapp) = &args.dapp {
            result.insert("dappAccount".into(), json!(dapp));
        }
        if let Some(kind) = args.decision_machine_kind {
            result.insert("kind".into(), json!(kind.as_str()));
        }
        result.insert("updatedAt".into(), json!(iso_timestamp(now.timestamp_millis())));
        let result: Value = Value::Object(result);
        log.info(|| LogRecord::msg("Decision machine updated").with_data(result.clone()));
        Ok(success(Some(result)))
    }
}

struct GetAllDecisionMachines(Arc<AdminContext>);

impl ApiEndpoint for GetAllDecisionMachines {
    type Args = EmptyBody;

    async fn process_request(&self, _args: EmptyBody, logger: Option<&Logger>) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: Logger = child(logger, "admin:decision-machines:get-all");
        log.info(|| LogRecord::msg("Getting all decision machines"));
        match self.0.services.db.get_all_decision_machine_documents().await {
            Ok(artifacts) => {
                let result: Value = Value::Array(artifacts.iter().map(artifact_json).collect());
                log.info(|| LogRecord::msg("Retrieved all decision machines").with_data(json!({ "count": artifacts.len() })));
                match parsed(get_all_decision_machines_response(), result) {
                    Ok(result) => Ok(success(Some(result))),
                    Err(message) => {
                        log.error(|| LogRecord::msg("Error getting all decision machines").with_err(message.clone()));
                        Ok(fail_message(message))
                    }
                }
            }
            Err(error) => {
                log.error(|| LogRecord::msg("Error getting all decision machines").with_err(error.message().to_string()));
                Ok(fail(&error))
            }
        }
    }
}

struct GetDecisionMachine(Arc<AdminContext>);

impl ApiEndpoint for GetDecisionMachine {
    type Args = DecisionMachineIdBody;

    async fn process_request(&self, args: DecisionMachineIdBody, logger: Option<&Logger>) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: Logger = child(logger, "admin:decision-machine:get");
        log.info(|| LogRecord::msg("Getting decision machine").with_data(json!({ "id": args.id })));
        let found: Result<Document, ProsopoError> = match self.0.services.db.get_decision_machine_document_by_id(&args.id).await {
            Ok(Some(artifact)) => Ok(artifact),
            Ok(None) => Err(bad_request(ErrorContext::new().with("id", args.id.as_str()))),
            Err(error) => Err(error),
        };
        match found {
            Ok(artifact) => {
                log.info(|| LogRecord::msg("Retrieved decision machine").with_data(json!({ "id": args.id })));
                match parsed(get_decision_machine_response(), artifact_json(&artifact)) {
                    Ok(result) => Ok(success(Some(result))),
                    Err(message) => {
                        log.error(|| LogRecord::msg("Error getting decision machine").with_err(message.clone()));
                        Ok(fail_message(message))
                    }
                }
            }
            Err(error) => {
                log.error(|| LogRecord::msg("Error getting decision machine").with_err(error.message().to_string()));
                Ok(fail(&error))
            }
        }
    }
}

struct RemoveDecisionMachine(Arc<AdminContext>);

impl ApiEndpoint for RemoveDecisionMachine {
    type Args = DecisionMachineIdBody;

    async fn process_request(&self, args: DecisionMachineIdBody, logger: Option<&Logger>) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: Logger = child(logger, "admin:decision-machine:remove");
        log.info(|| LogRecord::msg("Removing decision machine").with_data(json!({ "id": args.id })));
        let removed: Result<(), ProsopoError> = match self.0.services.db.remove_decision_machine_artifact(&args.id).await {
            Ok(true) => Ok(()),
            Ok(false) => Err(bad_request(ErrorContext::new().with("id", args.id.as_str()).with("message", "Decision machine not found"))),
            Err(error) => Err(error),
        };
        match removed {
            Ok(()) => {
                let result: Value = json!({ "success": true, "deletedId": args.id });
                log.info(|| LogRecord::msg("Decision machine removed").with_data(result.clone()));
                Ok(match parsed(remove_decision_machine_response(), result) {
                    Ok(result) => success(Some(result)),
                    Err(message) => fail_message(message),
                })
            }
            Err(error) => {
                log.error(|| LogRecord::msg("Error removing decision machine").with_err(error.message().to_string()));
                Ok(fail(&error))
            }
        }
    }
}

struct RemoveAllDecisionMachines(Arc<AdminContext>);

impl ApiEndpoint for RemoveAllDecisionMachines {
    type Args = EmptyBody;

    async fn process_request(&self, _args: EmptyBody, logger: Option<&Logger>) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: Logger = child(logger, "admin:decision-machines:remove-all");
        log.info(|| LogRecord::msg("Removing all decision machines"));
        match self.0.services.db.remove_all_decision_machine_artifacts().await {
            Ok(deleted) => {
                let result: Value = json!({ "success": true, "deletedCount": deleted });
                log.info(|| LogRecord::msg("All decision machines removed").with_data(result.clone()));
                Ok(match parsed(remove_all_decision_machines_response(), result) {
                    Ok(result) => success(Some(result)),
                    Err(message) => fail_message(message),
                })
            }
            Err(error) => {
                log.error(|| LogRecord::msg("Error removing all decision machines").with_err(error.message().to_string()));
                Ok(fail(&error))
            }
        }
    }
}

struct ClearAllCounters(Arc<AdminContext>);

impl ApiEndpoint for ClearAllCounters {
    type Args = ClearAllCountersBody;

    async fn process_request(&self, args: ClearAllCountersBody, logger: Option<&Logger>) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: Logger = child(logger, "admin:counters:clear-all");
        let scope: String = args.dapp.clone().unwrap_or_else(|| "all".to_string());
        log.info(|| LogRecord::msg("Clearing usage counters").with_data(json!({ "scope": scope })));
        let Some(counters) = self.0.services.usage_counters() else {
            return Ok(ApiEndpointResponse::new(ApiEndpointResponseStatus::Fail).with_error("Usage counters not available (Redis unreachable)"));
        };
        let Some(deleted) = counters.clear_all(args.dapp.as_deref()).await else {
            return Ok(ApiEndpointResponse::new(ApiEndpointResponseStatus::Fail).with_error("Counter clear failed"));
        };
        log.info(|| LogRecord::msg("Usage counters cleared").with_data(json!({ "scope": scope, "deletedCount": deleted })));
        Ok(success(Some(json!({ "success": true, "deletedCount": deleted, "scope": scope }))))
    }
}

struct ToggleMaintenanceMode(Arc<AdminContext>);

impl ApiEndpoint for ToggleMaintenanceMode {
    type Args = ToggleMaintenanceModeBody;

    async fn process_request(&self, args: ToggleMaintenanceModeBody, logger: Option<&Logger>) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: Logger = child(logger, "admin:maintenance:toggle");
        let maintenance: &MaintenanceMode = &self.0.maintenance;
        let previous: bool = maintenance.get();
        if let Some(site_keys) = args.site_keys.filter(|site_keys| !site_keys.is_empty()) {
            log.info(|| LogRecord::msg("Toggling maintenance mode for site keys").with_data(json!({ "enabled": args.enabled, "siteKeys": site_keys })));
            maintenance.set_for_site_keys(&site_keys, args.enabled);
            let current: Vec<String> = maintenance.site_keys();
            log.info(|| LogRecord::msg("Maintenance mode site keys updated").with_data(json!({ "siteKeys": current, "maintenanceMode": previous })));
            return Ok(success(Some(json!({ "maintenanceMode": previous, "maintenanceModeSiteKeys": current }))));
        }
        log.info(|| LogRecord::msg("Toggling maintenance mode").with_data(json!({ "enabled": args.enabled, "previous": previous })));
        maintenance.set(args.enabled);
        if let Some(metrics) = &self.0.metrics {
            metrics.set_maintenance_mode(args.enabled);
        }
        let current: bool = maintenance.get();
        log.info(|| LogRecord::msg("Maintenance mode updated").with_data(json!({ "enabled": current })));
        Ok(success(Some(json!({ "maintenanceMode": current, "maintenanceModeSiteKeys": maintenance.site_keys() }))))
    }
}

/// `MAX_LOGGED_INVALID`.
const MAX_LOGGED_INVALID: usize = 5;

/// `dnsEventToFields`: a DNS lookup names the resolver; an HTTP fetch names the peer and, when
/// the catcher checked it, whether the path was valid.
fn dns_event_fields(event: &Value) -> DnsObservation {
    let source: Option<String> = event.get("src_ip").and_then(Value::as_str).map(str::to_string);
    if event.get("kind").and_then(Value::as_str) == Some("dns") {
        return DnsObservation { resolver_ip: source, peer_ip: None, path_valid: None };
    }
    DnsObservation { resolver_ip: None, peer_ip: source, path_valid: event.get("path_valid").and_then(Value::as_bool) }
}

struct DnsEventIngest(Arc<AdminContext>);

impl DnsEventIngest {
    /// `recomputeDnsAsymmetry`: the session's score gains the asymmetry its merged DNS event
    /// shows, if any.
    async fn recompute_dns_asymmetry(&self, session_id: &str, logger: &Logger) {
        let services: &VerifyServices = &self.0.services;
        if services.ip_info.is_none() {
            return;
        }
        let recomputed: Result<(), ProsopoError> = async {
            let Some(mut session) = services.db.get_session_record_by_session_id(session_id).await? else {
                return Ok(());
            };
            let Some(event) = &session.dns_event else {
                return Ok(());
            };
            let addresses: DnsEventAddresses = DnsEventAddresses { peer_ip: event.peer_ip.clone(), resolver_ip: event.resolver_ip.clone(), path_valid: event.path_valid };
            let session_ip_info = record_ip_info(session.ip_info.as_ref());
            let primary: Option<String> = session.ip_info.as_ref().and_then(|info| crate::tasks::verify::bson_json(info).get("ip").and_then(Value::as_str).map(str::to_string));
            let enriched = enrich_dns_event(Some(&addresses), services.ip_info(), primary.as_deref()).await;
            let asymmetry: f64 = compute_dns_asymmetry(enriched.as_ref(), session_ip_info.as_ref(), None);
            if asymmetry > 0.0 {
                session.score_components.dns_asymmetry = Some(asymmetry);
                let components: Bson = bson::serialize_to_bson(&session.score_components).map_err(|error| bad_request(ErrorContext::new().with("error", error.to_string())))?;
                services.db.update_session_record(session_id, &doc! { "scoreComponents": components }, false).await?;
            }
            Ok(())
        }
        .await;
        if let Err(error) = recomputed {
            logger.warn(|| {
                LogRecord::msg("Failed to recompute dnsAsymmetry after DNS event merge").with_err(error.message().to_string()).with_data(json!({ "sessionId": session_id }))
            });
        }
    }
}

impl ApiEndpoint for DnsEventIngest {
    type Args = DnsEventIngestBatch;

    async fn process_request(&self, args: DnsEventIngestBatch, logger: Option<&Logger>) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: Logger = child(logger, "admin:dns-event:ingest");
        let db = &self.0.services.db;
        let now = db.source().now();
        let (mut stored, mut errors, mut dropped): (u64, u64, u64) = (0, 0, 0);
        let mut invalid: Vec<Value> = Vec::new();
        let schema = dns_event_schema();
        for (index, raw) in args.events.iter().enumerate() {
            let event: Value = match schema.validate(Some(raw)) {
                Ok(event) => event,
                Err(error) => {
                    dropped += 1;
                    if invalid.len() < MAX_LOGGED_INVALID {
                        let issues: Vec<String> = error
                            .issues
                            .iter()
                            .map(|issue| {
                                let path: Vec<String> = issue
                                    .path
                                    .iter()
                                    .map(|segment| match segment {
                                        PathSegment::Index(index) => index.to_string(),
                                        PathSegment::Key(key) => key.clone(),
                                    })
                                    .collect();
                                format!("{}: {}", path.join("."), issue.message)
                            })
                            .collect();
                        invalid.push(json!({ "index": index, "issues": issues }));
                    }
                    continue;
                }
            };
            let Some(session_id) = event.get("jti").and_then(Value::as_str).filter(|id| !id.is_empty()) else {
                continue;
            };
            match db.merge_session_dns_event(session_id, &dns_event_fields(&event), now).await {
                Ok(true) => {
                    stored += 1;
                    self.recompute_dns_asymmetry(session_id, &log).await;
                }
                Ok(false) => {}
                Err(error) => {
                    errors += 1;
                    log.warn(|| {
                        LogRecord::msg("Failed to merge DNS event into session")
                            .with_err(error.message().to_string())
                            .with_data(json!({ "sessionId": session_id, "kind": event.get("kind") }))
                    });
                }
            }
        }
        if dropped > 0 {
            log.warn(|| LogRecord::msg("Dropped invalid DNS events from batch").with_data(json!({ "received": args.events.len(), "dropped": dropped, "invalid": invalid })));
        }
        log.info(|| {
            LogRecord::msg("Processed DNS event batch").with_data(json!({ "received": args.events.len(), "stored": stored, "errors": errors, "dropped": dropped }))
        });
        Ok(success(Some(json!({ "stored": stored, "errors": errors, "dropped": dropped }))))
    }
}

struct GetSession(Arc<AdminContext>);

/// The marker `bigIntReplacer` writes a bigint as in a cached session.
const BIGINT_TAG: &str = "__bigint__:";

/// The cached session as express writes it: a revived bigint goes out as its digits, by
/// the `BigInt.prototype.toJSON` the provider installs.
fn without_bigint_tags(value: Value) -> Value {
    match value {
        Value::String(text) => match text.strip_prefix(BIGINT_TAG) {
            Some(digits) => Value::String(digits.to_string()),
            None => Value::String(text),
        },
        Value::Array(items) => Value::Array(items.into_iter().map(without_bigint_tags).collect()),
        Value::Object(fields) => Value::Object(fields.into_iter().map(|(key, value)| (key, without_bigint_tags(value))).collect()),
        other => other,
    }
}

impl ApiEndpoint for GetSession {
    type Args = GetSessionBody;

    async fn process_request(&self, args: GetSessionBody, logger: Option<&Logger>) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: Logger = child(logger, "admin:session:get");
        log.info(|| LogRecord::msg("Getting session state from Mongo and Redis").with_data(json!({ "sessionId": args.session_id })));
        let services: &VerifyServices = &self.0.services;
        let mongo: Option<Document> = match services.db.get_session_document_by_session_id(&args.session_id).await {
            Ok(mongo) => mongo,
            Err(error) => {
                log.error(|| LogRecord::msg("Error reading session state").with_err(error.message().to_string()));
                return Ok(fail(&error));
            }
        };
        let cached: Option<Map<String, Value>> = match services.write_queue() {
            Some(queue) => queue.get_cached_session(&args.session_id).await,
            None => None,
        };
        let redis: Value = cached.map(|cached| without_bigint_tags(Value::Object(cached))).unwrap_or(Value::Null);
        let mongo: Value = mongo.map(|document| express_json(&Bson::Document(document))).unwrap_or(Value::Null);
        Ok(success(Some(json!({ "mongo": mongo, "redis": redis }))))
    }
}

struct AdminRoutes(Arc<AdminContext>);

impl ApiRoutesProvider for AdminRoutes {
    fn get_routes(&self) -> ApiRoutes {
        let context = || self.0.clone();
        let mut routes: ApiRoutes = ApiRoutes::new();
        routes.insert(AdminApiPaths::SiteKeyRegister.as_str().to_string(), Arc::new(RegisterSiteKey(context())));
        routes.insert(AdminApiPaths::SiteKeysRegister.as_str().to_string(), Arc::new(RegisterSiteKeys(context())));
        routes.insert(AdminApiPaths::UpdateDecisionMachine.as_str().to_string(), Arc::new(UpdateDecisionMachine(context())));
        routes.insert(AdminApiPaths::GetAllDecisionMachines.as_str().to_string(), Arc::new(GetAllDecisionMachines(context())));
        routes.insert(AdminApiPaths::GetDecisionMachine.as_str().to_string(), Arc::new(GetDecisionMachine(context())));
        routes.insert(AdminApiPaths::RemoveDecisionMachine.as_str().to_string(), Arc::new(RemoveDecisionMachine(context())));
        routes.insert(AdminApiPaths::RemoveAllDecisionMachines.as_str().to_string(), Arc::new(RemoveAllDecisionMachines(context())));
        routes.insert(AdminApiPaths::ClearAllCounters.as_str().to_string(), Arc::new(ClearAllCounters(context())));
        routes.insert(AdminApiPaths::SiteKeyRemove.as_str().to_string(), Arc::new(RemoveSiteKey(context())));
        routes.insert(AdminApiPaths::SiteKeysRemove.as_str().to_string(), Arc::new(RemoveSiteKeys(context())));
        routes.insert(AdminApiPaths::ToggleMaintenanceMode.as_str().to_string(), Arc::new(ToggleMaintenanceMode(context())));
        routes.insert(AdminApiPaths::DnsEvent.as_str().to_string(), Arc::new(DnsEventIngest(context())));
        routes.insert(AdminApiPaths::GetSession.as_str().to_string(), Arc::new(GetSession(context())));
        routes
    }
}

pub struct AdminState {
    /// Absent without a database, when the TS mounts no admin routes.
    pub context: Option<Arc<AdminContext>>,
    pub log_level: LogLevel,
    pub router: OnceLock<Option<(Router, Vec<String>)>>,
}

impl AdminState {
    fn router(&self) -> Option<&(Router, Vec<String>)> {
        self.router
            .get_or_init(|| {
                let context: Arc<AdminContext> = self.context.clone()?;
                let routes: AdminRoutes = AdminRoutes(context);
                let paths: Vec<String> = routes.get_routes().keys().cloned().collect();
                let adapter = Arc::new(DefaultEndpointAdapter::new(self.log_level, Some(400)));
                Some((create_router(&routes, adapter), paths))
            })
            .as_ref()
    }
}

/// The admin router, after the access-rule routes: a POST to an admin route is answered,
/// anything else goes on.
pub async fn admin_routes(State(state): State<Arc<AdminState>>, request: Request, next: Next) -> Response {
    let Some((router, paths)) = state.router() else {
        return next.run(request).await;
    };
    let route: Option<String> =
        (request.method() == Method::POST).then(|| paths.iter().find(|route| route_matches(request.uri().path(), route)).cloned()).flatten();
    let Some(route) = route else {
        return next.run(request).await;
    };
    match router.clone().oneshot(at_route(request, &route)).await {
        Ok(response) => response,
        Err(never) => match never {},
    }
}
