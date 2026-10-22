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

//! captchaManager.ts's `isValidRequest`: whether a challenge of the requested type may be
//! issued, consuming the frictionless session that authorised it.
//!
//! The TS also takes the request's IP and checks it against the session through
//! `validateSessionIP`, which always passes; that check is left out rather than ported empty.

use crate::tasks::audio_alternative::{is_audio_alternative_allowed, is_audio_alternative_enabled};
use bson::Bson;
use prosopo_common::ProsopoError;
use prosopo_database::clients::ClientRecord;
use prosopo_database::provider::ProviderDatabase;
use prosopo_database::redis_cache::RedisWriteQueue;
use prosopo_database::session::Session;
use prosopo_logger::{LogRecord, Logger};
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::reasons::ResultReason;
use prosopo_types::settings::is_captcha_type_feature_enabled;
use prosopo_user_access_policy::AccessRule;
use redis::aio::ConnectionLike;
use serde_json::{json, Value};

/// What `isValidRequest` decides.
#[derive(Debug, Clone, PartialEq)]
pub enum Validation {
    /// The request may be served. For a session-backed request, what the session carries.
    Valid {
        /// The session consumed, which may be an escalation the origin pointed to.
        session_id: Option<String>,
        /// The session's PoW difficulty, when set and not zero.
        pow_difficulty: Option<f64>,
        /// The session's `solvedImagesCount`, when set and not zero. Only the image route
        /// reads it, and only an image session reaches that route, so it is always the number
        /// of image rounds there.
        image_rounds: Option<f64>,
        /// The session's stored `ipInfo`.
        ip_info: Option<Bson>,
    },
    Invalid(ResultReason),
}

impl Validation {
    fn sessionless() -> Validation {
        Validation::Valid { session_id: None, pow_difficulty: None, image_rounds: None, ip_info: None }
    }
}

/// A positive, non-NaN number, as `x && { x }` keeps it.
fn truthy(value: Option<f64>) -> Option<f64> {
    value.filter(|number| *number != 0.0 && !number.is_nan())
}

/// The site's settings as the TS reads them off a lean client record.
pub fn settings_json(client: &ClientRecord) -> Option<Value> {
    client.settings.as_ref().map(|settings| Bson::Document(settings.clone()).into_relaxed_extjson())
}

fn type_enabled(requested: CaptchaType, settings: Option<&Value>) -> bool {
    if requested == CaptchaType::Audio {
        is_audio_alternative_enabled(settings)
    } else {
        is_captcha_type_feature_enabled(requested, settings.and_then(|settings| settings.get("captchaTypeFeatureFlags")))
    }
}

/// The stores `isValidRequest` reads and writes.
pub struct RequestStores<'a, C: Clone = prosopo_redis_client::RedisClient> {
    pub db: &'a ProviderDatabase,
    pub write_queue: Option<&'a RedisWriteQueue<C>>,
    pub logger: &'a Logger,
}

