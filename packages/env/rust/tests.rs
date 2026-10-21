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

//! env.accessors, env.maintenance and provider unit tests of the TS. The TS mocks the database
//! module; here the database is a real `ProviderDatabase` on an executor that answers as the
//! case needs, or on a connection that cannot open.

use crate::{is_maintenance_mode, DatabaseBuilder, DatabaseSettings, Environment, ProviderEnvironment};
use bson::{doc, Document};
use prosopo_common::ProsopoError;
use prosopo_database::mongo::{MongoConnectionTimeouts, MongoDatabase, MongoError};
use prosopo_database::operation::{Executor, Operation, Reply, ReplyFuture};
use prosopo_database::provider::{ProviderDatabase, RedisSettings};
use prosopo_database::source::SystemSource;
use prosopo_ipinfo::{BackendError, IpInfoBackends, IpInfoService, LocalBackend};
use prosopo_keyring::{get_pair, KeyringPair, Secret};
use prosopo_logger::{get_logger, get_logger_with_runtime, ConsoleMethod, DirectiveStore, LogLevel, LogRuntime, Logger, Sink, SystemClock};
use prosopo_types::config::{prosopo_config_schema, ProsopoConfig};
use prosopo_types::ipapi::IpInfoResponse;
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use tokio::sync::{Mutex as AsyncMutex, MutexGuard};

/// `MAINTENANCE_MODE` is process-wide and the tests run in parallel: every test that reads or
/// sets it holds this.
static ENVIRONMENT_VARIABLES: AsyncMutex<()> = AsyncMutex::const_new(());

async fn maintenance_mode(on: bool) -> MutexGuard<'static, ()> {
    let guard: MutexGuard<'static, ()> = ENVIRONMENT_VARIABLES.lock().await;
    if on {
        std::env::set_var("MAINTENANCE_MODE", "true");
    } else {
        std::env::remove_var("MAINTENANCE_MODE");
    }
    guard
}

fn config(overrides: Value) -> ProsopoConfig {
    let mut input: Value = json!({
        "defaultEnvironment": "development",
        "logLevel": "info",
        "account": { "secret": "//Alice" },
        "authAccount": { "secret": "//Bob" },
        "database": {
            "development": { "type": "mongo", "endpoint": "mongodb://127.0.0.1:27017", "dbname": "test", "authSource": "admin" },
        },
        "redisConnection": { "url": "redis://localhost", "password": "" },
        "host": "http://localhost:9229",
    });
    for (key, value) in overrides.as_object().expect("overrides").clone() {
        match value {
            Value::Null => {
                input.as_object_mut().expect("an object").remove(&key);
            }
            value => input[key] = value,
        }
    }
    let parsed: Value = prosopo_config_schema().validate(Some(&input)).expect("a valid config");
    serde_json::from_value(parsed).expect("a config")
}

fn alice() -> KeyringPair {
    get_pair(Some(Secret::Text("//Alice")), None, None, None).expect("a pair")
}

#[derive(Default)]
struct Lines(Mutex<Vec<ConsoleMethod>>);

impl Sink for Lines {
    fn write(&self, method: ConsoleMethod, _line: &str) {
        self.0.lock().expect("lock").push(method);
    }
}

impl Lines {
    fn count(&self, wanted: ConsoleMethod) -> usize {
        self.0.lock().expect("lock").iter().filter(|method| **method == wanted).count()
    }
}

fn capturing(lines: &Arc<Lines>) -> Logger {
    get_logger_with_runtime(
        LogLevel::Debug,
        "test",
        LogRuntime {
            sink: lines.clone(),
            clock: Arc::new(SystemClock),
            directives: Arc::new(DirectiveStore::new("")),
        },
    )
}

/// A database that answers the dataset lookup with `datasets`, fails what it is told to, and
/// keeps every command.
#[derive(Default)]
struct Database {
    datasets: Mutex<Vec<Document>>,
    failing: Mutex<Vec<&'static str>>,
    sent: Mutex<Vec<Document>>,
}

impl Database {
    fn with_dataset(dataset_id: &str) -> Arc<Database> {
        let database: Database = Database::default();
        database.datasets.lock().expect("lock").push(doc! { "datasetId": dataset_id });
        Arc::new(database)
    }

