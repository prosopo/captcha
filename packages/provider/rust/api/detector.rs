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

//! `detector/assign` (captcha/assignDetectorBundle.ts) with tasks/detection/assignSecret.ts:
//! a detector bundle from the pool, chosen by a keyed hash of the caller's address.

use crate::api::challenge::{logger_of, ChallengeState};
use crate::api::express::{send_json, Requested};
use crate::api::pipeline::RequestSignals;
use crate::tasks::detection::DetectorBundlePool;
use axum::extract::Request;
use axum::response::Response;
use hmac::{Hmac, Mac};
use http::StatusCode;
use prosopo_api_router::RequestBody;
use prosopo_logger::{LogRecord, Logger};
use prosopo_types::provider_api::assign_detector_bundle_request_body;
use rand_core::{OsRng, RngCore};
use serde_json::{json, Map, Value};
use sha2::Sha256;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

const SECRET_BYTES: usize = 32;

/// Dot-prefixed so a pool replace, which only touches `.js` and `.json`, leaves it alone.
const SECRET_FILENAME: &str = ".assign-secret";

/// `getAssignSecret`'s process cache: the secret, by the path it was read from or written to.
#[derive(Default)]
pub struct AssignSecret(Mutex<Option<(PathBuf, Vec<u8>)>>);

impl AssignSecret {
    /// `getAssignSecret`: the pool volume's secret, made on first use and kept across restarts.
    pub fn get(&self, pool_dir: &Path, logger: &Logger) -> std::io::Result<Vec<u8>> {
        let path: PathBuf = pool_dir.join(SECRET_FILENAME);
        let mut cached = self.0.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        if let Some((cached_path, secret)) = cached.as_ref().filter(|(cached_path, _)| *cached_path == path) {
            let _ = cached_path;
            return Ok(secret.clone());
        }
        if let Ok(existing) = std::fs::read(&path) {
            if existing.len() == SECRET_BYTES {
                *cached = Some((path, existing.clone()));
                return Ok(existing);
            }
            logger.warn(|| LogRecord::msg("assign secret has unexpected length, regenerating").with_data(json!({ "bytes": existing.len() })));
        }
        let mut secret: Vec<u8> = vec![0; SECRET_BYTES];
        OsRng.fill_bytes(&mut secret);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let temp: PathBuf = PathBuf::from(format!("{}.tmp", path.display()));
        write_private(&temp, &secret)?;
        std::fs::rename(&temp, &path)?;
        logger.info(|| LogRecord::msg("generated a new assign secret").with_data(json!({ "path": path.display().to_string() })));
        *cached = Some((path, secret.clone()));
        Ok(secret)
    }
}

fn write_private(path: &Path, contents: &[u8]) -> std::io::Result<()> {
    use std::io::Write;
    let mut options = std::fs::OpenOptions::new();
    options.write(true).create(true).truncate(true);
    #[cfg(unix)]
    std::os::unix::fs::OpenOptionsExt::mode(&mut options, 0o600);
    options.open(path)?.write_all(contents)?;
    #[cfg(unix)]
    std::fs::set_permissions(path, std::os::unix::fs::PermissionsExt::from_mode(0o600))?;
    Ok(())
}

/// `clientIndex`: the first six bytes of HMAC-SHA256(secret, ip), big-endian.
pub fn client_index(ip: &str, secret: &[u8]) -> usize {
    let mut mac = Hmac::<Sha256>::new_from_slice(secret).expect("HMAC takes a key of any length");
    mac.update(ip.as_bytes());
    let digest = mac.finalize().into_bytes();
    digest[..6].iter().fold(0usize, |index, byte| (index << 8) | usize::from(*byte))
}

fn no_bundle(requested: &Requested) -> Response {
    send_json(requested, StatusCode::OK, Vec::new(), &json!({ "useProviderBundle": false, "status": "ok" }))
}

