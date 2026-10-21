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

//! The TS integration tests (src/tests/integration), one for one, against a real mongod at
//! `PROSOPO_TEST_MONGO_URL`. Each test has a database of its own.

use crate::challenges::Interactive;
use crate::mongo::{MongoConnectionTimeouts, MongoDatabase};
use crate::operation::Operation;
use crate::provider::{collections, ProviderDatabase};
use crate::source::{SourceIds, SystemSource};
use bson::{doc, DateTime, Document};
use prosopo_logger::{get_logger, LogLevel};
use prosopo_types_database::document::create;
use prosopo_types_database::provider::{
    AUDIO_CAPTCHA_RECORD, ICON_ORDER_CAPTCHA_RECORD, POW_CAPTCHA_RECORD, PUZZLE_CAPTCHA_RECORD,
    USER_COMMITMENT_RECORD,
};
use prosopo_types_database::schema::Schema;
use std::sync::Arc;

const CONCURRENCY: usize = 8;

struct Live {
    mongo: Arc<MongoDatabase>,
    db: Arc<ProviderDatabase>,
}

impl Live {
    async fn new(name: &str) -> Live {
        let url: String = std::env::var("PROSOPO_TEST_MONGO_URL").expect("PROSOPO_TEST_MONGO_URL");
        let mongo: Arc<MongoDatabase> = Arc::new(
            MongoDatabase::new(&url, Some(&format!("prosopo-test-{name}")), None, None, MongoConnectionTimeouts::default())
                .expect("a valid URL"),
        );
        mongo.connect().await.expect("connects");
        mongo.database().await.expect("open").drop().await.expect("drops");
        let db: ProviderDatabase = ProviderDatabase::with_mongo(mongo.clone(), None, Arc::new(SystemSource), get_logger(LogLevel::Error, "test"));
        db.connect().await.expect("connects");
        Live { mongo, db: Arc::new(db) }
    }

    /// A record created as `Model.create` creates it.
    async fn create(&self, schema: &Schema, collection: &str, input: Document) {
        let document: Document = create(schema, &input, &mut SourceIds(&SystemSource)).expect("a valid record");
        self.db
            .run(Operation::Insert {
                collection: collection.to_string(),
                documents: vec![document],
            })
            .await
            .expect("inserts");
    }

    async fn finish(self) {
        self.mongo.database().await.expect("open").drop().await.expect("drops");
        self.mongo.close().await;
    }
}

fn ip(lower: i64) -> Document {
    doc! { "lower": bson::Bson::Int64(lower), "type": "v4" }
}

/// `baseChallenge` of serverCheckClaim.integration.test.ts.
fn base_challenge(challenge: &str) -> Document {
    let now: DateTime = DateTime::now();
    doc! {
        "userAccount": "user",
        "dappAccount": "dapp",
        "requestedAtTimestamp": now,
        "submittedAtTimestamp": now,
        "ipAddress": ip(1),
        "headers": { "host": "example.com" },
        "ja4": "ja4",
        "result": { "status": "Approved" },
        "providerSignature": "sig",
        "serverChecked": false,
        "userSubmitted": true,
        "challenge": challenge,
    }
}

fn with(mut base: Document, extra: Document) -> Document {
    base.extend(extra);
    base
}

/// N concurrent calls, and how many of them won.
async fn concurrent_wins<F, Fut>(db: &Arc<ProviderDatabase>, call: F) -> usize
where
    F: Fn(Arc<ProviderDatabase>) -> Fut,
    Fut: std::future::Future<Output = bool> + Send + 'static,
{
    let handles: Vec<tokio::task::JoinHandle<bool>> = (0..CONCURRENCY).map(|_| tokio::spawn(call(db.clone()))).collect();
    let mut wins: usize = 0;
    for handle in handles {
        if handle.await.expect("joins") {
            wins += 1;
        }
    }
    wins
}

mod server_check_claims_are_single_use_under_concurrency {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn claims_a_pow_challenge_for_exactly_one_of_n_concurrent_verifies() {
        let live: Live = Live::new("claim-pow").await;
        let challenge: &str = "1___user___dapp___pow-claim";
        live.create(&POW_CAPTCHA_RECORD, collections::POW_CAPTCHA, with(base_challenge(challenge), doc! { "difficulty": 4 }))
            .await;
        let wins: usize = concurrent_wins(&live.db, move |db| async move {
            db.mark_dapp_user_pow_commitments_checked(&[challenge.to_string()]).await.expect("marks") == 1
        })
        .await;
        assert_eq!(wins, 1);
        let record = live.db.get_pow_captcha_record_by_challenge(challenge).await.expect("reads").expect("exists");
        assert_eq!(record.server_checked, Some(true));
        live.finish().await;
    }

    async fn interactive_verify(name: &str, kind: Interactive, schema: &Schema, collection: &str, extra: Document) {
        let live: Live = Live::new(name).await;
        let challenge: String = format!("1___user___dapp___{name}");
        live.create(schema, collection, with(base_challenge(&challenge), extra)).await;
        let shared: String = challenge.clone();
        let wins: usize = concurrent_wins(&live.db, move |db| {
            let challenge: String = shared.clone();
            async move { db.mark_interactive_captcha_record_checked(kind, &challenge).await.expect("marks") }
        })
        .await;
        assert_eq!(wins, 1);
        let record = live.db.get_interactive_captcha_record_by_challenge(kind, &challenge).await.expect("reads").expect("exists");
        assert_eq!(record.server_checked, Some(true));
        live.finish().await;
    }

    async fn interactive_submit(name: &str, kind: Interactive, schema: &Schema, collection: &str, extra: Document) {
        let live: Live = Live::new(name).await;
        let challenge: String = format!("1___user___dapp___{name}");
        live.create(schema, collection, with(with(base_challenge(&challenge), doc! { "userSubmitted": false }), extra)).await;
        let shared: String = challenge.clone();
        let wins: usize = concurrent_wins(&live.db, move |db| {
            let challenge: String = shared.clone();
            async move { db.claim_interactive_captcha_submission(kind, &challenge).await.expect("claims") }
        })
        .await;
        assert_eq!(wins, 1);
        let record = live.db.get_interactive_captcha_record_by_challenge(kind, &challenge).await.expect("reads").expect("exists");
        assert_eq!(record.user_submitted, Some(true));
        live.finish().await;
    }

    fn icon_target() -> Document {
        doc! { "targets": [{ "x": 10, "y": 10, "size": 24, "kind": "star" }], "tolerance": 1 }
    }

    #[tokio::test(flavor = "multi_thread")]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn claims_a_puzzle_challenge_for_exactly_one_of_n_concurrent_verifies() {
        let extra: Document = doc! { "targetX": 1, "targetY": 1, "originX": 0, "originY": 0, "tolerance": 10 };
        interactive_verify("puzzle-claim", Interactive::Puzzle, &PUZZLE_CAPTCHA_RECORD, collections::PUZZLE_CAPTCHA, extra).await;
    }

    #[tokio::test(flavor = "multi_thread")]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn claims_an_icon_order_challenge_for_exactly_one_of_n_concurrent_verifies() {
        interactive_verify("icon-order-claim", Interactive::IconOrder, &ICON_ORDER_CAPTCHA_RECORD, collections::ICON_ORDER_CAPTCHA, icon_target())
            .await;
    }

    #[tokio::test(flavor = "multi_thread")]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn claims_an_icon_order_submission_for_exactly_one_of_n_concurrent_submits() {
        interactive_submit("icon-order-submit", Interactive::IconOrder, &ICON_ORDER_CAPTCHA_RECORD, collections::ICON_ORDER_CAPTCHA, icon_target())
            .await;
    }

    #[tokio::test(flavor = "multi_thread")]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn claims_an_audio_challenge_for_exactly_one_of_n_concurrent_verifies() {
        interactive_verify("audio-claim", Interactive::Audio, &AUDIO_CAPTCHA_RECORD, collections::AUDIO_CAPTCHA, doc! { "answer": "123456" })
            .await;
    }

    #[tokio::test(flavor = "multi_thread")]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn claims_an_audio_submission_for_exactly_one_of_n_concurrent_submits() {
        interactive_submit("audio-submit", Interactive::Audio, &AUDIO_CAPTCHA_RECORD, collections::AUDIO_CAPTCHA, doc! { "answer": "123456" })
            .await;
    }
    fn commitment(id: &str, request_hash: &str, pending: bool, deadline: DateTime, status: &str, submitted: bool) -> Document {
        doc! {
            "id": id,
            "userAccount": "user",
            "dappAccount": "dapp",
            "datasetId": "dataset",
            "providerAccount": "provider",
            "pending": pending,
            "userSignature": "0xsig",
            "salt": "0xsalt",
            "requestHash": request_hash,
            "threshold": 1,
            "deadlineTimestamp": deadline,
            "requestedAtTimestamp": DateTime::now(),
            "ipAddress": ip(1),
            "headers": { "host": "example.com" },
            "ja4": "ja4",
            "result": { "status": status },
            "userSubmitted": submitted,
            "serverChecked": false,
        }
    }

    #[tokio::test(flavor = "multi_thread")]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn claims_an_image_commitment_for_exactly_one_of_n_concurrent_verifies() {
        let live: Live = Live::new("claim-image").await;
        let id: &str = "0xcommitmentclaim";
        live.create(
            &USER_COMMITMENT_RECORD,
            collections::COMMITMENT,
            commitment(id, "0xrequesthashclaim", false, DateTime::now(), "Approved", true),
        )
        .await;
        let wins: usize = concurrent_wins(&live.db, move |db| async move {
            db.mark_dapp_user_commitments_checked(&[id.to_string()]).await.expect("marks") == 1
        })
        .await;
        assert_eq!(wins, 1);
        let record = live.db.get_dapp_user_commitment_by_id(id).await.expect("reads").expect("exists");
        assert_eq!(record.server_checked, Some(true));
        live.finish().await;
    }

    #[tokio::test(flavor = "multi_thread")]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn consumes_a_pending_image_request_for_exactly_one_of_n_concurrent_submissions() {
        let live: Live = Live::new("claim-pending").await;
        let request_hash: &str = "0xabcdef0123";
        let deadline: DateTime = DateTime::from_millis(DateTime::now().timestamp_millis() + 60_000);
        live.create(
            &USER_COMMITMENT_RECORD,
            collections::COMMITMENT,
            commitment("0xpendingclaim", request_hash, true, deadline, "Pending", false),
        )
        .await;
        let wins: usize = concurrent_wins(&live.db, move |db| async move {
            db.update_pending_image_commitment_status(request_hash).await.expect("updates")
        })
        .await;
        assert_eq!(wins, 1);
        live.finish().await;
    }
}

