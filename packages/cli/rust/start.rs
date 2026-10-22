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

use prosopo_env::ProviderEnvironment;
use prosopo_logger::{LogRecord, Logger};
use prosopo_provider::api::healthz_geo::{fetch_healthz_probe, read_healthz_geo_config, CountryLookup, HealthzGeoRouter};
use prosopo_provider::api::metrics::{metrics_enabled, ProcessSource, ProviderMetrics};
use prosopo_provider::api::provider_app;
use prosopo_provider::api::public::{DatabaseRedisStatuses, EnvReader, PublicState};
use serde_json::json;
use std::net::{Ipv4Addr, Ipv6Addr, SocketAddr};
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
    let process_env: EnvReader = Arc::new(|name: &str| std::env::var(name).ok());
    let geo_config = read_healthz_geo_config(process_env.as_ref(), Some(&logger));
    let geo: Arc<HealthzGeoRouter> = Arc::new(HealthzGeoRouter::with_probe(
        geo_config,
        Arc::new(EnvironmentCountries(env.clone())),
        fetch_healthz_probe(),
        Some(logger.clone()),
    ));
    geo.start();
    let metrics: Option<Arc<ProviderMetrics>> = metrics_enabled(process_env.as_ref())
        .then(|| Arc::new(ProviderMetrics::new(std::env::var("MAINTENANCE_MODE").ok().as_deref(), ProcessSource::current())));
    let state: PublicState = PublicState {
        host: env.config.host.clone(),
        version: version(),
        geo: geo.clone(),
        redis: Arc::new(DatabaseRedisStatuses(env.db.clone())),
        logger: logger.clone(),
        metrics,
        env: process_env,
    };
    let listener: TcpListener = listen(port).await.map_err(|error| format!("cannot listen on port {port}: {error}"))?;
    logger.info(|| LogRecord::msg("Prosopo app listening").with_data(json!({ "apiPort": port })));
    let served = axum::serve(listener, provider_app(Arc::new(state)).into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(shutdown_signal())
        .await;
    geo.stop();
    served.map_err(|error| error.to_string())
}
