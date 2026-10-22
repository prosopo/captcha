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

//! `@prosopo/provider`: the provider service, ported in the phases of MIGRATION.md §3.

pub mod api;
pub mod client_meta_data;
pub mod composite_ip;
pub mod dns;
pub mod hashing;
pub mod tasks;
pub mod ip_comparison;
pub mod ip_validation;
pub mod mobile_signals;
pub mod util;

#[cfg(any(test, feature = "testing"))]
pub mod http_replay;
#[cfg(test)]
mod metrics_equivalence;
#[cfg(test)]
mod signals_equivalence;
#[cfg(test)]
mod public_equivalence;
#[cfg(test)]
mod tests;
#[cfg(test)]
mod util_equivalence;
#[cfg(test)]
mod detection_equivalence;
