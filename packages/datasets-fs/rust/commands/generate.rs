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

//! `generate-v1` and `generate-v2` (src/commands/generate*.ts): captchas drawn from labelled
//! and unlabelled data with a seeded lodash.
//!
//! As in the TS, `generate` never runs the output's check, so an existing output is neither
//! refused nor cleaned, only overwritten.

use super::{read_items, text, validate, Context};
use crate::args::{or, GenerateArgs, GenerateV1Args, GenerateV2Args};
use crate::error::{keyed, wrapped, Result};
use crate::node_fs;
use crate::progress::Progress;
use crate::salt::captcha_salt;
use prosopo_common::ErrorClass;
use prosopo_logger::{js_key_order, json_stringify, LogRecord};
use prosopo_types::datasets::{
    captchas_container_schema, data_schema, labelled_data_schema, labels_container_schema,
    CaptchaTypes,
};
use prosopo_util::SeededLodash;
use prosopo_util_crypto::js::js_number_to_string;
use serde_json::{json, Map, Value};

/// What `Generate._run` loads before a generator runs.
struct Loaded {
    unlabelled: Vec<Value>,
    /// `labelToImages`, by label in the order `Object.keys` gives them.
    label_to_images: Vec<(String, Vec<Value>)>,
    labels: Vec<String>,
}

impl Loaded {
    fn targets(&self) -> Vec<String> {
        self.label_to_images
            .iter()
            .map(|(label, _)| label.clone())
            .collect()
    }

    fn images(&self, label: &str) -> &[Value] {
        self.label_to_images
            .iter()
            .find(|(target, _)| target == label)
            .map_or(&[], |(_, images)| images.as_slice())
    }
}

/// `Generate._check`: the data files, when given, must exist.
fn check(args: &GenerateArgs) -> Result<(String, String)> {
    let labelled: &str = args.labelled.as_deref().unwrap_or("");
    if !labelled.is_empty() && !node_fs::exists(labelled) {
        return Err(wrapped(
            ErrorClass::Dataset,
            format!("labelled map file does not exist: {labelled}"),
            "FS.FILE_NOT_FOUND",
        ));
    }
    let unlabelled: &str = args.unlabelled.as_deref().unwrap_or("");
    if !unlabelled.is_empty() && !node_fs::exists(unlabelled) {
        return Err(wrapped(
            ErrorClass::Dataset,
            format!("unlabelled map file does not exist: {unlabelled}"),
            "FS.FILE_NOT_FOUND",
        ));
    }
    Ok((labelled.to_string(), unlabelled.to_string()))
}

/// `checkDuplicates`: no two entries share their `data`, across both lists, unless allowed.
fn check_duplicates(
    labelled: &[Value],
    unlabelled: &[Value],
    allow_labelled: bool,
    allow_unlabelled: bool,
) -> Result<()> {
    let mut seen: Vec<&str> = Vec::new();
    let lists: [(&[Value], bool, &str); 2] = [
        (labelled, allow_labelled, "labelled"),
        (unlabelled, allow_unlabelled, "unlabelled"),
    ];
    for (entries, allowed, data_type) in lists {
        if allowed {
            continue;
        }
        for entry in entries {
            let data: &str = text(&entry["data"]);
            if seen.contains(&data) {
                return Err(keyed(
                    ErrorClass::Dataset,
                    "DATASET.DUPLICATE_IMAGE",
                    vec![(
                        "error",
                        Value::from(format!(
                            "Duplicate data entry in {data_type} data: {}",
                            json_stringify(entry, 0)
                        )),
                    )],
                ));
            }
            seen.push(data);
        }
    }
    Ok(())
}

