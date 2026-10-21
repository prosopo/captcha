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

//! `get`: fetches every `data` url in a JSON file, or reads it when it is a local path,
//! and logs which fail.

use super::{check_input, validate, Context};
use crate::args::InputArgs;
use crate::error::Result;
use crate::node_fs;
use crate::progress::Progress;
use prosopo_api_route::schema::string;
use prosopo_logger::{js_key_order, LogRecord};
use serde_json::{json, Value};

/// What `get` found for one url.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GetOutcome {
    pub url: String,
    pub ok: bool,
}

/// Every `data` value in document order; a `data` that is not a string fails as
/// `z.string().parse` does.
fn collect(data: &Value, urls: &mut Vec<String>) -> Result<()> {
    match data {
        Value::Array(items) => items.iter().try_for_each(|item| collect(item, urls)),
        Value::Object(map) => {
            for key in js_key_order(map) {
                if key == "data" {
                    let url: Value = validate(&string(), &map[key.as_str()])?;
                    urls.push(url.as_str().unwrap_or("").to_string());
                } else {
                    collect(&map[key.as_str()], urls)?;
                }
            }
            Ok(())
        }
        _ => Ok(()),
    }
}

pub async fn get(args: &InputArgs, context: &mut Context) -> Result<Vec<GetOutcome>> {
    check_input(&args.input)?;
    let mut urls: Vec<String> = Vec::new();
    collect(&node_fs::read_json(&args.input)?, &mut urls)?;

    let logger = &context.logger;
    let client: reqwest::Client = reqwest::Client::new();
    let mut progress: Progress = Progress::start(urls.len() as f64);
    let mut outcomes: Vec<GetOutcome> = Vec::new();
    for url in urls {
        progress.increment();
        let ok: bool = if url.starts_with("http") {
            match client.get(&url).send().await {
                Ok(response) if response.status().is_success() => true,
                Ok(response) => {
                    let status = response.status();
                    logger.error(|| {
                        LogRecord::msg(format!("GET {url} failed")).with_data(json!({
                            "url": url,
                            "status": status.as_u16(),
                            "statusText": status.canonical_reason().unwrap_or(""),
                        }))
                    });
                    false
                }
                Err(error) => {
                    logger.error(|| {
                        LogRecord::msg(format!("GET {url} failed"))
                            .with_data(json!({ "url": url }))
                            .with_err(error.to_string())
                    });
                    false
                }
            }
        } else {
            match node_fs::read(&url) {
                Ok(_) => true,
                Err(error) => {
                    logger.error(|| {
                        LogRecord::msg(format!("GET {url} failed"))
                            .with_data(json!({ "url": url }))
                            .with_err(error.to_string())
                    });
                    false
                }
            }
        };
        if ok {
            logger.info(|| LogRecord::msg(format!("GET {url} OK")));
        }
        outcomes.push(GetOutcome { url, ok });
    }
    progress.stop();
    Ok(outcomes)
}
