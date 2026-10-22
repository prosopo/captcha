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

//! start.ts and startProviderApi.ts for the routes the Rust provider serves so far.
//!
//! While the Node provider still runs beside it (MIGRATION.md §3), this one leaves the start-up
//! cleanup and the cron schedulers to Node: each must run in exactly one implementation. With
//! `--sole` (phase 6) it runs them itself.

use axum::Router;
use prosopo_api_router::{request_logger, AdminKey, AuthState};
use prosopo_database::provider::ProviderDatabase;
use prosopo_env::ProviderEnvironment;
use prosopo_keyring::KeyringPair;
use prosopo_locale::{default_locales_directory, locales_directory, I18n};
use prosopo_logger::{parse_log_level, LogLevel, LogRecord, Logger};
use prosopo_provider::api::block::{BlockState, HardBlockVerdictCache};
use prosopo_provider::api::captcha::CaptchaState;
use prosopo_provider::api::challenge::{ChallengeState, FreshSeeds, SeedSource};
use prosopo_provider::tasks::detection::{DetectorBundlePool, SimdDecoder, DEFAULT_DETECTOR_POOL_DIR};
use prosopo_provider::api::domain::DomainState;
use prosopo_load_balancer::ProviderDirectory;
use prosopo_env::is_maintenance_mode;
use prosopo_provider::api::admin::{AdminContext, AdminState};
use prosopo_provider::tasks::schedulers::{get_client_list, start_scheduler, store_commitments_external, update_spam_email_domains};
use prosopo_types::client::ScheduledTaskNames;
use prosopo_types::config::{ScheduleConfig, ScheduledTasksConfig};
use prosopo_provider::api::pipeline::AdminGate;
use prosopo_provider::api::rules::RuleRoutesState;
use prosopo_provider::api::verify::VerifyState;
use prosopo_provider::tasks::decision::{artifact_cache_ttl, DecisionGate};
use prosopo_provider::tasks::verify::VerifyServices;
use prosopo_provider::api::maintenance::MaintenanceMode;
use prosopo_provider::api::healthz_geo::{fetch_healthz_probe, read_healthz_geo_config, CountryLookup, HealthzGeoRouter, HealthzProbe};
use prosopo_provider::api::metrics::{metrics_enabled, ProcessSource, ProviderMetrics};
use prosopo_provider::api::pipeline::{pipeline, rate_limiters, IpInfoLookup, PipelineState};
use prosopo_provider::api::public::{DatabaseRedisStatuses, EnvReader, PublicState};
use prosopo_provider::api::{admin_auth_options, provider_app};
use prosopo_types::config::ProsopoConfig;
use prosopo_types::ipapi::IpInfoResponse;
use prosopo_user_access_policy::api::get_api_rule_rate_limits;
use serde_json::json;
use std::future::Future;
use std::net::{Ipv4Addr, Ipv6Addr, SocketAddr};
use std::pin::Pin;
use std::sync::Arc;
use tokio::net::TcpListener;

/// `version` from util: the build's `PROSOPO_PACKAGE_VERSION`, else the running one, else `dev`.
pub fn version() -> String {
    option_env!("PROSOPO_PACKAGE_VERSION")
        .filter(|version| !version.is_empty())
        .map(str::to_string)
        .or_else(|| std::env::var("PROSOPO_PACKAGE_VERSION").ok().filter(|version| !version.is_empty()))
        .unwrap_or_else(|| "dev".to_string())
}

/// The environment's IP information service, for the healthz geo steering.
struct EnvironmentCountries(Arc<ProviderEnvironment>);

impl CountryLookup for EnvironmentCountries {
    fn is_available(&self) -> bool {
        self.0.ip_info_service.is_available()
    }

    fn country(&self, ip: &str) -> Option<String> {
        self.0.ip_info_service.country(ip)
    }
}

/// `app.listen(port)`: every interface, IPv6 and IPv4 together where the host has IPv6.
async fn listen(port: u16) -> std::io::Result<TcpListener> {
    match TcpListener::bind(SocketAddr::from((Ipv6Addr::UNSPECIFIED, port))).await {
        Ok(listener) => Ok(listener),
        Err(_) => TcpListener::bind(SocketAddr::from((Ipv4Addr::UNSPECIFIED, port))).await,
    }
}

/// Resolves on SIGTERM or Ctrl-C.
async fn shutdown_signal() {
    let interrupt = async {
        let _ = tokio::signal::ctrl_c().await;
    };
    #[cfg(unix)]
    let terminate = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut signal) => {
                signal.recv().await;
            }
            Err(_) => std::future::pending::<()>().await,
        }
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! {
        () = interrupt => {},
        () = terminate => {},
    }
}

