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

use std::future::Future;
use std::io::ErrorKind;

use base64::Engine;
use tokio::io::AsyncWriteExt;

use crate::error::UtilError;
use crate::fetch_with_etag::{
    fetch_with_etag, fetch_with_last_modified, ByteStream, FetchWithETagResult,
    FetchWithLastModifiedResult, HttpClient,
};

/// What `cacheFile` logs. `err` is set on the fetch-failure warning.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CacheLogEntry {
    pub msg: String,
    pub err: Option<String>,
}

/// The logger `cacheFile` takes: each level receives a lazily built entry.
pub trait CacheFileLogger {
    fn debug(&self, entry: &dyn Fn() -> CacheLogEntry);
    fn info(&self, entry: &dyn Fn() -> CacheLogEntry);
    fn warn(&self, entry: &dyn Fn() -> CacheLogEntry);
    fn error(&self, entry: &dyn Fn() -> CacheLogEntry);
}

/// The two conditional fetches `cacheFile` makes. The TS tests replace these
/// (`fetchWithETag` and `cacheFileUtils.fetchWithLastModified`) with fakes.
pub trait CacheFileFetcher: Sync {
    fn fetch_with_etag(
        &self,
        url: &str,
        etag: Option<&str>,
    ) -> impl Future<Output = Result<FetchWithETagResult, UtilError>> + Send;

    fn fetch_with_last_modified(
        &self,
        url: &str,
        last_modified: Option<&str>,
    ) -> impl Future<Output = Result<FetchWithLastModifiedResult, UtilError>> + Send;
}

/// [`CacheFileFetcher`] that makes real requests through an [`HttpClient`].
pub struct HttpCacheFileFetcher<C> {
    client: C,
}

impl<C: HttpClient> HttpCacheFileFetcher<C> {
    pub fn new(client: C) -> Self {
        Self { client }
    }
}

impl<C: HttpClient> CacheFileFetcher for HttpCacheFileFetcher<C> {
    async fn fetch_with_etag(
        &self,
        url: &str,
        etag: Option<&str>,
    ) -> Result<FetchWithETagResult, UtilError> {
        fetch_with_etag(&self.client, url, etag).await
    }

    async fn fetch_with_last_modified(
        &self,
        url: &str,
        last_modified: Option<&str>,
    ) -> Result<FetchWithLastModifiedResult, UtilError> {
        fetch_with_last_modified(&self.client, url, last_modified).await
    }
}

fn io_error(error: std::io::Error) -> UtilError {
    UtilError::new(error.to_string())
}

/// `path.normalize` for POSIX paths.
fn normalize(path: &str) -> String {
    if path.is_empty() {
        return ".".to_string();
    }
    let absolute = path.starts_with('/');
    let trailing_separator = path.ends_with('/');
    let mut segments: Vec<&str> = Vec::new();
    for segment in path.split('/') {
        match segment {
            "" | "." => {}
            ".." => {
                if segments.last().is_some_and(|last| *last != "..") {
                    segments.pop();
                } else if !absolute {
                    segments.push("..");
                }
            }
            other => segments.push(other),
        }
    }
    let mut joined = segments.join("/");
    if joined.is_empty() && !absolute {
        joined.push('.');
    }
    if !joined.is_empty() && trailing_separator {
        joined.push('/');
    }
    if absolute {
        format!("/{joined}")
    } else {
        joined
    }
}

/// `path.join(dir, file)` for POSIX paths.
fn join(dir: &str, file: &str) -> String {
    let parts: Vec<&str> = [dir, file].into_iter().filter(|p| !p.is_empty()).collect();
    if parts.is_empty() {
        return ".".to_string();
    }
    normalize(&parts.join("/"))
}

/// The directory's entry names in `fs.readdirSync` order (libuv sorts them
/// bytewise), or `None` if it doesn't exist.
async fn read_dir_sorted(dir: &str) -> Result<Option<Vec<String>>, UtilError> {
    let mut entries = match tokio::fs::read_dir(dir).await {
        Ok(entries) => entries,
        Err(e) if e.kind() == ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(io_error(e)),
    };
    let mut names: Vec<String> = Vec::new();
    while let Some(entry) = entries.next_entry().await.map_err(io_error)? {
        names.push(entry.file_name().to_string_lossy().into_owned());
    }
    names.sort();
    Ok(Some(names))
}

