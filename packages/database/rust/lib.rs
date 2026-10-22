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

//! `@prosopo/database` on the official mongodb driver: the connection, the provider's database,
//! the central captcha store and the portal's client database.

pub mod captcha;
pub mod challenges;
pub mod client;
pub mod clients;
mod connection;
pub mod image;
pub mod mongo;
pub mod operation;
pub mod options;
pub mod provider;
pub mod records;
pub mod redis_cache;
pub mod scheduler;
pub mod session;
pub mod source;
pub mod streamer;
#[cfg(any(test, feature = "testing"))]
pub mod testing;

pub use mongo::{build_url, mask_credentials, MongoConnectionTimeouts, MongoDatabase, MongoError};

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod live;
#[cfg(test)]
mod methods;
#[cfg(test)]
mod redis_tests;
#[cfg(test)]
mod tests;
