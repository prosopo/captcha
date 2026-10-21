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

// Ported from src/tests/thrownErrorKeys.unit.test.ts

use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;

use regex::Regex;

use crate::translation_key::is_translation_key;

static THROWN_KEY: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"Error\(\s*["']([A-Z][A-Z_]*\.[A-Z0-9_]+)["']"#).expect("valid regex")
});
static REASON_KEY: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"=\s*"([A-Z][A-Z_]*\.[A-Z0-9_]+)""#).expect("valid regex"));

fn packages_directory() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("packages directory")
        .to_path_buf()
}

fn source_files(directory: &Path, into: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };
    let mut entries: Vec<fs::DirEntry> = entries.map(|entry| entry.expect("entry")).collect();
    entries.sort_by_key(fs::DirEntry::file_name);
    for entry in entries {
        let name: String = entry.file_name().to_string_lossy().into_owned();
        let path: PathBuf = entry.path();
        if path.is_dir() {
            if name != "tests" && name != "node_modules" {
                source_files(&path, into);
            }
        } else if name.ends_with(".ts") && !name.contains(".test.") {
            into.push(path);
        }
    }
}

fn workspace_sources() -> Vec<PathBuf> {
    let mut files: Vec<PathBuf> = Vec::new();
    for package in fs::read_dir(packages_directory()).expect("packages") {
        let source: PathBuf = package.expect("entry").path().join("src");
        if source.exists() {
            source_files(&source, &mut files);
        }
    }
    files
}

fn uncatalogued_keys(files: &[PathBuf], pattern: &Regex) -> BTreeSet<String> {
    let mut missing: BTreeSet<String> = BTreeSet::new();
    for file in files {
        let text: String = fs::read_to_string(file).expect("source file");
        for captures in pattern.captures_iter(&text) {
            let key: &str = &captures[1];
            if !is_translation_key(key) {
                let relative = file.strip_prefix(packages_directory()).unwrap_or(file);
                missing.insert(format!("{key} ({})", relative.display()));
            }
        }
    }
    missing
}

#[test]
fn every_key_an_error_class_is_constructed_with_is_in_the_catalogue() {
    assert!(uncatalogued_keys(&workspace_sources(), &THROWN_KEY).is_empty());
}

#[test]
fn every_result_reason_is_in_the_catalogue() {
    let reasons: PathBuf = packages_directory().join("types/src/provider/reasons.ts");
    assert!(uncatalogued_keys(&[reasons], &REASON_KEY).is_empty());
}

#[test]
fn the_scan_finds_the_keys_it_is_looking_for() {
    let found: Vec<String> = workspace_sources()
        .iter()
        .flat_map(|file| {
            let text: String = fs::read_to_string(file).expect("source file");
            THROWN_KEY
                .captures_iter(&text)
                .map(|captures| captures[1].to_owned())
                .collect::<Vec<String>>()
        })
        .collect();
    assert!(found
        .iter()
        .any(|key| key == "DATABASE.DATABASE_IMPORT_FAILED"));
    assert!(found.len() > 100);
}
