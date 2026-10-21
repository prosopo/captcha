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

//! `Environment` (env.ts).

use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_database::mongo::{MongoConnectionTimeouts, MongoDatabase};
use prosopo_database::provider::{ProviderDatabase, RedisSettings};
use prosopo_database::source::{Source, SystemSource};
use prosopo_ipinfo::{IpInfoService, IpInfoServiceConfig};
use prosopo_keyring::{get_pair, Keyring, KeyringPair, Secret};
use prosopo_logger::{get_logger, parse_log_level, LogLevel, LogRecord, Logger};
use prosopo_types::config::ProsopoConfig;
use prosopo_types::keyring::KeyringOptions;
use prosopo_util_crypto::random::random_as_hex;
use serde_json::json;
use std::path::PathBuf;
use std::sync::Arc;

/// Where the database of the current environment is, and the provider's Redis.
#[derive(Debug, Clone, PartialEq)]
pub struct DatabaseSettings {
    pub url: String,
    pub dbname: String,
    pub auth_source: String,
    pub redis: RedisSettings,
}

/// Makes the (not yet connected) database from its settings. The TS constructs a
/// `ProviderDatabase`; a test can give its own.
pub type DatabaseBuilder = Box<dyn Fn(&DatabaseSettings, &Logger) -> Result<ProviderDatabase, ProsopoError> + Send + Sync>;

/// `new ProviderDatabase({ mongo, redis, logger })`.
pub fn default_database_builder() -> DatabaseBuilder {
    Box::new(|settings: &DatabaseSettings, logger: &Logger| {
        let mongo: MongoDatabase = MongoDatabase::new(
            &settings.url,
            Some(&settings.dbname),
            Some(&settings.auth_source),
            Some(logger.clone()),
            MongoConnectionTimeouts::default(),
        )
        .map_err(|error| raw(error.to_string()))?;
        Ok(ProviderDatabase::with_mongo(Arc::new(mongo), Some(settings.redis.clone()), Arc::new(SystemSource), logger.clone()))
    })
}

/// `isMaintenanceMode`: the `MAINTENANCE_MODE` environment variable, the same the provider's
/// runtime toggle sets.
pub fn is_maintenance_mode() -> bool {
    std::env::var("MAINTENANCE_MODE").is_ok_and(|value| value.to_lowercase() == "true")
}

/// `new Error(message)`.
fn raw(message: impl Into<String>) -> ProsopoError {
    ProsopoError::new(
        ErrorClass::Prosopo,
        ErrorSource::message(message),
        ErrorOptions {
            silent: true,
            ..ErrorOptions::default()
        },
    )
}

fn env_error(source: impl Into<ErrorSource>, context: Option<ErrorContext>, logger: Option<&Logger>) -> ProsopoError {
    ProsopoError::new(
        ErrorClass::Env,
        source,
        ErrorOptions {
            context,
            logger,
            ..ErrorOptions::default()
        },
    )
}

pub struct Environment {
    pub config: ProsopoConfig,
    pub db: Option<Arc<ProviderDatabase>>,
    pub default_environment: String,
    pub logger: Logger,
    pub keyring: Keyring,
    pub pair: Option<KeyringPair>,
    pub auth_account: Option<KeyringPair>,
    pub env_id: String,
    pub ip_info_service: IpInfoService,
    pub ready: bool,
    pub dataset_id: Option<String>,
    pub database_builder: DatabaseBuilder,
    pub source: Arc<dyn Source>,
}

