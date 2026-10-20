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
use std::pin::Pin;

use futures_util::TryStreamExt;
use tokio::io::AsyncRead;
use tokio_util::io::StreamReader;

use crate::error::UtilError;
use crate::js::parse_int;

/// A response body, read incrementally.
pub type ByteStream = Pin<Box<dyn AsyncRead + Send>>;

/// The parts of a `fetch` response the cache uses.
pub struct HttpResponse {
    pub status: u16,
    /// Header names in any case; repeated headers appear once per value.
    pub headers: Vec<(String, String)>,
    /// `None` for the null-body statuses (204, 205, 304), as with `fetch`.
    pub body: Option<ByteStream>,
}

impl HttpResponse {
    /// `Headers.get`: every value of the header, joined with `", "`.
    pub fn header(&self, name: &str) -> Option<String> {
        let values: Vec<&str> = self
            .headers
            .iter()
            .filter(|(key, _)| key.eq_ignore_ascii_case(name))
            .map(|(_, value)| value.as_str())
            .collect();
        if values.is_empty() {
            None
        } else {
            Some(values.join(", "))
        }
    }
}

/// A `GET` with request headers. Errors carry the message `fetch` would
/// reject with, e.g. `TypeError: fetch failed`.
pub trait HttpClient: Sync {
    fn get(
        &self,
        url: &str,
        headers: &[(&str, &str)],
    ) -> impl Future<Output = Result<HttpResponse, String>> + Send;
}

/// [`HttpClient`] backed by reqwest, standing in for Node's global `fetch`.
#[derive(Debug, Clone, Default)]
pub struct ReqwestHttpClient {
    client: reqwest::Client,
}

impl ReqwestHttpClient {
    pub fn new(client: reqwest::Client) -> Self {
        Self { client }
    }
}

fn is_null_body_status(status: u16) -> bool {
    matches!(status, 101 | 103 | 204 | 205 | 304)
}

impl HttpClient for ReqwestHttpClient {
    async fn get(&self, url: &str, headers: &[(&str, &str)]) -> Result<HttpResponse, String> {
        if url::Url::parse(url).is_err() {
            return Err(format!("TypeError: Failed to parse URL from {url}"));
        }
        let mut request = self.client.get(url);
        for (name, value) in headers {
            request = request.header(*name, *value);
        }
        let response = request
            .send()
            .await
            .map_err(|_| "TypeError: fetch failed".to_string())?;
        let status = response.status().as_u16();
        let headers: Vec<(String, String)> = response
            .headers()
            .iter()
            .map(|(name, value)| {
                (
                    name.as_str().to_string(),
                    String::from_utf8_lossy(value.as_bytes()).into_owned(),
                )
            })
            .collect();
        let body: Option<ByteStream> = if is_null_body_status(status) {
            None
        } else {
            let stream = response.bytes_stream().map_err(std::io::Error::other);
            Some(Box::pin(StreamReader::new(stream)))
        };
        Ok(HttpResponse {
            status,
            headers,
            body,
        })
    }
}

pub struct FetchWithETagResult {
    pub stream: Option<ByteStream>,
    pub etag: Option<String>,
    pub not_modified: bool,
    pub content_length: Option<f64>,
}

pub struct FetchWithLastModifiedResult {
    pub stream: Option<ByteStream>,
    pub last_modified: Option<String>,
    pub not_modified: bool,
    pub content_length: Option<f64>,
}

struct ConditionalResponse {
    stream: Option<ByteStream>,
    validator: Option<String>,
    not_modified: bool,
    content_length: Option<f64>,
}

async fn conditional_get(
    client: &impl HttpClient,
    url: &str,
    request_header: &str,
    validator: Option<&str>,
    response_header: &str,
) -> Result<ConditionalResponse, UtilError> {
    let validator = validator.filter(|v| !v.is_empty());
    let headers: Vec<(&str, &str)> = validator
        .map(|v| vec![(request_header, v)])
        .unwrap_or_default();
    let response = client
        .get(url, &headers)
        .await
        .map_err(|e| UtilError::new(format!("Fetch error: {e}")))?;
    if response.status == 304 {
        return Ok(ConditionalResponse {
            stream: None,
            validator: None,
            not_modified: true,
            content_length: None,
        });
    }
    if !(200..=299).contains(&response.status) {
        return Err(UtilError::new(format!(
            "Fetch error: Error: HTTP error! status: {}",
            response.status
        )));
    }
    let validator = response.header(response_header).filter(|v| !v.is_empty());
    let content_length = response
        .header("content-length")
        .filter(|v| !v.is_empty())
        .map(|v| parse_int(&v, 10))
        .filter(|n| n.is_finite());
    Ok(ConditionalResponse {
        stream: response.body,
        validator,
        not_modified: false,
        content_length,
    })
}

