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

//! The stored records the methods take and return (provider/database.ts in types).
//!
//! A Mixed field (`headers`, `ipInfo`, `behavioralDataPacked`, ...) is read as it is stored: old
//! records hold shapes no current type describes, and one of them must not make the record
//! unreadable.

use bson::{Bson, DateTime, Document};
use prosopo_types::api_types::ClientMetaData;
use prosopo_types::datasets::CaptchaStatus;
use prosopo_types::stored::IpAddressType;
use prosopo_types_database::number::decimal128_from_integer;
use serde::de::Error as _;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

/// One 64-bit half of an IP address, stored as a Decimal128.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct IpHalf(pub u64);

impl IpHalf {
    pub fn to_bson(self) -> Bson {
        Bson::Decimal128(decimal128_from_integer(i128::from(self.0)))
    }

    /// Whatever has been stored: a Decimal128, or an Int64 a pipeline update wrote (read as the
    /// unsigned value it was), or a number.
    pub fn from_bson(value: &Bson) -> Option<IpHalf> {
        match value {
            Bson::Decimal128(decimal) => decimal.to_string().parse::<u64>().ok().map(IpHalf),
            Bson::Int64(long) => Some(IpHalf(*long as u64)),
            Bson::Int32(int) => u64::try_from(*int).ok().map(IpHalf),
            Bson::Double(number) if number.fract() == 0.0 && *number >= 0.0 => Some(IpHalf(*number as u64)),
            Bson::String(text) => text.parse::<u64>().ok().map(IpHalf),
            _ => None,
        }
    }
}

impl<'de> Deserialize<'de> for IpHalf {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<IpHalf, D::Error> {
        let value: Bson = Bson::deserialize(deserializer)?;
        IpHalf::from_bson(&value).ok_or_else(|| D::Error::custom(format!("not an IP half: {value}")))
    }
}

/// `CompositeIpAddress`: an address as two 64-bit halves (only `lower` for IPv4).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
pub struct CompositeIpAddress {
    pub lower: IpHalf,
    #[serde(default)]
    pub upper: Option<IpHalf>,
    #[serde(rename = "type")]
    pub ip_type: IpAddressType,
}

impl CompositeIpAddress {
    /// As the TS object is built: `lower`, then `upper` if any, then `type`.
    pub fn to_document(&self) -> Document {
        let mut out: Document = Document::new();
        out.insert("lower", self.lower.to_bson());
        if let Some(upper) = self.upper {
            out.insert("upper", upper.to_bson());
        }
        out.insert("type", self.ip_type.as_str());
        out
    }
}

impl Serialize for CompositeIpAddress {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.to_document().serialize(serializer)
    }
}

/// A stored `result`. Its reason is any string: decision machines write their own.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct StoredResult {
    pub status: CaptchaStatus,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub error: Option<String>,
}

impl StoredResult {
    pub fn new(status: CaptchaStatus, reason: Option<&str>) -> StoredResult {
        StoredResult {
            status,
            reason: reason.map(str::to_string),
            error: None,
        }
    }

    pub fn to_document(&self) -> Document {
        let mut out: Document = Document::new();
        out.insert("status", self.status.as_str());
        if let Some(reason) = &self.reason {
            out.insert("reason", reason.as_str());
        }
        if let Some(error) = &self.error {
            out.insert("error", error.as_str());
        }
        out
    }
}

