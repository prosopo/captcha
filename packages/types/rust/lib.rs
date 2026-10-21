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

//! Rust port of `@prosopo/types`, built up module by module. Rust is the source of truth for
//! the wire types the widget shares (MIGRATION.md §5).

pub mod api_params;
pub mod api_types;
pub mod captcha_type;
pub mod client;
pub mod config;
pub mod datasets;
pub mod decision_machine;
pub mod ipapi;
mod js_regex;
pub mod keyring;
pub mod matched_access_rule;
pub mod number;
pub mod provider_api;
pub mod reasons;
pub mod sanitise;
mod scale;
pub mod settings;
pub mod settings_types;
pub mod stored;
pub mod timeouts;
pub mod token;
mod wire_enum;

pub use api_params::ApiParams;
pub use api_types::{ApiErrorMessage, ApiJsonError, ApiResponse};
pub use captcha_type::{
    captcha_type_schema, selectable_captcha_type_schema, CaptchaType, UnknownCaptchaType,
};
pub use client::{
    get_test_site_key_mode, mode_schema, BlockRuleType, ModeEnum, ScheduledTaskNames,
    ScheduledTaskStatus, TestSiteKeyMode, Tier, ALWAYS_FAIL_SITE_KEY, ALWAYS_PASS_SITE_KEY,
};
pub use datasets::{
    pow_challenge_id_schema, CaptchaItemTypes, CaptchaStates, CaptchaStatus, CaptchaTypes,
    DappPayee, GovernanceStatus, InputMethod, StoredStatusNames, POW_SEPARATOR,
};
pub use matched_access_rule::{AccessPolicyType, MatchedAccessRule, MatchedRuleCondition};
pub use number::{js_math_round, JsNumber};
pub use reasons::{
    is_blocking_captcha_result, CaptchaResult, FrictionlessReason, ResultReason,
    NO_MEASUREMENT_REASONS,
};
pub use sanitise::{bounded_array, bounded_string, safe_line, safe_text, InputLimits};
pub use token::{
    decode_procaptcha_output, encode_procaptcha_output, is_procaptcha_token,
    procaptcha_token_codec_enc, procaptcha_token_codec_v1_enc, OutputSignatures, ProcaptchaOutput,
    SignatureTypes, TokenDecodeError,
};
pub use wire_enum::UnknownEnumValue;

#[cfg(test)]
mod api_equivalence;
#[cfg(test)]
mod config_equivalence;
#[cfg(test)]
mod datasets_equivalence;
#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod settings_equivalence;
#[cfg(test)]
mod settings_tests;
#[cfg(test)]
mod tests;
#[cfg(test)]
mod wire_equivalence;
