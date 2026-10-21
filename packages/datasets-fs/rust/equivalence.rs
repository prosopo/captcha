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

//! Replays rust/equivalence/vectors.json, written by generate.ts on Node 24: each command
//! run on the same input tree as the TS, compared by what it wrote (JSON byte for byte, other
//! files by digest) or threw. The TS's bcrypt bytes are replayed, so salts match too.

use crate::args::*;
use crate::salt::RandomBytes;
use crate::test_support::{repo_dir, run_in, ScratchDir};
use crate::*;
use prosopo_common::ProsopoError;
use prosopo_logger::{get_logger, LogLevel};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, VecDeque};
use std::path::Path;
use std::sync::{Arc, Mutex};

const VECTORS: &str = include_str!("equivalence/vectors.json");

/// The bytes the TS's `crypto.randomBytes` gave bcrypt, in order.
#[derive(Clone)]
struct Replay(Arc<Mutex<VecDeque<[u8; 16]>>>);

impl RandomBytes for Replay {
    fn salt_seed(&mut self) -> [u8; 16] {
        self.0
            .lock()
            .expect("replay lock")
            .pop_front()
            .expect("no more recorded salt bytes")
    }
}

fn seeds(scenario: &Value) -> Replay {
    Replay(Arc::new(Mutex::new(
        scenario["seeds"]
            .as_array()
            .expect("seeds")
            .iter()
            .map(|seed| {
                let bytes: Vec<u8> = (0..16)
                    .map(|i| {
                        u8::from_str_radix(&seed.as_str().expect("hex")[i * 2..i * 2 + 2], 16)
                            .expect("hex")
                    })
                    .collect();
                bytes.try_into().expect("16 bytes")
            })
            .collect(),
    )))
}

struct Placeholders {
    root: String,
    repo: String,
}

impl Placeholders {
    fn substitute(&self, text: &str) -> String {
        text.replace("@ROOT@", &self.root)
            .replace("@REPO@", &self.repo)
    }

    fn normalise(&self, text: &str) -> String {
        text.replace(&self.root, "@ROOT@")
            .replace(&self.repo, "@REPO@")
    }
}

fn setup(scenario: &Value, root: &Path, placeholders: &Placeholders) {
    for step in scenario["setup"].as_array().expect("setup") {
        let target = root.join(step["to"].as_str().expect("to"));
        match step["kind"].as_str().expect("kind") {
            "mkdir" => std::fs::create_dir_all(&target).expect("mkdir"),
            kind => {
                std::fs::create_dir_all(target.parent().expect("a parent")).expect("mkdir");
                if kind == "copy" {
                    std::fs::copy(
                        Path::new(&placeholders.repo).join(step["from"].as_str().expect("from")),
                        &target,
                    )
                    .expect("copy");
                } else {
                    std::fs::write(
                        &target,
                        placeholders.substitute(step["text"].as_str().expect("text")),
                    )
                    .expect("write");
                }
            }
        }
    }
}

fn error_json(error: &DatasetsFsError, placeholders: &Placeholders) -> Value {
    match error {
        DatasetsFsError::Prosopo(error) => {
            let error: &ProsopoError = error;
            json!({
                "kind": "prosopo",
                "class": error.error_type(),
                "key": error.translation_key(),
                "message": placeholders.normalise(error.message()),
                "context": error
                    .context()
                    .map(|context| serde_json::from_str::<Value>(&placeholders.normalise(&context.to_json().to_string())).expect("json")),
            })
        }
        DatasetsFsError::Invalid(issues) => json!({ "kind": "zod", "issues": issues }),
        DatasetsFsError::Json(_) => json!({ "kind": "json" }),
        DatasetsFsError::Fs(error) => {
            json!({ "kind": "fs", "code": error.code, "syscall": error.syscall })
        }
        DatasetsFsError::Type(message) => json!({ "kind": "type", "message": message }),
        DatasetsFsError::Image(message) => {
            json!({ "kind": "image", "message": placeholders.normalise(message) })
        }
    }
}

/// What the TS's `tree` records: every path under the root but `in`, directories with a
/// trailing `/`, JSON as text and anything else as its SHA-256.
fn tree(root: &Path, placeholders: &Placeholders) -> BTreeMap<String, Value> {
    fn walk(
        dir: &Path,
        root: &Path,
        placeholders: &Placeholders,
        out: &mut BTreeMap<String, Value>,
    ) {
        for entry in std::fs::read_dir(dir).expect("readdir") {
            let path = entry.expect("entry").path();
            let relative: String = path
                .strip_prefix(root)
                .expect("under root")
                .to_string_lossy()
                .into_owned();
            if relative == "in" || relative.starts_with("in/") {
                continue;
            }
            if path.is_dir() {
                out.insert(format!("{relative}/"), Value::Null);
                walk(&path, root, placeholders, out);
            } else if relative.ends_with(".json") {
                let text: String = std::fs::read_to_string(&path).expect("utf-8 json");
                out.insert(relative, json!({ "text": placeholders.normalise(&text) }));
            } else {
                let digest = Sha256::digest(std::fs::read(&path).expect("read"));
                let hex: String = digest.iter().map(|byte| format!("{byte:02x}")).collect();
                out.insert(relative, json!({ "sha256": hex }));
            }
        }
    }
    let mut out: BTreeMap<String, Value> = BTreeMap::new();
    walk(root, root, placeholders, &mut out);
    out
}

