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

//! decisionMachineRunner.ts's artifact selection, as far as the Rust can take it. The TS
//! allows (or keeps the routing baseline) when no machine applies, when the lookup fails, or
//! when the machine's runtime is not `node`. A `node` machine is operator JavaScript the Rust
//! cannot run, so where one applies the request fails rather than skip it: allowing what the
//! machine might deny, or serving the baseline where it might escalate, would let through what
//! the TS stops.
//!
//! Nothing is cached between requests: the TS builds a runner, and with it its artifact cache,
//! for every request, so each request reads the artifacts afresh.

use prosopo_database::clients::DecisionMachineArtifact;
use prosopo_database::provider::ProviderDatabase;
use prosopo_logger::{LogRecord, Logger};
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::decision_machine::{DecisionMachineKind, DecisionMachineScope};
use serde_json::json;
use std::sync::Arc;

/// A machine applies that only Node can run.
#[derive(Debug, Clone, PartialEq)]
pub struct UnsupportedDecisionMachine {
    pub scope: DecisionMachineScope,
    pub kind: DecisionMachineKind,
}

impl std::fmt::Display for UnsupportedDecisionMachine {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "a {} {} machine applies, and the Rust provider cannot run one", self.scope.as_str(), self.kind.as_str())
    }
}

/// The artifact lookups of `decide` and `route`.
pub struct DecisionGate {
    db: Arc<ProviderDatabase>,
}

impl DecisionGate {
    pub fn new(db: Arc<ProviderDatabase>) -> DecisionGate {
        DecisionGate { db }
    }

    async fn artifact(&self, scope: DecisionMachineScope, dapp: Option<&str>, kind: DecisionMachineKind) -> Result<Option<DecisionMachineArtifact>, String> {
        self.db.get_decision_machine_artifact(scope, dapp, Some(kind)).await.map_err(|error| error.to_string())
    }

    /// `selectArtifact`: the site's machine, else the global one, each only if it covers the
    /// captcha type. A machine limited to a type never covers a lookup for no type.
    async fn select(&self, dapp: &str, kind: DecisionMachineKind, captcha_type: Option<CaptchaType>) -> Result<Option<DecisionMachineArtifact>, String> {
        let (site, global) = futures_util::join!(self.artifact(DecisionMachineScope::Dapp, Some(dapp), kind), self.artifact(DecisionMachineScope::Global, None, kind));
        let covers = |artifact: &DecisionMachineArtifact| artifact.captcha_type.is_none() || artifact.captcha_type == captcha_type;
        Ok(site?.filter(covers).or(global?.filter(covers)))
    }

    /// `decide` for the verify phase: allowed, unless a machine applies.
    pub async fn decide(&self, dapp: &str, captcha_type: CaptchaType, logger: &Logger) -> Result<(), UnsupportedDecisionMachine> {
        match self.select(dapp, DecisionMachineKind::Decision, Some(captcha_type)).await {
            Ok(None) => Ok(()),
            Ok(Some(artifact)) => {
                logger.error(|| {
                    LogRecord::msg("Decision machine cannot run in the Rust provider, failing verification")
                        .with_data(json!({ "dappAccount": dapp, "scope": artifact.scope.as_str() }))
                });
                Err(UnsupportedDecisionMachine { scope: artifact.scope, kind: DecisionMachineKind::Decision })
            }
            Err(error) => {
                logger.error(|| LogRecord::msg("Decision machine failed, defaulting to allow").with_err(error).with_data(json!({ "dappAccount": dapp })));
                Ok(())
            }
        }
    }

