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

//! The cases of src/tests/mongooseOptions.unit.test.ts and src/tests/unit/base/mongo.unit.test.ts,
//! one for one, then the Rust-only ones.

use crate::mongo::{mask_credentials, MongoConnectionTimeouts, MongoDatabase};
use crate::options::{
    get_mongo_compressors, get_mongo_connection_options, ConnectionArgs, MongoCompressor,
    DEFAULT_CONNECT_TIMEOUT_MS, DEFAULT_SERVER_SELECTION_TIMEOUT_MS,
};

const EXPLICIT: [MongoCompressor; 4] =
    [MongoCompressor::Zstd, MongoCompressor::Snappy, MongoCompressor::Zlib, MongoCompressor::None];

mod get_mongo_compressors_tests {
    use super::*;

    #[test]
    fn returns_the_default_empty_compressors_for_remote_domains() {
        for url in [
            "mongodb://user:pass@example.com:27017/db",
            "mongodb://abc.com/db",
            "mongodb://x.y.com:27017/db",
            "mongodb://cluster.mongodb.net/db",
            "mongodb://subdomain.example.com/db",
        ] {
            assert!(get_mongo_compressors(url, &[]).is_empty(), "{url}");
        }
    }

    #[test]
    fn returns_the_explicit_compressor_list_for_remote_domains_when_provided() {
        for url in ["mongodb://user:pass@example.com:27017/db", "mongodb://abc.com/db", "mongodb://cluster.mongodb.net/db"] {
            assert_eq!(get_mongo_compressors(url, &EXPLICIT), EXPLICIT, "{url}");
        }
    }

    #[test]
    fn returns_empty_array_for_local_hostnames_without_dots() {
        for url in ["mongodb://database:27017/db", "mongodb://db/db", "mongodb://mongo:27017/db", "mongodb://container-name/db"] {
            assert!(get_mongo_compressors(url, &EXPLICIT).is_empty(), "{url}");
        }
    }

    #[test]
    fn returns_empty_array_for_localhost_variants() {
        for url in ["mongodb://localhost:27017/db", "mongodb://127.0.0.1:27017/db", "mongodb://[::1]:27017/db"] {
            assert!(get_mongo_compressors(url, &EXPLICIT).is_empty(), "{url}");
        }
    }

    #[test]
    fn returns_the_explicit_list_for_ip_addresses_treated_as_remote() {
        for url in ["mongodb://192.168.1.1:27017/db", "mongodb://10.0.0.1/db", "mongodb://172.16.0.1:27017/db"] {
            assert_eq!(get_mongo_compressors(url, &EXPLICIT), EXPLICIT, "{url}");
        }
    }

    #[test]
    fn returns_the_explicit_list_for_ipv6_addresses_treated_as_remote() {
        for url in [
            "mongodb://[2001:0db8::1]:27017/db",
            "mongodb://[2001:0db8:85a3::8a2e:0370:7334]/db",
            "mongodb://[::ffff:192.168.1.1]:27017/db",
        ] {
            assert_eq!(get_mongo_compressors(url, &EXPLICIT), EXPLICIT, "{url}");
        }
    }

    #[test]
    fn uses_custom_compressors_when_provided() {
        let custom: [MongoCompressor; 2] = [MongoCompressor::Zstd, MongoCompressor::Snappy];
        assert_eq!(get_mongo_compressors("mongodb://example.com:27017/db", &custom), custom);
    }

    #[test]
    fn returns_empty_array_for_local_connections_even_with_custom_compressors() {
        let custom: [MongoCompressor; 2] = [MongoCompressor::Zstd, MongoCompressor::Snappy];
        assert!(get_mongo_compressors("mongodb://localhost:27017/db", &custom).is_empty());
    }

    #[test]
    fn handles_mongodb_srv_urls() {
        assert_eq!(get_mongo_compressors("mongodb+srv://cluster.mongodb.net/db", &EXPLICIT), EXPLICIT);
    }

