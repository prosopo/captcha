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

//! The challenge records: PoW, puzzle, audio and icon-order (provider.ts).

use crate::operation::{Operation, Reply, UpdateStatement};
use crate::provider::{collections, db_error, decode, ProviderDatabase};
use crate::records::{coords_bson, ChallengeRecord, CompositeIpAddress, StoredIconTarget, StoredResult};
use crate::captcha::StoredKind;
use crate::source::SourceIds;
use crate::streamer::MarkStored;
use bson::{doc, Bson, DateTime, Document};
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::datasets::{CaptchaStatus, PoWChallengeComponents};
use prosopo_types::reasons::ResultReason;
use prosopo_types_database::document::create;
use prosopo_types_database::number::js_number;
use prosopo_types_database::provider::{
    AUDIO_CAPTCHA_RECORD, ICON_ORDER_CAPTCHA_RECORD, POW_CAPTCHA_RECORD, PUZZLE_CAPTCHA_RECORD,
    USER_COMMITMENT_RECORD,
};
use prosopo_types_database::schema::Schema;
use prosopo_types_database::update::UpdateMethod;

pub type Coords = Vec<Vec<Vec<f64>>>;

/// The three on-screen challenge types.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Interactive {
    Puzzle,
    IconOrder,
    Audio,
}

impl Interactive {
    fn collection(self) -> &'static str {
        match self {
            Interactive::Puzzle => collections::PUZZLE_CAPTCHA,
            Interactive::IconOrder => collections::ICON_ORDER_CAPTCHA,
            Interactive::Audio => collections::AUDIO_CAPTCHA,
        }
    }

    fn schema(self) -> &'static Schema {
        match self {
            Interactive::Puzzle => &PUZZLE_CAPTCHA_RECORD,
            Interactive::IconOrder => &ICON_ORDER_CAPTCHA_RECORD,
            Interactive::Audio => &AUDIO_CAPTCHA_RECORD,
        }
    }

    fn stored_kind(self) -> StoredKind {
        match self {
            Interactive::Puzzle => StoredKind::Puzzle,
            Interactive::IconOrder => StoredKind::IconOrder,
            Interactive::Audio => StoredKind::Audio,
        }
    }

    fn captcha_type(self) -> CaptchaType {
        match self {
            Interactive::Puzzle => CaptchaType::Puzzle,
            Interactive::IconOrder => CaptchaType::IconOrder,
            Interactive::Audio => CaptchaType::Audio,
        }
    }

    /// The fields grading reads, added to the by-challenge projection.
    fn answer_projection(self) -> Document {
        match self {
            Interactive::Puzzle => doc! {
                "targetX": 1, "targetY": 1, "originX": 1, "originY": 1, "tolerance": 1, "puzzleEvents": 1,
            },
            Interactive::IconOrder => doc! { "targets": 1, "tolerance": 1, "clicks": 1, "iconOrderEvents": 1 },
            Interactive::Audio => doc! { "answer": 1, "submittedAnswer": 1, "replays": 1, "audioEvents": 1 },
        }
    }
}

/// What a new interactive record carries beyond the shared fields.
pub enum InteractiveAnswer {
    Puzzle {
        target_x: f64,
        target_y: f64,
        origin_x: f64,
        origin_y: f64,
        tolerance: f64,
    },
    Audio {
        answer: String,
    },
    IconOrder {
        targets: Vec<StoredIconTarget>,
        tolerance: f64,
    },
}

/// The challenge a record is created for.
pub struct NewChallenge<'a> {
    pub challenge: &'a str,
    pub components: &'a PoWChallengeComponents,
    pub provider_signature: &'a str,
    pub ip_address: &'a CompositeIpAddress,
    pub headers: &'a Document,
    pub ja4: &'a str,
    pub session_id: Option<&'a str>,
    pub ip_info: Option<&'a Bson>,
}

