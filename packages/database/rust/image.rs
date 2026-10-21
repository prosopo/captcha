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

//! The image captcha records: commitments, the user's solutions and pending requests
//! (provider.ts).

use crate::captcha::StoredKind;
use crate::challenges::{is_blocking, Coords};
use crate::streamer::MarkStored;
use crate::operation::{Operation, Reply, UpdateStatement};
use crate::provider::{collections, db_error, decode, ProviderDatabase};
use crate::records::{
    coords_bson, CommitmentRecord, CompositeIpAddress, PendingImageCaptchaRequest, StoredResult, UserCommitment,
    UserSolutionRecord,
};
use bson::{doc, Bson, DateTime, Document};
use prosopo_common::{ErrorContext, ProsopoError};
use prosopo_types::api_types::CaptchaSolution;
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::datasets::CaptchaStatus;
use prosopo_types_database::number::js_number;
use prosopo_types_database::provider::{USER_COMMITMENT_RECORD, USER_SOLUTION_RECORD};
use prosopo_types_database::update::{cast_update, UpdateMethod};
use prosopo_util_crypto::u8a::is_hex;

/// `DAPP_USER_COMMITMENT_PROJECTION`: every field the image verify path reads.
fn commitment_projection() -> Document {
    [
        "id",
        "result",
        "serverChecked",
        "requestedAtTimestamp",
        "submittedAtTimestamp",
        "verifiedAtTimestamp",
        "failedAtTimestamp",
        "ipAddress",
        "sessionId",
        "userAccount",
        "dappAccount",
        "headers",
        "ipInfo",
        "behavioralDataPacked",
        "deviceCapability",
        "coords",
        "clientMetaData",
    ]
    .iter()
    .map(|field| (field.to_string(), Bson::Int32(1)))
    .collect()
}

/// A JS `undefined` in a pipeline update: the driver writes it as `null`.
fn undefined_to_null(document: Document) -> Document {
    document
        .into_iter()
        .map(|(key, value)| match value {
            Bson::Undefined => (key, Bson::Null),
            other => (key, other),
        })
        .collect()
}

impl ProviderDatabase {
    fn invalid_request_hash(&self, func: &str, request_hash: &str) -> ProsopoError {
        db_error(
            "DATABASE.INVALID_HASH",
            ErrorContext::new().with("failedFuncName", func).with("requestHash", request_hash),
            None,
        )
    }

    /// `storeUserImageCaptchaSolution`: with solutions, the commitment upserted by id and each
    /// solution upserted by commitment and captcha. Without any, nothing is stored.
    pub async fn store_user_image_captcha_solution(&self, captchas: &[CaptchaSolution], commit: &UserCommitment) -> Result<(), ProsopoError> {
        if captchas.is_empty() {
            return Ok(());
        }
        let mut record: UserCommitment = commit.clone();
        record.last_updated_timestamp = Some(self.source().now());
        let commitment: UpdateStatement = self
            .statement(
                &USER_COMMITMENT_RECORD,
                UpdateMethod::UpdateOne,
                doc! { "id": commit.id.as_str() },
                doc! { "$set": record.to_document() },
                true,
            )
            .map_err(|error| db_error("DATABASE.QUERY_ERROR", ErrorContext::new().with("error", error), Some(self.logger())))?;
        self.run(Operation::update(collections::COMMITMENT, vec![commitment])).await?;
        let mut statements: Vec<UpdateStatement> = Vec::new();
        for captcha in captchas {
            statements.push(
                self.statement(
                    &USER_SOLUTION_RECORD,
                    UpdateMethod::BulkWriteUpdateOne,
                    doc! { "commitmentId": commit.id.as_str(), "captchaId": captcha.captcha_id.as_str() },
                    doc! { "$set": {
                        "captchaId": captcha.captcha_id.as_str(),
                        "captchaContentId": captcha.captcha_content_id.as_str(),
                        "salt": captcha.salt.as_str(),
                        "solution": captcha.solution.clone(),
                        "commitmentId": commit.id.as_str(),
                        "processed": false,
                    } },
                    true,
                )
                .map_err(|error| db_error("DATABASE.QUERY_ERROR", ErrorContext::new().with("error", error), Some(self.logger())))?,
            );
        }
        self.run(Operation::update(collections::USER_SOLUTION, statements)).await?;
        let mark_stored: MarkStored =
            self.mark_stored_callback(collections::COMMITMENT, &USER_COMMITMENT_RECORD, doc! { "id": commit.id.as_str() }, false, false);
        self.stream_record(StoredKind::Commitment, record.to_document(), mark_stored);
        Ok(())
    }

    /// `getCheckedDappUserCommitments`: every server-checked commitment, as stored.
    pub async fn get_checked_dapp_user_commitments(&self) -> Result<Vec<Document>, ProsopoError> {
        let filter: Document = self.filter(&USER_COMMITMENT_RECORD, doc! { "serverChecked": true });
        self.find(Operation::find(collections::COMMITMENT, filter)).await
    }