/// `siteConfig`: the site's `clientUrl` and `assetOrigin`, when it has both.
async fn site_config(state: &ChallengeState, body: Option<&Value>, logger: &Logger) -> Map<String, Value> {
    let mut out: Map<String, Value> = Map::new();
    let Ok(parsed) = assign_detector_bundle_request_body().validate(Some(body.unwrap_or(&Value::Null))) else {
        return out;
    };
    let Some(services) = state.services.as_ref() else {
        return out;
    };
    let dapp: &str = parsed.get("dapp").and_then(Value::as_str).unwrap_or_default();
    match services.db.get_client_record(dapp).await {
        Ok(client) => {
            let settings: Option<Value> = client.as_ref().and_then(crate::tasks::request::settings_json);
            let text = |key: &str| settings.as_ref().and_then(|settings| settings.get(key)).and_then(Value::as_str).filter(|value| !value.is_empty()).map(str::to_string);
            if let (Some(client_url), Some(asset_origin)) = (text("clientUrl"), text("assetOrigin")) {
                out.insert("clientUrl".to_string(), json!(client_url));
                out.insert("assetOrigin".to_string(), json!(asset_origin));
            }
        }
        Err(error) => logger.warn(|| LogRecord::msg("assignDetectorBundle site config failed").with_err(error.message().to_string())),
    }
    out
}

/// assignDetectorBundle.ts's handler.
pub async fn assign_detector_bundle_route(state: &ChallengeState, request: Request) -> Response {
    let logger: Logger = logger_of(&request);
    let requested: Requested = Requested::of(&request);
    let pool: Arc<DetectorBundlePool> = state.pool.read().map_or_else(|poisoned| poisoned.into_inner().clone(), |pool| pool.clone());
    if pool.size() == 0 {
        return no_bundle(&requested);
    }
    let ip: String = request.extensions().get::<RequestSignals>().map(|signals| signals.ip.clone()).unwrap_or_default();
    let body: Option<Value> = request.extensions().get::<RequestBody>().map(|body| body.0.clone());
    let fallback = |error: String| {
        logger.warn(|| LogRecord::msg("assignDetectorBundle failed; falling back to bundled detector").with_err(error));
        no_bundle(&requested)
    };
    let secret: Vec<u8> = match state.assign_secret.get(Path::new(&state.pool_dir), &logger) {
        Ok(secret) => secret,
        Err(error) => return fallback(error.to_string()),
    };
    let (bundle_id, bundle) = match pool.at(client_index(&ip, &secret)) {
        Ok(found) => found,
        Err(error) => return fallback(error),
    };
    let detector_session_id: String = format!("det-{}", uuid::Uuid::new_v4());
    let Some(services) = state.services.as_ref() else {
        return fallback("db not setup! Please call isReady() first".to_string());
    };
    let Some(queue) = services.write_queue() else {
        return no_bundle(&requested);
    };
    if !queue.cache_detector_bundle(&detector_session_id, bundle_id, None).await {
        return no_bundle(&requested);
    }
    let mut answer: Map<String, Value> = Map::new();
    answer.insert("useProviderBundle".to_string(), json!(true));
    answer.insert("detectorSessionId".to_string(), json!(detector_session_id));
    answer.insert("detectorScript".to_string(), json!(bundle.js));
    answer.extend(site_config(state, body.as_ref(), &logger).await);
    answer.insert("status".to_string(), json!("ok"));
    send_json(&requested, StatusCode::OK, Vec::new(), &Value::Object(answer))
}

#[cfg(test)]
mod tests {
    use super::*;
    use prosopo_logger::{get_logger, LogLevel};

    #[test]
    fn keeps_the_secret_on_the_pool_volume_across_restarts() {
        let dir = tempfile::TempDir::new().expect("a dir");
        let logger: Logger = get_logger(LogLevel::Error, "test");
        let first: Vec<u8> = AssignSecret::default().get(dir.path(), &logger).expect("made");
        assert_eq!(first.len(), SECRET_BYTES);
        assert_eq!(AssignSecret::default().get(dir.path(), &logger).expect("read"), first);
        std::fs::write(dir.path().join(SECRET_FILENAME), b"short").expect("writes");
        let regenerated: Vec<u8> = AssignSecret::default().get(dir.path(), &logger).expect("remade");
        assert_eq!(regenerated.len(), SECRET_BYTES);
        assert_ne!(regenerated, first);
    }

    #[test]
    fn indexes_by_the_first_six_bytes_of_the_keyed_hash() {
        // HMAC-SHA256("key", "The quick brown fox jumps over the lazy dog") starts f7bc83f430538424.
        assert_eq!(client_index("The quick brown fox jumps over the lazy dog", b"key"), 0xf7bc_83f4_3053);
    }
}
