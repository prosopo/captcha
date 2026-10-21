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

//! `labels`: every label in some labelled data, sorted.

use super::{prepare_input_output, read_items, text, Context};
use crate::args::LabelsArgs;
use crate::error::{wrapped, Result};
use crate::node_fs;
use prosopo_common::ErrorClass;
use prosopo_types::datasets::labelled_data_schema;
use prosopo_util_crypto::js::code_unit_cmp;
use serde_json::{json, Value};

pub fn labels(args: &LabelsArgs, context: &mut Context) -> Result<()> {
    prepare_input_output(&args.input, &args.output, args.overwrite, &context.logger)?;
    let file: &str = &args.input;
    if !node_fs::exists(file) {
        return Err(wrapped(
            ErrorClass::Dataset,
            format!("file does not exist: {file}"),
            "FS.FILE_NOT_FOUND",
        ));
    }
    let labelled: Vec<Value> = read_items(&labelled_data_schema(), file)?;
    let mut labels: Vec<&str> = Vec::new();
    for item in &labelled {
        let label: &str = text(&item["label"]);
        if !labels.contains(&label) {
            labels.push(label);
        }
    }
    labels.sort_by(|a, b| code_unit_cmp(a, b));
    node_fs::mkdir_parent(&args.output)?;
    node_fs::write_json(&args.output, &json!({ "labels": labels }))
}
