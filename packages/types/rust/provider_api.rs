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

//! provider/api.ts: the route paths, rate-limit defaults and request/response schemas of the
//! provider API.

use crate::api_params::ApiParams;
use crate::client::{BlockRuleType, ModeEnum, Tier};
use crate::datasets::{pow_challenge_id_schema, InputMethod};
use crate::decision_machine::{
    decision_machine_captcha_type_schema, DecisionMachineKind, DecisionMachineLanguage,
    DecisionMachineRuntime, DecisionMachineScope,
};
use crate::sanitise::{bounded_array, bounded_string, safe_line, safe_text, InputLimits};
use crate::settings::client_settings_schema;
use crate::timeouts::DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED;
use crate::wire_enum::wire_enum;
use prosopo_api_route::schema::{
    any, array, boolean, coerce_number, literal, number, object, record, string, union, Schema,
};
use serde_json::json;

pub const API_PREFIX: &str = "/v1/prosopo";
pub const DEFAULT_SOLVED_COUNT: f64 = 2.0;
pub const DEFAULT_UNSOLVED_COUNT: f64 = 0.0;

wire_enum! {
    pub enum ClientApiPaths {
        GetImageCaptchaChallenge: "GetImageCaptchaChallenge" = "/v1/prosopo/provider/client/captcha/image",
        GetPowCaptchaChallenge: "GetPowCaptchaChallenge" = "/v1/prosopo/provider/client/captcha/pow",
        GetFrictionlessCaptchaChallenge: "GetFrictionlessCaptchaChallenge" = "/v1/prosopo/provider/client/captcha/frictionless",
        SubmitImageCaptchaSolution: "SubmitImageCaptchaSolution" = "/v1/prosopo/provider/client/solution",
        SubmitPowCaptchaSolution: "SubmitPowCaptchaSolution" = "/v1/prosopo/provider/client/pow/solution",
        VerifyPowCaptchaSolution: "VerifyPowCaptchaSolution" = "/v1/prosopo/provider/client/pow/verify",
        VerifyImageCaptchaSolutionDapp: "VerifyImageCaptchaSolutionDapp" = "/v1/prosopo/provider/client/image/dapp/verify",
        GetPuzzleCaptchaChallenge: "GetPuzzleCaptchaChallenge" = "/v1/prosopo/provider/client/captcha/puzzle",
        SubmitPuzzleCaptchaSolution: "SubmitPuzzleCaptchaSolution" = "/v1/prosopo/provider/client/puzzle/solution",
        VerifyPuzzleCaptchaSolution: "VerifyPuzzleCaptchaSolution" = "/v1/prosopo/provider/client/puzzle/verify",
        GetAudioCaptchaChallenge: "GetAudioCaptchaChallenge" = "/v1/prosopo/provider/client/captcha/audio",
        SubmitAudioCaptchaSolution: "SubmitAudioCaptchaSolution" = "/v1/prosopo/provider/client/audio/solution",
        VerifyAudioCaptchaSolution: "VerifyAudioCaptchaSolution" = "/v1/prosopo/provider/client/audio/verify",
        GetIconOrderCaptchaChallenge: "GetIconOrderCaptchaChallenge" = "/v1/prosopo/provider/client/captcha/icon-order",
        SubmitIconOrderCaptchaSolution: "SubmitIconOrderCaptchaSolution" = "/v1/prosopo/provider/client/icon-order/solution",
        VerifyIconOrderCaptchaSolution: "VerifyIconOrderCaptchaSolution" = "/v1/prosopo/provider/client/icon-order/verify",
        /// Verify path for Web Bot Auth authenticated sessions. Only accepts tokens
        /// minted with captchaType=authenticated. Requires the operator to forward
        /// the client IP so the session's `ipAddress` binding can be enforced;
        /// a leaked authenticated token cannot be replayed from a different IP.
        VerifyAuthenticatedSession: "VerifyAuthenticatedSession" = "/v1/prosopo/provider/client/authenticated/verify",
        GetProviderStatus: "GetProviderStatus" = "/v1/prosopo/provider/client/status",
        SubmitUserEvents: "SubmitUserEvents" = "/v1/prosopo/provider/client/events",
        CheckSpamEmail: "CheckSpamEmail" = "/v1/prosopo/provider/client/spam/email",
        /// Assigns a precomputed detector bundle for this session and returns its
        /// obfuscated script inline (or signals the bundled fallback when no pool).
        AssignDetectorBundle: "AssignDetectorBundle" = "/v1/prosopo/provider/client/detector/assign",
    }
}

