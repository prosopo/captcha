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

//! `ProsopoServer` (src/server.ts): verifies a procaptcha token with the provider that
//! issued it.

use prosopo_api::{ApiError, ClientOptions, ProviderApi, Transport, VerifyRequest};
use prosopo_api_route::schema::string_to_number;
use prosopo_common::{
    ContextValue, ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError,
};
use prosopo_keyring::KeyringPair;
use prosopo_load_balancer::{
    Clock, HardcodedProvider, IpMode, LoadBalancerError, ProviderDirectory,
};
use prosopo_locale::I18nLookup;
use prosopo_logger::{get_logger, parse_log_level, LogLevel, LogRecord, Logger};
use prosopo_types::config::{CaptchaTimeoutConfig, ProsopoServerConfig};
use prosopo_types::token::{decode_procaptcha_output, ProcaptchaOutput, TokenDecodeError};
use prosopo_types::{CaptchaType, JsNumber};
use prosopo_util::u8a_to_hex;
use prosopo_util_crypto::js::js_number_to_string;
use prosopo_util_crypto::jwt::now_millis;
use prosopo_util_crypto::U8aLike;
use serde_json::{json, Value};
use std::fmt;
use std::sync::Arc;

/// Tolerance for honest clock drift between the issuing provider and this verifier.
pub const MAX_CLOCK_SKEW_MS: f64 = 30_000.0;

/// `detectIpMode`: which section of the provider list a token's provider url was taken
/// from, by the exact `ipv4.` or `ipv6.` label its hostname starts with.
pub fn detect_ip_mode(provider_url: Option<&str>) -> Option<IpMode> {
    let parsed: url::Url = url::Url::parse(provider_url.filter(|url| !url.is_empty())?).ok()?;
    let hostname: &str = parsed.host_str().unwrap_or("");
    if hostname.starts_with("ipv4.") {
        Some(IpMode::Ipv4)
    } else if hostname.starts_with("ipv6.") {
        Some(IpMode::Ipv6)
    } else {
        None
    }
}

/// `isRecent`, as a function of the time: a token is recent when it is younger than the
/// timeout and not stamped more than the clock skew into the future. A zero or `NaN`
/// timestamp never is.
pub fn is_recent(now_ms: f64, timestamp: f64, timeout_ms: f64) -> Recency {
    if timestamp == 0.0 || timestamp.is_nan() {
        return Recency::Missing;
    }
    let age: f64 = now_ms - timestamp;
    if age < -MAX_CLOCK_SKEW_MS {
        Recency::Future
    } else if age < timeout_ms {
        Recency::Recent
    } else {
        Recency::Expired
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Recency {
    Recent,
    Missing,
    Future,
    Expired,
}

/// Why `verify_provider` failed. `is_verified` turns each into an API error.
#[derive(Debug)]
pub enum VerifyError {
    Token(TokenDecodeError),
    ProviderList(LoadBalancerError),
    /// No pair, or one that cannot sign (the TS `CAPTCHA.INVALID_TIMESTAMP`, or the
    /// keyring's locked-pair error).
    Signer(String),
    Provider(ApiError),
}

impl fmt::Display for VerifyError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            VerifyError::Token(error) => error.fmt(f),
            VerifyError::ProviderList(error) => error.fmt(f),
            VerifyError::Signer(message) => f.write_str(message),
            VerifyError::Provider(error) => error.fmt(f),
        }
    }
}

impl std::error::Error for VerifyError {}

impl VerifyError {
    /// The code `isVerified` reports: the provider's HTTP status, 504 for a timeout, or 500.
    pub fn code(&self) -> u16 {
        match self {
            VerifyError::Provider(ApiError::Http(error)) => error.status,
            VerifyError::Provider(ApiError::TimedOut)
            | VerifyError::ProviderList(LoadBalancerError::TimedOut) => 504,
            _ => 500,
        }
    }
}

