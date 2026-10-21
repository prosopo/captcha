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

//! Each command's `ArgsSchema`, and the arguments it parses to.

use crate::error::{DatasetsFsError, Result};
use prosopo_api_route::schema::{boolean, number, object, string, Schema};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::Value;

fn optional_boolean() -> Schema {
    boolean().optional()
}

fn optional_number() -> Schema {
    number().optional()
}

/// `InputArgsSchema`.
pub fn input_args_schema() -> Schema {
    object(vec![("input", string())])
}

/// `OutputArgsSchema`.
pub fn output_args_schema() -> Schema {
    object(vec![
        ("output", string()),
        ("overwrite", optional_boolean()),
    ])
}

/// `InputOutputArgsSchema`.
pub fn input_output_args_schema() -> Schema {
    input_args_schema().merge(&output_args_schema())
}

pub fn flatten_args_schema() -> Schema {
    input_output_args_schema().merge(&object(vec![("allowDuplicates", optional_boolean())]))
}

pub fn labels_args_schema() -> Schema {
    input_output_args_schema()
}

pub fn relocate_args_schema() -> Schema {
    input_output_args_schema().merge(&object(vec![("from", string()), ("to", string())]))
}

pub fn resize_args_schema() -> Schema {
    input_output_args_schema().merge(&object(vec![
        ("size", number()),
        ("square", optional_boolean()),
    ]))
}

pub fn get_args_schema() -> Schema {
    input_args_schema()
}

/// generate.ts's `ArgsSchema`.
pub fn generate_args_schema() -> Schema {
    output_args_schema().merge(&object(vec![
        ("labels", string().optional()),
        ("labelled", string().optional()),
        ("unlabelled", string().optional()),
        ("seed", number()),
        ("size", optional_number()),
        ("overwrite", optional_boolean()),
        ("allowDuplicates", optional_boolean()),
        ("allowDuplicatesLabelled", optional_boolean()),
        ("allowDuplicatesUnlabelled", optional_boolean()),
    ]))
}

pub fn generate_v1_args_schema() -> Schema {
    generate_args_schema().merge(&object(vec![
        ("solved", optional_number()),
        ("unsolved", optional_number()),
        ("minCorrect", optional_number()),
        ("maxCorrect", optional_number()),
    ]))
}

pub fn generate_v2_args_schema() -> Schema {
    generate_args_schema().merge(&object(vec![
        ("minCorrect", optional_number()),
        ("minIncorrect", optional_number()),
        ("minLabelled", optional_number()),
        ("maxLabelled", optional_number()),
        ("count", optional_number()),
    ]))
}

/// `command.parse(args)`: the schema's output, or its `ZodError`.
pub fn parse<T: DeserializeOwned>(schema: &Schema, args: &Value) -> Result<T> {
    let parsed: Value = schema
        .safe_parse(Some(args))
        .map_err(DatasetsFsError::Invalid)?
        .unwrap_or(Value::Null);
    Ok(serde_json::from_value(parsed).expect("an args schema's output fits its type"))
}

#[derive(Debug, Clone, Deserialize)]
pub struct InputArgs {
    pub input: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlattenArgs {
    pub input: String,
    pub output: String,
    pub overwrite: Option<bool>,
    pub allow_duplicates: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LabelsArgs {
    pub input: String,
    pub output: String,
    pub overwrite: Option<bool>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RelocateArgs {
    pub input: String,
    pub output: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overwrite: Option<bool>,
    pub from: String,
    pub to: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ResizeArgs {
    pub input: String,
    pub output: String,
    pub overwrite: Option<bool>,
    pub size: f64,
    pub square: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateArgs {
    pub output: String,
    pub labels: Option<String>,
    pub labelled: Option<String>,
    pub unlabelled: Option<String>,
    pub seed: f64,
    pub size: Option<f64>,
    pub allow_duplicates: Option<bool>,
    pub allow_duplicates_labelled: Option<bool>,
    pub allow_duplicates_unlabelled: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateV1Args {
    #[serde(flatten)]
    pub generate: GenerateArgs,
    pub solved: Option<f64>,
    pub unsolved: Option<f64>,
    pub min_correct: Option<f64>,
    pub max_correct: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateV2Args {
    #[serde(flatten)]
    pub generate: GenerateArgs,
    pub min_correct: Option<f64>,
    pub min_incorrect: Option<f64>,
    pub max_labelled: Option<f64>,
    pub count: Option<f64>,
}

/// `value || fallback` for an optional number: 0 and `NaN` are falsy.
pub fn or(value: Option<f64>, fallback: f64) -> f64 {
    value
        .filter(|value: &f64| *value != 0.0 && !value.is_nan())
        .unwrap_or(fallback)
}
