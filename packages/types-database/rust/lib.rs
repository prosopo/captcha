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

//! The database schemas of `@prosopo/types-database`: what mongoose would store for each
//! record, byte for byte, and the indexes it would create. See `schema` for how a schema is
//! declared and `document` for how a stored document is built from one.

pub mod captcha;
pub mod client;
pub mod document;
pub mod number;
pub mod projection;
pub mod provider;
pub mod scheduled_task;
pub mod schema;
pub mod update;

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod tests;