impl Serialize for StoredResult {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.to_document().serialize(serializer)
    }
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct PointerEvent {
    pub x: f64,
    pub y: f64,
    pub t: f64,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct StoredIconTarget {
    pub x: f64,
    pub y: f64,
    pub size: f64,
    pub kind: String,
}

impl StoredIconTarget {
    pub fn to_document(&self) -> Document {
        use prosopo_types_database::number::js_number;
        let mut out: Document = Document::new();
        out.insert("x", js_number(self.x));
        out.insert("y", js_number(self.y));
        out.insert("size", js_number(self.size));
        out.insert("kind", self.kind.as_str());
        out
    }
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct IconClick {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct AudioEvent {
    pub kind: String,
    pub t: f64,
}

/// A PoW, puzzle, audio or icon-order record as the by-challenge reads project it. Which fields
/// a read returns depends on its type; every field another type has is `None`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChallengeRecord {
    pub challenge: String,
    pub user_account: String,
    pub dapp_account: String,
    pub requested_at_timestamp: DateTime,
    #[serde(default)]
    pub submitted_at_timestamp: Option<DateTime>,
    #[serde(default)]
    pub verified_at_timestamp: Option<DateTime>,
    #[serde(default)]
    pub failed_at_timestamp: Option<DateTime>,
    pub ip_address: CompositeIpAddress,
    #[serde(default)]
    pub headers: Option<Bson>,
    #[serde(default)]
    pub ja4: Option<String>,
    pub result: StoredResult,
    #[serde(default)]
    pub difficulty: Option<f64>,
    #[serde(default)]
    pub session_id: Option<String>,
    #[serde(default)]
    pub ip_info: Option<Bson>,
    #[serde(default)]
    pub device_capability: Option<String>,
    #[serde(default)]
    pub behavioral_data_packed: Option<Bson>,
    #[serde(default)]
    pub server_checked: Option<bool>,
    #[serde(default)]
    pub user_submitted: Option<bool>,
    #[serde(default)]
    pub coords: Option<Vec<Vec<Vec<f64>>>>,
    #[serde(default)]
    pub client_meta_data: Option<ClientMetaData>,
    #[serde(default)]
    pub target_x: Option<f64>,
    #[serde(default)]
    pub target_y: Option<f64>,
    #[serde(default)]
    pub origin_x: Option<f64>,
    #[serde(default)]
    pub origin_y: Option<f64>,
    #[serde(default)]
    pub tolerance: Option<f64>,
    #[serde(default)]
    pub puzzle_events: Option<Vec<PointerEvent>>,
    #[serde(default)]
    pub answer: Option<String>,
    #[serde(default)]
    pub submitted_answer: Option<String>,
    #[serde(default)]
    pub replays: Option<f64>,
    #[serde(default)]
    pub audio_events: Option<Vec<AudioEvent>>,
    #[serde(default)]
    pub targets: Option<Vec<StoredIconTarget>>,
    #[serde(default)]
    pub clicks: Option<Vec<IconClick>>,
    #[serde(default)]
    pub icon_order_events: Option<Vec<PointerEvent>>,
}

/// `StoredCaptchaMetadata`.
#[derive(Debug, Clone, PartialEq, Eq, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredMetadata {
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub email_normalised: Option<String>,
}

/// `UserCommitment`: an image captcha commitment as the provider records it.
#[derive(Debug, Clone, PartialEq)]
pub struct UserCommitment {
    pub user_account: String,
    pub dapp_account: String,
    pub dataset_id: String,
    pub provider_account: String,
    pub id: String,
    pub result: StoredResult,
    pub user_signature: String,
    pub ip_address: CompositeIpAddress,
    pub provided_ip: Option<CompositeIpAddress>,
    pub metadata: Option<StoredMetadata>,
    pub client_meta_data: Option<ClientMetaData>,
    pub headers: Document,
    pub ja4: String,
    pub user_submitted: bool,
    pub server_checked: bool,
    pub ip_info: Option<Bson>,
    pub parsed_user_agent_info: Option<Bson>,
    pub stored_at_timestamp: Option<DateTime>,
    pub requested_at_timestamp: DateTime,
    pub submitted_at_timestamp: Option<DateTime>,
    pub verified_at_timestamp: Option<DateTime>,
    pub failed_at_timestamp: Option<DateTime>,
    pub last_updated_timestamp: Option<DateTime>,
    pub pending_stage: Option<bool>,
    pub session_id: Option<String>,
    pub coords: Option<Vec<Vec<Vec<f64>>>>,
    pub input_methods: Option<Vec<Vec<prosopo_types::datasets::InputMethod>>>,
    pub pending: bool,
    pub salt: String,
    pub request_hash: String,
    pub deadline_timestamp: DateTime,
    pub threshold: f64,
    pub device_capability: Option<String>,
    pub behavioral_data_packed: Option<Bson>,
    pub label: Option<prosopo_types::stored::CaptchaLabel>,
    pub label_reason: Option<String>,
    pub labelled_by: Option<String>,
    pub labelled_at: Option<DateTime>,
}

fn put<T: Into<Bson>>(out: &mut Document, key: &str, value: Option<T>) {
    if let Some(value) = value {
        out.insert(key, value.into());
    }
}

pub(crate) fn coords_bson(coords: &[Vec<Vec<f64>>]) -> Bson {
    use prosopo_types_database::number::js_number;
    Bson::Array(
        coords
            .iter()
            .map(|path| Bson::Array(path.iter().map(|point| Bson::Array(point.iter().map(|n| js_number(*n)).collect())).collect()))
            .collect(),
    )
}

impl UserCommitment {
    /// As `UserCommitmentSchema.parse` returns it: the declared fields in schema order, the
    /// absent ones left out.
    pub fn to_document(&self) -> Document {
        use prosopo_types_database::number::js_number;
        let mut out: Document = Document::new();
        out.insert("userAccount", self.user_account.as_str());
        out.insert("dappAccount", self.dapp_account.as_str());
        out.insert("datasetId", self.dataset_id.as_str());
        out.insert("providerAccount", self.provider_account.as_str());
        out.insert("id", self.id.as_str());
        out.insert("result", self.result.to_document());
        out.insert("userSignature", self.user_signature.as_str());
        out.insert("ipAddress", self.ip_address.to_document());
        put(&mut out, "providedIp", self.provided_ip.map(|ip| ip.to_document()));
        put(
            &mut out,
            "metadata",
            self.metadata.as_ref().map(|metadata| {
                let mut fields: Document = Document::new();
                put(&mut fields, "email", metadata.email.as_deref());
                put(&mut fields, "emailNormalised", metadata.email_normalised.as_deref());
                fields
            }),
        );
        put(
            &mut out,
            "clientMetaData",
            self.client_meta_data.as_ref().map(|meta| {
                let mut fields: Document = Document::new();
                put(&mut fields, "hp", meta.hp.as_deref());
                put(&mut fields, "clientSessionId", meta.client_session_id.as_deref());
                fields
            }),
        );
        out.insert("headers", self.headers.clone());
        out.insert("ja4", self.ja4.as_str());
        out.insert("userSubmitted", self.user_submitted);
        out.insert("serverChecked", self.server_checked);
        put(&mut out, "ipInfo", self.ip_info.clone());
        put(&mut out, "parsedUserAgentInfo", self.parsed_user_agent_info.clone());
        put(&mut out, "storedAtTimestamp", self.stored_at_timestamp);
        out.insert("requestedAtTimestamp", self.requested_at_timestamp);
        put(&mut out, "submittedAtTimestamp", self.submitted_at_timestamp);
        put(&mut out, "verifiedAtTimestamp", self.verified_at_timestamp);
        put(&mut out, "failedAtTimestamp", self.failed_at_timestamp);
        put(&mut out, "lastUpdatedTimestamp", self.last_updated_timestamp);
        put(&mut out, "pendingStage", self.pending_stage);
        put(&mut out, "sessionId", self.session_id.as_deref());
        put(&mut out, "coords", self.coords.as_deref().map(coords_bson));
        put(
            &mut out,
            "inputMethods",
            self.input_methods.as_ref().map(|rows| {
                Bson::Array(
                    rows.iter()
                        .map(|row| Bson::Array(row.iter().map(|method| Bson::from(method.as_str())).collect()))
                        .collect(),
                )
            }),
        );
        out.insert("pending", self.pending);
        out.insert("salt", self.salt.as_str());
        out.insert("requestHash", self.request_hash.as_str());
        out.insert("deadlineTimestamp", self.deadline_timestamp);
        out.insert("threshold", js_number(self.threshold));
        put(&mut out, "deviceCapability", self.device_capability.as_deref());
        put(&mut out, "behavioralDataPacked", self.behavioral_data_packed.clone());
        put(&mut out, "label", self.label.map(|label| label.as_str()));
        put(&mut out, "labelReason", self.label_reason.as_deref());
        put(&mut out, "labelledBy", self.labelled_by.as_deref());
        put(&mut out, "labelledAt", self.labelled_at);
        out
    }
}

/// `PendingImageCaptchaRequest`: what `getPendingImageCommitment` returns.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingImageCaptchaRequest {
    pub dapp_account: String,
    pub pending: bool,
    pub salt: String,
    pub request_hash: String,
    pub deadline_timestamp: DateTime,
    pub requested_at_timestamp: DateTime,
    pub ip_address: CompositeIpAddress,
    #[serde(default)]
    pub session_id: Option<String>,
    pub threshold: f64,
}