/// The seeds of countCommitmentsByNormalisedEmail.integration.test.ts, written to the provider's
/// own collections (the TS seeds a `commitments` collection the provider does not use and
/// counts it with a copy of the query; these call the method itself).
mod count_commitments_by_normalised_email {
    use super::*;

    fn commitment(id: &str, user: &str, dapp: &str, lower: i64, email: &str, normalised: &str) -> Document {
        doc! {
            "id": id,
            "userAccount": user,
            "dappAccount": dapp,
            "providerAccount": "prov1",
            "datasetId": "ds1",
            "result": { "status": "Approved" },
            "userSignature": "s",
            "ipAddress": ip(lower),
            "headers": { "host": "example.com" },
            "ja4": "j",
            "userSubmitted": true,
            "serverChecked": true,
            "requestedAtTimestamp": DateTime::now(),
            "pending": false,
            "salt": "s",
            "requestHash": "h",
            "deadlineTimestamp": DateTime::from_millis(DateTime::now().timestamp_millis() + 60_000),
            "threshold": 0.5,
            "metadata": { "email": email, "emailNormalised": normalised },
        }
    }

    fn challenge_record(challenge: &str, user: &str, dapp: &str, lower: i64, checked: bool, email: &str) -> Document {
        doc! {
            "challenge": challenge,
            "userAccount": user,
            "dappAccount": dapp,
            "requestedAtTimestamp": DateTime::now(),
            "ipAddress": ip(lower),
            "headers": { "host": "example.com" },
            "ja4": "j",
            "result": { "status": if checked { "Approved" } else { "Pending" } },
            "userSubmitted": checked,
            "serverChecked": checked,
            "providerSignature": "sig",
            "metadata": { "email": email, "emailNormalised": "alice@gmail.com" },
        }
    }