wire_enum! {
    pub enum PublicApiPaths {
        Healthz: "Healthz" = "/healthz",
        GetProviderDetails: "GetProviderDetails" = "/v1/prosopo/provider/public/details",
        Metrics: "Metrics" = "/metrics",
    }
}

wire_enum! {
    pub enum AdminApiPaths {
        SiteKeyRegister: "SiteKeyRegister" = "/v1/prosopo/provider/admin/sitekey/register",
        SiteKeysRegister: "SiteKeysRegister" = "/v1/prosopo/provider/admin/sitekeys/register",
        ToggleMaintenanceMode: "ToggleMaintenanceMode" = "/v1/prosopo/provider/admin/maintenance/toggle",
        UpdateDecisionMachine: "UpdateDecisionMachine" = "/v1/prosopo/provider/admin/decision-machine/update",
        GetAllDecisionMachines: "GetAllDecisionMachines" = "/v1/prosopo/provider/admin/decision-machine/get-all",
        GetDecisionMachine: "GetDecisionMachine" = "/v1/prosopo/provider/admin/decision-machine/get",
        RemoveDecisionMachine: "RemoveDecisionMachine" = "/v1/prosopo/provider/admin/decision-machine/remove",
        RemoveAllDecisionMachines: "RemoveAllDecisionMachines" = "/v1/prosopo/provider/admin/decision-machine/remove-all",
        ClearAllCounters: "ClearAllCounters" = "/v1/prosopo/provider/admin/counters/clear-all",
        SiteKeyRemove: "SiteKeyRemove" = "/v1/prosopo/provider/admin/sitekey/remove",
        SiteKeysRemove: "SiteKeysRemove" = "/v1/prosopo/provider/admin/sitekeys/remove",
        /// Receives batched DNS observation events from the dns sidecar.
        DnsEvent: "DnsEvent" = "/v1/prosopo/provider/admin/dns/event",
        /// Hot-swaps the in-memory detector bundle pool (emergency push channel,
        /// avoids a redeploy to rotate the pool).
        ReplaceDetectorPool: "ReplaceDetectorPool" = "/v1/prosopo/provider/admin/detector/pool/replace",
        /// Read a single session's current state from both Redis and Mongo.
        /// Test / diagnostic surface only — used by the cypress consistency
        /// suite to assert Redis and Mongo agree on captchaType at each stage
        /// of a captcha flow. Not called from any client code path.
        GetSession: "GetSession" = "/v1/prosopo/provider/admin/session/get",
    }
}

const MINUTE_MS: u64 = 60_000;

