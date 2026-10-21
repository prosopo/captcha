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

//! `ClientDatabase` (client.ts): the portal's accounts, read for the sites whose settings
//! changed.

use crate::clients::ClientRecord;
use crate::connection::{raw_error, ManagedConnection, Target};
use crate::mongo::MongoDatabase;
use crate::operation::{Executor, Operation};
use crate::source::{Source, SourceIds};
use bson::{doc, Bson, Document};
use prosopo_common::ProsopoError;
use prosopo_logger::Logger;
use prosopo_types::client::Tier;
use prosopo_types_database::client::ACCOUNT;
use prosopo_types_database::number::as_js_number;
use prosopo_types_database::update::cast_filter;
use std::sync::Arc;

pub const ACCOUNTS: &str = "accounts";

pub struct ClientDatabase {
    connection: ManagedConnection,
    source: Arc<dyn Source>,
    logger: Logger,
}

impl ClientDatabase {
    pub fn new(mongo: MongoDatabase, source: Arc<dyn Source>, logger: Logger) -> ClientDatabase {
        ClientDatabase::with_target(Target::Mongo(mongo), source, logger)
    }

    pub fn with_executor(executor: Arc<dyn Executor>, source: Arc<dyn Source>, logger: Logger) -> ClientDatabase {
        ClientDatabase::with_target(Target::Fixed(executor), source, logger)
    }

    fn with_target(target: Target, source: Arc<dyn Source>, logger: Logger) -> ClientDatabase {
        ClientDatabase {
            connection: ManagedConnection::new(target, vec![(ACCOUNTS, &ACCOUNT)]),
            source,
            logger,
        }
    }

    /// `getUpdatedClients`: one record per site of an account with an active user, for each
    /// site changed after `updated_at` (or never stamped), on a connection opened for the
    /// purpose and closed after. A site without a site key or settings is left out, as is an
    /// account whose tier is not one the provider knows.
    pub async fn get_updated_clients(&self, updated_at: f64) -> Result<Vec<ClientRecord>, ProsopoError> {
        self.connection.connect(&self.logger).await?;
        let read: Result<Vec<Document>, ProsopoError> = self.read_accounts(updated_at).await;
        self.connection.close().await;
        Ok(read?.iter().flat_map(|account| updated_sites(account, updated_at)).collect())
    }

    async fn read_accounts(&self, updated_at: f64) -> Result<Vec<Document>, ProsopoError> {
        let filter: Document = cast_filter(
            &ACCOUNT,
            &doc! {
                "$or": [
                    { "sites.updatedAt": { "$gt": updated_at } },
                    { "sites.updatedAt": { "$exists": false } },
                ],
                "users.status": "active",
            },
            false,
            &mut SourceIds(self.source.as_ref()),
        )
        .map_err(raw_error)?;
        let projection: Document = doc! { "tier": 1, "sites.siteKey": 1, "sites.settings": 1, "sites.updatedAt": 1 };
        let executor: Arc<dyn Executor> = self.connection.executor().await?;
        let reply = executor.run(Operation::find(ACCOUNTS, filter).with_projection(projection)).await.map_err(raw_error)?;
        Ok(reply.documents())
    }
}

/// The account's sites the sweep carries: `account.sites` is an array, flattened site by site.
fn updated_sites(account: &Document, updated_at: f64) -> Vec<ClientRecord> {
    let Some(tier) = account.get_str("tier").ok().and_then(|tier| tier.parse::<Tier>().ok()) else {
        return Vec::new();
    };
    let sites: &[Bson] = account.get_array("sites").map(Vec::as_slice).unwrap_or_default();
    sites
        .iter()
        .filter_map(Bson::as_document)
        .filter_map(|site| {
            let site_key: &str = site.get_str("siteKey").ok().filter(|key| !key.is_empty())?;
            let settings: &Document = site.get_document("settings").ok()?;
            let is_new: bool = match site.get("updatedAt") {
                None => true,
                Some(stamp) => as_js_number(stamp).is_some_and(|stamp| stamp > updated_at),
            };
            is_new.then(|| ClientRecord {
                account: Some(site_key.to_string()),
                settings: Some(settings.clone()),
                tier,
            })
        })
        .collect()
}