pub async fn ensure_dir_exists(cache_dir: &str) -> Result<(), UtilError> {
    if tokio::fs::try_exists(cache_dir).await.unwrap_or(false) {
        return Ok(());
    }
    tokio::fs::create_dir_all(cache_dir).await.map_err(io_error)
}

/// `W/"x"` → `W_x`, `"x"` → `x`, with filename-unsafe characters as `_`.
fn sanitize_etag_for_filename(etag: &str) -> String {
    let weak = match etag.strip_prefix("W/") {
        Some(rest) => format!("W_{rest}"),
        None => etag.to_string(),
    };
    weak.replace('"', "")
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            other => other,
        })
        .collect()
}

/// base64url, so any Last-Modified value survives the round trip.
fn sanitize_last_modified_for_filename(last_modified: &str) -> String {
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(last_modified.as_bytes())
}

/// `Buffer.from(s, "base64url")`: either alphabet, stopping at `=`, skipping
/// anything else.
fn decode_base64_lenient(s: &str) -> Vec<u8> {
    let mut out: Vec<u8> = Vec::new();
    let mut buffer: u32 = 0;
    let mut bits = 0;
    for c in s.chars() {
        let value = match c {
            'A'..='Z' => c as u32 - 'A' as u32,
            'a'..='z' => c as u32 - 'a' as u32 + 26,
            '0'..='9' => c as u32 - '0' as u32 + 52,
            '+' | '-' => 62,
            '/' | '_' => 63,
            '=' => break,
            _ => continue,
        };
        buffer = (buffer << 6) | value;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buffer >> bits) as u8);
            buffer &= (1 << bits) - 1;
        }
    }
    out
}

/// The part of `filename` between the prefix, the type and `marker`, each
/// removed at its first occurrence as `String.prototype.replace` does.
fn strip_filename_parts(
    filename: &str,
    file_prefix: &str,
    file_type: &str,
    marker: &str,
) -> String {
    let without_prefix = filename.replacen(file_prefix, "", 1);
    let without_type = without_prefix.replacen(file_type, "", 1);
    without_type
        .strip_prefix(marker)
        .map(str::to_string)
        .unwrap_or(without_type)
}

fn reconstruct_etag_from_filename(filename: &str, file_prefix: &str, file_type: &str) -> String {
    let sanitized = strip_filename_parts(filename, file_prefix, file_type, "etag-");
    match sanitized.strip_prefix("W_") {
        Some(rest) => format!("W/\"{rest}\""),
        None => format!("\"{sanitized}\""),
    }
}

fn reconstruct_last_modified_from_filename(
    filename: &str,
    file_prefix: &str,
    file_type: &str,
) -> String {
    let encoded = strip_filename_parts(filename, file_prefix, file_type, "lm-");
    String::from_utf8_lossy(&decode_base64_lenient(&encoded)).into_owned()
}

fn is_cache_file(file: &str, file_prefix: &str, file_type: &str) -> bool {
    file.starts_with(file_prefix) && file.ends_with(file_type)
}

pub async fn purge_old_cache(
    cache_dir: &str,
    file_prefix: &str,
    file_type: &str,
) -> Result<(), UtilError> {
    let Some(files) = read_dir_sorted(cache_dir).await? else {
        return Ok(());
    };
    for file in files {
        if is_cache_file(&file, file_prefix, file_type) {
            tokio::fs::remove_file(join(cache_dir, &file))
                .await
                .map_err(io_error)?;
        }
    }
    Ok(())
}

async fn find_cached_file(
    cache_dir: &str,
    file_prefix: &str,
    file_type: &str,
    marker: &str,
) -> Result<Option<String>, UtilError> {
    let Some(files) = read_dir_sorted(cache_dir).await? else {
        return Ok(None);
    };
    Ok(files
        .into_iter()
        .find(|file| is_cache_file(file, file_prefix, file_type) && file.contains(marker)))
}

/// The ETag of the cached copy, rebuilt from its filename.
pub async fn get_current_etag(
    cache_dir: &str,
    file_prefix: &str,
    file_type: &str,
) -> Result<Option<String>, UtilError> {
    Ok(find_cached_file(cache_dir, file_prefix, file_type, "etag-")
        .await?
        .map(|file| reconstruct_etag_from_filename(&file, file_prefix, file_type)))
}

/// The Last-Modified value of the cached copy, rebuilt from its filename.
pub async fn get_current_last_modified(
    cache_dir: &str,
    file_prefix: &str,
    file_type: &str,
) -> Result<Option<String>, UtilError> {
    Ok(find_cached_file(cache_dir, file_prefix, file_type, "lm-")
        .await?
        .map(|file| reconstruct_last_modified_from_filename(&file, file_prefix, file_type)))
}