/// What `verifyProvider` is given.
#[derive(Debug, Clone, Copy)]
pub struct ProviderVerification<'a> {
    pub token: &'a str,
    pub timeouts: &'a CaptchaTimeoutConfig,
    pub provider_url: &'a str,
    pub timestamp: f64,
    pub user: &'a str,
    pub challenge: Option<&'a str>,
    pub ip: Option<&'a str>,
    pub email: Option<&'a str>,
    pub captcha_type: Option<CaptchaType>,
    /// The session id the widget was rendered with. When given, the provider only verifies
    /// the token if the solve carries the same value.
    pub client_session_id: Option<&'a str>,
}

enum Endpoint {
    Pow,
    Puzzle,
    IconOrder,
    Audio,
    Authenticated,
    Image,
}

pub type SharedI18n = Arc<dyn I18nLookup + Send + Sync>;

/// `ProsopoServer`. Responses are the provider's JSON as it sent it, or the
/// `{ verified: false, status }` the server answers with itself.
pub struct ProsopoServer {
    config: ProsopoServerConfig,
    pair: Option<KeyringPair>,
    logger: Logger,
    providers: Arc<ProviderDirectory>,
    transport: Option<Arc<dyn Transport>>,
    now_ms: Clock,
    i18n: Option<SharedI18n>,
}

impl ProsopoServer {
    pub fn new(config: ProsopoServerConfig, pair: Option<KeyringPair>) -> ProsopoServer {
        let logger: Logger = get_logger(
            parse_log_level(Some(&config.log_level), LogLevel::Info),
            "@prosopo/server",
        );
        ProsopoServer {
            config,
            pair,
            logger,
            providers: Arc::new(ProviderDirectory::default()),
            transport: None,
            now_ms: Arc::new(now_millis),
            i18n: None,
        }
    }

    pub fn with_provider_directory(mut self, providers: Arc<ProviderDirectory>) -> ProsopoServer {
        self.providers = providers;
        self
    }

    pub fn with_transport(mut self, transport: Arc<dyn Transport>) -> ProsopoServer {
        self.transport = Some(transport);
        self
    }

    pub fn with_clock(mut self, now_ms: Clock) -> ProsopoServer {
        self.now_ms = now_ms;
        self
    }

    /// The statuses the server answers with itself are translation keys until it is given
    /// translations, as an uninitialised i18next leaves them.
    pub fn with_i18n(mut self, i18n: SharedI18n) -> ProsopoServer {
        self.i18n = Some(i18n);
        self
    }

    pub fn config(&self) -> &ProsopoServerConfig {
        &self.config
    }

    pub fn pair(&self) -> Option<&KeyringPair> {
        self.pair.as_ref()
    }

    pub fn dapp_account(&self) -> Option<&str> {
        self.config.account.address.as_deref()
    }

    /// `translate`.
    pub fn translate(&self, key: &str) -> String {
        match &self.i18n {
            Some(i18n) => i18n.t(key),
            None => key.to_string(),
        }
    }

    pub fn get_provider_api(&self, provider_url: &str) -> ProviderApi {
        ProviderApi::new(
            provider_url,
            self.dapp_account().unwrap_or(""),
            ClientOptions {
                timeout_ms: Some(self.config.provider_request_timeout_ms.get() as u64),
                default_headers: Vec::new(),
                transport: self.transport.clone(),
            },
        )
    }

    fn not_verified(&self, key: &str) -> Value {
        json!({ "verified": false, "status": self.translate(key) })
    }

    fn check_recent(&self, timestamp: f64, timeout_ms: JsNumber, label: &str) -> bool {
        let timeout_ms: f64 = timeout_ms.get();
        let data = || json!({ "timestamp": timestamp, "timeoutMs": timeout_ms });
        match is_recent((self.now_ms)(), timestamp, timeout_ms) {
            Recency::Recent => true,
            Recency::Missing => false,
            Recency::Future => {
                self.logger.error(|| {
                    LogRecord::msg(format!("{label} captcha timestamp is in the future"))
                        .with_data(data())
                });
                false
            }
            Recency::Expired => {
                self.logger.error(|| {
                    LogRecord::msg(format!("{label} captcha is not recent")).with_data(data())
                });
                false
            }
        }
    }

