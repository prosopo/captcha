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

//! `DatasetManager.providerSetDatasetFromFile` (datasetTasks.ts, datasetTasksUtils.ts): a
//! dataset file checked against the configured captcha counts and built with its ids and trees.

use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_datasets::{build_dataset, parse_captcha_dataset};
use prosopo_types::api_types::CaptchaCountConfig;
use prosopo_types::datasets::{DatasetRaw, DatasetWithIds};
use serde_json::Value;

fn count_error(key: &str) -> String {
    let context: ErrorContext = ErrorContext::new().with("failedFuncName", "providerValidateDataset");
    ProsopoError::new(ErrorClass::Env, ErrorSource::key(key), ErrorOptions { context: Some(context), ..ErrorOptions::default() }).message().to_string()
}

/// `providerValidateDataset`: enough captchas in all, enough solved and enough unsolved.
fn provider_validate_dataset(raw: &DatasetRaw<String>, solved: f64, unsolved: f64) -> Result<DatasetWithIds, String> {
    let total: f64 = raw.captchas.len() as f64;
    if total < solved + unsolved {
        return Err(count_error("DATASET.CAPTCHAS_COUNT_LESS_THAN_CONFIGURED"));
    }
    let solutions: f64 = raw.captchas.iter().filter(|captcha| captcha.solution.is_some()).count() as f64;
    if solutions < solved {
        return Err(count_error("DATASET.SOLUTIONS_COUNT_LESS_THAN_CONFIGURED"));
    }
    if total - solutions < unsolved {
        return Err(count_error("DATASET.CAPTCHAS_COUNT_LESS_THAN_CONFIGURED"));
    }
    build_dataset(raw).map_err(|error| error.to_string())
}

/// The dataset a file holds, as `storeDataset` is given it.
pub fn provider_dataset(file: &Value, counts: &CaptchaCountConfig) -> Result<Value, String> {
    let raw: DatasetRaw<String> = parse_captcha_dataset(file).map_err(|error| error.to_string())?;
    let dataset: DatasetWithIds = provider_validate_dataset(&raw, counts.solved.count.get(), counts.unsolved.count.get())?;
    serde_json::to_value(dataset).map_err(|error| error.to_string())
}