impl Environment {
    /// The pair is the one given, or the one the configured account secret makes.
    pub fn new(config: ProsopoConfig, pair: Option<KeyringPair>, auth_account: Option<KeyringPair>) -> Result<Environment, ProsopoError> {
        let default_environment: String = config.default_environment.clone();
        let pair: Option<KeyringPair> = match pair {
            Some(pair) => Some(pair),
            None => Some(
                get_pair(config.account.secret.as_deref().map(Secret::Text), None, None, None)
                    .map_err(|error| raw(error.to_string()))?,
            ),
        };
        let logger: Logger = get_logger(parse_log_level(Some(&config.log_level), LogLevel::Info), "ProsopoEnvironment");
        let mut keyring: Keyring = Keyring::new(KeyringOptions::default()).map_err(|error| raw(error.to_string()))?;
        if let Some(pair) = &pair {
            keyring.add_pair(pair.clone()).map_err(|error| raw(error.to_string()))?;
        }
        let env_id: String = random_as_hex(32).chars().take(32).collect();
        let ip_info_service: IpInfoService = IpInfoService::new(IpInfoServiceConfig {
            maxmind_city_db_path: config.maxmind_city_db_path.clone().or_else(|| config.maxmind_db_path.clone()).map(PathBuf::from),
            maxmind_asn_db_path: config.maxmind_asn_db_path.clone().map(PathBuf::from),
            ipapi_url: config.ip_api.as_ref().map(|ip_api| ip_api.base_url.clone()),
            ipapi_key: config.ip_api.as_ref().map(|ip_api| ip_api.api_key.clone()),
            logger: Some(logger.clone()),
        });
        logger.info(|| {
            LogRecord::msg("Environment initialized").with_data(json!({
                "envId": env_id,
                "defaultEnvironment": default_environment,
                "logLevel": config.log_level,
                "maxmindDbPath": config.maxmind_db_path.clone().filter(|path| !path.is_empty()).unwrap_or_else(|| "not configured".to_string()),
            }))
        });
        Ok(Environment {
            config,
            db: None,
            default_environment,
            logger,
            keyring,
            pair,
            auth_account,
            env_id,
            ip_info_service,
            ready: false,
            dataset_id: None,
            database_builder: default_database_builder(),
            source: Arc::new(SystemSource),
        })
    }

    /// `getSigner`: the pair, registered with the keyring.
    pub fn get_signer(&mut self) -> Result<KeyringPair, ProsopoError> {
        let failed = |error: Option<String>| {
            let mut context: ErrorContext = ErrorContext::new().with("failedFuncName", "getSigner");
            if let Some(error) = error {
                context = context.with("error", error);
            }
            env_error(ErrorSource::key("CONTRACT.SIGNER_UNDEFINED"), Some(context), None)
        };
        let pair: KeyringPair = self.pair.clone().ok_or_else(|| failed(None))?;
        let registered: KeyringPair = self.keyring.add_pair(pair).map_err(|error| failed(Some(error.to_string())))?;
        self.pair = Some(registered.clone());
        Ok(registered)
    }

    pub fn get_db(&self) -> Result<Arc<ProviderDatabase>, ProsopoError> {
        self.db.clone().ok_or_else(|| env_error(ErrorSource::message("db not setup! Please call isReady() first"), None, None))
    }

    pub fn get_pair(&self) -> Result<KeyringPair, ProsopoError> {
        self.pair.clone().ok_or_else(|| env_error(ErrorSource::message("pair not setup! Please call isReady() first"), None, None))
    }

    /// `isReady`: unlocks and registers the pair, connects the database (in the background in
    /// maintenance mode, so a database that is down cannot stop the provider starting), picks
    /// the default dataset, and opens the IP information databases. Once only.
    pub async fn is_ready(&mut self) -> Result<(), ProsopoError> {
        if self.ready {
            self.logger.debug(|| LogRecord::msg("Environment is already ready"));
            return Ok(());
        }
        match self.get_ready().await {
            Ok(()) => {
                self.ready = true;
                Ok(())
            }
            Err(error) => Err(env_error(
                ErrorSource::key("GENERAL.ENVIRONMENT_NOT_READY"),
                Some(ErrorContext::new().with("error", error.to_string())),
                Some(&self.logger),
            )),
        }
    }

