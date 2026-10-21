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

//! Building and validating datasets (src/captcha/dataset.ts).

use crate::asset_token::SignAssetUrlOptions;
use crate::captcha::{compute_captcha_hash, match_items_to_solutions, CaptchaHashInput};
use crate::download::{compute_item_hash_with, Fetch};
use crate::error::{DatasetsError, Result};
use crate::merkle::CaptchaMerkleTree;
use futures_util::future::join_all;
use prosopo_common::ErrorClass;
use prosopo_types::datasets::{CaptchaItem, DatasetRaw, DatasetWithIds, SelectAllCaptcha};
use prosopo_util::{at, AtOptions};

/// `addSolutionHashesToDataset`: each solution checked against its captcha's items.
pub fn add_solution_hashes_to_dataset(
    raw: &DatasetRaw<String>,
) -> Result<Vec<SelectAllCaptcha<String>>> {
    raw.captchas
        .iter()
        .map(|captcha: &SelectAllCaptcha<String>| {
            let solution: Option<Vec<String>> = match &captcha.solution {
                Some(solution) => Some(match_items_to_solutions(solution, Some(&captcha.items))?),
                None => None,
            };
            Ok(SelectAllCaptcha {
                solution,
                ..captcha.clone()
            })
        })
        .collect()
}

/// `buildCaptchaTree`: a tree over the captchas' hashes. Sorts the solutions in place when
/// they are included.
pub fn build_captcha_tree(
    captchas: &mut [SelectAllCaptcha<String>],
    include_solution: bool,
    include_salt: bool,
    sort_item_hashes: bool,
) -> Result<CaptchaMerkleTree> {
    let hashes: Result<Vec<String>> = captchas
        .iter_mut()
        .map(|captcha: &mut SelectAllCaptcha<String>| {
            compute_captcha_hash(
                CaptchaHashInput {
                    target: &captcha.target,
                    salt: &captcha.salt,
                    items: &captcha.items,
                    solution: captcha.solution.as_deref_mut(),
                },
                include_solution,
                include_salt,
                sort_item_hashes,
            )
        })
        .collect();
    let mut tree: CaptchaMerkleTree = CaptchaMerkleTree::new();
    hashes
        .and_then(|hashes: Vec<String>| tree.build(&hashes))
        .map_err(|_| DatasetsError::new(ErrorClass::Env, "DATASET.HASH_ERROR", None))?;
    Ok(tree)
}

/// `buildDataset`: hashes the solutions, then names each captcha by its leaf in the solution
/// tree (content, solution and salt) and in the content tree (content only), and the dataset
/// by the two roots.
pub fn build_dataset(raw: &DatasetRaw<String>) -> Result<DatasetWithIds> {
    let mut captchas: Vec<SelectAllCaptcha<String>> = add_solution_hashes_to_dataset(raw)?;
    let content_tree: CaptchaMerkleTree = build_captcha_tree(&mut captchas, false, false, true)?;
    let solution_tree: CaptchaMerkleTree = build_captcha_tree(&mut captchas, true, true, false)?;
    for (index, captcha) in captchas.iter_mut().enumerate() {
        captcha.captcha_id = Some(solution_tree.leaves[index].hash.clone());
        captcha.captcha_content_id = Some(content_tree.leaves[index].hash.clone());
    }
    Ok(DatasetWithIds {
        dataset_id: solution_tree.get_root()?.hash.clone(),
        dataset_content_id: Some(content_tree.get_root()?.hash.clone()),
        captchas,
        format: raw.format,
        solution_tree: Some(solution_tree.layers),
        content_tree: Some(content_tree.layers),
    })
}

/// `hashDatasetItems`: every item of every captcha hashed, the downloads all in flight at
/// once as in the TS.
pub async fn hash_dataset_items<S>(
    dataset: &DatasetRaw<S>,
    fetch: &dyn Fetch,
    options: Option<&SignAssetUrlOptions>,
) -> Result<Vec<Vec<CaptchaItem>>> {
    let captchas = dataset
        .captchas
        .iter()
        .map(|captcha: &SelectAllCaptcha<S>| {
            join_all(
                captcha
                    .items
                    .iter()
                    .map(|item: &CaptchaItem| compute_item_hash_with(item, fetch, options)),
            )
        });
    join_all(captchas)
        .await
        .into_iter()
        .map(|items: Vec<Result<CaptchaItem>>| items.into_iter().collect())
        .collect()
}

/// `validateDatasetContent`: whether every item hash in the dataset matches its content.
/// Each captcha is checked against the first captcha with its `captchaId`, item by item with
/// `at`; a captcha without a `captchaId` cannot be matched and fails.
pub async fn validate_dataset_content<S>(
    dataset: &DatasetRaw<S>,
    fetch: &dyn Fetch,
    options: Option<&SignAssetUrlOptions>,
) -> Result<bool> {
    let hashed: Vec<Vec<CaptchaItem>> = hash_dataset_items(dataset, fetch, options).await?;
    let mut valid: bool = true;
    for (captcha, items) in dataset.captchas.iter().zip(&hashed) {
        let original: Option<&SelectAllCaptcha<S>> = captcha.captcha_id.as_ref().and_then(|id| {
            dataset
                .captchas
                .iter()
                .find(|other: &&SelectAllCaptcha<S>| other.captcha_id.as_ref() == Some(id))
        });
        let Some(original) = original else {
            valid = false;
            continue;
        };
        for (index, item) in items.iter().enumerate() {
            if item.hash != at(&original.items, index as i64, AtOptions::default())?.hash {
                valid = false;
                break;
            }
        }
    }
    Ok(valid)
}
