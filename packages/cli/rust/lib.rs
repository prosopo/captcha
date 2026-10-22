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

//! `@prosopo/cli`: the provider's entry point: its config from the environment, and the API
//! started from it (the `prosopo-provider` binary).

pub mod commands;
mod config;
mod dataset;
mod process_env;
mod rate_limiter;
mod start;

pub use config::{get_config, ConfigError, Environment};
pub use process_env::{get_address, get_db, get_password, get_secret};
pub use rate_limiter::get_rate_limit_config;
pub use start::{app_parts, locales, provider_router, start, version, AppParts};

#[cfg(test)]
mod config_equivalence;
#[cfg(test)]
mod pipeline_equivalence;
