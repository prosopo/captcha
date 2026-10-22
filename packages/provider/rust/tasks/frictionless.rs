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
        Bson::Document(document) => Value::Object(document.iter().filter(|(_, value)| !matches!(value, Bson::Undefined)).map(|(key, value)| (key.clone(), lean_json(value))).collect()),
        Bson::Array(items) => Value::Array(items.iter().map(lean_json).collect()),
        Bson::Undefined => Value::Null,
        other => other.clone().into_relaxed_extjson(),
    }
}

/// An address computed for this request, as `bigIntReplacer` writes its halves into the cache
/// (`"__bigint__:<digits>"`), where one read back from Mongo is a Decimal128.
pub fn tag_fresh_address(cached: &mut Map<String, Value>) {
    if let Some(Value::Object(address)) = cached.get_mut("ipAddress") {
        for half in ["lower", "upper"] {
            let digits: Option<String> = address.get(half).and_then(|value| value.get("$numberDecimal")).and_then(Value::as_str).map(str::to_string);
            if let Some(digits) = digits {
                address.insert(half.to_string(), prosopo_database::redis_cache::tag_bigint(&digits));
            }
        }
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
    /// `userSitekeyIpHash`, both awaited. `fresh_address` when the address was computed for
    /// this request rather than read from a stored session.
    pub async fn create_session(&self, session_id: String, created_at: DateTime, fields: &Document, fresh_address: bool) -> Result<Session, String> {
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
            let mut cached: Map<String, Value> = record.iter().map(|(key, value)| (key.clone(), lean_json(value))).collect();
            if fresh_address {
                tag_fresh_address(&mut cached);
            }
            queue.cache_session(&session_id, &cached, None).await;
            if let Some(hash) = session.user_sitekey_ip_hash.as_deref().filter(|hash| !hash.is_empty()) {
                queue.cache_session_by_hash(hash, &session_id, None).await;
            }
        }
        Ok(session)
    }
}

/// What `checkLangRules` gives: a number, or, once a language names a property every JS object
/// inherits (`constructor`, `toString`, `__proto__`, …), a string, since the TS indexes the
/// rules object with it and adds what it finds. Every later use of such a score is string
/// concatenation, and the session it is written to fails mongoose's cast.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum LangScore {
    Number(f64),
    Poisoned,
}

/// What `Object.prototype` answers to: the names a rules object finds without having them.
const INHERITED: [&str; 12] = [
    "constructor", "__defineGetter__", "__defineSetter__", "hasOwnProperty", "__lookupGetter__", "__lookupSetter__", "isPrototypeOf",
    "propertyIsEnumerable", "toString", "valueOf", "__proto__", "toLocaleString",
];

/// rules/lang.ts's `checkLangRules`: the configured penalty of each language the
/// `Accept-Language` header names, summed.
pub fn check_lang_rules(l_rules: Option<&serde_json::Map<String, Value>>, accept_language: &str) -> LangScore {
    let Some(rules) = l_rules.filter(|_| !accept_language.is_empty()) else {
        return LangScore::Number(0.0);
    };
    let mut score: LangScore = LangScore::Number(0.0);
    for lang in accept_language.split(',').filter_map(|lang| lang.trim_matches(crate::honeypot::is_js_whitespace).split(';').next()) {
        if lang.is_empty() {
            continue;
        }
        match rules.get(lang) {
            Some(value) if lang != "__proto__" => {
                let penalty: f64 = value.as_f64().unwrap_or(f64::NAN);
                if penalty != 0.0 && !penalty.is_nan() {
                    if let LangScore::Number(total) = score {
                        score = LangScore::Number(total + penalty);
                    }
                }
            }
            _ if INHERITED.contains(&lang) => score = LangScore::Poisoned,
            _ => {}
        }
    }
    score
}

/// frictionlessTasksUtils.ts's `timestampDecayFunction`: image rounds for a payload `now_ms -
/// timestamp` old, between 2 and `image_max_rounds` (12 past an hour).
pub fn timestamp_decay_function(timestamp: f64, image_max_rounds: f64, now_ms: f64) -> f64 {
    let max: f64 = now_ms;
    if max - timestamp > 3_600_000.0 {
        return js_min(image_max_rounds, 12.0);
    }
    let min: f64 = 1000.0;
    let age: f64 = max - timestamp;
    let decay: f64 = 2000f64.log10() / max;
    let big_score: f64 = max * (1.0 - (1.0 - (decay * age).exp().powi(24)));
    let scaled: f64 = (big_score.ln() - min.ln()) / (max.ln() - min.ln()) * 2.5;
    js_min(image_max_rounds, js_max(2.0, prosopo_types::js_math_round(scaled)))
}

/// `getRoundsFromTriggeredDetectors`: the baseline plus a round per signal, at most six more.
pub fn rounds_from_triggered_detectors(base: f64, triggered: Option<&[f64]>) -> f64 {
    base + triggered.map_or(0, <[f64]>::len).min(6) as f64
}

/// `Math.min` of two: NaN if either is.
fn js_min(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() { f64::NAN } else { a.min(b) }
}

/// `Math.max` of two: NaN if either is.
fn js_max(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() { f64::NAN } else { a.max(b) }
}

/// refreshLineage.ts's `isImageSwitchRequestValid`: the user asked, the switch is on, and the
/// session refreshed was a puzzle.
pub fn is_image_switch_request_valid(switch_to_image: bool, replaced: Option<prosopo_types::captcha_type::CaptchaType>, switch_enabled: bool) -> bool {
    switch_to_image && switch_enabled && replaced == Some(prosopo_types::captcha_type::CaptchaType::Puzzle)
}