    fn sign_timestamp(&self, timestamp: f64) -> Result<String, VerifyError> {
        let pair: &KeyringPair = self
            .pair
            .as_ref()
            .ok_or_else(|| VerifyError::Signer("CAPTCHA.INVALID_TIMESTAMP".to_string()))?;
        let message: String = js_number_to_string(timestamp);
        pair.sign(U8aLike::Str(&message), false)
            .map(|signature: Vec<u8>| u8a_to_hex(&signature))
            .map_err(|error| VerifyError::Signer(error.to_string()))
    }

    /// `verifyProvider`: verifies a token with the provider at `provider_url`, at the
    /// endpoint for the token's captcha type. A token without one (minted before the field
    /// existed) goes to the pow endpoint when it has a challenge and the image one when not;
    /// frictionless tokens take the same route.
    pub async fn verify_provider(
        &self,
        verification: &ProviderVerification<'_>,
    ) -> Result<Value, VerifyError> {
        self.logger.info(|| {
            LogRecord::msg("Verifying with provider").with_data(json!({
                "providerUrl": verification.provider_url,
                "captchaType": verification.captcha_type.map_or("legacy", CaptchaType::as_str),
            }))
        });
        let signature: String = self.sign_timestamp(verification.timestamp)?;
        let timeouts: &CaptchaTimeoutConfig = &self.config.timeouts;
        let (endpoint, timeout, label): (Endpoint, JsNumber, &str) = match verification.captcha_type
        {
            Some(CaptchaType::IconOrder) => (
                Endpoint::IconOrder,
                timeouts.icon_order.cached_timeout,
                "IconOrder",
            ),
            Some(CaptchaType::Puzzle) => {
                (Endpoint::Puzzle, timeouts.puzzle.cached_timeout, "Puzzle")
            }
            Some(CaptchaType::Audio) => (Endpoint::Audio, timeouts.audio.cached_timeout, "Audio"),
            Some(CaptchaType::Pow) => (Endpoint::Pow, timeouts.pow.cached_timeout, "PoW"),
            Some(CaptchaType::Authenticated) => (
                Endpoint::Authenticated,
                timeouts.pow.cached_timeout,
                "Authenticated",
            ),
            Some(CaptchaType::Image) => (Endpoint::Image, timeouts.image.cached_timeout, "Image"),
            None | Some(CaptchaType::Frictionless) => {
                self.logger.warn(|| {
                        LogRecord::msg(
                            "Verifying legacy token without captchaType field; using challenge heuristic",
                        )
                        .with_data(json!({ "challenge": verification.challenge.is_some_and(|c| !c.is_empty()) }))
                    });
                if verification.challenge.is_some_and(|c| !c.is_empty()) {
                    (Endpoint::Pow, timeouts.pow.cached_timeout, "PoW")
                } else {
                    (Endpoint::Image, timeouts.image.cached_timeout, "Image")
                }
            }
        };
        if !self.check_recent(verification.timestamp, timeout, label) {
            return Ok(self.not_verified("API.USER_NOT_VERIFIED_TIME_EXPIRED"));
        }
        let request: VerifyRequest = VerifyRequest {
            token: verification.token,
            dapp_signature: &signature,
            user: verification.user,
            ip: verification.ip,
            email: verification.email,
            client_session_id: verification.client_session_id,
        };
        let api: ProviderApi = self.get_provider_api(verification.provider_url);
        let response: Result<Value, ApiError> = match endpoint {
            Endpoint::Pow => api.submit_pow_captcha_verify(&request).await,
            Endpoint::Puzzle => api.submit_puzzle_captcha_verify(&request).await,
            Endpoint::IconOrder => api.submit_icon_order_captcha_verify(&request).await,
            Endpoint::Audio => api.submit_audio_captcha_verify(&request).await,
            Endpoint::Authenticated => api.submit_authenticated_captcha_verify(&request).await,
            Endpoint::Image => {
                api.verify_dapp_user(&request, Some(verification.timeouts.image.cached_timeout))
                    .await
            }
        };
        response.map_err(VerifyError::Provider)
    }