/// `ProviderDefaultRateLimits`: `(path, windowMs, limit)` in the TS object's key order.
pub const PROVIDER_DEFAULT_RATE_LIMITS: [(&str, u64, u64); 36] = [
    (
        ClientApiPaths::GetImageCaptchaChallenge.as_str(),
        MINUTE_MS,
        150,
    ),
    (
        ClientApiPaths::GetPowCaptchaChallenge.as_str(),
        MINUTE_MS,
        300,
    ),
    (
        ClientApiPaths::SubmitImageCaptchaSolution.as_str(),
        MINUTE_MS,
        300,
    ),
    (
        ClientApiPaths::GetFrictionlessCaptchaChallenge.as_str(),
        MINUTE_MS,
        300,
    ),
    (
        ClientApiPaths::SubmitPowCaptchaSolution.as_str(),
        MINUTE_MS,
        300,
    ),
    (
        ClientApiPaths::VerifyPowCaptchaSolution.as_str(),
        MINUTE_MS,
        15000,
    ),
    (
        ClientApiPaths::GetPuzzleCaptchaChallenge.as_str(),
        MINUTE_MS,
        300,
    ),
    (
        ClientApiPaths::SubmitPuzzleCaptchaSolution.as_str(),
        MINUTE_MS,
        300,
    ),
    (
        ClientApiPaths::VerifyPuzzleCaptchaSolution.as_str(),
        MINUTE_MS,
        15000,
    ),
    (
        ClientApiPaths::GetAudioCaptchaChallenge.as_str(),
        MINUTE_MS,
        300,
    ),
    (
        ClientApiPaths::SubmitAudioCaptchaSolution.as_str(),
        MINUTE_MS,
        300,
    ),
    (
        ClientApiPaths::VerifyAudioCaptchaSolution.as_str(),
        MINUTE_MS,
        15000,
    ),
    (
        ClientApiPaths::GetIconOrderCaptchaChallenge.as_str(),
        MINUTE_MS,
        300,
    ),
    (
        ClientApiPaths::SubmitIconOrderCaptchaSolution.as_str(),
        MINUTE_MS,
        300,
    ),
    (
        ClientApiPaths::VerifyIconOrderCaptchaSolution.as_str(),
        MINUTE_MS,
        15000,
    ),
    (
        ClientApiPaths::VerifyImageCaptchaSolutionDapp.as_str(),
        MINUTE_MS,
        15000,
    ),
    (
        ClientApiPaths::VerifyAuthenticatedSession.as_str(),
        MINUTE_MS,
        15000,
    ),
    (ClientApiPaths::GetProviderStatus.as_str(), MINUTE_MS, 60),
    (ClientApiPaths::CheckSpamEmail.as_str(), MINUTE_MS, 60),
    (ClientApiPaths::AssignDetectorBundle.as_str(), MINUTE_MS, 60),
    (PublicApiPaths::GetProviderDetails.as_str(), MINUTE_MS, 60),
    (ClientApiPaths::SubmitUserEvents.as_str(), MINUTE_MS, 60),
    (AdminApiPaths::SiteKeyRegister.as_str(), MINUTE_MS, 5),
    (AdminApiPaths::SiteKeysRegister.as_str(), MINUTE_MS, 5),
    (AdminApiPaths::ToggleMaintenanceMode.as_str(), MINUTE_MS, 5),
    (AdminApiPaths::UpdateDecisionMachine.as_str(), MINUTE_MS, 5),
    (
        AdminApiPaths::GetAllDecisionMachines.as_str(),
        MINUTE_MS,
        60,
    ),
    (AdminApiPaths::GetDecisionMachine.as_str(), MINUTE_MS, 60),
    (AdminApiPaths::RemoveDecisionMachine.as_str(), MINUTE_MS, 5),
    (
        AdminApiPaths::RemoveAllDecisionMachines.as_str(),
        MINUTE_MS,
        5,
    ),
    (AdminApiPaths::GetSession.as_str(), MINUTE_MS, 60),
    (AdminApiPaths::ClearAllCounters.as_str(), MINUTE_MS, 10),
    (AdminApiPaths::SiteKeyRemove.as_str(), MINUTE_MS, 5),
    (AdminApiPaths::SiteKeysRemove.as_str(), MINUTE_MS, 5),
    (AdminApiPaths::DnsEvent.as_str(), MINUTE_MS, 600),
    (AdminApiPaths::ReplaceDetectorPool.as_str(), MINUTE_MS, 5),
];

/// `ApiPathRateLimits`: every path's window and limit, coerced from the environment's
/// strings and defaulted from `ProviderDefaultRateLimits`.
pub fn api_path_rate_limits_schema() -> Schema {
    object(
        PROVIDER_DEFAULT_RATE_LIMITS
            .iter()
            .map(|(path, window_ms, limit)| {
                (
                    *path,
                    object(vec![
                        ("windowMs", coerce_number().optional().default(*window_ms)),
                        ("limit", coerce_number().optional().default(*limit)),
                    ]),
                )
            })
            .collect(),
    )
}

/// Caps on client-supplied arrays, well above what the widget sends.
pub struct RequestArrayLimits;

impl RequestArrayLimits {
    pub const DATASET_ID: usize = 64;
    pub const CAPTCHAS: usize = 256;
    pub const SOLUTION: usize = 64;
    pub const PUZZLE_EVENTS: usize = 10_000;
    pub const ICON_ORDER_EVENTS: usize = 10_000;
    pub const AUDIO_EVENTS: usize = 512;
}

/// Grading needs one click per target, so this only has to clear the largest target count.
pub const MAX_ICON_CLICKS: usize = 10;
const MAX_AUDIO_ANSWER_LENGTH: f64 = 32.0;

fn id() -> Schema {
    bounded_string(InputLimits::ID)
}

fn token() -> Schema {
    bounded_string(InputLimits::TOKEN)
}