/// `fetchWithETag`: a GET with `If-None-Match` when `etag` is given.
pub async fn fetch_with_etag(
    client: &impl HttpClient,
    url: &str,
    etag: Option<&str>,
) -> Result<FetchWithETagResult, UtilError> {
    let r = conditional_get(client, url, "If-None-Match", etag, "etag").await?;
    Ok(FetchWithETagResult {
        stream: r.stream,
        etag: r.validator,
        not_modified: r.not_modified,
        content_length: r.content_length,
    })
}

/// `fetchWithLastModified`: a GET with `If-Modified-Since` when `last_modified` is given.
pub async fn fetch_with_last_modified(
    client: &impl HttpClient,
    url: &str,
    last_modified: Option<&str>,
) -> Result<FetchWithLastModifiedResult, UtilError> {
    let r = conditional_get(
        client,
        url,
        "If-Modified-Since",
        last_modified,
        "last-modified",
    )
    .await?;
    Ok(FetchWithLastModifiedResult {
        stream: r.stream,
        last_modified: r.validator,
        not_modified: r.not_modified,
        content_length: r.content_length,
    })
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use tokio::io::AsyncReadExt;

    use super::*;

    struct FakeClient {
        status: u16,
        headers: Vec<(&'static str, &'static str)>,
        requests: Mutex<Vec<Vec<(String, String)>>>,
    }

    impl FakeClient {
        fn new(status: u16, headers: &[(&'static str, &'static str)]) -> Self {
            Self {
                status,
                headers: headers.to_vec(),
                requests: Mutex::new(Vec::new()),
            }
        }
    }

    impl HttpClient for FakeClient {
        async fn get(&self, _url: &str, headers: &[(&str, &str)]) -> Result<HttpResponse, String> {
            self.requests.lock().unwrap().push(
                headers
                    .iter()
                    .map(|(k, v)| (k.to_string(), v.to_string()))
                    .collect(),
            );
            Ok(HttpResponse {
                status: self.status,
                headers: self
                    .headers
                    .iter()
                    .map(|(k, v)| (k.to_string(), v.to_string()))
                    .collect(),
                body: (self.status != 304)
                    .then(|| Box::pin(std::io::Cursor::new(b"body".to_vec())) as ByteStream),
            })
        }
    }

    #[tokio::test]
    async fn sends_if_none_match_and_reads_the_response() {
        let client = FakeClient::new(200, &[("ETag", "\"v2\""), ("Content-Length", "4")]);
        let result = fetch_with_etag(&client, "https://example.com", Some("\"v1\""))
            .await
            .unwrap();
        assert_eq!(
            client.requests.lock().unwrap()[0],
            vec![("If-None-Match".to_string(), "\"v1\"".to_string())]
        );
        assert_eq!(result.etag.as_deref(), Some("\"v2\""));
        assert_eq!(result.content_length, Some(4.0));
        assert!(!result.not_modified);
        let mut body = String::new();
        result
            .stream
            .unwrap()
            .read_to_string(&mut body)
            .await
            .unwrap();
        assert_eq!(body, "body");
    }

    #[tokio::test]
    async fn reports_not_modified() {
        let client = FakeClient::new(304, &[("etag", "\"v1\"")]);
        let result = fetch_with_last_modified(&client, "https://example.com", None)
            .await
            .unwrap();
        assert!(client.requests.lock().unwrap()[0].is_empty());
        assert!(result.not_modified);
        assert!(result.stream.is_none());
        assert_eq!(result.last_modified, None);
    }

    #[tokio::test]
    async fn rejects_error_statuses() {
        let client = FakeClient::new(404, &[]);
        let error = fetch_with_etag(&client, "https://example.com", None)
            .await
            .err()
            .unwrap();
        assert_eq!(
            error.message(),
            "Fetch error: Error: HTTP error! status: 404"
        );
    }

    #[tokio::test]
    async fn drops_an_unparseable_content_length() {
        let client = FakeClient::new(200, &[("content-length", "abc")]);
        let result = fetch_with_etag(&client, "https://example.com", None)
            .await
            .unwrap();
        assert_eq!(result.content_length, None);
        assert_eq!(result.etag, None);
    }
}
