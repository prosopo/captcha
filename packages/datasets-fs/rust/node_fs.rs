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

//! The `node:fs` calls the commands make, with Node's behaviour where it differs from std's:
//! directory listings sorted bytewise (libuv's scandir sorts with `strcmp`), and an empty
//! path failing `mkdir` with `ENOENT`.

use crate::error::{DatasetsFsError, FsError, Result};
use prosopo_logger::json_stringify;
use serde_json::Value;
use std::path::Path;

/// `fs.existsSync`.
pub fn exists(path: &str) -> bool {
    !path.is_empty() && Path::new(path).exists()
}

/// `fs.readFileSync(path)`: opening a directory succeeds, and reading it fails.
pub fn read(path: &str) -> Result<Vec<u8>> {
    use std::io::Read;
    let mut file: std::fs::File =
        std::fs::File::open(path).map_err(|error| FsError::new(&error, "open", path, None))?;
    let mut bytes: Vec<u8> = Vec::new();
    file.read_to_end(&mut bytes)
        .map_err(|error| FsError::new(&error, "read", path, None))?;
    Ok(bytes)
}

/// `fs.readFileSync(path, "utf8")`: invalid UTF-8 becomes U+FFFD.
pub fn read_text(path: &str) -> Result<String> {
    read(path).map(|bytes: Vec<u8>| String::from_utf8_lossy(&bytes).into_owned())
}

/// `JSON.parse(fs.readFileSync(path, "utf8"))`.
pub fn read_json(path: &str) -> Result<Value> {
    serde_json::from_str(&read_text(path)?)
        .map_err(|error| DatasetsFsError::Json(error.to_string()))
}

fn sorted_entries(path: &str) -> Result<Vec<std::fs::DirEntry>> {
    let entries =
        std::fs::read_dir(path).map_err(|error| FsError::new(&error, "scandir", path, None))?;
    let mut entries: Vec<std::fs::DirEntry> = entries
        .collect::<std::io::Result<Vec<std::fs::DirEntry>>>()
        .map_err(|error| FsError::new(&error, "scandir", path, None))?;
    entries.sort_by_key(|entry| entry.file_name().into_encoded_bytes());
    Ok(entries)
}

fn name(entry: &std::fs::DirEntry) -> String {
    entry.file_name().to_string_lossy().into_owned()
}

/// `fs.readdirSync(path)`.
pub fn read_dir(path: &str) -> Result<Vec<String>> {
    Ok(sorted_entries(path)?.iter().map(name).collect())
}

/// `fs.readdirSync(path, { withFileTypes: true })` filtered by `isDirectory()`, which does not
/// follow symlinks.
pub fn read_subdirectories(path: &str) -> Result<Vec<String>> {
    Ok(sorted_entries(path)?
        .iter()
        .filter(|entry| entry.file_type().is_ok_and(|kind| kind.is_dir()))
        .map(name)
        .collect())
}

/// `fs.mkdirSync(path, { recursive: true })`.
pub fn mkdir_all(path: &str) -> Result<()> {
    if path.is_empty() {
        return Err(FsError::of("ENOENT", "no such file or directory", "mkdir", path).into());
    }
    std::fs::create_dir_all(path).map_err(|error| FsError::new(&error, "mkdir", path, None).into())
}

/// `fs.rmSync(path, { recursive: true })`.
pub fn remove(path: &str) -> Result<()> {
    let metadata =
        std::fs::symlink_metadata(path).map_err(|error| FsError::new(&error, "rm", path, None))?;
    let removed: std::io::Result<()> = if metadata.is_dir() {
        std::fs::remove_dir_all(path)
    } else {
        std::fs::remove_file(path)
    };
    removed.map_err(|error| FsError::new(&error, "rm", path, None).into())
}

pub fn copy_file(source: &str, dest: &str) -> Result<()> {
    std::fs::copy(source, dest)
        .map(|_| ())
        .map_err(|error| FsError::new(&error, "copyfile", source, Some(dest)).into())
}

pub fn rename(source: &str, dest: &str) -> Result<()> {
    std::fs::rename(source, dest)
        .map_err(|error| FsError::new(&error, "rename", source, Some(dest)).into())
}

/// `fs.realpathSync(path)`.
pub fn realpath(path: &str) -> Result<String> {
    std::fs::canonicalize(path)
        .map(|resolved| resolved.to_string_lossy().into_owned())
        .map_err(|error| FsError::new(&error, "realpath", path, None).into())
}

pub fn write(path: &str, contents: &[u8]) -> Result<()> {
    std::fs::write(path, contents).map_err(|error| FsError::new(&error, "open", path, None).into())
}

/// `fs.writeFileSync(path, JSON.stringify(value, null, 4))`.
pub fn write_json(path: &str, value: &Value) -> Result<()> {
    write(path, json_stringify(value, 4).as_bytes())
}

/// `fs.mkdirSync(output.split("/").slice(0, -1).join("/"), { recursive: true })`, which
/// fails for an output with no `/` in it.
pub fn mkdir_parent(output: &str) -> Result<()> {
    let parent: &str = output.rsplit_once('/').map_or("", |(parent, _)| parent);
    mkdir_all(parent)
}