impl<C> RequestStores<'_, C>
where
    C: ConnectionLike + Clone + Send + Sync + 'static,
{
    async fn invalidate(&self, session_id: &str, hash: Option<&str>) {
        if let Some(queue) = self.write_queue {
            match hash {
                Some(hash) => {
                    tokio::join!(queue.invalidate_cached_session(session_id), queue.invalidate_cached_session_by_hash(hash));
                }
                None => queue.invalidate_cached_session(session_id).await,
            }
        }
    }

    /// The escalation a consumed origin session points to, when it is of the requested type.
    /// `Err` with the refusal when it is of another type, which leaves it unconsumed.
    async fn follow_escalation(&self, client: &ClientRecord, origin: &str, requested: CaptchaType) -> Result<Result<Option<(Session, String)>, ResultReason>, ProsopoError> {
        let Some(queue) = self.write_queue else {
            return Ok(Ok(None));
        };
        let Some(escalation_id) = queue.get_cached_session_escalation(origin).await.filter(|id| !id.is_empty() && id != origin) else {
            return Ok(Ok(None));
        };
        let mut followed: Option<(Session, String)> = None;
        if let Some(peeked) = self.db.get_session_record_by_session_id(&escalation_id).await? {
            self.logger.info(|| {
                LogRecord::msg("Resolving origin sessionId to escalation").with_data(json!({
                    "account": client.account,
                    "originSessionId": origin,
                    "escalationSessionId": escalation_id,
                    "escalationCaptchaType": peeked.captcha_type.as_str(),
                    "requestedCaptchaType": requested.as_str(),
                }))
            });
            if peeked.captcha_type != requested {
                self.logger.warn(|| {
                    LogRecord::msg("Escalation captcha type does not match requested type").with_data(json!({
                        "account": client.account,
                        "originSessionId": origin,
                        "escalationSessionId": escalation_id,
                        "escalationCaptchaType": peeked.captcha_type.as_str(),
                        "requestedCaptchaType": requested.as_str(),
                    }))
                });
                queue.invalidate_cached_session_escalation(origin).await;
                return Ok(Err(ResultReason::IncorrectCaptchaType));
            }
            if let Some(consumed) = self.db.check_and_remove_session(&escalation_id).await? {
                followed = Some((consumed, escalation_id.clone()));
            }
        }
        queue.invalidate_cached_session_escalation(origin).await;
        Ok(Ok(followed))
    }

    /// `isValidRequest(clientSettings, requestedCaptchaType, env, sessionId, userAccessPolicy)`.
    pub async fn is_valid_request(
        &self,
        client: &ClientRecord,
        requested: CaptchaType,
        session_id: Option<&str>,
        user_access_policy: Option<&AccessRule>,
    ) -> Result<Validation, ProsopoError> {
        let settings: Option<Value> = settings_json(client);
        if !type_enabled(requested, settings.as_ref()) {
            self.logger.warn(|| {
                LogRecord::msg("Captcha type is switched off for this site")
                    .with_data(json!({ "account": client.account, "requestedCaptchaType": requested.as_str(), "sessionId": session_id }))
            });
            return Ok(Validation::Invalid(ResultReason::IncorrectCaptchaType));
        }

        if let Some(session_id) = session_id.filter(|id| !id.is_empty()) {
            let cached_hash: Option<String> = match self.write_queue {
                Some(queue) => queue
                    .get_cached_session(session_id)
                    .await
                    .and_then(|cached| cached.get("userSitekeyIpHash").and_then(Value::as_str).filter(|hash| !hash.is_empty()).map(str::to_string)),
                None => None,
            };
            self.invalidate(session_id, cached_hash.as_deref()).await;

            let mut consumed: Option<(Session, String)> =
                self.db.check_and_remove_session(session_id).await?.map(|session| (session, session_id.to_string()));
            if consumed.is_none() {
                match self.follow_escalation(client, session_id, requested).await? {
                    Ok(followed) => consumed = followed,
                    Err(reason) => return Ok(Validation::Invalid(reason)),
                }
            }
            let Some((session, resolved_id)) = consumed else {
                self.logger.warn(|| LogRecord::msg("No session found").with_data(json!({ "account": client.account, "sessionId": session_id })));
                self.invalidate(session_id, cached_hash.as_deref()).await;
                return Ok(Validation::Invalid(ResultReason::CaptchaNoSessionFound));
            };

            self.invalidate(&resolved_id, session.user_sitekey_ip_hash.as_deref().filter(|hash| !hash.is_empty())).await;

            if session.site_key.as_ref().is_some_and(|site_key| Some(site_key) != client.account.as_ref()) {
                self.logger.warn(|| {
                    LogRecord::msg("Session was issued for a different site key")
                        .with_data(json!({ "account": client.account, "sessionId": resolved_id, "sessionSiteKey": session.site_key }))
                });
                return Ok(Validation::Invalid(ResultReason::CaptchaNoSessionFound));
            }

            if session.captcha_type != requested && !is_audio_alternative_allowed(requested, session.captcha_type, settings.as_ref()) {
                self.logger.warn(|| {
                    LogRecord::msg("Session captcha type does not match requested type").with_data(json!({
                        "account": client.account,
                        "sessionId": resolved_id,
                        "sessionCaptchaType": session.captcha_type.as_str(),
                        "requestedCaptchaType": requested.as_str(),
                    }))
                });
                return Ok(Validation::Invalid(ResultReason::IncorrectCaptchaType));
            }

            return Ok(Validation::Valid {
                session_id: Some(session.session_id.clone()),
                pow_difficulty: truthy(session.pow_difficulty),
                image_rounds: truthy(session.solved_images_count),
                ip_info: session.ip_info.clone(),
            });
        }

        if requested == CaptchaType::Audio {
            self.logger.warn(|| LogRecord::msg("Sessionless audio captcha request rejected").with_data(json!({ "account": client.account })));
            return Ok(Validation::Invalid(ResultReason::IncorrectCaptchaType));
        }

        if let Some(policy_type) = user_access_policy.and_then(|rule| rule.policy.captcha_type) {
            if policy_type != requested {
                self.logger.warn(|| {
                    LogRecord::msg("Invalid captcha type for user access policy (sessionless)").with_data(json!({
                        "account": client.account,
                        "captchaType": policy_type.as_str(),
                        "requestedCaptchaType": requested.as_str(),
                    }))
                });
                return Ok(Validation::Invalid(ResultReason::IncorrectCaptchaType));
            }
        }

        let configured: Option<&str> = settings.as_ref().and_then(|settings| settings.get("captchaType")).and_then(Value::as_str);
        if configured != Some(requested.as_str()) {
            self.logger.warn(|| {
                LogRecord::msg(format!("Invalid {} request", requested.as_str())).with_data(json!({
                    "account": client.account,
                    "requestedCaptchaType": requested.as_str(),
                    "settingsCaptchaType": configured,
                }))
            });
            return Ok(Validation::Invalid(ResultReason::IncorrectCaptchaType));
        }

        Ok(Validation::sessionless())
    }
}

