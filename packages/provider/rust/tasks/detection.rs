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

//! The detector bundle pool (tasks/detection/bundlePool.ts), the SIMD-readings attach the
//! challenge routes run and the payload decoding the solution routes run (captchaManager.ts).
//! Decoding itself is behind [`PayloadDecoder`]: the
//! decoders are not public source (MIGRATION.md §4 hard problem 1), so whoever assembles the
//! provider supplies them.

use bson::Bson;
use prosopo_database::provider::ProviderDatabase;
use prosopo_database::redis_cache::RedisWriteQueue;
use prosopo_logger::json_stringify;
use prosopo_logger::{LogRecord, Logger};
use prosopo_types::stored::SimdReadingsStage;
use prosopo_types_database::number::json_to_bson;
use serde_json::{json, Map, Value};
use std::collections::{HashMap, HashSet};
use std::future::Future;
use std::io::Write;
use std::path::Path;
use std::pin::Pin;
use std::sync::Arc;

/// `DEFAULT_DETECTOR_POOL_DIR`, the pool's place in the provider container.
pub const DEFAULT_DETECTOR_POOL_DIR: &str = "/app/data/detector-pool";

/// One bundle: the browser detector and the secrets its payloads are read with.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PoolBundle {
    pub js: String,
    pub private_key: String,
    pub inner_config: String,
    pub release: Option<String>,
    pub payload_layout: Option<String>,
    pub key_map: Option<String>,
}

/// The pool, immutable once loaded except by [`DetectorBundlePool::replace`].
#[derive(Debug, Default)]
pub struct DetectorBundlePool {
    bundles: HashMap<String, PoolBundle>,
    ids: Vec<String>,
}

/// `extname(name) === ext`: a leading dot names the file, not its extension.
fn has_extension(name: &str, extension: &str) -> bool {
    Path::new(name).extension().and_then(|found| found.to_str()) == Some(extension)
}

/// A string member of the secrets file, as `typeof x === "string" ? x : undefined` with an empty
/// string then dropped by `...(x && { x })`.
fn present(secrets: &Value, key: &str) -> Option<String> {
    secrets.get(key).and_then(Value::as_str).filter(|value| !value.is_empty()).map(str::to_string)
}

enum Loaded {
    Bundle(Box<PoolBundle>),
    Malformed,
    Mismatched,
}

fn load_bundle(dir: &Path, bundle_id: &str, expected_release: Option<&str>, unstamped: &mut usize) -> Result<Loaded, String> {
    let js_bytes: Vec<u8> = std::fs::read(dir.join(format!("{bundle_id}.js"))).map_err(|error| error.to_string())?;
    let json_bytes: Vec<u8> = std::fs::read(dir.join(format!("{bundle_id}.json"))).map_err(|error| error.to_string())?;
    let secrets: Value = serde_json::from_str(&String::from_utf8_lossy(&json_bytes)).map_err(|error| error.to_string())?;
    if secrets.is_null() {
        return Err("Cannot read properties of null (reading 'privateKey')".to_string());
    }
    let (Some(private_key), Some(inner_config)) = (
        secrets.get("privateKey").and_then(Value::as_str),
        secrets.get("innerConfig").and_then(Value::as_str),
    ) else {
        return Ok(Loaded::Malformed);
    };
    let release: Option<String> = present(&secrets, "release");
    if let (Some(expected), Some(release)) = (expected_release.filter(|expected| !expected.is_empty()), &release) {
        if release != expected {
            return Ok(Loaded::Mismatched);
        }
    }
    if expected_release.is_some_and(|expected| !expected.is_empty()) && release.is_none() {
        *unstamped += 1;
    }
    Ok(Loaded::Bundle(Box::new(PoolBundle {
        js: String::from_utf8_lossy(&js_bytes).into_owned(),
        private_key: private_key.to_string(),
        inner_config: inner_config.to_string(),
        release,
        payload_layout: present(&secrets, "payloadLayout"),
        key_map: present(&secrets, "keyMap"),
    })))
}

impl DetectorBundlePool {
    /// `loadFromDir`: every `{id}.js` with a well-formed `{id}.json` beside it, skipping (and
    /// logging) the rest. A missing directory is an empty pool.
    pub fn load_from_dir(dir: &Path, logger: &Logger, expected_release: Option<&str>) -> Self {
        let mut pool: DetectorBundlePool = DetectorBundlePool::default();
        let Ok(entries) = std::fs::read_dir(dir) else {
            logger.warn(|| LogRecord::msg("bundle pool directory does not exist").with_data(json!({ "dir": dir.to_string_lossy() })));
            return pool;
        };
        let mut next: HashMap<String, PoolBundle> = HashMap::new();
        let mut mismatched: usize = 0;
        let mut unstamped: usize = 0;
        for entry in entries.flatten() {
            let Some(name) = entry.file_name().to_str().map(str::to_string) else {
                continue;
            };
            if !has_extension(&name, "js") {
                continue;
            }
            let bundle_id: &str = &name[..name.len() - 3];
            match load_bundle(dir, bundle_id, expected_release, &mut unstamped) {
                Ok(Loaded::Bundle(bundle)) => {
                    next.insert(bundle_id.to_string(), *bundle);
                }
                Ok(Loaded::Malformed) => {
                    logger.warn(|| LogRecord::msg("bundle pool entry has malformed secrets").with_data(json!({ "bundleId": bundle_id })));
                }
                Ok(Loaded::Mismatched) => mismatched += 1,
                Err(error) => {
                    logger.warn(|| {
                        LogRecord::msg("failed to load bundle pool entry").with_data(json!({ "bundleId": bundle_id, "error": error }))
                    });
                }
            }
        }
        if mismatched > 0 {
            logger.warn(|| {
                LogRecord::msg("skipped bundle pool entries built for another release")
                    .with_data(json!({ "skipped": mismatched, "expectedRelease": expected_release }))
            });
        }
        if unstamped > 0 {
            logger.warn(|| {
                LogRecord::msg("bundle pool entries have no release stamp").with_data(json!({ "count": unstamped, "expectedRelease": expected_release }))
            });
        }
        pool.replace(next);
        logger.info(|| LogRecord::msg("bundle pool loaded").with_data(json!({ "count": pool.size(), "dir": dir.to_string_lossy() })));
        pool
    }