/// `Generate._run` after the output's run: the data and the labels.
fn load(args: &GenerateArgs, labelled_file: &str, unlabelled_file: &str) -> Result<Loaded> {
    let allow_duplicates: bool = args.allow_duplicates == Some(true);
    let allow_labelled: bool = args.allow_duplicates_labelled == Some(true) || allow_duplicates;
    let allow_unlabelled: bool = args.allow_duplicates_unlabelled == Some(true) || allow_duplicates;
    let labelled: Vec<Value> = if labelled_file.is_empty() {
        Vec::new()
    } else {
        read_items(&labelled_data_schema(), labelled_file)?
    };
    let unlabelled: Vec<Value> = if unlabelled_file.is_empty() {
        Vec::new()
    } else {
        read_items(&data_schema(), unlabelled_file)?
    };
    check_duplicates(&labelled, &unlabelled, allow_labelled, allow_unlabelled)?;

    let mut grouped: Map<String, Value> = Map::new();
    for entry in &labelled {
        let label: String = text(&entry["label"]).to_string();
        let group: &mut Value = grouped
            .entry(label)
            .or_insert_with(|| Value::Array(Vec::new()));
        if let Value::Array(images) = group {
            images.push(entry.clone());
        }
    }
    let label_to_images: Vec<(String, Vec<Value>)> = js_key_order(&grouped)
        .into_iter()
        .map(|label: &String| {
            let images: Vec<Value> = grouped[label.as_str()]
                .as_array()
                .cloned()
                .unwrap_or_default();
            (label.clone(), images)
        })
        .collect();

    let labels_file: &str = args.labels.as_deref().unwrap_or("");
    let labels: Vec<String> = if !labels_file.is_empty() && node_fs::exists(labels_file) {
        validate(
            &labels_container_schema(),
            &node_fs::read_json(labels_file)?,
        )?["labels"]
            .as_array()
            .map(|labels: &Vec<Value>| labels.iter().map(|label| text(label).to_string()).collect())
            .unwrap_or_default()
    } else {
        label_to_images
            .iter()
            .map(|(label, _)| label.clone())
            .collect()
    };
    Ok(Loaded {
        unlabelled,
        label_to_images,
        labels,
    })
}

/// `setSeedGlobal(args.seed || 0)` then `lodash()`.
fn seeded(args: &GenerateArgs) -> SeededLodash {
    SeededLodash::new(&js_number_to_string(or(Some(args.seed), 0.0)))
}

/// An item as a captcha lists it: `{ data, hash, type }`.
fn captcha_item(item: &Value) -> Value {
    let mut out: Map<String, Value> = Map::new();
    for key in ["data", "hash", "type"] {
        if let Some(value) = item.get(key) {
            out.insert(key.to_string(), value.clone());
        }
    }
    Value::Object(out)
}

fn shuffled_indices(lodash: &mut SeededLodash, length: usize) -> Vec<usize> {
    lodash.shuffle(&(0..length).collect::<Vec<usize>>())
}

/// The positions, after the shuffle, of the items that were at `range` before it.
fn positions(indices: &[usize], range: impl Fn(usize) -> bool) -> Vec<Value> {
    indices
        .iter()
        .enumerate()
        .filter(|(_, pre)| range(**pre))
        .map(|(post, _)| Value::from(post))
        .collect()
}

fn not_enough_labels() -> crate::error::DatasetsFsError {
    wrapped(
        ErrorClass::Dataset,
        "not enough different labels in labelled data",
        "DATASET.NOT_ENOUGH_LABELS",
    )
}

/// Writes `{ captchas, format: "SelectAll" }`, checked against `CaptchasContainerSchema`.
fn write_captchas(output: &str, captchas: Vec<Value>, context: &Context, log: bool) -> Result<()> {
    let container: Value =
        json!({ "captchas": captchas, "format": CaptchaTypes::SelectAll.as_str() });
    if log {
        context.logger.info(|| LogRecord::msg("verifying data"));
    }
    validate(&captchas_container_schema(), &container)?;
    if log {
        context.logger.info(|| LogRecord::msg("writing data"));
    }
    node_fs::mkdir_parent(output)?;
    node_fs::write_json(output, &container)
}

