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

//! The MaxMind backend: geo and ASN databases read in-process.

use crate::net::is_ip;
use prosopo_logger::{ErrorObject, LogRecord, Logger};
use prosopo_types::ipapi::{IpInfoResponse, IpInfoResult, IpInfoSource, ProviderType};
use prosopo_types::JsNumber;
use serde::Deserialize;
use serde_json::json;
use std::net::IpAddr;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU8, Ordering};

#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
pub struct Names {
    #[serde(default)]
    pub en: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CountryRecord {
    #[serde(default)]
    pub iso_code: Option<String>,
    #[serde(default)]
    pub names: Option<Names>,
}

/// A city or a subdivision: only its names are read.
#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
pub struct NamedRecord {
    #[serde(default)]
    pub names: Option<Names>,
}

#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Location {
    #[serde(default)]
    pub latitude: Option<f64>,
    #[serde(default)]
    pub longitude: Option<f64>,
    #[serde(default)]
    pub time_zone: Option<String>,
}

/// geoip2-node's `traits`; its boolean flags default to false.
#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Traits {
    #[serde(default)]
    pub is_anonymous_vpn: bool,
    #[serde(default)]
    pub is_tor_exit_node: bool,
    #[serde(default)]
    pub is_public_proxy: bool,
    #[serde(default)]
    pub is_residential_proxy: bool,
    #[serde(default)]
    pub is_hosting_provider: bool,
    #[serde(default)]
    pub is_satellite_provider: bool,
    #[serde(default)]
    pub autonomous_system_number: Option<f64>,
    #[serde(default)]
    pub autonomous_system_organization: Option<String>,
    #[serde(default)]
    pub user_type: Option<String>,
}

/// geoip2-node's `Country` model.
#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
pub struct CountryModel {
    #[serde(default)]
    pub country: Option<CountryRecord>,
    #[serde(default)]
    pub traits: Option<Traits>,
}

/// geoip2-node's `City` model, which extends `Country`.
#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
pub struct CityModel {
    #[serde(default)]
    pub country: Option<CountryRecord>,
    #[serde(default)]
    pub traits: Option<Traits>,
    #[serde(default)]
    pub city: Option<NamedRecord>,
    #[serde(default)]
    pub subdivisions: Option<Vec<NamedRecord>>,
    #[serde(default)]
    pub location: Option<Location>,
}

#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AsnModel {
    #[serde(default)]
    pub autonomous_system_number: Option<f64>,
    #[serde(default)]
    pub autonomous_system_organization: Option<String>,
}

/// A lookup failure. `BadMethodCall` is the accessor not matching the database type, which
/// the backend reacts to; every other failure only means no answer.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ReaderError {
    BadMethodCall(String),
    Other { name: String, message: String },
}

impl ReaderError {
    fn to_error_object(&self) -> ErrorObject {
        match self {
            ReaderError::BadMethodCall(message) => {
                ErrorObject::new("BadMethodCallError", message.clone())
            }
            ReaderError::Other { name, message } => ErrorObject::new(name.clone(), message.clone()),
        }
    }
}

/// geoip2-node's `ReaderModel`, as much of it as the backend uses.
pub trait GeoReader: Send + Sync {
    fn city(&self, ip: &str) -> Result<CityModel, ReaderError>;
    fn country(&self, ip: &str) -> Result<CountryModel, ReaderError>;
    fn asn(&self, ip: &str) -> Result<AsnModel, ReaderError>;
}

/// Opens a database file; injected so tests need no `.mmdb` on disk.
pub type OpenReader = Box<dyn Fn(&Path) -> Result<Box<dyn GeoReader>, ReaderError> + Send + Sync>;

/// An empty path is unset, as it is to the TS truthiness check.
fn configured_path(path: &Option<PathBuf>) -> Option<PathBuf> {
    path.clone().filter(|path| !path.as_os_str().is_empty())
}

pub struct MaxMindBackendConfig {
    pub city_db_path: Option<PathBuf>,
    pub asn_db_path: Option<PathBuf>,
    pub logger: Option<Logger>,
    pub open_reader: Option<OpenReader>,
}