    async fn find_provider(
        &self,
        provider_url: Option<&str>,
    ) -> Result<Option<HardcodedProvider>, VerifyError> {
        self.providers
            .find_provider(
                self.config.default_environment,
                provider_url,
                detect_ip_mode(provider_url),
            )
            .await
            .map_err(VerifyError::ProviderList)
    }

    async fn verify(
        &self,
        token: &str,
        ip: Option<&str>,
        email: Option<&str>,
        client_session_id: Option<&str>,
    ) -> Result<Value, VerifyError> {
        let output: ProcaptchaOutput =
            decode_procaptcha_output(token).map_err(VerifyError::Token)?;
        let provider_url: Option<&str> = output.provider_url.as_deref();
        let Some(provider) = self.find_provider(provider_url).await? else {
            self.logger.error(|| {
                LogRecord::msg("Provider not found")
                    .with_data(json!({ "providerUrl": provider_url }))
            });
            return Ok(self.not_verified("API.USER_NOT_VERIFIED"));
        };
        let response: Value = self
            .verify_provider(&ProviderVerification {
                token,
                timeouts: &self.config.timeouts,
                provider_url: &provider.url,
                timestamp: string_to_number(&output.timestamp),
                user: &output.user,
                challenge: output.challenge.as_deref(),
                ip,
                email,
                captcha_type: output.captcha_type,
                client_session_id,
            })
            .await?;
        self.logger.info(|| {
            LogRecord::msg("").with_data(json!({
                "verificationResponse": response,
                "providerUrl": provider_url,
                "user": output.user,
                "challenge": output.challenge,
                "captchaType": output.captcha_type.map_or("legacy", CaptchaType::as_str),
                "siteKey": self.pair.as_ref().and_then(|pair| pair.address().ok()),
            }))
        });
        Ok(response)
    }

    /// `isVerified`: any failure becomes an `API.BAD_REQUEST` error carrying the token and
    /// the code from [`VerifyError::code`].
    pub async fn is_verified(
        &self,
        token: &str,
        ip: Option<&str>,
        email: Option<&str>,
        client_session_id: Option<&str>,
    ) -> Result<Value, ProsopoError> {
        self.verify(token, ip, email, client_session_id)
            .await
            .map_err(|error: VerifyError| {
                self.logger.error(|| {
                    LogRecord::msg(error.to_string()).with_data(json!({ "token": token }))
                });
                let mut context: ErrorContext = ErrorContext::new();
                context.set("code", ContextValue::Json(Value::from(error.code())));
                context.set("token", ContextValue::Json(Value::from(token)));
                ProsopoError::new(
                    ErrorClass::Api,
                    ErrorSource::key("API.BAD_REQUEST"),
                    ErrorOptions {
                        context: Some(context),
                        logger: Some(&self.logger),
                        ..ErrorOptions::default()
                    },
                )
            })
    }
}

/// `PublicProsopoServer`: a server whose pair is the site key's address alone.
pub fn public_prosopo_server(
    config: ProsopoServerConfig,
) -> prosopo_keyring::Result<ProsopoServer> {
    let pair: KeyringPair = prosopo_keyring::get_pair(
        None,
        config.account.address.as_deref().map(U8aLike::Str),
        None,
        None,
    )?;
    Ok(ProsopoServer::new(config, Some(pair)))
}
