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

//! The commands (src/commands), each run as the TS `exec` runs it: the checks of the input
//! and output commands it is composed of, then the input's, the output's and its own work.

mod flatten;
mod generate;
mod get;
mod labels;
mod relocate;
mod resize;

pub use flatten::flatten;
pub use generate::{generate_v1, generate_v2};
pub use get::{get, GetOutcome};
pub use labels::labels;
pub use relocate::relocate;
pub use resize::resize;

use crate::error::{wrapped, DatasetsFsError, Result};
use crate::node_fs;
use crate::salt::{OsRandom, RandomBytes};
use prosopo_api_route::schema::Schema;
use prosopo_common::ErrorClass;
use prosopo_logger::{get_logger, LogLevel, LogRecord, Logger};
use serde_json::Value;

/// What every command runs with.
pub struct Context {
    pub logger: Logger,
    pub random: Box<dyn RandomBytes>,
}

impl Context {
    pub fn new(random: Box<dyn RandomBytes>) -> Context {
        Context {
            logger: get_logger(LogLevel::Info, "datasets-fs:cli"),
            random,
        }
    }
}

impl Default for Context {
    fn default() -> Context {
        Context::new(Box::new(OsRandom))
    }
}

/// `InputCliCommand._check`.
fn check_input(input: &str) -> Result<()> {
    if node_fs::exists(input) {
        Ok(())
    } else {
        Err(wrapped(
            ErrorClass::Dataset,
            format!("input path does not exist: {input}"),
            "FS.FILE_NOT_FOUND",
        ))
    }
}

/// `OutputCliCommand._check`: whether the output already exists.
fn check_output(output: &str, overwrite: Option<bool>) -> Result<bool> {
    let exists: bool = node_fs::exists(output);
    if exists && overwrite != Some(true) {
        return Err(wrapped(
            ErrorClass::Env,
            format!("output path already exists: {output}"),
            "FS.FILE_ALREADY_EXISTS",
        ));
    }
    Ok(exists)
}

/// `OutputCliCommand._run`: an output that existed at the check is removed when overwriting.
fn run_output(output: &str, overwrite: Option<bool>, existed: bool, logger: &Logger) -> Result<()> {
    if overwrite == Some(true) && existed {
        logger.info(|| LogRecord::msg("cleaning output directory..."));
        node_fs::remove(output)?;
    }
    Ok(())
}

/// The checks and the input and output runs of an `InputOutputCliCommand`.
fn prepare_input_output(
    input: &str,
    output: &str,
    overwrite: Option<bool>,
    logger: &Logger,
) -> Result<()> {
    check_input(input)?;
    let existed: bool = check_output(output, overwrite)?;
    run_output(output, overwrite, existed, logger)
}

/// `Schema.parse(value)`.
fn validate(schema: &Schema, value: &Value) -> Result<Value> {
    schema
        .safe_parse(Some(value))
        .map(|parsed| parsed.unwrap_or(Value::Null))
        .map_err(DatasetsFsError::Invalid)
}

/// `Schema.parse(JSON.parse(fs.readFileSync(path, "utf8"))).items`.
fn read_items(schema: &Schema, path: &str) -> Result<Vec<Value>> {
    let parsed: Value = validate(schema, &node_fs::read_json(path)?)?;
    Ok(parsed["items"].as_array().cloned().unwrap_or_default())
}

fn text(value: &Value) -> &str {
    value.as_str().unwrap_or("")
}
