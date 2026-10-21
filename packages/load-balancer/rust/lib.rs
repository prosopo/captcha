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

//! Rust port of `@prosopo/load-balancer`, server side: the provider list (the
//! `PROSOPO_PROVIDER_LIST` override, the development provider, or Prosopo's hosted list) and
//! the cached lookup the provider forwards verifications with.

mod balancer;
mod error;
mod js;
mod overrides;
mod providers;

pub use balancer::{
    convert_hosted_provider, get_load_balancer_url, get_provider_hostname,
    get_provider_list_override, strip_ip_mode_label, EnvLookup, FetchFuture, HardcodedProvider,
    IpMode, LoadBalancer, ProviderListFetch, ReqwestFetch, PROVIDER_LIST_FETCH_TIMEOUT_MS,
};
pub use error::{LoadBalancerError, Result};
pub use overrides::{
    get_development_provider_url, read_development_provider_url_override,
    read_provider_list_override, DEFAULT_DEVELOPMENT_PROVIDER_URL, DEVELOPMENT_PROVIDER_URL_ENV,
    PROVIDER_LIST_ENV,
};
pub use providers::{
    Clock, LoadFuture, LoadProviders, ProviderDirectory, ProviderList,
    PROVIDER_LIST_MISS_RELOAD_MS, PROVIDER_LIST_TTL_MS,
};

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod tests;
