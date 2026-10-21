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

//! The typed request and response bodies of provider/api.ts. Request bodies are validated by
//! their schema (`Validate`) and then deserialised, so their fields are in schema order and
//! serialise back to the parse output. Responses have no TS schema; their JSON key order is
//! best-effort (§0).

use crate::captcha_type::CaptchaType;
use crate::client::{BlockRuleType, ModeEnum, Tier};
use crate::datasets::InputMethod;
use crate::decision_machine::{
    DecisionMachineKind, DecisionMachineLanguage, DecisionMachineRuntime, DecisionMachineScope,
};
use crate::number::JsNumber;
use crate::provider_api;
use crate::settings_types::UserSettings;
use indexmap::IndexMap;
use prosopo_api_route::schema::Schema;
use prosopo_api_route::{Validate, ValidationError};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::LazyLock;

/// A validation error has always sent its (bounded) issue list as `message`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ApiErrorMessage {
    Text(String),
    Issues(Vec<Value>),
}

/// `ApiJsonError`: the `error` of an API response body, with its keys in the order
/// `unwrapError` builds them.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ApiJsonError {
    pub code: u16,
    /// In the request's language.
    pub message: ApiErrorMessage,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
    /// `key`'s English text, only sent when the widget has no text of its own for `key`.
    #[serde(rename = "messageEn", default, skip_serializing_if = "Option::is_none")]
    pub message_en: Option<String>,
}

macro_rules! validated_by {
    ($type:ty, $schema:path) => {
        impl Validate for $type {
            fn validate(input: Option<&Value>) -> Result<Value, ValidationError> {
                static SCHEMA: LazyLock<Schema> = LazyLock::new($schema);
                SCHEMA.validate(input)
            }
        }
    };
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RedisActorStatus {
    pub actor: String,
    pub is_ready: bool,
    pub awaiting_time_seconds: JsNumber,
}

/// `ProviderDetails`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProviderDetails {
    pub version: String,
    pub message: String,
    /// The node that answered. Older nodes in a mixed-version fleet omit it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub host: Option<String>,
    pub redis: Vec<RedisActorStatus>,
}
validated_by!(ProviderDetails, provider_api::provider_details_schema);

