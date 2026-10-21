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

//! `ApiExpressRouterFactory.createRouter`: each route of a provider as a POST route.

use crate::adapter::EndpointAdapter;
use crate::errors::not_found;
use axum::extract::Request;
use axum::response::Response;
use axum::routing::{post, MethodRouter};
use axum::Router;
use prosopo_api_route::ApiRoutesProvider;
use std::sync::Arc;

/// Every route the provider declares, answered through `adapter`. Another method on the same
/// path is answered as express answers a request no route took.
pub fn create_router<S: Clone + Send + Sync + 'static>(routes_provider: &dyn ApiRoutesProvider, adapter: Arc<dyn EndpointAdapter>) -> Router<S> {
    let mut router: Router<S> = Router::new();
    for (path, endpoint) in routes_provider.get_routes() {
        let adapter: Arc<dyn EndpointAdapter> = adapter.clone();
        let route: MethodRouter<S> = post(move |request: Request| {
            let adapter: Arc<dyn EndpointAdapter> = adapter.clone();
            let endpoint = endpoint.clone();
            async move { adapter.handle_request(endpoint, request).await }
        })
        .fallback(|request: Request| async move { unmatched(&request) });
        router = router.route(&path, route);
    }
    router
}

fn unmatched(request: &Request) -> Response {
    not_found(request.method().as_str(), request.uri().path())
}