pub async fn get_cached_file_path(
    cache_dir: &str,
    file_prefix: &str,
    file_type: &str,
) -> Result<Option<String>, UtilError> {
    let Some(files) = read_dir_sorted(cache_dir).await? else {
        return Ok(None);
    };
    Ok(files
        .into_iter()
        .find(|file| is_cache_file(file, file_prefix, file_type))
        .map(|file| join(cache_dir, &file)))
}

/// Streams `stream` to `filepath`, removing the partial file on failure.
async fn save_stream(mut stream: ByteStream, filepath: String) -> Result<String, UtilError> {
    let written: Result<(), std::io::Error> = async {
        let mut file = tokio::fs::File::create(&filepath).await?;
        tokio::io::copy(&mut stream, &mut file).await?;
        file.flush().await
    }
    .await;
    match written {
        Ok(()) => Ok(filepath),
        Err(error) => {
            let _ = tokio::fs::remove_file(&filepath).await;
            Err(io_error(error))
        }
    }
}

pub async fn save_file_with_etag(
    stream: ByteStream,
    etag: &str,
    cache_dir: &str,
    file_prefix: &str,
    file_type: &str,
) -> Result<String, UtilError> {
    let filename = format!(
        "{file_prefix}etag-{}{file_type}",
        sanitize_etag_for_filename(etag)
    );
    save_stream(stream, join(cache_dir, &filename)).await
}

pub async fn save_file_with_last_modified(
    stream: ByteStream,
    last_modified: &str,
    cache_dir: &str,
    file_prefix: &str,
    file_type: &str,
) -> Result<String, UtilError> {
    let filename = format!(
        "{file_prefix}lm-{}{file_type}",
        sanitize_last_modified_for_filename(last_modified)
    );
    save_stream(stream, join(cache_dir, &filename)).await
}

fn entry(msg: &str) -> CacheLogEntry {
    CacheLogEntry {
        msg: msg.to_string(),
        err: None,
    }
}

/// The body of the TS `try` block. `file_path` is updated as soon as a new
/// copy is saved, so a later failure still falls back to it.
#[derive(Clone, Copy)]
struct CacheLocation<'a> {
    cache_dir: &'a str,
    file_prefix: &'a str,
    file_type: &'a str,
}

async fn refresh_cache(
    location: &CacheLocation<'_>,
    url: &str,
    logger: &impl CacheFileLogger,
    fetcher: &impl CacheFileFetcher,
    current_etag: Option<&str>,
    current_last_modified: Option<&str>,
    file_path: &mut Option<String>,
) -> Result<(), UtilError> {
    let CacheLocation {
        cache_dir,
        file_prefix,
        file_type,
    } = *location;
    if let Some(current_etag) = current_etag {
        let result = fetcher.fetch_with_etag(url, Some(current_etag)).await?;
        if result.not_modified && file_path.is_some() {
            logger.debug(&|| entry("File not modified (ETag), using cached version"));
        } else if let (Some(stream), Some(etag)) = (result.stream, result.etag) {
            logger.info(&|| entry("File updated (ETag), caching new version"));
            purge_old_cache(cache_dir, file_prefix, file_type).await?;
            *file_path =
                Some(save_file_with_etag(stream, &etag, cache_dir, file_prefix, file_type).await?);
        } else {
            return Err(UtilError::new("Failed to fetch file or no ETag received"));
        }
    } else if let Some(current_last_modified) = current_last_modified {
        let result = fetcher
            .fetch_with_last_modified(url, Some(current_last_modified))
            .await?;
        if result.not_modified && file_path.is_some() {
            logger.debug(&|| entry("File not modified (Last-Modified), using cached version"));
        } else if let (Some(stream), Some(last_modified)) = (result.stream, result.last_modified) {
            logger.info(&|| entry("File updated (Last-Modified), caching new version"));
            purge_old_cache(cache_dir, file_prefix, file_type).await?;
            *file_path = Some(
                save_file_with_last_modified(
                    stream,
                    &last_modified,
                    cache_dir,
                    file_prefix,
                    file_type,
                )
                .await?,
            );
        } else {
            return Err(UtilError::new(
                "Failed to fetch file or no Last-Modified received",
            ));
        }
    } else {
        let etag_result = fetcher.fetch_with_etag(url, None).await?;
        if let (Some(stream), Some(etag)) = (etag_result.stream, etag_result.etag) {
            logger.info(&|| entry("Fetching file for first time (ETag)"));
            *file_path =
                Some(save_file_with_etag(stream, &etag, cache_dir, file_prefix, file_type).await?);
        } else {
            let lm_result = fetcher.fetch_with_last_modified(url, None).await?;
            if let (Some(stream), Some(last_modified)) = (lm_result.stream, lm_result.last_modified)
            {
                logger.info(&|| entry("Fetching file for first time (Last-Modified)"));
                *file_path = Some(
                    save_file_with_last_modified(
                        stream,
                        &last_modified,
                        cache_dir,
                        file_prefix,
                        file_type,
                    )
                    .await?,
                );
            } else {
                return Err(UtilError::new(
                    "Failed to fetch file - no ETag or Last-Modified available",
                ));
            }
        }
    }
    Ok(())
}