    #[test]
    fn returns_the_provided_list_when_the_host_cannot_be_parsed() {
        for url in ["mongodb://::1:27017/db", "mongodb://[bad"] {
            assert_eq!(get_mongo_compressors(url, &EXPLICIT), EXPLICIT, "{url}");
        }
    }

    #[test]
    fn returns_empty_array_for_hostless_urls_and_bare_single_label_hosts() {
        for url in ["", "mongodb://", "not-a-url"] {
            assert!(get_mongo_compressors(url, &EXPLICIT).is_empty(), "{url:?}");
        }
    }

    #[test]
    fn handles_urls_with_authentication() {
        assert_eq!(get_mongo_compressors("mongodb://user:password@example.com:27017/db", &EXPLICIT), EXPLICIT);
    }

    #[test]
    fn handles_urls_with_query_parameters() {
        let url: &str = "mongodb://example.com:27017/db?authSource=admin&retryWrites=true";
        assert_eq!(get_mongo_compressors(url, &EXPLICIT), EXPLICIT);
    }
}

mod get_mongo_connection_options_tests {
    use super::*;

    fn args(url: &str) -> ConnectionArgs {
        ConnectionArgs {
            url: url.to_string(),
            app_name: "test-app".to_string(),
            ..ConnectionArgs::default()
        }
    }

    #[test]
    fn throws_on_an_empty_or_whitespace_only_url() {
        for url in ["", "   "] {
            let error = get_mongo_connection_options(&args(url)).expect_err("refused");
            assert!(error.to_string().contains("cannot be empty"), "{url:?}");
        }
    }

    #[test]
    fn applies_sensible_defaults() {
        let options = get_mongo_connection_options(&args("mongodb://example.com:27017/db")).expect("options");
        assert_eq!(options.app_name, "test-app");
        assert_eq!(options.max_pool_size, 10);
        assert_eq!(options.min_pool_size, 0);
        let mut driver = mongodb::options::ClientOptions::default();
        options.apply(&mut driver);
        let api = driver.server_api.expect("a server API");
        assert_eq!(api.version, mongodb::options::ServerApiVersion::V1);
        assert_eq!(api.strict, Some(false));
        assert_eq!(api.deprecation_errors, Some(false));
    }

    #[test]
    fn uses_no_compressors_for_localhost() {
        let options = get_mongo_connection_options(&args("mongodb://localhost:27017/db")).expect("options");
        assert!(options.compressors.is_empty());
    }

    #[test]
    fn uses_no_compressors_for_a_remote_host_default_is_no_compression() {
        let options = get_mongo_connection_options(&args("mongodb://cluster.mongodb.net/db")).expect("options");
        assert!(options.compressors.is_empty());
    }

    #[test]
    fn applies_pool_size_overrides() {
        let options = get_mongo_connection_options(&ConnectionArgs {
            max_pool_size: Some(50),
            min_pool_size: Some(5),
            ..args("mongodb://example.com:27017/db")
        })
        .expect("options");
        assert_eq!(options.max_pool_size, 50);
        assert_eq!(options.min_pool_size, 5);
    }

    #[test]
    fn defaults_the_connect_and_server_selection_timeouts() {
        let options = get_mongo_connection_options(&args("mongodb://example.com:27017/db")).expect("options");
        assert_eq!(options.connect_timeout_ms, DEFAULT_CONNECT_TIMEOUT_MS);
        assert_eq!(options.server_selection_timeout_ms, DEFAULT_SERVER_SELECTION_TIMEOUT_MS);
    }

    #[test]
    fn applies_connect_and_server_selection_timeout_overrides() {
        let options = get_mongo_connection_options(&ConnectionArgs {
            connect_timeout_ms: Some(45_000),
            server_selection_timeout_ms: Some(45_000),
            ..args("mongodb://example.com:27017/db")
        })
        .expect("options");
        assert_eq!(options.connect_timeout_ms, 45_000);
        assert_eq!(options.server_selection_timeout_ms, 45_000);
    }

