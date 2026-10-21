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

//! `MongoDatabase` (src/base/mongo.ts): one connection to one database, opened on first use.

use crate::options::{get_mongo_connection_options, ConnectionArgs, ConnectionOptions, SOCKET_TIMEOUT_MS};
use bson::doc;
use mongodb::options::ClientOptions;
use mongodb::{Client, Database};
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_logger::{get_logger, LogLevel, LogRecord, Logger};
use serde_json::{json, Map, Value};
use std::fmt;
use std::future::Future;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tokio::sync::Mutex;
use url::Url;

const DEFAULT_ENDPOINT: &str = "mongodb://127.0.0.1:27017";

/// Per-connection timeout overrides for a database that is not local to the process.
#[derive(Debug, Clone, Copy, Default)]
pub struct MongoConnectionTimeouts {
    pub connect_timeout_ms: Option<u64>,
    pub server_selection_timeout_ms: Option<u64>,
}

#[derive(Debug)]
pub enum MongoError {
    /// `new URL(...)` rejected the endpoint.
    InvalidUrl(url::ParseError),
    Driver(mongodb::error::Error),
    /// An operation outlived [`SOCKET_TIMEOUT_MS`].
    Timeout,
    /// The connection is not open.
    Unavailable(String),
    /// The command ran but a write in it failed (a reply's `writeErrors` or
    /// `writeConcernError`), which the driver reports as a failed operation.
    Write { code: i32, message: String },
}

impl fmt::Display for MongoError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MongoError::InvalidUrl(error) => write!(f, "Invalid URL: {error}"),
            MongoError::Driver(error) => write!(f, "{error}"),
            MongoError::Timeout => write!(f, "operation exceeded {SOCKET_TIMEOUT_MS} ms"),
            MongoError::Unavailable(why) => write!(f, "{why}"),
            MongoError::Write { message, .. } => write!(f, "{message}"),
        }
    }
}

impl std::error::Error for MongoError {}

impl From<mongodb::error::Error> for MongoError {
    fn from(error: mongodb::error::Error) -> MongoError {
        MongoError::Driver(error)
    }
}

/// The endpoint with the database as its path and `authSource` set in its query, as the TS
/// builds it with `URL`: an empty database name or auth source leaves the URL alone.
pub fn build_url(url: &str, dbname: Option<&str>, auth_source: Option<&str>) -> Result<(String, String), MongoError> {
    let base: &str = if url.is_empty() { DEFAULT_ENDPOINT } else { url };
    let mut parsed: Url = Url::parse(base).map_err(MongoError::InvalidUrl)?;
    if let Some(name) = dbname.filter(|name| !name.is_empty()) {
        parsed.set_path(&name.replace('?', "%3F").replace('#', "%23"));
    }
    if let Some(source) = auth_source.filter(|source| !source.is_empty()) {
        set_search_param(&mut parsed, "authSource", source);
    }
    let database: String = match dbname.filter(|name| !name.is_empty()) {
        Some(name) => name.to_string(),
        None => parsed.path().replacen('/', "", 1),
    };
    Ok((parsed.to_string(), database))
}

/// `url.searchParams.set(name, value)`: the first pair of that name takes the value, the others
/// go, and the whole query is written back form-encoded.
fn set_search_param(url: &mut Url, name: &str, value: &str) {
    let mut pairs: Vec<(String, String)> = Vec::new();
    let mut found: bool = false;
    for (key, existing) in url.query_pairs() {
        if key == name {
            if !found {
                pairs.push((key.into_owned(), value.to_string()));
                found = true;
            }
        } else {
            pairs.push((key.into_owned(), existing.into_owned()));
        }
    }
    if !found {
        pairs.push((name.to_string(), value.to_string()));
    }
    let query: String = form_urlencoded::Serializer::new(String::new()).extend_pairs(pairs).finish();
    url.set_query(Some(&query));
}

/// The URL without its credentials, for the logs.
pub fn mask_credentials(url: &str) -> String {
    let Ok(mut parsed) = Url::parse(url) else {
        return url.to_string();
    };
    if parsed.username().is_empty() && parsed.password().is_none() {
        return parsed.to_string();
    }
    if parsed.set_password(None).is_err() || parsed.set_username("<Credentials>").is_err() {
        return "[unparseable mongo url]".to_string();
    }
    parsed.to_string()
}

pub struct MongoDatabase {
    url: String,
    safe_url: String,
    dbname: String,
    logger: Logger,
    timeouts: MongoConnectionTimeouts,
    client: Mutex<Option<Client>>,
    connected: AtomicBool,
}