/// `isBlockingCaptchaResult` on a stored result: every disapproved PoW is a block; any other
/// type's disapproval is unless the user simply got the challenge wrong.
pub fn is_blocking(captcha_type: CaptchaType, result: &StoredResult) -> bool {
    if result.status != CaptchaStatus::Disapproved {
        return false;
    }
    captcha_type == CaptchaType::Pow || result.reason.as_deref() != Some(ResultReason::CaptchaInvalidSolution.as_str())
}

fn optional(value: Option<&str>) -> Bson {
    value.map(Bson::from).unwrap_or(Bson::Undefined)
}


fn check_coords(coords: Option<&Coords>) -> Result<(), ProsopoError> {
    match coords {
        Some(coords) => prosopo_util::assert_coords_safe(coords, "coords").map_err(|error| {
            ProsopoError::new(
                ErrorClass::Prosopo,
                ErrorSource::message(error.to_string()),
                ErrorOptions {
                    silent: true,
                    ..ErrorOptions::default()
                },
            )
        }),
        None => Ok(()),
    }
}

/// The by-challenge projection every challenge read starts from.
fn challenge_projection(with_difficulty: bool) -> Document {
    let mut out: Document = doc! {
        "challenge": 1,
        "userAccount": 1,
        "dappAccount": 1,
        "requestedAtTimestamp": 1,
        "submittedAtTimestamp": 1,
    };
    if with_difficulty {
        out.insert("verifiedAtTimestamp", 1);
        out.insert("failedAtTimestamp", 1);
    }
    for key in ["ipAddress", "headers", "ja4", "result"] {
        out.insert(key, 1);
    }
    if with_difficulty {
        out.insert("difficulty", 1);
    }
    for key in [
        "sessionId",
        "ipInfo",
        "deviceCapability",
        "behavioralDataPacked",
        "serverChecked",
        "userSubmitted",
        "coords",
        "clientMetaData",
    ] {
        out.insert(key, 1);
    }
    out
}

impl ProviderDatabase {
    fn update_failed(&self, context: ErrorContext) -> ProsopoError {
        db_error("DATABASE.CAPTCHA_UPDATE_FAILED", context, Some(self.logger()))
    }

    /// The new record as the TS literal lists it, through `Model.create`, inserted.
    async fn create_record(&self, schema: &Schema, collection: &str, input: Document, challenge: &str) -> Result<(), ProsopoError> {
        let document: Document = create(schema, &input, &mut SourceIds(self.source()))
            .map_err(|error| self.update_failed(ErrorContext::new().with("error", error.to_string()).with("challenge", challenge)))?;
        self.run(Operation::Insert {
            collection: collection.to_string(),
            documents: vec![document],
        })
        .await
        .map_err(|error| self.update_failed(ErrorContext::new().with("error", error.to_string()).with("challenge", challenge)))?;
        Ok(())
    }

    /// The fields every new challenge record starts with, in the TS literal's order.
    fn pending_record(&self, new: &NewChallenge<'_>) -> Document {
        doc! {
            "challenge": new.challenge,
            "userAccount": new.components.user_account.as_str(),
            "dappAccount": new.components.dapp_account.as_str(),
            "requestedAtTimestamp": DateTime::from_millis(new.components.requested_at_timestamp.get() as i64),
            "ipAddress": new.ip_address.to_document(),
            "headers": new.headers.clone(),
            "ja4": new.ja4,
            "result": { "status": CaptchaStatus::Pending.as_str() },
            "userSubmitted": false,
            "serverChecked": false,
            "providerSignature": new.provider_signature,
            "lastUpdatedTimestamp": self.source().now(),
            "pendingStage": true,
            "sessionId": optional(new.session_id),
            "ipInfo": new.ip_info.cloned().unwrap_or(Bson::Undefined),
        }
    }