pub fn provider_details_schema() -> Schema {
    object(vec![
        ("version", string()),
        ("message", string()),
        ("host", string().optional()),
        (
            "redis",
            object(vec![
                ("actor", string()),
                ("isReady", boolean()),
                ("awaitingTimeSeconds", number()),
            ])
            .array(),
        ),
    ])
}

pub fn captcha_request_body() -> Schema {
    object(vec![
        (ApiParams::USER, id()),
        (ApiParams::DAPP, id()),
        (
            ApiParams::DATASET_ID,
            union(vec![
                id(),
                bounded_array(number(), RequestArrayLimits::DATASET_ID),
            ])
            .optional(),
        ),
        (ApiParams::SESSION_ID, id().optional()),
        (ApiParams::SIMD_READINGS, token().optional()),
    ])
}

pub fn client_meta_data_schema() -> Schema {
    object(vec![
        (ApiParams::HP, safe_text(InputLimits::TEXT).optional()),
        (ApiParams::CLIENT_SESSION_ID, id().optional()),
    ])
    .ts_documented(
        "ClientMetaDataSchema",
        "Widget-controlled metadata sent alongside the captcha solution. `hp` is only\npopulated when the honeypot input has been filled in (which should only\nhappen for bots); `clientSessionId` is only populated when the site owner\nrendered the widget with a session id. Server-side: persisted on the\nStoredCaptcha record, no automatic verdict at submit time — the session\nalignment check happens at verify. The TS shape (`ClientMetaData`) lives in\n./database.ts — this schema is the wire-level zod for request bodies.",
    )
}

fn bounded_procaptcha_token_spec() -> Schema {
    token().starts_with("0x")
}

fn bounded_captcha_solution_schema() -> Schema {
    object(vec![
        ("captchaId", id()),
        ("captchaContentId", id()),
        (
            "solution",
            bounded_array(id(), RequestArrayLimits::SOLUTION),
        ),
        ("salt", id()),
        (
            "inputMethods",
            array(InputMethod::schema())
                .max(InputLimits::ID as f64)
                .optional(),
        ),
    ])
}

pub fn captcha_solution_body() -> Schema {
    object(vec![
        (ApiParams::USER, id()),
        (ApiParams::DAPP, id()),
        (
            ApiParams::CAPTCHAS,
            bounded_array(
                bounded_captcha_solution_schema(),
                RequestArrayLimits::CAPTCHAS,
            ),
        ),
        (ApiParams::REQUEST_HASH, id()),
        (ApiParams::TIMESTAMP, id()),
        (
            ApiParams::SIGNATURE,
            object(vec![
                (
                    ApiParams::USER,
                    object(vec![(ApiParams::TIMESTAMP, token())]),
                ),
                (
                    ApiParams::PROVIDER,
                    object(vec![(ApiParams::REQUEST_HASH, token())]),
                ),
            ]),
        ),
        (ApiParams::BEHAVIORAL_DATA, token().optional()),
        (ApiParams::SIMD_READINGS, token().optional()),
        (
            ApiParams::CLIENT_META_DATA,
            client_meta_data_schema().optional(),
        ),
    ])
}

pub fn verify_solution_body() -> Schema {
    object(vec![
        (ApiParams::TOKEN, bounded_procaptcha_token_spec()),
        (ApiParams::DAPP_SIGNATURE, token()),
        (
            ApiParams::MAX_VERIFIED_TIME,
            number()
                .optional()
                .default(DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED),
        ),
        (ApiParams::IP, id().optional()),
        (
            ApiParams::EMAIL,
            bounded_string(InputLimits::EMAIL).optional(),
        ),
        (ApiParams::CLIENT_SESSION_ID, id().optional()),
    ])
}

/// `ServerPowCaptchaVerifyRequestBody`, and the puzzle and icon-order verify bodies, which
/// are the same schema.
pub fn server_captcha_verify_request_body() -> Schema {
    object(vec![
        (ApiParams::TOKEN, bounded_procaptcha_token_spec()),
        (ApiParams::DAPP_SIGNATURE, token()),
        (ApiParams::IP, id().optional()),
        (
            ApiParams::EMAIL,
            bounded_string(InputLimits::EMAIL).email().optional(),
        ),
        (ApiParams::CLIENT_SESSION_ID, id().optional()),
    ])
}