pub fn generate_v1(args: &GenerateV1Args, context: &mut Context) -> Result<()> {
    let base: &GenerateArgs = &args.generate;
    let (labelled_file, unlabelled_file) = check(base)?;
    let mut lodash: SeededLodash = seeded(base);
    let loaded: Loaded = load(base, &labelled_file, &unlabelled_file)?;
    let targets: Vec<String> = loaded.targets();

    let size: f64 = or(base.size, 9.0);
    let min_correct: f64 = or(args.min_correct, 1.0);
    let max_correct: f64 = or(args.max_correct, size - 1.0);
    let solved: f64 = or(args.solved, 0.0);
    let unsolved: f64 = or(args.unsolved, 0.0);

    let mut progress: Progress = Progress::start(solved + unsolved);
    let mut captchas: Vec<Value> = Vec::new();
    let mut i: usize = 0;
    while (i as f64) < solved {
        progress.increment();
        if targets.len() <= 1 {
            return Err(not_enough_labels());
        }
        let target: &str = &targets[i % targets.len()];
        let n_correct: f64 = lodash.random(min_correct, max_correct);
        let n_incorrect: f64 = size - n_correct;
        let target_items: &[Value] = loaded.images(target);
        let not_target_items: Vec<Value> = targets
            .iter()
            .filter(|other| *other != target)
            .flat_map(|other| loaded.images(other).to_vec())
            .collect();
        if (target_items.len() as f64) < n_correct {
            return Err(wrapped(
                ErrorClass::Env,
                format!("not enough images for target ({target})"),
                "DATASET.NOT_ENOUGH_IMAGES",
            ));
        }
        if (not_target_items.len() as f64) < n_incorrect {
            return Err(wrapped(
                ErrorClass::Dataset,
                format!("not enough non-matching images for target ({target})"),
                "DATASET.NOT_ENOUGH_IMAGES",
            ));
        }
        let correct: Vec<Value> = lodash.sample_size(target_items, n_correct);
        let incorrect: Vec<Value> = lodash.sample_size(&not_target_items, n_incorrect);
        let items: Vec<&Value> = correct.iter().chain(&incorrect).collect();
        let indices: Vec<usize> = shuffled_indices(&mut lodash, items.len());
        let correct_count: usize = correct.len();
        captchas.push(json!({
            "salt": captcha_salt(context.random.as_mut()),
            "target": target,
            "items": indices.iter().map(|index| captcha_item(items[*index])).collect::<Vec<Value>>(),
            "solution": positions(&indices, |pre| pre < correct_count),
        }));
        i += 1;
    }

    let mut i: usize = 0;
    while (i as f64) < unsolved {
        progress.increment();
        if (loaded.unlabelled.len() as f64) <= size {
            return Err(wrapped(
                ErrorClass::Dataset,
                "unlabelled map file does not contain enough data",
                "DATASET.NOT_ENOUGH_IMAGES",
            ));
        }
        if loaded.labels.is_empty() {
            return Err(wrapped(
                ErrorClass::Dataset,
                "no labels found for unlabelled data",
                "DATASET.NOT_ENOUGH_LABELS",
            ));
        }
        let index: f64 = lodash.random(0.0, loaded.labels.len() as f64 - 1.0);
        let target: &str = &loaded.labels[index as usize];
        let item_set: Vec<Value> = lodash.sample_size(&loaded.unlabelled, size);
        let indices: Vec<usize> = shuffled_indices(&mut lodash, item_set.len());
        captchas.push(json!({
            "salt": captcha_salt(context.random.as_mut()),
            "target": target,
            "items": indices.iter().map(|index| captcha_item(&item_set[*index])).collect::<Vec<Value>>(),
        }));
        i += 1;
    }
    progress.stop();
    write_captchas(&base.output, captchas, context, false)
}

