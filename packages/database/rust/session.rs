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

//! Frictionless sessions (provider.ts).

use crate::operation::{Operation, Reply, UpdateStatement};
use crate::provider::{collections, db_error, decode, ProviderDatabase};
use crate::records::{CompositeIpAddress, StoredResult};
use crate::source::SourceIds;
use bson::{doc, Bson, DateTime, Document};
use prosopo_common::{ErrorContext, ProsopoError};
use prosopo_logger::LogRecord;
use prosopo_types::api_types::ClientMetaData;
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::client::ModeEnum;
use prosopo_types::stored::SimdReadingsStage;
use prosopo_types_database::document::create;
use prosopo_types_database::projection::session_projection;
use prosopo_types_database::provider::SESSION_RECORD;
use prosopo_types_database::update::{cast_update, UpdateMethod};
use serde::{Deserialize, Serialize};

/// Declares a record whose optional fields are left out when absent, as the TS leaves out an
/// `undefined` property.
macro_rules! record {
    (
        $(#[$meta:meta])*
        pub struct $name:ident {
            $(pub $field:ident: $kind:ty,)*
            optional {
                $(pub $optional:ident: $optional_kind:ty,)*
            }
        }
    ) => {
        $(#[$meta])*
        #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
        #[serde(rename_all = "camelCase")]
        pub struct $name {
            $(pub $field: $kind,)*
            $(
                #[serde(default, skip_serializing_if = "Option::is_none")]
                pub $optional: Option<$optional_kind>,
            )*
        }
    };
}

record! {
    /// `ScoreComponents`.
    pub struct ScoreComponents {
        pub base_score: f64,
        optional {
            pub l_score: f64,
            pub timeout: f64,
            pub access_policy: f64,
            pub unverified_host: f64,
            pub web_view: f64,
            pub triggered_detectors: Vec<f64>,
            pub shadow_dom_penalty: bool,
            pub dns_asymmetry: f64,
        }
    }
}

record! {
    /// A session's `dnsEvent`.
    pub struct DnsEvent {
        pub received_at: DateTime,
        optional {
            pub resolver_ip: String,
            pub peer_ip: String,
            pub path_valid: bool,
        }
    }
}

record! {
    /// `Session`. The fields mongoose stores as `Mixed` keep the key order they were given, so
    /// they are held as BSON.
    pub struct Session {
        pub session_id: String,
        pub created_at: DateTime,
        pub token: String,
        pub score: f64,
        pub threshold: f64,
        pub score_components: ScoreComponents,
        pub ip_address: CompositeIpAddress,
        pub captcha_type: CaptchaType,
        pub web_view: bool,
        pub i_frame: bool,
        pub decrypted_head_hash: String,
        optional {
            pub mode: ModeEnum,
            pub solved_images_count: f64,
            pub pow_difficulty: f64,
            pub puzzle_tolerance: f64,
            pub puzzle: Bson,
            pub icon_order_tolerance: f64,
            pub icon_order: Bson,
            pub puzzle_level: f64,
            pub stored_at_timestamp: DateTime,
            pub last_updated_timestamp: DateTime,
            pub pending_stage: bool,
            pub deleted: bool,
            pub user_sitekey_ip_hash: String,
            pub is_escalation: bool,
            pub origin_session_id: String,
            pub refresh_of: String,
            pub refresh_count: f64,
            pub refreshed_after_ms: f64,
            pub bundle_id: String,
            pub site_key: String,
            pub current_url: String,
            pub iframe_url: String,
            pub is_protect: bool,
            pub reason: String,
            pub blocked: bool,
            pub rule_hash: String,
            pub rule_type: Vec<String>,
            pub rule_description: String,
            pub matched_rule: Bson,
            pub ip_info: Bson,
            pub headers: Document,
            pub result: StoredResult,
            pub user_submitted: bool,
            pub server_checked: bool,
            pub agent: bool,
            pub web_bot_auth_agent: String,
            pub simd_readings: Bson,
            pub simd_readings_stage: SimdReadingsStage,
            pub d: Bson,
            pub tcp_to_chello_us: f64,
            pub chello_to_handshake_us: f64,
            pub syn_ns: f64,
            pub synack_ns: f64,
            pub ack_ns: f64,
            pub observed_ttl: f64,
            pub tcp_mss: f64,
            pub tcp_wscale: f64,
            pub tcp_window: f64,
            pub tcp_opts_kinds: Vec<f64>,
            pub tcp_opts_present: f64,
            pub tcp_opts_count: f64,
            pub tcp_tsval: f64,
            pub tcp_tsecr: f64,
            pub tcp_flags: f64,
            pub tcp_data_offset_resv: f64,
            pub tcp_urg_ptr: f64,
            pub ip_ident: f64,
            pub ip_total_len: f64,
            pub ip_frag_flags: f64,
            pub ip_tos: f64,
            pub tcp_opts_flags: f64,
            pub tcp_opts_order: f64,
            pub dns_event: DnsEvent,
            pub client_meta_data: ClientMetaData,
        }
    }
}

/// The parts of a DNS sidecar observation `mergeSessionDnsEvent` writes.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct DnsObservation {
    pub resolver_ip: Option<String>,
    pub peer_ip: Option<String>,
    pub path_valid: Option<bool>,
}

impl Session {
    fn to_document(&self) -> Result<Document, String> {
        bson::serialize_to_document(self).map_err(|error| error.to_string())
    }
}

impl ProviderDatabase {
    fn session_error(&self, key: &str, context: ErrorContext) -> ProsopoError {
        db_error(key, context, Some(self.logger()))
    }

    async fn insert_session(&self, session: &Session) -> Result<(), String> {
        let input: Document = session.to_document()?;
        let document: Document = create(&SESSION_RECORD, &input, &mut SourceIds(self.source())).map_err(|error| error.to_string())?;
        self.run(Operation::Insert {
            collection: collections::SESSION.to_string(),
            documents: vec![document],
        })
        .await
        .map_err(|error| error.to_string())?;
        Ok(())
    }

    /// `storeSessionRecord`: stamped `lastUpdatedTimestamp` (its creation time unless given) and
    /// `pendingStage`, so the sweep stages it.
    pub async fn store_session_record(&self, session: &Session) -> Result<(), ProsopoError> {
        let mut record: Session = session.clone();
        record.last_updated_timestamp = Some(session.last_updated_timestamp.unwrap_or(session.created_at));
        record.pending_stage = Some(true);
        self.insert_session(&record).await.map_err(|error| {
            self.session_error(
                "DATABASE.SESSION_STORE_FAILED",
                ErrorContext::new().with("error", error).with("sessionId", session.session_id.as_str()),
            )
        })
    }

    /// `storeBlockedSession`: the session of a request refused at the door, `blocked` and
    /// `deleted` so no captcha flow picks it up, and stamped stored so the TTL index sweeps it.
    /// A failure is logged, not returned: the refusal must not wait on it.
    pub async fn store_blocked_session(&self, session: &Session) {
        let mut record: Session = session.clone();
        record.blocked = Some(true);
        record.deleted = Some(true);
        record.stored_at_timestamp = Some(session.stored_at_timestamp.unwrap_or(session.created_at));
        record.last_updated_timestamp = Some(session.last_updated_timestamp.unwrap_or(session.created_at));
        if let Err(error) = self.insert_session(&record).await {
            self.logger().warn(|| {
                LogRecord::msg("Failed to persist blocked session record").with_err(error).with_data(serde_json::json!({
                    "sessionId": session.session_id,
                    "siteKey": session.site_key,
                }))
            });
        }
    }

    async fn find_session(&self, filter: Document, projection: Option<Document>) -> Result<Option<Session>, ProsopoError> {
        let filter: Document = self.filter(&SESSION_RECORD, filter);
        let mut operation: Operation = Operation::find(collections::SESSION, filter).with_limit(1);
        if let Some(projection) = projection {
            operation = operation.with_projection(projection);
        }
        Ok(self.find(operation).await?.into_iter().next().and_then(decode))
    }

    /// `getSessionRecordBySessionId`: the fields `SESSION_PROJECTION` selects.
    pub async fn get_session_record_by_session_id(&self, session_id: &str) -> Result<Option<Session>, ProsopoError> {
        self.find_session(doc! { "sessionId": session_id }, Some(session_projection())).await
    }

    /// `getSessionRecordByToken`.
    pub async fn get_session_record_by_token(&self, token: &str) -> Result<Option<Session>, ProsopoError> {
        self.find_session(doc! { "token": token }, None).await
    }

    /// `getSessionByuserSitekeyIpHash`: the session of that hash not yet consumed.
    pub async fn get_session_by_user_sitekey_ip_hash(&self, hash: &str) -> Result<Option<Session>, ProsopoError> {
        self.find_session(doc! { "userSitekeyIpHash": hash, "deleted": { "$exists": false } }, None)
            .await
            .map_err(|error| {
                self.session_error(
                    "DATABASE.SESSION_GET_FAILED",
                    ErrorContext::new().with("error", error.to_string()).with("userSitekeyIpHash", hash),
                )
            })
    }

    /// `checkAndRemoveSession`: consumes the session, returning it as it was, or nothing if it
    /// was already consumed or never existed.
    pub async fn check_and_remove_session(&self, session_id: &str) -> Result<Option<Session>, ProsopoError> {
        let failed = |error: String| {
            self.session_error(
                "DATABASE.SESSION_CHECK_REMOVE_FAILED",
                ErrorContext::new().with("error", error).with("sessionId", session_id),
            )
        };
        let query: Document = self.filter(&SESSION_RECORD, doc! { "sessionId": session_id, "deleted": { "$exists": false } });
        let update: Document = doc! { "deleted": true, "lastUpdatedTimestamp": self.source().now(), "pendingStage": true };
        let cast: Document = cast_update(&SESSION_RECORD, UpdateMethod::FindOneAndUpdate, &update, &query, false, &mut SourceIds(self.source()))
            .map_err(|error| failed(error.to_string()))?;
        let reply: Reply = self
            .run(Operation::FindAndModify {
                collection: collections::SESSION.to_string(),
                query,
                update: cast,
                upsert: Some(false),
            })
            .await
            .map_err(|error| failed(error.to_string()))?;
        Ok(match reply {
            Reply::Value(Some(document)) => decode(document),
            _ => None,
        })
    }

    async fn update_session(&self, session_id: &str, statement: Result<UpdateStatement, String>, key: &str) -> Result<Reply, ProsopoError> {
        let failed = |error: String| self.session_error(key, ErrorContext::new().with("error", error).with("sessionId", session_id));
        self.run(Operation::update(collections::SESSION, vec![statement.map_err(failed)?]))
            .await
            .map_err(|error| failed(error.to_string()))
    }

    /// `claimSessionServerCheck`: whether this call is the one that marked the session checked.
    pub async fn claim_session_server_check(&self, session_id: &str) -> Result<bool, ProsopoError> {
        let statement: Result<UpdateStatement, String> = self.statement(
            &SESSION_RECORD,
            UpdateMethod::UpdateOne,
            doc! { "sessionId": session_id, "serverChecked": { "$ne": true } },
            doc! { "$set": { "serverChecked": true, "lastUpdatedTimestamp": self.source().now(), "pendingStage": true } },
            false,
        );
        Ok(matches!(
            self.update_session(session_id, statement, "DATABASE.SESSION_GET_FAILED").await?,
            Reply::Update { modified, .. } if modified > 0
        ))
    }

    /// `updateSessionRecord`: the fields given, as a `$set`.
    pub async fn update_session_record(&self, session_id: &str, updates: &Document) -> Result<(), ProsopoError> {
        let mut set: Document = updates.clone();
        set.insert("lastUpdatedTimestamp", self.source().now());
        set.insert("pendingStage", true);
        let statement: Result<UpdateStatement, String> = self.statement(
            &SESSION_RECORD,
            UpdateMethod::UpdateOne,
            doc! { "sessionId": session_id },
            doc! { "$set": set },
            false,
        );
        self.update_session(session_id, statement, "DATABASE.SESSION_GET_FAILED").await?;
        Ok(())
    }

    /// `recordSessionSimdReadingsIfAbsent`: the first readings, and the stage they came at,
    /// win.
    pub async fn record_session_simd_readings_if_absent(&self, session_id: &str, readings: &Bson, stage: SimdReadingsStage) -> Result<(), ProsopoError> {
        let filter: Document = self.filter(&SESSION_RECORD, doc! { "sessionId": session_id });
        let statement: UpdateStatement = UpdateStatement::pipeline(
            filter,
            vec![doc! { "$set": {
                "simdReadings": { "$ifNull": ["$simdReadings", readings.clone()] },
                "simdReadingsStage": { "$ifNull": ["$simdReadingsStage", stage.as_str()] },
                "lastUpdatedTimestamp": self.source().now(),
                "pendingStage": true,
            } }],
        );
        self.run(Operation::update(collections::SESSION, vec![statement])).await.map_err(|error| {
            self.session_error(
                "DATABASE.SESSION_GET_FAILED",
                ErrorContext::new().with("error", error.to_string()).with("sessionId", session_id).with("stage", stage.as_str()),
            )
        })?;
        Ok(())
    }

    /// `mergeSessionDnsEvent`: each observed field set on its own, so the DNS and HTTP legs
    /// do not overwrite each other, and `receivedAt` kept from the first. Whether the session
    /// exists.
    pub async fn merge_session_dns_event(&self, session_id: &str, observation: &DnsObservation, received_at_if_absent: DateTime) -> Result<bool, ProsopoError> {
        let mut set: Document = doc! {
            "dnsEvent.receivedAt": { "$ifNull": ["$dnsEvent.receivedAt", received_at_if_absent] },
            "lastUpdatedTimestamp": self.source().now(),
            "pendingStage": true,
        };
        if let Some(resolver_ip) = &observation.resolver_ip {
            set.insert("dnsEvent.resolverIp", resolver_ip.as_str());
        }
        if let Some(peer_ip) = &observation.peer_ip {
            set.insert("dnsEvent.peerIp", peer_ip.as_str());
        }
        if let Some(path_valid) = observation.path_valid {
            set.insert("dnsEvent.pathValid", path_valid);
        }
        let filter: Document = self.filter(&SESSION_RECORD, doc! { "sessionId": session_id });
        let statement: UpdateStatement = UpdateStatement::pipeline(filter, vec![doc! { "$set": set }]);
        let reply: Reply = self.update_session(session_id, Ok(statement), "DATABASE.SESSION_GET_FAILED").await?;
        Ok(matches!(reply, Reply::Update { matched, .. } if matched > 0))
    }

    /// `getUnstoredSessionRecords`.
    pub async fn get_unstored_session_records(&self, limit: Option<f64>, after_id: Option<&Bson>) -> Result<Vec<Document>, ProsopoError> {
        self.unstored(collections::SESSION, &SESSION_RECORD, limit.unwrap_or(1000.0), after_id).await
    }

    /// `markSessionRecordsStored`.
    pub async fn mark_session_records_stored(&self, session_ids: &[String], as_of: Option<DateTime>) -> Result<(), ProsopoError> {
        self.mark_stored(collections::SESSION, &SESSION_RECORD, "sessionId", session_ids, as_of).await
    }
}
