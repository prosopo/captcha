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

//! `IpInfoService`: ipapi.is for its threat data when configured, MaxMind as the fallback
//! and for the network-free country lookup.

use crate::ipapi::{IpapiBackend, IpapiBackendConfig};
use crate::maxmind::{MaxMindBackend, MaxMindBackendConfig};
use crate::non_routable::is_non_routable;
use prosopo_logger::{LogRecord, Logger};
use prosopo_types::ipapi::IpInfoResponse;
use serde_json::json;
use std::future::Future;
use std::path::PathBuf;
use std::pin::Pin;

pub type BackendError = Box<dyn std::error::Error + Send + Sync>;

/// What the service needs of the MaxMind backend.
pub trait LocalBackend: Send + Sync {
    fn initialize(&mut self) -> Result<(), BackendError>;
    fn is_available(&self) -> bool;
    fn lookup(&self, ip: &str) -> IpInfoResponse;
    fn country_code(&self, ip: &str) -> Option<String>;
}

pub type LookupFuture<'a> = Pin<Box<dyn Future<Output = IpInfoResponse> + Send + 'a>>;

/// What the service needs of the ipapi.is backend.
pub trait RemoteBackend: Send + Sync {
    fn is_available(&self) -> bool;
    fn lookup<'a>(&'a self, ip: &'a str) -> LookupFuture<'a>;
}

impl LocalBackend for MaxMindBackend {
    fn initialize(&mut self) -> Result<(), BackendError> {
        MaxMindBackend::initialize(self);
        Ok(())
    }

    fn is_available(&self) -> bool {
        MaxMindBackend::is_available(self)
    }

    fn lookup(&self, ip: &str) -> IpInfoResponse {
        MaxMindBackend::lookup(self, ip)
    }

    fn country_code(&self, ip: &str) -> Option<String> {
        MaxMindBackend::country_code(self, ip)
    }
}

impl RemoteBackend for IpapiBackend {
    fn is_available(&self) -> bool {
        IpapiBackend::is_available(self)
    }

    fn lookup<'a>(&'a self, ip: &'a str) -> LookupFuture<'a> {
        Box::pin(IpapiBackend::lookup(self, ip))
    }
}

#[derive(Default)]
pub struct IpInfoServiceConfig {
    pub maxmind_city_db_path: Option<PathBuf>,
    pub maxmind_asn_db_path: Option<PathBuf>,
    pub ipapi_url: Option<String>,
    pub ipapi_key: Option<String>,
    pub logger: Option<Logger>,
}

/// The backends, injected so the routing can be tested without a database or the network.
/// Absent means not configured, which is distinct from configured but unavailable.
#[derive(Default)]
pub struct IpInfoBackends {
    pub maxmind: Option<Box<dyn LocalBackend>>,
    pub ipapi: Option<Box<dyn RemoteBackend>>,
}

pub struct IpInfoService {
    maxmind: Option<Box<dyn LocalBackend>>,
    ipapi: Option<Box<dyn RemoteBackend>>,
    logger: Option<Logger>,
}

impl IpInfoService {
    pub fn new(config: IpInfoServiceConfig) -> IpInfoService {
        let maxmind: Option<Box<dyn LocalBackend>> = (config.maxmind_city_db_path.is_some()
            || config.maxmind_asn_db_path.is_some())
        .then(|| {
            Box::new(MaxMindBackend::new(MaxMindBackendConfig {
                city_db_path: config.maxmind_city_db_path.clone(),
                asn_db_path: config.maxmind_asn_db_path.clone(),
                logger: config.logger.clone(),
                open_reader: None,
            })) as Box<dyn LocalBackend>
        });
        let ipapi: Option<Box<dyn RemoteBackend>> = config
            .ipapi_url
            .clone()
            .filter(|url| !url.is_empty())
            .map(|base_url| {
                Box::new(IpapiBackend::new(IpapiBackendConfig {
                    base_url,
                    api_key: config.ipapi_key.clone(),
                    logger: config.logger.clone(),
                    fetch: None,
                    timeout_ms: None,
                })) as Box<dyn RemoteBackend>
            });
        IpInfoService {
            maxmind,
            ipapi,
            logger: config.logger,
        }
    }

    pub fn with_backends(logger: Option<Logger>, backends: IpInfoBackends) -> IpInfoService {
        IpInfoService {
            maxmind: backends.maxmind,
            ipapi: backends.ipapi,
            logger,
        }
    }

    /// Opens the MaxMind databases; ipapi.is needs no set-up.
    pub fn initialize(&mut self) -> Result<(), BackendError> {
        if let Some(maxmind) = self.maxmind.as_mut() {
            maxmind.initialize()?;
        }
        if let Some(logger) = &self.logger {
            let maxmind_available: bool = self
                .maxmind
                .as_ref()
                .is_some_and(|backend| backend.is_available());
            let ipapi_available: bool = self
                .ipapi
                .as_ref()
                .is_some_and(|backend| backend.is_available());
            logger.info(|| {
                LogRecord::msg("IpInfoService initialized").with_data(json!({
                    "maxmindAvailable": maxmind_available,
                    "ipapiAvailable": ipapi_available,
                }))
            });
        }
        Ok(())
    }

    pub fn is_available(&self) -> bool {
        self.maxmind
            .as_ref()
            .is_some_and(|backend| backend.is_available())
            || self
                .ipapi
                .as_ref()
                .is_some_and(|backend| backend.is_available())
    }

    fn available_maxmind(&self) -> Option<&dyn LocalBackend> {
        self.maxmind
            .as_deref()
            .filter(|maxmind| maxmind.is_available())
    }

    /// The country from the local MaxMind database only: synchronous, network-free, and
    /// `None` whenever there is no answer.
    pub fn country(&self, ip: &str) -> Option<String> {
        if is_non_routable(ip) {
            return None;
        }
        self.available_maxmind()?.country_code(ip)
    }

    pub async fn lookup(&self, ip: &str) -> IpInfoResponse {
        if is_non_routable(ip) {
            return IpInfoResponse::error("Non-routable IP address", ip);
        }
        if let Some(ipapi) = self.ipapi.as_deref().filter(|ipapi| ipapi.is_available()) {
            let result: IpInfoResponse = ipapi.lookup(ip).await;
            if result.is_valid() {
                return result;
            }
            if let (Some(logger), IpInfoResponse::Invalid(error)) = (&self.logger, &result) {
                logger.debug(|| {
                    LogRecord::msg("ipapi.is lookup failed, falling back to MaxMind")
                        .with_data(json!({ "ip": ip, "error": error.error }))
                });
            }
            return match self.available_maxmind() {
                Some(maxmind) => maxmind.lookup(ip),
                None => result,
            };
        }
        match self.available_maxmind() {
            Some(maxmind) => maxmind.lookup(ip),
            None => IpInfoResponse::error("No IP info backend available", ip),
        }
    }
}