    #[test]
    fn only_sets_db_name_when_provided() {
        let with_name = get_mongo_connection_options(&ConnectionArgs {
            db_name: Some("mydb".to_string()),
            ..args("mongodb://example.com:27017/db")
        })
        .expect("options");
        assert_eq!(with_name.db_name.as_deref(), Some("mydb"));
        let without = get_mongo_connection_options(&args("mongodb://example.com:27017/db")).expect("options");
        assert_eq!(without.db_name, None);
    }
}

mod mongo_database_connect {
    use super::*;

    /// No mongod listens on port 1, and a 300 ms server selection timeout keeps the test short.
    fn unreachable() -> MongoDatabase {
        MongoDatabase::new(
            "mongodb://user:pass@127.0.0.1:1/db",
            Some("db"),
            None,
            None,
            MongoConnectionTimeouts {
                connect_timeout_ms: Some(300),
                server_selection_timeout_ms: Some(300),
            },
        )
        .expect("a valid URL")
    }

    #[tokio::test]
    async fn destroys_a_connection_that_failed_to_open() {
        let db: MongoDatabase = unreachable();
        assert!(db.connect().await.is_err());
        assert!(!db.connected());
        assert!(db.database().await.is_err(), "no connection is kept");
    }

    /// Needs a mongod at PROSOPO_TEST_MONGO_URL.
    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn does_not_destroy_a_connection_that_already_opened() {
        let url: String = std::env::var("PROSOPO_TEST_MONGO_URL").expect("PROSOPO_TEST_MONGO_URL");
        let db: MongoDatabase =
            MongoDatabase::new(&url, Some("prosopo-test-connect"), None, None, MongoConnectionTimeouts::default())
                .expect("a valid URL");
        db.connect().await.expect("connects");
        assert!(db.connected());
        let database = db.database().await.expect("open");
        let missing = database.run_command(bson::doc! { "noSuchCommand": 1 }).await;
        assert!(missing.is_err(), "a failing command");
        assert!(db.connected(), "an error after opening does not tear the connection down");
        db.database().await.expect("still open").run_command(bson::doc! { "ping": 1 }).await.expect("still usable");
        db.close().await;
        assert!(!db.connected());
    }
}

mod rust_only {
    use super::*;

    #[test]
    fn masks_the_whole_password_and_leaves_a_url_without_credentials_alone() {
        assert_eq!(
            mask_credentials("mongodb://admin:S3cr3t-Pass+x@db.example:27017/prosopo"),
            "mongodb://%3CCredentials%3E@db.example:27017/prosopo"
        );
        assert_eq!(mask_credentials("mongodb://127.0.0.1:27017/prosopo"), "mongodb://127.0.0.1:27017/prosopo");
        assert_eq!(
            mask_credentials("mongodb+srv://svc:a.b.c@cluster0.example.net/prosopo"),
            "mongodb+srv://%3CCredentials%3E@cluster0.example.net/prosopo"
        );
    }

    #[test]
    fn rejects_an_endpoint_url_cannot_parse() {
        for url in ["   ", "not-a-url", "mongodb://h1:1,h2:2/db", "mongodb://[bad"] {
            assert!(MongoDatabase::new(url, None, None, None, MongoConnectionTimeouts::default()).is_err(), "{url}");
        }
    }
}

mod commitment_input_methods {
    use bson::{doc, Bson, Document};
    use prosopo_types_database::document::{build, Issue};
    use prosopo_types_database::provider::USER_COMMITMENT_RECORD;
    use prosopo_types_database::schema::FreshIds;

    fn input_method_issues(input: Document) -> (Document, Vec<Issue>) {
        let (document, issues): (Document, Vec<Issue>) = build(&USER_COMMITMENT_RECORD, &input, &mut FreshIds);
        (document, issues.into_iter().filter(|issue| issue.path.starts_with("inputMethods")).collect())
    }