async fn exec(
    command: &str,
    args: &Value,
    context: &mut Context,
) -> Result<Option<Vec<GetOutcome>>> {
    match command {
        "flatten" => flatten(&parse(&flatten_args_schema(), args)?, context).map(|()| None),
        "resize" => resize(&parse(&resize_args_schema(), args)?, context).map(|()| None),
        "labels" => labels(&parse(&labels_args_schema(), args)?, context).map(|()| None),
        "relocate" => relocate(&parse(&relocate_args_schema(), args)?, context).map(|()| None),
        "generateV1" => {
            generate_v1(&parse(&generate_v1_args_schema(), args)?, context).map(|()| None)
        }
        "generateV2" => {
            generate_v2(&parse(&generate_v2_args_schema(), args)?, context).map(|()| None)
        }
        "get" => get(&parse(&get_args_schema(), args)?, context)
            .await
            .map(Some),
        other => panic!("no {other} command"),
    }
}

#[test]
fn salts_match_bcrypt() {
    let vectors: Value = serde_json::from_str(VECTORS).expect("vectors.json parses");
    for vector in vectors["salts"].as_array().expect("salts") {
        let seed: [u8; 16] = seeds(&json!({ "seeds": [vector["seed"]] })).salt_seed();
        let rounds: u8 = vector["rounds"].as_u64().expect("rounds") as u8;
        assert_eq!(
            crate::salt::gen_salt(rounds, &seed),
            vector["salt"].as_str().expect("a salt"),
            "{vector}"
        );
    }
}

/// Inputs the Rust deliberately does not open, which sharp does.
const UNSUPPORTED_FORMATS: [&str; 1] = ["resize vector.svg"];

#[tokio::test]
async fn commands_match_the_ts() {
    let vectors: Value = serde_json::from_str(VECTORS).expect("vectors.json parses");
    for scenario in vectors["scenarios"].as_array().expect("scenarios") {
        let label: &str = scenario["label"].as_str().expect("label");
        let scratch: ScratchDir = ScratchDir::new();
        let placeholders: Placeholders = Placeholders {
            root: scratch.path().to_string_lossy().into_owned(),
            repo: repo_dir(),
        };
        setup(scenario, scratch.path(), &placeholders);
        let args: Value =
            serde_json::from_str(&placeholders.substitute(&scenario["args"].to_string()))
                .expect("args");
        let replay: Replay = seeds(scenario);
        let mut context: Context = Context {
            logger: get_logger(LogLevel::Error, "datasets-fs:cli"),
            random: Box::new(replay.clone()),
        };
        let outcome: Result<Option<Vec<GetOutcome>>> = run_in(
            scratch.path(),
            exec(
                scenario["command"].as_str().expect("command"),
                &args,
                &mut context,
            ),
        )
        .await;

        if UNSUPPORTED_FORMATS.contains(&label) {
            assert!(scenario["error"].is_null(), "{label}: sharp opens it");
            match outcome {
                Err(DatasetsFsError::Image(message)) => {
                    assert_eq!(
                        message, "Input buffer contains unsupported image format",
                        "{label}"
                    )
                }
                other => panic!("{label}: expected the unsupported-format error, got {other:?}"),
            }
            continue;
        }
        let error: Value = match &outcome {
            Ok(_) => Value::Null,
            Err(error) => error_json(error, &placeholders),
        };
        assert_eq!(error, scenario["error"], "{label}: outcome");
        let expected: BTreeMap<String, Value> =
            serde_json::from_value(scenario["files"].clone()).expect("files");
        let actual: BTreeMap<String, Value> = tree(scratch.path(), &placeholders);
        assert_eq!(
            actual.keys().collect::<Vec<_>>(),
            expected.keys().collect::<Vec<_>>(),
            "{label}: paths"
        );
        for (path, value) in &expected {
            assert_eq!(&actual[path], value, "{label}: {path}");
        }
        if let Ok(Some(outcomes)) = &outcome {
            let logged: Vec<Value> = outcomes
                .iter()
                .map(|outcome| {
                    let url: String = placeholders.normalise(&outcome.url);
                    if outcome.ok {
                        json!(["info", format!("GET {url} OK")])
                    } else {
                        json!(["error", format!("GET {url} failed")])
                    }
                })
                .collect();
            assert_eq!(Value::from(logged), scenario["logged"], "{label}: urls");
        }
        assert!(
            replay.0.lock().expect("replay lock").is_empty(),
            "{label}: salts drawn"
        );
    }
}
