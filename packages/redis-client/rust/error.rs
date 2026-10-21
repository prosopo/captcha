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

use std::fmt;

/// Cloneable so one failed connect or index setup can be handed to every waiting caller, as
/// the TS shares one rejected promise.
#[derive(Debug, Clone)]
pub enum RedisClientError {
    /// What node-redis's `createClient` throws for bad `url`/`password` options; `name` is the
    /// JS error class (`TypeError`, `URIError`).
    InvalidOptions {
        name: &'static str,
        message: String,
    },
    /// A database node-redis would accept but `SELECT` cannot take as an integer (`/2.5`,
    /// `/Infinity`). node-redis fails every handshake on these; the port refuses them up front.
    UnsupportedDatabase(String),
    Redis(redis::RedisError),
    /// The task driving the first connect or index setup ended without a result, which only
    /// happens when the tokio runtime is shutting down.
    Abandoned,
}

impl fmt::Display for RedisClientError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RedisClientError::InvalidOptions { name, message } => write!(f, "{name}: {message}"),
            RedisClientError::UnsupportedDatabase(database) => {
                write!(f, "Unsupported Redis database {database}")
            }
            RedisClientError::Redis(error) => write!(f, "{error}"),
            RedisClientError::Abandoned => f.write_str("Redis setup was abandoned"),
        }
    }
}

impl std::error::Error for RedisClientError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            RedisClientError::Redis(error) => Some(error),
            RedisClientError::InvalidOptions { .. }
            | RedisClientError::UnsupportedDatabase(_)
            | RedisClientError::Abandoned => None,
        }
    }
}

impl From<redis::RedisError> for RedisClientError {
    fn from(error: redis::RedisError) -> RedisClientError {
        RedisClientError::Redis(error)
    }
}