/// A dataset id: a hash string, or the hash as a byte array.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum DatasetId {
    Text(String),
    Bytes(Vec<JsNumber>),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptchaRequestBody {
    pub user: String,
    pub dapp: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dataset_id: Option<DatasetId>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub simd_readings: Option<String>,
}
validated_by!(CaptchaRequestBody, provider_api::captcha_request_body);

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientMetaData {
    /// The honeypot answer.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hp: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_session_id: Option<String>,
}
validated_by!(ClientMetaData, provider_api::client_meta_data_schema);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptchaSolution {
    pub captcha_id: String,
    pub captcha_content_id: String,
    pub solution: Vec<String>,
    pub salt: String,
    /// One per coordinate pair in `salt`; older widgets omit it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_methods: Option<Vec<InputMethod>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TimestampSignature {
    pub timestamp: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestHashSignature {
    pub request_hash: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChallengeSignature {
    pub challenge: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CaptchaSolutionSignature {
    pub user: TimestampSignature,
    pub provider: RequestHashSignature,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptchaSolutionBody {
    pub user: String,
    pub dapp: String,
    pub captchas: Vec<CaptchaSolution>,
    pub request_hash: String,
    pub timestamp: String,
    pub signature: CaptchaSolutionSignature,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub behavioral_data: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub simd_readings: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_meta_data: Option<ClientMetaData>,
}
validated_by!(CaptchaSolutionBody, provider_api::captcha_solution_body);

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifySolutionBody {
    pub token: String,
    pub dapp_signature: String,
    pub max_verified_time: JsNumber,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ip: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    /// When given, the token is rejected unless the solved captcha carries the same value.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_session_id: Option<String>,
}
validated_by!(VerifySolutionBody, provider_api::verify_solution_body);

/// `ServerPowCaptchaVerifyRequestBody`, also the puzzle and icon-order verify bodies.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerCaptchaVerifyRequestBody {
    pub token: String,
    pub dapp_signature: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ip: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_session_id: Option<String>,
}
validated_by!(
    ServerCaptchaVerifyRequestBody,
    provider_api::server_captcha_verify_request_body
);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DnsEventKind {
    Dns,
    Http,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DnsEvent {
    pub kind: DnsEventKind,
    /// ISO-8601 UTC.
    pub ts: String,
    pub src_ip: String,
    /// The procaptcha session id carried in the URL subdomain, named `jti` on the wire.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub jti: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub site_key: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub subzone: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qname: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qtype: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sni: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_agent: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path_valid: Option<bool>,
}
validated_by!(DnsEvent, provider_api::dns_event_schema);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DnsEventBatch {
    pub events: Vec<DnsEvent>,
}
validated_by!(DnsEventBatch, provider_api::dns_event_batch_schema);

/// The ingest route accepts any events and validates them one by one.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DnsEventIngestBatch {
    pub events: Vec<Value>,
}
validated_by!(
    DnsEventIngestBatch,
    provider_api::dns_event_ingest_batch_schema
);

/// `GetPowCaptchaChallengeRequestBody`; the puzzle, audio and icon-order challenge bodies
/// share it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetChallengeRequestBody {
    pub user: String,
    pub dapp: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub simd_readings: Option<String>,
}
validated_by!(
    GetChallengeRequestBody,
    provider_api::get_challenge_request_body
);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SolutionSignature {
    pub user: TimestampSignature,
    pub provider: ChallengeSignature,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitPowCaptchaSolutionBody {
    pub challenge: String,
    pub difficulty: JsNumber,
    pub signature: SolutionSignature,
    pub user: String,
    pub dapp: String,
    pub nonce: JsNumber,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub behavioral_data: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub salt: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub simd_readings: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_meta_data: Option<ClientMetaData>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fingerprint_proof: Option<String>,
}
validated_by!(
    SubmitPowCaptchaSolutionBody,
    provider_api::submit_pow_captcha_solution_body
);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetFrictionlessCaptchaChallengeRequestBody {
    pub dapp: String,
    /// Empty when the client had no detector to run, which is served an image captcha.
    pub token: String,
    pub user: String,
    pub head_hash: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mode: Option<ModeEnum>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub simd_readings: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub detector_session_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub current_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub iframe_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_session_id: Option<String>,
    /// The session whose challenge the user asked to replace.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub refresh_of: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub switch_to_image: Option<bool>,
}
validated_by!(
    GetFrictionlessCaptchaChallengeRequestBody,
    provider_api::get_frictionless_captcha_challenge_request_body
);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AssignDetectorBundleRequestBody {
    pub dapp: String,
}
validated_by!(
    AssignDetectorBundleRequestBody,
    provider_api::assign_detector_bundle_request_body
);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectorBundle {
    pub js: String,
    pub private_key: String,
    pub inner_config: String,
    /// The release the bundle was built from; absent on pools predating the stamp.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub release: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub payload_layout: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key_map: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReplaceDetectorPoolBody {
    /// By bundle id, in JS key order.
    pub bundles: IndexMap<String, DetectorBundle>,
}
validated_by!(
    ReplaceDetectorPoolBody,
    provider_api::replace_detector_pool_body
);

/// `PuzzleEvent`, also `IconOrderEvent`.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct PuzzleEvent {
    pub x: JsNumber,
    pub y: JsNumber,
    pub t: JsNumber,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitPuzzleCaptchaSolutionBody {
    pub challenge: String,
    pub final_x: JsNumber,
    pub final_y: JsNumber,
    pub puzzle_events: Vec<PuzzleEvent>,
    pub signature: SolutionSignature,
    pub user: String,
    pub dapp: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub behavioral_data: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub salt: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub simd_readings: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_meta_data: Option<ClientMetaData>,
}
validated_by!(
    SubmitPuzzleCaptchaSolutionBody,
    provider_api::submit_puzzle_captcha_solution_body
);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AudioEventKind {
    Play,
    Pause,
    Replay,
    Key,
}

/// `t` is milliseconds since the challenge was issued.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct AudioEvent {
    pub kind: AudioEventKind,
    pub t: JsNumber,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitAudioCaptchaSolutionBody {
    pub challenge: String,
    pub answer: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub replays: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_events: Option<Vec<AudioEvent>>,
    pub signature: SolutionSignature,
    pub user: String,
    pub dapp: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub behavioral_data: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub salt: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub simd_readings: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_meta_data: Option<ClientMetaData>,
}
validated_by!(
    SubmitAudioCaptchaSolutionBody,
    provider_api::submit_audio_captcha_solution_body
);

/// One click in background pixels; its index in `clicks` is its order.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct IconClick {
    pub x: JsNumber,
    pub y: JsNumber,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitIconOrderCaptchaSolutionBody {
    pub challenge: String,
    pub clicks: Vec<IconClick>,
    pub icon_order_events: Vec<PuzzleEvent>,
    pub signature: SolutionSignature,
    pub user: String,
    pub dapp: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub behavioral_data: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub salt: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub simd_readings: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_meta_data: Option<ClientMetaData>,
}
validated_by!(
    SubmitIconOrderCaptchaSolutionBody,
    provider_api::submit_icon_order_captcha_solution_body
);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifyPowCaptchaSolutionBody {
    pub site_key: String,
}
validated_by!(
    VerifyPowCaptchaSolutionBody,
    provider_api::verify_pow_captcha_solution_body
);

/// `RegisterSitekeyBody`; `RegisterSitekeysBody` is a list of them.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterSitekeyBody {
    pub site_key: String,
    pub tier: Tier,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub settings: Option<UserSettings>,
}
validated_by!(RegisterSitekeyBody, provider_api::register_sitekey_body);

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct RegisterSitekeysBody(pub Vec<RegisterSitekeyBody>);
validated_by!(RegisterSitekeysBody, provider_api::register_sitekeys_body);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveSitekeyBody {
    pub site_key: String,
}
validated_by!(RemoveSitekeyBody, provider_api::remove_sitekey_body);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct RemoveSitekeysBody(pub Vec<RemoveSitekeyBody>);
validated_by!(RemoveSitekeysBody, provider_api::remove_sitekeys_body);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDecisionMachineBody {
    pub decision_machine_scope: DecisionMachineScope,
    pub decision_machine_runtime: DecisionMachineRuntime,
    pub decision_machine_source: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decision_machine_language: Option<DecisionMachineLanguage>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decision_machine_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decision_machine_version: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decision_machine_captcha_type: Option<CaptchaType>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decision_machine_kind: Option<DecisionMachineKind>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dapp: Option<String>,
}
validated_by!(
    UpdateDecisionMachineBody,
    provider_api::update_decision_machine_body
);

/// `GetDecisionMachineBody`, also `RemoveDecisionMachineBody`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DecisionMachineIdBody {
    pub id: String,
}
validated_by!(
    DecisionMachineIdBody,
    provider_api::decision_machine_id_body
);

/// `GetAllDecisionMachinesBody`, also `RemoveAllDecisionMachinesBody`.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct EmptyBody {}
validated_by!(EmptyBody, provider_api::empty_body);

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct ClearAllCountersBody {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dapp: Option<String>,
}
validated_by!(ClearAllCountersBody, provider_api::clear_all_counters_body);

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClearAllCountersResponse {
    pub success: bool,
    pub deleted_count: JsNumber,
    pub scope: String,
}
validated_by!(
    ClearAllCountersResponse,
    provider_api::clear_all_counters_response
);

/// A present `null` is `Some(None)`, so a `nullish` field keeps `null` apart from absent.
fn nullable<'de, D, T>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: Deserialize<'de>,
{
    Option::<T>::deserialize(deserializer).map(Some)
}

/// `DecisionMachineSummary`. The `nullish` fields keep a stored `null` apart from an absent
/// field, as the stored document does.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DecisionMachineSummary {
    #[serde(rename = "_id")]
    pub id: String,
    pub scope: DecisionMachineScope,
    #[serde(
        default,
        deserialize_with = "nullable",
        skip_serializing_if = "Option::is_none"
    )]
    pub dapp_account: Option<Option<String>>,
    #[serde(
        default,
        deserialize_with = "nullable",
        skip_serializing_if = "Option::is_none"
    )]
    pub kind: Option<Option<DecisionMachineKind>>,
    pub runtime: DecisionMachineRuntime,
    #[serde(
        default,
        deserialize_with = "nullable",
        skip_serializing_if = "Option::is_none"
    )]
    pub language: Option<Option<DecisionMachineLanguage>>,
    #[serde(
        default,
        deserialize_with = "nullable",
        skip_serializing_if = "Option::is_none"
    )]
    pub name: Option<Option<String>>,
    #[serde(
        default,
        deserialize_with = "nullable",
        skip_serializing_if = "Option::is_none"
    )]
    pub version: Option<Option<String>>,
    #[serde(
        default,
        deserialize_with = "nullable",
        skip_serializing_if = "Option::is_none"
    )]
    pub captcha_type: Option<Option<CaptchaType>>,
    pub created_at: String,
    pub updated_at: String,
}
validated_by!(
    DecisionMachineSummary,
    provider_api::decision_machine_summary_schema
);

