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

//! What the provider holds per client: its settings, its decision machines, and the spam email
//! domains it refuses (provider.ts).

use crate::operation::{Operation, Reply, UpdateStatement};
use crate::provider::{collections, db_error, decode, ProviderDatabase};
use crate::source::SourceIds;
use bson::oid::ObjectId;
use bson::{doc, Bson, DateTime, Document};
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_logger::LogRecord;
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::client::Tier;
use prosopo_types::decision_machine::{DecisionMachineKind, DecisionMachineLanguage, DecisionMachineRuntime, DecisionMachineScope};
use prosopo_types::settings_types::UserSettings;
use prosopo_types_database::provider::{CLIENT_RECORD, DECISION_MACHINE_ARTIFACT_RECORD, SPAM_EMAIL_DOMAIN_RECORD};
use prosopo_types_database::update::{cast_filter, UpdateMethod};
use prosopo_util::build_domain_suffix_candidates;
use serde::Deserialize;

const MAX_DOMAIN_SUFFIX_CANDIDATES: usize = 5;

/// `IUserDataSlim`: a client as the provider stores it. Its settings are kept as stored: a
/// record written before a setting existed lacks it, and the TS hands such a record back as it
/// is, for its readers to fill in.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientRecord {
    #[serde(default)]
    pub account: Option<String>,
    #[serde(default)]
    pub settings: Option<Document>,
    pub tier: Tier,
}

impl ClientRecord {
    pub fn new(account: &str, settings: &UserSettings, tier: Tier) -> Result<ClientRecord, bson::error::Error> {
        Ok(ClientRecord {
            account: Some(account.to_string()),
            settings: Some(bson::serialize_to_document(settings)?),
            tier,
        })
    }
}

/// `DecisionMachineArtifact`, and when read back, its id.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DecisionMachineArtifact {
    #[serde(rename = "_id", default)]
    pub id: Option<ObjectId>,
    pub scope: DecisionMachineScope,
    #[serde(default)]
    pub dapp_account: Option<String>,
    #[serde(default)]
    pub kind: Option<DecisionMachineKind>,
    pub runtime: DecisionMachineRuntime,
    #[serde(default)]
    pub language: Option<DecisionMachineLanguage>,
    pub source: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub captcha_type: Option<CaptchaType>,
    pub created_at: DateTime,
    pub updated_at: DateTime,
}

/// `SpamEmailDomain`.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct SpamEmailDomain {
    pub domain: String,
}

/// One entry of `bulkUpdateSpamEmailDomains`: the domain matched, and the domain set.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SpamEmailDomainUpdate {
    pub filter: String,
    pub update: String,
}

fn or_undefined<T: Into<Bson>>(value: Option<T>) -> Bson {
    value.map(Into::into).unwrap_or(Bson::Undefined)
}

impl ProviderDatabase {
    /// `updateClientRecords`: each client upserted by account. A record without an account is
    /// refused and logged: its upsert would match nothing and insert under no account.
    pub async fn update_client_records(&self, records: &[ClientRecord]) -> Result<(), ProsopoError> {
        let usable: Vec<&ClientRecord> = records.iter().filter(|record| record.account.as_deref().is_some_and(|account| !account.is_empty())).collect();
        let skipped: usize = records.len() - usable.len();
        if skipped > 0 {
            self.logger().error(|| {
                LogRecord::msg("Refusing to upsert client records with no account")
                    .with_data(serde_json::json!({ "skipped": skipped, "received": records.len() }))
            });
        }
        if usable.is_empty() {
            self.logger().debug(|| LogRecord::msg("No client updates to apply"));
            return Ok(());
        }
        let mut statements: Vec<UpdateStatement> = Vec::new();
        for record in usable {
            let settings: Bson = record.settings.clone().map(Bson::Document).unwrap_or(Bson::Undefined);
            let account: &str = record.account.as_deref().unwrap_or_default();
            statements.push(
                self.statement(
                    &CLIENT_RECORD,
                    UpdateMethod::BulkWriteUpdateOne,
                    doc! { "account": account },
                    doc! { "$set": { "account": account, "settings": settings, "tier": record.tier.as_str() } },
                    true,
                )
                .map_err(|error| db_error("DATABASE.QUERY_ERROR", ErrorContext::new().with("error", error), None))?,
            );
        }
        self.run(Operation::update(collections::CLIENT, statements)).await?;
        Ok(())
    }

