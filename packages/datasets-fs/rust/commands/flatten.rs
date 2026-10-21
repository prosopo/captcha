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

//! `flatten`: a directory per label becomes one directory of images named by their hash,
//! and a data file listing them.

use super::{prepare_input_output, validate, Context};
use crate::args::FlattenArgs;
use crate::error::{keyed, Result};
use crate::node_fs;
use crate::progress::Progress;
use prosopo_common::ErrorClass;
use prosopo_logger::LogRecord;
use prosopo_types::datasets::{data_schema, CaptchaItemTypes};
use prosopo_util_crypto::js::code_unit_cmp;
use prosopo_util_crypto::{hex_hash, U8aLike};
use serde_json::{json, Value};

pub fn flatten(args: &FlattenArgs, context: &mut Context) -> Result<()> {
    let logger = &context.logger;
    prepare_input_output(&args.input, &args.output, args.overwrite, logger)?;
    let data_dir: &str = &args.input;
    let out_dir: &str = &args.output;

    logger.info(|| LogRecord::msg("reading data"));
    let mut labels: Vec<String> = node_fs::read_subdirectories(data_dir)?;
    labels.sort_by(|a, b| code_unit_cmp(a, b));
    let images_by_label: Vec<Vec<String>> = labels
        .iter()
        .map(|label: &String| node_fs::read_dir(&format!("{data_dir}/{label}")))
        .collect::<Result<Vec<Vec<String>>>>()?;

    let image_dir: String = format!("{out_dir}/images");
    node_fs::mkdir_all(&image_dir)?;

    let mut progress: Progress =
        Progress::start(images_by_label.iter().map(Vec::len).sum::<usize>() as f64);
    let mut items: Vec<Value> = Vec::new();
    for (label, images) in labels.iter().zip(&images_by_label) {
        for image in images {
            progress.increment();
            let extension: &str = image.rsplit('.').next().unwrap_or("");
            let source: String = format!("{data_dir}/{label}/{image}");
            let content: Vec<u8> = node_fs::read(&source)?;
            let hex: String = hex_hash(U8aLike::Bytes(&content), None).expect("a blake2 digest");
            let name: String = format!("{hex}.{extension}");
            let dest: String = format!("{image_dir}/{name}");
            if node_fs::exists(&dest) {
                for item in items
                    .iter()
                    .filter(|item: &&Value| item["hash"] == hex.as_str())
                {
                    logger.info(|| {
                        LogRecord::msg(format!("\ndupe: {label}/{image}"))
                            .with_data(json!({ "item": item }))
                    });
                }
                if args.allow_duplicates != Some(true) {
                    return Err(keyed(
                        ErrorClass::Dataset,
                        "DATASET.DUPLICATE_IMAGE",
                        vec![("image", Value::from(format!("{label}/{image}")))],
                    ));
                }
            }
            node_fs::copy_file(&source, &dest)?;
            items.push(json!({
                "data": node_fs::realpath(&dest)?,
                "type": CaptchaItemTypes::Image.as_str(),
                "label": label,
                "hash": hex,
            }));
        }
    }
    progress.stop();

    let data: Value = json!({ "items": items });
    logger.info(|| LogRecord::msg("verifying data").with_data(data.clone()));
    validate(&data_schema(), &data)?;
    logger.info(|| LogRecord::msg("writing data"));
    node_fs::write_json(&format!("{out_dir}/data.json"), &data)
}