    /// `getUnstoredDappUserCommitments`.
    pub async fn get_unstored_dapp_user_commitments(&self, limit: Option<f64>, after_id: Option<&Bson>) -> Result<Vec<Document>, ProsopoError> {
        self.unstored(collections::COMMITMENT, &USER_COMMITMENT_RECORD, limit.unwrap_or(1000.0), after_id).await
    }

    /// `markDappUserCommitmentsStored`.
    pub async fn mark_dapp_user_commitments_stored(&self, ids: &[String], as_of: Option<DateTime>) -> Result<(), ProsopoError> {
        self.mark_stored(collections::COMMITMENT, &USER_COMMITMENT_RECORD, "id", ids, as_of).await
    }

    /// `markDappUserCommitmentsChecked`: the number this call newly marked.
    pub async fn mark_dapp_user_commitments_checked(&self, ids: &[String]) -> Result<u64, ProsopoError> {
        let timestamp: DateTime = self.source().now();
        let filter: Document =
            self.filter(&USER_COMMITMENT_RECORD, doc! { "id": { "$in": ids }, "serverChecked": { "$ne": true } });
        let statement: UpdateStatement = UpdateStatement::pipeline(
            filter,
            vec![doc! { "$set": {
                "serverChecked": true,
                "lastUpdatedTimestamp": timestamp,
                "pendingStage": true,
                "verifiedAtTimestamp": { "$ifNull": ["$verifiedAtTimestamp", timestamp] },
            } }],
        )
        .many();
        match self.run(Operation::update(collections::COMMITMENT, vec![statement])).await? {
            Reply::Update { modified, .. } => Ok(modified),
            _ => Ok(0),
        }
    }

    /// `updateDappUserCommitment`: a plain `$set` (cast, so an IP half becomes a Decimal128),
    /// unless the update sets a flag whose time is kept from the first time it was set, which
    /// takes a pipeline update (not cast).
    pub async fn update_dapp_user_commitment(&self, id: &str, updates: &Document) -> Result<(), ProsopoError> {
        let timestamp: DateTime = self.source().now();
        let mut base: Document = updates.clone();
        base.insert("lastUpdatedTimestamp", timestamp);
        base.insert("pendingStage", true);
        let mut expressions: Document = Document::new();
        let first = |field: &str| doc! { "$ifNull": [format!("${field}"), timestamp] };
        if updates.get_bool("userSubmitted").ok() == Some(true) {
            expressions.insert("submittedAtTimestamp", first("submittedAtTimestamp"));
        }
        if updates.get_bool("serverChecked").ok() == Some(true) {
            expressions.insert("verifiedAtTimestamp", first("verifiedAtTimestamp"));
        }
        let disapproved: bool = updates.get_document("result").ok().and_then(|result| result.get_str("status").ok())
            == Some(CaptchaStatus::Disapproved.as_str());
        if disapproved {
            expressions.insert("failedAtTimestamp", first("failedAtTimestamp"));
        }
        let statement: UpdateStatement = if expressions.is_empty() {
            self.statement(&USER_COMMITMENT_RECORD, UpdateMethod::UpdateOne, doc! { "id": id }, doc! { "$set": base }, false)
                .map_err(|error| db_error("DATABASE.QUERY_ERROR", ErrorContext::new().with("error", error), None))?
        } else {
            base.extend(expressions);
            let filter: Document = self.filter(&USER_COMMITMENT_RECORD, doc! { "id": id });
            UpdateStatement::pipeline(filter, vec![doc! { "$set": undefined_to_null(base) }])
        };
        self.run(Operation::update(collections::COMMITMENT, vec![statement])).await?;
        Ok(())
    }

    /// `getAllDappUserSolutions`.
    pub async fn get_all_dapp_user_solutions(&self, captcha_ids: &[String]) -> Result<Vec<UserSolutionRecord>, ProsopoError> {
        let filter: Document = self.filter(&USER_SOLUTION_RECORD, doc! { "captchaId": { "$in": captcha_ids } });
        let documents: Vec<Document> = self.find(Operation::find(collections::USER_SOLUTION, filter)).await?;
        Ok(documents.into_iter().filter_map(decode).collect())
    }

    /// `getDappUserSolutionById`.
    pub async fn get_dapp_user_solution_by_id(&self, commitment_id: &str) -> Result<UserSolutionRecord, ProsopoError> {
        let filter: Document = self.filter(&USER_SOLUTION_RECORD, doc! { "commitmentId": commitment_id });
        let found: Option<Document> = self
            .find(Operation::find(collections::USER_SOLUTION, filter).with_projection(doc! { "_id": 0 }).with_limit(1))
            .await?
            .into_iter()
            .next();
        found.and_then(decode).ok_or_else(|| {
            db_error(
                "DATABASE.SOLUTION_GET_FAILED",
                ErrorContext::new().with("failedFuncName", "getCaptchaById").with("commitmentId", commitment_id),
                None,
            )
        })
    }