/// `cacheFile`: keeps a copy of `url` in `cache_dir`, revalidated with the
/// stored ETag (or Last-Modified) on every call, and returns its path. If the
/// fetch fails the existing copy is used; with no copy it fails.
pub async fn cache_file(
    cache_dir: &str,
    url: &str,
    logger: &impl CacheFileLogger,
    file_prefix: &str,
    file_type: &str,
    fetcher: &impl CacheFileFetcher,
) -> Result<String, UtilError> {
    ensure_dir_exists(cache_dir).await?;

    let current_etag = get_current_etag(cache_dir, file_prefix, file_type).await?;
    let current_last_modified =
        get_current_last_modified(cache_dir, file_prefix, file_type).await?;
    let mut file_path = get_cached_file_path(cache_dir, file_prefix, file_type).await?;

    let location = CacheLocation {
        cache_dir,
        file_prefix,
        file_type,
    };
    let refreshed = refresh_cache(
        &location,
        url,
        logger,
        fetcher,
        current_etag.as_deref(),
        current_last_modified.as_deref(),
        &mut file_path,
    )
    .await;

    if let Err(error) = refreshed {
        logger.warn(&|| CacheLogEntry {
            msg: "Failed to fetch file from remote, using cached version if available".to_string(),
            err: Some(error.to_string()),
        });
    }
    file_path
        .ok_or_else(|| UtilError::new("No cached file available and failed to fetch from remote"))
}

#[cfg(test)]
mod tests {
    // Ported from src/tests/cacheFile.unit.test.ts
    use std::collections::VecDeque;
    use std::sync::Mutex;

    use super::*;

    const TEST_URL: &str = "https://example.com/data.txt";
    const FILE_PREFIX: &str = "test-file-";
    const FILE_TYPE: &str = ".txt";

    fn string_to_stream(content: &str) -> ByteStream {
        Box::pin(std::io::Cursor::new(content.as_bytes().to_vec()))
    }

    /// A canned fetch result: the body (if any), the validator header and
    /// whether the server answered 304.
    #[derive(Clone)]
    struct Canned {
        body: Option<&'static str>,
        validator: Option<&'static str>,
        not_modified: bool,
    }

    const NOT_MODIFIED: Canned = Canned {
        body: None,
        validator: None,
        not_modified: true,
    };
    const NO_VALIDATOR: Canned = Canned {
        body: None,
        validator: None,
        not_modified: false,
    };

    fn fresh(body: &'static str, validator: &'static str) -> Canned {
        Canned {
            body: Some(body),
            validator: Some(validator),
            not_modified: false,
        }
    }

    /// `mockResolvedValueOnce` answers in order, then `mockResolvedValue`.
    #[derive(Default)]
    struct Mock {
        once: Mutex<VecDeque<Canned>>,
        always: Option<Canned>,
        calls: Mutex<Vec<(String, Option<String>)>>,
    }

    impl Mock {
        fn once(values: &[Canned]) -> Self {
            Self {
                once: Mutex::new(values.iter().cloned().collect()),
                ..Self::default()
            }
        }

        fn always(value: Canned) -> Self {
            Self {
                always: Some(value),
                ..Self::default()
            }
        }

        fn answer(&self, url: &str, validator: Option<&str>) -> Canned {
            self.calls
                .lock()
                .unwrap()
                .push((url.to_string(), validator.map(str::to_string)));
            let queued = self.once.lock().unwrap().pop_front();
            queued
                .or_else(|| self.always.clone())
                .expect("unexpected call to an unmocked fetch")
        }

