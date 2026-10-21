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

//! api/ipapi.ts: the ipapi.is response, and `IPInfoResponse`, which the provider stores on
//! the session. The two backends build the result with different key orders, so a result
//! remembers which one built it and serialises in that order.

use crate::number::JsNumber;
use serde::ser::SerializeMap;
use serde::{Deserialize, Serialize, Serializer};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProviderType {
    Hosting,
    Education,
    Government,
    Banking,
    Business,
    Isp,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VpnType {
    ExitNode,
    VpnServer,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct IpApiDatacenterInfo {
    #[serde(default)]
    pub datacenter: Option<String>,
    #[serde(default)]
    pub network: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct IpApiCompanyInfo {
    #[serde(default)]
    pub name: Option<String>,
    /// For example `"0.0012 (Low)"`.
    #[serde(default)]
    pub abuser_score: Option<String>,
    #[serde(default, rename = "type")]
    pub company_type: Option<ProviderType>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct IpApiAsnInfo {
    #[serde(default)]
    pub asn: Option<JsNumber>,
    #[serde(default)]
    pub abuser_score: Option<String>,
    #[serde(default)]
    pub org: Option<String>,
    #[serde(default, rename = "type")]
    pub asn_type: Option<ProviderType>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct IpApiLocationInfo {
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub country_code: Option<String>,
    #[serde(default)]
    pub state: Option<String>,
    #[serde(default)]
    pub city: Option<String>,
    #[serde(default)]
    pub latitude: Option<JsNumber>,
    #[serde(default)]
    pub longitude: Option<JsNumber>,
    #[serde(default)]
    pub timezone: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct IpApiVpnInfo {
    #[serde(default)]
    pub service: Option<String>,
    #[serde(default, rename = "type")]
    pub vpn_type: Option<VpnType>,
}

/// The fields of an ipapi.is response the provider reads. Every field is optional because
/// the TS casts the JSON without validating it.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct IpApiResponse {
    #[serde(default)]
    pub ip: Option<String>,
    #[serde(default)]
    pub is_bogon: Option<bool>,
    #[serde(default)]
    pub is_mobile: Option<bool>,
    #[serde(default)]
    pub is_satellite: Option<bool>,
    #[serde(default)]
    pub is_crawler: Option<bool>,
    #[serde(default)]
    pub is_datacenter: Option<bool>,
    #[serde(default)]
    pub is_tor: Option<bool>,
    #[serde(default)]
    pub is_proxy: Option<bool>,
    #[serde(default)]
    pub is_vpn: Option<bool>,
    #[serde(default)]
    pub is_abuser: Option<bool>,
    #[serde(default)]
    pub datacenter: Option<IpApiDatacenterInfo>,
    #[serde(default)]
    pub company: Option<IpApiCompanyInfo>,
    #[serde(default)]
    pub asn: Option<IpApiAsnInfo>,
    #[serde(default)]
    pub location: Option<IpApiLocationInfo>,
    #[serde(default)]
    pub vpn: Option<IpApiVpnInfo>,
}

/// Which backend built a result, which fixes the key order it is stored in.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum IpInfoSource {
    MaxMind,
    #[default]
    IpApi,
}

/// `IPInfoResult`. Threat flags are optional because an ipapi.is response can omit them,
/// and the TS then stores them as absent.
#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IpInfoResult {
    #[serde(skip)]
    pub source: IpInfoSource,
    #[serde(default)]
    pub ip: Option<String>,
    #[serde(rename = "isVPN", default)]
    pub is_vpn: Option<bool>,
    #[serde(default)]
    pub is_tor: Option<bool>,
    #[serde(default)]
    pub is_proxy: Option<bool>,
    #[serde(default)]
    pub is_datacenter: Option<bool>,
    #[serde(default)]
    pub is_abuser: Option<bool>,
    #[serde(default)]
    pub is_mobile: Option<bool>,
    #[serde(default)]
    pub is_satellite: Option<bool>,
    #[serde(default)]
    pub is_crawler: Option<bool>,
    #[serde(default)]
    pub provider_name: Option<String>,
    #[serde(default)]
    pub provider_type: Option<ProviderType>,
    #[serde(default)]
    pub asn_number: Option<JsNumber>,
    #[serde(default)]
    pub asn_organization: Option<String>,
    /// The upstream `datacenter.datacenter`, kept apart from `providerName` for exact name
    /// comparisons.
    #[serde(default)]
    pub datacenter_name: Option<String>,
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub country_code: Option<String>,
    #[serde(default)]
    pub region: Option<String>,
    #[serde(default)]
    pub city: Option<String>,
    #[serde(default)]
    pub latitude: Option<JsNumber>,
    #[serde(default)]
    pub longitude: Option<JsNumber>,
    #[serde(default)]
    pub timezone: Option<String>,
    #[serde(default)]
    pub vpn_service: Option<String>,
    #[serde(default)]
    pub vpn_type: Option<VpnType>,
    #[serde(default)]
    pub abuser_score: Option<JsNumber>,
    #[serde(default)]
    pub company_abuser_score: Option<JsNumber>,
}

impl IpInfoResult {
    fn entries(&self) -> Vec<(&'static str, Option<serde_json::Value>)> {
        fn value<T: Serialize>(field: &Option<T>) -> Option<serde_json::Value> {
            field.as_ref().and_then(|field| serde_json::to_value(field).ok())
        }
        let head: Vec<(&'static str, Option<serde_json::Value>)> = vec![
            ("ip", value(&self.ip)),
            ("isValid", Some(serde_json::Value::Bool(true))),
            ("isVPN", value(&self.is_vpn)),
            ("isTor", value(&self.is_tor)),
            ("isProxy", value(&self.is_proxy)),
            ("isDatacenter", value(&self.is_datacenter)),
            ("isAbuser", value(&self.is_abuser)),
            ("isMobile", value(&self.is_mobile)),
            ("isSatellite", value(&self.is_satellite)),
            ("isCrawler", value(&self.is_crawler)),
        ];
        let geo: Vec<(&'static str, Option<serde_json::Value>)> = vec![
            ("country", value(&self.country)),
            ("countryCode", value(&self.country_code)),
            ("region", value(&self.region)),
            ("city", value(&self.city)),
            ("latitude", value(&self.latitude)),
            ("longitude", value(&self.longitude)),
            ("timezone", value(&self.timezone)),
        ];
        let tail: Vec<(&'static str, Option<serde_json::Value>)> = match self.source {
            IpInfoSource::MaxMind => vec![
                ("asnNumber", value(&self.asn_number)),
                ("asnOrganization", value(&self.asn_organization)),
                ("providerName", value(&self.provider_name)),
                ("providerType", value(&self.provider_type)),
            ],
            IpInfoSource::IpApi => vec![
                ("providerName", value(&self.provider_name)),
                ("providerType", value(&self.provider_type)),
                ("asnNumber", value(&self.asn_number)),
                ("asnOrganization", value(&self.asn_organization)),
                ("datacenterName", value(&self.datacenter_name)),
            ],
        };
        match self.source {
            IpInfoSource::MaxMind => head.into_iter().chain(geo).chain(tail).collect(),
            IpInfoSource::IpApi => head
                .into_iter()
                .chain(tail)
                .chain(geo)
                .chain([
                    ("vpnService", value(&self.vpn_service)),
                    ("vpnType", value(&self.vpn_type)),
                    ("abuserScore", value(&self.abuser_score)),
                    ("companyAbuserScore", value(&self.company_abuser_score)),
                ])
                .collect(),
        }
    }
}

/// Keys in the order the building backend's object literal lists them; absent values are
/// skipped, as `JSON.stringify` skips `undefined`.
impl Serialize for IpInfoResult {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let entries: Vec<(&'static str, serde_json::Value)> = self
            .entries()
            .into_iter()
            .filter_map(|(key, value)| value.map(|value| (key, value)))
            .collect();
        let mut map = serializer.serialize_map(Some(entries.len()))?;
        for (key, value) in &entries {
            map.serialize_entry(key, value)?;
        }
        map.end()
    }
}

/// `IPInfoError`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IpInfoError {
    is_valid: bool,
    pub error: String,
    pub ip: String,
}

impl IpInfoError {
    pub fn new(error: impl Into<String>, ip: impl Into<String>) -> IpInfoError {
        IpInfoError {
            is_valid: false,
            error: error.into(),
            ip: ip.into(),
        }
    }
}

/// `IPInfoResponse`, told apart by `isValid`.
#[derive(Debug, Clone, PartialEq)]
pub enum IpInfoResponse {
    Valid(Box<IpInfoResult>),
    Invalid(IpInfoError),
}

impl IpInfoResponse {
    pub fn error(error: impl Into<String>, ip: impl Into<String>) -> IpInfoResponse {
        IpInfoResponse::Invalid(IpInfoError::new(error, ip))
    }

    pub fn is_valid(&self) -> bool {
        matches!(self, IpInfoResponse::Valid(_))
    }
}

impl Serialize for IpInfoResponse {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            IpInfoResponse::Valid(result) => result.serialize(serializer),
            IpInfoResponse::Invalid(error) => error.serialize(serializer),
        }
    }
}

impl<'de> Deserialize<'de> for IpInfoResponse {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<IpInfoResponse, D::Error> {
        let value: serde_json::Value = serde_json::Value::deserialize(deserializer)?;
        let valid: bool = value.get("isValid").and_then(serde_json::Value::as_bool) == Some(true);
        if valid {
            serde_json::from_value(value)
                .map(|result| IpInfoResponse::Valid(Box::new(result)))
                .map_err(serde::de::Error::custom)
        } else {
            serde_json::from_value(value)
                .map(IpInfoResponse::Invalid)
                .map_err(serde::de::Error::custom)
        }
    }
}