/// `GetDecisionMachineResponse`; `GetAllDecisionMachinesResponse` is a list of them.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GetDecisionMachineResponse {
    #[serde(flatten)]
    pub summary: DecisionMachineSummary,
    pub source: String,
}
validated_by!(
    GetDecisionMachineResponse,
    provider_api::get_decision_machine_response
);

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveDecisionMachineResponse {
    pub success: bool,
    pub deleted_id: String,
}
validated_by!(
    RemoveDecisionMachineResponse,
    provider_api::remove_decision_machine_response
);

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveAllDecisionMachinesResponse {
    pub success: bool,
    pub deleted_count: JsNumber,
}
validated_by!(
    RemoveAllDecisionMachinesResponse,
    provider_api::remove_all_decision_machines_response
);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToggleMaintenanceModeBody {
    pub enabled: bool,
    /// Scopes the toggle to these site keys; absent means the node-wide flag.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub site_keys: Option<Vec<String>>,
}
validated_by!(
    ToggleMaintenanceModeBody,
    provider_api::toggle_maintenance_mode_body
);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetSessionBody {
    pub session_id: String,
}
validated_by!(GetSessionBody, provider_api::get_session_body);

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CaptchaCount {
    pub count: JsNumber,
}

/// `ProsopoCaptchaCountConfigSchemaOutput`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CaptchaCountConfig {
    pub solved: CaptchaCount,
    pub unsolved: CaptchaCount,
}
validated_by!(
    CaptchaCountConfig,
    provider_api::prosopo_captcha_count_config_schema
);

