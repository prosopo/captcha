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

//! Replays rust/equivalence/vectors.json, written by generate.ts on Node 24 from the TS: the
//! compressors a URL gets, the connection options, and the URL and database name a
//! `MongoDatabase` builds.

use crate::mongo::{build_url, mask_credentials};
use crate::options::{get_mongo_compressors, get_mongo_connection_options, ConnectionArgs, MongoCompressor};
use serde_json::{json, Value};

const VECTORS: &str = include_str!("equivalence/vectors.json");

fn vectors() -> Value {
    serde_json::from_str(VECTORS).expect("vectors.json parses")
}

fn compressor(name: &str) -> MongoCompressor {
    match name {
        "zstd" => MongoCompressor::Zstd,
        "none" => MongoCompressor::None,
        "snappy" => MongoCompressor::Snappy,
        "zlib" => MongoCompressor::Zlib,
        other => panic!("no compressor {other}"),
    }
}

fn names(compressors: &[MongoCompressor]) -> Value {
    json!(compressors.iter().map(|c| c.as_str()).collect::<Vec<&str>>())
}

#[test]
fn compressors_match_the_ts() {
    let vectors: Value = vectors();
    for case in vectors["compressors"].as_array().expect("cases") {
        let url: &str = case["url"].as_str().expect("url");
        let list: Vec<MongoCompressor> = match case["list"].as_array() {
            Some(list) => list.iter().map(|name| compressor(name.as_str().expect("name"))).collect(),
            None => Vec::new(),
        };
        assert_eq!(names(&get_mongo_compressors(url, &list)), case["result"], "{url} with {}", case["list"]);
    }
}

#[test]
fn connection_options_match_the_ts() {
    let vectors: Value = vectors();
    for case in vectors["connectionOptions"].as_array().expect("cases") {
        let url: &str = case["url"].as_str().expect("url");
        let extra: &Value = &case["extra"];
        let args: ConnectionArgs = ConnectionArgs {
            url: url.to_string(),
            app_name: "test-app".to_string(),
            max_pool_size: extra["maxPoolSize"].as_u64().map(|n| n as u32),
            min_pool_size: extra["minPoolSize"].as_u64().map(|n| n as u32),
            db_name: extra["dbName"].as_str().map(str::to_string),
            connect_timeout_ms: extra["connectTimeoutMS"].as_u64(),
            server_selection_timeout_ms: extra["serverSelectionTimeoutMS"].as_u64(),
        };
        match (get_mongo_connection_options(&args), case.get("error")) {
            (Ok(options), None) => {
                let mut expected: Value = json!({
                    "serverApi": { "version": "1", "strict": false, "deprecationErrors": false },
                    "maxPoolSize": options.max_pool_size,
                    "minPoolSize": options.min_pool_size,
                    "maxConnecting": options.max_connecting,
                    "connectTimeoutMS": options.connect_timeout_ms,
                    "socketTimeoutMS": options.socket_timeout_ms,
                    "maxIdleTimeMS": options.max_idle_time_ms,
                    "appName": options.app_name,
                    "serverSelectionTimeoutMS": options.server_selection_timeout_ms,
                    "compressors": names(&options.compressors),
                });
                if let Some(name) = &options.db_name {
                    expected["dbName"] = json!(name);
                }
                assert_eq!(expected, case["options"], "{url} {extra}");
            }
            (Err(error), Some(thrown)) => assert_eq!(json!(error.to_string()), thrown["message"], "{url}"),
            (actual, expected) => panic!("{url}: rust {actual:?}, ts {expected:?}"),
        }
    }
}

#[test]
fn database_urls_and_names_match_the_ts() {
    let vectors: Value = vectors();
    let mut checked: usize = 0;
    for case in vectors["databases"].as_array().expect("cases") {
        let args: &Value = &case["args"];
        let url: &str = args["url"].as_str().expect("url");
        let built = build_url(url, args["dbname"].as_str(), args["authSource"].as_str());
        match (built, case.get("error")) {
            (Ok((built_url, dbname)), None) => {
                assert_eq!(json!(built_url), case["url"], "{args}");
                assert_eq!(json!(dbname), case["dbname"], "{args}");
                let masked: String = mask_credentials(&built_url);
                assert!(!masked.contains("pass") && !masked.contains("S3cr3t"), "{masked}");
            }
            (Err(_), Some(_)) => {}
            (actual, expected) => panic!("{args}: rust {actual:?}, ts {expected:?}"),
        }
        checked += 1;
    }
    assert!(checked > 900);
}
