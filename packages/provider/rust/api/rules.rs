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

//! startProviderApi.ts's access-rule routes: user-access-policy's `AccessRuleApiRoutes`,
//! behind the admin gate, each successful POST clearing the block stage's verdict cache so a
//! rule written or deleted applies to the next request.

use crate::api::block::HardBlockVerdictCache;
use crate::api::public::route_matches;
use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::Response;
use axum::Router;
use http::uri::{PathAndQuery, Uri};
use http::Method;
use prosopo_api_route::RouteKey;
use prosopo_api_router::{create_router, DefaultEndpointAdapter};
use prosopo_database::provider::ProviderDatabase;
use prosopo_logger::{LogLevel, Logger};
use prosopo_user_access_policy::api::{AccessRuleApiPath, AccessRuleApiRoutes, SharedStorage};
use std::sync::{Arc, OnceLock};
use tower::ServiceExt;

pub struct RuleRoutesState {
    pub db: Option<Arc<ProviderDatabase>>,
    pub cache: Arc<HardBlockVerdictCache>,
    pub logger: Logger,
    pub log_level: LogLevel,
    /// Made once the rule storage is there; the TS mounts the routes only when it is.
    pub router: OnceLock<Router>,
}

impl RuleRoutesState {
    /// Whether the routes are mounted, which is when the rule storage is there.
    pub fn mounted(&self) -> bool {
        self.router().is_some()
    }

    fn router(&self) -> Option<Router> {
        if let Some(router) = self.router.get() {
            return Some(router.clone());
        }
        let storage: SharedStorage = Arc::new(self.db.as_ref()?.get_user_access_rules_storage().ok()?);
        let routes: AccessRuleApiRoutes = AccessRuleApiRoutes::new(storage, self.logger.clone());
        let adapter = Arc::new(DefaultEndpointAdapter::new(self.log_level, None));
        Some(self.router.get_or_init(|| create_router(&routes, adapter)).clone())
    }
}

/// Whether a path is one an access-rule route is mounted on, as `app.use(path)` mounts.
pub fn is_rule_path(path: &str) -> bool {
    AccessRuleApiPath::ALL.iter().any(|route| crate::api::pipeline::mounted(path, route.path()))
}

/// The route a POST to `path` reaches, as express's router matches it: any case, a trailing
/// slash allowed.
fn rule_route(method: &Method, path: &str) -> Option<&'static str> {
    if method != Method::POST {
        return None;
    }
    AccessRuleApiPath::ALL.iter().map(|route| route.path()).find(|route| route_matches(path, route))
}

/// The request with its path replaced by the route's, the query kept.
pub fn at_route(mut request: Request, route: &str) -> Request {
    let path_and_query: String = match request.uri().query() {
        Some(query) => format!("{route}?{query}"),
        None => route.to_string(),
    };
    if let Ok(path_and_query) = PathAndQuery::try_from(path_and_query) {
        let mut parts = request.uri().clone().into_parts();
        parts.path_and_query = Some(path_and_query);
        if let Ok(uri) = Uri::from_parts(parts) {
            *request.uri_mut() = uri;
        }
    }
    request
}

pub async fn rule_routes(State(state): State<Arc<RuleRoutesState>>, request: Request, next: Next) -> Response {
    let Some(route) = rule_route(request.method(), request.uri().path()) else {
        return next.run(request).await;
    };
    let Some(router) = state.router() else {
        return next.run(request).await;
    };
    let response: Response = match router.oneshot(at_route(request, route)).await {
        Ok(response) => response,
        Err(never) => match never {},
    };
    if response.status().is_success() {
        state.cache.clear();
    }
    response
}
