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

//! `relocate`: rewrites every `data` string that starts with one prefix to start with
//! another, anywhere in a JSON file.

use super::{prepare_input_output, Context};
use crate::args::RelocateArgs;
use crate::error::{DatasetsFsError, Result};
use crate::node_fs;
use prosopo_logger::{js_key_order, LogRecord};
use serde_json::{json, Value};

/// The TS `replace`: arrays and objects are walked, a `data` key is never walked into, and
/// `null` fails as `Object.keys(null)` does.
fn replace(data: &mut Value, from: &str, to: &str) -> Result<()> {
    match data {
        Value::Array(items) => items
            .iter_mut()
            .try_for_each(|item| replace(item, from, to)),
        Value::Object(map) => {
            let keys: Vec<String> = js_key_order(map).into_iter().cloned().collect();
            for key in keys {
                let value: &mut Value = map.get_mut(&key).expect("a key of this object");
                if key == "data" {
                    if let Some(relocated) = value
                        .as_str()
                        .and_then(|text: &str| text.strip_prefix(from))
                        .map(|rest: &str| format!("{to}{rest}"))
                    {
                        *value = Value::from(relocated);
                    }
                } else {
                    replace(value, from, to)?;
                }
            }
            Ok(())
        }
        Value::Null => Err(DatasetsFsError::Type(
            "Cannot convert undefined or null to object".to_string(),
        )),
        _ => Ok(()),
    }
}

pub fn relocate(args: &RelocateArgs, context: &mut Context) -> Result<()> {
    prepare_input_output(&args.input, &args.output, args.overwrite, &context.logger)?;
    context
        .logger
        .info(|| LogRecord::msg("relocate").with_data(json!(args)));
    let mut data: Value = node_fs::read_json(&args.input)?;
    replace(&mut data, &args.from, &args.to)?;
    node_fs::mkdir_parent(&args.output)?;
    node_fs::write_json(&args.output, &data)
}
