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

//! Replays rust/equivalence/detection-vectors.json, written by generate-detection.ts from
//! bundlePool.ts on Node 24: loading awkward pool directories, and persisting over full ones.

use crate::tasks::detection::{persist_detector_bundle_pool, DetectorBundlePool, PoolBundle};
use prosopo_logger::{ConsoleMethod, LogLevel, LogRuntime, Logger, Sink};
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tempfile::TempDir;

const VECTORS: &str = include_str!("equivalence/detection-vectors.json");

fn vectors() -> Value {
    serde_json::from_str(VECTORS).expect("detection-vectors.json parses")
}

fn field<'a>(value: &'a Value, key: &str) -> &'a Value {
    value.get(key).unwrap_or_else(|| panic!("vector has no {key}: {value}"))
}

fn hex_bytes(text: &str) -> Vec<u8> {
    (0..text.len()).step_by(2).map(|i| u8::from_str_radix(&text[i..i + 2], 16).expect("hex")).collect()
}

fn write_tree(dir: &Path, entries: &Value) {
    let Some(entries) = entries.as_object() else {
        return;
    };
    for (name, entry) in entries {
        if entry.get("dir").is_some() {
            std::fs::create_dir(dir.join(name)).expect("creates");
        } else {
            std::fs::write(dir.join(name), hex_bytes(field(entry, "hex").as_str().expect("hex"))).expect("writes");
        }
    }
}

#[derive(Default)]
struct Lines(Mutex<Vec<String>>);

impl Sink for Lines {
    fn write(&self, _method: ConsoleMethod, line: &str) {
        self.0.lock().expect("unpoisoned").push(line.to_string());
    }
}

/// The TS records `(level, msg, data)` with the pool directory written `<dir>`; the error text
/// of a failed load is the parser's own, so it is left out on both sides.
fn logged(lines: &[String], dir: &Path) -> Vec<String> {
    let dir: String = serde_json::to_string(&dir.to_string_lossy()).expect("a string");
    let mut out: Vec<String> = lines
        .iter()
        .map(|line| {
            let record: Value = serde_json::from_str(&line.replace(&dir[1..dir.len() - 1], "<dir>")).expect("a JSON line");
            let msg: &str = field(&record, "msg").as_str().expect("msg");
            let mut data: Value = record.get("data").cloned().unwrap_or(Value::Null);
            if msg.starts_with("failed to load") {
                data = json!({ "bundleId": data["bundleId"] });
            }
            json!({ "level": record["level"], "msg": msg, "data": data }).to_string()
        })
        .collect();
    out.sort();
    out
}

fn expected_logs(logs: &Value) -> Vec<String> {
    let mut out: Vec<String> = logs.as_array().expect("logs").iter().map(Value::to_string).collect();
    out.sort();
    out
}

fn describe(pool: &DetectorBundlePool) -> Value {
    Value::Array(
        (0..pool.size())
            .map(|i| {
                let (bundle_id, bundle) = pool.at(i).expect("a bundle");
                let mut out: Map<String, Value> = Map::new();
                out.insert("id".into(), json!(bundle_id));
                out.insert("js".into(), json!(bundle.js));
                out.insert("privateKey".into(), json!(bundle.private_key));
                out.insert("innerConfig".into(), json!(bundle.inner_config));
                for (key, value) in [("release", &bundle.release), ("payloadLayout", &bundle.payload_layout), ("keyMap", &bundle.key_map)] {
                    if let Some(value) = value {
                        out.insert(key.into(), json!(value));
                    }
                }
                Value::Object(out)
            })
            .collect(),
    )
}