/// `BlockRule`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlockRule {
    pub global: bool,
    pub hard_block: bool,
    #[serde(rename = "type")]
    pub rule_type: BlockRuleType,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dapp_account: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub captcha_config: Option<CaptchaCountConfig>,
}
validated_by!(BlockRule, provider_api::block_rule_spec);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DappDomainRequestBody {
    pub dapp: String,
}
validated_by!(
    DappDomainRequestBody,
    provider_api::dapp_domain_request_body
);

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RateLimit {
    pub window_ms: JsNumber,
    pub limit: JsNumber,
}

/// `ApiPathRateLimits` output: every path's limit, by path.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct ApiPathRateLimits(pub IndexMap<String, RateLimit>);
validated_by!(ApiPathRateLimits, provider_api::api_path_rate_limits_schema);

/// `ApiResponse`: every response's `status`, and its `error` when it failed.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ApiResponse {
    pub status: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<ApiJsonError>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerificationResponse {
    #[serde(flatten)]
    pub response: ApiResponse,
    pub verified: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub score: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    /// For log correlation only.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
}

/// `Hash`: a hex string or the bytes.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Hash {
    Text(String),
    Bytes(Vec<JsNumber>),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageVerificationResponse {
    #[serde(flatten)]
    pub verification: VerificationResponse,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub commitment_id: Option<Hash>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProviderChallengeSignature {
    pub provider: ChallengeSignature,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GetPowCaptchaResponse {
    #[serde(flatten)]
    pub response: ApiResponse,
    pub challenge: String,
    pub difficulty: JsNumber,
    pub timestamp: String,
    pub signature: ProviderChallengeSignature,
}

/// The puzzle challenge carries imagery, never coordinates: the target and tolerance stay on
/// the challenge record.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetPuzzleCaptchaResponse {
    #[serde(flatten)]
    pub response: ApiResponse,
    pub challenge: String,
    /// Background with the notch cut into it, as a data URI.
    pub background: String,
    /// The draggable piece on transparency, as a data URI.
    pub piece: String,
    pub piece_size: JsNumber,
    pub origin_x: JsNumber,
    pub origin_y: JsNumber,
    pub timestamp: String,
    pub signature: ProviderChallengeSignature,
    /// Whether the widget may offer to swap the puzzle for an image challenge.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_switch_available: Option<bool>,
}

/// `PuzzleCaptchaSolutionResponse`, also the audio and icon-order solution responses.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct InteractiveCaptchaSolutionResponse {
    #[serde(flatten)]
    pub response: ApiResponse,
    pub verified: bool,
}