/// A commitment as the verify path's projection returns it.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitmentRecord {
    pub id: String,
    pub result: StoredResult,
    #[serde(default)]
    pub server_checked: Option<bool>,
    pub requested_at_timestamp: DateTime,
    #[serde(default)]
    pub submitted_at_timestamp: Option<DateTime>,
    #[serde(default)]
    pub verified_at_timestamp: Option<DateTime>,
    #[serde(default)]
    pub failed_at_timestamp: Option<DateTime>,
    pub ip_address: CompositeIpAddress,
    #[serde(default)]
    pub session_id: Option<String>,
    pub user_account: String,
    pub dapp_account: String,
    #[serde(default)]
    pub headers: Option<Bson>,
    #[serde(default)]
    pub ip_info: Option<Bson>,
    #[serde(default)]
    pub behavioral_data_packed: Option<Bson>,
    #[serde(default)]
    pub device_capability: Option<String>,
    #[serde(default)]
    pub coords: Option<Vec<Vec<Vec<f64>>>>,
    #[serde(default)]
    pub client_meta_data: Option<ClientMetaData>,
}

/// A user's solution to one captcha of a commitment.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserSolutionRecord {
    pub captcha_id: String,
    pub captcha_content_id: String,
    pub salt: String,
    #[serde(default)]
    pub solution: Vec<String>,
    pub processed: bool,
    #[serde(default)]
    pub checked: Option<bool>,
    pub commitment_id: String,
    #[serde(default)]
    pub created_at: Option<DateTime>,
}