    async fn seed_across_collections(live: &Live) {
        live.create(&USER_COMMITMENT_RECORD, collections::COMMITMENT, commitment("cmt-a", "u1", "dapp-A", 1, "Alice+a@Gmail.com", "alice@gmail.com"))
            .await;
        live.create(
            &POW_CAPTCHA_RECORD,
            collections::POW_CAPTCHA,
            with(challenge_record("1___2___pow-a", "u2", "dapp-A", 2, true, "a.l.i.c.e+b@googlemail.com"), doc! { "difficulty": 4 }),
        )
        .await;
        live.create(
            &PUZZLE_CAPTCHA_RECORD,
            collections::PUZZLE_CAPTCHA,
            with(
                challenge_record("1___2___puzzle-a", "u3", "dapp-A", 3, true, "alice+c@gmail.com"),
                doc! { "targetX": 1, "targetY": 1, "originX": 0, "originY": 0, "tolerance": 10 },
            ),
        )
        .await;
        live.create(&USER_COMMITMENT_RECORD, collections::COMMITMENT, commitment("cmt-other", "u4", "dapp-A", 4, "bob@example.com", "bob@example.com"))
            .await;
        live.create(
            &POW_CAPTCHA_RECORD,
            collections::POW_CAPTCHA,
            with(challenge_record("1___2___pow-unchecked", "u5", "dapp-A", 5, false, "alice@gmail.com"), doc! { "difficulty": 4 }),
        )
        .await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn sums_matching_server_checked_records_across_all_three_captcha_collections() {
        let live: Live = Live::new("count-sum").await;
        seed_across_collections(&live).await;
        assert_eq!(live.db.count_commitments_by_normalised_email("dapp-A", "alice@gmail.com").await.expect("counts"), 3);
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn returns_0_for_an_unrelated_normalised_email() {
        let live: Live = Live::new("count-unrelated").await;
        seed_across_collections(&live).await;
        assert_eq!(live.db.count_commitments_by_normalised_email("dapp-A", "zephyr@gmail.com").await.expect("counts"), 0);
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn does_not_count_records_from_a_different_dapp_account() {
        let live: Live = Live::new("count-dapp").await;
        seed_across_collections(&live).await;
        live.create(
            &USER_COMMITMENT_RECORD,
            collections::COMMITMENT,
            commitment("cmt-other-dapp", "u6", "dapp-B", 6, "alice@gmail.com", "alice@gmail.com"),
        )
        .await;
        assert_eq!(live.db.count_commitments_by_normalised_email("dapp-A", "alice@gmail.com").await.expect("counts"), 3);
        assert_eq!(live.db.count_commitments_by_normalised_email("dapp-B", "alice@gmail.com").await.expect("counts"), 1);
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn returns_0_for_an_empty_normalised_email_without_hitting_the_db() {
        let live: Live = Live::new("count-empty").await;
        live.create(&USER_COMMITMENT_RECORD, collections::COMMITMENT, commitment("cmt-empty", "u7", "dapp-A", 7, "", "")).await;
        assert_eq!(live.db.count_commitments_by_normalised_email("dapp-A", "").await.expect("counts"), 0);
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn counts_verified_icon_order_records_towards_the_per_email_limit() {
        let live: Live = Live::new("count-icon-order").await;
        live.create(
            &ICON_ORDER_CAPTCHA_RECORD,
            collections::ICON_ORDER_CAPTCHA,
            with(
                challenge_record("1___u1___dapp-A___icon-order", "u1", "dapp-A", 1, true, "alice@gmail.com"),
                doc! { "targets": [{ "x": 10, "y": 10, "size": 24, "kind": "star" }], "tolerance": 1 },
            ),
        )
        .await;
        assert_eq!(live.db.count_commitments_by_normalised_email("dapp-A", "alice@gmail.com").await.expect("counts"), 1);
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn counts_verified_audio_records_towards_the_per_email_limit() {
        let live: Live = Live::new("count-audio").await;
        live.create(
            &AUDIO_CAPTCHA_RECORD,
            collections::AUDIO_CAPTCHA,
            with(challenge_record("1___u1___dapp-B___audio", "u1", "dapp-B", 1, true, "alice@gmail.com"), doc! { "answer": "12345" }),
        )
        .await;
        assert_eq!(live.db.count_commitments_by_normalised_email("dapp-B", "alice@gmail.com").await.expect("counts"), 1);
        live.finish().await;
    }
}

mod update_dapp_user_commitment {
    use super::*;

    const OLD: i64 = 1_767_225_600_000;

    async fn seed(live: &Live, id: &str) {
        live.create(
            &USER_COMMITMENT_RECORD,
            collections::COMMITMENT,
            doc! {
                "id": id,
                "userAccount": "user",
                "dappAccount": "dapp",
                "providerAccount": "provider",
                "datasetId": "dataset",
                "result": { "status": "Pending" },
                "userSignature": "0xsig",
                "ipAddress": ip(16_909_060),
                "headers": {},
                "ja4": "ja4",
                "userSubmitted": false,
                "serverChecked": false,
                "requestedAtTimestamp": DateTime::from_millis(OLD),
                "lastUpdatedTimestamp": DateTime::from_millis(OLD),
                "pending": false,
                "salt": "salt",
                "requestHash": format!("0xreq-{id}"),
                "deadlineTimestamp": DateTime::from_millis(DateTime::now().timestamp_millis() + 60_000),
                "threshold": 0.5,
            },
        )
        .await;
    }

    async fn read(live: &Live, id: &str) -> Document {
        let mut found: Vec<Document> = live.db.find(Operation::find(collections::COMMITMENT, doc! { "id": id })).await.expect("reads");
        found.pop().expect("the commitment exists")
    }

    async fn bumps_last_updated_timestamp(name: &str, updates: Document) {
        let live: Live = Live::new(name).await;
        seed(&live, "bump").await;
        live.db.update_dapp_user_commitment("bump", &updates).await.expect("updates");
        let document: Document = read(&live, "bump").await;
        assert!(document.get_datetime("lastUpdatedTimestamp").expect("a date").timestamp_millis() > OLD);
        assert!(!document.contains_key("lastUpdatedAtTimestamp"));
        assert_eq!(document.get_bool("pendingStage").ok(), Some(true));
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn bumps_last_updated_timestamp_set_form() {
        bumps_last_updated_timestamp("bump-set", doc! { "metadata": { "email": "a@b.c" } }).await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn bumps_last_updated_timestamp_pipeline_form() {
        bumps_last_updated_timestamp("bump-pipeline", doc! { "userSubmitted": true }).await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn keeps_an_update_made_after_the_sweep_read_pending_for_the_next_sweep() {
        let live: Live = Live::new("race").await;
        seed(&live, "race").await;
        let sweep_read_at: DateTime = DateTime::now();
        tokio::time::sleep(std::time::Duration::from_millis(5)).await;
        live.db
            .update_dapp_user_commitment("race", &doc! { "metadata": { "email": "late@example.com" } })
            .await
            .expect("updates");
        live.db.mark_dapp_user_commitments_stored(&["race".to_string()], Some(sweep_read_at)).await.expect("marks");
        let document: Document = read(&live, "race").await;
        assert_eq!(document.get_bool("pendingStage").ok(), Some(true));
        assert!(!document.contains_key("storedAtTimestamp"));
        live.finish().await;
    }
}

/// commitmentUpsertNoMutation.integration.test.ts guards a JS object being changed by the
/// upsert it was handed; `store_user_image_captcha_solution` borrows the record, so what is
/// left to check is that the same record upserts twice.
mod commitment_upsert {
    use super::*;
    use crate::records::{CompositeIpAddress, IpHalf, StoredResult, UserCommitment};
    use prosopo_types::api_types::CaptchaSolution;
    use prosopo_types::datasets::CaptchaStatus;
    use prosopo_types::stored::IpAddressType;

    pub(super) fn record(id: &str) -> UserCommitment {
        UserCommitment {
            user_account: "userTest".to_string(),
            dapp_account: "dappTest".to_string(),
            dataset_id: "datasetTest".to_string(),
            provider_account: "providerTest".to_string(),
            id: id.to_string(),
            result: StoredResult::new(CaptchaStatus::Approved, None),
            user_signature: "0xsig".to_string(),
            ip_address: CompositeIpAddress {
                lower: IpHalf(1),
                upper: None,
                ip_type: IpAddressType::V4,
            },
            provided_ip: None,
            metadata: None,
            client_meta_data: None,
            headers: Document::new(),
            ja4: "ja4".to_string(),
            user_submitted: true,
            server_checked: false,
            ip_info: None,
            parsed_user_agent_info: None,
            stored_at_timestamp: None,
            requested_at_timestamp: DateTime::parse_rfc3339_str("2026-06-10T07:30:00Z").expect("a date"),
            submitted_at_timestamp: None,
            verified_at_timestamp: None,
            failed_at_timestamp: None,
            last_updated_timestamp: Some(DateTime::parse_rfc3339_str("2026-06-10T07:30:05Z").expect("a date")),
            pending_stage: None,
            session_id: None,
            coords: None,
            input_methods: None,
            pending: false,
            salt: "0xsalt".to_string(),
            request_hash: "requestHashTest".to_string(),
            deadline_timestamp: DateTime::parse_rfc3339_str("2026-06-10T07:35:00Z").expect("a date"),
            threshold: 1.0,
            device_capability: None,
            behavioral_data_packed: None,
            label: None,
            label_reason: None,
            labelled_by: None,
            labelled_at: None,
        }
    }

    fn solution() -> CaptchaSolution {
        CaptchaSolution {
            captcha_id: "captcha".to_string(),
            captcha_content_id: "content".to_string(),
            solution: vec!["a".to_string()],
            salt: "salt".to_string(),
            input_methods: None,
        }
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn can_upsert_the_same_record_straight_after_an_upsert() {
        let live: Live = Live::new("restream").await;
        let commitment: UserCommitment = record("commitment-restream");
        let before: UserCommitment = commitment.clone();
        live.db.store_user_image_captcha_solution(&[solution()], &commitment).await.expect("stores");
        assert_eq!(commitment, before);
        live.db.store_user_image_captcha_solution(&[solution()], &commitment).await.expect("stores again");
        let stored = live.db.get_dapp_user_commitment_by_id("commitment-restream").await.expect("reads").expect("exists");
        assert_eq!(stored.user_account, "userTest");
        live.finish().await;
    }
}

mod dapp_user_commitment_projection {
    use super::*;
    use crate::records::CommitmentRecord;
    use bson::Bson;

    fn c1_event(t: i64) -> Document {
        doc! { "x": 720 + t, "y": 500, "timestamp": 1_787_567_678_500_i64 + t, "velocity": 0 }
    }

    fn c3_event(t: i64) -> Document {
        doc! {
            "x": 500,
            "y": 400,
            "timestamp": 1_787_567_668_000_i64 + t * 100,
            "eventType": "click",
            "button": 0,
            "targetElement": "IMG",
            "ctrlKey": false,
            "shiftKey": false,
            "altKey": false,
        }
    }

    fn build_commitment(id: &str) -> Document {
        let now: DateTime = DateTime::now();
        doc! {
            "id": id,
            "userAccount": "user-projection",
            "dappAccount": "dapp-projection",
            "providerAccount": "provider-projection",
            "datasetId": "dataset-projection",
            "result": { "status": "Approved" },
            "userSignature": "sig-projection",
            "ipAddress": ip(1),
            "headers": { "host": "example.com", "user-agent": "Mozilla/5.0" },
            "ja4": "ja4-projection",
            "userSubmitted": true,
            "serverChecked": false,
            "requestedAtTimestamp": now,
            "submittedAtTimestamp": now,
            "pending": false,
            "salt": "salt-projection",
            "requestHash": "0xdeadbeef",
            "deadlineTimestamp": DateTime::from_millis(now.timestamp_millis() + 60_000),
            "threshold": 0.5,
            "sessionId": "session-projection",
            "clientMetaData": { "clientSessionId": "bumblebee-session-projection" },
            "ipInfo": {
                "ip": "203.0.113.1",
                "isValid": true,
                "isVPN": false,
                "isTor": false,
                "isProxy": false,
                "isDatacenter": false,
                "isAbuser": false,
                "isMobile": false,
                "isSatellite": false,
                "isCrawler": false,
                "countryCode": "GB",
                "asnNumber": 64500,
                "abuserScore": 0,
                "companyAbuserScore": 0,
            },
            "coords": [[[723, 766], [536, 450]]],
            "deviceCapability": "desktop",
            "behavioralDataPacked": {
                "c1": [c1_event(0), c1_event(1), c1_event(2)],
                "c2": [],
                "c3": [c3_event(0), c3_event(1)],
                "d": "desktop",
            },
        }
    }

    fn packed_length(record: &CommitmentRecord, key: &str) -> usize {
        match &record.behavioral_data_packed {
            Some(Bson::Document(packed)) => packed.get_array(key).expect("an array").len(),
            other => panic!("no behavioralDataPacked: {other:?}"),
        }
    }

    async fn seeded(name: &str, id: &str) -> Live {
        let live: Live = Live::new(name).await;
        live.create(&USER_COMMITMENT_RECORD, collections::COMMITMENT, build_commitment(id)).await;
        live
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn returns_behavioral_data_packed_when_the_record_on_disk_carries_a_payload() {
        let live: Live = seeded("projection-bdp", "commitment-projection-bdp-by-id").await;
        let got: CommitmentRecord =
            live.db.get_dapp_user_commitment_by_id("commitment-projection-bdp-by-id").await.expect("reads").expect("exists");
        assert_eq!(packed_length(&got, "c1"), 3);
        assert_eq!(packed_length(&got, "c2"), 0);
        assert_eq!(packed_length(&got, "c3"), 2);
        let Some(Bson::Document(packed)) = &got.behavioral_data_packed else { unreachable!() };
        assert_eq!(packed.get_str("d").ok(), Some("desktop"));
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn returns_every_field_the_verify_path_reads_from_solution_by_id() {
        let live: Live = seeded("projection-verify", "commitment-projection-verify-reads-by-id").await;
        let got: CommitmentRecord = live
            .db
            .get_dapp_user_commitment_by_id("commitment-projection-verify-reads-by-id")
            .await
            .expect("reads")
            .expect("exists");
        assert_eq!(got.user_account, "user-projection");
        assert_eq!(got.dapp_account, "dapp-projection");
        assert!(got.headers.is_some());
        assert_eq!(got.device_capability.as_deref(), Some("desktop"));
        let Some(Bson::Document(ip_info)) = &got.ip_info else { panic!("no ipInfo") };
        assert_eq!(ip_info.get_bool("isValid").ok(), Some(true));
        assert_eq!(got.coords.as_ref().and_then(|coords| coords.first()?.first().cloned()), Some(vec![723.0, 766.0]));
        assert_eq!(got.server_checked, Some(false));
        assert_eq!(got.session_id.as_deref(), Some("session-projection"));
        assert_eq!(
            got.client_meta_data.as_ref().and_then(|meta| meta.client_session_id.as_deref()),
            Some("bumblebee-session-projection")
        );
        assert_eq!(got.result.status, prosopo_types::datasets::CaptchaStatus::Approved);
        assert!(got.submitted_at_timestamp.is_some());
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn by_account_fallback_returns_behavioral_data_packed() {
        let live: Live = seeded("projection-by-account", "commitment-projection-bdp-by-account").await;
        let docs: Vec<CommitmentRecord> =
            live.db.get_dapp_user_commitment_by_account("user-projection", "dapp-projection").await.expect("reads");
        let got: &CommitmentRecord = docs.first().expect("a commitment");
        assert_eq!(packed_length(got, "c1"), 3);
        assert_eq!(packed_length(got, "c3"), 2);
        assert_eq!(got.user_account, "user-projection");
        assert_eq!(got.dapp_account, "dapp-projection");
        assert!(got.headers.is_some());
        assert!(got.ip_info.is_some());
        assert_eq!(got.coords.as_ref().and_then(|coords| coords.first()?.first().cloned()), Some(vec![723.0, 766.0]));
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn by_id_and_by_account_return_the_same_verify_path_fields() {
        let id: &str = "commitment-projection-parity";
        let live: Live = seeded("projection-parity", id).await;
        let by_id: CommitmentRecord = live.db.get_dapp_user_commitment_by_id(id).await.expect("reads").expect("exists");
        let by_account: CommitmentRecord = live
            .db
            .get_dapp_user_commitment_by_account("user-projection", "dapp-projection")
            .await
            .expect("reads")
            .into_iter()
            .find(|record| record.id == id)
            .expect("a commitment");
        for record in [&by_id, &by_account] {
            assert!(record.headers.is_some());
            assert!(record.behavioral_data_packed.is_some());
            assert!(record.device_capability.is_some());
            assert!(record.ip_info.is_some());
            assert!(record.coords.is_some());
            assert!(record.session_id.is_some());
            assert!(record.server_checked.is_some());
            assert!(record.submitted_at_timestamp.is_some());
        }
        assert_eq!(by_id, by_account);
        live.finish().await;
    }
}

mod session_record_projection {
    use super::*;
    use crate::session::Session;
    use prosopo_types::captcha_type::CaptchaType;
    use prosopo_types::stored::IpAddressType;
    use prosopo_types_database::projection::SESSION_PROJECTION_FIELDS;
    use prosopo_types_database::provider::SESSION_RECORD;
    use prosopo_types_database::schema::Default as PathDefault;

    fn base(session_id: &str, token: &str, score: f64, captcha_type: &str) -> Document {
        doc! {
            "sessionId": session_id,
            "createdAt": DateTime::now(),
            "token": token,
            "score": score,
            "threshold": 0.5,
            "scoreComponents": { "baseScore": score },
            "ipAddress": ip(16_843_009),
            "captchaType": captcha_type,
            "webView": false,
            "iFrame": false,
        }
    }

    async fn read(live: &Live, session_id: &str) -> Session {
        live.db.get_session_record_by_session_id(session_id).await.expect("reads").expect("the session is returned")
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn round_trips_every_field_build_escalation_forwards_into_create_session() {
        let live: Live = Live::new("session-roundtrip").await;
        let session_id: &str = "session-projection-roundtrip";
        live.create(
            &SESSION_RECORD,
            collections::SESSION,
            with(
                base(session_id, "tok-roundtrip", 0.42, "pow"),
                doc! {
                    "scoreComponents": { "baseScore": 0.42, "lScore": 0.1 },
                    "solvedImagesCount": 3,
                    "userSitekeyIpHash": "hash-abc",
                    "webView": true,
                    "decryptedHeadHash": "head-hash-xyz",
                    "siteKey": "site-key-1",
                    "reason": "user-passed",
                    "currentUrl": "https://example.com/checkout",
                    "iframeUrl": "https://widget.example.com/embed",
                    "headers": {
                        "user-agent": "Mozilla/5.0",
                        "accept-language": "en-GB",
                        "x-tls-clienthello": "AAAAAAAAAAAAAA==".repeat(200),
                    },
                },
            ),
        )
        .await;
        let got: Session = read(&live, session_id).await;
        assert_eq!(got.token, "tok-roundtrip");
        assert_eq!(got.score, 0.42);
        assert_eq!(got.threshold, 0.5);
        assert_eq!(got.ip_address.ip_type, IpAddressType::V4);
        assert_eq!(got.ip_address.lower.0, 16_843_009);
        assert_eq!(got.site_key.as_deref(), Some("site-key-1"));
        assert_eq!(got.solved_images_count, Some(3.0));
        assert_eq!(got.user_sitekey_ip_hash.as_deref(), Some("hash-abc"));
        assert_eq!(got.score_components.base_score, 0.42);
        assert!(got.web_view);
        assert!(!got.i_frame);
        assert_eq!(got.decrypted_head_hash, "head-hash-xyz");
        assert_eq!(got.reason.as_deref(), Some("user-passed"));
        assert_eq!(got.current_url.as_deref(), Some("https://example.com/checkout"));
        assert_eq!(got.iframe_url.as_deref(), Some("https://widget.example.com/embed"));
        let headers: &Document = got.headers.as_ref().expect("headers");
        assert_eq!(headers.get_str("user-agent").ok(), Some("Mozilla/5.0"));
        assert_eq!(headers.get_str("accept-language").ok(), Some("en-GB"));
        assert!(!headers.contains_key("x-tls-clienthello"));
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn a_session_read_by_id_can_be_re_persisted_as_a_new_escalation_session() {
        let live: Live = Live::new("session-escalation").await;
        live.create(
            &SESSION_RECORD,
            collections::SESSION,
            with(
                base("session-escalation-origin", "tok-escalation", 0.6, "pow"),
                doc! { "decryptedHeadHash": "head-escalation", "siteKey": "site-key-escalation" },
            ),
        )
        .await;
        let origin: Session = read(&live, "session-escalation-origin").await;
        let escalation: Session = Session {
            session_id: "session-escalation-new".to_string(),
            created_at: DateTime::now(),
            captcha_type: CaptchaType::Image,
            ..origin
        };
        live.db.store_session_record(&escalation).await.expect("stores");
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn returns_bundle_id_so_the_bundle_can_be_resolved() {
        let live: Live = Live::new("session-bundle").await;
        live.create(
            &SESSION_RECORD,
            collections::SESSION,
            with(base("session-bundleid-roundtrip", "tok-bundleid", 0.1, "pow"), doc! { "bundleId": "bundle-42" }),
        )
        .await;
        assert_eq!(read(&live, "session-bundleid-roundtrip").await.bundle_id.as_deref(), Some("bundle-42"));
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn returns_origin_session_id_so_the_escalation_fallback_knows_where_to_walk() {
        let live: Live = Live::new("session-origin").await;
        live.create(&SESSION_RECORD, collections::SESSION, base("session-origin-for-chain", "tok-origin", 0.4, "pow")).await;
        live.create(
            &SESSION_RECORD,
            collections::SESSION,
            with(
                base("session-escalation-with-origin", "tok-escalation", 0.4, "puzzle"),
                doc! { "isEscalation": true, "originSessionId": "session-origin-for-chain" },
            ),
        )
        .await;
        let got: Session = read(&live, "session-escalation-with-origin").await;
        assert_eq!(got.origin_session_id.as_deref(), Some("session-origin-for-chain"));
        assert_eq!(got.is_escalation, Some(true));
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn returns_refresh_count_and_created_at_so_a_refresh_can_extend_its_chain() {
        let live: Live = Live::new("session-refresh").await;
        let created_at: DateTime = DateTime::parse_rfc3339_str("2026-09-28T12:00:00Z").expect("a date");
        live.create(
            &SESSION_RECORD,
            collections::SESSION,
            with(
                base("session-refreshed", "tok-refreshed", 0.4, "puzzle"),
                doc! { "createdAt": created_at, "refreshOf": "session-before", "refreshCount": 2, "refreshedAfterMs": 4000 },
            ),
        )
        .await;
        let got: Session = read(&live, "session-refreshed").await;
        assert_eq!(got.refresh_count, Some(2.0));
        assert_eq!(got.created_at, created_at);
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn returns_tcp_probe_fields_so_decide_rules_can_match_tcp_fingerprints() {
        let live: Live = Live::new("session-tcp").await;
        live.create(
            &SESSION_RECORD,
            collections::SESSION,
            with(
                base("session-tcp-probe-roundtrip", "tok-tcp-probe", 0.1, "pow"),
                doc! {
                    "tcpOptsFlags": 19,
                    "tcpOptsOrder": 786,
                    "observedTtl": 52,
                    "synNs": 1_700_000_000_000_000_000.0,
                    "synackNs": 1_700_000_000_000_500_000.0,
                    "ackNs": 1_700_000_000_000_800_000.0,
                    "tcpMss": 1460,
                    "tcpWscale": 7,
                    "tcpWindow": 65535,
                },
            ),
        )
        .await;
        let got: Session = read(&live, "session-tcp-probe-roundtrip").await;
        assert_eq!(got.tcp_opts_flags, Some(19.0));
        assert_eq!(got.tcp_opts_order, Some(786.0));
        assert_eq!(got.observed_ttl, Some(52.0));
        assert_eq!(got.syn_ns, Some(1_700_000_000_000_000_000.0));
        assert_eq!(got.synack_ns, Some(1_700_000_000_000_500_000.0));
        assert_eq!(got.ack_ns, Some(1_700_000_000_000_800_000.0));
        assert_eq!(got.tcp_mss, Some(1460.0));
        assert_eq!(got.tcp_wscale, Some(7.0));
        assert_eq!(got.tcp_window, Some(65535.0));
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn every_required_session_field_is_included_in_the_projection() {
        let required: Vec<String> = SESSION_RECORD
            .paths()
            .into_iter()
            .filter(|(_, path)| path.required && matches!(path.default, PathDefault::None))
            .map(|(name, _)| name)
            .collect();
        for name in ["token", "score", "threshold"] {
            assert!(required.iter().any(|path| path == name), "{name} is required");
        }
        for path in &required {
            let top: &str = path.split('.').next().unwrap_or(path);
            assert!(SESSION_PROJECTION_FIELDS.contains(&top), "required Session field '{top}' is missing from the projection");
        }
        let live: Live = Live::new("session-required").await;
        live.create(&SESSION_RECORD, collections::SESSION, base("session-required-fields", "tok-required", 0.1, "pow")).await;
        read(&live, "session-required-fields").await;
        live.finish().await;
    }
}

/// ipInfoPersistence.integration.test.ts: a record's `ipInfo` comes back as it was given.
mod ip_info_persistence {
    use super::*;
    use prosopo_types_database::provider::SESSION_RECORD;

    fn valid_ip_info() -> Document {
        doc! {
            "ip": "1.1.1.1",
            "isValid": true,
            "isVPN": true,
            "isTor": false,
            "isProxy": true,
            "isDatacenter": true,
            "isAbuser": true,
            "isMobile": false,
            "isSatellite": false,
            "isCrawler": false,
            "countryCode": "DE",
            "asnNumber": 12345,
            "abuserScore": 0.7,
            "companyAbuserScore": 0.4,
        }
    }

    fn error_ip_info() -> Document {
        doc! { "ip": "127.0.0.1", "isValid": false, "error": "Non-routable IP address" }
    }

    fn pow(challenge: &str, lower: i64, ip_info: Option<Document>) -> Document {
        let mut record: Document = doc! {
            "challenge": challenge,
            "userAccount": "user1",
            "dappAccount": "dapp1",
            "requestedAtTimestamp": DateTime::now(),
            "ipAddress": ip(lower),
            "headers": { "host": "example.com" },
            "ja4": "ja4-1",
            "result": { "status": "Pending" },
            "userSubmitted": false,
            "serverChecked": false,
            "difficulty": 4,
            "providerSignature": "sig-1",
        };
        if let Some(ip_info) = ip_info {
            record.insert("ipInfo", ip_info);
        }
        record
    }

    fn session(session_id: &str, lower: i64, ip_info: Document) -> Document {
        doc! {
            "sessionId": session_id,
            "createdAt": DateTime::now(),
            "token": "tok-1",
            "score": 0.5,
            "threshold": 0.5,
            "scoreComponents": { "baseScore": 0.5 },
            "ipAddress": ip(lower),
            "captchaType": "frictionless",
            "webView": false,
            "iFrame": false,
            "decryptedHeadHash": "",
            "siteKey": "dapp1",
            "ipInfo": ip_info,
        }
    }

    async fn stored_ip_info(live: &Live, collection: &str, filter: Document) -> Document {
        let found: Vec<Document> = live.db.find(Operation::find(collection, filter)).await.expect("reads");
        found.first().expect("the record").get_document("ipInfo").expect("ipInfo").clone()
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn persists_the_ip_info_of_every_record_kind() {
        let live: Live = Live::new("ip-info").await;
        live.create(&POW_CAPTCHA_RECORD, collections::POW_CAPTCHA, pow("1___2___challenge-pow-valid", 16_843_009, Some(valid_ip_info())))
            .await;
        live.create(&POW_CAPTCHA_RECORD, collections::POW_CAPTCHA, pow("1___2___challenge-pow-error", 2_130_706_433, Some(error_ip_info())))
            .await;
        let mut puzzle: Document = pow("1___2___challenge-puzzle-valid", 16_843_009, Some(valid_ip_info()));
        puzzle.remove("difficulty");
        puzzle.extend(doc! { "targetX": 100, "targetY": 100, "originX": 0, "originY": 0, "tolerance": 10 });
        live.create(&PUZZLE_CAPTCHA_RECORD, collections::PUZZLE_CAPTCHA, puzzle).await;
        live.create(
            &USER_COMMITMENT_RECORD,
            collections::COMMITMENT,
            doc! {
                "id": "commitment-valid",
                "userAccount": "user4",
                "dappAccount": "dapp1",
                "providerAccount": "provider1",
                "datasetId": "dataset1",
                "result": { "status": "Pending" },
                "userSignature": "sig",
                "ipAddress": ip(16_843_009),
                "headers": { "host": "example.com" },
                "ja4": "ja4-4",
                "userSubmitted": true,
                "serverChecked": false,
                "requestedAtTimestamp": DateTime::now(),
                "pending": false,
                "salt": "salt",
                "requestHash": "0xabcdef",
                "deadlineTimestamp": DateTime::from_millis(DateTime::now().timestamp_millis() + 60_000),
                "threshold": 0.5,
                "ipInfo": valid_ip_info(),
            },
        )
        .await;
        live.create(&SESSION_RECORD, collections::SESSION, session("session-valid", 16_843_009, valid_ip_info())).await;
        live.create(&SESSION_RECORD, collections::SESSION, session("session-error", 2_130_706_433, error_ip_info())).await;

        let cases: [(&str, Document, Document); 6] = [
            (collections::POW_CAPTCHA, doc! { "challenge": "1___2___challenge-pow-valid" }, valid_ip_info()),
            (collections::POW_CAPTCHA, doc! { "challenge": "1___2___challenge-pow-error" }, error_ip_info()),
            (collections::PUZZLE_CAPTCHA, doc! { "challenge": "1___2___challenge-puzzle-valid" }, valid_ip_info()),
            (collections::COMMITMENT, doc! { "id": "commitment-valid" }, valid_ip_info()),
            (collections::SESSION, doc! { "sessionId": "session-valid" }, valid_ip_info()),
            (collections::SESSION, doc! { "sessionId": "session-error" }, error_ip_info()),
        ];
        for (collection, filter, expected) in cases {
            assert_eq!(stored_ip_info(&live, collection, filter.clone()).await, expected, "{collection} {filter}");
        }
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn the_backfill_query_matches_records_missing_ip_info() {
        let live: Live = Live::new("ip-info-backfill").await;
        live.create(&POW_CAPTCHA_RECORD, collections::POW_CAPTCHA, pow("1___2___challenge-pow-with-info", 16_843_010, Some(valid_ip_info())))
            .await;
        live.create(&POW_CAPTCHA_RECORD, collections::POW_CAPTCHA, pow("1___2___challenge-pow-no-info", 16_843_011, None)).await;
        let missing: Vec<Document> = live
            .db
            .find(Operation::find(collections::POW_CAPTCHA, doc! { "ipInfo": { "$exists": false } }))
            .await
            .expect("reads");
        let challenges: Vec<&str> = missing.iter().filter_map(|record| record.get_str("challenge").ok()).collect();
        assert!(challenges.contains(&"1___2___challenge-pow-no-info"));
        assert!(!challenges.contains(&"1___2___challenge-pow-with-info"));
        live.finish().await;
    }
}

/// providedIpPipelineCast.integration.test.ts, the cases on the provider's own collection.
mod provided_ip_pipeline_cast {
    use super::*;
    use crate::operation::UpdateStatement;
    use bson::Bson;

    const IP_V6_LOWER_UNSAFE: u64 = 0xB496_D250_E5C5_8459;

    async fn seed(live: &Live, id: &str) {
        live.create(
            &USER_COMMITMENT_RECORD,
            collections::COMMITMENT,
            doc! {
                "id": id,
                "userAccount": "userTest",
                "dappAccount": "dappTest",
                "providerAccount": "providerTest",
                "datasetId": "datasetTest",
                "result": { "status": "Pending" },
                "userSignature": "0xsig",
                "ipAddress": ip(16_909_060),
                "headers": { "host": "pronode-test.local" },
                "ja4": "ja4-test",
                "userSubmitted": false,
                "serverChecked": false,
                "requestedAtTimestamp": DateTime::now(),
                "pending": false,
                "salt": "salt",
                "requestHash": "0xreqhash",
                "deadlineTimestamp": DateTime::from_millis(DateTime::now().timestamp_millis() + 60_000),
                "threshold": 0.5,
            },
        )
        .await;
    }

    fn provided_ip() -> Document {
        let half: Bson = Bson::Int64(IP_V6_LOWER_UNSAFE as i64);
        doc! { "lower": half.clone(), "upper": half, "type": "v6" }
    }

    async fn stored_provided_ip(live: &Live, id: &str) -> Document {
        let found: Vec<Document> = live.db.find(Operation::find(collections::COMMITMENT, doc! { "id": id })).await.expect("reads");
        found.first().expect("the commitment").get_document("providedIp").expect("providedIp").clone()
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn writes_provided_ip_halves_as_decimal128_through_update_dapp_user_commitment() {
        let live: Live = Live::new("provided-ip").await;
        seed(&live, "commitment-pipeline-v6").await;
        live.db
            .update_dapp_user_commitment("commitment-pipeline-v6", &doc! { "providedIp": provided_ip() })
            .await
            .expect("updates");
        let stored: Document = stored_provided_ip(&live, "commitment-pipeline-v6").await;
        assert_eq!(stored.get_str("type").ok(), Some("v6"));
        let expected: Bson = crate::records::IpHalf(IP_V6_LOWER_UNSAFE).to_bson();
        assert_eq!(stored.get("lower"), Some(&expected));
        assert_eq!(stored.get("upper"), Some(&expected));
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn the_pipeline_form_of_the_same_write_stores_a_long() {
        let live: Live = Live::new("provided-ip-control").await;
        seed(&live, "commitment-pipeline-v6-negative-control").await;
        live.db
            .run(Operation::update(
                collections::COMMITMENT,
                vec![UpdateStatement::pipeline(
                    doc! { "id": "commitment-pipeline-v6-negative-control" },
                    vec![doc! { "$set": { "providedIp": provided_ip() } }],
                )],
            ))
            .await
            .expect("updates");
        let stored: Document = stored_provided_ip(&live, "commitment-pipeline-v6-negative-control").await;
        assert!(matches!(stored.get("lower"), Some(Bson::Int64(_))));
        live.finish().await;
    }
}

/// projectionContracts.integration.test.ts: every field each projected read's consumer reads
/// survives the projection.
mod projection_contracts {
    use super::*;
    use crate::clients::ClientRecord;
    use crate::records::ChallengeRecord;
    use prosopo_types_database::provider::CLIENT_RECORD;

    fn valid_ip_info() -> Document {
        doc! {
            "ip": "203.0.113.1",
            "isValid": true,
            "isVPN": false,
            "isTor": false,
            "isProxy": false,
            "isDatacenter": false,
            "isAbuser": false,
            "isMobile": false,
            "isSatellite": false,
            "isCrawler": false,
            "countryCode": "GB",
            "asnNumber": 64500,
            "abuserScore": 0,
            "companyAbuserScore": 0,
        }
    }

    fn bdp() -> Document {
        doc! {
            "c1": [{ "x": 100, "y": 100, "timestamp": 1_787_000_000_000_i64, "velocity": 0 }],
            "c2": [],
            "c3": [{
                "x": 200, "y": 200, "timestamp": 1_787_000_000_500_i64, "eventType": "click", "button": 0,
                "targetElement": "IMG", "ctrlKey": false, "shiftKey": false, "altKey": false,
            }],
            "d": "desktop",
        }
    }

    fn record(kind: &str, challenge: &str, extra: Document) -> Document {
        let now: DateTime = DateTime::now();
        with(
            doc! {
                "challenge": challenge,
                "userAccount": format!("user-{kind}"),
                "dappAccount": format!("dapp-{kind}"),
                "requestedAtTimestamp": now,
                "submittedAtTimestamp": now,
                "ipAddress": ip(1),
                "headers": { "host": "example.com", "user-agent": "Mozilla/5.0" },
                "ja4": format!("ja4-{kind}"),
                "result": { "status": "Approved" },
                "providerSignature": format!("sig-{kind}"),
                "sessionId": format!("session-{kind}"),
                "ipInfo": valid_ip_info(),
                "deviceCapability": "desktop",
                "behavioralDataPacked": bdp(),
                "serverChecked": false,
                "userSubmitted": true,
                "coords": [[[100, 100]]],
                "clientMetaData": { "clientSessionId": format!("bumblebee-{kind}-contract") },
            },
            extra,
        )
    }

    /// The fields every challenge consumer reads.
    fn missing_common(record: &ChallengeRecord) -> Vec<&'static str> {
        [
            ("behavioralDataPacked", record.behavioral_data_packed.is_some()),
            ("clientMetaData", record.client_meta_data.is_some()),
            ("coords", record.coords.is_some()),
            ("deviceCapability", record.device_capability.is_some()),
            ("headers", record.headers.is_some()),
            ("ipInfo", record.ip_info.is_some()),
            ("serverChecked", record.server_checked.is_some()),
            ("sessionId", record.session_id.is_some()),
            ("submittedAtTimestamp", record.submitted_at_timestamp.is_some()),
        ]
        .into_iter()
        .filter(|(_, present)| !present)
        .map(|(name, _)| name)
        .collect()
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn get_pow_captcha_record_by_challenge_returns_every_field_its_consumer_reads() {
        let live: Live = Live::new("contract-pow").await;
        let challenge: &str = "1___2___pow-projection-contract";
        live.create(&POW_CAPTCHA_RECORD, collections::POW_CAPTCHA, record("pow", challenge, doc! { "difficulty": 4 })).await;
        let got: ChallengeRecord = live.db.get_pow_captcha_record_by_challenge(challenge).await.expect("reads").expect("exists");
        let mut missing: Vec<&str> = missing_common(&got);
        if got.difficulty.is_none() {
            missing.push("difficulty");
        }
        assert_eq!(missing, Vec::<&str>::new());
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn get_puzzle_captcha_record_by_challenge_returns_every_field_its_consumer_reads() {
        let live: Live = Live::new("contract-puzzle").await;
        let challenge: &str = "1___2___puzzle-projection-contract";
        let extra: Document = doc! {
            "targetX": 100, "targetY": 100, "originX": 0, "originY": 0, "tolerance": 10,
            "puzzleEvents": [{ "x": 10, "y": 10, "t": 1_787_000_000_000_i64 }, { "x": 100, "y": 100, "t": 1_787_000_000_500_i64 }],
        };
        live.create(&PUZZLE_CAPTCHA_RECORD, collections::PUZZLE_CAPTCHA, record("puzzle", challenge, extra)).await;
        let got: ChallengeRecord = live
            .db
            .get_interactive_captcha_record_by_challenge(Interactive::Puzzle, challenge)
            .await
            .expect("reads")
            .expect("exists");
        let mut missing: Vec<&str> = missing_common(&got);
        for (name, present) in [
            ("puzzleEvents", got.puzzle_events.is_some()),
            ("targetX", got.target_x.is_some()),
            ("targetY", got.target_y.is_some()),
            ("tolerance", got.tolerance.is_some()),
            ("userSubmitted", got.user_submitted.is_some()),
        ] {
            if !present {
                missing.push(name);
            }
        }
        assert_eq!(missing, Vec::<&str>::new());
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn get_audio_captcha_record_by_challenge_returns_every_field_its_consumer_reads() {
        let live: Live = Live::new("contract-audio").await;
        let challenge: &str = "1___2___audio-projection-contract";
        let extra: Document = doc! {
            "answer": "96475", "submittedAnswer": "96475", "replays": 1,
            "audioEvents": [{ "kind": "play", "t": 1_787_000_000_000_i64 }],
        };
        live.create(&AUDIO_CAPTCHA_RECORD, collections::AUDIO_CAPTCHA, record("audio", challenge, extra)).await;
        let got: ChallengeRecord = live
            .db
            .get_interactive_captcha_record_by_challenge(Interactive::Audio, challenge)
            .await
            .expect("reads")
            .expect("exists");
        let mut missing: Vec<&str> = missing_common(&got);
        for (name, present) in [
            ("answer", got.answer.is_some()),
            ("audioEvents", got.audio_events.is_some()),
            ("replays", got.replays.is_some()),
            ("userSubmitted", got.user_submitted.is_some()),
        ] {
            if !present {
                missing.push(name);
            }
        }
        assert_eq!(missing, Vec::<&str>::new());
        live.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn get_client_record_returns_every_field_its_consumer_reads() {
        let live: Live = Live::new("contract-client").await;
        live.create(
            &CLIENT_RECORD,
            collections::CLIENT,
            doc! {
                "account": "client-projection-contract",
                "tier": "free",
                "settings": { "domains": ["example.com"], "frictionlessThreshold": 0.5, "powDifficulty": 4, "captchaType": "image" },
            },
        )
        .await;
        let got: ClientRecord = live.db.get_client_record("client-projection-contract").await.expect("reads").expect("exists");
        assert_eq!(got.account.as_deref(), Some("client-projection-contract"));
        assert!(got.settings.is_some());
        live.finish().await;
    }
}

/// The central database, for saveCaptchasSessionUpsert, puzzleCentralStreaming,
/// centralStreamingEnrichment and the sweep case of providedIpPipelineCast.
mod central_database {
    use super::*;
    use crate::captcha::{CaptchaBatch, CaptchaDatabase, StoredKind};
    use crate::operation::DriverExecutor;
    use crate::operation::Executor;
    use crate::streamer::{CentralDbStreamer, MarkStored};
    use bson::Bson;
    use std::sync::Mutex;

    struct Central {
        mongo: Arc<MongoDatabase>,
        database: Arc<CaptchaDatabase>,
        streamer: Arc<CentralDbStreamer>,
    }

    impl Central {
        async fn new(name: &str) -> Central {
            let url: String = std::env::var("PROSOPO_TEST_MONGO_URL").expect("PROSOPO_TEST_MONGO_URL");
            let open = || {
                MongoDatabase::new(&url, Some(&format!("prosopo-test-central-{name}")), None, None, MongoConnectionTimeouts::default())
                    .expect("a valid URL")
            };
            let mongo: MongoDatabase = open();
            mongo.connect().await.expect("connects");
            mongo.database().await.expect("open").drop().await.expect("drops");
            let logger = || get_logger(LogLevel::Error, "test");
            Central {
                mongo: Arc::new(mongo),
                database: Arc::new(CaptchaDatabase::new(open(), Arc::new(SystemSource), logger())),
                streamer: Arc::new(CentralDbStreamer::new(CaptchaDatabase::new(open(), Arc::new(SystemSource), logger()), logger())),
            }
        }

        async fn find(&self, kind: StoredKind, filter: Document) -> Vec<Document> {
            let executor: DriverExecutor = DriverExecutor::new(self.mongo.database().await.expect("open"));
            executor.run(Operation::find(kind.collection(), filter)).await.expect("reads").documents()
        }

        async fn finish(self) {
            self.mongo.database().await.expect("open").drop().await.expect("drops");
            self.mongo.close().await;
        }
    }

    fn session(session_id: &str, score: f64) -> Document {
        doc! {
            "sessionId": session_id,
            "createdAt": DateTime::now(),
            "token": "tok",
            "score": score,
            "threshold": 0.5,
            "scoreComponents": { "baseScore": score },
            "ipAddress": ip(16_843_009),
            "captchaType": "pow",
            "userSitekeyIpHash": "hash-abc",
            "webView": false,
            "iFrame": false,
            "decryptedHeadHash": "head-hash",
            "siteKey": "site-key-1",
            "headers": { "user-agent": "test" },
        }
    }

    fn sessions(records: Vec<Document>) -> CaptchaBatch {
        CaptchaBatch {
            sessions: records,
            ..CaptchaBatch::default()
        }
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn the_same_session_saved_by_successive_sweeps_is_one_document() {
        let central: Central = Central::new("session-repeat").await;
        for score in [0.1, 0.2, 0.3] {
            central.database.save_captchas(&sessions(vec![session("session-upsert-repeat", score)])).await.expect("saves");
        }
        let found: Vec<Document> = central.find(StoredKind::Session, doc! { "sessionId": "session-upsert-repeat" }).await;
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].get_f64("score").ok(), Some(0.3));
        central.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn distinct_sessions_each_get_their_own_document() {
        let central: Central = Central::new("session-distinct").await;
        let ids: [&str; 3] = ["session-a", "session-b", "session-c"];
        let records: Vec<Document> = ids.iter().enumerate().map(|(i, id)| session(id, 0.1 * (i as f64 + 1.0))).collect();
        central.database.save_captchas(&sessions(records)).await.expect("saves");
        for id in ids {
            assert_eq!(central.find(StoredKind::Session, doc! { "sessionId": id }).await.len(), 1, "{id}");
        }
        central.finish().await;
    }

    fn puzzle(challenge: &str, extra: Document) -> Document {
        with(
            doc! {
                "challenge": challenge,
                "userAccount": "userTest",
                "dappAccount": "dappTest",
                "requestedAtTimestamp": DateTime::parse_rfc3339_str("2026-06-10T07:30:00Z").expect("a date"),
                "lastUpdatedTimestamp": DateTime::parse_rfc3339_str("2026-06-10T07:30:05Z").expect("a date"),
                "ipAddress": ip(3_405_803_783),
                "headers": { "host": "pronode-test.local" },
                "ja4": "t13d1516h2_test_abcdef",
                "result": { "status": "Pending" },
                "userSubmitted": false,
                "serverChecked": false,
                "targetX": 100,
                "targetY": 200,
                "originX": 50,
                "originY": 150,
                "tolerance": 10,
                "providerSignature": "0xproviderSig",
                "sessionId": "pronode-test-session-puzzle-1",
                "ipInfo": { "ip": "203.0.113.7", "isValid": true, "countryCode": "GB", "asnNumber": 64500, "abuserScore": 0.01 },
            },
            extra,
        )
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn a_streamed_puzzle_record_lands_in_the_central_puzzle_collection() {
        let central: Central = Central::new("puzzle-record").await;
        let record: Document = puzzle("1___puzzle___e2e-1", Document::new());
        central.streamer.stream_record(StoredKind::Puzzle, record.clone(), None);
        central.streamer.idle().await;
        let stored: Document = central.find(StoredKind::Puzzle, doc! { "challenge": "1___puzzle___e2e-1" }).await.remove(0);
        for field in ["challenge", "userAccount", "dappAccount", "sessionId"] {
            assert_eq!(stored.get(field), record.get(field), "{field}");
        }
        assert_eq!(stored.get_i32("targetX").ok(), Some(100));
        assert_eq!(stored.get_i32("tolerance").ok(), Some(10));
        assert_eq!(stored.get_document("result").and_then(|result| result.get_str("status")).ok(), Some("Pending"));
        assert_eq!(stored.get("ipInfo"), record.get("ipInfo"));
        central.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn a_streamed_puzzle_record_is_marked_stored_at_its_last_update() {
        let central: Central = Central::new("puzzle-mark").await;
        let marked: Arc<Mutex<Option<DateTime>>> = Arc::new(Mutex::new(None));
        let seen: Arc<Mutex<Option<DateTime>>> = marked.clone();
        let mark_stored: MarkStored = Box::new(move |at: DateTime| {
            Box::pin(async move {
                *seen.lock().expect("lock") = Some(at);
                Ok(())
            })
        });
        central.streamer.stream_record(StoredKind::Puzzle, puzzle("2___puzzle___e2e-2", Document::new()), Some(mark_stored));
        central.streamer.idle().await;
        assert_eq!(*marked.lock().expect("lock"), Some(DateTime::parse_rfc3339_str("2026-06-10T07:30:05Z").expect("a date")));
        central.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn streaming_the_same_puzzle_again_replaces_its_fields() {
        let central: Central = Central::new("puzzle-again").await;
        let challenge: &str = "3___puzzle___e2e-upsert";
        central.streamer.stream_record(StoredKind::Puzzle, puzzle(challenge, Document::new()), None);
        central.streamer.idle().await;
        let second: Document = puzzle(
            challenge,
            doc! {
                "result": { "status": "Approved" },
                "userSubmitted": true,
                "serverChecked": true,
                "lastUpdatedTimestamp": DateTime::parse_rfc3339_str("2026-06-10T07:30:10Z").expect("a date"),
            },
        );
        central.streamer.stream_record(StoredKind::Puzzle, second, None);
        central.streamer.idle().await;
        let found: Vec<Document> = central.find(StoredKind::Puzzle, doc! { "challenge": challenge }).await;
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].get_document("result").and_then(|result| result.get_str("status")).ok(), Some("Approved"));
        assert_eq!(found[0].get_bool("userSubmitted").ok(), Some(true));
        assert_eq!(found[0].get_bool("serverChecked").ok(), Some(true));
        central.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn a_puzzle_update_fetches_the_record_and_streams_it() {
        let central: Central = Central::new("puzzle-update").await;
        let challenge: &str = "4___puzzle___e2e-update";
        let record: Document = puzzle(challenge, doc! { "result": { "status": "Approved" }, "userSubmitted": true });
        central.streamer.stream_update(StoredKind::Puzzle, Box::pin(async move { Ok(Some(record)) }), None);
        central.streamer.idle().await;
        let stored: Document = central.find(StoredKind::Puzzle, doc! { "challenge": challenge }).await.remove(0);
        assert_eq!(stored.get_bool("userSubmitted").ok(), Some(true));
        assert_eq!(stored.get_document("result").and_then(|result| result.get_str("status")).ok(), Some("Approved"));
        central.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn a_streamed_commitment_keeps_its_enrichment_on_the_central_document() {
        let central: Central = Central::new("enrichment").await;
        let ip_info: Bson = Bson::Document(doc! { "ip": "203.0.113.7", "isValid": true, "isVPN": false, "countryCode": "GB", "asnNumber": 64500 });
        let user_agent: Bson = Bson::Document(doc! {
            "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
            "browser": { "name": "Chrome", "version": "148.0.0.0", "major": "148" },
            "cpu": { "architecture": "amd64" },
            "device": {},
            "engine": { "name": "Blink", "version": "148.0.0.0" },
            "os": { "name": "Windows", "version": "10" },
        });
        let mut commitment = super::commitment_upsert::record("commitment-enrichment-roundtrip");
        commitment.provided_ip = Some(commitment.ip_address);
        commitment.session_id = Some("pronode-test-session-1".to_string());
        commitment.ip_info = Some(ip_info.clone());
        commitment.parsed_user_agent_info = Some(user_agent.clone());
        central.streamer.stream_record(StoredKind::Commitment, commitment.to_document(), None);
        central.streamer.idle().await;
        let stored: Document = central.find(StoredKind::Commitment, doc! { "id": "commitment-enrichment-roundtrip" }).await.remove(0);
        assert_eq!(stored.get("ipInfo"), Some(&ip_info));
        assert_eq!(stored.get("parsedUserAgentInfo"), Some(&user_agent));
        let declared: Vec<String> =
            prosopo_types_database::captcha::STORED_USER_COMMITMENT_RECORD.paths().into_iter().map(|(name, _)| name).collect();
        for path in ["ipInfo", "parsedUserAgentInfo", "sessionId", "providedIp"] {
            assert!(stored.contains_key(path), "{path} was stripped on the way to the central database");
            assert!(
                declared.iter().any(|name| name == path || name.starts_with(&format!("{path}."))),
                "the central commitment schema does not declare {path}"
            );
        }
        central.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn the_sweep_repairs_a_provided_ip_a_pipeline_wrote_as_a_long() {
        let central: Central = Central::new("long-ip").await;
        let half: i64 = 0xB496_D250_E5C5_8459_u64 as i64;
        let mut poisoned: Document = super::commitment_upsert::record("commitment-pipeline-v6-sweep").to_document();
        poisoned.insert("providedIp", doc! { "lower": Bson::Int64(half), "upper": Bson::Int64(half), "type": "v6" });
        let batch: CaptchaBatch = CaptchaBatch {
            commitments: vec![poisoned],
            ..CaptchaBatch::default()
        };
        central.database.save_captchas(&batch).await.expect("saves");
        let stored: Document = central.find(StoredKind::Commitment, doc! { "id": "commitment-pipeline-v6-sweep" }).await.remove(0);
        let provided: &Document = stored.get_document("providedIp").expect("providedIp");
        let expected: Bson = crate::records::IpHalf(0xB496_D250_E5C5_8459).to_bson();
        assert_eq!(provided.get("lower"), Some(&expected));
        assert_eq!(provided.get("upper"), Some(&expected));
        central.finish().await;
    }
}

/// getUpdatedClients.integration.test.ts.
mod updated_clients {
    use super::*;
    use crate::client::{ClientDatabase, ACCOUNTS};
    use crate::clients::ClientRecord;
    use crate::operation::{DriverExecutor, Executor};
    use bson::Bson;
    use prosopo_types::client::Tier;
    use prosopo_types_database::client::ACCOUNT;

    struct Portal {
        mongo: MongoDatabase,
        clients: ClientDatabase,
    }

    impl Portal {
        async fn new(name: &str) -> Portal {
            let url: String = std::env::var("PROSOPO_TEST_MONGO_URL").expect("PROSOPO_TEST_MONGO_URL");
            let open = || {
                MongoDatabase::new(&url, Some(&format!("prosopo-test-portal-{name}")), None, None, MongoConnectionTimeouts::default())
                    .expect("a valid URL")
            };
            let mongo: MongoDatabase = open();
            mongo.connect().await.expect("connects");
            mongo.database().await.expect("open").drop().await.expect("drops");
            Portal {
                mongo,
                clients: ClientDatabase::new(open(), Arc::new(SystemSource), get_logger(LogLevel::Error, "test")),
            }
        }

        async fn account(&self, input: Document) {
            let document: Document = create(&ACCOUNT, &input, &mut SourceIds(&SystemSource)).expect("a valid account");
            let executor: DriverExecutor = DriverExecutor::new(self.mongo.database().await.expect("open"));
            executor
                .run(Operation::Insert {
                    collection: ACCOUNTS.to_string(),
                    documents: vec![document],
                })
                .await
                .expect("inserts");
        }

        async fn finish(self) {
            self.mongo.database().await.expect("open").drop().await.expect("drops");
            self.mongo.close().await;
        }
    }

    fn site(name: &str, site_key: &str, domain: &str, updated_at: i64) -> Document {
        doc! {
            "name": name,
            "siteKey": site_key,
            "secretKey": format!("secret-{name}"),
            "settings": { "domains": [domain], "powDifficulty": 4, "captchaType": "pow" },
            "createdAt": 1,
            "updatedAt": updated_at,
            "active": true,
        }
    }

    fn account(email: &str, tier: &str, status: &str, sites: Vec<Document>) -> Document {
        doc! { "signupEmail": email, "tier": tier, "users": [{ "email": email, "status": status }], "sites": sites }
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn returns_one_record_per_site_not_one_per_account() {
        let portal: Portal = Portal::new("per-site").await;
        portal
            .account(account(
                "two-sites@example.com",
                "professional",
                "active",
                vec![site("a", "siteKeyA", "a.example.com", 500), site("b", "siteKeyB", "b.example.com", 500)],
            ))
            .await;
        let records: Vec<ClientRecord> = portal.clients.get_updated_clients(100.0).await.expect("reads");
        let mut accounts: Vec<&str> = records.iter().filter_map(|record| record.account.as_deref()).collect();
        accounts.sort();
        assert_eq!(accounts, vec!["siteKeyA", "siteKeyB"]);
        assert!(records.iter().all(|record| record.tier == Tier::Professional));
        let a: &ClientRecord = records.iter().find(|record| record.account.as_deref() == Some("siteKeyA")).expect("site a");
        let domains: Vec<&str> = a.settings.as_ref().expect("settings").get_array("domains").expect("domains").iter().filter_map(Bson::as_str).collect();
        assert_eq!(domains, vec!["a.example.com"]);
        portal.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn carries_only_the_sites_newer_than_the_cutoff() {
        let portal: Portal = Portal::new("cutoff").await;
        portal
            .account(account(
                "mixed@example.com",
                "free",
                "active",
                vec![site("stale", "staleKey", "stale.example.com", 100), site("fresh", "freshKey", "fresh.example.com", 900)],
            ))
            .await;
        let records: Vec<ClientRecord> = portal.clients.get_updated_clients(500.0).await.expect("reads");
        let accounts: Vec<&str> = records.iter().filter_map(|record| record.account.as_deref()).collect();
        assert_eq!(accounts, vec!["freshKey"]);
        portal.finish().await;
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn skips_accounts_with_no_active_user() {
        let portal: Portal = Portal::new("inactive").await;
        portal
            .account(account("inactive@example.com", "free", "pending", vec![site("x", "inactiveKey", "x.example.com", 900)]))
            .await;
        assert_eq!(portal.clients.get_updated_clients(100.0).await.expect("reads"), Vec::new());
        portal.finish().await;
    }

}

mod central_indexes {
    use super::*;
    use crate::captcha::{CaptchaDatabase, StoredKind};
    use std::collections::BTreeSet;

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn ensure_indexes_leaves_each_central_collection_with_its_declared_indexes() {
        let url: String = std::env::var("PROSOPO_TEST_MONGO_URL").expect("PROSOPO_TEST_MONGO_URL");
        let open = || MongoDatabase::new(&url, Some("prosopo-test-central-indexes"), None, None, MongoConnectionTimeouts::default()).expect("a valid URL");
        let mongo: MongoDatabase = open();
        mongo.connect().await.expect("connects");
        mongo.database().await.expect("open").drop().await.expect("drops");
        let central: CaptchaDatabase = CaptchaDatabase::new(open(), Arc::new(SystemSource), get_logger(LogLevel::Error, "test"));
        central.connect().await.expect("connects");
        central.ensure_indexes().await;
        for kind in StoredKind::ALL {
            let names: BTreeSet<String> = mongo
                .database()
                .await
                .expect("open")
                .collection::<Document>(kind.collection())
                .list_index_names()
                .await
                .expect("lists")
                .into_iter()
                .collect();
            let mut declared: BTreeSet<String> = kind.schema().indexes().iter().map(|index| index.name()).collect();
            declared.insert("_id_".to_string());
            assert_eq!(names, declared, "{}", kind.collection());
        }
        central.close().await;
        mongo.database().await.expect("open").drop().await.expect("drops");
        mongo.close().await;
    }
}
