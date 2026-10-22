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

//! decisionMachineRunner.ts's `decide`, as far as the Rust can take it. The TS allows when no
//! machine applies, when the lookup fails, or when the machine's runtime is not `node`. A
//! `node` machine is operator JavaScript the Rust cannot run, so where one applies the
//! verify fails rather than skip it: allowing what the machine might deny would let through
//! what the TS stops.

use prosopo_database::clients::DecisionMachineArtifact;
use prosopo_database::provider::ProviderDatabase;
use prosopo_logger::{LogRecord, Logger};
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::decision_machine::{DecisionMachineKind, DecisionMachineScope};
use serde_json::json;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

const DEFAULT_ARTIFACT_CACHE_TTL: Duration = Duration::from_millis(5 * 60 * 1000);

/// `ARTIFACT_CACHE_TTL_MS`: `DECISION_MACHINE_ARTIFACT_CACHE_TTL_MS`, unless it is not a
/// positive number of milliseconds.
pub fn artifact_cache_ttl(variable: Option<&str>) -> Duration {
    let millis: f64 = prosopo_util::parse_int(variable.unwrap_or_default(), 10);
    if millis.is_nan() || millis == 0.0 {
        return DEFAULT_ARTIFACT_CACHE_TTL;
    }
    Duration::from_millis(millis.max(0.0) as u64)
}

/// A decision machine applies that only Node can run.
#[derive(Debug, Clone, PartialEq)]
pub struct UnsupportedDecisionMachine {
    pub scope: DecisionMachineScope,
}

impl std::fmt::Display for UnsupportedDecisionMachine {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "a {} decision machine applies, and the Rust provider cannot run one", self.scope.as_str())
    }
}

type CacheKey = (DecisionMachineScope, Option<String>);

/// The decide phase's artifact lookup, cached per scope (and site) as the TS caches it, absent
/// artifacts included.
pub struct DecisionGate {
    db: Arc<ProviderDatabase>,
    ttl: Duration,
    cache: Mutex<HashMap<CacheKey, (Instant, Option<DecisionMachineArtifact>)>>,
}

impl DecisionGate {
    pub fn new(db: Arc<ProviderDatabase>, ttl: Duration) -> DecisionGate {
        DecisionGate { db, ttl, cache: Mutex::new(HashMap::new()) }
    }

    fn cached(&self, key: &CacheKey) -> Option<Option<DecisionMachineArtifact>> {
        let cache = self.cache.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        cache.get(key).filter(|(at, _)| at.elapsed() <= self.ttl).map(|(_, artifact)| artifact.clone())
    }

    async fn artifact(&self, scope: DecisionMachineScope, dapp: Option<&str>) -> Result<Option<DecisionMachineArtifact>, String> {
        let key: CacheKey = (scope, dapp.map(str::to_string));
        if let Some(artifact) = self.cached(&key) {
            return Ok(artifact);
        }
        let artifact: Option<DecisionMachineArtifact> =
            self.db.get_decision_machine_artifact(scope, dapp, Some(DecisionMachineKind::Decision)).await.map_err(|error| error.to_string())?;
        let mut cache = self.cache.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        cache.insert(key, (Instant::now(), artifact.clone()));
        Ok(artifact)
    }

    /// The site's machine, else the global one, each only if it covers the captcha type.
    async fn select(&self, dapp: &str, captcha_type: CaptchaType) -> Result<Option<DecisionMachineArtifact>, String> {
        let (site, global) = futures_util::join!(self.artifact(DecisionMachineScope::Dapp, Some(dapp)), self.artifact(DecisionMachineScope::Global, None));
        let covers = |artifact: &DecisionMachineArtifact| artifact.captcha_type.is_none_or(|only| only == captcha_type);
        Ok(site?.filter(covers).or(global?.filter(covers)))
    }

    /// `decide` for the verify phase: allowed, unless a machine applies.
    pub async fn decide(&self, dapp: &str, captcha_type: CaptchaType, logger: &Logger) -> Result<(), UnsupportedDecisionMachine> {
        match self.select(dapp, captcha_type).await {
            Ok(None) => Ok(()),
            Ok(Some(artifact)) => {
                logger.error(|| {
                    LogRecord::msg("Decision machine cannot run in the Rust provider, failing verification")
                        .with_data(json!({ "dappAccount": dapp, "scope": artifact.scope.as_str() }))
                });
                Err(UnsupportedDecisionMachine { scope: artifact.scope })
            }
            Err(error) => {
                logger.error(|| LogRecord::msg("Decision machine failed, defaulting to allow").with_err(error).with_data(json!({ "dappAccount": dapp })));
                Ok(())
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_the_ttl_as_the_ts_does() {
        assert_eq!(artifact_cache_ttl(None), DEFAULT_ARTIFACT_CACHE_TTL);
        assert_eq!(artifact_cache_ttl(Some("0")), DEFAULT_ARTIFACT_CACHE_TTL);
        assert_eq!(artifact_cache_ttl(Some("x")), DEFAULT_ARTIFACT_CACHE_TTL);
        assert_eq!(artifact_cache_ttl(Some("1500ms")), Duration::from_millis(1500));
    }
}