#[test]
fn equivalence_loads_pool_directories() {
    for case in field(&vectors(), "loads").as_array().expect("loads") {
        let name: &str = field(case, "name").as_str().expect("name");
        let temp: TempDir = TempDir::new().expect("a dir");
        let dir = if field(case, "entries").is_null() { temp.path().join("pool-vectors-does-not-exist") } else { temp.path().to_path_buf() };
        write_tree(&dir, field(case, "entries"));
        let lines: Arc<Lines> = Arc::new(Lines::default());
        let logger: Logger = Logger::with_runtime("test", LogRuntime { sink: lines.clone(), ..LogRuntime::default() });
        logger.set_log_level(LogLevel::Info);
        let expected_release: Option<&str> = field(case, "expectedRelease").as_str();
        let pool: DetectorBundlePool = DetectorBundlePool::load_from_dir(&dir, &logger, expected_release);
        assert_eq!(describe(&pool), *field(case, "pool"), "{name} ({expected_release:?})");
        assert_eq!(logged(&lines.0.lock().expect("unpoisoned"), &dir), expected_logs(field(case, "logs")), "{name} ({expected_release:?})");
    }
}

fn umask() -> u32 {
    let temp: TempDir = TempDir::new().expect("a dir");
    let probe = temp.path().join("probe");
    std::fs::write(&probe, "").expect("writes");
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        0o666 & !std::fs::metadata(&probe).expect("stats").permissions().mode()
    }
    #[cfg(not(unix))]
    0
}

fn listing(dir: &Path) -> Value {
    let mut names: Vec<String> = std::fs::read_dir(dir).expect("lists").flatten().map(|entry| entry.file_name().to_string_lossy().into_owned()).collect();
    names.sort_by(|a, b| a.encode_utf16().cmp(b.encode_utf16()));
    Value::Array(
        names
            .into_iter()
            .map(|name| {
                let path = dir.join(&name);
                let metadata = std::fs::metadata(&path).expect("stats");
                #[cfg(unix)]
                let mode: u32 = std::os::unix::fs::PermissionsExt::mode(&metadata.permissions()) & 0o777;
                #[cfg(not(unix))]
                let mode: u32 = 0;
                if metadata.is_dir() {
                    json!({ "name": name, "mode": mode, "dir": true })
                } else {
                    let hex: String = std::fs::read(&path).expect("reads").iter().map(|byte| format!("{byte:02x}")).collect();
                    json!({ "name": name, "mode": mode, "hex": hex })
                }
            })
            .collect(),
    )
}

fn pool_bundle(value: &Value) -> PoolBundle {
    let text = |key: &str| value.get(key).and_then(Value::as_str).map(str::to_string);
    PoolBundle {
        js: text("js").expect("js"),
        private_key: text("privateKey").expect("privateKey"),
        inner_config: text("innerConfig").expect("innerConfig"),
        release: text("release"),
        payload_layout: text("payloadLayout"),
        key_map: text("keyMap"),
    }
}

#[cfg(unix)]
#[test]
fn equivalence_persists_pools() {
    use std::os::unix::fs::MetadataExt;
    let vectors: Value = vectors();
    assert_eq!(Some(u64::from(umask())), field(&vectors, "umask").as_u64(), "the vectors' file modes assume the generator's umask");
    for case in field(&vectors, "persists").as_array().expect("persists") {
        let name: &str = field(case, "name").as_str().expect("name");
        let temp: TempDir = TempDir::new().expect("a dir");
        write_tree(temp.path(), field(case, "before"));
        let inode: u64 = std::fs::metadata(temp.path()).expect("stats").ino();
        let bundles: HashMap<String, PoolBundle> = field(case, "bundles")
            .as_array()
            .expect("bundles")
            .iter()
            .map(|pair| (pair[0].as_str().expect("an id").to_string(), pool_bundle(&pair[1])))
            .collect();
        persist_detector_bundle_pool(&bundles, temp.path()).expect("persists");
        assert_eq!(listing(temp.path()), *field(case, "after"), "{name}");
        assert_eq!(std::fs::metadata(temp.path()).expect("stats").ino() == inode, field(case, "sameDirectory").as_bool().expect("a flag"), "{name}");
    }
}