#[cfg(test)]
mod tests {
    //! tests/unit/tasks/captchaManager.unit.test.ts, its `isValidRequest` cases. The TS mocks
    //! the database and the write queue; here they are an in-memory session store and the
    //! database crate's in-memory Redis behind a real `RedisWriteQueue`, so what the TS asserts
    //! about calls is asserted about the commands each one received.
    use super::*;
    use bson::{doc, DateTime, Document};
    use prosopo_database::operation::{Executor, Operation, Reply, ReplyFuture};
    use prosopo_database::source::SystemSource;
    use prosopo_database::testing::FakeRedis;
    use prosopo_logger::{get_logger, LogLevel};
    use prosopo_redis_client::RedisConnection;
    use prosopo_types::client::Tier;
    use prosopo_user_access_policy::{AccessPolicy, AccessPolicyType};
    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};

    /// The session collection: what is stored, what has been consumed, and which session each
    /// consume and peek asked for.
    #[derive(Default)]
    struct Sessions {
        stored: Mutex<HashMap<String, Document>>,
        consumed: Mutex<Vec<String>>,
        consume_calls: Mutex<Vec<String>>,
        peek_calls: Mutex<Vec<String>>,
    }

    impl Executor for Sessions {
        fn run(&self, operation: Operation) -> ReplyFuture<'_> {
            let reply: Reply = match operation {
                Operation::FindAndModify { query, .. } => {
                    let id: String = query.get_str("sessionId").unwrap_or_default().to_string();
                    self.consume_calls.lock().expect("unpoisoned").push(id.clone());
                    let mut consumed = self.consumed.lock().expect("unpoisoned");
                    let found: Option<Document> = self.stored.lock().expect("unpoisoned").get(&id).cloned().filter(|_| !consumed.contains(&id));
                    if found.is_some() {
                        consumed.push(id);
                    }
                    Reply::Value(found)
                }
                Operation::Find { filter, .. } => {
                    let id: String = filter.get_str("sessionId").unwrap_or_default().to_string();
                    self.peek_calls.lock().expect("unpoisoned").push(id.clone());
                    Reply::Documents(self.stored.lock().expect("unpoisoned").get(&id).cloned().into_iter().collect())
                }
                _ => Reply::Documents(Vec::new()),
            };
            Box::pin(async move { Ok(reply) })
        }
    }

    /// A stored session of `captcha_type` with every required field, plus `extra`.
    fn session(id: &str, captcha_type: CaptchaType, extra: Document) -> Document {
        let mut stored: Document = doc! {
            "sessionId": id,
            "createdAt": DateTime::from_millis(1_700_000_000_000),
            "token": "token",
            "score": 0.5,
            "threshold": 0.5,
            "scoreComponents": { "baseScore": 0.5 },
            "ipAddress": { "lower": 2_130_706_433_i64, "type": "v4" },
            "captchaType": captcha_type.as_str(),
            "webView": false,
            "iFrame": false,
            "decryptedHeadHash": "",
        };
        stored.extend(extra);
        stored
    }

    struct Fixture {
        sessions: Arc<Sessions>,
        db: ProviderDatabase,
        redis: FakeRedis,
        queue: RedisWriteQueue<FakeRedis>,
        logger: Logger,
    }

    impl Fixture {
        fn new() -> Fixture {
            let sessions: Arc<Sessions> = Arc::new(Sessions::default());
            let logger: Logger = get_logger(LogLevel::Error, "test");
            let redis: FakeRedis = FakeRedis::default();
            let queue: RedisWriteQueue<FakeRedis> = RedisWriteQueue::new(RedisConnection::ready(redis.clone()), logger.clone(), Arc::new(SystemSource));
            Fixture { db: ProviderDatabase::new(sessions.clone(), Arc::new(SystemSource), logger.clone()), sessions, redis, queue, logger }
        }

        fn store(&self, stored: Document) {
            let id: String = stored.get_str("sessionId").expect("an id").to_string();
            self.sessions.stored.lock().expect("unpoisoned").insert(id, stored);
        }

        fn cache(&self, key: &str, value: &str) {
            self.redis.store.lock().expect("lock").insert(key.to_string(), (value.to_string(), None));
        }

        async fn validate(&self, client: &ClientRecord, requested: CaptchaType, session_id: Option<&str>, policy: Option<&AccessRule>) -> Validation {
            let stores = RequestStores { db: &self.db, write_queue: Some(&self.queue), logger: &self.logger };
            stores.is_valid_request(client, requested, session_id, policy).await.expect("validates")
        }

        fn consume_calls(&self) -> Vec<String> {
            self.sessions.consume_calls.lock().expect("unpoisoned").clone()
        }

        fn deleted(&self) -> Vec<String> {
            self.redis.sent().into_iter().filter(|command| command[0] == "DEL").map(|command| command[1].clone()).collect()
        }

        fn escalation_reads(&self) -> usize {
            self.redis.sent().iter().filter(|command| command[0] == "GET" && command[1].starts_with("cache:session:escalation:")).count()
        }
    }

    fn client(account: &str, settings: Document) -> ClientRecord {
        ClientRecord { account: Some(account.to_string()), settings: Some(settings), tier: Tier::Free }
    }

    fn site(captcha_type: CaptchaType) -> ClientRecord {
        client("account", doc! { "captchaType": captcha_type.as_str() })
    }

    fn valid_with(session_id: &str) -> Validation {
        Validation::Valid { session_id: Some(session_id.to_string()), pow_difficulty: None, image_rounds: None, ip_info: None }
    }

    fn incorrect_type() -> Validation {
        Validation::Invalid(ResultReason::IncorrectCaptchaType)
    }

    fn no_session() -> Validation {
        Validation::Invalid(ResultReason::CaptchaNoSessionFound)
    }

    fn rule(kind: AccessPolicyType, captcha_type: Option<CaptchaType>, defer_to_verify: Option<bool>) -> AccessRule {
        let mut policy: AccessPolicy = AccessPolicy::new(kind);
        policy.captcha_type = captcha_type;
        policy.defer_to_verify = defer_to_verify;
        AccessRule::new(policy)
    }

    mod captcha_type_feature_flags {
        use super::*;

        fn puzzle_switched_off(captcha_type: CaptchaType) -> ClientRecord {
            client("account", doc! { "captchaType": captcha_type.as_str(), "captchaTypeFeatureFlags": { "puzzle": false } })
        }

        #[tokio::test]
        async fn refuses_a_sessionless_puzzle_on_a_puzzle_site_with_puzzle_switched_off() {
            let fixture: Fixture = Fixture::new();
            assert_eq!(fixture.validate(&puzzle_switched_off(CaptchaType::Puzzle), CaptchaType::Puzzle, None, None).await, incorrect_type());
        }

        #[tokio::test]
        async fn refuses_a_puzzle_session_minted_before_puzzle_was_switched_off_without_consuming_it() {
            let fixture: Fixture = Fixture::new();
            fixture.store(session("sessionId", CaptchaType::Puzzle, doc! {}));
            assert_eq!(fixture.validate(&puzzle_switched_off(CaptchaType::Frictionless), CaptchaType::Puzzle, Some("sessionId"), None).await, incorrect_type());
            assert!(fixture.consume_calls().is_empty());
        }

        #[tokio::test]
        async fn still_serves_the_other_types() {
            let fixture: Fixture = Fixture::new();
            fixture.store(session("sessionId", CaptchaType::Image, doc! {}));
            let result: Validation = fixture.validate(&puzzle_switched_off(CaptchaType::Frictionless), CaptchaType::Image, Some("sessionId"), None).await;
            assert!(matches!(result, Validation::Valid { .. }));
        }

        #[tokio::test]
        async fn serves_puzzle_when_the_flag_is_absent() {
            let fixture: Fixture = Fixture::new();
            assert_eq!(fixture.validate(&site(CaptchaType::Puzzle), CaptchaType::Puzzle, None, None).await, Validation::sessionless());
        }

        fn icon_order_site(flags: Option<Document>) -> ClientRecord {
            let mut settings: Document = doc! { "captchaType": "iconOrder" };
            if let Some(flags) = flags {
                settings.insert("captchaTypeFeatureFlags", flags);
            }
            client("account", settings)
        }

        #[tokio::test]
        async fn refuses_a_sessionless_icon_order_request_on_a_site_without_the_flag() {
            let fixture: Fixture = Fixture::new();
            assert_eq!(fixture.validate(&icon_order_site(None), CaptchaType::IconOrder, None, None).await, incorrect_type());
        }

        #[tokio::test]
        async fn refuses_an_icon_order_session_on_a_site_without_the_flag_without_consuming_it() {
            let fixture: Fixture = Fixture::new();
            fixture.store(session("sessionId", CaptchaType::IconOrder, doc! {}));
            assert_eq!(fixture.validate(&icon_order_site(None), CaptchaType::IconOrder, Some("sessionId"), None).await, incorrect_type());
            assert!(fixture.consume_calls().is_empty());
        }

        #[tokio::test]
        async fn serves_icon_order_once_prosopo_turns_the_flag_on() {
            let fixture: Fixture = Fixture::new();
            let result: Validation = fixture.validate(&icon_order_site(Some(doc! { "iconOrder": true })), CaptchaType::IconOrder, None, None).await;
            assert_eq!(result, Validation::sessionless());
        }
    }

    #[tokio::test]
    async fn validates_an_image_request_on_an_image_site_with_no_session() {
        let fixture: Fixture = Fixture::new();
        assert_eq!(fixture.validate(&site(CaptchaType::Image), CaptchaType::Image, None, None).await, Validation::sessionless());
    }

    #[tokio::test]
    async fn validates_a_pow_request_on_a_pow_site_with_no_session() {
        let fixture: Fixture = Fixture::new();
        assert_eq!(fixture.validate(&site(CaptchaType::Pow), CaptchaType::Pow, None, None).await, Validation::sessionless());
    }

    #[tokio::test]
    async fn validates_a_pow_request_on_a_frictionless_site_with_a_pow_session() {
        let fixture: Fixture = Fixture::new();
        fixture.store(session("sessionId", CaptchaType::Pow, doc! {}));
        assert_eq!(fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Pow, Some("sessionId"), None).await, valid_with("sessionId"));
    }

    #[tokio::test]
    async fn rejects_a_session_that_was_issued_for_a_different_site_key() {
        let fixture: Fixture = Fixture::new();
        fixture.store(session("sessionId", CaptchaType::Pow, doc! { "siteKey": "attackerSiteKey" }));
        let victim: ClientRecord = client("victimSiteKey", doc! { "captchaType": "frictionless" });
        assert_eq!(fixture.validate(&victim, CaptchaType::Pow, Some("sessionId"), None).await, no_session());
    }

    #[tokio::test]
    async fn accepts_a_session_that_was_issued_for_the_requesting_site_key() {
        let fixture: Fixture = Fixture::new();
        fixture.store(session("sessionId", CaptchaType::Pow, doc! { "siteKey": "account" }));
        let result: Validation = fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Pow, Some("sessionId"), None).await;
        assert!(matches!(result, Validation::Valid { .. }));
    }

    #[tokio::test]
    async fn returns_the_sessions_stored_ip_info() {
        let fixture: Fixture = Fixture::new();
        let ip_info: Document = doc! { "ip": "1.2.3.4", "isValid": true, "isVPN": true, "countryCode": "DE" };
        fixture.store(session("sessionId", CaptchaType::Pow, doc! { "ipInfo": ip_info.clone() }));
        let Validation::Valid { ip_info: found, .. } = fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Pow, Some("sessionId"), None).await else {
            panic!("valid");
        };
        assert_eq!(found, Some(Bson::Document(ip_info)));
    }

    #[tokio::test]
    async fn invalidates_the_session_cache_after_consuming_a_pow_session() {
        let fixture: Fixture = Fixture::new();
        fixture.store(session("sessionId", CaptchaType::Pow, doc! { "userSitekeyIpHash": "hash-xyz" }));
        fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Pow, Some("sessionId"), None).await;
        let deleted: Vec<String> = fixture.deleted();
        assert!(deleted.contains(&"cache:session:sessionId".to_string()), "{deleted:?}");
        assert!(deleted.contains(&"cache:session:hash:hash-xyz".to_string()), "{deleted:?}");
    }

    #[tokio::test]
    async fn invalidates_the_session_cache_after_consuming_an_image_session() {
        let fixture: Fixture = Fixture::new();
        fixture.store(session("sessionId", CaptchaType::Image, doc! { "userSitekeyIpHash": "hash-xyz" }));
        fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Image, Some("sessionId"), None).await;
        let deleted: Vec<String> = fixture.deleted();
        assert!(deleted.contains(&"cache:session:sessionId".to_string()), "{deleted:?}");
        assert!(deleted.contains(&"cache:session:hash:hash-xyz".to_string()), "{deleted:?}");
    }

    #[tokio::test]
    async fn invalidates_the_cache_when_the_session_is_not_found() {
        let fixture: Fixture = Fixture::new();
        fixture.cache("cache:session:sessionId", r#"{"sessionId":"sessionId","userSitekeyIpHash":"hash-xyz"}"#);
        fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Pow, Some("sessionId"), None).await;
        // Once before the consume and again once it comes back empty, as the TS does: the
        // second pass clears what a concurrent write may have put back in between.
        let deleted: Vec<String> = fixture.deleted();
        assert_eq!(deleted, ["cache:session:sessionId", "cache:session:hash:hash-xyz", "cache:session:sessionId", "cache:session:hash:hash-xyz"]);
    }

    #[tokio::test]
    async fn resolves_to_the_escalation_session_when_the_origin_is_consumed() {
        let fixture: Fixture = Fixture::new();
        fixture.store(session("escalation-id", CaptchaType::Image, doc! { "userSitekeyIpHash": "hash-xyz" }));
        fixture.cache("cache:session:escalation:origin-id", "escalation-id");
        let result: Validation = fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Image, Some("origin-id"), None).await;
        assert_eq!(result, valid_with("escalation-id"));
        let deleted: Vec<String> = fixture.deleted();
        for key in ["cache:session:escalation:origin-id", "cache:session:escalation-id", "cache:session:hash:hash-xyz"] {
            assert!(deleted.contains(&key.to_string()), "{key} not in {deleted:?}");
        }
    }

    #[tokio::test]
    async fn returns_no_session_found_when_the_escalation_session_is_also_gone() {
        let fixture: Fixture = Fixture::new();
        fixture.cache("cache:session:escalation:origin-id", "escalation-id");
        assert_eq!(fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Image, Some("origin-id"), None).await, no_session());
        assert!(fixture.deleted().contains(&"cache:session:escalation:origin-id".to_string()));
    }

    #[tokio::test]
    async fn refuses_without_consuming_the_escalation_session_when_its_type_does_not_match() {
        let fixture: Fixture = Fixture::new();
        fixture.store(session("escalation-id", CaptchaType::Image, doc! { "userSitekeyIpHash": "hash-xyz" }));
        fixture.cache("cache:session:escalation:origin-id", "escalation-id");
        assert_eq!(fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Pow, Some("origin-id"), None).await, incorrect_type());
        assert_eq!(fixture.consume_calls(), ["origin-id"]);
        assert!(fixture.deleted().contains(&"cache:session:escalation:origin-id".to_string()));
    }

    #[tokio::test]
    async fn falls_through_to_no_session_found_when_no_escalation_was_recorded() {
        let fixture: Fixture = Fixture::new();
        assert_eq!(fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Pow, Some("origin-id"), None).await, no_session());
        assert!(!fixture.deleted().iter().any(|key| key.starts_with("cache:session:escalation:")));
    }

    #[tokio::test]
    async fn does_not_consult_the_escalation_mapping_when_the_origin_is_live() {
        let fixture: Fixture = Fixture::new();
        fixture.store(session("origin-id", CaptchaType::Pow, doc! {}));
        fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Pow, Some("origin-id"), None).await;
        assert_eq!(fixture.escalation_reads(), 0);
    }

    #[tokio::test]
    async fn does_not_fail_without_a_write_queue() {
        let fixture: Fixture = Fixture::new();
        fixture.store(session("sessionId", CaptchaType::Pow, doc! {}));
        let stores: RequestStores<'_, FakeRedis> = RequestStores { db: &fixture.db, write_queue: None, logger: &fixture.logger };
        let result: Validation = stores.is_valid_request(&site(CaptchaType::Frictionless), CaptchaType::Pow, Some("sessionId"), None).await.expect("validates");
        assert_eq!(result, valid_with("sessionId"));
    }

    #[tokio::test]
    async fn validates_an_image_request_on_a_frictionless_site_with_an_image_session() {
        let fixture: Fixture = Fixture::new();
        fixture.store(session("sessionId", CaptchaType::Image, doc! {}));
        assert_eq!(fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Image, Some("sessionId"), None).await, valid_with("sessionId"));
    }

    #[tokio::test]
    async fn refuses_an_image_request_with_a_pow_session() {
        let fixture: Fixture = Fixture::new();
        fixture.store(session("sessionId", CaptchaType::Pow, doc! {}));
        assert_eq!(fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Image, Some("sessionId"), None).await, incorrect_type());
    }

    #[tokio::test]
    async fn refuses_a_pow_request_with_an_image_session() {
        let fixture: Fixture = Fixture::new();
        fixture.store(session("sessionId", CaptchaType::Image, doc! {}));
        assert_eq!(fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Pow, Some("sessionId"), None).await, incorrect_type());
    }

    #[tokio::test]
    async fn refuses_an_image_request_whose_session_is_not_found() {
        let fixture: Fixture = Fixture::new();
        assert_eq!(fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Image, Some("sessionId"), None).await, no_session());
    }

    #[tokio::test]
    async fn refuses_a_pow_request_whose_session_is_not_found() {
        let fixture: Fixture = Fixture::new();
        assert_eq!(fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Pow, Some("sessionId"), None).await, no_session());
    }

    #[tokio::test]
    async fn refuses_a_sessionless_pow_request_on_a_frictionless_site() {
        let fixture: Fixture = Fixture::new();
        assert_eq!(fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Pow, None, None).await, incorrect_type());
    }

    #[tokio::test]
    async fn refuses_a_sessionless_image_request_on_a_frictionless_site() {
        let fixture: Fixture = Fixture::new();
        assert_eq!(fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Image, None, None).await, incorrect_type());
    }

    #[tokio::test]
    async fn refuses_a_pow_request_on_an_image_site() {
        let fixture: Fixture = Fixture::new();
        assert_eq!(fixture.validate(&site(CaptchaType::Image), CaptchaType::Pow, None, None).await, incorrect_type());
    }

    #[tokio::test]
    async fn refuses_an_image_request_on_a_pow_site() {
        let fixture: Fixture = Fixture::new();
        assert_eq!(fixture.validate(&site(CaptchaType::Pow), CaptchaType::Image, None, None).await, incorrect_type());
    }

    #[tokio::test]
    async fn validates_when_the_matched_block_policy_has_no_captcha_type() {
        let fixture: Fixture = Fixture::new();
        let block: AccessRule = rule(AccessPolicyType::Block, None, None);
        assert_eq!(fixture.validate(&site(CaptchaType::Image), CaptchaType::Image, None, Some(&block)).await, Validation::sessionless());
    }

    #[tokio::test]
    async fn validates_when_the_matched_block_policy_is_deferred_to_verify() {
        let fixture: Fixture = Fixture::new();
        let block: AccessRule = rule(AccessPolicyType::Block, None, Some(true));
        assert_eq!(fixture.validate(&site(CaptchaType::Image), CaptchaType::Image, None, Some(&block)).await, Validation::sessionless());
    }

    #[tokio::test]
    async fn refuses_a_restrict_policy_pinning_a_different_captcha_type() {
        let fixture: Fixture = Fixture::new();
        let restrict: AccessRule = rule(AccessPolicyType::Restrict, Some(CaptchaType::Pow), None);
        assert_eq!(fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Image, None, Some(&restrict)).await, incorrect_type());
    }

    #[tokio::test]
    async fn validates_a_session_with_no_stored_ip() {
        let fixture: Fixture = Fixture::new();
        fixture.store(session("sessionId", CaptchaType::Image, doc! {}));
        assert_eq!(fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Image, Some("sessionId"), None).await, valid_with("sessionId"));
    }

    #[tokio::test]
    async fn validates_a_session_whatever_the_requests_ip() {
        let fixture: Fixture = Fixture::new();
        fixture.store(session("sessionId", CaptchaType::Image, doc! { "ipAddress": { "lower": 16_843_009_i64, "type": "v4" } }));
        assert_eq!(fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Image, Some("sessionId"), None).await, valid_with("sessionId"));
    }

    #[tokio::test]
    async fn carries_the_sessions_pow_difficulty_and_image_rounds_when_set() {
        let fixture: Fixture = Fixture::new();
        fixture.store(session("sessionId", CaptchaType::Image, doc! { "powDifficulty": 5, "solvedImagesCount": 3 }));
        let result: Validation = fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Image, Some("sessionId"), None).await;
        assert_eq!(result, Validation::Valid { session_id: Some("sessionId".into()), pow_difficulty: Some(5.0), image_rounds: Some(3.0), ip_info: None });
    }

    mod user_access_policy_precedence_over_session {
        use super::*;

        #[tokio::test]
        async fn honours_the_sessions_captcha_type_when_a_restrict_policy_materialises_after_it() {
            let fixture: Fixture = Fixture::new();
            fixture.store(session("sessionId", CaptchaType::Pow, doc! {}));
            let restrict: AccessRule = rule(AccessPolicyType::Restrict, Some(CaptchaType::Image), None);
            assert_eq!(fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Pow, Some("sessionId"), Some(&restrict)).await, valid_with("sessionId"));
        }

        #[tokio::test]
        async fn still_rejects_a_session_whose_own_captcha_type_does_not_match() {
            let fixture: Fixture = Fixture::new();
            fixture.store(session("sessionId", CaptchaType::Image, doc! {}));
            assert_eq!(fixture.validate(&site(CaptchaType::Frictionless), CaptchaType::Pow, Some("sessionId"), None).await, incorrect_type());
        }

        #[tokio::test]
        async fn enforces_the_policy_captcha_type_on_sessionless_requests() {
            let fixture: Fixture = Fixture::new();
            let restrict: AccessRule = rule(AccessPolicyType::Restrict, Some(CaptchaType::Image), None);
            assert_eq!(fixture.validate(&site(CaptchaType::Pow), CaptchaType::Pow, None, Some(&restrict)).await, incorrect_type());
        }

        #[tokio::test]
        async fn allows_sessionless_requests_when_the_policy_captcha_type_matches() {
            let fixture: Fixture = Fixture::new();
            let restrict: AccessRule = rule(AccessPolicyType::Restrict, Some(CaptchaType::Image), None);
            assert_eq!(fixture.validate(&site(CaptchaType::Image), CaptchaType::Image, None, Some(&restrict)).await, Validation::sessionless());
        }
    }

    mod audio_accessibility_alternative {
        use super::*;

        fn settings_with(enabled: bool, flag: bool) -> ClientRecord {
            client("account", doc! { "captchaType": "frictionless", "audioAccessibilityEnabled": enabled, "captchaTypeFeatureFlags": { "audio": flag } })
        }

        #[tokio::test]
        async fn serves_audio_against_a_visual_session_when_the_site_has_the_alternative_on() {
            let fixture: Fixture = Fixture::new();
            fixture.store(session("sessionId", CaptchaType::Image, doc! {}));
            assert_eq!(fixture.validate(&settings_with(true, true), CaptchaType::Audio, Some("sessionId"), None).await, valid_with("sessionId"));
        }

        #[tokio::test]
        async fn serves_audio_against_an_icon_order_session_too() {
            let fixture: Fixture = Fixture::new();
            fixture.store(session("sessionId", CaptchaType::IconOrder, doc! {}));
            assert!(matches!(fixture.validate(&settings_with(true, true), CaptchaType::Audio, Some("sessionId"), None).await, Validation::Valid { .. }));
        }

        #[tokio::test]
        async fn refuses_audio_without_spending_the_session_when_the_alternative_is_off() {
            let fixture: Fixture = Fixture::new();
            fixture.store(session("sessionId", CaptchaType::Image, doc! {}));
            assert_eq!(fixture.validate(&settings_with(false, true), CaptchaType::Audio, Some("sessionId"), None).await, incorrect_type());
            assert!(fixture.consume_calls().is_empty());
        }

        #[tokio::test]
        async fn refuses_audio_without_spending_the_session_on_a_site_without_the_audio_flag() {
            let fixture: Fixture = Fixture::new();
            fixture.store(session("sessionId", CaptchaType::Image, doc! {}));
            assert_eq!(fixture.validate(&settings_with(true, false), CaptchaType::Audio, Some("sessionId"), None).await, incorrect_type());
            assert!(fixture.consume_calls().is_empty());
        }

        #[tokio::test]
        async fn keeps_serving_the_visual_types_on_a_site_without_the_audio_flag() {
            let fixture: Fixture = Fixture::new();
            fixture.store(session("sessionId", CaptchaType::Image, doc! {}));
            assert!(matches!(fixture.validate(&settings_with(true, false), CaptchaType::Image, Some("sessionId"), None).await, Validation::Valid { .. }));
        }

        #[tokio::test]
        async fn refuses_audio_against_a_pow_session() {
            let fixture: Fixture = Fixture::new();
            fixture.store(session("sessionId", CaptchaType::Pow, doc! {}));
            assert_eq!(fixture.validate(&settings_with(true, true), CaptchaType::Audio, Some("sessionId"), None).await, incorrect_type());
        }

        #[tokio::test]
        async fn does_not_let_the_alternative_widen_any_other_type_mismatch() {
            let fixture: Fixture = Fixture::new();
            fixture.store(session("sessionId", CaptchaType::Image, doc! {}));
            assert_eq!(fixture.validate(&settings_with(true, true), CaptchaType::Puzzle, Some("sessionId"), None).await, incorrect_type());
        }

        #[tokio::test]
        async fn refuses_a_sessionless_audio_request_even_with_the_alternative_on() {
            let fixture: Fixture = Fixture::new();
            assert_eq!(fixture.validate(&settings_with(true, true), CaptchaType::Audio, None, None).await, incorrect_type());
            assert!(fixture.consume_calls().is_empty());
        }
    }
}