    fn sent(&self, command: &str) -> usize {
        self.sent.lock().expect("lock").iter().filter(|sent| sent.contains_key(command)).count()
    }

    fn provider(self: &Arc<Self>) -> ProviderDatabase {
        ProviderDatabase::new(self.clone(), Arc::new(SystemSource), get_logger(LogLevel::Error, "test"))
    }
}

impl Executor for Database {
    fn run(&self, operation: Operation) -> ReplyFuture<'_> {
        let command: Document = operation.command();
        self.sent.lock().expect("lock").push(command.clone());
        let failing: bool = self.failing.lock().expect("lock").iter().any(|name| command.contains_key(*name));
        let datasets: Vec<Document> = self.datasets.lock().expect("lock").clone();
        Box::pin(async move {
            if failing {
                return Err(MongoError::Unavailable("mongo down".to_string()));
            }
            Ok(match operation {
                Operation::Find { .. } => Reply::Documents(datasets),
                Operation::Delete { .. } => Reply::Delete { deleted: 0 },
                _ => Reply::Value(None),
            })
        })
    }
}

/// A builder that hands out databases on `database`, counting them and keeping their settings.
fn builder(database: Arc<Database>, built: Arc<Mutex<Vec<DatabaseSettings>>>) -> DatabaseBuilder {
    Box::new(move |settings: &DatabaseSettings, _logger: &Logger| {
        built.lock().expect("lock").push(settings.clone());
        Ok(database.provider())
    })
}

/// A database on a connection that cannot open, and gives up quickly.
fn unreachable(_settings: &DatabaseSettings, logger: &Logger) -> Result<ProviderDatabase, ProsopoError> {
    let mongo: MongoDatabase = MongoDatabase::new(
        "mongodb://127.0.0.1:1",
        Some("test"),
        None,
        None,
        MongoConnectionTimeouts {
            connect_timeout_ms: Some(200),
            server_selection_timeout_ms: Some(200),
        },
    )
    .expect("a valid URL");
    Ok(ProviderDatabase::with_mongo(Arc::new(mongo), None, Arc::new(SystemSource), logger.clone()))
}

struct Fixture {
    env: Environment,
    database: Arc<Database>,
    built: Arc<Mutex<Vec<DatabaseSettings>>>,
    lines: Arc<Lines>,
}

fn fixture(config: ProsopoConfig) -> Fixture {
    let database: Arc<Database> = Database::with_dataset("0xdataset");
    let built: Arc<Mutex<Vec<DatabaseSettings>>> = Arc::new(Mutex::new(Vec::new()));
    let lines: Arc<Lines> = Arc::new(Lines::default());
    let mut env: Environment = Environment::new(config, Some(alice()), None).expect("an environment");
    env.logger = capturing(&lines);
    env.database_builder = builder(database.clone(), built.clone());
    Fixture { env, database, built, lines }
}

fn default_fixture() -> Fixture {
    fixture(config(json!({})))
}

fn key(error: &ProsopoError) -> Option<&str> {
    error.translation_key()
}

mod construction {
    use super::*;

    #[test]
    fn derives_the_pair_from_the_config_secret_when_none_is_supplied() {
        let env: Environment = Environment::new(config(json!({})), None, None).expect("an environment");
        assert_eq!(env.get_pair().expect("a pair").address().ok(), alice().address().ok());
    }

    #[test]
    fn registers_the_supplied_pair_with_the_keyring() {
        let env: Environment = default_fixture().env;
        let registered: Vec<String> = env.keyring.pairs().iter().filter_map(|pair| pair.address().ok()).collect();
        assert_eq!(registered, vec![alice().address().expect("an address")]);
    }

    #[test]
    fn assigns_a_32_character_env_id() {
        assert_eq!(default_fixture().env.env_id.len(), 32);
    }
}

mod accessors {
    use super::*;

    #[test]
    fn get_db_fails_before_the_database_is_set_up() {
        assert!(default_fixture().env.get_db().is_err());
    }

