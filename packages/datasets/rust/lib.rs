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

//! The datasets package: captcha merkle trees, dataset parsing and building, solution checks
//! and signed asset URLs.

#[cfg(feature = "fetch")]
mod asset_token;
mod captcha;
#[cfg(feature = "fetch")]
mod dataset;
#[cfg(feature = "fetch")]
mod download;
mod error;
mod merkle;

#[cfg(feature = "fetch")]
pub use asset_token::{
    asset_token_base, asset_token_options_from, asset_token_options_from_env, encode_asset_token,
    sign_asset_url, SignAssetUrlOptions, ASSET_TOKEN_KEY_ENV, ASSET_TOKEN_TTL_ENV,
    DEFAULT_ASSET_TOKEN_TTL_SECONDS,
};
pub use captcha::{
    captcha_sort, compare_captcha_solutions, compute_captcha_hash, compute_captcha_solution_hash,
    compute_pending_request_hash, get_solution_value_to_hash, js_sort, match_items_to_solutions,
    parse_and_sort_captcha_solutions, parse_captcha_assets, parse_captcha_dataset,
    sort_and_compute_hashes, AssetsResolver, CaptchaHashInput, CaptchaIdHash, SolutionValue,
    NO_SOLUTION_VALUE,
};
#[cfg(feature = "fetch")]
pub use dataset::{
    add_solution_hashes_to_dataset, build_captcha_tree, build_dataset, hash_dataset_items,
    validate_dataset_content,
};
#[cfg(feature = "fetch")]
pub use download::{
    compute_item_hash, compute_item_hash_with, download_image, download_image_with, Fetch,
    FetchFuture, FetchedResponse, HttpFetch,
};
pub use error::{plain_message, DatasetsError, Result};
pub use merkle::{hash_strings, merkle_root, parent_layers, verify_proof, CaptchaMerkleTree};

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod tests;