    /// `storePowCaptchaRecord`.
    #[allow(clippy::too_many_arguments)]
    pub async fn store_pow_captcha_record(
        &self,
        new: &NewChallenge<'_>,
        difficulty: f64,
        server_checked: bool,
        user_submitted: bool,
        user_signature: Option<&str>,
    ) -> Result<(), ProsopoError> {
        let record: Document = doc! {
            "challenge": new.challenge,
            "userAccount": new.components.user_account.as_str(),
            "dappAccount": new.components.dapp_account.as_str(),
            "requestedAtTimestamp": DateTime::from_millis(new.components.requested_at_timestamp.get() as i64),
            "ipAddress": new.ip_address.to_document(),
            "headers": new.headers.clone(),
            "ja4": new.ja4,
            "result": { "status": CaptchaStatus::Pending.as_str() },
            "userSubmitted": user_submitted,
            "serverChecked": server_checked,
            "difficulty": js_number(difficulty),
            "providerSignature": new.provider_signature,
            "userSignature": optional(user_signature),
            "lastUpdatedTimestamp": self.source().now(),
            "pendingStage": true,
            "sessionId": optional(new.session_id),
            "ipInfo": new.ip_info.cloned().unwrap_or(Bson::Undefined),
        };
        self.create_record(&POW_CAPTCHA_RECORD, collections::POW_CAPTCHA, record.clone(), new.challenge).await?;
        self.stream_record(StoredKind::Pow, record, self.mark_challenge_stored(collections::POW_CAPTCHA, &POW_CAPTCHA_RECORD, new.challenge));
        Ok(())
    }

    /// Clears `pendingStage` once the copy sent is current, as each challenge record's stream
    /// does.
    fn mark_challenge_stored(&self, collection: &'static str, schema: &'static Schema, challenge: &str) -> MarkStored {
        self.mark_stored_callback(collection, schema, doc! { "challenge": challenge }, true, true)
    }

    fn find_challenge_operation(&self, collection: &str, schema: &Schema, challenge: &str, projection: Document) -> Operation {
        let filter: Document = self.filter(schema, doc! { "challenge": challenge });
        Operation::find(collection, filter).with_projection(projection).with_limit(1)
    }

    fn stream_pow_update(&self, challenge: &str) {
        let read: Operation = self.find_challenge_operation(collections::POW_CAPTCHA, &POW_CAPTCHA_RECORD, challenge, challenge_projection(true));
        self.stream_update(StoredKind::Pow, read, self.mark_challenge_stored(collections::POW_CAPTCHA, &POW_CAPTCHA_RECORD, challenge));
    }

    fn interactive_read(&self, kind: Interactive, challenge: &str) -> Operation {
        let mut projection: Document = challenge_projection(false);
        projection.extend(kind.answer_projection());
        self.find_challenge_operation(kind.collection(), kind.schema(), challenge, projection)
    }

    fn stream_interactive_update(&self, kind: Interactive, challenge: &str) {
        let read: Operation = self.interactive_read(kind, challenge);
        self.stream_update(kind.stored_kind(), read, self.mark_challenge_stored(kind.collection(), kind.schema(), challenge));
    }

    async fn find_challenge(&self, collection: &str, schema: &Schema, challenge: &str, projection: Document) -> Result<Option<ChallengeRecord>, ProsopoError> {
        let found: Option<Document> = self
            .find(self.find_challenge_operation(collection, schema, challenge, projection))
            .await
            .map_err(|error| db_error("DATABASE.CAPTCHA_GET_FAILED", ErrorContext::new().with("error", error.to_string()), Some(self.logger())))?
            .into_iter()
            .next();
        Ok(found.and_then(decode))
    }

    /// `getPowCaptchaRecordByChallenge`.
    pub async fn get_pow_captcha_record_by_challenge(&self, challenge: &str) -> Result<Option<ChallengeRecord>, ProsopoError> {
        self.find_challenge(collections::POW_CAPTCHA, &POW_CAPTCHA_RECORD, challenge, challenge_projection(true)).await
    }