/// `DnsEventKindSchema`: `/^dns$/` or `/^http$/`; JS's `$` without `m` matches only at the
/// very end, so these are exact matches.
pub fn dns_event_kind_schema() -> Schema {
    union(vec![
        string().regex(|kind: &str| kind == "dns"),
        string().regex(|kind: &str| kind == "http"),
    ])
}

pub fn dns_event_schema() -> Schema {
    object(vec![
        ("kind", dns_event_kind_schema()),
        ("ts", id()),
        ("src_ip", id()),
        ("jti", id().optional()),
        ("site_key", id().optional()),
        ("subzone", id().optional()),
        ("qname", id().optional()),
        ("qtype", id().optional()),
        ("sni", id().optional()),
        ("path", bounded_string(InputLimits::URL).optional()),
        ("user_agent", safe_line(InputLimits::TEXT).optional()),
        ("path_valid", boolean().optional()),
    ])
}

pub fn dns_event_batch_schema() -> Schema {
    object(vec![("events", array(dns_event_schema()))])
}

pub fn dns_event_ingest_batch_schema() -> Schema {
    object(vec![("events", array(any()))])
}

/// `GetPowCaptchaChallengeRequestBody`; the puzzle and icon-order challenge bodies have the
/// same shape.
pub fn get_challenge_request_body() -> Schema {
    object(vec![
        (ApiParams::USER, id()),
        (ApiParams::DAPP, id()),
        (ApiParams::SESSION_ID, id().optional()),
        (ApiParams::SIMD_READINGS, token().optional()),
    ])
}

fn challenge_signature() -> Schema {
    object(vec![
        (ApiParams::USER, object(vec![(ApiParams::TIMESTAMP, id())])),
        (
            ApiParams::PROVIDER,
            object(vec![(ApiParams::CHALLENGE, token())]),
        ),
    ])
}

pub fn submit_pow_captcha_solution_body() -> Schema {
    object(vec![
        (ApiParams::CHALLENGE, pow_challenge_id_schema()),
        (ApiParams::DIFFICULTY, number()),
        (ApiParams::SIGNATURE, challenge_signature()),
        (ApiParams::USER, id()),
        (ApiParams::DAPP, id()),
        (ApiParams::NONCE, number()),
        (ApiParams::BEHAVIORAL_DATA, token().optional()),
        (ApiParams::SALT, id().optional()),
        (ApiParams::SIMD_READINGS, token().optional()),
        (
            ApiParams::CLIENT_META_DATA,
            client_meta_data_schema().optional(),
        ),
        (ApiParams::FINGERPRINT_PROOF, token().optional()),
    ])
    .ts_named("SubmitPowCaptchaSolutionBody")
}

pub fn get_frictionless_captcha_challenge_request_body() -> Schema {
    object(vec![
        (ApiParams::DAPP, id()),
        (ApiParams::TOKEN, token()),
        (ApiParams::USER, id()),
        (ApiParams::HEAD_HASH, token()),
        (ApiParams::MODE, ModeEnum::schema().optional()),
        (ApiParams::SIMD_READINGS, token().optional()),
        (ApiParams::DETECTOR_SESSION_ID, id().optional()),
        (
            ApiParams::CURRENT_URL,
            bounded_string(InputLimits::URL).optional(),
        ),
        (
            ApiParams::IFRAME_URL,
            bounded_string(InputLimits::URL).optional(),
        ),
        (ApiParams::CLIENT_SESSION_ID, id().optional()),
        (ApiParams::REFRESH_OF, id().optional()),
        (ApiParams::SWITCH_TO_IMAGE, boolean().optional()),
    ])
}

pub fn assign_detector_bundle_request_body() -> Schema {
    object(vec![(ApiParams::DAPP, string())])
}

/// `ReplaceDetectorPoolBody`: a field the build output adds must be added here too, or this
/// schema strips it and the bundle can no longer be decoded.
pub fn replace_detector_pool_body() -> Schema {
    object(vec![(
        "bundles",
        record(object(vec![
            ("js", string()),
            ("privateKey", string()),
            ("innerConfig", string()),
            ("release", string().optional()),
            ("payloadLayout", string().optional()),
            ("keyMap", string().optional()),
        ])),
    )])
}