    /// `applyRouter`'s machine: the baseline stands, unless a routing machine applies.
    pub async fn route(&self, dapp: &str, logger: &Logger) -> Result<(), UnsupportedDecisionMachine> {
        match self.select(dapp, DecisionMachineKind::Routing, None).await {
            Ok(None) => Ok(()),
            Ok(Some(artifact)) => {
                logger.error(|| {
                    LogRecord::msg("Routing machine cannot run in the Rust provider, failing the request")
                        .with_data(json!({ "dappAccount": dapp, "scope": artifact.scope.as_str() }))
                });
                Err(UnsupportedDecisionMachine { scope: artifact.scope, kind: DecisionMachineKind::Routing })
            }
            Err(error) => {
                logger.warn(|| LogRecord::msg("requiredCounters() failed, proceeding with no counters").with_err(error.clone()).with_data(json!({ "dappAccount": dapp })));
                logger.error(|| LogRecord::msg("Routing machine failed, falling back to baseline").with_err(error).with_data(json!({ "dappAccount": dapp })));
                Ok(())
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use bson::{doc, Document};
    use prosopo_database::operation::{Executor, Operation, Reply, ReplyFuture};
    use prosopo_database::source::SystemSource;
    use prosopo_logger::{get_logger, LogLevel};
    use std::sync::Mutex;

    /// The decision machine collection: each stored artifact is found by its scope, site and
    /// kind, as the query filters them.
    #[derive(Default)]
    struct Artifacts {
        stored: Mutex<Vec<Document>>,
        down: bool,
    }

    impl Artifacts {
        fn store(&self, scope: &str, dapp: Option<&str>, kind: &str, captcha_type: Option<&str>) {
            let now: bson::DateTime = bson::DateTime::from_millis(1_700_000_000_000);
            let mut artifact: Document = doc! { "scope": scope, "kind": kind, "runtime": "node", "source": "module.exports = {}", "createdAt": now, "updatedAt": now };
            if let Some(dapp) = dapp {
                artifact.insert("dappAccount", dapp);
            }
            if let Some(captcha_type) = captcha_type {
                artifact.insert("captchaType", captcha_type);
            }
            self.stored.lock().expect("unpoisoned").push(artifact);
        }
    }

    impl Executor for Artifacts {
        fn run(&self, operation: Operation) -> ReplyFuture<'_> {
            if self.down {
                return Box::pin(async { Err(prosopo_database::mongo::MongoError::Unavailable("down".into())) });
            }
            let found: Vec<Document> = match operation {
                Operation::Find { filter, .. } => self
                    .stored
                    .lock()
                    .expect("unpoisoned")
                    .iter()
                    .filter(|artifact| {
                        artifact.get_str("scope").ok() == filter.get_str("scope").ok()
                            && artifact.get_str("kind").ok() == filter.get_str("kind").ok()
                            && artifact.get_str("dappAccount").ok() == filter.get_str("dappAccount").ok()
                    })
                    .cloned()
                    .collect(),
                _ => Vec::new(),
            };
            Box::pin(async move { Ok(Reply::Documents(found)) })
        }
    }

    fn gate(artifacts: Arc<Artifacts>) -> DecisionGate {
        DecisionGate::new(Arc::new(ProviderDatabase::new(artifacts, Arc::new(SystemSource), get_logger(LogLevel::Error, "test"))))
    }

    fn logger() -> Logger {
        get_logger(LogLevel::Error, "test")
    }

    #[tokio::test]
    async fn keeps_the_baseline_when_no_routing_machine_applies() {
        let artifacts: Arc<Artifacts> = Arc::new(Artifacts::default());
        artifacts.store("global", None, "decision", None);
        artifacts.store("dapp", Some("other-site"), "routing", None);
        artifacts.store("global", None, "routing", Some("image"));
        assert_eq!(gate(artifacts).route("site", &logger()).await, Ok(()));
    }

    #[tokio::test]
    async fn refuses_where_a_routing_machine_applies_the_sites_before_the_global_one() {
        let artifacts: Arc<Artifacts> = Arc::new(Artifacts::default());
        artifacts.store("global", None, "routing", None);
        let gate: DecisionGate = gate(artifacts.clone());
        assert_eq!(gate.route("site", &logger()).await, Err(UnsupportedDecisionMachine { scope: DecisionMachineScope::Global, kind: DecisionMachineKind::Routing }));
        artifacts.store("dapp", Some("site"), "routing", None);
        assert_eq!(gate.route("site", &logger()).await, Err(UnsupportedDecisionMachine { scope: DecisionMachineScope::Dapp, kind: DecisionMachineKind::Routing }));
    }

    #[tokio::test]
    async fn keeps_the_baseline_when_the_lookup_fails() {
        let artifacts: Arc<Artifacts> = Arc::new(Artifacts { down: true, ..Artifacts::default() });
        assert_eq!(gate(artifacts.clone()).route("site", &logger()).await, Ok(()));
        assert_eq!(gate(artifacts).decide("site", CaptchaType::Pow, &logger()).await, Ok(()));
    }

    #[tokio::test]
    async fn a_decision_machine_limited_to_a_type_applies_to_that_type_only() {
        let artifacts: Arc<Artifacts> = Arc::new(Artifacts::default());
        artifacts.store("global", None, "decision", Some("pow"));
        let gate: DecisionGate = gate(artifacts);
        assert_eq!(gate.decide("site", CaptchaType::Image, &logger()).await, Ok(()));
        assert!(gate.decide("site", CaptchaType::Pow, &logger()).await.is_err());
    }

    #[tokio::test]
    async fn reads_the_artifacts_afresh_for_every_request() {
        let artifacts: Arc<Artifacts> = Arc::new(Artifacts::default());
        let gate: DecisionGate = gate(artifacts.clone());
        assert_eq!(gate.decide("site", CaptchaType::Pow, &logger()).await, Ok(()));
        artifacts.store("global", None, "decision", None);
        assert!(gate.decide("site", CaptchaType::Pow, &logger()).await.is_err());
    }
}
