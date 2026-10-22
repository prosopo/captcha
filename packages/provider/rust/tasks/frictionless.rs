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

//! tasks/frictionless/frictionlessTasksUtils.ts, and frictionlessTasks.ts's `createSession`.

use bson::{Bson, DateTime, Document};
use prosopo_database::provider::ProviderDatabase;
use prosopo_database::redis_cache::RedisWriteQueue;
use prosopo_database::session::{ScoreComponents, Session};
use serde_json::{Map, Value};

/// `computeFrictionlessScore` over the numeric components in order: their sum, at most 1,
/// rounded as `toFixed(2)` rounds. A NaN component makes the score NaN.
pub fn frictionless_score(components: impl IntoIterator<Item = f64>) -> f64 {
    let sum: f64 = components.into_iter().fold(0.0, |sum, value| sum + value);
    let capped: f64 = if sum.is_nan() { f64::NAN } else { sum.min(1.0) };
    prosopo_util::to_fixed(capped, 2).parse::<f64>().unwrap_or(f64::NAN)
}

/// `computeFrictionlessScore` of a session's components, in the order the schema stores them.
pub fn compute_frictionless_score(components: &ScoreComponents) -> f64 {
    let numeric = [
        Some(components.base_score),
        components.l_score,
        components.timeout,
        components.access_policy,
        components.unverified_host,
        components.web_view,
        components.dns_asymmetry,
    ];
    frictionless_score(numeric.into_iter().flatten())
}

/// The fields `createSession` builds a session record from, in the order it builds them;
/// `simdReadingsStage` is derived, the raw TLS signals follow `chelloToHandshakeUs` in
/// `RAW_TLS_SIGNAL_KEYS` order.
const CREATE_SESSION_ORDER: [&str; 63] = [
    "sessionId", "createdAt", "token", "score", "threshold", "scoreComponents", "ipAddress", "captchaType", "mode", "solvedImagesCount",
    "powDifficulty", "puzzleTolerance", "puzzle", "puzzleLevel", "iconOrderTolerance", "iconOrder", "userSitekeyIpHash", "webView", "iFrame",
    "isEscalation", "originSessionId", "refreshOf", "refreshCount", "refreshedAfterMs", "decryptedHeadHash", "bundleId", "reason", "siteKey",
    "currentUrl", "iframeUrl", "isProtect", "blocked", "deleted", "ipInfo", "headers", "simdReadings", "simdReadingsStage", "d", "tcpToChelloUs",
    "chelloToHandshakeUs", "synNs", "synackNs", "ackNs", "observedTtl", "tcpMss", "tcpWscale", "tcpWindow", "tcpOptsKinds", "tcpOptsPresent",
    "tcpOptsCount", "tcpTsval", "tcpTsecr", "tcpFlags", "tcpDataOffsetResv", "tcpUrgPtr", "ipIdent", "ipTotalLen", "ipFragFlags", "ipTos",
    "tcpOptsFlags", "tcpOptsOrder", "matchedRule", "clientMetaData",
];

/// A stored value as `JSON.stringify` writes what a lean read gave the TS: a date as its ISO
/// string, a Decimal128 as `{"$numberDecimal": …}`.
pub fn lean_json(value: &Bson) -> Value {
    match value {
        Bson::DateTime(date) => Value::String(prosopo_logger::iso_timestamp(date.timestamp_millis())),
        Bson::Document(document) => Value::Object(document.iter().map(|(key, value)| (key.clone(), lean_json(value))).collect()),
        Bson::Array(items) => Value::Array(items.iter().map(lean_json).collect()),
        other => other.clone().into_relaxed_extjson(),
    }
}

/// Where `createSession` keeps what it makes.
pub struct SessionStores<'a> {
    pub db: &'a ProviderDatabase,
    pub write_queue: Option<&'a RedisWriteQueue>,
}

/// `getSessionIDPrefix`: the host without `.prosopo.io`, or `local`.
pub fn session_id_prefix(host: Option<&str>) -> String {
    match host.filter(|host| !host.is_empty()) {
        Some(host) => host.replace(".prosopo.io", ""),
        None => "local".to_string(),
    }
}

impl SessionStores<'_> {
    /// `createSession`: a session record from `fields` (every key but the id and creation time,
    /// absent where the TS input leaves it undefined), stored, then cached with its pointer from
    /// `userSitekeyIpHash`, both awaited.
    pub async fn create_session(&self, session_id: String, created_at: DateTime, fields: &Document) -> Result<Session, String> {
        let mut record: Document = Document::new();
        record.insert("sessionId", session_id.clone());
        record.insert("createdAt", created_at);
        for key in CREATE_SESSION_ORDER.iter().skip(2) {
            match *key {
                "webView" | "iFrame" => {
                    record.insert(*key, fields.get(*key).cloned().unwrap_or(Bson::Boolean(false)));
                }
                "decryptedHeadHash" => {
                    record.insert(*key, fields.get(*key).cloned().unwrap_or_else(|| Bson::String(String::new())));
                }
                "simdReadingsStage" => {
                    if fields.get("simdReadings").is_some_and(|readings| !matches!(readings, Bson::Null)) {
                        record.insert(*key, "frictionless");
                    }
                }
                _ => {
                    if let Some(value) = fields.get(*key) {
                        record.insert(*key, value.clone());
                    }
                }
            }
        }
        let session: Session = bson::deserialize_from_document(record.clone()).map_err(|error| error.to_string())?;
        self.db.store_session_record(&session).await.map_err(|error| error.message().to_string())?;
        if let Some(queue) = self.write_queue {
            let cached: Map<String, Value> = record.iter().map(|(key, value)| (key.clone(), lean_json(value))).collect();
            queue.cache_session(&session_id, &cached, None).await;
            if let Some(hash) = session.user_sitekey_ip_hash.as_deref().filter(|hash| !hash.is_empty()) {
                queue.cache_session_by_hash(hash, &session_id, None).await;
            }
        }
        Ok(session)
    }
}