/// `PuzzleEventSchema`, also `IconOrderEventSchema`.
pub fn puzzle_event_schema() -> Schema {
    object(vec![("x", number()), ("y", number()), ("t", number())])
    .ts_documented(
        "PuzzleEventSchema",
        "Event captured during a drag of the puzzle piece. `t` is milliseconds\nsince the drag started (not absolute), which is enough for behavioural\nanalysis and lets the trail be replay-portable.",
    )
}

fn interactive_solution_tail() -> Vec<(&'static str, Schema)> {
    vec![
        (ApiParams::SIGNATURE, challenge_signature()),
        (ApiParams::USER, id()),
        (ApiParams::DAPP, id()),
        (ApiParams::BEHAVIORAL_DATA, token().optional()),
        (ApiParams::SALT, id().optional()),
        (ApiParams::SIMD_READINGS, token().optional()),
        (
            ApiParams::CLIENT_META_DATA,
            client_meta_data_schema().optional(),
        ),
    ]
}

pub fn submit_puzzle_captcha_solution_body() -> Schema {
    let mut shape: Vec<(&str, Schema)> = vec![
        (ApiParams::CHALLENGE, pow_challenge_id_schema()),
        (ApiParams::FINAL_X, number()),
        (ApiParams::FINAL_Y, number()),
        (
            ApiParams::PUZZLE_EVENTS,
            bounded_array(puzzle_event_schema(), RequestArrayLimits::PUZZLE_EVENTS),
        ),
    ];
    shape.extend(interactive_solution_tail());
    object(shape).ts_named("SubmitPuzzleCaptchaSolutionBody")
}

/// `AudioEventSchema`: `t` is milliseconds since the challenge was issued.
pub fn audio_event_schema() -> Schema {
    object(vec![
        (
            "kind",
            union(vec![
                literal("play"),
                literal("pause"),
                literal("replay"),
                literal("key"),
            ]),
        ),
        ("t", number()),
    ])
    .ts_documented(
        "AudioEventSchema",
        "`t` is milliseconds since the challenge was issued.",
    )
}

pub fn submit_audio_captcha_solution_body() -> Schema {
    let mut shape: Vec<(&str, Schema)> = vec![
        (ApiParams::CHALLENGE, pow_challenge_id_schema()),
        (ApiParams::ANSWER, string().max(MAX_AUDIO_ANSWER_LENGTH)),
        (
            ApiParams::REPLAYS,
            number().int().min(0.0).max(1000.0).optional(),
        ),
        (
            ApiParams::AUDIO_EVENTS,
            bounded_array(audio_event_schema(), RequestArrayLimits::AUDIO_EVENTS).optional(),
        ),
    ];
    shape.extend(interactive_solution_tail());
    object(shape).ts_named("SubmitAudioCaptchaSolutionBody")
}

/// One click in background pixels; its index in `clicks` is its order.
pub fn icon_click_schema() -> Schema {
    object(vec![("x", number()), ("y", number())])
    .ts_documented(
        "IconClickSchema",
        "One click in background pixels; its index in `clicks` is its order.",
    )
}

pub fn submit_icon_order_captcha_solution_body() -> Schema {
    let mut shape: Vec<(&str, Schema)> = vec![
        (ApiParams::CHALLENGE, pow_challenge_id_schema()),
        (
            ApiParams::CLICKS,
            bounded_array(icon_click_schema(), MAX_ICON_CLICKS),
        ),
        (
            ApiParams::ICON_ORDER_EVENTS,
            bounded_array(puzzle_event_schema(), RequestArrayLimits::ICON_ORDER_EVENTS),
        ),
    ];
    shape.extend(interactive_solution_tail());
    object(shape).ts_named("SubmitIconOrderCaptchaSolutionBody")
}

pub fn verify_pow_captcha_solution_body() -> Schema {
    object(vec![(ApiParams::SITE_KEY, id())])
}

fn sitekey_registration() -> Schema {
    object(vec![
        (ApiParams::SITE_KEY, id()),
        (ApiParams::TIER, Tier::schema()),
        (ApiParams::SETTINGS, client_settings_schema().optional()),
    ])
}

pub fn register_sitekey_body() -> Schema {
    sitekey_registration()
}

pub fn register_sitekeys_body() -> Schema {
    array(sitekey_registration())
}

pub fn remove_sitekey_body() -> Schema {
    object(vec![(ApiParams::SITE_KEY, id())])
}