    #[test]
    fn get_db_returns_the_database_once_it_is_set() {
        let mut fixture: Fixture = default_fixture();
        let db: Arc<ProviderDatabase> = Arc::new(fixture.database.provider());
        fixture.env.db = Some(db.clone());
        assert!(Arc::ptr_eq(&fixture.env.get_db().expect("set"), &db));
    }

    #[test]
    fn get_pair_fails_when_there_is_no_pair() {
        let mut env: Environment = default_fixture().env;
        env.pair = None;
        assert!(env.get_pair().is_err());
    }

    #[test]
    fn get_signer_fails_when_there_is_no_pair() {
        let mut env: Environment = default_fixture().env;
        env.pair = None;
        assert_eq!(env.get_signer().err().as_ref().and_then(key), Some("CONTRACT.SIGNER_UNDEFINED"));
    }

    #[test]
    fn get_signer_returns_the_registered_pair() {
        let mut env: Environment = default_fixture().env;
        assert_eq!(env.get_signer().expect("a signer").address().ok(), alice().address().ok());
    }
}

mod build_database {
    use super::*;

    #[test]
    fn builds_nothing_when_no_database_is_configured_at_all() {
        let fixture: Fixture = fixture(config(json!({ "database": null })));
        assert!(fixture.env.build_database().expect("builds").is_none());
        assert!(fixture.built.lock().expect("lock").is_empty());
    }

    #[test]
    fn builds_nothing_when_the_current_environment_has_no_database() {
        let fixture: Fixture = fixture(config(json!({
            "database": { "staging": { "type": "mongo", "endpoint": "mongodb://h", "dbname": "d", "authSource": "admin" } },
        })));
        assert!(fixture.env.build_database().expect("builds").is_none());
    }

    #[test]
    fn passes_the_mongo_and_redis_config_through_to_the_database() {
        let fixture: Fixture = default_fixture();
        fixture.env.build_database().expect("builds");
        assert_eq!(
            fixture.built.lock().expect("lock").clone(),
            vec![DatabaseSettings {
                url: "mongodb://127.0.0.1:27017".to_string(),
                dbname: "test".to_string(),
                auth_source: "admin".to_string(),
                redis: RedisSettings {
                    url: Some("redis://localhost".to_string()),
                    password: Some(String::new()),
                    index_name: None,
                },
            }]
        );
    }

    #[test]
    fn the_default_builder_refuses_a_url_mongo_cannot_parse() {
        let fixture: Fixture = fixture(config(json!({
            "database": { "development": { "type": "mongo", "endpoint": "not a url", "dbname": "d", "authSource": "admin" } },
        })));
        let mut env: Environment = fixture.env;
        env.database_builder = crate::default_database_builder();
        assert!(env.build_database().is_err());
    }
}

mod import_database {
    use super::*;

    #[tokio::test]
    async fn wraps_a_construction_failure_in_a_database_import_failed_error() {
        let mut env: Environment = default_fixture().env;
        env.database_builder = Box::new(|_: &DatabaseSettings, _: &Logger| Err(super::env_test_error("bad config")));
        assert_eq!(env.import_database().await.err().as_ref().and_then(key), Some("DATABASE.DATABASE_IMPORT_FAILED"));
    }

    #[tokio::test]
    async fn does_nothing_when_no_database_is_configured() {
        let mut env: Environment = fixture(config(json!({ "database": null }))).env;
        env.import_database().await.expect("imports");
        assert!(env.db.is_none());
    }
}

mod is_ready {
    use super::*;

    #[tokio::test]
    async fn returns_at_once_when_already_ready() {
        let _guard = maintenance_mode(false).await;
        let mut fixture: Fixture = default_fixture();
        fixture.env.ready = true;
        fixture.env.is_ready().await.expect("ready");
        assert!(fixture.built.lock().expect("lock").is_empty());
    }

    #[tokio::test]
    async fn unlocks_a_locked_pair_with_the_configured_password() {
        let _guard = maintenance_mode(false).await;
        let json = alice().to_json(Some("hunter2")).expect("exports");
        let locked: KeyringPair = get_pair(Some(Secret::Json(&json)), None, None, None).expect("a pair");
        assert!(locked.is_locked());
        let mut fixture: Fixture = fixture(config(json!({ "account": { "secret": "//Alice", "password": "hunter2" } })));
        fixture.env.pair = Some(locked.clone());
        fixture.env.is_ready().await.expect("ready");
        assert!(!locked.is_locked());
    }

