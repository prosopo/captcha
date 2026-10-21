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

//! Downloading and hashing captcha item images (src/captcha/util.ts and computeItemHash).

use crate::asset_token::{asset_token_options_from_env, sign_asset_url, SignAssetUrlOptions};
use crate::error::{DatasetsError, Result};
use prosopo_common::{ErrorClass, ErrorContext};
use prosopo_logger::ErrorObject;
use prosopo_types::datasets::{CaptchaItem, CaptchaItemTypes};
use prosopo_util_crypto::{hex_hash, U8aLike};
use std::future::Future;
use std::pin::Pin;

/// A finished GET: the status, and the body when the status is a success.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FetchedResponse {
    pub status: u16,
    pub body: Vec<u8>,
}

pub type FetchFuture<'a> =
    Pin<Box<dyn Future<Output = std::result::Result<FetchedResponse, ErrorObject>> + Send + 'a>>;

/// `fetch(url)` for image downloads. A failure is the error `fetch` would reject with.
pub trait Fetch: Send + Sync {
    fn get<'a>(&'a self, url: &'a str) -> FetchFuture<'a>;
}

/// [`Fetch`] over HTTP.
#[derive(Debug, Clone, Default)]
pub struct HttpFetch {
    client: reqwest::Client,
}

impl HttpFetch {
    pub fn new(client: reqwest::Client) -> HttpFetch {
        HttpFetch { client }
    }
}

impl Fetch for HttpFetch {
    fn get<'a>(&'a self, url: &'a str) -> FetchFuture<'a> {
        Box::pin(async move {
            let parsed: reqwest::Url = reqwest::Url::parse(url).map_err(|_| {
                ErrorObject::new("TypeError", format!("Failed to parse URL from {url}"))
            })?;
            let failed = |error: reqwest::Error| {
                ErrorObject::new("TypeError", "fetch failed")
                    .with_cause(ErrorObject::from_std_error(&error))
            };
            let response: reqwest::Response =
                self.client.get(parsed).send().await.map_err(failed)?;
            let status: u16 = response.status().as_u16();
            let body: Vec<u8> = if response.status().is_success() {
                response.bytes().await.map_err(failed)?.to_vec()
            } else {
                Vec::new()
            };
            Ok(FetchedResponse { status, body })
        })
    }
}

/// `downloadImage` with the signing options given rather than read from the environment.
pub async fn download_image_with(
    url: &str,
    fetch: &dyn Fetch,
    options: Option<&SignAssetUrlOptions>,
) -> Result<Vec<u8>> {
    let target: String = match options {
        Some(options) => sign_asset_url(url, options),
        None => url.to_string(),
    };
    let failed = |error: DatasetsError| error.wrap(ErrorClass::Env, "DATABASE.IMAGE_GET_FAILED");
    let response: FetchedResponse = fetch
        .get(&target)
        .await
        .map_err(|error: ErrorObject| failed(DatasetsError::Plain(error)))?;
    if !(200..300).contains(&response.status) {
        return Err(failed(DatasetsError::new(
            ErrorClass::Dataset,
            "API.BAD_REQUEST",
            Some(
                ErrorContext::new()
                    .with(
                        "error",
                        format!("Network response was not ok, status: {}", response.status),
                    )
                    .with("url", url),
            ),
        )));
    }
    Ok(response.body)
}

/// `downloadImage`: the image bytes, from a signed URL when `PROSOPO_ASSET_TOKEN_KEY` is set.
pub async fn download_image(url: &str, fetch: &dyn Fetch) -> Result<Vec<u8>> {
    download_image_with(url, fetch, asset_token_options_from_env().as_ref()).await
}

/// `computeItemHash` with the signing options given: a text item hashes its data, an image
/// item the bytes it downloads.
pub async fn compute_item_hash_with(
    item: &CaptchaItem,
    fetch: &dyn Fetch,
    options: Option<&SignAssetUrlOptions>,
) -> Result<CaptchaItem> {
    let hash =
        |data: U8aLike<'_>| hex_hash(data, None).expect("the default bit length is supported");
    let item_hash: String = match item.item_type {
        CaptchaItemTypes::Text => hash(U8aLike::Str(&item.data)),
        CaptchaItemTypes::Image => hash(U8aLike::Bytes(
            &download_image_with(&item.data, fetch, options).await?,
        )),
    };
    Ok(CaptchaItem {
        hash: item_hash,
        ..item.clone()
    })
}

/// `computeItemHash`.
pub async fn compute_item_hash(item: &CaptchaItem, fetch: &dyn Fetch) -> Result<CaptchaItem> {
    compute_item_hash_with(item, fetch, asset_token_options_from_env().as_ref()).await
}