const KIND_UNKNOWN: u8 = 0;
const KIND_CITY: u8 = 1;
const KIND_COUNTRY: u8 = 2;

/// The geo database is opened by path, and production points `cityDbPath` at a Country
/// database, whose `city()` always fails. Which accessor works is latched on the first
/// `BadMethodCall` and shared by `country_code` and `lookup`.
pub struct MaxMindBackend {
    config: MaxMindBackendConfig,
    city_reader: Option<Box<dyn GeoReader>>,
    asn_reader: Option<Box<dyn GeoReader>>,
    geo_reader_kind: AtomicU8,
}

impl MaxMindBackend {
    pub fn new(config: MaxMindBackendConfig) -> MaxMindBackend {
        MaxMindBackend {
            config,
            city_reader: None,
            asn_reader: None,
            geo_reader_kind: AtomicU8::new(KIND_UNKNOWN),
        }
    }

    fn open(&self, path: &Path) -> Result<Box<dyn GeoReader>, ReaderError> {
        match &self.config.open_reader {
            Some(open) => open(path),
            None => MmdbReader::open(path).map(|reader| Box::new(reader) as Box<dyn GeoReader>),
        }
    }

    fn open_logged(&self, path: &Path, kind: &str) -> Option<Box<dyn GeoReader>> {
        let data = json!({ "dbPath": path.to_string_lossy() });
        match self.open(path) {
            Ok(reader) => {
                if let Some(logger) = &self.config.logger {
                    logger.info(|| {
                        LogRecord::msg(format!("MaxMind {kind} reader initialized")).with_data(data)
                    });
                }
                Some(reader)
            }
            Err(error) => {
                if let Some(logger) = &self.config.logger {
                    logger.warn(|| {
                        LogRecord::msg(format!("Failed to initialize MaxMind {kind} reader"))
                            .with_err(error.to_error_object())
                            .with_data(data)
                    });
                }
                None
            }
        }
    }

    pub fn initialize(&mut self) {
        if let Some(path) = configured_path(&self.config.city_db_path) {
            self.city_reader = self.open_logged(&path, "City");
        }
        if let Some(path) = configured_path(&self.config.asn_db_path) {
            self.asn_reader = self.open_logged(&path, "ASN");
        }
    }

    pub fn is_available(&self) -> bool {
        self.city_reader.is_some() || self.asn_reader.is_some()
    }

    fn kind(&self) -> u8 {
        self.geo_reader_kind.load(Ordering::Acquire)
    }

    fn latch(&self, kind: u8) {
        self.geo_reader_kind.store(kind, Ordering::Release);
    }

    /// The ISO 3166-1 alpha-2 country code, or `None` when there is no answer.
    pub fn country_code(&self, ip: &str) -> Option<String> {
        let reader: &dyn GeoReader = self.city_reader.as_deref()?;
        if self.kind() != KIND_COUNTRY {
            match reader.city(ip) {
                Ok(city) => {
                    self.latch(KIND_CITY);
                    return city.country.and_then(|country| country.iso_code);
                }
                Err(ReaderError::BadMethodCall(_)) => self.latch(KIND_COUNTRY),
                Err(ReaderError::Other { .. }) => return None,
            }
        }
        reader
            .country(ip)
            .ok()?
            .country
            .and_then(|country| country.iso_code)
    }

    fn debug(&self, msg: &str, ip: &str, error: &ReaderError) {
        if let Some(logger) = &self.config.logger {
            logger.debug(|| {
                LogRecord::msg(msg)
                    .with_data(json!({ "ip": ip }))
                    .with_err(error.to_error_object())
            });
        }
    }