    /// `removeClientRecords`.
    pub async fn remove_client_records(&self, accounts: &[String]) -> Result<(), ProsopoError> {
        if accounts.is_empty() {
            return Ok(());
        }
        let filter: Document = self.filter(&CLIENT_RECORD, doc! { "account": { "$in": accounts } });
        self.run(Operation::Delete {
            collection: collections::CLIENT.to_string(),
            filter,
            many: true,
        })
        .await?;
        Ok(())
    }

    /// `getAllClientRecords`.
    pub async fn get_all_client_records(&self) -> Result<Vec<ClientRecord>, ProsopoError> {
        let documents: Vec<Document> = self.find(Operation::find(collections::CLIENT, Document::new())).await?;
        Ok(documents.into_iter().filter_map(decode).collect())
    }

    /// `getClientRecord`.
    pub async fn get_client_record(&self, account: &str) -> Result<Option<ClientRecord>, ProsopoError> {
        let filter: Document = self.filter(&CLIENT_RECORD, doc! { "account": account });
        let operation: Operation = Operation::find(collections::CLIENT, filter)
            .with_projection(doc! { "account": 1, "settings": 1, "tier": 1 })
            .with_limit(1);
        Ok(self.find(operation).await?.into_iter().next().and_then(decode))
    }

    /// `upsertDecisionMachineArtifact`: one artifact per scope, dapp account and kind, the
    /// routing kind when none is given. Its own times are not used.
    pub async fn upsert_decision_machine_artifact(&self, artifact: &DecisionMachineArtifact) -> Result<(), ProsopoError> {
        let now: DateTime = self.source().now();
        let dapp_account: Bson = artifact.dapp_account.as_deref().map(Bson::from).unwrap_or(Bson::Null);
        let kind: &str = artifact.kind.unwrap_or(DecisionMachineKind::Routing).as_str();
        let statement: UpdateStatement = self
            .statement(
                &DECISION_MACHINE_ARTIFACT_RECORD,
                UpdateMethod::UpdateOne,
                doc! { "scope": artifact.scope.as_str(), "dappAccount": dapp_account.clone(), "kind": kind },
                doc! {
                    "$set": {
                        "scope": artifact.scope.as_str(),
                        "dappAccount": dapp_account,
                        "kind": kind,
                        "runtime": artifact.runtime.as_str(),
                        "language": or_undefined(artifact.language.map(|language| language.as_str())),
                        "source": artifact.source.as_str(),
                        "name": or_undefined(artifact.name.as_deref()),
                        "version": or_undefined(artifact.version.as_deref()),
                        "captchaType": or_undefined(artifact.captcha_type.map(|kind| kind.as_str())),
                        "updatedAt": now,
                    },
                    "$setOnInsert": { "createdAt": now },
                },
                true,
            )
            .map_err(|error| db_error("DATABASE.QUERY_ERROR", ErrorContext::new().with("error", error), None))?;
        self.run(Operation::update(collections::DECISION_MACHINE, vec![statement])).await?;
        Ok(())
    }

    /// `getDecisionMachineArtifact`: the artifact of that scope and dapp account (none for the
    /// global scope), of that kind if one is given.
    pub async fn get_decision_machine_artifact(&self, scope: DecisionMachineScope, dapp_account: Option<&str>, kind: Option<DecisionMachineKind>) -> Result<Option<DecisionMachineArtifact>, ProsopoError> {
        let mut filter: Document = doc! { "scope": scope.as_str(), "dappAccount": dapp_account.map(Bson::from).unwrap_or(Bson::Null) };
        if let Some(kind) = kind {
            filter.insert("kind", kind.as_str());
        }
        let filter: Document = self.filter(&DECISION_MACHINE_ARTIFACT_RECORD, filter);
        Ok(self
            .find(Operation::find(collections::DECISION_MACHINE, filter).with_limit(1))
            .await?
            .into_iter()
            .next()
            .and_then(decode))
    }

