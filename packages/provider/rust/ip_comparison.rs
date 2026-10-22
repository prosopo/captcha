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

//! services/ipComparison.ts.

use prosopo_ipinfo::IpInfoService;
use prosopo_types::ipapi::{
    IpComparison, IpComparisonError, IpComparisonResponse, IpComparisonResult, IpConnectionType, IpCoordinates, IpDetails,
    IpInfoResponse, IpInfoResult, ProviderType,
};
use prosopo_types::JsNumber;
use std::future::Future;
use std::pin::Pin;

pub type LookupFuture<'a> = Pin<Box<dyn Future<Output = IpInfoResponse> + Send + 'a>>;

/// What the comparison needs of the IP information service.
pub trait IpInfoLookup: Send + Sync {
    fn lookup<'a>(&'a self, ip: &'a str) -> LookupFuture<'a>;
}

impl IpInfoLookup for IpInfoService {
    fn lookup<'a>(&'a self, ip: &'a str) -> LookupFuture<'a> {
        Box::pin(IpInfoService::lookup(self, ip))
    }
}

/// geolib's `getDistance`, in metres: the spherical law of cosines on geolib's earth radius,
/// rounded to the metre.
fn distance_metres(from: IpCoordinates, to: IpCoordinates) -> f64 {
    const EARTH_RADIUS: f64 = 6_378_137.0;
    let to_rad = |degrees: f64| degrees * (std::f64::consts::PI / 180.0);
    let from_lat: f64 = to_rad(from.latitude.get());
    let to_lat: f64 = to_rad(to.latitude.get());
    let delta_lon: f64 = to_rad(from.longitude.get() - to.longitude.get());
    let cosine: f64 = to_lat.sin() * from_lat.sin() + to_lat.cos() * from_lat.cos() * delta_lon.cos();
    let distance: f64 = cosine.clamp(-1.0, 1.0).acos() * EARTH_RADIUS;
    prosopo_types::js_math_round(distance)
}

fn connection_type(info: &IpInfoResult) -> IpConnectionType {
    if info.is_mobile == Some(true) {
        return IpConnectionType::Mobile;
    }
    if info.is_datacenter == Some(true) {
        return IpConnectionType::Datacenter;
    }
    if info.is_satellite == Some(true) {
        return IpConnectionType::Satellite;
    }
    match info.provider_type {
        Some(ProviderType::Isp) => IpConnectionType::Residential,
        Some(ProviderType::Hosting) => IpConnectionType::Datacenter,
        Some(ProviderType::Business | ProviderType::Education | ProviderType::Government | ProviderType::Banking) => {
            IpConnectionType::Residential
        }
        None => IpConnectionType::Unknown,
    }
}

/// JS `a || b` over flags that may be unknown.
fn either(a: Option<bool>, b: Option<bool>) -> Option<bool> {
    if a == Some(true) {
        a
    } else {
        b
    }
}

fn coordinates(info: &IpInfoResult) -> Option<IpCoordinates> {
    Some(IpCoordinates {
        latitude: info.latitude?,
        longitude: info.longitude?,
    })
}

fn provider(info: &IpInfoResult) -> String {
    [&info.provider_name, &info.asn_organization]
        .into_iter()
        .flatten()
        .find(|name| !name.is_empty())
        .cloned()
        .unwrap_or_else(|| "Unknown".to_string())
}

fn details(info: &IpInfoResult) -> IpDetails {
    IpDetails {
        provider: Some(provider(info)),
        connection_type: connection_type(info),
        is_vpn_or_proxy: either(either(info.is_vpn, info.is_proxy), info.is_tor),
        country: info.country.clone(),
        country_code: info.country_code.clone(),
        city: info.city.clone(),
        coordinates: coordinates(info),
        abuser_score: info.abuser_score,
    }
}

fn lookup_error(info: &IpInfoResponse) -> Option<String> {
    match info {
        IpInfoResponse::Invalid(error) => Some(error.error.clone()),
        IpInfoResponse::Valid(_) => None,
    }
}

/// `compareIPs`: whether two addresses match, and when they do not, how far apart they are,
/// on which networks, and whether either hides behind a VPN or proxy.
pub async fn compare_ips(ip1: &str, ip2: &str, service: &dyn IpInfoLookup) -> IpComparisonResponse {
    let failure = |error: &str, ip1_error: Option<String>, ip2_error: Option<String>| {
        IpComparisonResponse::Error(IpComparisonError {
            error: error.to_string(),
            ip1: if ip1.is_empty() { "undefined".to_string() } else { ip1.to_string() },
            ip2: if ip2.is_empty() { "undefined".to_string() } else { ip2.to_string() },
            ip1_error,
            ip2_error,
        })
    };
    if ip1.is_empty() || ip2.is_empty() {
        return failure("Invalid IP addresses provided", None, None);
    }
    if ip1 == ip2 {
        return IpComparisonResponse::Result(Box::new(IpComparisonResult {
            ips_match: true,
            ip1: ip1.to_string(),
            ip2: ip2.to_string(),
            comparison: None,
        }));
    }
    let (info1, info2) = tokio::join!(service.lookup(ip1), service.lookup(ip2));
    let (first, second) = match (&info1, &info2) {
        (IpInfoResponse::Valid(first), IpInfoResponse::Valid(second)) => (first, second),
        (IpInfoResponse::Invalid(_), IpInfoResponse::Invalid(_)) => {
            return failure("Failed to lookup both IP addresses", lookup_error(&info1), lookup_error(&info2));
        }
        (IpInfoResponse::Invalid(_), _) => return failure("Failed to lookup first IP address", lookup_error(&info1), None),
        (_, IpInfoResponse::Invalid(_)) => return failure("Failed to lookup second IP address", None, lookup_error(&info2)),
    };
    let ip1_details: IpDetails = details(first);
    let ip2_details: IpDetails = details(second);
    let distance_km: Option<JsNumber> = match (ip1_details.coordinates, ip2_details.coordinates) {
        (Some(from), Some(to)) => Some(JsNumber(distance_metres(from, to) / 1000.0)),
        _ => None,
    };
    IpComparisonResponse::Result(Box::new(IpComparisonResult {
        ips_match: false,
        ip1: ip1.to_string(),
        ip2: ip2.to_string(),
        comparison: Some(IpComparison {
            different_providers: ip1_details.provider != ip2_details.provider,
            different_connection_types: ip1_details.connection_type != ip2_details.connection_type,
            distance_km,
            any_vpn_or_proxy: either(ip1_details.is_vpn_or_proxy, ip2_details.is_vpn_or_proxy),
            ip1_details,
            ip2_details,
        }),
    }))
}