    async fn get_ready(&mut self) -> Result<(), ProsopoError> {
        if let (Some(pair), Some(password)) = (&self.pair, self.config.account.password.as_deref().filter(|password| !password.is_empty())) {
            if pair.is_locked() {
                pair.unlock(Some(password)).map_err(|error| raw(error.to_string()))?;
            }
        }
        self.get_signer()?;
        let maintenance_mode: bool = is_maintenance_mode();
        if maintenance_mode {
            self.logger.warn(|| {
                LogRecord::msg(
                    "MAINTENANCE_MODE=true — connecting to DB in the background so admin endpoints stay available; captcha path short-circuits",
                )
            });
            if self.db.is_none() {
                self.connect_database_in_background();
            }
        } else if self.db.is_none() {
            self.import_database().await?;
        } else if let Some(db) = self.db.clone().filter(|db| !db.connected()) {
            self.logger.warn(|| LogRecord::msg("Database connection is not ready (state: 0), reconnecting..."));
            db.connect().await?;
            self.logger.info(|| LogRecord::msg("Connected to db"));
        }
        if let (false, Some(db), None) = (maintenance_mode, self.db.clone(), &self.dataset_id) {
            match db.get_most_recent_dataset_id().await {
                Ok(Some(dataset_id)) => {
                    self.logger.info(|| LogRecord::msg("Default dataset ID set").with_data(json!({ "datasetId": dataset_id })));
                    self.dataset_id = Some(dataset_id);
                }
                Ok(None) => self.logger.warn(|| {
                    LogRecord::msg("No datasets found in database. Image captchas will not work until a dataset is uploaded.")
                }),
                Err(error) => self.logger.warn(|| {
                    LogRecord::msg("Failed to get most recent dataset ID").with_data(json!({ "error": error.to_string() }))
                }),
            }
        }
        self.ip_info_service.initialize().map_err(|error| raw(error.to_string()))?;
        Ok(())
    }

    /// `buildDatabase`: the database of the current environment, not connected, or none when
    /// it has none configured.
    pub fn build_database(&self) -> Result<Option<ProviderDatabase>, ProsopoError> {
        let Some(database) = self.config.database.as_ref().and_then(|databases| databases.get(&self.default_environment)) else {
            return Ok(None);
        };
        let settings: DatabaseSettings = DatabaseSettings {
            url: database.endpoint.clone(),
            dbname: database.dbname.clone(),
            auth_source: database.auth_source.clone(),
            redis: RedisSettings {
                url: Some(self.config.redis_connection.url.clone()),
                password: Some(self.config.redis_connection.password.clone()),
                index_name: None,
            },
        };
        (self.database_builder)(&settings, &self.logger).map(Some)
    }

    /// `importDatabase`: the database built and connected.
    pub async fn import_database(&mut self) -> Result<(), ProsopoError> {
        let import = async {
            if let Some(db) = self.build_database()? {
                let db: Arc<ProviderDatabase> = Arc::new(db);
                self.db = Some(db.clone());
                db.connect().await?;
            }
            Ok::<(), ProsopoError>(())
        };
        import.await.map_err(|error| {
            let environment: Option<String> = self
                .config
                .database
                .as_ref()
                .and_then(|databases| databases.get(&self.default_environment))
                .map(|database| database.database_type.clone());
            let mut context: ErrorContext = ErrorContext::new().with("error", error.to_string());
            if let Some(environment) = environment {
                context = context.with("environment", environment);
            }
            env_error(ErrorSource::key("DATABASE.DATABASE_IMPORT_FAILED"), Some(context), None)
        })
    }

    /// `connectDatabaseInBackground`: the database built and set at once, connecting in the
    /// background; a failure is logged rather than returned.
    pub fn connect_database_in_background(&mut self) {
        match self.build_database() {
            Ok(Some(db)) => {
                let db: Arc<ProviderDatabase> = Arc::new(db);
                self.db = Some(db.clone());
                let logger: Logger = self.logger.clone();
                tokio::spawn(async move {
                    if let Err(error) = db.connect().await {
                        logger.warn(|| {
                            LogRecord::msg("Background DB connection failed in maintenance mode; admin endpoints will retry on demand")
                                .with_data(json!({ "error": error.to_string() }))
                        });
                    }
                });
            }
            Ok(None) => {}
            Err(error) => self.logger.warn(|| {
                LogRecord::msg("Failed to create DB handle in maintenance mode; admin endpoints will be unavailable until restart")
                    .with_data(json!({ "error": error.to_string() }))
            }),
        }
    }
}
