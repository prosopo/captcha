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

//! Rust port of `@prosopo/common` (server-side subset): the `ProsopoError` hierarchy, which
//! logs itself on construction, `unwrapError`, which turns any thrown error into the API error
//! body, and `chunkIntoBatches` / `executeBatchesSequentially`.

mod batches;
mod context;
mod error;
mod unwrap;

pub use batches::{chunk_into_batches, execute_batches_sequentially};
pub use context::{ContextValue, ErrorContext, ThrownError, ZodLikeError, MAX_REPORTED_ISSUES};
pub use error::{ErrorClass, ErrorOptions, ErrorSource, ProsopoError};
pub use prosopo_types::{ApiErrorMessage, ApiJsonError};
pub use unwrap::{status_message, unwrap_error, UnwrappedError};

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod tests;