    /// `getDappUserCommitmentById`.
    pub async fn get_dapp_user_commitment_by_id(&self, id: &str) -> Result<Option<CommitmentRecord>, ProsopoError> {
        let filter: Document = self.filter(&USER_COMMITMENT_RECORD, doc! { "id": id });
        let found: Option<Document> = self
            .find(Operation::find(collections::COMMITMENT, filter).with_projection(commitment_projection()).with_limit(1))
            .await?
            .into_iter()
            .next();
        Ok(found.and_then(decode))
    }

    /// `getDappUserCommitmentByAccount`: newest first.
    pub async fn get_dapp_user_commitment_by_account(&self, user_account: &str, dapp_account: &str) -> Result<Vec<CommitmentRecord>, ProsopoError> {
        let filter: Document =
            self.filter(&USER_COMMITMENT_RECORD, doc! { "userAccount": user_account, "dappAccount": dapp_account });
        let documents: Vec<Document> = self
            .find(
                Operation::find(collections::COMMITMENT, filter)
                    .with_projection(commitment_projection())
                    .with_sort(doc! { "_id": -1 }),
            )
            .await?;
        Ok(documents.into_iter().filter_map(decode).collect())
    }

    async fn set_commitment_result(&self, id: &str, result: StoredResult, coords: Option<&Coords>) -> Result<(), ProsopoError> {
        let mut update: Document = doc! {
            "result": result.to_document(),
            "lastUpdatedTimestamp": self.source().now(),
            "pendingStage": true,
            "blocked": is_blocking(CaptchaType::Image, &result),
        };
        if let Some(coords) = coords {
            update.insert("coords", coords_bson(coords));
        }
        let failed = |error: String| {
            db_error(
                "DATABASE.SOLUTION_APPROVE_FAILED",
                ErrorContext::new().with("error", error).with("commitmentId", id),
                None,
            )
        };
        let mut ids = crate::source::SourceIds(self.source());
        let query: Document = self.filter(&USER_COMMITMENT_RECORD, doc! { "id": id });
        let cast: Document = cast_update(&USER_COMMITMENT_RECORD, UpdateMethod::FindOneAndUpdate, &doc! { "$set": update }, &query, false, &mut ids)
            .map_err(|error| failed(error.to_string()))?;
        self.run(Operation::FindAndModify {
            collection: collections::COMMITMENT.to_string(),
            query,
            update: cast,
            upsert: Some(false),
        })
        .await
        .map_err(|error| failed(error.to_string()))?;
        let read: Operation =
            Operation::find(collections::COMMITMENT, self.filter(&USER_COMMITMENT_RECORD, doc! { "id": id })).with_limit(1);
        let mark_stored: MarkStored = self.mark_stored_callback(collections::COMMITMENT, &USER_COMMITMENT_RECORD, doc! { "id": id }, true, true);
        self.stream_update(StoredKind::Commitment, read, mark_stored);
        Ok(())
    }

    /// `approveDappUserCommitment`.
    pub async fn approve_dapp_user_commitment(&self, id: &str, coords: Option<&Coords>) -> Result<(), ProsopoError> {
        self.set_commitment_result(id, StoredResult::new(CaptchaStatus::Approved, None), coords).await
    }

    /// `disapproveDappUserCommitment`.
    pub async fn disapprove_dapp_user_commitment(&self, id: &str, reason: Option<&str>, coords: Option<&Coords>) -> Result<(), ProsopoError> {
        self.set_commitment_result(id, StoredResult::new(CaptchaStatus::Disapproved, reason), coords).await
    }

    /// `flagProcessedDappUserSolutions`.
    pub async fn flag_processed_dapp_user_solutions(&self, captcha_ids: &[String]) -> Result<(), ProsopoError> {
        let statement: UpdateStatement = self
            .statement(
                &USER_SOLUTION_RECORD,
                UpdateMethod::UpdateMany,
                doc! { "captchaId": { "$in": captcha_ids } },
                doc! { "$set": { "processed": true } },
                false,
            )
            .map_err(|error| db_error("DATABASE.SOLUTION_FLAG_FAILED", ErrorContext::new().with("error", error), None))?
            .no_upsert();
        self.run(Operation::update(collections::USER_SOLUTION, vec![statement]))
            .await
            .map_err(|error| db_error("DATABASE.SOLUTION_FLAG_FAILED", ErrorContext::new().with("error", error.to_string()), None))?;
        Ok(())
    }

