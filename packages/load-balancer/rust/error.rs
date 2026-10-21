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

use prosopo_common::ProsopoError;
use std::fmt;

#[derive(Debug, Clone, PartialEq)]
pub enum LoadBalancerError {
    /// A thrown `Error`, `TypeError` or `SyntaxError`, by message.
    Message(String),
    /// The provider-list request outlived its time budget (the TS `TimeoutError`).
    TimedOut,
    /// `getLoadBalancerUrl`'s `ProsopoEnvError("CONFIG.UNKNOWN_ENVIRONMENT")`.
    UnknownEnvironment(Box<ProsopoError>),
}

impl fmt::Display for LoadBalancerError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LoadBalancerError::Message(message) => f.write_str(message),
            LoadBalancerError::TimedOut => f.write_str("The operation was aborted due to timeout"),
            LoadBalancerError::UnknownEnvironment(error) => f.write_str(error.message()),
        }
    }
}

impl std::error::Error for LoadBalancerError {}

pub type Result<T> = std::result::Result<T, LoadBalancerError>;

pub(crate) fn thrown(message: impl Into<String>) -> LoadBalancerError {
    LoadBalancerError::Message(message.into())
}
