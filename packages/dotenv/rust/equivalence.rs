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

// Ported from rust/equivalence/generate.ts, which records dotenv.parse, getEnvFile and loadEnv.

use crate::{parse, populate, EnvContext, RealFs};
use prosopo_logger::{get_logger, LogLevel};
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;

const ROOT_TOKEN: &str = "<root>";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Vectors {
    parse: Vec<ParseVector>,
    tree: Vec<TreeNode>,
    default_filepath: String,
    discovery: Vec<DiscoveryVector>,
    load: Vec<LoadVector>,
}

#[derive(Deserialize)]
struct ParseVector {
    src: String,
    entries: Vec<(String, String)>,
}

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
enum TreeNode {
    Dir { path: String },
    File { path: String, contents: String },
}

#[derive(Deserialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
enum Outcome {
    Ok(String),
    Error(String),
}

type Args = (
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
);

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DiscoveryVector {
    cwd: String,
    node_env_var: Option<String>,
    args: Args,
    result: Outcome,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LoadVector {
    cwd: String,
    node_env_var: Option<String>,
    args: Args,
    #[serde(rename = "override")]
    override_existing: bool,
    preset: Vec<(String, String)>,
    result: Outcome,
    after: Vec<(String, Option<String>)>,
}

fn vectors() -> Vectors {
    serde_json::from_str(include_str!("equivalence/vectors.json")).expect("vectors.json parses")
}

struct Fixture {
    _dir: tempfile::TempDir,
    root: String,
    default_filepath_token: String,
}

impl Fixture {
    fn new(vectors: &Vectors) -> Fixture {
        let dir = tempfile::Builder::new()
            .prefix("prosopo-dotenv-eq-")
            .tempdir()
            .expect("temp dir");
        for node in &vectors.tree {
            match node {
                TreeNode::Dir { path } => {
                    std::fs::create_dir_all(dir.path().join(path)).expect("mkdir");
                }
                TreeNode::File { path, contents } => {
                    let full = dir.path().join(path);
                    std::fs::create_dir_all(full.parent().expect("parent")).expect("mkdir");
                    std::fs::write(full, contents).expect("write");
                }
            }
        }
        let root = dir.path().to_string_lossy().into_owned();
        Fixture {
            _dir: dir,
            root,
            default_filepath_token: vectors.default_filepath.clone(),
        }
    }

    fn untoken(&self, value: &Option<String>) -> Option<String> {
        value.as_ref().map(|v| v.replace(ROOT_TOKEN, &self.root))
    }

    fn ctx(&self, cwd: &str, node_env_var: &Option<String>) -> EnvContext {
        EnvContext {
            cwd: cwd.replace(ROOT_TOKEN, &self.root),
            node_env_var: node_env_var.clone(),
            default_filepath: self.default_filepath_token.clone(),
            fs: Arc::new(RealFs),
            logger: get_logger(LogLevel::Info, "dotenv"),
        }
    }

    fn tokenise(&self, path: &str) -> String {
        path.replace(&self.root, ROOT_TOKEN)
    }
}

#[test]
fn equivalence_parse() {
    let vectors = vectors();
    assert!(vectors.parse.len() > 1000);
    for vector in &vectors.parse {
        let actual: Vec<(String, String)> = parse(&vector.src).into_iter().collect();
        assert_eq!(actual, vector.entries, "parse({:?})", vector.src);
    }
}

#[test]
fn equivalence_discovery() {
    let vectors = vectors();
    let fixture = Fixture::new(&vectors);
    for vector in &vectors.discovery {
        let ctx = fixture.ctx(&vector.cwd, &vector.node_env_var);
        let (root_dir, filename, filepath, node_env) = &vector.args;
        let root_dir = fixture.untoken(root_dir);
        let filepath = fixture.untoken(filepath);
        let actual = match ctx.get_env_file(
            root_dir.as_deref(),
            filename.as_deref(),
            filepath.as_deref(),
            node_env.as_deref(),
        ) {
            Ok(path) => Outcome::Ok(fixture.tokenise(&path)),
            Err(error) => Outcome::Error(error.kind()),
        };
        assert_eq!(
            actual, vector.result,
            "cwd {:?}, NODE_ENV {:?}, args {:?}",
            vector.cwd, vector.node_env_var, vector.args
        );
    }
}

#[test]
fn equivalence_load() {
    let vectors = vectors();
    let fixture = Fixture::new(&vectors);
    for vector in &vectors.load {
        let ctx = fixture.ctx(&vector.cwd, &vector.node_env_var);
        let (root_dir, filename, file_path, node_env) = &vector.args;
        let root_dir = fixture.untoken(root_dir);
        let file_path = fixture.untoken(file_path);
        let mut env: HashMap<String, String> = vector.preset.iter().cloned().collect();
        let actual = match ctx.read_env(
            root_dir.as_deref(),
            filename.as_deref(),
            file_path.as_deref(),
            node_env.as_deref(),
        ) {
            Ok(loaded) => {
                let assignments = populate(
                    &loaded.parsed,
                    |key| env.contains_key(key),
                    vector.override_existing,
                );
                env.extend(assignments);
                Outcome::Ok(fixture.tokenise(&loaded.path))
            }
            Err(error) => Outcome::Error(error.kind()),
        };
        let context = format!(
            "cwd {:?}, NODE_ENV {:?}, args {:?}, override {}, preset {:?}",
            vector.cwd, vector.node_env_var, vector.args, vector.override_existing, vector.preset
        );
        assert_eq!(actual, vector.result, "{context}");
        for (key, expected) in &vector.after {
            assert_eq!(env.get(key), expected.as_ref(), "{key} after {context}");
        }
    }
}
