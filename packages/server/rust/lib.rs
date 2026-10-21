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

//! The server SDK: a site owner's back end verifying procaptcha tokens with the provider
//! that issued them.

mod config;
mod server;

pub use config::{get_server_config, get_server_url, server_config_input, ConfigError};
pub use server::{
    detect_ip_mode, is_recent, public_prosopo_server, ProsopoServer, ProviderVerification, Recency,
    SharedI18n, VerifyError, MAX_CLOCK_SKEW_MS,
};

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod test_support;
#[cfg(test)]
mod tests;
