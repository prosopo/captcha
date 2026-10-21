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