/// What the app is built from, besides the config: the keys, the database (none in tests), the
/// lookups, and the environment variables read per request.
pub struct AppParts {
    pub config: ProsopoConfig,
    pub pair: Option<KeyringPair>,
    pub auth_account: Option<KeyringPair>,
    pub logger: Logger,
    pub db: Option<Arc<ProviderDatabase>>,
    pub countries: Arc<dyn CountryLookup>,
    pub ip_info: Option<Arc<dyn IpInfoLookup>>,
    pub probe: HealthzProbe,
    pub env: EnvReader,
    pub i18n: Arc<I18n>,
    pub version: String,
    /// The detector decoders, which are not public source (MIGRATION.md §4.1); without them a
    /// challenge's SIMD readings are dropped.
    pub simd_decoder: Option<Arc<dyn SimdDecoder>>,
    /// Where render seeds come from; fresh random bytes unless a test pins them.
    pub seeds: Arc<dyn SeedSource>,
    /// `env.datasetId`, which image challenges draw from unless they name a dataset.
    pub dataset_id: Option<String>,
}

/// startProviderApi's app for the routes ported so far, and its healthz geo router, which the
/// caller starts and stops.
pub fn provider_router(parts: AppParts) -> (Router, Arc<HealthzGeoRouter>) {
    let AppParts { config, pair, auth_account, logger, db, countries, ip_info, probe, env, i18n, version, simd_decoder, seeds, dataset_id } = parts;
    let geo: Arc<HealthzGeoRouter> =
        Arc::new(HealthzGeoRouter::with_probe(read_healthz_geo_config(env.as_ref(), Some(&logger)), countries, probe, Some(logger.clone())));
    let metrics: Option<Arc<ProviderMetrics>> =
        metrics_enabled(env.as_ref()).then(|| Arc::new(ProviderMetrics::new(env("MAINTENANCE_MODE").as_deref(), ProcessSource::current())));
    let node_env: Option<String> = env("NODE_ENV");
    let unlimited: bool = node_env.as_deref() == Some("test") || config.default_environment == "development";
    let limiters = if unlimited {
        Vec::new()
    } else {
        let configured = config.rate_limits.0.iter().map(|(path, limit)| (path.clone(), limit.window_ms.get(), limit.limit.get()));
        let rules = get_api_rule_rate_limits(env.as_ref());
        let rules = rules.iter().map(|(route, limit)| (route.path().to_string(), limit.window_ms as f64, limit.limit as f64)).collect::<Vec<_>>();
        rate_limiters(configured.chain(rules))
    };
    let pair_address: Option<String> = pair.as_ref().and_then(|pair| pair.address().ok());
    let signing_pair: Option<KeyringPair> = pair.clone();
    let admin_key = |pair: Option<KeyringPair>| pair.map(|pair| Arc::new(pair) as Arc<dyn AdminKey>);
    let auth: AuthState = AuthState {
        pair: admin_key(pair),
        auth_account: admin_key(auth_account),
        options: admin_auth_options(env.as_ref(), Some(&config.host)),
    };
    let verdict_cache: Arc<HardBlockVerdictCache> = Arc::new(HardBlockVerdictCache::default());
    let log_level: LogLevel = parse_log_level(Some(&config.log_level), LogLevel::Info);
    let gate: AdminGate = AdminGate {
        auth,
        rules: Arc::new(RuleRoutesState {
            db: db.clone(),
            cache: verdict_cache.clone(),
            logger: logger.clone(),
            log_level,
            router: std::sync::OnceLock::new(),
        }),
    };
    let pipeline_state: Arc<PipelineState> = Arc::new(PipelineState { limiters, logger: logger.clone(), node_env, ip_info: ip_info.clone() });
    let maintenance: Arc<MaintenanceMode> = Arc::new(MaintenanceMode::from_env(env("MAINTENANCE_MODE").as_deref()));
    let services: Option<Arc<VerifyServices>> = db.clone().map(|db| {
            Arc::new(VerifyServices {
                decisions: Arc::new(DecisionGate::new(db.clone(), artifact_cache_ttl(env("DECISION_MACHINE_ARTIFACT_CACHE_TTL_MS").as_deref()))),
                db,
                write_queue: std::sync::OnceLock::new(),
                usage_counters: std::sync::OnceLock::new(),
                logger: logger.clone(),
                ip_info,
                verdict_cache: verdict_cache.clone(),
                dns_servers: config.dns_servers.clone(),
            })
        });
    let admin: Arc<AdminState> = Arc::new(AdminState {
        context: services.clone().map(|services| Arc::new(AdminContext { services, maintenance: maintenance.clone(), metrics: metrics.clone() })),
        log_level,
        router: std::sync::OnceLock::new(),
    });
    let verify: Arc<VerifyState> = Arc::new(VerifyState {
        services,
        maintenance: maintenance.clone(),
        metrics: metrics.clone(),
        providers: Arc::new(ProviderDirectory::default()),
        default_environment: config.default_environment.clone(),
        address: pair_address,
    });
    let block: Arc<BlockState> = Arc::new(BlockState {
        db: db.clone(),
        cache: verdict_cache,
        metrics: metrics.clone(),
        maintenance: maintenance.clone(),
        inspector: std::sync::OnceLock::new(),
    });
    let domain: Arc<DomainState> = Arc::new(DomainState { db: db.clone(), maintenance: maintenance.clone(), metrics: metrics.clone() });
    let pool_dir: String = env("PROSOPO_DETECTOR_POOL_DIR").unwrap_or_else(|| DEFAULT_DETECTOR_POOL_DIR.to_string());
    let pool: DetectorBundlePool = DetectorBundlePool::load_from_dir(std::path::Path::new(&pool_dir), &logger, env("PROSOPO_DETECTOR_POOL_RELEASE").as_deref());
    let challenge: Arc<ChallengeState> = Arc::new(ChallengeState {
        services: verify.services.clone(),
        maintenance: maintenance.clone(),
        metrics: metrics.clone(),
        pair: signing_pair,
        pool: Arc::new(std::sync::RwLock::new(Arc::new(pool))),
        decoder: simd_decoder,
        seeds,
        audio: std::sync::OnceLock::new(),
        puzzle: prosopo_provider::tasks::puzzle::PuzzleAssets::default(),
        dataset_id,
        captcha_counts: config.captchas.clone(),
        env: env.clone(),
    });
    let captcha: Arc<CaptchaState> = Arc::new(CaptchaState { challenge, db: db.clone(), maintenance, metrics: metrics.clone(), dns_servers: config.dns_servers.clone() });
    let rest: Router = pipeline(pipeline_state, request_logger(log_level), i18n, gate, admin, verify, block, domain, captcha);
    let state: PublicState = PublicState {
        host: config.host.clone(),
        version,
        geo: geo.clone(),
        redis: Arc::new(DatabaseRedisStatuses(db)),
        logger,
        metrics,
        env,
        rest,
    };
    (provider_app(Arc::new(state)), geo)
}

