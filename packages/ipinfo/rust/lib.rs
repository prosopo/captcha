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

//! Rust port of `@prosopo/ipinfo`: IP geolocation and threat data from ipapi.is and local
//! MaxMind databases.

mod ipapi;
mod js;
mod maxmind;
mod net;
mod non_routable;
mod service;

pub use ipapi::{
    parse_abuser_score, Fetch, FetchError, FetchFuture, FetchRequest, FetchResponse, IpapiBackend,
    IpapiBackendConfig, ReqwestFetch, DEFAULT_TIMEOUT_MS,
};
pub use maxmind::{
    map_user_type, AsnModel, CityModel, CountryModel, CountryRecord, GeoReader, Location,
    MaxMindBackend, MaxMindBackendConfig, MmdbReader, NamedRecord, Names, OpenReader, ReaderError,
    Traits,
};
pub use net::is_ip;
pub use non_routable::is_non_routable;
pub use service::{
    BackendError, IpInfoBackends, IpInfoService, IpInfoServiceConfig, LocalBackend, LookupFuture,
    RemoteBackend,
};

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod tests;
