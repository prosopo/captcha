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
    mongo: MongoDatabase,
    db: Arc<ProviderDatabase>,
}

impl Live {
    async fn new(name: &str) -> Live {
        let url: String = std::env::var("PROSOPO_TEST_MONGO_URL").expect("PROSOPO_TEST_MONGO_URL");
        let mongo: MongoDatabase = MongoDatabase::new(&url, Some(&format!("prosopo-test-{name}")), None, None, MongoConnectionTimeouts::default())
            .expect("a valid URL");
        mongo.connect().await.expect("connects");
        mongo.database().await.expect("open").drop().await.expect("drops");
        let db: ProviderDatabase =
            ProviderDatabase::connect(&mongo, Arc::new(SystemSource), get_logger(LogLevel::Error, "test")).await.expect("connects");
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

    fn record(id: &str) -> UserCommitment {
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