    pub fn lookup(&self, ip: &str) -> IpInfoResponse {
        if !self.is_available() {
            return IpInfoResponse::error("MaxMind readers not initialized", ip);
        }
        let mut city_data: Option<CityModel> = None;
        let mut country_data: Option<CountryModel> = None;
        let mut asn_data: Option<AsnModel> = None;

        if let Some(reader) = self.city_reader.as_deref() {
            if self.kind() != KIND_COUNTRY {
                match reader.city(ip) {
                    Ok(city) => {
                        city_data = Some(city);
                        self.latch(KIND_CITY);
                    }
                    Err(error @ ReaderError::BadMethodCall(_)) => {
                        self.latch(KIND_COUNTRY);
                        if let Some(logger) = &self.config.logger {
                            logger.warn(|| {
                                LogRecord::msg("MaxMind geo database is not a City database; falling back to country-level lookups")
                                    .with_data(json!({ "dbPath": self.config.city_db_path.as_ref().map(|path| path.to_string_lossy()) }))
                                    .with_err(error.to_error_object())
                            });
                        }
                    }
                    Err(error) => self.debug("MaxMind City lookup failed", ip, &error),
                }
            }
            if self.kind() == KIND_COUNTRY {
                match reader.country(ip) {
                    Ok(country) => country_data = Some(country),
                    Err(error) => self.debug("MaxMind Country lookup failed", ip, &error),
                }
            }
        }

        if let Some(reader) = self.asn_reader.as_deref() {
            match reader.asn(ip) {
                Ok(asn) => asn_data = Some(asn),
                Err(error) => self.debug("MaxMind ASN lookup failed", ip, &error),
            }
        }

        let (geo_country, geo_traits): (Option<CountryRecord>, Option<Traits>) =
            match (&city_data, &country_data) {
                (Some(city), _) => (city.country.clone(), city.traits.clone()),
                (None, Some(country)) => (country.country.clone(), country.traits.clone()),
                (None, None) => (None, None),
            };
        let has_geo: bool = city_data.is_some() || country_data.is_some();
        if !has_geo && asn_data.is_none() {
            return IpInfoResponse::error("No MaxMind data available for IP", ip);
        }
        let traits: Traits = geo_traits.clone().unwrap_or_default();
        let flag = |value: bool| -> Option<bool> { Some(value) };
        let english = |names: &Option<Names>| -> Option<String> {
            names.as_ref().and_then(|names| names.en.clone())
        };
        let city: Option<&CityModel> = city_data.as_ref();
        let location: Option<&Location> = city.and_then(|city| city.location.as_ref());
        let asn_number: Option<f64> = geo_traits
            .as_ref()
            .and_then(|traits| traits.autonomous_system_number)
            .or_else(|| {
                asn_data
                    .as_ref()
                    .and_then(|asn| asn.autonomous_system_number)
            });
        let asn_organization: Option<String> = geo_traits
            .as_ref()
            .and_then(|traits| traits.autonomous_system_organization.clone())
            .or_else(|| {
                asn_data
                    .as_ref()
                    .and_then(|asn| asn.autonomous_system_organization.clone())
            });
        IpInfoResponse::Valid(Box::new(IpInfoResult {
            source: IpInfoSource::MaxMind,
            ip: Some(ip.to_string()),
            is_vpn: flag(traits.is_anonymous_vpn),
            is_tor: flag(traits.is_tor_exit_node),
            is_proxy: flag(traits.is_public_proxy || traits.is_residential_proxy),
            is_datacenter: flag(traits.is_hosting_provider),
            is_abuser: flag(false),
            is_mobile: flag(false),
            is_satellite: flag(traits.is_satellite_provider),
            is_crawler: flag(false),
            country: geo_country
                .as_ref()
                .and_then(|country| english(&country.names)),
            country_code: geo_country
                .as_ref()
                .and_then(|country| country.iso_code.clone()),
            region: city
                .and_then(|city| city.subdivisions.as_ref())
                .and_then(|subdivisions| subdivisions.first())
                .and_then(|subdivision| english(&subdivision.names)),
            city: city
                .and_then(|city| city.city.as_ref())
                .and_then(|record| english(&record.names)),
            latitude: location
                .and_then(|location| location.latitude)
                .map(JsNumber),
            longitude: location
                .and_then(|location| location.longitude)
                .map(JsNumber),
            timezone: location.and_then(|location| location.time_zone.clone()),
            asn_number: asn_number.map(JsNumber),
            asn_organization: asn_organization.clone(),
            provider_name: asn_organization,
            provider_type: map_user_type(
                geo_traits
                    .as_ref()
                    .and_then(|traits| traits.user_type.as_deref()),
            ),
            ..IpInfoResult::default()
        }))
    }
}