    /// `replace`: the whole pool at once, its ids in JS sort order (UTF-16 code units).
    pub fn replace(&mut self, bundles: HashMap<String, PoolBundle>) {
        let mut ids: Vec<String> = bundles.keys().cloned().collect();
        ids.sort_by(|a, b| a.encode_utf16().cmp(b.encode_utf16()));
        self.bundles = bundles;
        self.ids = ids;
    }

    pub fn size(&self) -> usize {
        self.ids.len()
    }

    /// `at(index)`: the bundle at `index` modulo the pool's size.
    pub fn at(&self, index: usize) -> Result<(&str, &PoolBundle), String> {
        if self.ids.is_empty() {
            return Err("detector bundle pool is empty".to_string());
        }
        let bundle_id: &str = &self.ids[index % self.ids.len()];
        let bundle: &PoolBundle = self.bundles.get(bundle_id).ok_or_else(|| "detector bundle pool selection failed".to_string())?;
        Ok((bundle_id, bundle))
    }

    pub fn get(&self, bundle_id: &str) -> Option<&PoolBundle> {
        self.bundles.get(bundle_id)
    }
}

fn write_then_rename(dir: &Path, name: &str, contents: &str, mode: Option<u32>) -> std::io::Result<()> {
    let temp = dir.join(format!(".{name}.tmp"));
    let mut options = std::fs::OpenOptions::new();
    options.write(true).create(true).truncate(true);
    #[cfg(unix)]
    if let Some(mode) = mode {
        std::os::unix::fs::OpenOptionsExt::mode(&mut options, mode);
    }
    #[cfg(not(unix))]
    let _ = mode;
    options.open(&temp)?.write_all(contents.as_bytes())?;
    std::fs::rename(&temp, dir.join(name))
}

/// `persistDetectorBundlePool`: each bundle written into `dir` (never replacing `dir`, which
/// is a mount point) through a temp file and a rename, secrets readable by the owner only, then
/// every other `.js` and `.json` in `dir` removed.
pub fn persist_detector_bundle_pool(bundles: &HashMap<String, PoolBundle>, dir: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dir)?;
    let mut written: HashSet<String> = HashSet::new();
    for (bundle_id, bundle) in bundles {
        let js_name: String = format!("{bundle_id}.js");
        let json_name: String = format!("{bundle_id}.json");
        write_then_rename(dir, &js_name, &bundle.js, None)?;
        let mut secrets: Map<String, Value> = Map::new();
        secrets.insert("privateKey".to_string(), Value::String(bundle.private_key.clone()));
        secrets.insert("innerConfig".to_string(), Value::String(bundle.inner_config.clone()));
        for (key, value) in [("release", &bundle.release), ("payloadLayout", &bundle.payload_layout), ("keyMap", &bundle.key_map)] {
            if let Some(value) = value.as_ref().filter(|value| !value.is_empty()) {
                secrets.insert(key.to_string(), Value::String(value.clone()));
            }
        }
        write_then_rename(dir, &json_name, &json_stringify(&Value::Object(secrets), 0), Some(0o600))?;
        written.insert(js_name);
        written.insert(json_name);
    }
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let Some(name) = entry.file_name().to_str().map(str::to_string) else {
            continue;
        };
        if (has_extension(&name, "js") || has_extension(&name, "json")) && !written.contains(&name) {
            match std::fs::remove_file(entry.path()) {
                Err(error) if error.kind() != std::io::ErrorKind::NotFound => return Err(error),
                _ => {}
            }
        }
    }
    Ok(())
}

/// `PoolBundleDecrypt`: what decoding a bundle's payloads takes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PoolBundleDecrypt {
    pub key: String,
    pub inner_config: String,
    pub payload_layout: Option<String>,
    pub key_map: Option<String>,
}

/// `resolveBundleById`.
pub fn resolve_bundle_by_id(pool: Option<&DetectorBundlePool>, bundle_id: Option<&str>) -> Option<PoolBundleDecrypt> {
    let bundle: &PoolBundle = pool?.get(bundle_id.filter(|id| !id.is_empty())?)?;
    Some(PoolBundleDecrypt {
        key: bundle.private_key.clone(),
        inner_config: bundle.inner_config.clone(),
        payload_layout: bundle.payload_layout.clone(),
        key_map: bundle.key_map.clone(),
    })
}

pub type DecodeFuture<'a> = Pin<Box<dyn Future<Output = Result<Map<String, Value>, String>> + Send + 'a>>;