    /// `updatePowCaptchaRecordResult`: a pipeline update, so the submit and failure times keep the
    /// first value written.
    pub async fn update_pow_captcha_record_result(
        &self,
        challenge: &str,
        result: &StoredResult,
        server_checked: bool,
        user_submitted: bool,
        user_signature: Option<&str>,
        coords: Option<&Coords>,
    ) -> Result<(), ProsopoError> {
        check_coords(coords)?;
        let timestamp: DateTime = self.source().now();
        let mut set_stage: Document = doc! {
            "result": result.to_document(),
            "serverChecked": server_checked,
            "userSubmitted": user_submitted,
            "userSignature": user_signature.map(Bson::from).unwrap_or(Bson::Null),
            "lastUpdatedTimestamp": timestamp,
            "pendingStage": true,
            "blocked": is_blocking(CaptchaType::Pow, result),
        };
        if let Some(coords) = coords {
            set_stage.insert("coords", coords_bson(coords));
        }
        if user_submitted {
            set_stage.insert("submittedAtTimestamp", doc! { "$ifNull": ["$submittedAtTimestamp", timestamp] });
        }
        if result.status == CaptchaStatus::Disapproved {
            set_stage.insert("failedAtTimestamp", doc! { "$ifNull": ["$failedAtTimestamp", timestamp] });
        }
        let filter: Document = self.filter(&POW_CAPTCHA_RECORD, doc! { "challenge": challenge });
        let statement: UpdateStatement = UpdateStatement::pipeline(filter, vec![doc! { "$set": set_stage }]);
        self.expect_match(collections::POW_CAPTCHA, statement, challenge).await?;
        self.stream_pow_update(challenge);
        Ok(())
    }

    /// Runs a result update, failing as the TS does when nothing matched.
    async fn expect_match(&self, collection: &str, statement: UpdateStatement, challenge: &str) -> Result<(), ProsopoError> {
        let reply: Reply = self
            .run(Operation::update(collection, vec![statement]))
            .await
            .map_err(|error| self.update_failed(ErrorContext::new().with("error", error.to_string()).with("challenge", challenge)))?;
        match reply {
            Reply::Update { matched: 0, upserted: 0, .. } => Err(self.update_failed(
                ErrorContext::new().with("error", "DATABASE.CAPTCHA_GET_FAILED").with("challenge", challenge),
            )),
            _ => Ok(()),
        }
    }

    /// `updatePowCaptchaRecord`: the given fields, flagged for the next stage.
    pub async fn update_pow_captcha_record(&self, challenge: &str, updates: &Document) -> Result<(), ProsopoError> {
        let mut set: Document = updates.clone();
        set.insert("pendingStage", true);
        let statement: UpdateStatement = self
            .statement(&POW_CAPTCHA_RECORD, UpdateMethod::UpdateOne, doc! { "challenge": challenge }, doc! { "$set": set }, false)
            .map_err(|error| self.update_failed(ErrorContext::new().with("error", error)))?
            .no_upsert();
        self.run(Operation::update(collections::POW_CAPTCHA, vec![statement])).await?;
        self.stream_pow_update(challenge);
        Ok(())
    }

    /// `storePuzzleCaptchaRecord`, `storeAudioCaptchaRecord` and `storeIconOrderCaptchaRecord`.
    pub async fn store_interactive_captcha_record(&self, new: &NewChallenge<'_>, answer: &InteractiveAnswer) -> Result<(), ProsopoError> {
        let mut record: Document = self.pending_record(new);
        let kind: Interactive = match answer {
            InteractiveAnswer::Puzzle {
                target_x,
                target_y,
                origin_x,
                origin_y,
                tolerance,
            } => {
                record.insert("tolerance", js_number(*tolerance));
                record.insert("targetX", js_number(*target_x));
                record.insert("targetY", js_number(*target_y));
                record.insert("originX", js_number(*origin_x));
                record.insert("originY", js_number(*origin_y));
                Interactive::Puzzle
            }
            InteractiveAnswer::Audio { answer } => {
                record.insert("answer", answer.as_str());
                Interactive::Audio
            }
            InteractiveAnswer::IconOrder { targets, tolerance } => {
                record.insert("targets", targets.iter().map(|target| Bson::Document(target.to_document())).collect::<Vec<Bson>>());
                record.insert("tolerance", js_number(*tolerance));
                Interactive::IconOrder
            }
        };
        self.create_record(kind.schema(), kind.collection(), record.clone(), new.challenge).await?;
        self.stream_record(kind.stored_kind(), record, self.mark_challenge_stored(kind.collection(), kind.schema(), new.challenge));
        Ok(())
    }

