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

//! developmentProviderUrl.ts and providerUrlOverride.ts: the two environment overrides.

use crate::js::js_trim;

/// Where a development provider is looked for, unless `PROSOPO_PROVIDER_URL_DEVELOPMENT`
/// says otherwise.
pub const DEFAULT_DEVELOPMENT_PROVIDER_URL: &str = "https://localhost:9229";

pub const DEVELOPMENT_PROVIDER_URL_ENV: &str = "PROSOPO_PROVIDER_URL_DEVELOPMENT";

/// Replaces the hosted provider list in every environment; see `get_provider_list_override`.
pub const PROVIDER_LIST_ENV: &str = "PROSOPO_PROVIDER_LIST";

pub fn read_development_provider_url_override() -> Option<String> {
    std::env::var(DEVELOPMENT_PROVIDER_URL_ENV).ok()
}

pub fn read_provider_list_override() -> Option<String> {
    std::env::var(PROVIDER_LIST_ENV).ok()
}

pub(crate) fn strip_trailing_slash(url: &str) -> &str {
    url.strip_suffix('/').unwrap_or(url)
}

/// `getDevelopmentProviderUrl(override)`.
pub fn get_development_provider_url(override_url: Option<&str>) -> String {
    match override_url.map(js_trim).filter(|url| !url.is_empty()) {
        Some(url) => strip_trailing_slash(url).to_string(),
        None => DEFAULT_DEVELOPMENT_PROVIDER_URL.to_string(),
    }
}