/// `localesDirectory` beside the executable, else the source tree's.
pub fn locales() -> Arc<I18n> {
    let beside: Option<std::path::PathBuf> = std::env::current_exe()
        .ok()
        .and_then(|executable| executable.parent().map(|directory| locales_directory(directory, |path| path.exists())))
        .filter(|directory| directory.exists());
    Arc::new(I18n::load(&beside.unwrap_or_else(default_locales_directory)))
}

/// The environment's IP information service, for the request signals.
struct EnvironmentIpInfo(Arc<ProviderEnvironment>);

impl IpInfoLookup for EnvironmentIpInfo {
    fn is_available(&self) -> bool {
        self.0.ip_info_service.is_available()
    }

    fn lookup<'a>(&'a self, ip: &'a str) -> Pin<Box<dyn Future<Output = IpInfoResponse> + Send + 'a>> {
        Box::pin(self.0.ip_info_service.lookup(ip))
    }
}

/// What `start` builds the app from: the ready environment's keys, database and lookups, the
/// process environment, and the real health probe.
pub fn app_parts(env: Arc<ProviderEnvironment>) -> AppParts {
    AppParts {
        config: env.config.clone(),
        pair: env.pair.clone(),
        auth_account: env.auth_account.clone(),
        logger: env.logger.clone(),
        db: env.db.clone(),
        countries: Arc::new(EnvironmentCountries(env.clone())),
        ip_info: Some(Arc::new(EnvironmentIpInfo(env.clone()))),
        probe: fetch_healthz_probe(),
        env: Arc::new(|name: &str| std::env::var(name).ok()),
        i18n: locales(),
        version: version(),
        simd_decoder: None,
        seeds: Arc::new(FreshSeeds),
        dataset_id: env.dataset_id.clone(),
    }
}