    #[test]
    fn stores_input_methods_in_the_shape_of_the_coordinates() {
        let (document, issues) = input_method_issues(doc! { "inputMethods": [["keyboard"], ["pointer"]] });
        assert_eq!(issues, Vec::new());
        assert_eq!(document.get("inputMethods"), Some(&Bson::from(vec![vec!["keyboard"], vec!["pointer"]])));
    }

    #[test]
    fn refuses_to_store_an_unknown_input_method() {
        let (_, issues) = input_method_issues(doc! { "inputMethods": [["voice"]] });
        assert!(!issues.is_empty());
    }

    #[test]
    fn leaves_input_methods_out_of_a_commitment_that_has_none() {
        let (document, _) = input_method_issues(Document::new());
        assert!(!document.contains_key("inputMethods"));
    }
}

mod captcha_label {
    use prosopo_types::stored::CaptchaLabel;
    use prosopo_types_database::provider::{POW_CAPTCHA_RECORD, USER_COMMITMENT_RECORD};
    use prosopo_types_database::schema::{Kind, Path, Schema};

    fn path<'a>(schema: &'a Schema, name: &str) -> &'a Path {
        schema.path(name).unwrap_or_else(|| panic!("{name} is declared"))
    }

    #[test]
    fn accepts_every_label_and_refuses_an_unknown_one() {
        for label in CaptchaLabel::ALL {
            assert_eq!(label.as_str().parse::<CaptchaLabel>().ok(), Some(label));
        }
        assert!("definitely-not-a-label".parse::<CaptchaLabel>().is_err());
    }

    #[test]
    fn record_schemas_declare_the_label_paths_with_their_types() {
        for schema in [&*POW_CAPTCHA_RECORD, &*USER_COMMITMENT_RECORD] {
            for (name, kind) in [("label", Kind::String), ("labelReason", Kind::String), ("labelledBy", Kind::String), ("labelledAt", Kind::Date)] {
                let declared: &Path = path(schema, name);
                assert!(std::mem::discriminant(&declared.kind) == std::mem::discriminant(&kind), "{name}");
                assert!(!declared.required, "{name} is optional");
            }
        }
    }

    #[test]
    fn the_label_path_is_constrained_to_the_labels() {
        for schema in [&*POW_CAPTCHA_RECORD, &*USER_COMMITMENT_RECORD] {
            let values: &[String] = path(schema, "label").enum_values.as_deref().expect("an enum");
            for label in CaptchaLabel::ALL {
                assert!(values.iter().any(|value| value == label.as_str()), "{}", label.as_str());
            }
        }
    }
}

/// centralDbStreamer.unit.test.ts, against a central database that answers every write.
mod central_db_streamer {
    use crate::captcha::{CaptchaDatabase, StoredKind};
    use crate::mongo::MongoError;
    use crate::operation::{Executor, Operation, Reply, ReplyFuture};
    use crate::source::SystemSource;
    use crate::streamer::{CentralDbStreamer, FetchRecord, MarkStored};
    use bson::{doc, DateTime, Document};
    use prosopo_common::{ErrorClass, ErrorOptions, ErrorSource, ProsopoError};
    use prosopo_logger::{get_logger_with_runtime, ConsoleMethod, DirectiveStore, LogLevel, LogRuntime, Sink, SystemClock};
    use std::sync::{Arc, Mutex};

    #[derive(Default)]
    struct Lines(Mutex<Vec<(ConsoleMethod, String)>>);

    impl Sink for Lines {
        fn write(&self, method: ConsoleMethod, line: &str) {
            self.0.lock().expect("lock").push((method, line.to_string()));
        }
    }

    impl Lines {
        fn errors(&self) -> usize {
            self.0.lock().expect("lock").iter().filter(|(method, _)| *method == ConsoleMethod::Error).count()
        }
    }

    /// The central database: keeps each command, and fails the writes it is told to.
    #[derive(Default)]
    struct Central {
        sent: Mutex<Vec<Document>>,
        fail_writes: Mutex<bool>,
    }