    /// `flagProcessedDappUserCommitments`. `processed` is not a field of the commitment schema,
    /// so mongoose casts the update to nothing and sends nothing (see the findings).
    pub async fn flag_processed_dapp_user_commitments(&self, ids: &[String]) -> Result<(), ProsopoError> {
        let mut distinct: Vec<String> = Vec::new();
        for id in ids {
            if !distinct.contains(id) {
                distinct.push(id.clone());
            }
        }
        let statement: UpdateStatement = self
            .statement(
                &USER_COMMITMENT_RECORD,
                UpdateMethod::UpdateMany,
                doc! { "id": { "$in": distinct } },
                doc! { "$set": { "processed": true } },
                false,
            )
            .map_err(|error| db_error("DATABASE.COMMITMENT_FLAG_FAILED", ErrorContext::new().with("error", error), None))?
            .no_upsert();
        self.run(Operation::update(collections::COMMITMENT, vec![statement]))
            .await
            .map_err(|error| db_error("DATABASE.COMMITMENT_FLAG_FAILED", ErrorContext::new().with("error", error.to_string()), None))?;
        Ok(())
    }

    /// `storePendingImageCommitment`: a placeholder commitment keyed by the request hash, with
    /// empty values for the fields the schema requires and a pending request lacks.
    #[allow(clippy::too_many_arguments)]
    pub async fn store_pending_image_commitment(
        &self,
        user_account: &str,
        request_hash: &str,
        salt: &str,
        deadline_timestamp: DateTime,
        requested_at_timestamp: DateTime,
        ip_address: &CompositeIpAddress,
        threshold: f64,
        session_id: Option<&str>,
        ip_info: Option<&Bson>,
    ) -> Result<(), ProsopoError> {
        if !is_hex(request_hash) {
            return Err(self.invalid_request_hash("storePendingImageCommitment", request_hash));
        }
        let pending: Document = doc! {
            "userAccount": user_account,
            "pending": true,
            "salt": salt,
            "requestHash": request_hash,
            "deadlineTimestamp": deadline_timestamp,
            "requestedAtTimestamp": requested_at_timestamp,
            "ipAddress": ip_address.to_document(),
            "sessionId": session_id.map(Bson::from).unwrap_or(Bson::Undefined),
            "threshold": js_number(threshold),
            "ipInfo": ip_info.cloned().unwrap_or(Bson::Undefined),
            "dappAccount": "",
            "providerAccount": "",
            "datasetId": "",
            "id": "",
            "result": { "status": CaptchaStatus::Pending.as_str() },
            "headers": {},
            "ja4": "",
            "userSignature": "",
            "userSubmitted": false,
            "serverChecked": false,
        };
        let statement: UpdateStatement = self
            .statement(&USER_COMMITMENT_RECORD, UpdateMethod::UpdateOne, doc! { "requestHash": request_hash }, doc! { "$set": pending }, true)
            .map_err(|error| db_error("DATABASE.QUERY_ERROR", ErrorContext::new().with("error", error), None))?;
        self.run(Operation::update(collections::COMMITMENT, vec![statement])).await?;
        Ok(())
    }

    /// `getPendingImageCommitment`.
    pub async fn get_pending_image_commitment(&self, request_hash: &str) -> Result<PendingImageCaptchaRequest, ProsopoError> {
        if !is_hex(request_hash) {
            return Err(self.invalid_request_hash("getPendingImageCommitment", request_hash));
        }
        let filter: Document = self.filter(&USER_COMMITMENT_RECORD, doc! { "requestHash": request_hash, "pending": true });
        let found: Option<Document> =
            self.find(Operation::find(collections::COMMITMENT, filter).with_limit(1)).await?.into_iter().next();
        found.and_then(decode).ok_or_else(|| {
            db_error(
                "DATABASE.PENDING_RECORD_NOT_FOUND",
                ErrorContext::new().with("failedFuncName", "getPendingImageCommitment").with("requestHash", request_hash),
                None,
            )
        })
    }

    /// `updatePendingImageCommitmentStatus`: true only for the one caller that consumed it.
    pub async fn update_pending_image_commitment_status(&self, request_hash: &str) -> Result<bool, ProsopoError> {
        if !is_hex(request_hash) {
            return Err(self.invalid_request_hash("updatePendingImageCommitmentStatus", request_hash));
        }
        let statement: UpdateStatement = self
            .statement(
                &USER_COMMITMENT_RECORD,
                UpdateMethod::UpdateOne,
                doc! { "requestHash": request_hash, "pending": true },
                doc! { "$set": { "pending": false } },
                false,
            )
            .map_err(|error| db_error("DATABASE.QUERY_ERROR", ErrorContext::new().with("error", error), None))?;
        Ok(matches!(
            self.run(Operation::update(collections::COMMITMENT, vec![statement])).await?,
            Reply::Update { modified, .. } if modified > 0
        ))
    }
}
