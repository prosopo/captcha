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

//! `@prosopo/api-express-router` on axum: the route table of an api-route provider mounted as
//! POST routes, the endpoint adapter that validates bodies and turns failures into the JSON error
//! envelope, the error handler, the sr25519 JWT admin auth with its replay guard, the request
//! logger and the request language.

mod adapter;
mod auth;
mod context;
mod errors;
mod i18n;
mod logging;
mod replay;
mod router;

pub use adapter::{DefaultEndpointAdapter, EndpointAdapter};
pub use auth::{auth_middleware, verify_signature, AdminKey, AuthMiddlewareOptions, AuthState};
pub use context::{RequestBody, RequestI18n, RequestLog};
pub use errors::{error_page, error_response, json_response, not_found};
pub use i18n::i18n_middleware;
pub use logging::{request_logger, request_logger_middleware, HEALTH_CHECK_PATHS};
pub use replay::{JwtReplayGuard, MemoryJwtReplayGuard};
pub use router::create_router;

#[cfg(test)]
mod tests;
