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

//! Rust port of `@prosopo/api-route`: the framework-agnostic contract every provider API
//! endpoint implements (validate the request body, process it, return a status), plus the
//! route table and rate-limit config types. The HTTP adapter lives in `api-express-router`.

mod endpoint;
mod limits;
mod response;
mod routes;
mod status;
mod validation;

pub use endpoint::{
    ApiEndpoint, ApiEndpointError, ApiRequestError, BoxFuture, DynApiEndpoint, NoArgs, RequestArgs,
    RequestArgsSchema,
};
pub use limits::{ApiRouteLimit, ApiRouteLimits, MissingRouteLimit, RouteKey};
pub use response::ApiEndpointResponse;
pub use routes::{ApiRoutes, ApiRoutesProvider};
pub use status::{ApiEndpointResponseStatus, UnknownApiEndpointResponseStatus};
pub use validation::{parsed_type, PathSegment, Validate, ValidationError, ValidationIssue};

#[cfg(doctest)]
mod compile_fail;
#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod test_endpoints;
#[cfg(test)]
mod tests;