    /// `getPuzzleCaptchaRecordByChallenge` and the audio and icon-order reads.
    pub async fn get_interactive_captcha_record_by_challenge(
        &self,
        kind: Interactive,
        challenge: &str,
    ) -> Result<Option<ChallengeRecord>, ProsopoError> {
        let found: Option<Document> = self
            .find(self.interactive_read(kind, challenge))
            .await
            .map_err(|error| db_error("DATABASE.CAPTCHA_GET_FAILED", ErrorContext::new().with("error", error.to_string()), Some(self.logger())))?
            .into_iter()
            .next();
        Ok(found.and_then(decode))
    }

    /// `claimIconOrderCaptchaSubmission` and `claimAudioCaptchaSubmission`: true only for the
    /// one caller whose update set `userSubmitted`.
    pub async fn claim_interactive_captcha_submission(&self, kind: Interactive, challenge: &str) -> Result<bool, ProsopoError> {
        let statement: UpdateStatement = self
            .statement(
                kind.schema(),
                UpdateMethod::UpdateOne,
                doc! { "challenge": challenge, "userSubmitted": { "$ne": true } },
                doc! { "$set": { "userSubmitted": true, "submittedAtTimestamp": self.source().now() } },
                false,
            )
            .map_err(|error| self.update_failed(ErrorContext::new().with("error", error)))?;
        let reply: Reply = self
            .run(Operation::update(kind.collection(), vec![statement]))
            .await
            .map_err(|error| self.update_failed(ErrorContext::new().with("error", error.to_string()).with("challenge", challenge)))?;
        Ok(matches!(reply, Reply::Update { modified: 1, .. }))
    }

    /// `updatePuzzleCaptchaRecordResult` and the audio and icon-order ones: a plain `$set`, the
    /// times written directly (these challenges are single-use).
    #[allow(clippy::too_many_arguments)]
    pub async fn update_interactive_captcha_record_result(
        &self,
        kind: Interactive,
        challenge: &str,
        result: &StoredResult,
        server_checked: bool,
        user_submitted: bool,
        user_signature: Option<&str>,
        coords: Option<&Coords>,
        last_updated_timestamp: Option<DateTime>,
    ) -> Result<(), ProsopoError> {
        let timestamp: DateTime = last_updated_timestamp.unwrap_or_else(|| self.source().now());
        check_coords(coords)?;
        let mut set_stage: Document = doc! {
            "result": result.to_document(),
            "serverChecked": server_checked,
            "userSubmitted": user_submitted,
            "userSignature": optional(user_signature),
            "lastUpdatedTimestamp": timestamp,
            "pendingStage": true,
            "blocked": is_blocking(kind.captcha_type(), result),
        };
        if let Some(coords) = coords {
            set_stage.insert("coords", coords_bson(coords));
        }
        if user_submitted {
            set_stage.insert("submittedAtTimestamp", timestamp);
        }
        if result.status == CaptchaStatus::Disapproved {
            set_stage.insert("failedAtTimestamp", timestamp);
        }
        let statement: UpdateStatement = self
            .statement(kind.schema(), UpdateMethod::UpdateOne, doc! { "challenge": challenge }, doc! { "$set": set_stage }, false)
            .map_err(|error| self.update_failed(ErrorContext::new().with("error", error)))?;
        self.expect_match(kind.collection(), statement, challenge).await?;
        self.stream_interactive_update(kind, challenge);
        Ok(())
    }