    #[tokio::test]
    async fn resolves_and_records_the_most_recent_dataset_id() {
        let _guard = maintenance_mode(false).await;
        let mut fixture: Fixture = default_fixture();
        fixture.env.is_ready().await.expect("ready");
        assert_eq!(fixture.env.dataset_id.as_deref(), Some("0xdataset"));
    }

    #[tokio::test]
    async fn warns_but_is_ready_when_there_are_no_datasets() {
        let _guard = maintenance_mode(false).await;
        let mut fixture: Fixture = default_fixture();
        fixture.database.datasets.lock().expect("lock").clear();
        fixture.env.is_ready().await.expect("ready");
        assert!(fixture.env.ready);
        assert_eq!(fixture.env.dataset_id, None);
        assert!(fixture.lines.count(ConsoleMethod::Warn) > 0);
    }

    #[tokio::test]
    async fn tolerates_a_failing_dataset_lookup() {
        let _guard = maintenance_mode(false).await;
        let mut fixture: Fixture = default_fixture();
        fixture.database.failing.lock().expect("lock").push("find");
        fixture.env.is_ready().await.expect("ready");
        assert!(fixture.env.ready);
        assert!(fixture.lines.count(ConsoleMethod::Warn) > 0);
    }

    #[tokio::test]
    async fn leaves_an_already_connected_database_alone() {
        let _guard = maintenance_mode(false).await;
        let mut fixture: Fixture = default_fixture();
        fixture.env.db = Some(Arc::new(fixture.database.provider()));
        fixture.env.is_ready().await.expect("ready");
        assert_eq!(fixture.database.sent("createIndexes"), 0, "not connected again");
        assert!(fixture.built.lock().expect("lock").is_empty());
    }

    #[tokio::test]
    async fn connects_a_database_it_builds() {
        let _guard = maintenance_mode(false).await;
        let mut fixture: Fixture = default_fixture();
        fixture.env.is_ready().await.expect("ready");
        assert_eq!(fixture.built.lock().expect("lock").len(), 1);
        assert!(fixture.database.sent("createIndexes") > 0, "connected, so indexed");
    }

    #[tokio::test]
    async fn skips_the_dataset_lookup_once_a_dataset_id_is_known() {
        let _guard = maintenance_mode(false).await;
        let mut fixture: Fixture = default_fixture();
        fixture.env.db = Some(Arc::new(fixture.database.provider()));
        fixture.env.dataset_id = Some("0xalready".to_string());
        fixture.env.is_ready().await.expect("ready");
        assert_eq!(fixture.database.sent("find"), 0);
        assert_eq!(fixture.env.dataset_id.as_deref(), Some("0xalready"));
    }

    struct BrokenMaxMind;

    impl LocalBackend for BrokenMaxMind {
        fn initialize(&mut self) -> Result<(), BackendError> {
            Err("maxmind missing".into())
        }

        fn is_available(&self) -> bool {
            false
        }

        fn lookup(&self, ip: &str) -> IpInfoResponse {
            IpInfoResponse::error("unavailable", ip)
        }

        fn country_code(&self, _ip: &str) -> Option<String> {
            None
        }
    }

    #[tokio::test]
    async fn wraps_an_ip_info_initialisation_failure() {
        let _guard = maintenance_mode(false).await;
        let mut fixture: Fixture = default_fixture();
        fixture.env.ip_info_service = IpInfoService::with_backends(
            None,
            IpInfoBackends {
                maxmind: Some(Box::new(BrokenMaxMind)),
                ipapi: None,
            },
        );
        assert_eq!(fixture.env.is_ready().await.err().as_ref().and_then(key), Some("GENERAL.ENVIRONMENT_NOT_READY"));
    }

    #[tokio::test]
    async fn builds_no_database_when_none_is_configured() {
        let _guard = maintenance_mode(false).await;
        let mut fixture: Fixture = fixture(config(json!({ "database": null })));
        fixture.env.is_ready().await.expect("ready");
        assert!(fixture.env.ready);
        assert!(fixture.env.db.is_none());
    }

