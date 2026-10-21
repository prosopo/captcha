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

//! Rust port of `@prosopo/redis-client`: a lazily connecting Redis client with readiness
//! tracking, and RediSearch index setup that only rebuilds an index when its definition hash
//! (kept in `_index_hashes`, identical to the TS one) changes.

mod client;
mod error;
pub mod index;
mod js;
mod options;
mod redis_index;
mod url;

pub use client::{connect_to_redis, setup_redis_index, RedisClient, RedisConnection, RedisOptions};
pub use error::RedisClientError;
pub use index::{create_index_args, create_index_hash, RedisIndex};
pub use redis_index::{create_redis_index, delete_redis_index, IndexCommands, INDEX_HASHES_KEY};
pub use url::redact_redis_url;

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod tests;
