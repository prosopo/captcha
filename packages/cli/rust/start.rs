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
//! cleanup, the frictionless ladder migration and the cron schedulers to Node: each of them
//! must run in exactly one implementation until phase 6.

use axum::Router;
use prosopo_api_router::{request_logger, AdminKey, AuthState};
use prosopo_database::provider::ProviderDatabase;
use prosopo_env::ProviderEnvironment;
use prosopo_keyring::KeyringPair;
use prosopo_locale::{default_locales_directory, locales_directory, I18n};
use prosopo_logger::{parse_log_level, LogLevel, LogRecord, Logger};
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
}

/// startProviderApi's app for the routes ported so far, and its healthz geo router, which the
/// caller starts and stops.
pub fn provider_router(parts: AppParts) -> (Router, Arc<HealthzGeoRouter>) {
    let AppParts { config, pair, auth_account, logger, db, countries, ip_info, probe, env, i18n, version } = parts;
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
    let admin_key = |pair: Option<KeyringPair>| pair.map(|pair| Arc::new(pair) as Arc<dyn AdminKey>);
    let auth: AuthState = AuthState {
        pair: admin_key(pair),
        auth_account: admin_key(auth_account),
        options: admin_auth_options(env.as_ref(), Some(&config.host)),
    };
    let pipeline_state: Arc<PipelineState> = Arc::new(PipelineState { limiters, logger: logger.clone(), node_env, ip_info });
    let rest: Router = pipeline(pipeline_state, request_logger(parse_log_level(Some(&config.log_level), LogLevel::Info)), i18n, auth);
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

/// The environment made ready, then the API served on `port` (else the configured one) until
/// the process is told to stop.
pub async fn start(mut env: ProviderEnvironment, port: Option<u16>) -> Result<(), String> {
    env.is_ready().await.map_err(|error| error.to_string())?;
    let logger: Logger = env.logger.clone();
    logger.info(|| LogRecord::msg("Starting Prosopo API"));
    logger.info(|| {
        LogRecord::msg("Start-up cleanup, the frictionless ladder migration and the schedulers are left to the Node provider while both run")
    });
    let port: u16 = match (port, &env.config.server) {
        (Some(port), _) => port,
        (None, Some(server)) => {
            let configured: f64 = server.port.get();
            u16::try_from(configured as i64).ok().filter(|port| f64::from(*port) == configured).ok_or_else(|| format!("invalid port {configured}"))?
        }
        (None, None) => 0,
    };
    let env: Arc<ProviderEnvironment> = Arc::new(env);
    let (app, geo) = provider_router(AppParts {
        config: env.config.clone(),
        pair: env.pair.clone(),
        auth_account: env.auth_account.clone(),
        logger: logger.clone(),
        db: env.db.clone(),
        countries: Arc::new(EnvironmentCountries(env.clone())),
        ip_info: Some(Arc::new(EnvironmentIpInfo(env.clone()))),
        probe: fetch_healthz_probe(),
        env: Arc::new(|name: &str| std::env::var(name).ok()),
        i18n: locales(),
        version: version(),
    });
    geo.start();
    let listener: TcpListener = listen(port).await.map_err(|error| format!("cannot listen on port {port}: {error}"))?;
    logger.info(|| LogRecord::msg("Prosopo app listening").with_data(json!({ "apiPort": port })));
    let served = axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>()).with_graceful_shutdown(shutdown_signal()).await;
    geo.stop();
    served.map_err(|error| error.to_string())
}
