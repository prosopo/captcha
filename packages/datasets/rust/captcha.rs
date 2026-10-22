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

//! Captcha hashing, parsing and solution checks (src/captcha/captcha.ts). Where the TS sorts
//! an array it was given, these functions take it `&mut` and sort it in place too: the
//! sorted order reaches stored solution records.

use crate::error::{DatasetsError, Result};
use prosopo_api_route::schema::Schema;
use prosopo_common::{ErrorClass, ErrorContext};
use prosopo_types::api_types::{CaptchaSolution, SolutionRecord};
use prosopo_types::datasets::{
    captcha_solution_array_schema, dataset_with_numeric_solution_schema, Captcha, CaptchaItem,
    DatasetRaw, SelectAllCaptcha, SolutionEntry,
};
use prosopo_types::JsNumber;
use prosopo_util::{at_f64, resolve_at_index, AtOptions};
use prosopo_util_crypto::js::js_number_to_string;
use prosopo_util_crypto::u8a::is_hex;
use prosopo_util_crypto::{code_unit_cmp, hex_hash_array, locale_compare, JoinValue};
use serde::Serialize;
use serde_json::Value;
use std::cmp::Ordering;
use std::sync::LazyLock;

pub const NO_SOLUTION_VALUE: &str = "NO_SOLUTION";

/// A solution entry as `Array.prototype.sort()` and `join` see it.
pub trait SolutionValue {
    fn sort_key(&self) -> String;
    fn join_value(&self) -> JoinValue;
}

impl SolutionValue for String {
    fn sort_key(&self) -> String {
        self.clone()
    }

    fn join_value(&self) -> JoinValue {
        JoinValue::String(self.clone())
    }
}

impl SolutionValue for JsNumber {
    fn sort_key(&self) -> String {
        js_number_to_string(self.get())
    }

    fn join_value(&self) -> JoinValue {
        JoinValue::Number(self.get())
    }
}

impl SolutionValue for SolutionEntry {
    fn sort_key(&self) -> String {
        match self {
            SolutionEntry::Hash(hash) => hash.sort_key(),
            SolutionEntry::Index(index) => index.sort_key(),
        }
    }

    fn join_value(&self) -> JoinValue {
        match self {
            SolutionEntry::Hash(hash) => hash.join_value(),
            SolutionEntry::Index(index) => index.join_value(),
        }
    }
}

/// `array.sort()` with no comparator: entries compare as strings, by UTF-16 code unit.
pub fn js_sort<T: SolutionValue>(items: &mut [T]) {
    items.sort_by(|a: &T, b: &T| code_unit_cmp(&a.sort_key(), &b.sort_key()));
}

fn hash(parts: &[JoinValue]) -> String {
    hex_hash_array(parts).expect("the default bit length is supported")
}

/// `captchaSort`: by `captchaId`, as `localeCompare` orders them.
pub fn captcha_sort(a: &str, b: &str) -> Ordering {
    locale_compare(a, b)
}

/// The fields `computeCaptchaHash` reads.
pub struct CaptchaHashInput<'a, S> {
    pub target: &'a str,
    pub salt: &'a str,
    pub items: &'a [CaptchaItem],
    /// Sorted in place when the solution is included, as the TS does.
    pub solution: Option<&'a mut [S]>,
}

/// `getSolutionValueToHash`: the solution sorted in place, or `["NO_SOLUTION"]` without one,
/// so that an empty solution and a missing one hash differently.
pub fn get_solution_value_to_hash<S: SolutionValue>(solution: Option<&mut [S]>) -> Vec<JoinValue> {
    match solution {
        Some(solution) => {
            js_sort(solution);
            solution.iter().map(SolutionValue::join_value).collect()
        }
        None => vec![JoinValue::from(NO_SOLUTION_VALUE)],
    }
}

/// `computeCaptchaHash`.
pub fn compute_captcha_hash<S: SolutionValue>(
    captcha: CaptchaHashInput<'_, S>,
    include_solution: bool,
    include_salt: bool,
    sort_item_hashes: bool,
) -> Result<String> {
    let mut item_hashes: Vec<String> = Vec::with_capacity(captcha.items.len());
    for (index, item) in captcha.items.iter().enumerate() {
        if item.hash.is_empty() {
            let missing: DatasetsError = DatasetsError::new(
                ErrorClass::Dataset,
                "CAPTCHA.MISSING_ITEM_HASH",
                Some(
                    ErrorContext::new()
                        .with("computeCaptchaHashName", "computeCaptchaHash")
                        .with("index", index),
                ),
            );
            return Err(missing.wrap(ErrorClass::Dataset, "DATASET.HASH_ERROR"));
        }
        item_hashes.push(item.hash.clone());
    }
    let mut parts: Vec<JoinValue> = vec![JoinValue::from(captcha.target)];
    if include_solution {
        parts.extend(get_solution_value_to_hash(captcha.solution));
    }
    parts.push(JoinValue::from(if include_salt {
        captcha.salt
    } else {
        ""
    }));
    if sort_item_hashes {
        item_hashes.sort_by(|a: &String, b: &String| code_unit_cmp(a, b));
    }
    parts.push(JoinValue::from(item_hashes));
    Ok(hash(&parts))
}