    /// `updatePuzzleCaptchaRecord` and the audio and icon-order ones: the given fields, with the
    /// verify, submit and failure times their values imply.
    pub async fn update_interactive_captcha_record(&self, kind: Interactive, challenge: &str, updates: &Document) -> Result<(), ProsopoError> {
        let timestamp: DateTime = self.source().now();
        let mut set: Document = updates.clone();
        set.insert("pendingStage", true);
        if updates.get_bool("serverChecked").ok() == Some(true) {
            set.insert("verifiedAtTimestamp", timestamp);
        }
        if updates.get_bool("userSubmitted").ok() == Some(true) {
            set.insert("submittedAtTimestamp", timestamp);
        }
        let disapproved: bool = updates
            .get_document("result")
            .ok()
            .and_then(|result| result.get_str("status").ok())
            == Some(CaptchaStatus::Disapproved.as_str());
        if disapproved {
            set.insert("failedAtTimestamp", timestamp);
        }
        let statement: UpdateStatement = self
            .statement(kind.schema(), UpdateMethod::UpdateOne, doc! { "challenge": challenge }, doc! { "$set": set }, false)
            .map_err(|error| self.update_failed(ErrorContext::new().with("error", error)))?;
        self.run(Operation::update(kind.collection(), vec![statement])).await?;
        self.stream_interactive_update(kind, challenge);
        Ok(())
    }

    /// `markPuzzleCaptchaRecordChecked` and the audio and icon-order ones: true only for the one
    /// caller whose update set `serverChecked`.
    pub async fn mark_interactive_captcha_record_checked(&self, kind: Interactive, challenge: &str) -> Result<bool, ProsopoError> {
        let timestamp: DateTime = self.source().now();
        let statement: UpdateStatement = self
            .statement(
                kind.schema(),
                UpdateMethod::UpdateOne,
                doc! { "challenge": challenge, "serverChecked": { "$ne": true } },
                doc! { "$set": {
                    "serverChecked": true,
                    "lastUpdatedTimestamp": timestamp,
                    "verifiedAtTimestamp": timestamp,
                    "pendingStage": true,
                } },
                false,
            )
            .map_err(|error| self.update_failed(ErrorContext::new().with("error", error)))?;
        let reply: Reply = self.run(Operation::update(kind.collection(), vec![statement])).await?;
        if matches!(reply, Reply::Update { modified: 0, .. }) {
            return Ok(false);
        }
        self.stream_interactive_update(kind, challenge);
        Ok(true)
    }

    /// `countCommitmentsByNormalisedEmail`: server-checked records of the dapp with this
    /// normalised email, across the image, PoW, puzzle, icon-order and audio collections.
    pub async fn count_commitments_by_normalised_email(&self, dapp_account: &str, email_normalised: &str) -> Result<u64, ProsopoError> {
        if email_normalised.is_empty() {
            return Ok(0);
        }
        let filter = || doc! { "dappAccount": dapp_account, "serverChecked": true, "metadata.emailNormalised": email_normalised };
        let mut total: u64 = 0;
        for (collection, schema) in [
            (collections::COMMITMENT, &*USER_COMMITMENT_RECORD),
            (collections::POW_CAPTCHA, &*POW_CAPTCHA_RECORD),
            (collections::PUZZLE_CAPTCHA, &*PUZZLE_CAPTCHA_RECORD),
            (collections::ICON_ORDER_CAPTCHA, &*ICON_ORDER_CAPTCHA_RECORD),
            (collections::AUDIO_CAPTCHA, &*AUDIO_CAPTCHA_RECORD),
        ] {
            total += self.count_documents(collection, self.filter(schema, filter())).await?;
        }
        Ok(total)
    }

