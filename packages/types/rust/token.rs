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

//! The procaptcha token: `ProcaptchaOutput` SCALE-encoded as hex. v2 appends `captchaType` to
//! the v1 layout; tokens minted by older bundles still decode through the v1 layout.

use crate::captcha_type::{CaptchaType, UnknownCaptchaType};
use crate::scale::{OutOfBounds, Reader, Writer};
use prosopo_util_crypto::u8a::{hex_to_u8a, u8a_to_hex};
use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;

/// `SignatureTypesSchema`. The token carries `challenge` and `requestHash` for the provider
/// and `timestamp` and `requestHash` for the user.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignatureTypes {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub challenge: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_hash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct OutputSignatures {
    pub provider: SignatureTypes,
    pub user: SignatureTypes,
}

/// `ProcaptchaOutput`: what procaptcha produces on completing a captcha.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcaptchaOutput {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub commitment_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_url: Option<String>,
    pub dapp: String,
    pub user: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub challenge: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nonce: Option<u32>,
    pub timestamp: String,
    pub signature: OutputSignatures,
    /// Which flow minted the token. Absent on v1 tokens.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub captcha_type: Option<CaptchaType>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TokenDecodeError {
    /// The bytes fit neither layout.
    Malformed,
    /// The bytes fit the v2 layout but name no known captcha type. This is not retried as v1.
    UnknownCaptchaType(UnknownCaptchaType),
}

impl fmt::Display for TokenDecodeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TokenDecodeError::Malformed => f.write_str("malformed procaptcha token"),
            TokenDecodeError::UnknownCaptchaType(error) => error.fmt(f),
        }
    }
}

impl std::error::Error for TokenDecodeError {}

/// `ProcaptchaTokenSpec`.
pub fn is_procaptcha_token(value: &str) -> bool {
    value.starts_with("0x")
}

fn read_optional_str(reader: &mut Reader<'_>) -> Result<Option<String>, OutOfBounds> {
    reader.option(Reader::str)
}

/// The v1 fields, in layout order, and the raw v2 `captchaType` when the layout has one.
fn read_layout(
    bytes: &[u8],
    with_captcha_type: bool,
) -> Result<(ProcaptchaOutput, Option<String>), OutOfBounds> {
    let mut reader: Reader<'_> = Reader::new(bytes);
    let commitment_id: Option<String> = read_optional_str(&mut reader)?;
    let provider_url: Option<String> = read_optional_str(&mut reader)?;
    let dapp: String = reader.str()?;
    let user: String = reader.str()?;
    let challenge: Option<String> = read_optional_str(&mut reader)?;
    let nonce: Option<u32> = reader.option(Reader::u32)?;
    let timestamp: String = reader.str()?;
    let provider: SignatureTypes = SignatureTypes {
        challenge: read_optional_str(&mut reader)?,
        request_hash: read_optional_str(&mut reader)?,
        timestamp: None,
    };
    let user_signature: SignatureTypes = SignatureTypes {
        challenge: None,
        timestamp: read_optional_str(&mut reader)?,
        request_hash: read_optional_str(&mut reader)?,
    };
    let captcha_type: Option<String> = if with_captcha_type {
        read_optional_str(&mut reader)?
    } else {
        None
    };
    Ok((
        ProcaptchaOutput {
            commitment_id,
            provider_url,
            dapp,
            user,
            challenge,
            nonce,
            timestamp,
            signature: OutputSignatures {
                provider,
                user: user_signature,
            },
            captcha_type: None,
        },
        captcha_type,
    ))
}

/// `decodeProcaptchaOutput`.
pub fn decode_procaptcha_output(token: &str) -> Result<ProcaptchaOutput, TokenDecodeError> {
    let bytes: Vec<u8> = hex_to_u8a(token);
    let (mut output, captcha_type): (ProcaptchaOutput, Option<String>) =
        match read_layout(&bytes, true) {
            Ok(decoded) => decoded,
            Err(OutOfBounds) => {
                read_layout(&bytes, false).map_err(|OutOfBounds| TokenDecodeError::Malformed)?
            }
        };
    output.captcha_type = captcha_type
        .map(|value| CaptchaType::from_str(&value))
        .transpose()
        .map_err(TokenDecodeError::UnknownCaptchaType)?;
    Ok(output)
}

fn non_empty(value: &Option<String>) -> Option<&str> {
    value.as_deref().filter(|value| !value.is_empty())
}

fn write_optional_str(writer: &mut Writer, value: Option<&str>) {
    writer.option(value, Writer::str);
}

/// `encodeProcaptchaOutput`, always in the v2 layout. An empty signature part is encoded as
/// absent.
pub fn encode_procaptcha_output(output: &ProcaptchaOutput) -> String {
    let mut writer: Writer = Writer::default();
    write_optional_str(&mut writer, output.commitment_id.as_deref());
    write_optional_str(&mut writer, output.provider_url.as_deref());
    writer.str(&output.dapp);
    writer.str(&output.user);
    write_optional_str(&mut writer, output.challenge.as_deref());
    writer.option(output.nonce, Writer::u32);
    writer.str(&output.timestamp);
    let signature: &OutputSignatures = &output.signature;
    write_optional_str(&mut writer, non_empty(&signature.provider.challenge));
    write_optional_str(&mut writer, non_empty(&signature.provider.request_hash));
    write_optional_str(&mut writer, non_empty(&signature.user.timestamp));
    write_optional_str(&mut writer, non_empty(&signature.user.request_hash));
    write_optional_str(&mut writer, output.captcha_type.map(CaptchaType::as_str));
    u8a_to_hex(&writer.into_bytes())
}