    /// `getAllDecisionMachineArtifacts`.
    pub async fn get_all_decision_machine_artifacts(&self) -> Result<Vec<DecisionMachineArtifact>, ProsopoError> {
        let documents: Vec<Document> = self.find(Operation::find(collections::DECISION_MACHINE, Document::new())).await?;
        Ok(documents.into_iter().filter_map(decode).collect())
    }

    /// The filter on `_id` as mongoose casts it. An id that is not an ObjectId fails with
    /// mongoose's own `CastError`, which the TS lets through unwrapped and unlogged.
    fn by_artifact_id(&self, id: &str) -> Result<Document, ProsopoError> {
        cast_filter(&DECISION_MACHINE_ARTIFACT_RECORD, &doc! { "_id": id }, false, &mut SourceIds(self.source())).map_err(|_| {
            ProsopoError::new(
                ErrorClass::Db,
                ErrorSource::message(format!(
                    "Cast to ObjectId failed for value \"{id}\" (type string) at path \"_id\" for model \"DecisionMachine\""
                )),
                ErrorOptions {
                    name: Some("CastError".to_string()),
                    silent: true,
                    ..ErrorOptions::default()
                },
            )
        })
    }

    /// `getDecisionMachineArtifactById`.
    pub async fn get_decision_machine_artifact_by_id(&self, id: &str) -> Result<Option<DecisionMachineArtifact>, ProsopoError> {
        let filter: Document = self.by_artifact_id(id)?;
        Ok(self
            .find(Operation::find(collections::DECISION_MACHINE, filter).with_limit(1))
            .await?
            .into_iter()
            .next()
            .and_then(decode))
    }

    async fn remove_artifacts(&self, filter: Document, many: bool) -> Result<u64, ProsopoError> {
        let reply: Reply = self
            .run(Operation::Delete {
                collection: collections::DECISION_MACHINE.to_string(),
                filter,
                many,
            })
            .await?;
        Ok(match reply {
            Reply::Delete { deleted } => deleted,
            _ => 0,
        })
    }

    /// `removeDecisionMachineArtifact`: whether there was one to remove.
    pub async fn remove_decision_machine_artifact(&self, id: &str) -> Result<bool, ProsopoError> {
        let filter: Document = self.by_artifact_id(id)?;
        Ok(self.remove_artifacts(filter, false).await? > 0)
    }

    /// `removeAllDecisionMachineArtifacts`: how many were removed.
    pub async fn remove_all_decision_machine_artifacts(&self) -> Result<u64, ProsopoError> {
        self.remove_artifacts(Document::new(), true).await
    }

    /// `getSpamEmailDomain`: the listed domain the given one is, or is under.
    pub async fn get_spam_email_domain(&self, domain: &str) -> Result<Option<SpamEmailDomain>, ProsopoError> {
        let mut candidates: Vec<String> = build_domain_suffix_candidates(domain);
        candidates.truncate(MAX_DOMAIN_SUFFIX_CANDIDATES);
        let query: Document = if candidates.is_empty() { doc! { "domain": domain } } else { doc! { "domain": { "$in": candidates } } };
        let filter: Document = self.filter(&SPAM_EMAIL_DOMAIN_RECORD, query);
        Ok(self
            .find(Operation::find(collections::SPAM_EMAIL_DOMAIN, filter).with_limit(1))
            .await?
            .into_iter()
            .next()
            .and_then(decode))
    }

    /// `bulkUpdateSpamEmailDomains`.
    pub async fn bulk_update_spam_email_domains(&self, domains: &[SpamEmailDomainUpdate], upsert: bool) -> Result<(), ProsopoError> {
        let mut statements: Vec<UpdateStatement> = Vec::new();
        for entry in domains {
            let statement: UpdateStatement = self
                .statement(
                    &SPAM_EMAIL_DOMAIN_RECORD,
                    UpdateMethod::BulkWriteUpdateOne,
                    doc! { "domain": entry.filter.as_str() },
                    doc! { "$set": { "domain": entry.update.as_str() } },
                    upsert,
                )
                .map_err(|error| db_error("DATABASE.QUERY_ERROR", ErrorContext::new().with("error", error), None))?;
            statements.push(if upsert { statement } else { statement.no_upsert() });
        }
        if statements.is_empty() {
            return Ok(());
        }
        self.run(Operation::update(collections::SPAM_EMAIL_DOMAIN, statements)).await?;
        Ok(())
    }
}