        fn nth_call(&self, n: usize) -> (String, Option<String>) {
            self.calls.lock().unwrap()[n - 1].clone()
        }
    }

    struct FakeFetcher {
        etag: Mock,
        last_modified: Mock,
    }

    impl CacheFileFetcher for FakeFetcher {
        async fn fetch_with_etag(
            &self,
            url: &str,
            etag: Option<&str>,
        ) -> Result<FetchWithETagResult, UtilError> {
            let canned = self.etag.answer(url, etag);
            Ok(FetchWithETagResult {
                stream: canned.body.map(string_to_stream),
                etag: canned.validator.map(str::to_string),
                not_modified: canned.not_modified,
                content_length: None,
            })
        }

        async fn fetch_with_last_modified(
            &self,
            url: &str,
            last_modified: Option<&str>,
        ) -> Result<FetchWithLastModifiedResult, UtilError> {
            let canned = self.last_modified.answer(url, last_modified);
            Ok(FetchWithLastModifiedResult {
                stream: canned.body.map(string_to_stream),
                last_modified: canned.validator.map(str::to_string),
                not_modified: canned.not_modified,
                content_length: None,
            })
        }
    }

    #[derive(Default)]
    struct RecordingLogger {
        entries: Mutex<Vec<(&'static str, CacheLogEntry)>>,
    }

    impl RecordingLogger {
        fn record(&self, level: &'static str, entry: &dyn Fn() -> CacheLogEntry) {
            self.entries.lock().unwrap().push((level, entry()));
        }

        fn was_called(&self, level: &str) -> bool {
            self.entries
                .lock()
                .unwrap()
                .iter()
                .any(|(l, _)| *l == level)
        }
    }

    impl CacheFileLogger for RecordingLogger {
        fn debug(&self, entry: &dyn Fn() -> CacheLogEntry) {
            self.record("debug", entry);
        }
        fn info(&self, entry: &dyn Fn() -> CacheLogEntry) {
            self.record("info", entry);
        }
        fn warn(&self, entry: &dyn Fn() -> CacheLogEntry) {
            self.record("warn", entry);
        }
        fn error(&self, entry: &dyn Fn() -> CacheLogEntry) {
            self.record("error", entry);
        }
    }

    fn test_cache_dir() -> (tempfile::TempDir, String) {
        let root = tempfile::tempdir().unwrap();
        let dir = root.path().join("test-cache");
        std::fs::create_dir_all(&dir).unwrap();
        let dir = dir.to_string_lossy().into_owned();
        (root, dir)
    }

    async fn run(dir: &str, logger: &RecordingLogger, fetcher: &FakeFetcher) -> String {
        cache_file(dir, TEST_URL, logger, FILE_PREFIX, FILE_TYPE, fetcher)
            .await
            .unwrap()
    }

    #[tokio::test]
    async fn round_trips_weak_etags_through_the_cache_cycle() {
        let (_root, dir) = test_cache_dir();
        let logger = RecordingLogger::default();
        let fetcher = FakeFetcher {
            etag: Mock::once(&[fresh("test content", "W/\"abc123\""), NOT_MODIFIED]),
            last_modified: Mock::default(),
        };
        run(&dir, &logger, &fetcher).await;
        run(&dir, &logger, &fetcher).await;
        assert_eq!(
            fetcher.etag.nth_call(2),
            (TEST_URL.to_string(), Some("W/\"abc123\"".to_string()))
        );
    }

    #[tokio::test]
    async fn round_trips_strong_etags_through_the_cache_cycle() {
        let (_root, dir) = test_cache_dir();
        let logger = RecordingLogger::default();
        let fetcher = FakeFetcher {
            etag: Mock::once(&[fresh("test content", "\"abc123\""), NOT_MODIFIED]),
            last_modified: Mock::default(),
        };
        run(&dir, &logger, &fetcher).await;
        run(&dir, &logger, &fetcher).await;
        assert_eq!(
            fetcher.etag.nth_call(2),
            (TEST_URL.to_string(), Some("\"abc123\"".to_string()))
        );
    }

    #[tokio::test]
    async fn handles_an_empty_response_body_with_a_valid_etag() {
        let (_root, dir) = test_cache_dir();
        let logger = RecordingLogger::default();
        let fetcher = FakeFetcher {
            etag: Mock::always(fresh("", "\"empty123\"")),
            last_modified: Mock::default(),
        };
        let file_path = run(&dir, &logger, &fetcher).await;
        assert_eq!(std::fs::read_to_string(&file_path).unwrap(), "");
        assert!(logger.was_called("info"));
    }