/// `mapUserType`: MaxMind's user type as an ipapi.is provider type.
pub fn map_user_type(user_type: Option<&str>) -> Option<ProviderType> {
    match user_type? {
        "hosting" | "content_delivery_network" => Some(ProviderType::Hosting),
        "college" | "school" | "library" => Some(ProviderType::Education),
        "government" | "military" => Some(ProviderType::Government),
        "business" => Some(ProviderType::Business),
        "residential" | "cellular" | "dialup" | "cafe" | "traveler" | "router" => {
            Some(ProviderType::Isp)
        }
        _ => None,
    }
}

/// A `.mmdb` read with the maxminddb crate, checked the way geoip2-node checks: the address
/// first (Node's `net.isIP`), then that the database type supports the accessor.
pub struct MmdbReader {
    reader: maxminddb::Reader<Vec<u8>>,
}

impl MmdbReader {
    pub fn open(path: &Path) -> Result<MmdbReader, ReaderError> {
        maxminddb::Reader::open_readfile(path)
            .map(|reader| MmdbReader { reader })
            .map_err(|error| ReaderError::Other {
                name: "Error".to_string(),
                message: error.to_string(),
            })
    }

    fn record<T: serde::de::DeserializeOwned>(
        &self,
        ip: &str,
        database_type: &str,
        accessor: &str,
    ) -> Result<T, ReaderError> {
        if !is_ip(ip) {
            return Err(ReaderError::Other {
                name: "ValueError".to_string(),
                message: format!("{ip} is invalid"),
            });
        }
        let meta_type: &str = &self.reader.metadata.database_type;
        if !meta_type.contains(database_type) {
            return Err(ReaderError::BadMethodCall(format!(
                "The {accessor} method cannot be used with the {meta_type} database"
            )));
        }
        let not_found = || ReaderError::Other {
            name: "AddressNotFoundError".to_string(),
            message: format!("The address {ip} is not in the database"),
        };
        let address: IpAddr = ip
            .split('%')
            .next()
            .unwrap_or(ip)
            .parse()
            .map_err(|_| not_found())?;
        let raw: Option<serde_json::Value> =
            self.reader
                .lookup(address)
                .map_err(|error| ReaderError::Other {
                    name: "Error".to_string(),
                    message: error.to_string(),
                })?;
        let raw: serde_json::Value = raw.ok_or_else(not_found)?;
        serde_json::from_value(camel_case_keys(raw)).map_err(|error| ReaderError::Other {
            name: "Error".to_string(),
            message: error.to_string(),
        })
    }
}

/// geoip2-node's `camelcaseKeys`: `iso_code` becomes `isoCode`, recursively.
fn camel_case_keys(value: serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(object) => serde_json::Value::Object(
            object
                .into_iter()
                .map(|(key, value)| (snake_to_camel(&key), camel_case_keys(value)))
                .collect(),
        ),
        serde_json::Value::Array(items) => {
            serde_json::Value::Array(items.into_iter().map(camel_case_keys).collect())
        }
        other => other,
    }
}

fn snake_to_camel(key: &str) -> String {
    let mut out: String = String::with_capacity(key.len());
    let mut upper: bool = false;
    for c in key.chars() {
        if c == '_' {
            upper = true;
        } else if upper {
            out.extend(c.to_uppercase());
            upper = false;
        } else {
            out.push(c);
        }
    }
    out
}

impl GeoReader for MmdbReader {
    fn city(&self, ip: &str) -> Result<CityModel, ReaderError> {
        self.record(ip, "City", "city()")
    }

    fn country(&self, ip: &str) -> Result<CountryModel, ReaderError> {
        self.record(ip, "Country", "country()")
    }

    fn asn(&self, ip: &str) -> Result<AsnModel, ReaderError> {
        self.record(ip, "ASN", "asn()")
    }
}
