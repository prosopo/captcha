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

// Ported from src/tests/apiRoute.test-d.ts: the @ts-expect-error cases, which in Rust are
// programs that must not compile.

/// An endpoint with a schema rejects arguments that do not match it.
///
/// ```compile_fail,E0308
/// use prosopo_api_route::*;
/// # #[derive(serde::Deserialize)]
/// # struct SiteKeyArgs { site_key: String }
/// # impl Validate for SiteKeyArgs {
/// #     fn validate(input: Option<&serde_json::Value>) -> Result<serde_json::Value, ValidationError> {
/// #         Ok(input.cloned().unwrap_or_default())
/// #     }
/// # }
/// struct Endpoint;
/// impl ApiEndpoint for Endpoint {
///     type Args = SiteKeyArgs;
///     async fn process_request(&self, _args: SiteKeyArgs, _logger: Option<&prosopo_logger::Logger>)
///         -> Result<ApiEndpointResponse, ApiEndpointError> {
///         Ok(ApiEndpointResponse::new(ApiEndpointResponseStatus::Success))
///     }
/// }
/// let _ = Endpoint.process_request(NoArgs, None);
/// ```
pub struct ProcessRequestRejectsMismatchedArgs;

/// An argument-free endpoint cannot be called with arguments.
///
/// ```compile_fail,E0308
/// use prosopo_api_route::*;
/// struct Endpoint;
/// impl ApiEndpoint for Endpoint {
///     type Args = NoArgs;
///     async fn process_request(&self, _args: NoArgs, _logger: Option<&prosopo_logger::Logger>)
///         -> Result<ApiEndpointResponse, ApiEndpointError> {
///         Ok(ApiEndpointResponse::new(ApiEndpointResponseStatus::Success))
///     }
/// }
/// let _ = Endpoint.process_request(serde_json::json!({ "siteKey": "abc" }), None);
/// ```
pub struct ArgumentFreeEndpointRejectsArgs;

/// `status` is mandatory.
///
/// ```compile_fail,E0063
/// use prosopo_api_route::*;
/// let _ = ApiEndpointResponse { data: Some(serde_json::json!({})), error: None };
/// ```
pub struct ResponseStatusIsRequired;

/// An arbitrary string is not a status.
///
/// ```compile_fail,E0308
/// use prosopo_api_route::*;
/// let _ = ApiEndpointResponse { status: "OK", data: None, error: None };
/// ```
pub struct ResponseStatusIsNotAString;

/// `error` is a message, not an error value.
///
/// ```compile_fail,E0308
/// use prosopo_api_route::*;
/// let _ = ApiEndpointResponse {
///     status: ApiEndpointResponseStatus::Fail,
///     data: None,
///     error: Some(std::io::Error::other("boom")),
/// };
/// ```
pub struct ResponseErrorIsAString;

/// Routes map to endpoint objects, not handler functions.
///
/// ```compile_fail,E0277
/// use prosopo_api_route::*;
/// let mut routes: ApiRoutes = ApiRoutes::new();
/// let handler: std::sync::Arc<dyn DynApiEndpoint> = std::sync::Arc::new(|| async {});
/// routes.insert("/x".to_string(), handler);
/// ```
pub struct RoutesRejectAPlainFunction;

/// `limit` is required alongside `window_ms`.
///
/// ```compile_fail,E0063
/// let _ = prosopo_api_route::ApiRouteLimit { window_ms: 1000 };
/// ```
pub struct RouteLimitRequiresLimit;

/// `window_ms` is required alongside `limit`.
///
/// ```compile_fail,E0063
/// let _ = prosopo_api_route::ApiRouteLimit { limit: 5 };
/// ```
pub struct RouteLimitRequiresWindow;