/// `matchItemsToSolutions`: hashes are checked against the items, tile indexes are looked up
/// with `at`, which wraps an index past either end.
pub fn match_items_to_solutions<S: Clone + Into<SolutionEntry>>(
    solutions: &[S],
    items: Option<&[CaptchaItem]>,
) -> Result<Vec<String>> {
    let Some(items) = items else {
        return Ok(Vec::new());
    };
    solutions
        .iter()
        .map(|solution: &S| match solution.clone().into() {
            SolutionEntry::Hash(hash) if is_hex(&hash) => {
                if items.iter().any(|item: &CaptchaItem| item.hash == hash) {
                    Ok(hash)
                } else {
                    Err(DatasetsError::new(
                        ErrorClass::Dataset,
                        "CAPTCHA.INVALID_ITEM_HASH",
                        None,
                    ))
                }
            }
            SolutionEntry::Index(index) => Ok(at_f64(items, index.get(), AtOptions::default())?
                .hash
                .clone()),
            SolutionEntry::Hash(_) => Err(DatasetsError::new(
                ErrorClass::Dataset,
                "CAPTCHA.INVALID_SOLUTION_TYPE",
                None,
            )),
        })
        .collect()
}

fn decode<T: serde::de::DeserializeOwned>(value: Value) -> T {
    serde_json::from_value(value).expect("the schema output has this shape")
}

/// `parseCaptchaDataset`: validates a dataset file and turns its tile-index solutions into
/// item hashes. The dataset's own `timeLimit` is dropped, as the TS drops it.
pub fn parse_captcha_dataset(input: &Value) -> Result<DatasetRaw<String>> {
    static SCHEMA: LazyLock<Schema> = LazyLock::new(dataset_with_numeric_solution_schema);
    const KEY: &str = "DATASET.DATASET_PARSE_ERROR";
    let parsed: DatasetRaw<JsNumber> = match SCHEMA.safe_parse(Some(input)) {
        Ok(value) => decode(value.unwrap_or(Value::Null)),
        Err(issues) => return Err(DatasetsError::zod(ErrorClass::Dataset, KEY, issues)),
    };
    let hashed = |solutions: &Option<Vec<JsNumber>>, items: &[CaptchaItem]| match solutions {
        Some(solutions) => match_items_to_solutions(solutions, Some(items)),
        None => Ok(Vec::new()),
    };
    let captchas: Vec<SelectAllCaptcha<String>> = parsed
        .captchas
        .into_iter()
        .map(|captcha: SelectAllCaptcha<JsNumber>| {
            Ok(SelectAllCaptcha {
                solution: Some(hashed(&captcha.solution, &captcha.items)?),
                unlabelled: Some(hashed(&captcha.unlabelled, &captcha.items)?),
                captcha_id: captcha.captcha_id,
                captcha_content_id: captcha.captcha_content_id,
                salt: captcha.salt,
                time_limit: captcha.time_limit,
                items: captcha.items,
                target: captcha.target,
            })
        })
        .collect::<Result<Vec<SelectAllCaptcha<String>>>>()
        .map_err(|error: DatasetsError| error.wrap(ErrorClass::Dataset, KEY))?;
    Ok(DatasetRaw {
        dataset_id: parsed.dataset_id,
        dataset_content_id: parsed.dataset_content_id,
        captchas,
        format: parsed.format,
        solution_tree: parsed.solution_tree,
        content_tree: parsed.content_tree,
        time_limit: None,
    })
}

/// `parseAndSortCaptchaSolutions`.
pub fn parse_and_sort_captcha_solutions(input: &Value) -> Result<Vec<CaptchaSolution>> {
    static SCHEMA: LazyLock<Schema> = LazyLock::new(captcha_solution_array_schema);
    match SCHEMA.safe_parse(Some(input)) {
        Ok(value) => {
            let mut solutions: Vec<CaptchaSolution> = decode(value.unwrap_or(Value::Null));
            for captcha in &mut solutions {
                js_sort(&mut captcha.solution);
            }
            Ok(solutions)
        }
        Err(issues) => Err(DatasetsError::zod(
            ErrorClass::Dataset,
            "DATASET.SOLUTION_PARSE_ERROR",
            issues,
        )),
    }
}

/// One entry of `sortAndComputeHashes`' result.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptchaIdHash {
    pub hash: String,
    pub captcha_id: String,
}