/// Carries the clip, never the transcript.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetAudioCaptchaResponse {
    #[serde(flatten)]
    pub response: ApiResponse,
    pub challenge: String,
    /// RIFF/WAVE clip as a data URI.
    pub clip: String,
    /// How many digits the user must type.
    pub character_count: JsNumber,
    pub timestamp: String,
    pub signature: ProviderChallengeSignature,
}

/// Imagery only: icon positions and click order stay on the challenge record.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetIconOrderCaptchaResponse {
    #[serde(flatten)]
    pub response: ApiResponse,
    pub challenge: String,
    pub background: String,
    pub legend: String,
    pub legend_icon_size: JsNumber,
    pub timestamp: String,
    pub signature: ProviderChallengeSignature,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetFrictionlessCaptchaResponse {
    #[serde(flatten)]
    pub response: ApiResponse,
    /// pow, image, puzzle, iconOrder or authenticated.
    pub captcha_type: CaptchaType,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    /// The encoded honeypot question. Sent in the `x-prosopo-meta` header, not the body; the
    /// API client moves it here.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hp: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dns_url: Option<String>,
    /// The verified Signature-Agent URL, only with `authenticated`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agent: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_alternative_available: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PowCaptchaSolutionEscalation {
    /// image, puzzle or iconOrder.
    pub captcha_type: CaptchaType,
    pub session_id: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PowCaptchaSolutionResponse {
    #[serde(flatten)]
    pub response: ApiResponse,
    pub verified: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub escalation: Option<PowCaptchaSolutionEscalation>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DnsEventResponseBody {
    #[serde(flatten)]
    pub response: ApiResponse,
    pub stored: JsNumber,
    pub errors: JsNumber,
    pub dropped: JsNumber,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssignDetectorBundleResponse {
    #[serde(flatten)]
    pub response: ApiResponse,
    /// False when no pool is available and the client should use its bundled detector.
    pub use_provider_bundle: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub detector_session_id: Option<String>,
    /// The obfuscated detector ESM, served inline.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub detector_script: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub asset_origin: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReplaceDetectorPoolResponse {
    #[serde(flatten)]
    pub response: ApiResponse,
    pub count: JsNumber,
    /// False when the pool went live in memory but could not be written to disk.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub persisted: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatedDecisionMachine {
    pub scope: DecisionMachineScope,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dapp_account: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UpdateDecisionMachineResponse {
    #[serde(flatten)]
    pub response: ApiResponse,
    pub data: UpdatedDecisionMachine,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GetSessionResponse {
    #[serde(flatten)]
    pub response: ApiResponse,
    pub mongo: Option<serde_json::Map<String, Value>>,
    pub redis: Option<serde_json::Map<String, Value>>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UpdateProviderClientsResponse {
    #[serde(flatten)]
    pub response: ApiResponse,
    pub message: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RegistrationStatus {
    Registered,
    Unregistered,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProviderRegistered {
    pub status: RegistrationStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptchaIdAndProof {
    pub captcha_id: String,
    pub proof: Vec<Vec<String>>,
}

/// `CaptchaSolutionResponse` (`ApiResponse` and `DappUserSolutionResult`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptchaSolutionResponse {
    #[serde(flatten)]
    pub response: ApiResponse,
    pub captchas: Vec<CaptchaIdAndProof>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub partial_fee: Option<String>,
    pub verified: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FrontendProvider {
    pub url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RandomProvider {
    pub provider_account: String,
    pub provider: FrontendProvider,
}
