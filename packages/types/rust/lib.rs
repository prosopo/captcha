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

pub mod captcha_type;
mod scale;
pub mod token;

pub use captcha_type::{CaptchaType, UnknownCaptchaType};
pub use token::{
    decode_procaptcha_output, encode_procaptcha_output, is_procaptcha_token, OutputSignatures,
    ProcaptchaOutput, SignatureTypes, TokenDecodeError,
};

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod tests;