/// The detector's payload decoders.
pub trait PayloadDecoder: Send + Sync {
    /// `decode("simd", [encrypted, privateKey, innerConfig])`: the readings object with the
    /// decoder's `timestamp` in it, or why it could not be read.
    fn decrypt_simd_readings<'a>(&'a self, encrypted: &'a str, private_key: &'a str, inner_config: &'a str) -> DecodeFuture<'a>;
    /// `decode("behaviour", [encrypted, privateKey, innerConfig])`: `BehavioralDataResult`, or
    /// why it could not be read.
    fn decrypt_behavioral_data<'a>(&'a self, encrypted: &'a str, private_key: &'a str, inner_config: &'a str) -> DecodeFuture<'a>;
}

/// What `decodeSubmissionPayloads` could read of a submission.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct DecodedSubmission {
    pub behavioural: Option<Map<String, Value>>,
    pub simd: Option<Map<String, Value>>,
}

/// `collectorN?.length || 0`.
fn collector_length(decoded: &Map<String, Value>, key: &str) -> usize {
    decoded.get(key).and_then(Value::as_array).map_or(0, Vec::len)
}

/// What the attach needs from the provider.
pub struct DetectionServices<'a> {
    pub db: &'a Arc<ProviderDatabase>,
    pub write_queue: Option<&'a RedisWriteQueue>,
    pub pool: Option<&'a DetectorBundlePool>,
    pub decoder: Option<&'a dyn PayloadDecoder>,
    pub logger: &'a Logger,
}