pub fn generate_v2(args: &GenerateV2Args, context: &mut Context) -> Result<()> {
    let base: &GenerateArgs = &args.generate;
    let (labelled_file, unlabelled_file) = check(base)?;
    let mut lodash: SeededLodash = seeded(base);
    let loaded: Loaded = load(base, &labelled_file, &unlabelled_file)?;
    let targets: Vec<String> = loaded.targets();

    let size: f64 = or(base.size, 9.0);
    let min_correct: f64 = or(args.min_correct, 1.0);
    let min_incorrect: f64 = or(args.min_incorrect, 1.0).max(1.0);
    let min_labelled: f64 = min_correct + min_incorrect;
    let max_labelled: f64 = or(args.max_labelled, size).min(size);
    let count: f64 = or(args.count, 0.0);

    let mut progress: Progress = Progress::start(count);
    let mut captchas: Vec<Value> = Vec::new();
    let mut i: usize = 0;
    while (i as f64) < count {
        progress.increment();
        if targets.len() <= 1 {
            return Err(not_enough_labels());
        }
        let target: &str = &targets[i % targets.len()];
        let n_labelled: f64 = if loaded.unlabelled.is_empty() {
            size
        } else {
            lodash.random(min_labelled, max_labelled)
        };
        let n_correct: f64 = lodash.random(min_correct, n_labelled - min_correct);
        let n_incorrect: f64 = n_labelled - n_correct;
        let n_unlabelled: f64 = size - n_labelled;
        let target_items: &[Value] = loaded.images(target);
        let not_target_items: Vec<Value> = targets
            .iter()
            .filter(|other| *other != target)
            .flat_map(|other| loaded.images(other).to_vec())
            .collect();
        if !loaded.unlabelled.is_empty() && n_unlabelled > loaded.unlabelled.len() as f64 {
            return Err(wrapped(
                ErrorClass::Dataset,
                "not enough unlabelled data",
                "DATASET.NOT_ENOUGH_IMAGES",
            ));
        }
        if n_correct > target_items.len() as f64 {
            return Err(wrapped(
                ErrorClass::Dataset,
                format!("not enough images for target ({target})"),
                "DATASET.NOT_ENOUGH_IMAGES",
            ));
        }
        if n_incorrect > not_target_items.len() as f64 {
            return Err(wrapped(
                ErrorClass::Dataset,
                format!("not enough non-matching images for target ({target})"),
                "DATASET.NOT_ENOUGH_IMAGES",
            ));
        }

        let correct: Vec<Value> = lodash.sample_size(target_items, n_correct);
        let incorrect: Vec<Value> = lodash.sample_size(&not_target_items, n_incorrect);
        let mut unlabelled: Vec<usize> = Vec::new();
        if !loaded.unlabelled.is_empty() {
            while (unlabelled.len() as f64) < size - n_labelled {
                let picked: usize =
                    lodash.random(0.0, loaded.unlabelled.len() as f64 - 1.0) as usize;
                if !unlabelled.contains(&picked) {
                    unlabelled.push(picked);
                }
            }
        }
        let items: Vec<&Value> = correct
            .iter()
            .chain(&incorrect)
            .chain(unlabelled.iter().map(|index| &loaded.unlabelled[*index]))
            .collect();
        let indices: Vec<usize> = shuffled_indices(&mut lodash, items.len());
        let correct_count: usize = correct.len();
        let labelled_count: usize = correct.len() + incorrect.len();
        captchas.push(json!({
            "salt": captcha_salt(context.random.as_mut()),
            "target": target,
            "items": indices.iter().map(|index| captcha_item(items[*index])).collect::<Vec<Value>>(),
            "solution": positions(&indices, |pre| pre < correct_count),
            "unlabelled": positions(&indices, |pre| pre >= labelled_count),
        }));
        i += 1;
    }
    progress.stop();
    write_captchas(&base.output, captchas, context, true)
}
