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

//! `resize`: every image in a data file re-encoded at a given size, named by its hash.

use super::{prepare_input_output, read_items, text, validate, Context};
use crate::args::ResizeArgs;
use crate::error::{wrapped, DatasetsFsError, Result};
use crate::node_fs;
use crate::progress::Progress;
use crate::vips::{Fit, Vips};
use prosopo_common::ErrorClass;
use prosopo_logger::LogRecord;
use prosopo_types::datasets::data_schema;
use prosopo_util_crypto::js::js_number_to_string;
use prosopo_util_crypto::u8a::u8a_to_hex;
use prosopo_util_crypto::{blake2_as_u8a, U8aLike};
use serde_json::{json, Value};

const MAX_DIMENSION: f64 = 100_000_000.0;

/// sharp's check of `resize({ width })`.
fn dimension(size: f64) -> Result<i32> {
    if size.fract() == 0.0 && (1.0..=MAX_DIMENSION).contains(&size) {
        Ok(size as i32)
    } else {
        Err(DatasetsFsError::Image(format!(
            "Expected positive integer between 1 and 100000000 for width but received {} of type number",
            js_number_to_string(size)
        )))
    }
}

pub fn resize(args: &ResizeArgs, context: &mut Context) -> Result<()> {
    let logger = &context.logger;
    prepare_input_output(&args.input, &args.output, args.overwrite, logger)?;
    let fit: Fit = if args.square == Some(true) {
        Fit::Cover
    } else {
        Fit::Inside
    };
    let map_file: &str = &args.input;
    if !node_fs::exists(map_file) {
        return Err(wrapped(
            ErrorClass::Dataset,
            format!("Map file does not exist: {map_file}"),
            "FS.FILE_NOT_FOUND",
        ));
    }
    let out_dir: &str = &args.output;
    if args.overwrite != Some(true) && node_fs::exists(out_dir) {
        return Err(wrapped(
            ErrorClass::Env,
            format!("Output directory already exists: {out_dir}"),
            "FS.FILE_NOT_FOUND",
        ));
    }
    let image_dir: String = format!("{out_dir}/images");
    node_fs::mkdir_all(&image_dir)?;

    let input_items: Vec<Value> = read_items(&data_schema(), map_file)?;
    let mut progress: Progress = Progress::start(input_items.len() as f64);
    let mut output_items: Vec<Value> = Vec::new();
    for input_item in input_items {
        progress.increment();
        let image: Vec<u8> = node_fs::read(text(&input_item["data"]))?;
        if image.is_empty() {
            return Err(DatasetsFsError::Image("Input Buffer is empty".to_string()));
        }
        let size: i32 = dimension(args.size)?;
        let vips: &Vips = Vips::get().map_err(DatasetsFsError::Image)?;
        let tmp_file: String = format!("{image_dir}/tmp.jpg");
        vips.resize_to_jpeg(&image, size, fit, std::path::Path::new(&tmp_file))
            .map_err(DatasetsFsError::Image)?;
        let resized: Vec<u8> = node_fs::read(&tmp_file)?;
        let hex: String = u8a_to_hex(
            &blake2_as_u8a(U8aLike::Bytes(&resized), 512, None).expect("a blake2 digest"),
        );
        let final_file: String = format!("{image_dir}/{hex}.jpg");
        node_fs::rename(&tmp_file, &final_file)?;
        let mut output_item: Value = input_item;
        output_item["hash"] = Value::from(hex);
        output_item["data"] = Value::from(node_fs::realpath(&final_file)?);
        output_items.push(output_item);
    }
    progress.stop();

    let data: Value = json!({ "items": output_items });
    logger.info(|| LogRecord::msg("verifying data"));
    validate(&data_schema(), &data)?;
    logger.info(|| LogRecord::msg("writing data"));
    node_fs::mkdir_parent(&args.output)?;
    node_fs::write_json(&format!("{out_dir}/data.json"), &data)
}