/// The configured schedulers, each its job at its schedule (start.ts). None in maintenance
/// mode, whose database the jobs would only log failures against.
fn start_schedulers(env: &ProviderEnvironment) -> Vec<tokio::task::JoinHandle<()>> {
    let (Some(db), Some(_)) = (env.db.clone(), env.pair.as_ref()) else {
        return Vec::new();
    };
    if is_maintenance_mode() {
        return Vec::new();
    }
    let logger: Logger = env.logger.clone();
    let config = &env.config;
    let schedule = |pick: fn(&ScheduledTasksConfig) -> Option<&ScheduleConfig>| {
        config.scheduled_tasks.as_ref().and_then(pick).and_then(|scheduled| scheduled.schedule.clone())
    };
    let mut started: Vec<tokio::task::JoinHandle<()>> = Vec::new();
    let mut schedule_job = |name: ScheduledTaskNames, schedule: Option<String>, failure: &'static str, job: Box<dyn Fn() -> JobFuture + Send + Sync>| {
        let Some(schedule) = schedule else {
            return;
        };
        match start_scheduler(name, &schedule, db.clone(), logger.clone(), job) {
            Ok(handle) => started.push(handle),
            Err(error) => logger.error(|| LogRecord::msg(failure).with_err(error.message().to_string())),
        }
    };
    let (captcha_db, captcha_uri, captcha_log) = (db.clone(), config.mongo_captcha_uri.clone(), logger.clone());
    schedule_job(
        ScheduledTaskNames::StoreCommitmentsExternal,
        schedule(|tasks| tasks.captcha_scheduler.as_ref()),
        "Failed to start scheduler:",
        Box::new(move || {
            let (db, uri, log) = (captcha_db.clone(), captcha_uri.clone(), captcha_log.clone());
            Box::pin(async move {
                if let Err(error) = store_commitments_external(&db, uri.as_deref(), &log).await {
                    log.error(|| LogRecord::msg("Error storing commitments externally").with_err(error.message().to_string()));
                }
            })
        }),
    );
    let (client_db, client_uri, client_log) = (db.clone(), config.mongo_client_uri.clone(), logger.clone());
    schedule_job(
        ScheduledTaskNames::GetClientList,
        schedule(|tasks| tasks.client_list_scheduler.as_ref()),
        "Failed to start client list scheduler",
        Box::new(move || {
            let (db, uri, log) = (client_db.clone(), client_uri.clone(), client_log.clone());
            Box::pin(async move {
                if let Err(error) = get_client_list(&db, uri.as_deref(), &log).await {
                    log.error(|| LogRecord::msg("Error getting client list").with_err(error.message().to_string()));
                }
            })
        }),
    );
    let (spam_db, spam_urls, spam_log) = (db.clone(), config.spam_email_domains_urls.clone().unwrap_or_default(), logger.clone());
    schedule_job(
        ScheduledTaskNames::UpdateSpamEmailDomains,
        schedule(|tasks| tasks.spam_email_domains_scheduler.as_ref()),
        "Failed to start spam email domains scheduler",
        Box::new(move || {
            let (db, urls, log) = (spam_db.clone(), spam_urls.clone(), spam_log.clone());
            Box::pin(async move {
                if urls.is_empty() {
                    log.warn(|| LogRecord::msg("No spam email domains URLs configured, skipping update"));
                    return;
                }
                if let Err(error) = update_spam_email_domains(&db, &log, &urls, "./spam-cache").await {
                    log.error(|| LogRecord::msg("Error updating spam email domains").with_err(error.message().to_string()));
                }
            })
        }),
    );
    started
}

type JobFuture = std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send>>;

/// The environment made ready, then the API served on `port` (else the configured one) until
/// the process is told to stop. As the sole implementation it also cleans up after the last
/// run and starts the schedulers; beside the Node provider it leaves both to Node.
pub async fn start(mut env: ProviderEnvironment, port: Option<u16>, sole: bool) -> Result<(), String> {
    env.is_ready().await.map_err(|error| error.to_string())?;
    let logger: Logger = env.logger.clone();
    logger.info(|| LogRecord::msg("Starting Prosopo API"));
    if sole {
        for cleanup in env.cleanup() {
            let _ = cleanup.await;
        }
        start_schedulers(&env);
    } else {
        logger.info(|| LogRecord::msg("Start-up cleanup and the schedulers are left to the Node provider while both run"));
    }
    let port: u16 = match (port, &env.config.server) {
        (Some(port), _) => port,
        (None, Some(server)) => {
            let configured: f64 = server.port.get();
            u16::try_from(configured as i64).ok().filter(|port| f64::from(*port) == configured).ok_or_else(|| format!("invalid port {configured}"))?
        }
        (None, None) => 0,
    };
    let (app, geo) = provider_router(app_parts(Arc::new(env)));
    geo.start();
    let listener: TcpListener = listen(port).await.map_err(|error| format!("cannot listen on port {port}: {error}"))?;
    logger.info(|| LogRecord::msg("Prosopo app listening").with_data(json!({ "apiPort": port })));
    let served = axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>()).with_graceful_shutdown(shutdown_signal()).await;
    geo.stop();
    served.map_err(|error| error.to_string())
}