/// `sortAndComputeHashes`: sorts both lists by captcha id in place, then hashes each stored
/// captcha with the solution received for it (only if it was solved).
pub fn sort_and_compute_hashes(
    received: &mut [CaptchaSolution],
    stored: &mut [Captcha],
) -> Result<Vec<CaptchaIdHash>> {
    received.sort_by(|a, b| captcha_sort(&a.captcha_id, &b.captcha_id));
    stored.sort_by(|a, b| captcha_sort(&a.captcha_id, &b.captcha_id));
    let mut hashes: Vec<CaptchaIdHash> = Vec::with_capacity(stored.len());
    for (index, captcha) in stored.iter().enumerate() {
        let item: &mut CaptchaSolution =
            &mut received[resolve_at_index(received.len(), index as f64, false)?];
        if captcha.captcha_id != item.captcha_id {
            return Err(DatasetsError::new(
                ErrorClass::Env,
                "CAPTCHA.ID_MISMATCH",
                None,
            ));
        }
        let mut unsolved: Vec<String> = Vec::new();
        let solution: &mut [String] = if captcha.captcha.solved == Some(true) {
            &mut item.solution
        } else {
            &mut unsolved
        };
        let hash: String = compute_captcha_hash(
            CaptchaHashInput {
                target: &captcha.captcha.target,
                salt: &captcha.captcha.salt,
                items: &captcha.captcha.items,
                solution: Some(solution),
            },
            true,
            true,
            false,
        )?;
        hashes.push(CaptchaIdHash {
            hash,
            captcha_id: captcha.captcha_id.clone(),
        });
    }
    Ok(hashes)
}

/// `compareCaptchaSolutions`: whether every received solution is within `threshold` of the
/// stored one, counting wrong and missing items against `total_images`. Sorts both lists, and
/// the solutions it gets to, in place; it stops at the first captcha that fails.
pub fn compare_captcha_solutions(
    received: &mut [CaptchaSolution],
    solutions: &mut [SolutionRecord],
    total_images: f64,
    threshold: f64,
) -> bool {
    received.sort_by(|a, b| captcha_sort(&a.captcha_id, &b.captcha_id));
    solutions.sort_by(|a, b| captcha_sort(&a.solution.captcha_id, &b.solution.captcha_id));
    if received.is_empty() || received.len() != solutions.len() {
        return false;
    }
    if received
        .iter()
        .zip(solutions.iter())
        .any(|(captcha, solution)| captcha.captcha_id != solution.solution.captcha_id)
    {
        return false;
    }
    for (captcha, stored) in received.iter_mut().zip(solutions.iter_mut()) {
        js_sort(&mut captcha.solution);
        js_sort(&mut stored.solution.solution);
        let target: &[String] = &stored.solution.solution;
        let incorrect: usize = captcha
            .solution
            .iter()
            .filter(|solution| !target.contains(solution))
            .count();
        let missing: usize = target
            .iter()
            .filter(|solution| !captcha.solution.contains(solution))
            .count();
        let percentage_correct: f64 = 1.0 - (incorrect + missing) as f64 / total_images;
        if !(percentage_correct >= threshold) {
            return false;
        }
    }
    true
}

/// `computeCaptchaSolutionHash`: the commitment to one solved captcha.
pub fn compute_captcha_solution_hash(captcha: &CaptchaSolution) -> String {
    let mut solution: Vec<String> = captcha.solution.clone();
    js_sort(&mut solution);
    hash(&[
        JoinValue::from(captcha.captcha_id.as_str()),
        JoinValue::from(captcha.captcha_content_id.as_str()),
        JoinValue::from(solution),
        JoinValue::from(captcha.salt.as_str()),
    ])
}

/// `computePendingRequestHash`: identifies a pending request. Sorts `captcha_ids` in place.
pub fn compute_pending_request_hash(
    captcha_ids: &mut [String],
    user_account: JoinValue,
    salt: &str,
) -> String {
    js_sort(captcha_ids);
    let mut parts: Vec<JoinValue> = captcha_ids.iter().map(String::join_value).collect();
    parts.push(user_account);
    parts.push(JoinValue::from(salt));
    hash(&parts)
}

/// `AssetsResolver`: maps an item's data to the URL a widget fetches it from, or refuses to.
pub trait AssetsResolver {
    fn resolve_asset_url(&self, data: &str) -> std::result::Result<String, String>;
}

/// `parseCaptchaAssets`: the item with its data resolved, unless the resolver gives nothing.
pub fn parse_captcha_assets(
    item: &CaptchaItem,
    resolver: Option<&dyn AssetsResolver>,
) -> std::result::Result<CaptchaItem, String> {
    let resolved: String = match resolver {
        Some(resolver) => resolver.resolve_asset_url(&item.data)?,
        None => String::new(),
    };
    Ok(CaptchaItem {
        data: if resolved.is_empty() {
            item.data.clone()
        } else {
            resolved
        },
        ..item.clone()
    })
}