impl MongoDatabase {
    pub fn new(
        url: &str,
        dbname: Option<&str>,
        auth_source: Option<&str>,
        logger: Option<Logger>,
        timeouts: MongoConnectionTimeouts,
    ) -> Result<MongoDatabase, MongoError> {
        let (url, dbname): (String, String) = build_url(url, dbname, auth_source)?;
        let safe_url: String = mask_credentials(&url);
        let mut fields: Map<String, Value> = Map::new();
        fields.insert("mongoUrl".into(), json!(safe_url));
        let logger: Logger = logger
            .unwrap_or_else(|| get_logger(LogLevel::Info, "database:mongo"))
            .with(&fields, None);
        Ok(MongoDatabase {
            url,
            safe_url,
            dbname,
            logger,
            timeouts,
            client: Mutex::new(None),
            connected: AtomicBool::new(false),
        })
    }

    pub fn url(&self) -> &str {
        &self.url
    }

    pub fn safe_url(&self) -> &str {
        &self.safe_url
    }

    pub fn dbname(&self) -> &str {
        &self.dbname
    }

    pub fn logger(&self) -> &Logger {
        &self.logger
    }

    pub fn connected(&self) -> bool {
        self.connected.load(Ordering::SeqCst)
    }

    /// The options the TS hands mongoose for this database.
    pub fn connection_options(&self) -> ConnectionOptions {
        get_mongo_connection_options(&ConnectionArgs {
            url: self.url.clone(),
            app_name: app_name(),
            max_pool_size: Some(50),
            min_pool_size: Some(5),
            db_name: Some(self.dbname.clone()),
            connect_timeout_ms: self.timeouts.connect_timeout_ms,
            server_selection_timeout_ms: self.timeouts.server_selection_timeout_ms,
        })
        .expect("build_url never yields an empty URL")
    }

    /// Opens the connection unless it is open. Concurrent callers share one attempt. A
    /// connection that fails to open is shut down, so its pool and monitors do not live on.
    pub async fn connect(&self) -> Result<(), MongoError> {
        let mut client = self.client.lock().await;
        if client.is_some() && self.connected() {
            self.logger.debug(|| LogRecord::msg("Database connection already open"));
            return Ok(());
        }
        self.logger.debug(|| LogRecord::msg("Connecting to database"));
        let mut options: ClientOptions = ClientOptions::parse(&self.url).await.map_err(|error| self.failed(error))?;
        self.connection_options().apply(&mut options);
        let candidate: Client = Client::with_options(options).map_err(|error| self.failed(error))?;
        match candidate.database(&self.dbname).run_command(doc! { "ping": 1 }).await {
            Ok(_) => {
                self.logger.debug(|| LogRecord::msg("Database connection opened"));
                *client = Some(candidate);
                self.connected.store(true, Ordering::SeqCst);
                Ok(())
            }
            Err(error) => {
                candidate.shutdown().immediate(true).await;
                Err(self.failed(error))
            }
        }
    }

    fn failed(&self, error: mongodb::error::Error) -> MongoError {
        self.logger.error(|| LogRecord::msg("Database error").with_err(error.to_string()));
        self.connected.store(false, Ordering::SeqCst);
        MongoError::Driver(error)
    }

    /// The open database, or `DATABASE.CONNECTION_UNDEFINED` before `connect`.
    pub async fn database(&self) -> Result<Database, ProsopoError> {
        match self.client.lock().await.as_ref() {
            Some(client) => Ok(client.database(&self.dbname)),
            None => Err(ProsopoError::new(
                ErrorClass::Db,
                ErrorSource::key("DATABASE.CONNECTION_UNDEFINED"),
                ErrorOptions {
                    context: Some(ErrorContext::new().with("failedFuncName", "getConnection")),
                    logger: Some(&self.logger),
                    ..ErrorOptions::default()
                },
            )),
        }
    }

    pub async fn close(&self) {
        self.logger.debug(|| LogRecord::msg("Closing connection"));
        if let Some(client) = self.client.lock().await.take() {
            client.shutdown().await;
            self.connected.store(false, Ordering::SeqCst);
            self.logger.debug(|| LogRecord::msg("Database connection closed"));
        }
    }

    /// Runs one operation under the TS's 30 s `socketTimeoutMS`, which the driver cannot set.
    pub async fn bounded<T, F>(&self, operation: F) -> Result<T, MongoError>
    where
        F: Future<Output = Result<T, mongodb::error::Error>>,
    {
        match tokio::time::timeout(Duration::from_millis(SOCKET_TIMEOUT_MS), operation).await {
            Ok(result) => result.map_err(MongoError::Driver),
            Err(_) => Err(MongoError::Timeout),
        }
    }
}

/// The TS names the connection after the file that opens it; the Rust after its executable.
fn app_name() -> String {
    std::env::current_exe()
        .map(|path| path.display().to_string())
        .unwrap_or_else(|_| "prosopo".to_string())
}