    #[tokio::test]
    async fn round_trips_last_modified_through_the_cache_cycle() {
        let (_root, dir) = test_cache_dir();
        let logger = RecordingLogger::default();
        let last_modified = "Sunday, 23-Mar-26 10:15:30 GMT";
        let fetcher = FakeFetcher {
            etag: Mock::always(NO_VALIDATOR),
            last_modified: Mock::once(&[fresh("test content", last_modified), NOT_MODIFIED]),
        };
        run(&dir, &logger, &fetcher).await;
        run(&dir, &logger, &fetcher).await;
        assert_eq!(
            fetcher.last_modified.nth_call(2),
            (TEST_URL.to_string(), Some(last_modified.to_string()))
        );
    }

    #[tokio::test]
    async fn handles_an_empty_response_body_with_a_valid_last_modified() {
        let (_root, dir) = test_cache_dir();
        let logger = RecordingLogger::default();
        let fetcher = FakeFetcher {
            etag: Mock::always(NO_VALIDATOR),
            last_modified: Mock::always(fresh("", "Wed, 25 Mar 2026 11:19:09 GMT")),
        };
        let file_path = run(&dir, &logger, &fetcher).await;
        assert_eq!(std::fs::read_to_string(&file_path).unwrap(), "");
        assert!(logger.was_called("info"));
    }

    #[tokio::test]
    async fn falls_back_to_last_modified_when_etag_is_not_available() {
        let (_root, dir) = test_cache_dir();
        let logger = RecordingLogger::default();
        let fetcher = FakeFetcher {
            etag: Mock::always(NO_VALIDATOR),
            last_modified: Mock::always(fresh("test content", "Wed, 25 Mar 2026 11:19:09 GMT")),
        };
        let file_path = run(&dir, &logger, &fetcher).await;
        assert_eq!(std::fs::read_to_string(&file_path).unwrap(), "test content");
        assert!(logger.was_called("info"));
    }

    #[tokio::test]
    async fn uses_the_cached_copy_when_the_refresh_fails() {
        let (_root, dir) = test_cache_dir();
        let logger = RecordingLogger::default();
        let fetcher = FakeFetcher {
            etag: Mock::once(&[fresh("cached", "\"v1\""), NO_VALIDATOR]),
            last_modified: Mock::default(),
        };
        let first = run(&dir, &logger, &fetcher).await;
        let second = run(&dir, &logger, &fetcher).await;
        assert_eq!(first, second);
        assert!(logger.was_called("warn"));
    }

    #[tokio::test]
    async fn fails_with_no_cached_copy_and_no_validator() {
        let (_root, dir) = test_cache_dir();
        let logger = RecordingLogger::default();
        let fetcher = FakeFetcher {
            etag: Mock::always(NO_VALIDATOR),
            last_modified: Mock::always(NO_VALIDATOR),
        };
        let error = cache_file(&dir, TEST_URL, &logger, FILE_PREFIX, FILE_TYPE, &fetcher)
            .await
            .unwrap_err();
        assert_eq!(
            error.message(),
            "No cached file available and failed to fetch from remote"
        );
    }

    #[test]
    fn filenames_round_trip_validators() {
        let etag = "W/\"a/b:c\"";
        let filename = format!(
            "{FILE_PREFIX}etag-{}{FILE_TYPE}",
            sanitize_etag_for_filename(etag)
        );
        assert_eq!(filename, "test-file-etag-W_a_b_c.txt");
        assert_eq!(
            reconstruct_etag_from_filename(&filename, FILE_PREFIX, FILE_TYPE),
            "W/\"a_b_c\""
        );
        let lm = "Wed, 25 Mar 2026 11:19:09 GMT";
        let filename = format!(
            "{FILE_PREFIX}lm-{}{FILE_TYPE}",
            sanitize_last_modified_for_filename(lm)
        );
        assert_eq!(
            reconstruct_last_modified_from_filename(&filename, FILE_PREFIX, FILE_TYPE),
            lm
        );
    }

    #[test]
    fn joins_paths_like_node() {
        assert_eq!(join("/tmp/cache/", "a.txt"), "/tmp/cache/a.txt");
        assert_eq!(join("./a/../b", "c"), "b/c");
        assert_eq!(join("", "c"), "c");
        assert_eq!(join("/../x", "y"), "/x/y");
        assert_eq!(join("../x", "y"), "../x/y");
    }
}
