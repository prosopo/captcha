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

//! `@prosopo/env`: what a provider process holds, and gets ready before it serves: its config,
//! its key pair, its database and its IP information service. The interfaces of
//! `@prosopo/types-env` are this crate's types.

mod env;
mod provider;

pub use env::{default_database_builder, is_maintenance_mode, DatabaseBuilder, DatabaseSettings, Environment};
pub use provider::ProviderEnvironment;

#[cfg(test)]
mod tests;
