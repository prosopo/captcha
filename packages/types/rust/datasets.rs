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

//! The enums and the PoW challenge format of datasets/captcha.ts.

use crate::api_types::Hash;
use crate::number::JsNumber;
use crate::wire_enum::wire_enum;
use prosopo_api_route::schema::{
    array, custom, number, object, string, undefined, union, Data as Input, Schema,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

wire_enum! {
    pub enum CaptchaTypes {
        SelectAll: "SelectAll" = "SelectAll",
    }
}

wire_enum! {
    pub enum CaptchaItemTypes {
        Text: "Text" = "text",
        Image: "Image" = "image",
    }
}

wire_enum! {
    pub enum CaptchaStates {
        Solved: "Solved" = "solved",
        Unsolved: "Unsolved" = "unsolved",
    }
}

wire_enum! {
    /// How a selection was made: a tile, or the checkbox tick that opened the challenge.
    pub enum InputMethod {
        Pointer: "pointer" = "pointer",
        Keyboard: "keyboard" = "keyboard",
    }
}

wire_enum! {
    pub enum CaptchaStatus {
        Pending: "pending" = "Pending",
        Approved: "approved" = "Approved",
        Disapproved: "disapproved" = "Disapproved",
    }
}

wire_enum! {
    pub enum StoredStatusNames {
        NotStored: "notStored" = "notStored",
        UserSubmitted: "userSubmitted" = "userSubmitted",
        ServerChecked: "serverChecked" = "serverChecked",
        Stored: "stored" = "stored",
    }
}

wire_enum! {
    pub enum GovernanceStatus {
        Active: "active" = "Active",
        Inactive: "inactive" = "Inactive",
    }
}

wire_enum! {
    pub enum DappPayee {
        Provider: "provider" = "Provider",
        Dapp: "dapp" = "Dapp",
        Any: "any" = "Any",
    }
}

/// Joins the parts of a PoW challenge: `timestamp___user___dapp___nonce`. The provider
/// signs that string.
pub const POW_SEPARATOR: &str = "___";

/// `PowChallengeIdSchema`: a string with exactly four `___`-separated parts. The TS calls
/// `val.split` unguarded, so a non-string throws a `TypeError` out of `safeParse`; here it
/// fails validation instead.
pub fn pow_challenge_id_schema() -> Schema {
    custom(|value: &Input| match value {
        Some(Value::String(challenge)) => challenge.split(POW_SEPARATOR).count() == 4,
        _ => false,
    })
}

/// `TimestampSchema`.
pub fn timestamp_schema() -> Schema {
    number()
}

fn optional_id() -> Schema {
    union(vec![string(), undefined()])
}

/// `CaptchaSchema`: the fields every captcha has; `solution` and `unlabelled` are tile
/// indexes here.
pub fn captcha_schema() -> Schema {
    object(vec![
        ("captchaId", optional_id()),
        ("captchaContentId", optional_id()),
        ("salt", string().min(34.0)),
        ("solution", number().array().optional()),
        ("unlabelled", number().array().optional()),
        ("timeLimit", number().optional()),
    ])
}

/// `CaptchaItemSchema`, also `HashedCaptchaItemSchema`, which re-declares `hash` unchanged.
pub fn captcha_item_schema() -> Schema {
    object(vec![
        ("hash", string()),
        ("data", string()),
        ("type", CaptchaItemTypes::schema()),
    ])
}

pub fn labelled_item_schema() -> Schema {
    captcha_item_schema().extend(vec![("label", string())])
}

pub fn maybe_labelled_hashed_item_schema() -> Schema {
    captcha_item_schema().extend(vec![("label", string().optional())])
}

/// `SelectAllCaptchaSchemaRaw`: tile-index solutions.
pub fn select_all_captcha_schema_raw() -> Schema {
    captcha_schema().extend(vec![
        ("items", array(captcha_item_schema())),
        ("target", string()),
    ])
}

/// `SelectAllCaptchaSchema`: hashed solutions.
pub fn select_all_captcha_schema() -> Schema {
    select_all_captcha_schema_raw().extend(vec![
        ("solution", string().array().optional()),
        ("unlabelled", string().array().optional()),
    ])
}

pub fn select_all_captcha_schema_with_numeric_solution() -> Schema {
    select_all_captcha_schema().extend(vec![
        ("solution", number().array().optional()),
        ("unlabelled", number().array().optional()),
    ])
}

pub fn captchas_schema() -> Schema {
    array(select_all_captcha_schema_raw())
}

pub fn captchas_with_numeric_solution_schema() -> Schema {
    array(select_all_captcha_schema_with_numeric_solution())
}

pub fn captcha_solution_schema() -> Schema {
    object(vec![
        ("captchaId", string()),
        ("captchaContentId", string()),
        ("solution", string().array()),
        ("salt", string()),
        ("inputMethods", array(InputMethod::schema()).optional()),
    ])
}

pub fn captcha_solution_array_schema() -> Schema {
    array(captcha_solution_schema())
}

pub fn data_schema() -> Schema {
    object(vec![("items", array(maybe_labelled_hashed_item_schema()))])
}

pub fn labelled_data_schema() -> Schema {
    object(vec![("items", array(labelled_item_schema()))])
}

pub fn captchas_container_schema() -> Schema {
    object(vec![
        ("captchas", captchas_schema()),
        ("format", CaptchaTypes::schema()),
    ])
}

pub fn labels_container_schema() -> Schema {
    object(vec![("labels", array(string()))])
}

fn tree() -> Schema {
    array(array(string()))
}

/// `DatasetSchema` (datasets/dataset.ts).
pub fn dataset_schema() -> Schema {
    object(vec![
        ("datasetId", string().optional()),
        ("datasetContentId", string().optional()),
        ("captchas", captchas_schema()),
        ("format", CaptchaTypes::schema()),
        ("solutionTree", tree().optional()),
        ("contentTree", tree().optional()),
        ("timeLimit", number().optional()),
    ])
}

pub fn dataset_with_numeric_solution_schema() -> Schema {
    dataset_schema().extend(vec![("captchas", captchas_with_numeric_solution_schema())])
}

pub fn dataset_with_ids_schema() -> Schema {
    object(vec![
        ("datasetId", string()),
        ("datasetContentId", string().optional()),
        ("captchas", array(select_all_captcha_schema())),
        ("format", CaptchaTypes::schema()),
        ("solutionTree", tree().optional()),
        ("contentTree", tree().optional()),
    ])
}

pub fn dataset_with_ids_and_tree_schema() -> Schema {
    dataset_with_ids_schema().extend(vec![("solutionTree", tree()), ("contentTree", tree())])
}

/// `Item`, also `HashedItem`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CaptchaItem {
    pub hash: String,
    pub data: String,
    #[serde(rename = "type")]
    pub item_type: CaptchaItemTypes,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LabelledItem {
    pub hash: String,
    pub data: String,
    #[serde(rename = "type")]
    pub item_type: CaptchaItemTypes,
    pub label: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MaybeLabelledItem {
    pub hash: String,
    pub data: String,
    #[serde(rename = "type")]
    pub item_type: CaptchaItemTypes,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

/// The output of `SelectAllCaptchaSchema` (`S = String`, hashed solutions) and of the raw and
/// numeric variants (`S = JsNumber`, tile indexes).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectAllCaptcha<S> {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub captcha_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub captcha_content_id: Option<String>,
    pub salt: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub solution: Option<Vec<S>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub unlabelled: Option<Vec<S>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub time_limit: Option<JsNumber>,
    pub items: Vec<CaptchaItem>,
    pub target: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Data {
    pub items: Vec<MaybeLabelledItem>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LabelledData {
    pub items: Vec<LabelledItem>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CaptchasContainer {
    pub captchas: Vec<SelectAllCaptcha<JsNumber>>,
    pub format: CaptchaTypes,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LabelsContainer {
    pub labels: Vec<String>,
}

/// The output of `DatasetSchema` and `DatasetWithNumericSolutionSchema`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatasetRaw {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dataset_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dataset_content_id: Option<String>,
    pub captchas: Vec<SelectAllCaptcha<JsNumber>>,
    pub format: CaptchaTypes,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub solution_tree: Option<Vec<Vec<String>>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content_tree: Option<Vec<Vec<String>>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub time_limit: Option<JsNumber>,
}

/// The output of `DatasetWithIdsSchema`; `DatasetWithIdsAndTreeSchema` also guarantees both
/// trees.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatasetWithIds {
    pub dataset_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dataset_content_id: Option<String>,
    pub captchas: Vec<SelectAllCaptcha<String>>,
    pub format: CaptchaTypes,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub solution_tree: Option<Vec<Vec<String>>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content_tree: Option<Vec<Vec<String>>>,
}

/// A captcha's correct (or unlabelled) items: hashes, or tile indexes before hashing.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Solutions {
    Hashed(Vec<String>),
    Raw(Vec<JsNumber>),
}

/// `CaptchaWithoutId`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptchaWithoutId {
    pub salt: String,
    pub items: Vec<CaptchaItem>,
    pub target: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub solved: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub time_limit_ms: Option<JsNumber>,
    /// The correct items only.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub solution: Option<Solutions>,
    /// The unlabelled items only.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub unlabelled: Option<Solutions>,
}

/// `Captcha`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Captcha {
    #[serde(flatten)]
    pub captcha: CaptchaWithoutId,
    pub captcha_id: String,
    pub captcha_content_id: String,
    #[serde(rename = "assetURI", default, skip_serializing_if = "Option::is_none")]
    pub asset_uri: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dataset_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dataset_content_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub random_key: Option<JsNumber>,
}

/// `PoWChallengeComponents`: the parts of a PoW challenge string.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PoWChallengeComponents {
    pub requested_at_timestamp: JsNumber,
    pub user_account: String,
    pub dapp_account: String,
}

/// `PoWCaptcha`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PoWCaptcha {
    pub challenge: String,
    pub difficulty: JsNumber,
    pub provider_signature: String,
    pub requested_at_timestamp: JsNumber,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_signature: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub score: Option<JsNumber>,
}

/// `PoWCaptchaUser`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PoWCaptchaUser {
    #[serde(flatten)]
    pub captcha: PoWCaptcha,
    pub user_account: String,
    pub dapp_account: String,
}

/// `Commit`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Commit {
    pub id: Hash,
    pub user_account: String,
    pub dataset_id: Hash,
    pub dapp_account: String,
    pub provider_account: String,
    pub user_signature: String,
}

/// `MerkleNodeInterface`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MerkleNode {
    pub hash: String,
    pub parent: Option<String>,
}

/// `MerkleProof`: sibling pairs from leaf to root, then the root alone.
pub type MerkleProof = Vec<Vec<String>>;