    /// `countDocuments`, as mongoose sends it: an aggregation.
    pub(crate) async fn count_documents(&self, collection: &str, filter: Document) -> Result<u64, ProsopoError> {
        let documents: Vec<Document> = self
            .find(Operation::aggregate(
                collection,
                vec![doc! { "$match": filter }, doc! { "$group": { "_id": 1, "n": { "$sum": 1 } } }],
            ))
            .await?;
        Ok(documents
            .first()
            .and_then(|group| match group.get("n") {
                Some(Bson::Int32(n)) => Some(*n as u64),
                Some(Bson::Int64(n)) => Some(*n as u64),
                _ => None,
            })
            .unwrap_or(0))
    }

    /// The records a sweep stages, as stored: the keyset page of records flagged `pendingStage`.
    pub(crate) async fn unstored(&self, collection: &str, schema: &Schema, limit: f64, after_id: Option<&Bson>) -> Result<Vec<Document>, ProsopoError> {
        let mut filter: Document = doc! { "pendingStage": true };
        if let Some(after) = after_id {
            filter.insert("_id", doc! { "$gt": after.clone() });
        }
        let filter: Document = self.filter(schema, filter);
        self.find(
            Operation::find(collection, filter)
                .with_sort(doc! { "_id": 1 })
                .with_limit(limit as i64)
                .with_hint("pendingStage_partial"),
        )
        .await
    }

    /// `getUnstoredDappUserPoWCommitments`.
    pub async fn get_unstored_dapp_user_pow_commitments(&self, limit: Option<f64>, after_id: Option<&Bson>) -> Result<Vec<Document>, ProsopoError> {
        self.unstored(collections::POW_CAPTCHA, &POW_CAPTCHA_RECORD, limit.unwrap_or(1000.0), after_id).await
    }

    /// Clears `pendingStage` on the records not changed since `as_of`.
    pub(crate) async fn mark_stored(&self, collection: &str, schema: &Schema, key: &str, ids: &[String], as_of: Option<DateTime>) -> Result<(), ProsopoError> {
        let as_of: DateTime = as_of.unwrap_or_else(|| self.source().now());
        let statement: UpdateStatement = self
            .statement(
                schema,
                UpdateMethod::UpdateMany,
                doc! { key: { "$in": ids }, "lastUpdatedTimestamp": { "$lte": as_of } },
                doc! { "$set": { "storedAtTimestamp": self.source().now() }, "$unset": { "pendingStage": 1 } },
                false,
            )
            .map_err(|error| db_error("DATABASE.QUERY_ERROR", ErrorContext::new().with("error", error), None))?
            .no_upsert();
        self.run(Operation::update(collection, vec![statement])).await?;
        Ok(())
    }

    /// `markDappUserPoWCommitmentsStored`.
    pub async fn mark_dapp_user_pow_commitments_stored(&self, challenges: &[String], as_of: Option<DateTime>) -> Result<(), ProsopoError> {
        self.mark_stored(collections::POW_CAPTCHA, &POW_CAPTCHA_RECORD, "challenge", challenges, as_of).await
    }

    /// `markDappUserPoWCommitmentsChecked`: the number this call newly marked.
    pub async fn mark_dapp_user_pow_commitments_checked(&self, challenges: &[String]) -> Result<u64, ProsopoError> {
        let timestamp: DateTime = self.source().now();
        let filter: Document = self.filter(
            &POW_CAPTCHA_RECORD,
            doc! { "challenge": { "$in": challenges }, "serverChecked": { "$ne": true } },
        );
        let statement: UpdateStatement = UpdateStatement::pipeline(
            filter,
            vec![doc! { "$set": {
                "serverChecked": true,
                "lastUpdatedTimestamp": timestamp,
                "pendingStage": true,
                "verifiedAtTimestamp": { "$ifNull": ["$verifiedAtTimestamp", timestamp] },
            } }],
        )
        .no_upsert()
        .many();
        match self.run(Operation::update(collections::POW_CAPTCHA, vec![statement])).await? {
            Reply::Update { modified, .. } => Ok(modified),
            _ => Ok(0),
        }
    }
}
