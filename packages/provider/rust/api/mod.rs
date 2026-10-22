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

//! The provider's HTTP API (startProviderApi.ts), route by route as MIGRATION.md §3 phases them.

pub mod body;
pub mod express;
pub mod healthz_geo;
pub mod metrics;
pub mod public;
pub mod query;

use axum::middleware::from_fn;
use axum::Router;
use public::{public_routes, PublicState};
use std::sync::Arc;

/// The app as far as the public router: Node's `Host` check, express's `X-Powered-By`, CORS,
/// the JSON body, then the public routes and express's 404 for anything else.
pub fn provider_app(public: Arc<PublicState>) -> Router {
    Router::new()
        .fallback(public_routes)
        .with_state(public)
        .layer(from_fn(body::json_body))
        .layer(from_fn(express::cors))
        .layer(from_fn(express::powered_by))
        .layer(from_fn(express::require_host))
}