pub fn remove_sitekeys_body() -> Schema {
    array(object(vec![(ApiParams::SITE_KEY, id())]))
}

pub fn update_decision_machine_body() -> Schema {
    object(vec![
        (
            ApiParams::DECISION_MACHINE_SCOPE,
            DecisionMachineScope::schema(),
        ),
        (
            ApiParams::DECISION_MACHINE_RUNTIME,
            DecisionMachineRuntime::schema(),
        ),
        (
            ApiParams::DECISION_MACHINE_SOURCE,
            safe_text(InputLimits::LONG_TEXT),
        ),
        (
            ApiParams::DECISION_MACHINE_LANGUAGE,
            DecisionMachineLanguage::schema().optional(),
        ),
        (
            ApiParams::DECISION_MACHINE_NAME,
            safe_line(InputLimits::NAME).optional(),
        ),
        (ApiParams::DECISION_MACHINE_VERSION, id().optional()),
        (
            ApiParams::DECISION_MACHINE_CAPTCHA_TYPE,
            decision_machine_captcha_type_schema().optional(),
        ),
        (
            ApiParams::DECISION_MACHINE_KIND,
            DecisionMachineKind::schema().optional(),
        ),
        (ApiParams::DAPP, id().optional()),
    ])
}

/// `GetDecisionMachineBody`, also `RemoveDecisionMachineBody`.
pub fn decision_machine_id_body() -> Schema {
    object(vec![("id", id())])
}

/// `GetAllDecisionMachinesBody`, also `RemoveAllDecisionMachinesBody`.
pub fn empty_body() -> Schema {
    object(vec![])
}

pub fn clear_all_counters_body() -> Schema {
    object(vec![(ApiParams::DAPP, id().optional())])
}

pub fn clear_all_counters_response() -> Schema {
    object(vec![
        ("success", boolean()),
        ("deletedCount", number()),
        ("scope", string()),
    ])
}

pub fn decision_machine_summary_schema() -> Schema {
    object(vec![
        ("_id", string()),
        ("scope", DecisionMachineScope::schema()),
        ("dappAccount", string().nullish()),
        ("kind", DecisionMachineKind::schema().nullish()),
        ("runtime", DecisionMachineRuntime::schema()),
        ("language", DecisionMachineLanguage::schema().nullish()),
        ("name", string().nullish()),
        ("version", string().nullish()),
        (
            "captchaType",
            decision_machine_captcha_type_schema().nullish(),
        ),
        ("createdAt", string()),
        ("updatedAt", string()),
    ])
}

/// `GetDecisionMachineResponse`; `GetAllDecisionMachinesResponse` is an array of it.
pub fn get_decision_machine_response() -> Schema {
    decision_machine_summary_schema().extend(vec![("source", string())])
}

pub fn get_all_decision_machines_response() -> Schema {
    array(get_decision_machine_response())
}

pub fn remove_decision_machine_response() -> Schema {
    object(vec![("success", boolean()), ("deletedId", string())])
}

pub fn remove_all_decision_machines_response() -> Schema {
    object(vec![("success", boolean()), ("deletedCount", number())])
}

pub fn toggle_maintenance_mode_body() -> Schema {
    object(vec![
        (ApiParams::ENABLED, boolean()),
        (ApiParams::SITE_KEYS, array(string()).optional()),
    ])
}

pub fn get_session_body() -> Schema {
    object(vec![("sessionId", id())])
}

pub fn prosopo_captcha_count_config_schema() -> Schema {
    object(vec![
        (
            "solved",
            object(vec![("count", number().positive())])
                .optional()
                .default(json!({ "count": DEFAULT_SOLVED_COUNT })),
        ),
        (
            "unsolved",
            object(vec![("count", number().nonnegative())])
                .optional()
                .default(json!({ "count": DEFAULT_UNSOLVED_COUNT })),
        ),
    ])
}

pub fn block_rule_spec() -> Schema {
    object(vec![
        ("global", boolean()),
        ("hardBlock", boolean()),
        ("type", BlockRuleType::schema()),
        ("dappAccount", string().optional()),
        (
            "captchaConfig",
            prosopo_captcha_count_config_schema().optional(),
        ),
    ])
}

pub fn dapp_domain_request_body() -> Schema {
    object(vec![(ApiParams::DAPP, string())])
}
