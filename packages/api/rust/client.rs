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
//! another, the one the CLI makes to register a site key, and the server SDK's verify calls.
//! The widget's calls stay TS.

use crate::http::{ApiError, ClientOptions, Headers, HttpClient, RequestOptions};
use prosopo_types::api_types::RegisterSitekeyBody;
use prosopo_types::client::Tier;
use prosopo_types::provider_api::{AdminApiPaths, ClientApiPaths};
use prosopo_types::settings_types::UserSettings;
use prosopo_types::JsNumber;
use serde::Serialize;
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

/// What a site owner's server sends to verify a token: the TS body, whose `ip` is dropped
/// when undefined and whose other optional fields are dropped when falsy.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct VerifyRequest<'a> {
    pub token: &'a str,
    pub dapp_signature: &'a str,
    pub user: &'a str,
    pub ip: Option<&'a str>,
    pub email: Option<&'a str>,
    pub client_session_id: Option<&'a str>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VerifyBody<'a> {
    token: &'a str,
    dapp_signature: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    ip: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_verified_time: Option<JsNumber>,
    #[serde(skip_serializing_if = "Option::is_none")]
    email: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    client_session_id: Option<&'a str>,
}

impl<'a> VerifyBody<'a> {
    fn new(request: &VerifyRequest<'a>, max_verified_time: Option<JsNumber>) -> VerifyBody<'a> {
        VerifyBody {
            token: request.token,
            dapp_signature: request.dapp_signature,
            ip: request.ip,
            max_verified_time: max_verified_time
                .filter(|time: &JsNumber| time.get() != 0.0 && !time.get().is_nan()),
            email: request.email.filter(|email: &&str| !email.is_empty()),
            client_session_id: request.client_session_id.filter(|id: &&str| !id.is_empty()),
        }
    }
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

    /// `registerSiteKey` with the settings as the caller built them, sent as they are: the CLI's
    /// `site_key_register_api` passes a partial settings object, which the provider completes.
    pub async fn register_site_key_settings(
        &self,
        site_key: &str,
        tier: Tier,
        settings: &Value,
        jwt: &str,
    ) -> Result<Value, ApiError> {
        let body: Value = serde_json::json!({ "siteKey": site_key, "tier": tier.as_str(), "settings": settings });
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

    async fn post_verify(
        &self,
        path: ClientApiPaths,
        body: &VerifyBody<'_>,
        user: &str,
    ) -> Result<Value, ApiError> {
        let headers: Headers = vec![
            header("Prosopo-Site-Key", &self.client.account),
            header("Prosopo-User", user),
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

    /// `verifyDappUser`: verifies an image captcha token.
    pub async fn verify_dapp_user(
        &self,
        request: &VerifyRequest<'_>,
        max_verified_time: Option<JsNumber>,
    ) -> Result<Value, ApiError> {
        self.post_verify(
            ClientApiPaths::VerifyImageCaptchaSolutionDapp,
            &VerifyBody::new(request, max_verified_time),
            request.user,
        )
        .await
    }

    /// `submitPowCaptchaVerify`.
    pub async fn submit_pow_captcha_verify(
        &self,
        request: &VerifyRequest<'_>,
    ) -> Result<Value, ApiError> {
        self.submit_verify(ClientApiPaths::VerifyPowCaptchaSolution, request)
            .await
    }

    /// `submitPuzzleCaptchaVerify`.
    pub async fn submit_puzzle_captcha_verify(
        &self,
        request: &VerifyRequest<'_>,
    ) -> Result<Value, ApiError> {
        self.submit_verify(ClientApiPaths::VerifyPuzzleCaptchaSolution, request)
            .await
    }

    /// `submitIconOrderCaptchaVerify`.
    pub async fn submit_icon_order_captcha_verify(
        &self,
        request: &VerifyRequest<'_>,
    ) -> Result<Value, ApiError> {
        self.submit_verify(ClientApiPaths::VerifyIconOrderCaptchaSolution, request)
            .await
    }

    /// `submitAudioCaptchaVerify`.
    pub async fn submit_audio_captcha_verify(
        &self,
        request: &VerifyRequest<'_>,
    ) -> Result<Value, ApiError> {
        self.submit_verify(ClientApiPaths::VerifyAudioCaptchaSolution, request)
            .await
    }

    /// `submitAuthenticatedCaptchaVerify`: verifies a Web Bot Auth session token.
    pub async fn submit_authenticated_captcha_verify(
        &self,
        request: &VerifyRequest<'_>,
    ) -> Result<Value, ApiError> {
        self.submit_verify(ClientApiPaths::VerifyAuthenticatedSession, request)
            .await
    }

    async fn submit_verify(
        &self,
        path: ClientApiPaths,
        request: &VerifyRequest<'_>,
    ) -> Result<Value, ApiError> {
        self.post_verify(path, &VerifyBody::new(request, None), request.user)
            .await
    }
}