impl DetectionServices<'_> {
    /// `resolveBundleBySessionId`: the session's promoted `bundleId`, cache first, then Mongo.
    pub async fn resolve_bundle_by_session_id(&self, session_id: &str) -> Result<Option<PoolBundleDecrypt>, String> {
        if session_id.is_empty() {
            return Ok(None);
        }
        let cached: Option<String> = match self.write_queue {
            Some(queue) => queue
                .get_cached_session(session_id)
                .await
                .and_then(|session| session.get("bundleId").and_then(Value::as_str).map(str::to_string)),
            None => None,
        };
        let bundle_id: Option<String> = match cached {
            Some(bundle_id) => Some(bundle_id),
            None => self
                .db
                .get_session_record_by_session_id(session_id)
                .await
                .map_err(|error| error.to_string())?
                .and_then(|session| session.bundle_id),
        };
        Ok(resolve_bundle_by_id(self.pool, bundle_id.as_deref()))
    }

    /// `decryptSimdReadings`: `None` when there is no bundle or no decoder, or decoding fails.
    pub async fn decrypt_simd_readings(&self, encrypted: &str, bundle: Option<&PoolBundleDecrypt>) -> Option<Map<String, Value>> {
        let Some(bundle) = bundle else {
            self.logger.warn(|| LogRecord::msg("No detector bundle resolved for SIMD readings — dropping field"));
            return None;
        };
        let Some(decoder) = self.decoder else {
            self.logger.warn(|| LogRecord::msg("No SIMD decoder in this build — dropping field"));
            return None;
        };
        match decoder.decrypt_simd_readings(encrypted, &bundle.key, &bundle.inner_config).await {
            Ok(readings) => Some(readings),
            Err(error) => {
                self.logger.warn(|| {
                    LogRecord::msg("Failed to decrypt SIMD readings with the session's bundle").with_data(json!({ "err": { "message": error } }))
                });
                None
            }
        }
    }

    /// `decryptBehavioralData`: `None` when there is no bundle or no decoder, or decoding fails.
    pub async fn decrypt_behavioral_data(&self, encrypted: &str, bundle: Option<&PoolBundleDecrypt>) -> Option<Map<String, Value>> {
        let Some(bundle) = bundle else {
            self.logger.warn(|| LogRecord::msg("No detector bundle resolved for behavioral data — dropping field"));
            return None;
        };
        let Some(decoder) = self.decoder else {
            self.logger.warn(|| LogRecord::msg("No behavioral data decoder in this build — dropping field"));
            return None;
        };
        match decoder.decrypt_behavioral_data(encrypted, &bundle.key, &bundle.inner_config).await {
            Ok(decoded) => {
                self.logger.info(|| {
                    LogRecord::msg("Behavioral data decrypted successfully").with_data(json!({
                        "c1Length": collector_length(&decoded, "collector1"),
                        "c2Length": collector_length(&decoded, "collector2"),
                        "c3Length": collector_length(&decoded, "collector3"),
                        "c4Length": collector_length(&decoded, "collector4"),
                        "deviceCapability": decoded.get("deviceCapability"),
                    }))
                });
                Some(decoded)
            }
            Err(error) => {
                self.logger.warn(|| {
                    LogRecord::msg("Failed to decrypt behavioral data with the session's bundle").with_data(json!({ "err": { "message": error } }))
                });
                None
            }
        }
    }

    /// `decodeSubmissionPayloads`: the session's bundle resolved once, and both payloads decoded
    /// together with it. Absent, empty or unreadable payloads come back `None`.
    pub async fn decode_submission_payloads(&self, session_id: Option<&str>, behavioural: Option<&str>, simd: Option<&str>) -> DecodedSubmission {
        let behavioural: Option<&str> = behavioural.filter(|payload| !payload.is_empty());
        let simd: Option<&str> = simd.filter(|payload| !payload.is_empty());
        if behavioural.is_none() && simd.is_none() {
            return DecodedSubmission::default();
        }
        let bundle: Option<PoolBundleDecrypt> = match self.resolve_bundle_by_session_id(session_id.unwrap_or_default()).await {
            Ok(bundle) => bundle,
            Err(error) => {
                self.logger.warn(|| {
                    LogRecord::msg("Could not resolve the detector bundle for a submission").with_data(json!({ "sessionId": session_id })).with_err(error)
                });
                return DecodedSubmission::default();
            }
        };
        let decode_behavioural = async {
            match behavioural {
                Some(payload) => self.decrypt_behavioral_data(payload, bundle.as_ref()).await,
                None => None,
            }
        };
        let decode_simd = async {
            match simd {
                Some(payload) => self.decrypt_simd_readings_for_attach(payload, bundle.as_ref()).await,
                None => None,
            }
        };
        let (behavioural, simd) = futures_util::join!(decode_behavioural, decode_simd);
        DecodedSubmission { behavioural, simd }
    }

    /// `decryptSimdReadingsForAttach`: the readings without the decoder's `timestamp`.
    pub async fn decrypt_simd_readings_for_attach(&self, encrypted: &str, bundle: Option<&PoolBundleDecrypt>) -> Option<Map<String, Value>> {
        let mut readings: Map<String, Value> = self.decrypt_simd_readings(encrypted, bundle).await?;
        readings.shift_remove("timestamp");
        Some(readings)
    }

    /// `recordSessionSimdReadingsIfAbsentWithCache`: the cached session now, the stored one in
    /// the background; the first readings win in both.
    pub async fn record_session_simd_readings_if_absent_with_cache(&self, session_id: &str, readings: Map<String, Value>, stage: SimdReadingsStage) {
        let readings: Value = Value::Object(readings);
        if let Some(queue) = self.write_queue {
            queue.patch_cached_simd_readings_if_absent(session_id, &readings, stage.as_str(), None).await;
        }
        let db: Arc<ProviderDatabase> = self.db.clone();
        let session_id: String = session_id.to_string();
        let logger: Logger = self.logger.clone();
        let stored: Bson = json_to_bson(&readings);
        tokio::spawn(async move {
            if let Err(error) = db.record_session_simd_readings_if_absent(&session_id, &stored, stage).await {
                logger.warn(|| {
                    LogRecord::msg("Background Mongo SIMD-readings update failed")
                        .with_err(error.to_string())
                        .with_data(json!({ "sessionId": session_id, "stage": stage.as_str() }))
                });
            }
        });
    }

    /// `decryptAndAttachSimdReadingsIfAbsent`.
    pub async fn decrypt_and_attach_simd_readings_if_absent(&self, session_id: &str, encrypted: &str, stage: SimdReadingsStage) -> Result<(), String> {
        let bundle: Option<PoolBundleDecrypt> = self.resolve_bundle_by_session_id(session_id).await?;
        let Some(readings) = self.decrypt_simd_readings_for_attach(encrypted, bundle.as_ref()).await else {
            return Ok(());
        };
        self.record_session_simd_readings_if_absent_with_cache(session_id, readings, stage).await;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    //! tasks/detection/bundlePool.test.ts, and captchaManager.unit.test.ts's bundle decrypt
    //! cases as they apply to SIMD readings.
    use super::*;
    use prosopo_database::operation::{Executor, Operation, Reply, ReplyFuture};
    use prosopo_database::source::SystemSource;
    use prosopo_logger::{get_logger, LogLevel};
    use std::sync::Mutex;
    use tempfile::TempDir;

    fn logger() -> Logger {
        get_logger(LogLevel::Error, "test")
    }

    fn write_bundle(dir: &Path, id: &str, js: &str, secrets: &str) {
        std::fs::write(dir.join(format!("{id}.js")), js).expect("writes");
        std::fs::write(dir.join(format!("{id}.json")), secrets).expect("writes");
    }

    fn load(dir: &Path, expected_release: Option<&str>) -> DetectorBundlePool {
        DetectorBundlePool::load_from_dir(dir, &logger(), expected_release)
    }

    fn bundle(js: &str, private_key: &str, inner_config: &str) -> PoolBundle {
        PoolBundle { js: js.into(), private_key: private_key.into(), inner_config: inner_config.into(), release: None, payload_layout: None, key_map: None }
    }

    #[test]
    fn loads_paired_js_json_bundles() {
        let dir: TempDir = TempDir::new().expect("a dir");
        write_bundle(dir.path(), "bundle-0", "JS0", r#"{"privateKey":"PK0","innerConfig":"C0"}"#);
        write_bundle(dir.path(), "bundle-1", "JS1", r#"{"privateKey":"PK1","innerConfig":"C1"}"#);
        let pool: DetectorBundlePool = load(dir.path(), None);
        assert_eq!(pool.size(), 2);
        assert_eq!(pool.get("bundle-0"), Some(&bundle("JS0", "PK0", "C0")));
        assert_eq!(pool.get("bundle-1").map(|found| found.js.as_str()), Some("JS1"));
        assert_eq!(pool.get("missing"), None);
    }

    #[test]
    fn skips_a_js_file_with_no_json_sibling() {
        let dir: TempDir = TempDir::new().expect("a dir");
        std::fs::write(dir.path().join("orphan.js"), "JS").expect("writes");
        write_bundle(dir.path(), "ok", "JS", r#"{"privateKey":"PK","innerConfig":"C"}"#);
        let pool: DetectorBundlePool = load(dir.path(), None);
        assert_eq!(pool.size(), 1);
        assert!(pool.get("ok").is_some());
        assert!(pool.get("orphan").is_none());
    }

    #[test]
    fn skips_malformed_secrets_and_invalid_json() {
        let dir: TempDir = TempDir::new().expect("a dir");
        write_bundle(dir.path(), "bad-shape", "JS", r#"{"privateKey":"PK"}"#);
        write_bundle(dir.path(), "bad-json", "JS", "{not json");
        write_bundle(dir.path(), "good", "JS", r#"{"privateKey":"PK","innerConfig":"C"}"#);
        let pool: DetectorBundlePool = load(dir.path(), None);
        assert_eq!(pool.size(), 1);
        assert!(pool.get("good").is_some());
    }

    #[test]
    fn ignores_non_js_files() {
        let dir: TempDir = TempDir::new().expect("a dir");
        std::fs::write(dir.path().join("manifest.json"), r#"{"count":1}"#).expect("writes");
        write_bundle(dir.path(), "b", "JS", r#"{"privateKey":"PK","innerConfig":"C"}"#);
        assert_eq!(load(dir.path(), None).size(), 1);
    }

    #[test]
    fn yields_an_empty_pool_for_a_missing_directory() {
        let dir: TempDir = TempDir::new().expect("a dir");
        let pool: DetectorBundlePool = load(&dir.path().join("does-not-exist"), None);
        assert_eq!(pool.size(), 0);
        assert!(pool.at(0).expect_err("empty").contains("empty"));
    }

    #[test]
    fn at_returns_valid_pool_members_and_is_stable_for_a_given_index() {
        let dir: TempDir = TempDir::new().expect("a dir");
        for i in 0..5 {
            write_bundle(dir.path(), &format!("bundle-{i}"), &format!("JS{i}"), &format!(r#"{{"privateKey":"PK{i}","innerConfig":"C{i}"}}"#));
        }
        let pool: DetectorBundlePool = load(dir.path(), None);
        let mut seen: HashSet<String> = HashSet::new();
        for i in 0..500 {
            let (bundle_id, found) = pool.at(i).expect("a bundle");
            assert_eq!(pool.get(bundle_id), Some(found));
            assert_eq!(pool.at(i).expect("a bundle").0, bundle_id);
            seen.insert(bundle_id.to_string());
        }
        assert_eq!(seen.len(), 5);
    }

    #[test]
    fn replace_hot_swaps_the_pool() {
        let dir: TempDir = TempDir::new().expect("a dir");
        write_bundle(dir.path(), "old", "JS", r#"{"privateKey":"PK","innerConfig":"C"}"#);
        let mut pool: DetectorBundlePool = load(dir.path(), None);
        assert!(pool.get("old").is_some());
        pool.replace(HashMap::from([("new".to_string(), bundle("NJS", "NPK", "NC"))]));
        assert!(pool.get("old").is_none());
        assert_eq!(pool.get("new").map(|found| found.js.as_str()), Some("NJS"));
        assert_eq!(pool.size(), 1);
    }

    #[test]
    fn skips_bundles_stamped_with_a_different_release() {
        let dir: TempDir = TempDir::new().expect("a dir");
        write_bundle(dir.path(), "match", "JS", r#"{"privateKey":"PK","innerConfig":"C","release":"3.6.64"}"#);
        write_bundle(dir.path(), "stale", "JS", r#"{"privateKey":"PK","innerConfig":"C","release":"3.6.10"}"#);
        let pool: DetectorBundlePool = load(dir.path(), Some("3.6.64"));
        assert!(pool.get("match").is_some());
        assert!(pool.get("stale").is_none());
        assert_eq!(pool.size(), 1);
    }

    #[test]
    fn loads_every_bundle_when_no_expected_release_is_given() {
        let dir: TempDir = TempDir::new().expect("a dir");
        write_bundle(dir.path(), "a", "JS", r#"{"privateKey":"PK","innerConfig":"C","release":"3.6.10"}"#);
        write_bundle(dir.path(), "b", "JS", r#"{"privateKey":"PK","innerConfig":"C"}"#);
        assert_eq!(load(dir.path(), None).size(), 2);
    }

    #[test]
    fn keeps_unstamped_bundles_when_a_release_is_expected() {
        let dir: TempDir = TempDir::new().expect("a dir");
        write_bundle(dir.path(), "legacy", "JS", r#"{"privateKey":"PK","innerConfig":"C"}"#);
        assert!(load(dir.path(), Some("3.6.64")).get("legacy").is_some());
    }

    #[test]
    fn persists_a_pushed_pool_so_it_reloads_after_a_restart() {
        let dir: TempDir = TempDir::new().expect("a dir");
        let pushed: PoolBundle = PoolBundle { release: Some("3.6.64".into()), ..bundle("PJS", "PPK", "PC") };
        persist_detector_bundle_pool(&HashMap::from([("pushed".to_string(), pushed.clone())]), dir.path()).expect("persists");
        assert_eq!(load(dir.path(), None).get("pushed"), Some(&pushed));
    }

    #[test]
    fn carries_a_bundles_payload_layout_and_key_map_through_load_and_persist() {
        let dir: TempDir = TempDir::new().expect("a dir");
        write_bundle(dir.path(), "laid-out", "JS", r#"{"privateKey":"PK","innerConfig":"C","payloadLayout":"TFY=","keyMap":"S00="}"#);
        let loaded: PoolBundle = load(dir.path(), None).get("laid-out").cloned().expect("loads");
        assert_eq!(loaded.payload_layout.as_deref(), Some("TFY="));
        assert_eq!(loaded.key_map.as_deref(), Some("S00="));
        let persist_dir: TempDir = TempDir::new().expect("a dir");
        persist_detector_bundle_pool(&HashMap::from([("laid-out".to_string(), loaded.clone())]), persist_dir.path()).expect("persists");
        assert_eq!(load(persist_dir.path(), None).get("laid-out"), Some(&loaded));
    }

    #[test]
    fn loads_a_bundle_with_no_payload_layout() {
        let dir: TempDir = TempDir::new().expect("a dir");
        write_bundle(dir.path(), "legacy", "JS", r#"{"privateKey":"PK","innerConfig":"C"}"#);
        assert_eq!(load(dir.path(), None).get("legacy").and_then(|found| found.payload_layout.clone()), None);
    }

    #[cfg(unix)]
    #[test]
    fn persists_without_replacing_the_pool_directory_itself() {
        use std::os::unix::fs::MetadataExt;
        let dir: TempDir = TempDir::new().expect("a dir");
        let before: u64 = std::fs::metadata(dir.path()).expect("stats").ino();
        persist_detector_bundle_pool(&HashMap::from([("b".to_string(), bundle("JS", "PK", "C"))]), dir.path()).expect("persists");
        assert_eq!(std::fs::metadata(dir.path()).expect("stats").ino(), before);
        assert_eq!(load(dir.path(), None).get("b").map(|found| found.js.as_str()), Some("JS"));
    }

    #[test]
    fn leaves_no_temp_files_behind() {
        let dir: TempDir = TempDir::new().expect("a dir");
        persist_detector_bundle_pool(&HashMap::from([("b".to_string(), bundle("JS", "PK", "C"))]), dir.path()).expect("persists");
        let names: Vec<String> = std::fs::read_dir(dir.path())
            .expect("lists")
            .flatten()
            .map(|entry| entry.file_name().to_string_lossy().into_owned())
            .filter(|name| name.contains(".tmp"))
            .collect();
        assert!(names.is_empty(), "{names:?}");
    }

    #[test]
    fn persist_replaces_the_previous_pool_rather_than_merging_into_it() {
        let dir: TempDir = TempDir::new().expect("a dir");
        write_bundle(dir.path(), "old", "JS", r#"{"privateKey":"PK","innerConfig":"C"}"#);
        persist_detector_bundle_pool(&HashMap::from([("new".to_string(), bundle("NJS", "NPK", "NC"))]), dir.path()).expect("persists");
        let reloaded: DetectorBundlePool = load(dir.path(), None);
        assert!(reloaded.get("old").is_none());
        assert_eq!(reloaded.size(), 1);
    }

    /// A database that holds no sessions.
    struct NoSessions;

    impl Executor for NoSessions {
        fn run(&self, _operation: Operation) -> ReplyFuture<'_> {
            Box::pin(async { Ok(Reply::Documents(Vec::new())) })
        }
    }

    #[derive(Default)]
    struct FakeDecoder {
        calls: Mutex<Vec<(String, String, String)>>,
        fails: bool,
    }

    impl PayloadDecoder for FakeDecoder {
        fn decrypt_simd_readings<'a>(&'a self, encrypted: &'a str, private_key: &'a str, inner_config: &'a str) -> DecodeFuture<'a> {
            self.calls.lock().expect("unpoisoned").push((encrypted.into(), private_key.into(), inner_config.into()));
            let result: Result<Map<String, Value>, String> = if self.fails {
                Err("decrypt failed".into())
            } else {
                serde_json::from_str(r#"{"supported":true,"timestamp":1000,"schema":1}"#).map_err(|error| error.to_string())
            };
            Box::pin(async move { result })
        }

        fn decrypt_behavioral_data<'a>(&'a self, encrypted: &'a str, private_key: &'a str, inner_config: &'a str) -> DecodeFuture<'a> {
            self.calls.lock().expect("unpoisoned").push((encrypted.into(), private_key.into(), inner_config.into()));
            let result: Result<Map<String, Value>, String> = if self.fails {
                Err("decrypt failed".into())
            } else {
                serde_json::from_str(r#"{"collector1":[{"event":"click"}],"collector2":[],"collector3":[],"deviceCapability":"desktop","timestamp":1000}"#)
                    .map_err(|error| error.to_string())
            };
            Box::pin(async move { result })
        }
    }

    fn database() -> Arc<ProviderDatabase> {
        Arc::new(ProviderDatabase::new(Arc::new(NoSessions), Arc::new(SystemSource), logger()))
    }

    fn decrypt_bundle() -> PoolBundleDecrypt {
        PoolBundleDecrypt { key: "pk".into(), inner_config: "cfg".into(), payload_layout: None, key_map: None }
    }

    #[tokio::test]
    async fn returns_nothing_when_no_bundle_is_provided() {
        let decoder: FakeDecoder = FakeDecoder::default();
        let (db, logger) = (database(), logger());
        let services = DetectionServices { db: &db, write_queue: None, pool: None, decoder: Some(&decoder), logger: &logger };
        assert_eq!(services.decrypt_simd_readings("encryptedData", None).await, None);
        assert!(decoder.calls.lock().expect("unpoisoned").is_empty());
    }

    #[tokio::test]
    async fn decrypts_with_the_bundles_key_and_inner_config() {
        let decoder: FakeDecoder = FakeDecoder::default();
        let (db, logger) = (database(), logger());
        let services = DetectionServices { db: &db, write_queue: None, pool: None, decoder: Some(&decoder), logger: &logger };
        let readings: Map<String, Value> = services.decrypt_simd_readings("encryptedData", Some(&decrypt_bundle())).await.expect("decrypts");
        assert_eq!(readings.get("timestamp"), Some(&json!(1000)));
        assert_eq!(*decoder.calls.lock().expect("unpoisoned"), vec![("encryptedData".into(), "pk".into(), "cfg".into())]);
    }

    #[tokio::test]
    async fn returns_nothing_when_the_bundle_fails_to_decrypt() {
        let decoder: FakeDecoder = FakeDecoder { fails: true, ..FakeDecoder::default() };
        let (db, logger) = (database(), logger());
        let services = DetectionServices { db: &db, write_queue: None, pool: None, decoder: Some(&decoder), logger: &logger };
        assert_eq!(services.decrypt_simd_readings("encryptedData", Some(&decrypt_bundle())).await, None);
        assert_eq!(decoder.calls.lock().expect("unpoisoned").len(), 1);
    }

    #[tokio::test]
    async fn returns_nothing_without_a_decoder() {
        let (db, logger) = (database(), logger());
        let services = DetectionServices { db: &db, write_queue: None, pool: None, decoder: None, logger: &logger };
        assert_eq!(services.decrypt_simd_readings("encryptedData", Some(&decrypt_bundle())).await, None);
    }

    #[tokio::test]
    async fn the_attach_drops_the_decoders_timestamp_and_keeps_the_order() {
        let decoder: FakeDecoder = FakeDecoder::default();
        let (db, logger) = (database(), logger());
        let services = DetectionServices { db: &db, write_queue: None, pool: None, decoder: Some(&decoder), logger: &logger };
        let readings: Map<String, Value> = services.decrypt_simd_readings_for_attach("x", Some(&decrypt_bundle())).await.expect("decrypts");
        assert_eq!(readings.keys().collect::<Vec<&String>>(), ["supported", "schema"]);
    }

    #[test]
    fn resolves_a_bundle_only_when_the_id_names_one_in_the_pool() {
        let mut pool: DetectorBundlePool = DetectorBundlePool::default();
        pool.replace(HashMap::from([(
            "b".to_string(),
            PoolBundle { payload_layout: Some("TFY=".into()), ..bundle("JS", "PK", "C") },
        )]));
        let resolved: PoolBundleDecrypt = resolve_bundle_by_id(Some(&pool), Some("b")).expect("resolves");
        assert_eq!(resolved, PoolBundleDecrypt { key: "PK".into(), inner_config: "C".into(), payload_layout: Some("TFY=".into()), key_map: None });
        assert_eq!(resolve_bundle_by_id(Some(&pool), Some("missing")), None);
        assert_eq!(resolve_bundle_by_id(Some(&pool), Some("")), None);
        assert_eq!(resolve_bundle_by_id(Some(&pool), None), None);
        assert_eq!(resolve_bundle_by_id(None, Some("b")), None);
    }

    #[tokio::test]
    async fn returns_no_behavioural_data_when_no_bundle_is_provided() {
        let decoder: FakeDecoder = FakeDecoder::default();
        let (db, logger) = (database(), logger());
        let services = DetectionServices { db: &db, write_queue: None, pool: None, decoder: Some(&decoder), logger: &logger };
        assert_eq!(services.decrypt_behavioral_data("encryptedData", None).await, None);
        assert!(decoder.calls.lock().expect("unpoisoned").is_empty());
    }

    #[tokio::test]
    async fn decrypts_behavioural_data_with_the_bundles_key_and_inner_config() {
        let decoder: FakeDecoder = FakeDecoder::default();
        let (db, logger) = (database(), logger());
        let services = DetectionServices { db: &db, write_queue: None, pool: None, decoder: Some(&decoder), logger: &logger };
        let decoded: Map<String, Value> = services.decrypt_behavioral_data("encryptedData", Some(&decrypt_bundle())).await.expect("decrypts");
        assert_eq!(decoded.get("deviceCapability"), Some(&json!("desktop")));
        assert_eq!(*decoder.calls.lock().expect("unpoisoned"), vec![("encryptedData".into(), "pk".into(), "cfg".into())]);
    }

    #[tokio::test]
    async fn returns_no_behavioural_data_when_the_bundle_fails_to_decrypt() {
        let decoder: FakeDecoder = FakeDecoder { fails: true, ..FakeDecoder::default() };
        let (db, logger) = (database(), logger());
        let services = DetectionServices { db: &db, write_queue: None, pool: None, decoder: Some(&decoder), logger: &logger };
        assert_eq!(services.decrypt_behavioral_data("encryptedData", Some(&decrypt_bundle())).await, None);
        assert_eq!(decoder.calls.lock().expect("unpoisoned").len(), 1);
    }

    /// A database whose every session is promoted to bundle `b`, counting the lookups, or one
    /// whose lookups fail.
    #[derive(Default)]
    struct BundledSessions {
        lookups: Mutex<usize>,
        down: bool,
    }

    impl Executor for BundledSessions {
        fn run(&self, _operation: Operation) -> ReplyFuture<'_> {
            *self.lookups.lock().expect("unpoisoned") += 1;
            let reply = if self.down {
                Err(prosopo_database::mongo::MongoError::Unavailable("redis down".into()))
            } else {
                Ok(Reply::Documents(vec![bson::doc! {
                    "sessionId": "s1",
                    "createdAt": bson::DateTime::from_millis(1_700_000_000_000),
                    "token": "token",
                    "score": 0.5,
                    "threshold": 0.5,
                    "scoreComponents": { "baseScore": 0.5 },
                    "ipAddress": { "lower": 2_130_706_433_i64, "type": "v4" },
                    "captchaType": "pow",
                    "webView": false,
                    "iFrame": false,
                    "decryptedHeadHash": "",
                    "bundleId": "b",
                }]))
            };
            Box::pin(async move { reply })
        }
    }

    fn bundled_pool() -> DetectorBundlePool {
        let mut pool: DetectorBundlePool = DetectorBundlePool::default();
        pool.replace(HashMap::from([("b".to_string(), bundle("JS", "pk", "cfg"))]));
        pool
    }

    /// Decodes behavioural data only once SIMD decoding has started, so it finishes only if the
    /// two run together.
    #[derive(Default)]
    struct OverlapDecoder {
        simd_started: tokio::sync::Notify,
        behaviour_fails: bool,
    }

    impl PayloadDecoder for OverlapDecoder {
        fn decrypt_simd_readings<'a>(&'a self, _encrypted: &'a str, _private_key: &'a str, _inner_config: &'a str) -> DecodeFuture<'a> {
            self.simd_started.notify_one();
            Box::pin(async { Ok(serde_json::from_str(r#"{"ops":[1,2],"timestamp":5}"#).expect("json")) })
        }

        fn decrypt_behavioral_data<'a>(&'a self, _encrypted: &'a str, _private_key: &'a str, _inner_config: &'a str) -> DecodeFuture<'a> {
            Box::pin(async move {
                self.simd_started.notified().await;
                if self.behaviour_fails {
                    return Err("decoder blew up".into());
                }
                Ok(serde_json::from_str(r#"{"collector1":[{"event":"click"}],"collector2":[],"collector3":[],"deviceCapability":"desktop","timestamp":1000}"#).expect("json"))
            })
        }
    }

    async fn decode_submission(executor: Arc<BundledSessions>, decoder: &dyn PayloadDecoder, behavioural: Option<&str>, simd: Option<&str>) -> DecodedSubmission {
        let db: Arc<ProviderDatabase> = Arc::new(ProviderDatabase::new(executor, Arc::new(SystemSource), logger()));
        let (pool, logger) = (bundled_pool(), logger());
        let services = DetectionServices { db: &db, write_queue: None, pool: Some(&pool), decoder: Some(decoder), logger: &logger };
        tokio::time::timeout(std::time::Duration::from_secs(5), services.decode_submission_payloads(Some("s1"), behavioural, simd)).await.expect("the decodes overlap")
    }

    #[tokio::test]
    async fn resolves_the_session_bundle_once_for_both_payloads_and_decodes_them_together() {
        let executor: Arc<BundledSessions> = Arc::new(BundledSessions::default());
        let decoded: DecodedSubmission = decode_submission(executor.clone(), &OverlapDecoder::default(), Some("b"), Some("s")).await;
        assert_eq!(*executor.lookups.lock().expect("unpoisoned"), 1);
        assert_eq!(decoded.behavioural.as_ref().and_then(|data| data.get("deviceCapability")), Some(&json!("desktop")));
        assert_eq!(decoded.simd, Some(serde_json::from_str(r#"{"ops":[1,2]}"#).expect("json")));
    }

    #[tokio::test]
    async fn keeps_one_payload_when_the_other_decode_fails() {
        let decoder: OverlapDecoder = OverlapDecoder { behaviour_fails: true, ..OverlapDecoder::default() };
        let decoded: DecodedSubmission = decode_submission(Arc::new(BundledSessions::default()), &decoder, Some("b"), Some("s")).await;
        assert_eq!(decoded.behavioural, None);
        assert_eq!(decoded.simd, Some(serde_json::from_str(r#"{"ops":[1,2]}"#).expect("json")));
    }

    #[tokio::test]
    async fn does_not_resolve_a_bundle_when_there_is_nothing_to_decode() {
        let executor: Arc<BundledSessions> = Arc::new(BundledSessions::default());
        let decoder: FakeDecoder = FakeDecoder::default();
        assert_eq!(decode_submission(executor.clone(), &decoder, None, None).await, DecodedSubmission::default());
        assert_eq!(decode_submission(executor.clone(), &decoder, Some(""), Some("")).await, DecodedSubmission::default());
        assert_eq!(*executor.lookups.lock().expect("unpoisoned"), 0);
    }

    #[tokio::test]
    async fn yields_nothing_when_the_bundle_lookup_fails() {
        let executor: Arc<BundledSessions> = Arc::new(BundledSessions { down: true, ..BundledSessions::default() });
        let decoder: FakeDecoder = FakeDecoder::default();
        assert_eq!(decode_submission(executor, &decoder, Some("b"), None).await, DecodedSubmission::default());
        assert!(decoder.calls.lock().expect("unpoisoned").is_empty());
    }

    #[tokio::test]
    async fn resolves_no_bundle_for_a_session_with_no_record() {
        let (db, logger) = (database(), logger());
        let services = DetectionServices { db: &db, write_queue: None, pool: None, decoder: None, logger: &logger };
        assert_eq!(services.resolve_bundle_by_session_id("").await, Ok(None));
        assert_eq!(services.resolve_bundle_by_session_id("session").await, Ok(None));
    }
}
