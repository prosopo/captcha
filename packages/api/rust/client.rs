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

//! api/apiClient.ts and ProviderApi.ts, server side: the calls one provider makes to
//! another, and the one the CLI makes to register a site key. The widget's calls stay TS.

use crate::http::{ApiError, ClientOptions, Headers, HttpClient, RequestOptions};
use prosopo_types::api_types::RegisterSitekeyBody;
use prosopo_types::client::Tier;
use prosopo_types::provider_api::{AdminApiPaths, ClientApiPaths};
use prosopo_types::settings_types::UserSettings;
use serde_json::Value;

/// Set on a forwarded verify request so the provider receiving it does not forward it again.
/// Lowercase, as Express normalises header names.
pub const VERIFY_FORWARDED_HEADER: &str = "prosopo-verify-forwarded";

/// `ApiClient`: an `HttpClient` for one account, with `https://` assumed when the url does not
/// start with `http`.
#[derive(Clone)]
pub struct ApiClient {
    http: HttpClient,
    account: String,
}

impl ApiClient {
    pub fn new(base_url: &str, account: &str, options: ClientOptions) -> ApiClient {
        let base_url: String = if base_url.starts_with("http") {
            base_url.to_string()
        } else {
            format!("https://{base_url}")
        };
        ApiClient {
            http: HttpClient::new(&base_url, "", options),
            account: account.to_string(),
        }
    }

    pub fn http(&self) -> &HttpClient {
        &self.http
    }

    pub fn account(&self) -> &str {
        &self.account
    }
}

fn header(name: &str, value: &str) -> (String, String) {
    (name.to_string(), value.to_string())
}

/// `ProviderApi`, for the calls the provider and the CLI make. `account` is the site key.
#[derive(Clone)]
pub struct ProviderApi {
    client: ApiClient,
}

impl ProviderApi {
    pub fn new(base_url: &str, account: &str, options: ClientOptions) -> ProviderApi {
        ProviderApi {
            client: ApiClient::new(base_url, account, options),
        }
    }

    pub fn client(&self) -> &ApiClient {
        &self.client
    }

    /// `forwardVerify(path, body, user)`: a verify request passed on verbatim to the provider
    /// that issued the token, and its response, unchecked, as the caller relays it.
    pub async fn forward_verify(
        &self,
        path: ClientApiPaths,
        body: &Value,
        user: &str,
    ) -> Result<Value, ApiError> {
        let headers: Headers = vec![
            header("Prosopo-Site-Key", &self.client.account),
            header("Prosopo-User", user),
            header(VERIFY_FORWARDED_HEADER, "true"),
        ];
        self.client
            .http
            .post(
                path.as_str(),
                Some(body),
                RequestOptions {
                    method: None,
                    headers: Some(headers),
                },
            )
            .await
    }

    /// `registerSiteKey(siteKey, tier, settings, jwt)`, an admin call authorised by `jwt`.
    pub async fn register_site_key(
        &self,
        site_key: &str,
        tier: Tier,
        settings: &UserSettings,
        jwt: &str,
    ) -> Result<Value, ApiError> {
        let body: RegisterSitekeyBody = RegisterSitekeyBody {
            site_key: site_key.to_string(),
            tier,
            settings: Some(settings.clone()),
        };
        let headers: Headers = vec![
            header("Prosopo-Site-Key", &self.client.account),
            header("Authorization", &format!("Bearer {jwt}")),
        ];
        self.client
            .http
            .post(
                AdminApiPaths::SiteKeyRegister.as_str(),
                Some(&body),
                RequestOptions {
                    method: None,
                    headers: Some(headers),
                },
            )
            .await
    }
}