    #[tokio::test]
    async fn fails_when_the_database_cannot_connect_outside_maintenance_mode() {
        let _guard = maintenance_mode(false).await;
        let mut fixture: Fixture = default_fixture();
        fixture.env.database_builder = Box::new(unreachable);
        assert_eq!(fixture.env.is_ready().await.err().as_ref().and_then(key), Some("GENERAL.ENVIRONMENT_NOT_READY"));
    }

    #[tokio::test]
    async fn connects_in_the_background_in_maintenance_mode() {
        let _guard = maintenance_mode(true).await;
        let mut fixture: Fixture = default_fixture();
        fixture.env.is_ready().await.expect("ready");
        assert!(fixture.env.ready);
        assert!(fixture.env.db.is_some());
        assert_eq!(fixture.built.lock().expect("lock").len(), 1);
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        assert!(fixture.database.sent("createIndexes") > 0, "connected in the background");
        assert_eq!(fixture.database.sent("find"), 0, "no dataset lookup in maintenance mode");
    }

    #[tokio::test]
    async fn a_failing_background_connect_does_not_stop_the_provider_starting() {
        let _guard = maintenance_mode(true).await;
        let mut fixture: Fixture = default_fixture();
        fixture.env.database_builder = Box::new(unreachable);
        fixture.env.is_ready().await.expect("ready");
        assert!(fixture.env.ready);
        assert!(fixture.env.db.is_some());
        tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
        assert!(fixture.lines.count(ConsoleMethod::Warn) >= 2, "the background failure is logged");
    }

    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn reconnects_an_existing_but_disconnected_database() {
        let _guard = maintenance_mode(false).await;
        let url: String = std::env::var("PROSOPO_TEST_MONGO_URL").expect("PROSOPO_TEST_MONGO_URL");
        let mongo: Arc<MongoDatabase> =
            Arc::new(MongoDatabase::new(&url, Some("prosopo-test-env"), None, None, MongoConnectionTimeouts::default()).expect("a valid URL"));
        let mut fixture: Fixture = default_fixture();
        fixture.env.db = Some(Arc::new(ProviderDatabase::with_mongo(mongo.clone(), None, Arc::new(SystemSource), get_logger(LogLevel::Error, "test"))));
        assert!(!mongo.connected());
        fixture.env.is_ready().await.expect("ready");
        assert!(mongo.connected());
        assert!(fixture.built.lock().expect("lock").is_empty());
        mongo.database().await.expect("open").drop().await.expect("drops");
        mongo.close().await;
    }
}

mod connect_database_in_background {
    use super::*;

    #[test]
    fn does_nothing_when_no_database_is_configured() {
        let mut env: Environment = fixture(config(json!({ "database": null }))).env;
        env.connect_database_in_background();
        assert!(env.db.is_none());
    }

    #[test]
    fn warns_rather_than_failing_when_the_database_cannot_be_built() {
        let mut fixture: Fixture = default_fixture();
        fixture.env.database_builder = Box::new(|_: &DatabaseSettings, _: &Logger| Err(super::env_test_error("bad config")));
        fixture.env.connect_database_in_background();
        assert!(fixture.lines.count(ConsoleMethod::Warn) > 0);
        assert!(fixture.env.db.is_none());
    }
}

mod maintenance_mode_variable {
    use super::*;

    #[tokio::test]
    async fn reads_the_environment_variable() {
        let _guard = ENVIRONMENT_VARIABLES.lock().await;
        for (value, on) in [(Some("true"), true), (Some("TRUE"), true), (None, false), (Some("false"), false), (Some("1"), false)] {
            match value {
                Some(value) => std::env::set_var("MAINTENANCE_MODE", value),
                None => std::env::remove_var("MAINTENANCE_MODE"),
            }
            assert_eq!(is_maintenance_mode(), on, "{value:?}");
        }
        std::env::remove_var("MAINTENANCE_MODE");
    }
}

/// provider.unit.test.ts: `ProviderEnvironment.cleanup`.
mod cleanup {
    use super::*;