    impl Executor for Central {
        fn run(&self, operation: Operation) -> ReplyFuture<'_> {
            let command: Document = operation.command();
            self.sent.lock().expect("lock").push(command.clone());
            let fail: bool = command.contains_key("update") && *self.fail_writes.lock().expect("lock");
            Box::pin(async move {
                if fail {
                    Err(MongoError::Unavailable("write failed".to_string()))
                } else {
                    Ok(Reply::Update { matched: 0, modified: 0, upserted: 1 })
                }
            })
        }
    }

    impl Central {
        fn updates(&self) -> Vec<Document> {
            self.sent
                .lock()
                .expect("lock")
                .iter()
                .filter(|command| command.contains_key("update"))
                .map(|command| command.get_array("updates").expect("updates")[0].as_document().expect("a statement").clone())
                .collect()
        }

        fn index_commands(&self) -> usize {
            self.sent.lock().expect("lock").iter().filter(|command| command.contains_key("createIndexes")).count()
        }
    }

    struct Fixture {
        streamer: Arc<CentralDbStreamer>,
        central: Arc<Central>,
        lines: Arc<Lines>,
        marked: Arc<Mutex<Vec<DateTime>>>,
    }

    fn fixture() -> Fixture {
        let central: Arc<Central> = Arc::new(Central::default());
        let lines: Arc<Lines> = Arc::new(Lines::default());
        let runtime = || LogRuntime {
            sink: lines.clone(),
            clock: Arc::new(SystemClock),
            directives: Arc::new(DirectiveStore::new("")),
        };
        let database: CaptchaDatabase =
            CaptchaDatabase::with_executor(central.clone(), Arc::new(SystemSource), get_logger_with_runtime(LogLevel::Info, "central", runtime()));
        Fixture {
            streamer: Arc::new(CentralDbStreamer::new(database, get_logger_with_runtime(LogLevel::Info, "streamer", runtime()))),
            central,
            lines,
            marked: Arc::new(Mutex::new(Vec::new())),
        }
    }

    impl Fixture {
        fn mark_stored(&self) -> MarkStored {
            let marked: Arc<Mutex<Vec<DateTime>>> = self.marked.clone();
            Box::new(move |at: DateTime| {
                Box::pin(async move {
                    marked.lock().expect("lock").push(at);
                    Ok(())
                })
            })
        }

        fn marked(&self) -> Vec<DateTime> {
            self.marked.lock().expect("lock").clone()
        }
    }

    fn at(rfc3339: &str) -> DateTime {
        DateTime::parse_rfc3339_str(rfc3339).expect("a date")
    }

    fn challenge_record(challenge: &str) -> Document {
        doc! {
            "challenge": challenge,
            "userAccount": "user1",
            "dappAccount": "dapp1",
            "requestedAtTimestamp": at("2026-01-01T00:00:00Z"),
            "lastUpdatedTimestamp": at("2026-01-01T01:00:00Z"),
            "result": { "status": "Pending" },
        }
    }

    fn fetched(record: Option<Document>) -> FetchRecord {
        Box::pin(async move { Ok(record) })
    }

    fn fetch_failing() -> FetchRecord {
        Box::pin(async move {
            Err(ProsopoError::new(
                ErrorClass::Db,
                ErrorSource::message("fetch failed"),
                ErrorOptions {
                    silent: true,
                    ..ErrorOptions::default()
                },
            ))
        })
    }

    /// The stream's write: upserting the record by its key, with the record as the `$set`.
    fn assert_upserted(update: &Document, key: &str, value: &str) {
        assert_eq!(update.get_document("q").expect("q").get_str(key).ok(), Some(value));
        assert_eq!(update.get_bool("upsert").ok(), Some(true));
        assert_eq!(update.get_document("u").expect("u").get_document("$set").expect("$set").get_str(key).ok(), Some(value));
    }

    async fn streams_a_record_by_its_key_and_marks_it_stored_at_its_own_time(kind: StoredKind) {
        let fixture: Fixture = fixture();
        fixture.streamer.stream_record(kind, challenge_record("123___user___dapp___1"), Some(fixture.mark_stored()));
        fixture.streamer.idle().await;
        let updates: Vec<Document> = fixture.central.updates();
        assert_eq!(updates.len(), 1);
        assert_upserted(&updates[0], "challenge", "123___user___dapp___1");
        assert_eq!(fixture.marked(), vec![at("2026-01-01T01:00:00Z")]);
    }

    #[tokio::test]
    async fn upserts_a_pow_record_and_marks_it_stored_at_the_record_time() {
        streams_a_record_by_its_key_and_marks_it_stored_at_its_own_time(StoredKind::Pow).await;
    }

    #[tokio::test]
    async fn upserts_a_puzzle_record_and_marks_it_stored_at_the_record_time() {
        streams_a_record_by_its_key_and_marks_it_stored_at_its_own_time(StoredKind::Puzzle).await;
    }

    async fn strips_the_id(kind: StoredKind) {
        let fixture: Fixture = fixture();
        let mut record: Document = challenge_record("c");
        record.insert("_id", "should-be-removed");
        fixture.streamer.stream_record(kind, record, None);
        fixture.streamer.idle().await;
        let update: Document = fixture.central.updates().remove(0);
        assert!(!update.get_document("u").expect("u").get_document("$set").expect("$set").contains_key("_id"));
    }

    #[tokio::test]
    async fn strips_the_id_of_a_pow_record_before_upserting() {
        strips_the_id(StoredKind::Pow).await;
    }

    #[tokio::test]
    async fn strips_the_id_of_a_puzzle_record_before_upserting() {
        strips_the_id(StoredKind::Puzzle).await;
    }

    async fn logs_a_failed_write_and_does_not_mark(kind: StoredKind) {
        let fixture: Fixture = fixture();
        *fixture.central.fail_writes.lock().expect("lock") = true;
        fixture.streamer.stream_record(kind, challenge_record("c"), Some(fixture.mark_stored()));
        fixture.streamer.idle().await;
        assert_eq!(fixture.marked(), Vec::<DateTime>::new());
        assert!(fixture.lines.errors() > 0);
    }

    #[tokio::test]
    async fn a_failed_pow_write_is_logged_not_thrown() {
        logs_a_failed_write_and_does_not_mark(StoredKind::Pow).await;
    }

    #[tokio::test]
    async fn a_failed_puzzle_write_is_logged_not_thrown() {
        logs_a_failed_write_and_does_not_mark(StoredKind::Puzzle).await;
    }

    #[tokio::test]
    async fn streams_without_a_mark_stored_callback() {
        let fixture: Fixture = fixture();
        fixture.streamer.stream_record(StoredKind::Pow, challenge_record("c"), None);
        fixture.streamer.idle().await;
        assert_eq!(fixture.central.updates().len(), 1);
    }

    async fn falls_back_to_the_request_time(kind: StoredKind) {
        let fixture: Fixture = fixture();
        let mut record: Document = challenge_record("c");
        record.remove("lastUpdatedTimestamp");
        record.insert("requestedAtTimestamp", at("2026-02-01T00:00:00Z"));
        fixture.streamer.stream_record(kind, record, Some(fixture.mark_stored()));
        fixture.streamer.idle().await;
        assert_eq!(fixture.marked(), vec![at("2026-02-01T00:00:00Z")]);
    }

    #[tokio::test]
    async fn a_pow_record_without_a_last_update_is_marked_at_its_request_time() {
        falls_back_to_the_request_time(StoredKind::Pow).await;
    }

    #[tokio::test]
    async fn a_puzzle_record_without_a_last_update_is_marked_at_its_request_time() {
        falls_back_to_the_request_time(StoredKind::Puzzle).await;
    }

    async fn fetches_then_streams(kind: StoredKind) {
        let fixture: Fixture = fixture();
        let record: Document = doc! { "challenge": "test-challenge", "lastUpdatedTimestamp": at("2026-03-01T00:00:00Z") };
        fixture.streamer.stream_update(kind, fetched(Some(record)), Some(fixture.mark_stored()));
        fixture.streamer.idle().await;
        assert_upserted(&fixture.central.updates()[0], "challenge", "test-challenge");
        assert_eq!(fixture.marked(), vec![at("2026-03-01T00:00:00Z")]);
    }

    #[tokio::test]
    async fn a_pow_update_fetches_the_full_record_then_streams_it() {
        fetches_then_streams(StoredKind::Pow).await;
    }

    #[tokio::test]
    async fn a_puzzle_update_fetches_the_full_record_then_streams_it() {
        fetches_then_streams(StoredKind::Puzzle).await;
    }

    async fn sends_nothing_for_a_missing_record(kind: StoredKind) {
        let fixture: Fixture = fixture();
        fixture.streamer.stream_update(kind, fetched(None), None);
        fixture.streamer.idle().await;
        assert_eq!(fixture.central.updates().len(), 0);
    }

    #[tokio::test]
    async fn a_pow_update_sends_nothing_when_the_record_is_gone() {
        sends_nothing_for_a_missing_record(StoredKind::Pow).await;
    }

    #[tokio::test]
    async fn a_puzzle_update_sends_nothing_when_the_record_is_gone() {
        sends_nothing_for_a_missing_record(StoredKind::Puzzle).await;
    }

    async fn logs_a_failed_fetch(kind: StoredKind) {
        let fixture: Fixture = fixture();
        fixture.streamer.stream_update(kind, fetch_failing(), None);
        fixture.streamer.idle().await;
        assert!(fixture.lines.errors() > 0);
        assert_eq!(fixture.central.updates().len(), 0);
    }

    #[tokio::test]
    async fn a_pow_update_logs_a_failed_fetch() {
        logs_a_failed_fetch(StoredKind::Pow).await;
    }

    #[tokio::test]
    async fn a_puzzle_update_logs_a_failed_fetch() {
        logs_a_failed_fetch(StoredKind::Puzzle).await;
    }

    #[tokio::test]
    async fn upserts_an_image_record_by_its_id() {
        let fixture: Fixture = fixture();
        let record: Document = doc! { "id": "commitment-123", "lastUpdatedTimestamp": at("2026-01-15T00:00:00Z") };
        fixture.streamer.stream_record(StoredKind::Commitment, record.clone(), Some(fixture.mark_stored()));
        fixture.streamer.stream_update(StoredKind::Commitment, fetched(Some(record)), Some(fixture.mark_stored()));
        fixture.streamer.idle().await;
        for update in fixture.central.updates() {
            assert_upserted(&update, "id", "commitment-123");
        }
        assert_eq!(fixture.marked(), vec![at("2026-01-15T00:00:00Z"); 2]);
    }

    #[tokio::test]
    async fn upserts_a_session_by_its_id_marked_at_its_creation() {
        let fixture: Fixture = fixture();
        let record: Document = doc! { "sessionId": "session-abc", "createdAt": at("2026-01-20T00:00:00Z"), "score": 0.8, "threshold": 0.5 };
        fixture.streamer.stream_record(StoredKind::Session, record, Some(fixture.mark_stored()));
        fixture.streamer.idle().await;
        assert_upserted(&fixture.central.updates()[0], "sessionId", "session-abc");
        assert_eq!(fixture.marked(), vec![at("2026-01-20T00:00:00Z")]);
    }

    #[tokio::test]
    async fn connects_once_for_several_records() {
        let fixture: Fixture = fixture();
        fixture.streamer.stream_record(StoredKind::Pow, challenge_record("c1"), None);
        fixture.streamer.stream_record(StoredKind::Pow, challenge_record("c1"), None);
        fixture.streamer.idle().await;
        let indexes: usize = StoredKind::ALL.iter().map(|kind| kind.schema().indexes().len()).sum();
        assert_eq!(fixture.central.index_commands(), indexes, "one connection's index creation");
        assert_eq!(fixture.central.updates().len(), 2);
    }
}