    fn provider_env(db: Option<ProviderDatabase>) -> (ProviderEnvironment, Arc<Lines>) {
        let fixture: Fixture = default_fixture();
        let mut env: ProviderEnvironment = ProviderEnvironment(fixture.env);
        env.db = db.map(Arc::new);
        (env, fixture.lines)
    }

    fn with_redis(db: ProviderDatabase) -> ProviderDatabase {
        db.setup_redis(&RedisSettings {
            url: Some("redis://127.0.0.1:1".to_string()),
            password: None,
            index_name: None,
        })
        .expect("sets up");
        db
    }

    #[tokio::test]
    async fn does_nothing_without_a_database() {
        let _guard = maintenance_mode(false).await;
        let (env, lines) = provider_env(None);
        assert!(env.cleanup().is_empty());
        assert!(lines.count(ConsoleMethod::Warn) > 0);
    }

    #[tokio::test]
    async fn does_nothing_when_the_database_is_not_connected() {
        let _guard = maintenance_mode(false).await;
        let logger: Logger = get_logger(LogLevel::Error, "test");
        let (env, _) = provider_env(Some(unreachable(&super::no_settings(), &logger).expect("built")));
        assert!(env.cleanup().is_empty());
    }

    #[tokio::test]
    async fn does_nothing_in_maintenance_mode_even_when_connected() {
        let _guard = maintenance_mode(true).await;
        let database: Arc<Database> = Arc::new(Database::default());
        let (env, _) = provider_env(Some(database.provider()));
        assert!(env.cleanup().is_empty());
        assert_eq!(database.sent("delete"), 0);
    }

    #[tokio::test]
    async fn resets_running_scheduled_tasks_and_clears_the_redis_sessions() {
        let _guard = maintenance_mode(false).await;
        let database: Arc<Database> = Arc::new(Database::default());
        let (env, _) = provider_env(Some(with_redis(database.provider())));
        let tasks = env.cleanup();
        assert_eq!(tasks.len(), 2, "the scheduler reset and the Redis wipe");
        let mut tasks = tasks.into_iter();
        tasks.next().expect("the reset").await.expect("runs");
        let deletes: Vec<Document> = database.sent.lock().expect("lock").iter().filter(|sent| sent.contains_key("delete")).cloned().collect();
        assert_eq!(deletes.len(), 1);
        assert_eq!(
            deletes[0].get_array("deletes").expect("deletes")[0].as_document().expect("a delete").get_document("q").expect("q"),
            &doc! { "status": "Running" }
        );
        for task in tasks {
            task.abort();
        }
    }

    #[tokio::test]
    async fn logs_rather_than_failing_when_the_scheduled_task_reset_fails() {
        let _guard = maintenance_mode(false).await;
        let database: Arc<Database> = Arc::new(Database::default());
        database.failing.lock().expect("lock").push("delete");
        let (env, lines) = provider_env(Some(database.provider()));
        for task in env.cleanup() {
            task.await.expect("runs");
        }
        assert!(lines.count(ConsoleMethod::Error) > 0);
    }

    #[tokio::test]
    async fn warns_and_carries_on_without_a_redis_connection() {
        let _guard = maintenance_mode(false).await;
        let database: Arc<Database> = Arc::new(Database::default());
        let (env, lines) = provider_env(Some(database.provider()));
        let tasks = env.cleanup();
        assert_eq!(tasks.len(), 1, "the scheduler reset only");
        for task in tasks {
            task.await.expect("runs");
        }
        assert_eq!(database.sent("delete"), 1);
        assert!(lines.count(ConsoleMethod::Warn) > 0);
    }
}

fn env_test_error(message: &str) -> ProsopoError {
    ProsopoError::new(
        prosopo_common::ErrorClass::Prosopo,
        prosopo_common::ErrorSource::message(message),
        prosopo_common::ErrorOptions {
            silent: true,
            ..prosopo_common::ErrorOptions::default()
        },
    )
}

fn no_settings() -> DatabaseSettings {
    DatabaseSettings {
        url: String::new(),
        dbname: String::new(),
        auth_source: String::new(),
        redis: RedisSettings::default(),
    }
}
